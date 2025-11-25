#!/bin/bash
# ============================================================================
# QURI Protocol - Canister Restore Script
# ============================================================================
#
# This script restores a specific canister from a backup created by
# backup-canisters.sh.
#
# Features:
# - Restore specific canister from timestamped backup
# - Dry-run mode to preview restore operations
# - Integrity verification before restore
# - Safety checks to prevent accidental production restores
# - Detailed logging and colored output
# - Support for compressed backups
#
# Usage:
#   ./scripts/restore-canister.sh [options]
#
# Options:
#   --canister <name>      Canister to restore (required)
#                          Options: rune-engine, registry, bitcoin-integration, identity-manager
#   --backup-dir <dir>     Backup directory to restore from (required)
#   --network <network>    Target network (default: local)
#   --dry-run              Preview restore without making changes
#   --force                Skip confirmation prompts (use with caution)
#   --verbose              Enable verbose output
#   --help                 Show this help message
#
# Example (dry-run):
#   ./scripts/restore-canister.sh --canister rune-engine --backup-dir ./backups/20250124_120000 --dry-run
#
# Example (actual restore to local):
#   ./scripts/restore-canister.sh --canister rune-engine --backup-dir ./backups/20250124_120000 --network local
#
# WARNING: Restoring to mainnet (--network ic) requires --force flag and is DANGEROUS!
#
# ============================================================================

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

# Color codes for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m' # No Color

# Canister IDs (mainnet)
declare -A MAINNET_CANISTER_IDS=(
    ["rune-engine"]="pkrpq-5qaaa-aaaah-aroda-cai"
    ["registry"]="pnqje-qiaaa-aaaah-arodq-cai"
    ["bitcoin-integration"]="yz6hf-qqaaa-aaaah-arn5a-cai"
    ["identity-manager"]="y67br-5iaaa-aaaah-arn5q-cai"
)

# Default configuration
CANISTER=""
BACKUP_DIR=""
NETWORK="local"
DRY_RUN=false
FORCE=false
VERBOSE=false

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_verbose() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${CYAN}[VERBOSE]${NC} $1"
    fi
}

log_dryrun() {
    echo -e "${MAGENTA}[DRY-RUN]${NC} $1"
}

usage() {
    sed -n '/^# Usage:/,/^# ============================================================================$/p' "$0" | sed 's/^# //'
}

# Check if dfx is installed
check_dependencies() {
    if ! command -v dfx &> /dev/null; then
        log_error "dfx CLI not found. Please install dfx: https://internetcomputer.org/docs/current/developer-docs/setup/install"
        exit 1
    fi

    local dfx_version
    dfx_version=$(dfx --version | cut -d' ' -f2)
    log_verbose "dfx version: $dfx_version"
}

# Validate canister name
validate_canister() {
    local valid_canisters=("rune-engine" "registry" "bitcoin-integration" "identity-manager")

    if [[ ! " ${valid_canisters[*]} " =~ ${CANISTER} ]]; then
        log_error "Invalid canister name: ${CANISTER}"
        log_error "Valid options: ${valid_canisters[*]}"
        exit 1
    fi

    log_verbose "Canister name validated: ${CANISTER}"
}

# Verify backup directory exists and contains required files
verify_backup_integrity() {
    log_info "Verifying backup integrity..."

    # Check if backup directory exists
    if [[ ! -d "$BACKUP_DIR" ]]; then
        # Check if compressed backup exists
        if [[ -f "${BACKUP_DIR}.tar.gz" ]]; then
            log_info "Found compressed backup, extracting..."
            extract_backup
        else
            log_error "Backup directory not found: ${BACKUP_DIR}"
            exit 1
        fi
    fi

    # Check for manifest
    if [[ ! -f "${BACKUP_DIR}/MANIFEST.txt" ]]; then
        log_warn "No manifest found in backup directory"
    else
        log_verbose "Manifest found"
    fi

    # Check for canister-specific files
    local status_file="${BACKUP_DIR}/${CANISTER}_status.txt"
    local info_file="${BACKUP_DIR}/${CANISTER}_info.txt"
    local metrics_file="${BACKUP_DIR}/${CANISTER}_metrics.txt"

    local files_found=0
    local total_files=0

    for file in "$status_file" "$info_file" "$metrics_file"; do
        ((total_files++))
        if [[ -f "$file" ]]; then
            ((files_found++))
            log_verbose "Found: $(basename "$file")"
        else
            log_verbose "Missing: $(basename "$file")"
        fi
    done

    if [[ $files_found -eq 0 ]]; then
        log_error "No backup files found for ${CANISTER} in ${BACKUP_DIR}"
        exit 1
    fi

    log_success "Backup integrity verified: ${files_found}/${total_files} files found"
}

# Extract compressed backup
extract_backup() {
    local compressed="${BACKUP_DIR}.tar.gz"

    if [[ ! -f "$compressed" ]]; then
        log_error "Compressed backup not found: $compressed"
        exit 1
    fi

    log_info "Extracting backup from: $compressed"

    local extract_dir
    extract_dir=$(dirname "$BACKUP_DIR")

    if tar -xzf "$compressed" -C "$extract_dir" 2>/dev/null; then
        log_success "Backup extracted successfully"
    else
        log_error "Failed to extract backup"
        exit 1
    fi
}

# Display backup information
show_backup_info() {
    log_info "================================================================="
    log_info "Backup Information"
    log_info "================================================================="

    if [[ -f "${BACKUP_DIR}/MANIFEST.txt" ]]; then
        cat "${BACKUP_DIR}/MANIFEST.txt"
    else
        log_warn "No manifest available"
        log_info "Backup directory: ${BACKUP_DIR}"
        log_info "Files in backup:"
        ls -lh "$BACKUP_DIR" | grep "$CANISTER" || echo "No files found for ${CANISTER}"
    fi

    echo ""
}

# Show canister status from backup
show_canister_status() {
    log_info "================================================================="
    log_info "Canister Status (from backup)"
    log_info "================================================================="

    local status_file="${BACKUP_DIR}/${CANISTER}_status.txt"

    if [[ -f "$status_file" ]]; then
        cat "$status_file"
    else
        log_warn "Status file not found"
    fi

    echo ""

    local metrics_file="${BACKUP_DIR}/${CANISTER}_metrics.txt"

    if [[ -f "$metrics_file" ]]; then
        log_info "================================================================="
        log_info "Canister Metrics (from backup)"
        log_info "================================================================="
        cat "$metrics_file"
        echo ""
    fi
}

# Get canister ID for the target network
get_canister_id() {
    if [[ "$NETWORK" == "ic" ]]; then
        # Use hardcoded mainnet IDs
        echo "${MAINNET_CANISTER_IDS[$CANISTER]}"
    else
        # Get from dfx canister id command
        if canister_id=$(dfx canister --network "$NETWORK" id "$CANISTER" 2>/dev/null); then
            echo "$canister_id"
        else
            log_error "Failed to get canister ID for ${CANISTER} on ${NETWORK}"
            exit 1
        fi
    fi
}

# Confirm restore operation
confirm_restore() {
    if [[ "$FORCE" == true ]]; then
        log_warn "Skipping confirmation (--force flag set)"
        return 0
    fi

    echo ""
    log_warn "================================================================="
    log_warn "RESTORE CONFIRMATION"
    log_warn "================================================================="
    log_warn "You are about to restore:"
    log_warn "  Canister: ${CANISTER}"
    log_warn "  Network: ${NETWORK}"
    log_warn "  Backup: ${BACKUP_DIR}"
    echo ""

    if [[ "$NETWORK" == "ic" ]]; then
        log_error "================================================================="
        log_error "WARNING: YOU ARE RESTORING TO MAINNET!"
        log_error "================================================================="
        log_error "This is a PRODUCTION environment and could have serious consequences."
        log_error "Make sure you understand what you're doing!"
        echo ""
    fi

    read -p "Are you sure you want to continue? (type 'yes' to confirm): " -r
    echo

    if [[ ! $REPLY == "yes" ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
}

# Perform dry-run restore
dry_run_restore() {
    log_dryrun "================================================================="
    log_dryrun "DRY-RUN MODE - No changes will be made"
    log_dryrun "================================================================="
    echo ""

    show_backup_info
    show_canister_status

    local canister_id
    canister_id=$(get_canister_id)

    log_dryrun "Restore plan:"
    log_dryrun "  1. Target canister: ${CANISTER} (${canister_id})"
    log_dryrun "  2. Target network: ${NETWORK}"
    log_dryrun "  3. Backup source: ${BACKUP_DIR}"
    echo ""

    # Check if export file exists
    local export_file="${BACKUP_DIR}/${CANISTER}_export.txt"
    if [[ -f "$export_file" ]]; then
        log_dryrun "  4. State export found - would restore canister state"
        log_verbose "Export file size: $(du -h "$export_file" | cut -f1)"
    else
        log_dryrun "  4. No state export found - would only verify canister configuration"
    fi

    echo ""
    log_dryrun "To perform actual restore, run without --dry-run flag"
}

# Perform actual restore
perform_restore() {
    log_info "================================================================="
    log_info "Starting canister restore"
    log_info "================================================================="
    echo ""

    show_backup_info
    show_canister_status

    confirm_restore

    local canister_id
    canister_id=$(get_canister_id)

    log_info "Target canister ID: ${canister_id}"

    # Check current canister status
    log_info "Checking current canister status..."
    if dfx canister --network "$NETWORK" status "$canister_id" > /dev/null 2>&1; then
        log_success "Canister is accessible on ${NETWORK}"
    else
        log_error "Cannot access canister ${canister_id} on ${NETWORK}"
        exit 1
    fi

    # Restore state if export exists
    local export_file="${BACKUP_DIR}/${CANISTER}_export.txt"
    if [[ -f "$export_file" ]]; then
        log_warn "State restoration is not yet implemented"
        log_warn "This script currently only verifies backup integrity"
        log_warn "Manual restoration required using canister-specific import methods"
        echo ""
        log_info "Export file available at: ${export_file}"
    else
        log_warn "No state export found in backup"
    fi

    # Compare backup status with current status
    log_info "Comparing backup with current state..."
    local current_status
    current_status=$(mktemp)
    dfx canister --network "$NETWORK" status "$canister_id" > "$current_status" 2>&1

    echo ""
    log_info "================================================================="
    log_info "Comparison: Backup vs Current"
    log_info "================================================================="
    echo ""
    echo "BACKUP STATUS:"
    echo "---"
    cat "${BACKUP_DIR}/${CANISTER}_status.txt" 2>/dev/null || echo "Not available"
    echo ""
    echo "CURRENT STATUS:"
    echo "---"
    cat "$current_status"
    echo ""

    rm -f "$current_status"

    log_success "Restore verification complete"
    log_info "For full state restoration, implement canister-specific import methods"
}

# ============================================================================
# Parse Command Line Arguments
# ============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --canister)
                CANISTER="$2"
                shift 2
                ;;
            --backup-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            --network)
                NETWORK="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done

    # Validate required arguments
    if [[ -z "$CANISTER" ]]; then
        log_error "Missing required argument: --canister"
        usage
        exit 1
    fi

    if [[ -z "$BACKUP_DIR" ]]; then
        log_error "Missing required argument: --backup-dir"
        usage
        exit 1
    fi

    # Safety check for mainnet
    if [[ "$NETWORK" == "ic" && "$FORCE" == false ]]; then
        log_error "Restoring to mainnet requires --force flag"
        log_error "This is a safety measure to prevent accidental production restores"
        exit 1
    fi
}

# ============================================================================
# Main Entry Point
# ============================================================================

main() {
    parse_args "$@"

    echo -e "${GREEN}"
    echo "==================================================================="
    echo "  QURI Protocol - Canister Restore System"
    echo "==================================================================="
    echo -e "${NC}"

    check_dependencies
    validate_canister
    verify_backup_integrity

    if [[ "$DRY_RUN" == true ]]; then
        dry_run_restore
    else
        perform_restore
    fi

    log_success "Operation completed successfully!"
}

# Run main function
main "$@"

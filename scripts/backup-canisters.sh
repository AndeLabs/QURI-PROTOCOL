#!/bin/bash
# ============================================================================
# QURI Protocol - Canister Backup Script
# ============================================================================
#
# This script performs comprehensive backups of all QURI Protocol canisters
# on the Internet Computer mainnet.
#
# Features:
# - Backs up all 4 canisters (rune-engine, registry, bitcoin-integration, identity-manager)
# - Captures canister status (cycles, memory, controllers)
# - Exports canister state if export functions are available
# - Creates timestamped backup directories
# - Compresses old backups to save disk space
# - Robust error handling with colored output
# - Idempotent - safe to run multiple times
#
# Usage:
#   ./scripts/backup-canisters.sh [options]
#
# Options:
#   --network <network>    Network to backup from (default: ic)
#   --output-dir <dir>     Backup output directory (default: ./backups)
#   --compress-age <days>  Compress backups older than N days (default: 7)
#   --no-compress          Skip compression of old backups
#   --verbose              Enable verbose output
#   --help                 Show this help message
#
# Example:
#   ./scripts/backup-canisters.sh --network ic --output-dir ~/quri-backups
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
readonly NC='\033[0m' # No Color

# Canister IDs (mainnet)
declare -A CANISTER_IDS=(
    ["rune-engine"]="pkrpq-5qaaa-aaaah-aroda-cai"
    ["registry"]="pnqje-qiaaa-aaaah-arodq-cai"
    ["bitcoin-integration"]="yz6hf-qqaaa-aaaah-arn5a-cai"
    ["identity-manager"]="y67br-5iaaa-aaaah-arn5q-cai"
)

# Default configuration
NETWORK="ic"
OUTPUT_DIR="./backups"
COMPRESS_AGE_DAYS=7
DO_COMPRESS=true
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

# Create backup directory with timestamp
create_backup_dir() {
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="${OUTPUT_DIR}/${timestamp}"

    mkdir -p "$backup_dir"
    log_info "Created backup directory: $backup_dir"

    echo "$backup_dir"
}

# Backup canister status
backup_canister_status() {
    local canister_name=$1
    local canister_id=$2
    local backup_dir=$3

    log_info "Backing up status for ${canister_name} (${canister_id})..."

    local status_file="${backup_dir}/${canister_name}_status.json"

    if dfx canister --network "$NETWORK" status "$canister_id" > "${backup_dir}/${canister_name}_status.txt" 2>&1; then
        log_success "Status backed up: ${canister_name}"
    else
        log_error "Failed to get status for ${canister_name}"
        return 1
    fi

    # Get detailed canister info
    if dfx canister --network "$NETWORK" info "$canister_id" > "${backup_dir}/${canister_name}_info.txt" 2>&1; then
        log_verbose "Info backed up: ${canister_name}"
    else
        log_warn "Failed to get info for ${canister_name}"
    fi
}

# Export canister state (if export function exists)
export_canister_state() {
    local canister_name=$1
    local canister_id=$2
    local backup_dir=$3

    log_info "Attempting to export state for ${canister_name}..."

    # Different canisters may have different export methods
    # We'll try common export functions
    local export_functions=("export_state" "get_all_data" "backup_data")
    local exported=false

    for func in "${export_functions[@]}"; do
        log_verbose "Trying export function: ${func}"

        if dfx canister --network "$NETWORK" call "$canister_id" "$func" > "${backup_dir}/${canister_name}_export.txt" 2>&1; then
            log_success "State exported using ${func}: ${canister_name}"
            exported=true
            break
        fi
    done

    if [[ "$exported" == false ]]; then
        log_warn "No export function available for ${canister_name} - skipping state export"
    fi
}

# Get canister metrics summary
get_canister_metrics() {
    local canister_name=$1
    local canister_id=$2
    local backup_dir=$3

    log_verbose "Collecting metrics for ${canister_name}..."

    # Parse status file to extract key metrics
    local status_file="${backup_dir}/${canister_name}_status.txt"

    if [[ -f "$status_file" ]]; then
        {
            echo "=== Canister Metrics Summary ==="
            echo "Canister: ${canister_name}"
            echo "ID: ${canister_id}"
            echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
            echo ""
            grep -E "(Status|Memory|Freezing|Balance|Module hash|Controllers)" "$status_file" || echo "Unable to extract metrics"
        } > "${backup_dir}/${canister_name}_metrics.txt"
    fi
}

# Compress old backups
compress_old_backups() {
    if [[ "$DO_COMPRESS" == false ]]; then
        log_info "Skipping compression of old backups"
        return 0
    fi

    log_info "Compressing backups older than ${COMPRESS_AGE_DAYS} days..."

    local compressed_count=0

    # Find backup directories older than COMPRESS_AGE_DAYS
    while IFS= read -r -d '' backup_dir; do
        # Skip if already compressed
        if [[ -f "${backup_dir}.tar.gz" ]]; then
            log_verbose "Already compressed: ${backup_dir}"
            continue
        fi

        log_info "Compressing: $(basename "$backup_dir")"

        # Create tarball
        if tar -czf "${backup_dir}.tar.gz" -C "$(dirname "$backup_dir")" "$(basename "$backup_dir")" 2>/dev/null; then
            # Remove original directory
            rm -rf "$backup_dir"
            ((compressed_count++))
            log_success "Compressed: $(basename "$backup_dir").tar.gz"
        else
            log_error "Failed to compress: $(basename "$backup_dir")"
        fi
    done < <(find "$OUTPUT_DIR" -maxdepth 1 -type d -name "[0-9]*_[0-9]*" -mtime +"$COMPRESS_AGE_DAYS" -print0 2>/dev/null)

    if [[ $compressed_count -gt 0 ]]; then
        log_success "Compressed $compressed_count old backup(s)"
    else
        log_info "No old backups to compress"
    fi
}

# Create backup manifest
create_manifest() {
    local backup_dir=$1
    local manifest_file="${backup_dir}/MANIFEST.txt"

    log_info "Creating backup manifest..."

    {
        echo "==================================================================="
        echo "QURI Protocol - Canister Backup Manifest"
        echo "==================================================================="
        echo ""
        echo "Backup Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "Network: ${NETWORK}"
        echo "Backup Directory: ${backup_dir}"
        echo ""
        echo "==================================================================="
        echo "Backed Up Canisters:"
        echo "==================================================================="
        echo ""

        for canister_name in "${!CANISTER_IDS[@]}"; do
            echo "- ${canister_name}: ${CANISTER_IDS[$canister_name]}"
        done

        echo ""
        echo "==================================================================="
        echo "Backup Contents:"
        echo "==================================================================="
        echo ""

        # List all files in backup directory with sizes
        ls -lh "$backup_dir" | tail -n +2

        echo ""
        echo "==================================================================="
        echo "Backup completed successfully at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "==================================================================="
    } > "$manifest_file"

    log_success "Manifest created: $manifest_file"
}

# Main backup function
backup_all_canisters() {
    local backup_dir
    backup_dir=$(create_backup_dir)

    log_info "Starting backup of all QURI Protocol canisters..."
    log_info "Network: ${NETWORK}"
    log_info "Output directory: ${backup_dir}"

    local success_count=0
    local total_count=${#CANISTER_IDS[@]}

    # Backup each canister
    for canister_name in "${!CANISTER_IDS[@]}"; do
        local canister_id="${CANISTER_IDS[$canister_name]}"

        echo ""
        log_info "================================================================="
        log_info "Backing up: ${canister_name} (${canister_id})"
        log_info "================================================================="

        # Backup status
        if backup_canister_status "$canister_name" "$canister_id" "$backup_dir"; then
            get_canister_metrics "$canister_name" "$canister_id" "$backup_dir"
            export_canister_state "$canister_name" "$canister_id" "$backup_dir"
            ((success_count++))
        else
            log_error "Failed to backup ${canister_name}"
        fi
    done

    echo ""
    log_info "================================================================="
    log_info "Backup Summary"
    log_info "================================================================="
    log_info "Successfully backed up: ${success_count}/${total_count} canisters"

    # Create manifest
    create_manifest "$backup_dir"

    # Compress old backups
    compress_old_backups

    echo ""
    if [[ $success_count -eq $total_count ]]; then
        log_success "All canisters backed up successfully!"
        log_success "Backup location: ${backup_dir}"
        return 0
    else
        log_warn "Some canisters failed to backup. Check logs above."
        log_info "Partial backup location: ${backup_dir}"
        return 1
    fi
}

# ============================================================================
# Parse Command Line Arguments
# ============================================================================

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --network)
                NETWORK="$2"
                shift 2
                ;;
            --output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --compress-age)
                COMPRESS_AGE_DAYS="$2"
                shift 2
                ;;
            --no-compress)
                DO_COMPRESS=false
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
}

# ============================================================================
# Main Entry Point
# ============================================================================

main() {
    parse_args "$@"

    echo -e "${GREEN}"
    echo "==================================================================="
    echo "  QURI Protocol - Canister Backup System"
    echo "==================================================================="
    echo -e "${NC}"

    check_dependencies
    backup_all_canisters

    local exit_code=$?

    echo ""
    if [[ $exit_code -eq 0 ]]; then
        log_success "Backup process completed successfully!"
    else
        log_error "Backup process completed with errors"
    fi

    exit $exit_code
}

# Run main function
main "$@"

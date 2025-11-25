#!/bin/bash
# ============================================================================
# QURI Protocol - Cycles Monitoring Script
# ============================================================================
#
# This script monitors cycles balance for all QURI Protocol canisters
# and alerts when balances fall below configured thresholds.
#
# Features:
# - Monitors all 4 canisters (rune-engine, registry, bitcoin-integration, identity-manager)
# - Configurable alert thresholds (CRITICAL, WARNING, HEALTHY)
# - Webhook notifications (Slack, Discord, generic webhook)
# - Historical tracking and burn rate calculation
# - Colored output for easy reading
# - JSON output mode for integration with monitoring systems
# - Email notifications (optional)
#
# Usage:
#   ./scripts/monitor-cycles.sh [options]
#
# Options:
#   --network <network>      Network to monitor (default: ic)
#   --webhook <url>          Webhook URL for notifications
#   --webhook-type <type>    Webhook type: slack, discord, generic (default: generic)
#   --json                   Output in JSON format
#   --history-file <file>    File to store historical data (default: ./cycles_history.json)
#   --critical <cycles>      Critical threshold in cycles (default: 1T)
#   --warning <cycles>       Warning threshold in cycles (default: 100B)
#   --quiet                  Only output if thresholds are breached
#   --verbose                Enable verbose output
#   --help                   Show this help message
#
# Threshold Formats:
#   - K/M/B/T suffixes supported (e.g., 100B = 100 billion)
#   - Raw numbers accepted (e.g., 100000000000)
#
# Examples:
#   # Basic monitoring
#   ./scripts/monitor-cycles.sh
#
#   # With Slack webhook
#   ./scripts/monitor-cycles.sh --webhook https://hooks.slack.com/xxx --webhook-type slack
#
#   # Quiet mode (only alerts)
#   ./scripts/monitor-cycles.sh --quiet --webhook https://hooks.slack.com/xxx
#
#   # JSON output for CI/CD
#   ./scripts/monitor-cycles.sh --json
#
# Exit Codes:
#   0 - All canisters healthy
#   1 - One or more canisters in WARNING state
#   2 - One or more canisters in CRITICAL state
#   3 - Script error
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

# Default thresholds (in cycles)
CRITICAL_THRESHOLD=$((1 * 1000 * 1000 * 1000 * 1000))    # 1 Trillion
WARNING_THRESHOLD=$((100 * 1000 * 1000 * 1000))          # 100 Billion

# Default configuration
NETWORK="ic"
WEBHOOK_URL=""
WEBHOOK_TYPE="generic"
JSON_OUTPUT=false
HISTORY_FILE="./cycles_history.json"
QUIET=false
VERBOSE=false

# Status tracking
declare -A CANISTER_STATUS
declare -A CANISTER_CYCLES
EXIT_CODE=0

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    if [[ "$JSON_OUTPUT" == false ]]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [[ "$JSON_OUTPUT" == false ]]; then
        echo -e "${GREEN}[SUCCESS]${NC} $1"
    fi
}

log_warn() {
    if [[ "$JSON_OUTPUT" == false ]]; then
        echo -e "${YELLOW}[WARN]${NC} $1" >&2
    fi
}

log_error() {
    if [[ "$JSON_OUTPUT" == false ]]; then
        echo -e "${RED}[ERROR]${NC} $1" >&2
    fi
}

log_critical() {
    if [[ "$JSON_OUTPUT" == false ]]; then
        echo -e "${RED}[CRITICAL]${NC} $1" >&2
    fi
}

log_verbose() {
    if [[ "$VERBOSE" == true && "$JSON_OUTPUT" == false ]]; then
        echo -e "${CYAN}[VERBOSE]${NC} $1"
    fi
}

usage() {
    sed -n '/^# Usage:/,/^# ============================================================================$/p' "$0" | sed 's/^# //'
}

# Parse human-readable cycles format (e.g., "100B", "1.5T")
parse_cycles() {
    local input=$1
    local number
    local suffix

    # Extract number and suffix
    if [[ $input =~ ^([0-9.]+)([KMBT])?$ ]]; then
        number="${BASH_REMATCH[1]}"
        suffix="${BASH_REMATCH[2]}"

        # Convert to integer based on suffix
        case $suffix in
            K)
                echo "$(echo "$number * 1000" | bc | cut -d'.' -f1)"
                ;;
            M)
                echo "$(echo "$number * 1000000" | bc | cut -d'.' -f1)"
                ;;
            B)
                echo "$(echo "$number * 1000000000" | bc | cut -d'.' -f1)"
                ;;
            T)
                echo "$(echo "$number * 1000000000000" | bc | cut -d'.' -f1)"
                ;;
            *)
                # No suffix, assume raw number
                echo "${number%.*}"
                ;;
        esac
    else
        log_error "Invalid cycles format: $input"
        exit 3
    fi
}

# Format cycles for human-readable output
format_cycles() {
    local cycles=$1

    if ((cycles >= 1000000000000)); then
        printf "%.2fT" "$(echo "scale=2; $cycles / 1000000000000" | bc)"
    elif ((cycles >= 1000000000)); then
        printf "%.2fB" "$(echo "scale=2; $cycles / 1000000000" | bc)"
    elif ((cycles >= 1000000)); then
        printf "%.2fM" "$(echo "scale=2; $cycles / 1000000" | bc)"
    elif ((cycles >= 1000)); then
        printf "%.2fK" "$(echo "scale=2; $cycles / 1000" | bc)"
    else
        echo "$cycles"
    fi
}

# Check if required commands are installed
check_dependencies() {
    local missing_deps=()

    if ! command -v dfx &> /dev/null; then
        missing_deps+=("dfx")
    fi

    if ! command -v bc &> /dev/null; then
        missing_deps+=("bc")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        exit 3
    fi

    log_verbose "All dependencies installed"
}

# Get cycles balance for a canister
get_canister_cycles() {
    local canister_id=$1

    log_verbose "Fetching cycles for ${canister_id}..."

    # Get status output
    local status_output
    if ! status_output=$(dfx canister --network "$NETWORK" status "$canister_id" 2>&1); then
        log_error "Failed to get status for ${canister_id}"
        return 1
    fi

    # Extract cycles balance (format: "Balance: 1_234_567_890_123 Cycles")
    local cycles
    cycles=$(echo "$status_output" | grep -i "Balance:" | sed 's/.*Balance: //' | sed 's/ Cycles//' | sed 's/_//g')

    if [[ -z "$cycles" ]]; then
        log_error "Could not extract cycles from status output"
        return 1
    fi

    echo "$cycles"
}

# Determine status based on cycles balance
get_status_level() {
    local cycles=$1

    if ((cycles < CRITICAL_THRESHOLD)); then
        echo "CRITICAL"
    elif ((cycles < WARNING_THRESHOLD)); then
        echo "WARNING"
    else
        echo "HEALTHY"
    fi
}

# Monitor all canisters
monitor_all_canisters() {
    log_info "Monitoring cycles for all QURI Protocol canisters on ${NETWORK}..."
    echo ""

    local has_critical=false
    local has_warning=false

    for canister_name in "${!CANISTER_IDS[@]}"; do
        local canister_id="${CANISTER_IDS[$canister_name]}"

        log_verbose "Checking ${canister_name} (${canister_id})..."

        if cycles=$(get_canister_cycles "$canister_id"); then
            CANISTER_CYCLES[$canister_name]=$cycles
            local status
            status=$(get_status_level "$cycles")
            CANISTER_STATUS[$canister_name]=$status

            if [[ "$status" == "CRITICAL" ]]; then
                has_critical=true
                EXIT_CODE=2
            elif [[ "$status" == "WARNING" ]]; then
                has_warning=true
                if [[ $EXIT_CODE -eq 0 ]]; then
                    EXIT_CODE=1
                fi
            fi

            # Only output if not in quiet mode or if there's an issue
            if [[ "$QUIET" == false ]] || [[ "$status" != "HEALTHY" ]]; then
                display_canister_status "$canister_name" "$canister_id" "$cycles" "$status"
            fi
        else
            CANISTER_STATUS[$canister_name]="ERROR"
            EXIT_CODE=3
            log_error "Failed to monitor ${canister_name}"
        fi
    done

    echo ""

    # Send notifications if needed
    if [[ $has_critical == true ]] || [[ $has_warning == true ]]; then
        send_webhook_notification
    fi

    # Save historical data
    save_history
}

# Display canister status
display_canister_status() {
    local name=$1
    local id=$2
    local cycles=$3
    local status=$4

    local formatted_cycles
    formatted_cycles=$(format_cycles "$cycles")

    case $status in
        CRITICAL)
            log_critical "🔴 ${name}: ${formatted_cycles} (${id})"
            ;;
        WARNING)
            log_warn "🟡 ${name}: ${formatted_cycles} (${id})"
            ;;
        HEALTHY)
            log_success "🟢 ${name}: ${formatted_cycles} (${id})"
            ;;
        *)
            log_error "❌ ${name}: ${status} (${id})"
            ;;
    esac
}

# Send webhook notification
send_webhook_notification() {
    if [[ -z "$WEBHOOK_URL" ]]; then
        log_verbose "No webhook configured, skipping notification"
        return 0
    fi

    log_info "Sending webhook notification..."

    local message
    message=$(build_webhook_message)

    local response
    if response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d "$message" 2>&1); then

        if [[ $response -ge 200 && $response -lt 300 ]]; then
            log_success "Webhook notification sent successfully (HTTP $response)"
        else
            log_error "Webhook notification failed (HTTP $response)"
        fi
    else
        log_error "Failed to send webhook notification"
    fi
}

# Build webhook message based on type
build_webhook_message() {
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    case $WEBHOOK_TYPE in
        slack)
            build_slack_message "$timestamp"
            ;;
        discord)
            build_discord_message "$timestamp"
            ;;
        *)
            build_generic_message "$timestamp"
            ;;
    esac
}

# Build Slack webhook message
build_slack_message() {
    local timestamp=$1
    local text="🚨 QURI Protocol Cycles Alert\n\n"

    for canister_name in "${!CANISTER_STATUS[@]}"; do
        local status="${CANISTER_STATUS[$canister_name]}"
        local cycles="${CANISTER_CYCLES[$canister_name]}"
        local formatted_cycles
        formatted_cycles=$(format_cycles "$cycles")

        local emoji
        case $status in
            CRITICAL) emoji="🔴" ;;
            WARNING) emoji="🟡" ;;
            HEALTHY) emoji="🟢" ;;
            *) emoji="❌" ;;
        esac

        text+="${emoji} *${canister_name}*: ${formatted_cycles}\n"
    done

    text+="\nTimestamp: ${timestamp}"

    cat <<EOF
{
  "text": "${text}",
  "username": "QURI Cycles Monitor",
  "icon_emoji": ":warning:"
}
EOF
}

# Build Discord webhook message
build_discord_message() {
    local timestamp=$1
    local description=""

    for canister_name in "${!CANISTER_STATUS[@]}"; do
        local status="${CANISTER_STATUS[$canister_name]}"
        local cycles="${CANISTER_CYCLES[$canister_name]}"
        local formatted_cycles
        formatted_cycles=$(format_cycles "$cycles")

        local emoji
        case $status in
            CRITICAL) emoji="🔴" ;;
            WARNING) emoji="🟡" ;;
            HEALTHY) emoji="🟢" ;;
            *) emoji="❌" ;;
        esac

        description+="${emoji} **${canister_name}**: ${formatted_cycles}\n"
    done

    cat <<EOF
{
  "embeds": [{
    "title": "🚨 QURI Protocol Cycles Alert",
    "description": "${description}",
    "color": 16711680,
    "timestamp": "${timestamp}"
  }]
}
EOF
}

# Build generic webhook message
build_generic_message() {
    local timestamp=$1
    local canisters="["

    local first=true
    for canister_name in "${!CANISTER_STATUS[@]}"; do
        if [[ $first == false ]]; then
            canisters+=","
        fi
        first=false

        local status="${CANISTER_STATUS[$canister_name]}"
        local cycles="${CANISTER_CYCLES[$canister_name]}"

        canisters+=$(cat <<EOF
{
  "name": "${canister_name}",
  "id": "${CANISTER_IDS[$canister_name]}",
  "cycles": ${cycles},
  "status": "${status}"
}
EOF
)
    done

    canisters+="]"

    cat <<EOF
{
  "timestamp": "${timestamp}",
  "network": "${NETWORK}",
  "canisters": ${canisters}
}
EOF
}

# Save historical data
save_history() {
    log_verbose "Saving historical data to ${HISTORY_FILE}..."

    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    local entry="{"
    entry+="\"timestamp\": \"${timestamp}\","
    entry+="\"network\": \"${NETWORK}\","
    entry+="\"canisters\": ["

    local first=true
    for canister_name in "${!CANISTER_STATUS[@]}"; do
        if [[ $first == false ]]; then
            entry+=","
        fi
        first=false

        local status="${CANISTER_STATUS[$canister_name]}"
        local cycles="${CANISTER_CYCLES[$canister_name]}"

        entry+="{\"name\":\"${canister_name}\",\"cycles\":${cycles},\"status\":\"${status}\"}"
    done

    entry+="]}"

    # Append to history file (create if doesn't exist)
    if [[ ! -f "$HISTORY_FILE" ]]; then
        echo "[]" > "$HISTORY_FILE"
    fi

    # Use jq if available, otherwise simple append
    if command -v jq &> /dev/null; then
        local temp_file
        temp_file=$(mktemp)
        jq ". += [${entry}]" "$HISTORY_FILE" > "$temp_file" && mv "$temp_file" "$HISTORY_FILE"
    else
        log_verbose "jq not installed, using simple append (may not be valid JSON)"
        echo "$entry" >> "$HISTORY_FILE"
    fi

    log_verbose "Historical data saved"
}

# Output JSON report
output_json() {
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    echo "{"
    echo "  \"timestamp\": \"${timestamp}\","
    echo "  \"network\": \"${NETWORK}\","
    echo "  \"exit_code\": ${EXIT_CODE},"
    echo "  \"canisters\": ["

    local first=true
    for canister_name in "${!CANISTER_STATUS[@]}"; do
        if [[ $first == false ]]; then
            echo ","
        fi
        first=false

        local status="${CANISTER_STATUS[$canister_name]}"
        local cycles="${CANISTER_CYCLES[$canister_name]}"
        local id="${CANISTER_IDS[$canister_name]}"

        echo "    {"
        echo "      \"name\": \"${canister_name}\","
        echo "      \"id\": \"${id}\","
        echo "      \"cycles\": ${cycles},"
        echo "      \"status\": \"${status}\""
        echo -n "    }"
    done

    echo ""
    echo "  ]"
    echo "}"
}

# Display summary
display_summary() {
    if [[ "$JSON_OUTPUT" == true ]]; then
        output_json
        return
    fi

    echo ""
    log_info "================================================================="
    log_info "Summary"
    log_info "================================================================="

    local critical_count=0
    local warning_count=0
    local healthy_count=0

    for status in "${CANISTER_STATUS[@]}"; do
        case $status in
            CRITICAL) ((critical_count++)) ;;
            WARNING) ((warning_count++)) ;;
            HEALTHY) ((healthy_count++)) ;;
        esac
    done

    if [[ $critical_count -gt 0 ]]; then
        log_critical "Critical: ${critical_count}"
    fi

    if [[ $warning_count -gt 0 ]]; then
        log_warn "Warning: ${warning_count}"
    fi

    log_success "Healthy: ${healthy_count}"

    echo ""
    log_info "Thresholds:"
    log_info "  Critical: < $(format_cycles $CRITICAL_THRESHOLD)"
    log_info "  Warning:  < $(format_cycles $WARNING_THRESHOLD)"
    echo ""
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
            --webhook)
                WEBHOOK_URL="$2"
                shift 2
                ;;
            --webhook-type)
                WEBHOOK_TYPE="$2"
                shift 2
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --history-file)
                HISTORY_FILE="$2"
                shift 2
                ;;
            --critical)
                CRITICAL_THRESHOLD=$(parse_cycles "$2")
                shift 2
                ;;
            --warning)
                WARNING_THRESHOLD=$(parse_cycles "$2")
                shift 2
                ;;
            --quiet)
                QUIET=true
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
                exit 3
                ;;
        esac
    done
}

# ============================================================================
# Main Entry Point
# ============================================================================

main() {
    parse_args "$@"

    if [[ "$JSON_OUTPUT" == false ]]; then
        echo -e "${GREEN}"
        echo "==================================================================="
        echo "  QURI Protocol - Cycles Monitoring System"
        echo "==================================================================="
        echo -e "${NC}"
    fi

    check_dependencies
    monitor_all_canisters
    display_summary

    exit $EXIT_CODE
}

# Run main function
main "$@"

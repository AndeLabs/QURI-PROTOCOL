# QURI Protocol - Scripts Directory

This directory contains operational scripts for managing QURI Protocol canisters on the Internet Computer.

## Available Scripts

### Backup & Recovery

#### `backup-canisters.sh`
Performs comprehensive backups of all QURI Protocol canisters.

```bash
# Basic usage
./scripts/backup-canisters.sh

# With custom options
./scripts/backup-canisters.sh --network ic --output-dir ~/backups --verbose
```

**Features:**
- Backs up all 4 canisters (rune-engine, registry, bitcoin-integration, identity-manager)
- Captures canister status, info, and metrics
- Creates timestamped backup directories
- Automatically compresses backups older than 7 days
- Colored output for easy reading
- Robust error handling

**Options:**
- `--network <network>` - Network to backup from (default: ic)
- `--output-dir <dir>` - Backup output directory (default: ./backups)
- `--compress-age <days>` - Compress backups older than N days (default: 7)
- `--no-compress` - Skip compression of old backups
- `--verbose` - Enable verbose output
- `--help` - Show help message

---

#### `restore-canister.sh`
Restores a specific canister from a backup.

```bash
# Dry-run (recommended first step)
./scripts/restore-canister.sh \
  --canister rune-engine \
  --backup-dir ./backups/20250124_120000 \
  --dry-run

# Actual restore to local network
./scripts/restore-canister.sh \
  --canister rune-engine \
  --backup-dir ./backups/20250124_120000 \
  --network local
```

**Features:**
- Dry-run mode to preview restore operations
- Integrity verification before restore
- Safety checks to prevent accidental production restores
- Comparison of backup vs current state
- Support for compressed backups

**Options:**
- `--canister <name>` - Canister to restore (required)
- `--backup-dir <dir>` - Backup directory to restore from (required)
- `--network <network>` - Target network (default: local)
- `--dry-run` - Preview restore without making changes
- `--force` - Skip confirmation prompts (required for mainnet)
- `--verbose` - Enable verbose output
- `--help` - Show help message

**WARNING:** Restoring to mainnet requires `--force` flag and is potentially dangerous!

---

### Monitoring

#### `monitor-cycles.sh`
Monitors cycles balance for all canisters and sends alerts when thresholds are breached.

```bash
# Basic monitoring
./scripts/monitor-cycles.sh

# With Slack webhook
./scripts/monitor-cycles.sh \
  --webhook https://hooks.slack.com/services/XXX \
  --webhook-type slack

# Quiet mode (only alerts)
./scripts/monitor-cycles.sh --quiet

# JSON output
./scripts/monitor-cycles.sh --json
```

**Features:**
- Monitors all 4 canisters
- Configurable alert thresholds (CRITICAL, WARNING, HEALTHY)
- Webhook notifications (Slack, Discord, generic)
- Historical tracking and burn rate calculation
- JSON output for CI/CD integration

**Options:**
- `--network <network>` - Network to monitor (default: ic)
- `--webhook <url>` - Webhook URL for notifications
- `--webhook-type <type>` - Webhook type: slack, discord, generic
- `--json` - Output in JSON format
- `--history-file <file>` - File to store historical data
- `--critical <cycles>` - Critical threshold (default: 1T)
- `--warning <cycles>` - Warning threshold (default: 100B)
- `--quiet` - Only output if thresholds are breached
- `--verbose` - Enable verbose output
- `--help` - Show help message

**Exit Codes:**
- 0 - All canisters healthy
- 1 - One or more canisters in WARNING state
- 2 - One or more canisters in CRITICAL state
- 3 - Script error

---

### Rune Indexing (Legacy)

#### `sync-runes-mainnet.sh`
Syncs rune data from Bitcoin mainnet via Hiro API.

#### `sync-all-runes.sh`
Batch syncs all available runes.

#### `sync-gradual.sh`
Gradual sync with rate limiting.

---

## Automation

### Crontab Setup

See `crontab.example` for automated backup and monitoring configuration.

```bash
# Copy and customize crontab
cp scripts/crontab.example scripts/crontab.local

# Edit paths and webhooks
vim scripts/crontab.local

# Install crontab
crontab scripts/crontab.local

# Verify installation
crontab -l
```

**Recommended Schedule:**
- **Backups:** Daily at 2 AM UTC
- **Cycles Monitoring:** Hourly
- **Backup Compression:** Weekly on Sunday
- **Health Checks:** Daily at 9 AM UTC

---

## Prerequisites

### Required Tools

1. **dfx CLI** (v0.15.0+)
   ```bash
   sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
   ```

2. **bc** (for cycles calculations)
   ```bash
   # macOS
   brew install bc

   # Ubuntu/Debian
   sudo apt-get install bc

   # CentOS/RHEL
   sudo yum install bc
   ```

3. **jq** (optional, for JSON processing)
   ```bash
   # macOS
   brew install jq

   # Ubuntu/Debian
   sudo apt-get install jq
   ```

### Permissions

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

### dfx Identity

Ensure you have a valid dfx identity configured:
```bash
dfx identity whoami
dfx identity get-principal
```

For mainnet operations, you need sufficient cycles:
```bash
dfx cycles balance
```

---

## Directory Structure

```
scripts/
├── README.md                 # This file
├── backup-canisters.sh       # Backup script
├── restore-canister.sh       # Restore script
├── monitor-cycles.sh         # Cycles monitoring script
├── crontab.example          # Crontab configuration example
├── sync-runes-mainnet.sh    # Rune sync script
├── sync-all-runes.sh        # Batch rune sync
└── sync-gradual.sh          # Gradual rune sync
```

---

## Quick Start Guide

### 1. Initial Setup

```bash
# Ensure scripts are executable
chmod +x scripts/*.sh

# Verify dfx is installed
dfx --version

# Check current canister status
./scripts/monitor-cycles.sh
```

### 2. Create Your First Backup

```bash
# Create backup directory
mkdir -p ~/quri-backups

# Run backup
./scripts/backup-canisters.sh --output-dir ~/quri-backups --verbose

# Verify backup
ls -lh ~/quri-backups/$(ls -t ~/quri-backups | head -1)/
```

### 3. Test Restore (Dry-Run)

```bash
# Get latest backup directory
LATEST_BACKUP=$(ls -td ~/quri-backups/2* | head -1)

# Test restore
./scripts/restore-canister.sh \
  --canister rune-engine \
  --backup-dir $LATEST_BACKUP \
  --dry-run
```

### 4. Set Up Monitoring

```bash
# Basic monitoring
./scripts/monitor-cycles.sh

# With webhook (replace with your webhook URL)
./scripts/monitor-cycles.sh \
  --webhook https://hooks.slack.com/services/YOUR/WEBHOOK \
  --webhook-type slack
```

### 5. Automate with Cron

```bash
# Copy crontab template
cp scripts/crontab.example scripts/crontab.local

# Edit with your paths
vim scripts/crontab.local

# Install
crontab scripts/crontab.local
```

---

## Common Use Cases

### Pre-Deployment Backup

```bash
# Always backup before deploying to mainnet!
./scripts/backup-canisters.sh --output-dir ./backups/pre-deploy

# Verify backup succeeded
echo $?  # Should be 0

# Proceed with deployment
dfx deploy --network ic <canister> --mode upgrade
```

### Emergency Cycles Top-Up

```bash
# Check current status
./scripts/monitor-cycles.sh --verbose

# Top-up critical canister
dfx cycles top-up --network ic <canister-id> 10000000000000  # 10T

# Verify
./scripts/monitor-cycles.sh
```

### Disaster Recovery

```bash
# 1. Identify latest good backup
ls -lt ~/quri-backups/

# 2. Test restore on local network
./scripts/restore-canister.sh \
  --canister rune-engine \
  --backup-dir ~/quri-backups/20250124_120000 \
  --network local \
  --dry-run

# 3. Contact team before restoring to mainnet!
```

### CI/CD Integration

```bash
# Generate JSON report
./scripts/monitor-cycles.sh --json > cycles-report.json

# Check exit code
if [ $? -eq 0 ]; then
  echo "All canisters healthy"
else
  echo "Cycles alert detected!"
  exit 1
fi
```

---

## Troubleshooting

### "dfx not found"

```bash
# Add dfx to PATH
export PATH="$HOME/.local/share/dfx/bin:$PATH"

# Or use absolute path in crontab
PATH=/usr/local/bin:/usr/bin:/bin:$HOME/.local/share/dfx/bin
```

### "Permission denied"

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Check permissions
ls -l scripts/*.sh
```

### Backup directory full

```bash
# Check disk usage
du -sh ~/quri-backups/*

# Compress old backups
./scripts/backup-canisters.sh --compress-age 1

# Or manually delete old backups
rm -rf ~/quri-backups/202501{01..15}_*
```

### Webhook not working

```bash
# Test webhook manually
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{"text":"Test message"}'

# Check webhook URL in script
./scripts/monitor-cycles.sh --verbose
```

---

## Best Practices

1. ✅ **Test regularly** - Run restore dry-runs monthly
2. ✅ **Monitor daily** - Check cycles at least once per day
3. ✅ **Backup before changes** - Always backup before deployments
4. ✅ **Keep multiple copies** - Maintain on-site and off-site backups
5. ✅ **Document procedures** - Keep runbooks up to date
6. ✅ **Automate everything** - Use cron for consistent execution
7. ✅ **Alert appropriately** - Configure webhooks for critical alerts
8. ✅ **Review logs** - Check backup and monitoring logs weekly
9. ✅ **Test webhooks** - Verify alerts are reaching the right channels
10. ✅ **Maintain security** - Protect backup files and webhook URLs

---

## Additional Resources

- **Runbook:** `docs/runbooks/BACKUP_RECOVERY.md`
- **ICP Documentation:** https://internetcomputer.org/docs
- **dfx CLI Reference:** https://internetcomputer.org/docs/current/developer-docs/build/install-upgrade-remove
- **Cycles Management:** https://internetcomputer.org/docs/current/developer-docs/setup/cycles

---

## Support

For issues or questions:
1. Check the runbook: `docs/runbooks/BACKUP_RECOVERY.md`
2. Review script help: `./scripts/<script>.sh --help`
3. Contact DevOps team: #quri-ops on Slack

---

**Last Updated:** 2025-01-24
**Maintainer:** DevOps Team

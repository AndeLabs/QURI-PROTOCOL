# QURI Protocol - Backup and Recovery Runbook

## Table of Contents

- [Overview](#overview)
- [Backup Strategy](#backup-strategy)
- [Backup Procedures](#backup-procedures)
- [Recovery Procedures](#recovery-procedures)
- [Cycles Monitoring](#cycles-monitoring)
- [Emergency Procedures](#emergency-procedures)
- [Automation](#automation)
- [Troubleshooting](#troubleshooting)

---

## Overview

This runbook provides comprehensive procedures for backing up, monitoring, and recovering QURI Protocol canisters on the Internet Computer.

### Canisters in Scope

| Canister | Canister ID | Primary Data | Critical Level |
|----------|-------------|--------------|----------------|
| rune-engine | `pkrpq-5qaaa-aaaah-aroda-cai` | Virtual runes, etching processes, settlement history | **HIGH** |
| registry | `pnqje-qiaaa-aaaah-arodq-cai` | Rune metadata, bonding curves, indexed runes | **HIGH** |
| bitcoin-integration | `yz6hf-qqaaa-aaaah-arn5a-cai` | Bitcoin network interactions, UTXO management | **MEDIUM** |
| identity-manager | `y67br-5iaaa-aaaah-arn5q-cai` | User identities and profiles | **MEDIUM** |

### Backup Components

1. **Canister Status** - Cycles balance, memory usage, controllers
2. **Canister Info** - Module hash, settings, configuration
3. **Canister Metrics** - Performance and resource metrics
4. **State Snapshots** - Exported state data (when available)

---

## Backup Strategy

### Backup Types

#### 1. Full Backup (Recommended: Daily)
- All canister status and metadata
- Complete state exports
- Timestamp-based directory structure
- Compressed after 7 days

#### 2. Incremental Backup (Optional: Every 6 hours)
- Only changed data
- Lightweight status checks
- Quick verification

#### 3. Critical Backup (Before Upgrades)
- Full backup before any canister upgrade
- Verification of backup integrity
- Test restore on local network

### Retention Policy

| Backup Type | Retention Period | Compression |
|-------------|------------------|-------------|
| Daily backups | 30 days | After 7 days |
| Weekly backups | 90 days | After 14 days |
| Monthly backups | 1 year | After 30 days |
| Pre-upgrade backups | Permanent | After 90 days |

### Storage Recommendations

- **Primary**: Local filesystem with regular disk backups
- **Secondary**: Cloud storage (S3, GCS, etc.)
- **Minimum Space**: 10GB for 30 days of daily backups
- **Recommended Space**: 50GB for full retention policy

---

## Backup Procedures

### Manual Backup

#### Full Backup of All Canisters

```bash
# Basic backup (mainnet)
./scripts/backup-canisters.sh

# Backup with custom output directory
./scripts/backup-canisters.sh --output-dir ~/quri-backups

# Verbose output
./scripts/backup-canisters.sh --verbose

# Skip compression of old backups
./scripts/backup-canisters.sh --no-compress
```

**Expected Output:**
```
===================================================================
  QURI Protocol - Canister Backup System
===================================================================

[INFO] Starting backup of all QURI Protocol canisters...
[INFO] Network: ic
[INFO] Output directory: ./backups/20250124_120000

=================================================================
[INFO] Backing up: rune-engine (pkrpq-5qaaa-aaaah-aroda-cai)
=================================================================
[SUCCESS] Status backed up: rune-engine
[WARN] No export function available for rune-engine - skipping state export

...

[SUCCESS] All canisters backed up successfully!
[SUCCESS] Backup location: ./backups/20250124_120000
```

#### Backup Verification

```bash
# Check backup contents
ls -lh ./backups/20250124_120000/

# View manifest
cat ./backups/20250124_120000/MANIFEST.txt

# Verify canister status
cat ./backups/20250124_120000/rune-engine_status.txt
```

---

### Pre-Upgrade Backup

**CRITICAL: Always backup before upgrading canisters!**

```bash
# 1. Create pre-upgrade backup
./scripts/backup-canisters.sh --output-dir ./backups/pre-upgrade

# 2. Verify backup integrity
ls -lh ./backups/pre-upgrade/$(ls -t ./backups/pre-upgrade | head -1)/

# 3. Proceed with upgrade only if backup succeeded
dfx deploy --network ic <canister-name> --mode upgrade

# 4. Post-upgrade verification
./scripts/monitor-cycles.sh
```

---

## Recovery Procedures

### Restore from Backup

#### Dry-Run (Always test first!)

```bash
# Preview restore without making changes
./scripts/restore-canister.sh \
  --canister rune-engine \
  --backup-dir ./backups/20250124_120000 \
  --network local \
  --dry-run
```

#### Local Network Restore

```bash
# Restore to local dfx network
./scripts/restore-canister.sh \
  --canister rune-engine \
  --backup-dir ./backups/20250124_120000 \
  --network local

# Verify restored canister
dfx canister --network local status rune-engine
```

#### Mainnet Restore (DANGEROUS!)

**WARNING: Only perform mainnet restores in critical situations!**

```bash
# Mainnet restore requires --force flag
./scripts/restore-canister.sh \
  --canister rune-engine \
  --backup-dir ./backups/20250124_120000 \
  --network ic \
  --force

# Requires confirmation: type 'yes' when prompted
```

**Restore Decision Matrix:**

| Scenario | Action | Risk Level |
|----------|--------|-----------|
| Local testing | Restore freely | Low |
| Testnet | Restore with dry-run first | Low |
| Mainnet (non-critical) | Contact team first | **HIGH** |
| Mainnet (critical failure) | Follow emergency procedures | **CRITICAL** |

---

## Cycles Monitoring

### Real-Time Monitoring

```bash
# Basic monitoring (all canisters)
./scripts/monitor-cycles.sh

# Quiet mode (only alerts)
./scripts/monitor-cycles.sh --quiet

# JSON output (for CI/CD)
./scripts/monitor-cycles.sh --json
```

### Threshold Configuration

```bash
# Custom thresholds
./scripts/monitor-cycles.sh \
  --critical 500B \
  --warning 50B

# With webhook notification
./scripts/monitor-cycles.sh \
  --webhook https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  --webhook-type slack
```

### Cycles Thresholds

| Level | Threshold | Action Required | Response Time |
|-------|-----------|-----------------|---------------|
| **CRITICAL** | < 1T cycles | **Immediate top-up** | < 1 hour |
| **WARNING** | < 100B cycles | Plan top-up within 30 days | < 24 hours |
| **HEALTHY** | > 1T cycles | No action needed | - |

### Cycles Top-Up Procedure

```bash
# 1. Check current balance
dfx canister --network ic status <canister-id>

# 2. Calculate required top-up (target: 10T cycles)
# Example: Current = 500B, Need = 9.5T

# 3. Top-up canister
dfx cycles top-up --network ic <canister-id> 9500000000000

# 4. Verify new balance
./scripts/monitor-cycles.sh
```

### Cycles History Analysis

```bash
# View historical cycles data
cat ./cycles_history.json | jq '.[-10:]'  # Last 10 entries

# Calculate burn rate (requires jq)
cat ./cycles_history.json | jq '
  .[-2:] |
  .[0].canisters[0].cycles - .[1].canisters[0].cycles
'
```

---

## Emergency Procedures

### Canister Out of Cycles

**Symptoms:**
- Canister becomes unresponsive
- Queries fail with "out of cycles" error
- Monitor shows CRITICAL status

**Immediate Actions:**

```bash
# 1. Emergency top-up (use maximum available)
dfx cycles top-up --network ic <canister-id> 10000000000000  # 10T

# 2. Verify canister is responsive
dfx canister --network ic status <canister-id>

# 3. Monitor burn rate
./scripts/monitor-cycles.sh --verbose

# 4. Investigate root cause (memory leak, infinite loops, etc.)
```

### Canister Upgrade Failure

**Symptoms:**
- Upgrade command fails
- Canister status shows "Stopped"
- Data appears corrupted

**Recovery Steps:**

```bash
# 1. Check canister status
dfx canister --network ic status <canister-id>

# 2. If stopped, attempt to start
dfx canister --network ic start <canister-id>

# 3. If data corrupted, reinstall from backup (LAST RESORT)
# WARNING: This ERASES all data!
dfx canister --network ic install <canister-id> \
  --mode reinstall \
  --wasm <path-to-wasm>

# 4. Restore state manually if possible
# (This requires canister-specific import functions)
```

### Data Corruption

**Symptoms:**
- Queries return unexpected data
- Stable storage appears corrupted
- Index mismatches

**Diagnostic Steps:**

```bash
# 1. Create immediate backup of current state
./scripts/backup-canisters.sh

# 2. Compare with recent good backup
diff ./backups/current/rune-engine_status.txt \
     ./backups/20250124_120000/rune-engine_status.txt

# 3. Check canister logs (if available)
dfx canister --network ic logs <canister-id>

# 4. Contact development team for state analysis
```

---

## Automation

### Cron Job Setup

Create a crontab entry for automated backups:

```bash
# Edit crontab
crontab -e
```

Add the following entries:

```cron
# QURI Protocol Automated Backups and Monitoring

# Daily backup at 2 AM UTC
0 2 * * * /path/to/QURI-PROTOCOL/scripts/backup-canisters.sh --output-dir /var/backups/quri >> /var/log/quri-backup.log 2>&1

# Cycles monitoring every hour
0 * * * * /path/to/QURI-PROTOCOL/scripts/monitor-cycles.sh --quiet --webhook https://hooks.slack.com/YOUR/WEBHOOK >> /var/log/quri-cycles.log 2>&1

# Weekly backup cleanup (compress old backups)
0 3 * * 0 /path/to/QURI-PROTOCOL/scripts/backup-canisters.sh --compress-age 7 --output-dir /var/backups/quri >> /var/log/quri-cleanup.log 2>&1
```

### systemd Timer (Alternative to cron)

Create `/etc/systemd/system/quri-backup.service`:

```ini
[Unit]
Description=QURI Protocol Canister Backup
After=network.target

[Service]
Type=oneshot
User=quri
ExecStart=/path/to/QURI-PROTOCOL/scripts/backup-canisters.sh --output-dir /var/backups/quri
StandardOutput=journal
StandardError=journal
```

Create `/etc/systemd/system/quri-backup.timer`:

```ini
[Unit]
Description=QURI Protocol Daily Backup Timer

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl enable quri-backup.timer
sudo systemctl start quri-backup.timer
sudo systemctl status quri-backup.timer
```

### CI/CD Integration

#### GitHub Actions Example

```yaml
name: Canister Health Check

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dfx
        run: |
          sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

      - name: Monitor Cycles
        run: |
          ./scripts/monitor-cycles.sh --json > cycles-report.json

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: cycles-report
          path: cycles-report.json

      - name: Alert on Critical
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚨 QURI Protocol: Critical cycles alert!"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Troubleshooting

### Common Issues

#### 1. Backup Script Fails with "dfx not found"

**Solution:**
```bash
# Ensure dfx is in PATH
export PATH="$HOME/.local/share/dfx/bin:$PATH"

# Or use full path
/home/user/.local/share/dfx/bin/dfx --version
```

#### 2. "Permission Denied" on Scripts

**Solution:**
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Verify permissions
ls -l scripts/
```

#### 3. Backup Directory Full

**Solution:**
```bash
# Check disk usage
du -sh ./backups/*

# Compress old backups manually
tar -czf backups/20250101_120000.tar.gz backups/20250101_120000
rm -rf backups/20250101_120000

# Or use the cleanup feature
./scripts/backup-canisters.sh --compress-age 1
```

#### 4. Cannot Connect to Mainnet

**Solution:**
```bash
# Check network connectivity
curl -I https://ic0.app

# Verify dfx network configuration
cat ~/.config/dfx/networks.json

# Use explicit network providers
dfx canister --network ic status <canister-id> --ic-url https://ic0.app
```

#### 5. Cycles Monitoring Shows "ERROR"

**Solution:**
```bash
# Run with verbose mode
./scripts/monitor-cycles.sh --verbose

# Test single canister
dfx canister --network ic status pkrpq-5qaaa-aaaah-aroda-cai

# Check dfx identity
dfx identity whoami
dfx identity get-principal
```

---

## Best Practices

### Daily Operations

1. ✅ **Check cycles daily** - Run `monitor-cycles.sh` once per day minimum
2. ✅ **Review backups weekly** - Verify backups are completing successfully
3. ✅ **Test restores monthly** - Practice restore procedures on local network
4. ✅ **Monitor disk space** - Ensure backup storage has adequate space
5. ✅ **Update runbooks** - Keep procedures current with system changes

### Before Mainnet Deployments

1. ✅ **Full backup** - Create comprehensive backup before any changes
2. ✅ **Dry-run on local** - Test all changes on local dfx network first
3. ✅ **Cycles check** - Ensure sufficient cycles for deployment
4. ✅ **Rollback plan** - Have tested rollback procedure ready
5. ✅ **Team notification** - Inform team of planned deployment window

### Security Considerations

1. 🔒 **Backup encryption** - Encrypt backups containing sensitive data
2. 🔒 **Access control** - Limit who can perform restores to mainnet
3. 🔒 **Audit logging** - Log all backup and restore operations
4. 🔒 **Secure webhooks** - Use HTTPS for all webhook notifications
5. 🔒 **Identity management** - Protect dfx identity keys

---

## Appendix

### Useful Commands Reference

```bash
# Canister Management
dfx canister --network ic status <canister-id>
dfx canister --network ic info <canister-id>
dfx canister --network ic controllers <canister-id>

# Cycles Management
dfx cycles balance
dfx cycles top-up --network ic <canister-id> <amount>
dfx wallet balance --network ic

# Backup/Recovery
./scripts/backup-canisters.sh --help
./scripts/restore-canister.sh --help
./scripts/monitor-cycles.sh --help

# Debugging
dfx canister --network ic logs <canister-id>
dfx canister --network ic call <canister-id> health_check
```

### Canister-Specific Endpoints

**rune-engine:**
```bash
# Health check
dfx canister --network ic call pkrpq-5qaaa-aaaah-aroda-cai health_check

# Get metrics
dfx canister --network ic call pkrpq-5qaaa-aaaah-aroda-cai get_metrics_summary

# Get cycles metrics
dfx canister --network ic call pkrpq-5qaaa-aaaah-aroda-cai get_cycles_metrics
```

**registry:**
```bash
# Get stats
dfx canister --network ic call pnqje-qiaaa-aaaah-arodq-cai get_stats

# Get metrics
dfx canister --network ic call pnqje-qiaaa-aaaah-arodq-cai get_canister_metrics

# Total runes
dfx canister --network ic call pnqje-qiaaa-aaaah-arodq-cai total_runes
```

### Contact Information

**Emergency Contacts:**
- DevOps Lead: [Contact info]
- Backend Team: [Contact info]
- Infrastructure: [Contact info]

**Communication Channels:**
- Slack: #quri-ops
- Emergency: #quri-incidents
- Email: ops@quri-protocol.com

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-24 | 1.0 | Initial runbook creation |

---

**Document Owner:** DevOps Team
**Last Reviewed:** 2025-01-24
**Next Review:** 2025-04-24

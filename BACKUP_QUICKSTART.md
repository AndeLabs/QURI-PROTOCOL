# QURI Protocol - Backup System Quick Start

## TL;DR

QURI Protocol now has a complete backup and recovery system. Here's what you need to know:

```bash
# Daily backup (automated via cron)
./scripts/backup-canisters.sh

# Monitor cycles (hourly recommended)
./scripts/monitor-cycles.sh

# Emergency restore (test with --dry-run first!)
./scripts/restore-canister.sh --canister rune-engine --backup-dir ./backups/20250124_120000 --dry-run
```

## Quick Links

- **Full Documentation**: [docs/BACKUP_SYSTEM.md](docs/BACKUP_SYSTEM.md)
- **Operational Runbook**: [docs/runbooks/BACKUP_RECOVERY.md](docs/runbooks/BACKUP_RECOVERY.md)
- **Scripts Guide**: [scripts/README.md](scripts/README.md)

## 5-Minute Setup

### 1. Verify Prerequisites

```bash
# Check dfx is installed
dfx --version  # Should be 0.15.0+

# Check bc is installed (for cycles calculations)
bc --version

# Ensure scripts are executable
chmod +x scripts/*.sh
```

### 2. Test Backup

```bash
# Create your first backup
./scripts/backup-canisters.sh --verbose

# Verify it worked
ls -lh backups/$(ls -t backups | head -1)/
```

### 3. Test Monitoring

```bash
# Check current cycles
./scripts/monitor-cycles.sh

# Expected output:
# 🟢 rune-engine: 492.00B (pkrpq-5qaaa-aaaah-aroda-cai)
# 🟢 registry: 493.80B (pnqje-qiaaa-aaaah-arodq-cai)
# ...
```

### 4. Set Up Automation (Optional but Recommended)

```bash
# Copy crontab template
cp scripts/crontab.example scripts/crontab.local

# Edit paths (IMPORTANT: Update these!)
vim scripts/crontab.local
# Change QURI_HOME, BACKUP_DIR, LOG_DIR, SLACK_WEBHOOK

# Install crontab
crontab scripts/crontab.local

# Verify it's installed
crontab -l
```

### 5. Configure Webhooks (Optional but Recommended)

```bash
# Get a Slack webhook URL
# Go to: https://api.slack.com/messaging/webhooks

# Test monitoring with webhook
./scripts/monitor-cycles.sh \
  --webhook https://hooks.slack.com/services/YOUR/WEBHOOK \
  --webhook-type slack
```

## What Gets Backed Up

| Canister | ID | Data Backed Up |
|----------|----|----|
| rune-engine | `pkrpq-5qaaa-aaaah-aroda-cai` | Status, cycles, memory, metrics |
| registry | `pnqje-qiaaa-aaaah-arodq-cai` | Status, cycles, memory, metrics |
| bitcoin-integration | `yz6hf-qqaaa-aaaah-arn5a-cai` | Status, cycles, memory, metrics |
| identity-manager | `y67br-5iaaa-aaaah-arn5q-cai` | Status, cycles, memory, metrics |

Note: Full state export/import functions are not yet implemented. Canisters use stable storage which automatically persists across upgrades.

## Alert Thresholds

| Level | Threshold | Exit Code | Action |
|-------|-----------|-----------|--------|
| 🟢 HEALTHY | > 1T cycles | 0 | No action |
| 🟡 WARNING | < 100B cycles | 1 | Plan top-up within 30 days |
| 🔴 CRITICAL | < 1T cycles | 2 | **Immediate top-up required!** |

## Common Tasks

### Pre-Deployment Backup

**ALWAYS backup before deploying to mainnet!**

```bash
# 1. Create backup
./scripts/backup-canisters.sh --output-dir ./backups/pre-deploy

# 2. Verify it succeeded
echo $?  # Should be 0

# 3. Now you can deploy safely
dfx deploy --network ic <canister> --mode upgrade
```

### Emergency Cycles Top-Up

```bash
# 1. Check status
./scripts/monitor-cycles.sh --verbose

# 2. Top-up (example: 10 Trillion cycles)
dfx cycles top-up --network ic pkrpq-5qaaa-aaaah-aroda-cai 10000000000000

# 3. Verify
./scripts/monitor-cycles.sh
```

### Restore from Backup

```bash
# ALWAYS test with --dry-run first!
./scripts/restore-canister.sh \
  --canister rune-engine \
  --backup-dir ./backups/20250124_120000 \
  --dry-run

# If dry-run looks good, restore to local network
./scripts/restore-canister.sh \
  --canister rune-engine \
  --backup-dir ./backups/20250124_120000 \
  --network local

# WARNING: Mainnet restores require --force and should only be done
# in emergencies after consulting the team!
```

### CI/CD Integration

```bash
# Generate JSON report
./scripts/monitor-cycles.sh --json > cycles-report.json

# Use exit code for pass/fail
./scripts/monitor-cycles.sh --quiet
if [ $? -ne 0 ]; then
  echo "ALERT: Cycles below threshold!"
  exit 1
fi
```

## Automation Schedule

Recommended crontab schedule:

```cron
# Daily backups at 2 AM UTC
0 2 * * * ./scripts/backup-canisters.sh

# Hourly cycles monitoring
0 * * * * ./scripts/monitor-cycles.sh --quiet --webhook <YOUR_WEBHOOK>

# Weekly backup compression
0 3 * * 0 ./scripts/backup-canisters.sh --compress-age 7
```

## Troubleshooting

### "dfx not found"

```bash
# Add dfx to PATH
export PATH="$HOME/.local/share/dfx/bin:$PATH"

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export PATH="$HOME/.local/share/dfx/bin:$PATH"' >> ~/.bashrc
```

### "Permission denied"

```bash
chmod +x scripts/*.sh
```

### Backup directory full

```bash
# Check size
du -sh backups/

# Compress old backups
./scripts/backup-canisters.sh --compress-age 1

# Or manually delete old ones
rm -rf backups/202501{01..15}_*
```

### Webhook not working

```bash
# Test webhook manually
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{"text":"Test message from QURI backup system"}'
```

## Script Help

All scripts have built-in help:

```bash
./scripts/backup-canisters.sh --help
./scripts/restore-canister.sh --help
./scripts/monitor-cycles.sh --help
```

## Directory Structure

```
QURI-PROTOCOL/
├── scripts/
│   ├── backup-canisters.sh     # Main backup script
│   ├── restore-canister.sh     # Restore script
│   ├── monitor-cycles.sh       # Cycles monitoring
│   ├── crontab.example         # Automation config
│   └── README.md               # Scripts documentation
├── docs/
│   ├── BACKUP_SYSTEM.md        # Executive summary
│   └── runbooks/
│       └── BACKUP_RECOVERY.md  # Complete runbook
└── backups/                    # Backup storage (created automatically)
    └── YYYYMMDD_HHMMSS/        # Timestamped backups
        ├── MANIFEST.txt
        ├── rune-engine_status.txt
        ├── rune-engine_metrics.txt
        └── ...
```

## Best Practices

1. ✅ **Backup before any mainnet deployment**
2. ✅ **Monitor cycles at least daily**
3. ✅ **Test restore procedures monthly**
4. ✅ **Keep multiple backup copies** (on-site + off-site)
5. ✅ **Set up webhook notifications** for critical alerts
6. ✅ **Review logs regularly** to ensure automation is working
7. ✅ **Document any manual interventions**
8. ✅ **Test webhooks** to ensure alerts are reaching you
9. ✅ **Maintain sufficient disk space** for backups
10. ✅ **Keep runbooks up to date** as the system evolves

## Support

- **Documentation**: Check [docs/runbooks/BACKUP_RECOVERY.md](docs/runbooks/BACKUP_RECOVERY.md)
- **Script Help**: Run `./scripts/<script>.sh --help`
- **Team**: Contact DevOps on Slack (#quri-ops)
- **Emergency**: #quri-incidents

## Next Steps

1. Read the full documentation: [docs/BACKUP_SYSTEM.md](docs/BACKUP_SYSTEM.md)
2. Review the operational runbook: [docs/runbooks/BACKUP_RECOVERY.md](docs/runbooks/BACKUP_RECOVERY.md)
3. Set up automated backups using crontab
4. Configure webhook notifications
5. Practice restore procedures on local network
6. Add backup verification to your deployment checklist

---

**Quick Reference Card**

```bash
# Backup
./scripts/backup-canisters.sh

# Monitor
./scripts/monitor-cycles.sh

# Restore (dry-run)
./scripts/restore-canister.sh --canister <name> --backup-dir <dir> --dry-run

# Top-up cycles
dfx cycles top-up --network ic <canister-id> <amount>

# Automate
crontab scripts/crontab.local
```

---

Last Updated: 2025-01-24
Version: 1.0.0

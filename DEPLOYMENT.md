# Deployment Guide

This guide covers deployment procedures for QURI Protocol across different environments.

## Prerequisites

- dfx 0.15.0 or higher
- Cycles wallet with sufficient cycles
- Authentication configured (`dfx identity use <identity>`)
- Built WASM files

## Environment Overview

### 1. Local Development
- **Network**: Local ICP replica
- **Purpose**: Development and testing
- **Cycle Cost**: Free
- **Data**: Ephemeral (lost on restart)

### 2. Testnet
- **Network**: ICP Testnet
- **Purpose**: Integration testing
- **Cycle Cost**: Free test cycles
- **Data**: Persistent but may be reset

### 3. Mainnet
- **Network**: ICP Mainnet
- **Purpose**: Production
- **Cycle Cost**: Real cycles required
- **Data**: Persistent and immutable

## Local Deployment

### Step 1: Start Local Replica

```bash
# Start clean replica
dfx start --background --clean

# Verify it's running
dfx ping local
```

### Step 2: Build Canisters

```bash
# Build all canisters
make build

# Verify WASM files exist
ls -lh target/wasm32-unknown-unknown/release/*.wasm
```

### Step 3: Deploy

```bash
# Deploy all canisters
dfx deploy

# Or deploy individually
dfx deploy rune-engine
dfx deploy bitcoin-integration --argument '(variant { Testnet }, principal "ryjl3-tyaaa-aaaaa-aaaba-cai")'
dfx deploy registry
dfx deploy identity-manager
```

### Step 4: Verify Deployment

```bash
# Check canister status
dfx canister status rune-engine

# Test basic functionality
dfx canister call rune-engine rune_count
dfx canister call registry total_runes
```

## Testnet Deployment

### Step 1: Configure Network

Add to `dfx.json`:
```json
{
  "networks": {
    "testnet": {
      "providers": ["https://testnet.internetcomputer.org"],
      "type": "persistent"
    }
  }
}
```

### Step 2: Get Test Cycles

```bash
# Request cycles from faucet
dfx wallet --network testnet balance
```

### Step 3: Deploy

```bash
# Deploy to testnet
dfx deploy --network testnet

# Verify deployment
dfx canister --network testnet status rune-engine
```

## Mainnet Deployment

### ⚠️ Pre-Deployment Checklist

- [ ] All tests passing (`make test`)
- [ ] Security audit completed (`make audit`)
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Backup plan prepared
- [ ] Sufficient cycles allocated
- [ ] Monitoring configured

### Step 1: Prepare Cycles

```bash
# Check wallet balance
dfx wallet --network ic balance

# Top up if needed (requires ICP)
dfx ledger --network ic top-up <canister-id> --amount 10.0
```

### Step 2: Configure for Production

Update `dfx.json` with production settings:
```json
{
  "canisters": {
    "bitcoin-integration": {
      "init_arg": "(variant { Mainnet }, principal \"<MAINNET_CKBTC_LEDGER>\")"
    }
  }
}
```

### Step 3: Deploy Canisters

```bash
# Build optimized WASM
make build

# Deploy to mainnet
dfx deploy --network ic

# Record canister IDs
dfx canister --network ic id rune-engine > .canister_ids
```

### Step 4: Post-Deployment Verification

```bash
# Verify all canisters
for canister in rune-engine bitcoin-integration registry identity-manager; do
  echo "Checking $canister..."
  dfx canister --network ic status $canister
done

# Test basic operations
dfx canister --network ic call rune-engine rune_count
```

### Step 5: Monitor

```bash
# Watch cycles consumption
watch -n 60 'dfx canister --network ic status rune-engine | grep Cycles'

# Set up alerts for low cycles
# (implement monitoring service)
```

## Upgrade Procedure

### Preparation

1. **Test Upgrade Locally**
   ```bash
   # Build new version
   make build

   # Upgrade locally first
   dfx canister install rune-engine --mode upgrade

   # Verify state persisted
   dfx canister call rune-engine rune_count
   ```

2. **Create Backup**
   ```bash
   # Export state if possible
   # (implement state export function)
   ```

### Mainnet Upgrade

```bash
# Build new version
make build

# Upgrade canister
dfx canister --network ic install rune-engine --mode upgrade

# Verify upgrade succeeded
dfx canister --network ic status rune-engine

# Test functionality
dfx canister --network ic call rune-engine rune_count
```

### Rollback Plan

If upgrade fails:

```bash
# Stop canister
dfx canister --network ic stop rune-engine

# Reinstall previous version
dfx canister --network ic install rune-engine --mode reinstall --wasm <previous.wasm>

# Start canister
dfx canister --network ic start rune-engine
```

## Cycle Management

### Monitoring Cycles

```bash
# Check cycles for all canisters
dfx canister --network ic status --all | grep Cycles

# Set freezing threshold (90 days)
dfx canister --network ic update-settings rune-engine --freezing-threshold 7776000
```

### Top-Up Strategy

- Monitor cycles weekly
- Alert when <1T cycles remaining
- Auto-top-up from wallet (implement)
- Target: 6-12 months of operation

### Cost Estimation

Approximate costs per canister:
- **Storage**: ~$5/GB/year
- **Compute**: ~$0.0000004 per instruction
- **HTTP Requests**: ~$0.0004 per call

Initial allocation: **10T cycles** per canister (~$13 USD)

## Security Considerations

### Access Control

```bash
# Set canister controllers
dfx canister --network ic update-settings rune-engine \
  --add-controller <principal-id>

# Verify controllers
dfx canister --network ic info rune-engine
```

### Secrets Management

- **Never commit**: Private keys, cycle wallet IDs
- **Use environment variables**: For sensitive configuration
- **Encrypt**: Backup files

### Audit Trail

Maintain records of:
- Deployment timestamps
- Version numbers
- Canister IDs
- Controller principals
- Cycle top-ups

## Disaster Recovery

### Backup Strategy

1. **State Snapshots**: Weekly automated snapshots
2. **WASM Archival**: Keep all deployed versions
3. **Configuration Backup**: Store dfx.json and settings

### Recovery Procedure

```bash
# 1. Deploy new canister
dfx canister --network ic create rune-engine

# 2. Install last known good WASM
dfx canister --network ic install rune-engine --wasm backup.wasm

# 3. Restore state (if export/import implemented)
# dfx canister call rune-engine import_state '(...)'

# 4. Update frontend with new canister ID
```

## Monitoring and Alerts

### Health Checks

```bash
# Create monitoring script
#!/bin/bash
for canister in rune-engine bitcoin-integration registry identity-manager; do
  status=$(dfx canister --network ic status $canister 2>&1)
  if [[ $status == *"Running"* ]]; then
    echo "✓ $canister: Running"
  else
    echo "✗ $canister: ERROR"
    # Send alert
  fi
done
```

### Metrics to Track

- Canister status (Running/Stopped)
- Cycles remaining
- Memory usage
- Request count
- Error rate

## Troubleshooting

### Common Issues

**Issue: "Canister out of cycles"**
```bash
# Top up immediately
dfx ledger --network ic top-up <canister-id> --amount 5.0
```

**Issue: "Upgrade failed"**
```bash
# Check logs
dfx canister --network ic logs <canister-id>

# Try reinstall (⚠️ loses state)
dfx canister --network ic install <canister-id> --mode reinstall
```

**Issue: "Cannot connect to replica"**
```bash
# Verify network
dfx ping ic

# Check dfx version
dfx --version

# Update dfx
dfxvm update
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy to Mainnet

on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dfx
        run: sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

      - name: Build canisters
        run: make build

      - name: Deploy to mainnet
        env:
          DFX_IDENTITY: ${{ secrets.DFX_IDENTITY }}
        run: |
          dfx identity import default <(echo "$DFX_IDENTITY")
          dfx deploy --network ic
```

## Cost Optimization

### Tips

1. **Optimize WASM size**: Use `opt-level = 'z'`
2. **Efficient data structures**: Use stable structures wisely
3. **Batch operations**: Reduce inter-canister calls
4. **Cache frequently accessed data**: Minimize storage reads

### Expected Monthly Costs

For moderate usage:
- **Storage** (10GB): ~$4
- **Compute** (1M calls): ~$0.40
- **Total**: ~$5-10/month per canister

## Conclusion

- Always test on local/testnet first
- Monitor cycles proactively
- Keep backups of WASM and state
- Document all deployments
- Have rollback plan ready

For questions or issues, contact the team or open an issue on GitHub.

#!/bin/bash

# Script para sincronizar runes desde Hiro API al canister Registry en mainnet
# Este script llama directamente al canister sin necesidad de privilegios de admin

set -e

REGISTRY_CANISTER="pnqje-qiaaa-aaaah-arodq-cai"
NETWORK="ic"

echo "🚀 QURI Protocol - Rune Synchronization Script"
echo "================================================"
echo ""
echo "Registry Canister: $REGISTRY_CANISTER"
echo "Network: $NETWORK (mainnet)"
echo ""

# Función para obtener el total de runes en Hiro API
get_total() {
    echo "📊 Getting total runes from Hiro API..."
    dfx canister --network $NETWORK call $REGISTRY_CANISTER get_hiro_total
}

# Función para sincronizar un batch de runes
sync_batch() {
    local offset=$1
    local limit=$2
    echo "🔄 Syncing batch: offset=$offset, limit=$limit"
    dfx canister --network $NETWORK call $REGISTRY_CANISTER sync_runes_from_hiro "($offset : nat32, $limit : nat32)"
}

# Función para sincronizar en batch automático
batch_sync() {
    local start_offset=$1
    local total_to_fetch=$2
    echo "🔄 Starting batch sync: start_offset=$start_offset, total_to_fetch=$total_to_fetch"
    dfx canister --network $NETWORK call $REGISTRY_CANISTER batch_sync_runes "($start_offset : nat32, $total_to_fetch : nat32)"
}

# Función para obtener estadísticas del indexer
get_stats() {
    echo "📊 Getting indexer stats..."
    dfx canister --network $NETWORK call $REGISTRY_CANISTER get_indexer_stats
}

# Menu interactivo
echo "Select an option:"
echo "1) Get total runes from Hiro API"
echo "2) Sync single batch (60 runes)"
echo "3) Sync 1,000 runes (incremental)"
echo "4) Sync 10,000 runes"
echo "5) Sync ALL runes (~232,000)"
echo "6) Get current indexer stats"
echo ""
read -p "Enter option (1-6): " option

case $option in
    1)
        get_total
        ;;
    2)
        read -p "Enter offset (default 0): " offset
        offset=${offset:-0}
        sync_batch $offset 60
        ;;
    3)
        read -p "Enter start offset (default 0): " offset
        offset=${offset:-0}
        batch_sync $offset 1000
        ;;
    4)
        read -p "Enter start offset (default 0): " offset
        offset=${offset:-0}
        batch_sync $offset 10000
        ;;
    5)
        echo ""
        echo "⚠️  WARNING: This will sync ALL runes from Hiro API"
        echo "   This may take significant time and cycles"
        echo ""
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" == "yes" ]; then
            # Get total first
            total=$(dfx canister --network $NETWORK call $REGISTRY_CANISTER get_hiro_total | grep -oP '\d+' | head -1)
            echo "Total runes to sync: $total"
            batch_sync 0 $total
        else
            echo "Cancelled"
        fi
        ;;
    6)
        get_stats
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"
echo ""
echo "💡 Tip: Run option 6 to verify the sync status"

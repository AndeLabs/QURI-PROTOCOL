#!/bin/bash

# Sincronización gradual automática
# Ejecuta este script con cron cada hora para sincronizar gradualmente

set -e

REGISTRY="pnqje-qiaaa-aaaah-arodq-cai"
BATCH_SIZE=300  # 5 llamadas de 60 runes cada una
MAX_RETRIES=3

echo "🔄 [$(date)] Iniciando sincronización gradual..."

# Obtener offset actual
export DFX_WARNING=-mainnet_plaintext_identity
STATS=$(dfx canister call $REGISTRY --network ic get_indexer_stats 2>&1 | grep "total_runes")
CURRENT=$(echo $STATS | grep -o '[0-9]\+' | head -1)

echo "📊 Runes actuales: $CURRENT"
echo "🎯 Sincronizando $BATCH_SIZE más..."

# Intentar sincronizar con reintentos
for retry in $(seq 1 $MAX_RETRIES); do
    echo "Intento $retry de $MAX_RETRIES..."

    if dfx canister call $REGISTRY --network ic batch_sync_runes "($CURRENT : nat32, $BATCH_SIZE : nat32)" 2>&1 | grep -q "Ok"; then
        echo "✅ [$(date)] Sincronización exitosa!"

        # Verificar cuántos se agregaron
        NEW_STATS=$(dfx canister call $REGISTRY --network ic get_indexer_stats 2>&1 | grep "total_runes")
        NEW_CURRENT=$(echo $NEW_STATS | grep -o '[0-9]\+' | head -1)
        ADDED=$((NEW_CURRENT - CURRENT))

        echo "➕ Agregados: $ADDED runes (Total: $NEW_CURRENT)"
        exit 0
    else
        echo "❌ Intento $retry falló"
        if [ $retry -lt $MAX_RETRIES ]; then
            echo "⏳ Esperando 2 minutos antes de reintentar..."
            sleep 120
        fi
    fi
done

echo "❌ [$(date)] Todos los intentos fallaron. Intentar más tarde."
exit 1

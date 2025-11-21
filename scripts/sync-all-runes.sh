#!/bin/bash

# Script para sincronizar TODOS los runes desde Hiro API
# Este script NO requiere privilegios de admin porque las funciones son públicas

set -e

REGISTRY_CANISTER="pnqje-qiaaa-aaaah-arodq-cai"
NETWORK="ic"

echo "🚀 QURI Protocol - Sincronización Completa de Runes"
echo "===================================================="
echo ""
echo "Registry Canister: $REGISTRY_CANISTER"
echo "Network: $NETWORK (mainnet)"
echo ""

# Función para sincronizar batch
sync_batch() {
    local start_offset=$1
    local total=$2

    echo "🔄 Sincronizando batch: offset=$start_offset, total=$total"

    export DFX_WARNING=-mainnet_plaintext_identity
    dfx canister call $REGISTRY_CANISTER --network $NETWORK batch_sync_runes "($start_offset : nat32, $total : nat32)"
}

# Función para ver estadísticas
get_stats() {
    echo "📊 Obteniendo estadísticas del indexer..."
    export DFX_WARNING=-mainnet_plaintext_identity
    dfx canister call $REGISTRY_CANISTER --network $NETWORK get_indexer_stats
}

# Menu
echo "Selecciona una opción:"
echo "1) Ver estadísticas actuales"
echo "2) Sincronizar +1,000 runes"
echo "3) Sincronizar +5,000 runes"
echo "4) Sincronizar +10,000 runes"
echo "5) Sincronizar TODOS (~232,000 runes) - TOMA MUCHO TIEMPO"
echo ""
read -p "Opción (1-5): " option

case $option in
    1)
        get_stats
        ;;
    2)
        echo ""
        echo "⚠️  Esto sincronizará los próximos 1,000 runes"
        echo "   Tiempo estimado: ~2-3 minutos"
        echo ""
        read -p "¿Continuar? (s/n): " confirm
        if [ "$confirm" == "s" ]; then
            # Primero obtenemos cuántos hay ya sincronizados
            echo "Obteniendo offset actual..."
            get_stats
            echo ""
            echo "Por favor ingresa el offset actual (número de runes ya sincronizados):"
            read current_offset
            sync_batch $current_offset 1000
            echo ""
            get_stats
        fi
        ;;
    3)
        echo ""
        echo "⚠️  Esto sincronizará los próximos 5,000 runes"
        echo "   Tiempo estimado: ~10-15 minutos"
        echo ""
        read -p "¿Continuar? (s/n): " confirm
        if [ "$confirm" == "s" ]; then
            get_stats
            echo ""
            echo "Por favor ingresa el offset actual:"
            read current_offset
            sync_batch $current_offset 5000
            echo ""
            get_stats
        fi
        ;;
    4)
        echo ""
        echo "⚠️  Esto sincronizará los próximos 10,000 runes"
        echo "   Tiempo estimado: ~20-30 minutos"
        echo ""
        read -p "¿Continuar? (s/n): " confirm
        if [ "$confirm" == "s" ]; then
            get_stats
            echo ""
            echo "Por favor ingresa el offset actual:"
            read current_offset
            sync_batch $current_offset 10000
            echo ""
            get_stats
        fi
        ;;
    5)
        echo ""
        echo "⚠️⚠️⚠️  ATENCIÓN  ⚠️⚠️⚠️"
        echo ""
        echo "Esto sincronizará TODOS los ~232,000 runes desde Hiro API"
        echo ""
        echo "Consideraciones:"
        echo "- Tiempo estimado: 8-12 HORAS"
        echo "- Consumo de cycles: ~5-6 Trillion cycles"
        echo "- El proceso puede fallar si se queda sin cycles"
        echo ""
        echo "RECOMENDACIÓN: Mejor usar batches de 5,000-10,000"
        echo ""
        read -p "¿Estás SEGURO de continuar? (escribe 'SI' para confirmar): " confirm
        if [ "$confirm" == "SI" ]; then
            get_stats
            echo ""
            echo "Por favor ingresa el offset actual:"
            read current_offset

            # Calcular cuánto falta
            total=232352
            remaining=$((total - current_offset))

            echo ""
            echo "Offset actual: $current_offset"
            echo "Total disponible: $total"
            echo "Por sincronizar: $remaining"
            echo ""
            read -p "¿Proceder con la sincronización completa? (s/n): " final_confirm

            if [ "$final_confirm" == "s" ]; then
                sync_batch $current_offset $remaining
                echo ""
                echo "✅ Sincronización completa!"
                get_stats
            fi
        else
            echo "Cancelado. Usa opciones 2, 3, o 4 para sincronizar en batches."
        fi
        ;;
    *)
        echo "Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "✅ Operación completada!"
echo ""
echo "💡 Puedes verificar los runes en: http://localhost:3002/explorer"

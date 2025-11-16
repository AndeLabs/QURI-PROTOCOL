# Runes vs Orbitals - Aclaración

## ❓ ¿Qué estamos construyendo?

### 🟠 Bitcoin Runes (LO QUE TENEMOS)

**QURI Protocol actualmente crea BITCOIN RUNES reales** - tokens fungibles nativos en la blockchain de Bitcoin.

**¿Qué son Bitcoin Runes?**
- Protocolo de tokens fungibles creado por Casey Rodarmor (creador de Ordinals) en 2024
- Se "etchan" (graban) permanentemente en la blockchain de Bitcoin
- Similar a ERC-20 en Ethereum, pero nativos de Bitcoin
- Usan OP_RETURN en transacciones Bitcoin para almacenar data
- Ejemplos reales: UNCOMMON•GOODS, RSIC•GENESIS•RUNE

**Proceso de creación en QURI:**
1. Frontend: Formulario + Upload a IPFS
2. Backend: Rune Engine Canister (orquestador)
3. Bitcoin Integration: Construye transacción Runestone
4. Threshold Schnorr: Firma segura usando ICP
5. Broadcast: Envía a red Bitcoin (testnet/mainnet)
6. Registry: Indexa para aparecer en DEX/Explorer

**Ubicación en la app:**
- `/dashboard/create` - Crear nuevos Runes
- `/dashboard/dex` - Tradear Runes
- `/dashboard/explorer` - Ver todos los Runes
- `/gallery` - Galería de Runes creados

---

## 🔵 Orbitals (NO IMPLEMENTADO)

**Los Orbitals NO están en el código actual de QURI Protocol.**

**¿Qué son los Orbitals?**
Los Orbitals son otro concepto en el ecosistema Bitcoin:
- Satoshis (sats) individuales con metadatos attached
- Similar a Ordinals pero con diferente enfoque
- Propuesta alternativa para NFTs en Bitcoin
- NO son lo mismo que Runes

**Estado en QURI:**
```bash
$ grep -r "orbital" . --include="*.rs" --include="*.ts" --include="*.tsx"
# No results found
```

**Conclusión:** QURI Protocol está 100% enfocado en **Bitcoin Runes**, no en Orbitals.

---

## 🎯 Resumen Ejecutivo

| Característica | Bitcoin Runes (✅ Implementado) | Orbitals (❌ No implementado) |
|---------------|--------------------------------|------------------------------|
| **Tipo** | Tokens fungibles | NFTs/Satoshis individuales |
| **Protocolo** | Runestone (Casey Rodarmor) | Propuesta alternativa |
| **En QURI** | Sí - completamente funcional | No existe en el código |
| **Dónde crear** | `/dashboard/create` | N/A |
| **Casos de uso** | DeFi, tokens, governance | Coleccionables, arte |

---

## 📚 Recursos Adicionales

### Bitcoin Runes (lo que usamos):
- Especificación oficial: https://docs.ordinals.com/runes.html
- Runes en producción: https://ordinals.com/runes
- Explorer: https://mempool.space/testnet (ver Runestones)

### Diferencia clave:
- **Runes** = Fungibles (como monedas, todos iguales)
- **Ordinals/Orbitals** = NFTs (cada uno único)

---

## 🔧 Para desarrolladores futuros

Si en el futuro se decide agregar soporte para Orbitals:

1. Crear nuevo canister `orbital-engine`
2. Implementar lógica de inscripción individual de satoshis
3. Agregar UI en `/dashboard/create-orbital`
4. Integrar con Ordinals indexers

**Por ahora: Solo Runes.**

# 🎯 Rune Name vs Symbol - Guía Completa

## ❓ Problema Común

Muchos usuarios se confunden y ponen lo mismo en **Name** y **Symbol**. Por ejemplo:
- Name: `PEPE`
- Symbol: `PEPE` ❌ **INCORRECTO**

## ✅ Diferencias Clave

### 🏷️ Rune Name (Nombre)
El **nombre completo** del token en la blockchain de Bitcoin.

**Características:**
- 1 a 26 caracteres
- Solo letras A-Z
- Puede usar espaciador `•` (bullet)
- Es **único** en toda la red Bitcoin
- **Inmutable** (no se puede cambiar después de crear)

**Ejemplos Reales:**
```
UNCOMMON•GOODS
QUANTUM•LEAP  
HELLO•WORLD
PEPE
RSIC•GENESIS•RUNE
```

**Analogía:** Es como el nombre legal completo de una persona: "Juan Carlos García"

---

### 💱 Symbol (Símbolo)
Un **único carácter** que aparece **después** de las cantidades, como símbolo de moneda.

**Características:**
- **EXACTAMENTE 1 carácter**
- Puede ser: letra, emoji, símbolo especial
- Aparece después de cantidades: `1000 ₿`
- Si no se especifica, usa `¤` por defecto

**Ejemplos Correctos:**
```
₿  (Bitcoin symbol)
🐸 (frog emoji - perfecto para PEPE)
Ⱡ  (letra especial)
$  (dollar sign)
🧿 (evil eye)
¢  (cent)
€  (euro)
```

**Analogía:** Es como el símbolo $ para dólares o € para euros. **NO es un ticker como "USD" o "BTC"**.

---

## 📊 Ejemplos Completos

### Ejemplo 1: PEPE Token
```
Rune Name: PEPE
Symbol: 🐸 (frog emoji)

Cómo se ve:
- Name: "PEPE"
- Balance: "1,000,000 🐸"
```

### Ejemplo 2: UNCOMMON GOODS
```
Rune Name: UNCOMMON•GOODS
Symbol: 🧿 (evil eye emoji)

Cómo se ve:
- Name: "UNCOMMON•GOODS"
- Balance: "500.25 🧿"
```

### Ejemplo 3: QUANTUM LEAP
```
Rune Name: QUANTUM•LEAP
Symbol: ₿ (Bitcoin symbol)

Cómo se ve:
- Name: "QUANTUM•LEAP"
- Balance: "10,000 ₿"
```

### Ejemplo 4: DOG (meme coin)
```
Rune Name: DOG•GO•TO•THE•MOON
Symbol: 🐕 (dog emoji)

Cómo se ve:
- Name: "DOG•GO•TO•THE•MOON"
- Balance: "1,000,000,000 🐕"
```

---

## 🚫 Errores Comunes

### ❌ Error 1: Poner palabra en Symbol
```
Name: PEPE
Symbol: PEPE  ← INCORRECTO (4 caracteres)
```

**Correcto:**
```
Name: PEPE
Symbol: 🐸  ← 1 carácter
```

---

### ❌ Error 2: Poner ticker en Symbol
```
Name: QUANTUM•LEAP
Symbol: QLEP  ← INCORRECTO (esto NO es un ticker)
```

**Correcto:**
```
Name: QUANTUM•LEAP
Symbol: Ⱡ  ← 1 carácter especial
```

---

### ❌ Error 3: No usar espaciador en Name
```
Name: QUANTUMLEAP  ← Difícil de leer
```

**Mejor:**
```
Name: QUANTUM•LEAP  ← Más legible
```

---

## 🎨 Cómo Elegir un Buen Symbol

### Opción 1: Emoji Relacionado
- **PEPE** → 🐸 (frog)
- **DOG** → 🐕 (dog)
- **MOON** → 🌙 (moon)
- **FIRE** → 🔥 (fire)

### Opción 2: Símbolo de Moneda
- ₿ (Bitcoin)
- $ (Dollar)
- € (Euro)
- ¢ (Cent)
- £ (Pound)

### Opción 3: Letra Especial
- Ⱡ (L stroke)
- Ⱥ (A with stroke)
- Ɓ (B with hook)
- Ᵽ (P with stroke)

### Opción 4: Símbolo Matemático/Especial
- ∞ (infinity)
- ◊ (diamond)
- ★ (star)
- ● (circle)

---

## 💻 Cómo Escribir el Bullet •

### Windows
```
Alt + 8
```

### Mac
```
Option + 8
```

### Linux
```
Compose + . + =
```

### Copiar/Pegar
```
•
```

---

## 📱 Cómo Se Ve en Wallets

### En un Explorador de Blockchain:
```
Name: UNCOMMON•GOODS
Symbol: 🧿
Supply: 1,000,000,000
Divisibility: 8
```

### En Tu Wallet:
```
UNCOMMON•GOODS
Balance: 1,234.56789012 🧿
Value: $123.45 USD
```

### En un Exchange:
```
Trading Pair: UNCOMMON•GOODS/BTC
Price: 0.00000123 BTC
Your Holdings: 10,000 🧿
```

---

## 🔍 Especificación Oficial

Según la documentación oficial de **ord** (Ordinals):

```rust
struct Etching {
  rune: Option<Rune>,        // Name (1-26 letters A-Z)
  symbol: Option<char>,      // Symbol (1 Unicode character)
  divisibility: Option<u8>,  // Decimals (0-18)
  premine: Option<u128>,
  terms: Option<Terms>,
}
```

**Fuente:** https://github.com/ordinals/ord/blob/master/docs/src/runes/specification.md

---

## ✅ Checklist Antes de Crear

- [ ] **Name**: Solo A-Z y `•`, máximo 26 caracteres
- [ ] **Symbol**: Exactamente 1 carácter (emoji, letra especial, o símbolo)
- [ ] **Name ≠ Symbol** (son diferentes)
- [ ] **Symbol aparecerá después de cantidades** (1000 🐸)
- [ ] **Name es único** en toda la red Bitcoin

---

## 🎯 Resumen en 3 Puntos

1. **Name** = Nombre completo del token (como "Bitcoin" o "Ethereum")
2. **Symbol** = Símbolo de moneda (como $ o €)
3. **Symbol** = **1 SOLO carácter**, no una palabra

---

**¿Todavía confundido?**

Piensa en Bitcoin:
- **Name**: BITCOIN (si fuera un Rune sería solo las letras)
- **Symbol**: ₿ (el símbolo que ves: 1 ₿ = $50,000)

Para PEPE sería:
- **Name**: PEPE
- **Symbol**: 🐸 (no "PEPE" otra vez)

---

## 📚 Referencias

- [Runes Official Specification](https://docs.ordinals.com/runes.html)
- [Ord GitHub - Runes](https://github.com/ordinals/ord/blob/master/docs/src/runes/specification.md)
- [Bitcoin Runes Explained](https://www.okx.com/learn/premine-mine-mint-runes)

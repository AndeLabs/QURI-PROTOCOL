# 🏛️ QURI Protocol - Museum Design Strategy

**Fecha:** 2025-01-18
**Objetivo:** Transformar el frontend en una experiencia de museo digital elegante donde los Runes son obras de arte

---

## 🎨 FILOSOFÍA DE DISEÑO

### **Core Principles**
1. **Museo Digital** - Cada Rune es una pieza única que merece presentación premium
2. **Minimalismo Elegante** - Simple visualmente, complejo internamente
3. **Psicología del Lujo** - Diseño que comunica valor y exclusividad
4. **Micro-interacciones** - Cada botón responde, cada hover cuenta
5. **Arquitectura Modular** - Componentes reutilizables y escalables

---

## 📊 INVESTIGACIÓN - HALLAZGOS CLAVE

### **1. Diseños Tipo Museo (2024-2025)**

#### **Tendencias Dominantes:**
- ✅ **Minimalismo con propósito** - Layouts limpios que destacan el contenido
- ✅ **Uso estratégico de white space** - 60-70% del espacio para aislar elementos premium
- ✅ **Tipografía elegante** - Serif para títulos, Sans-serif para cuerpo
- ✅ **Videos full-screen** - Hero sections impactantes (ej: Guggenheim Bilbao)
- ✅ **Color palettes suaves** - Tonos museo: whites, creams, light grays, gold accents

#### **Ejemplos Inspiradores:**
- **Adrian Sassoon** - Paleta refinada con acentos azules
- **Guggenheim Bilbao** - Videos hero + diseño basado en tiles
- **MoMA** - Grid systems + espacios generosos

---

### **2. Psicología del Diseño de Lujo**

#### **White Space = Luxury**
- **Efecto de aislamiento:** Objetos rodeados de espacio se perciben **40% más memorables**
- **Asociaciones psicológicas:** Sofisticación, confianza, calidad premium
- **Retailers de lujo:** Dedican 60-70% del espacio above-the-fold a producto
- **Resultado:** Mayor disposición a pagar + lealtad de marca

#### **Golden Ratio (φ = 1.618)**
- **Aplicación en spacing:** Usar factor 1.6 para espaciado entre elementos
- **Proporciones naturales:** Crea composiciones balanceadas
- **Ejemplo:** Si un elemento mide 100px, el siguiente debería estar a ~160px

#### **Visual Hierarchy para NFTs/Objetos Premium**
- **Estudio académico (2024):** Visualización clara = Mayor confianza + Precios más altos
- **Key insight:** La presentación afecta directamente la percepción de autenticidad

---

### **3. Micro-interacciones Modernas (2025)**

#### **Tipos de Hover Effects:**

**1. Color Changes**
```typescript
// Sutil cambio de color que señala interactividad
hover:bg-museum-cream hover:border-gold-300 transition-colors duration-200
```

**2. Scaling Effects**
```typescript
// Efecto de "lift" suave
hover:scale-105 transition-transform duration-300 ease-out
```

**3. Magnetic Effects**
```typescript
// Elementos que "saltan" hacia el cursor
transform: translateY(-4px)
```

**4. Icon Changes**
```typescript
// Iconos que cambian al hover (ej: arrow → arrow-right)
```

#### **Best Practices:**
- ⏱️ **Duración:** 200-300ms para feedback UI
- 🎯 **Propósito:** Cada animación debe comunicar algo
- 🚫 **Evitar:** Animaciones que distraen o bloquean interacción
- ✅ **Usar:** CSS transforms (scale, translate) + opacity (GPU-accelerated)

---

### **4. Librería Recomendada: Framer Motion**

#### **Por qué Framer Motion?**
- ✅ **Usado por:** Stripe, Notion, Framer (empresas tier-1)
- ✅ **API declarativa** - Fácil de usar y mantener
- ✅ **Performance** - Animaciones hardware-accelerated
- ✅ **Features:**
  - `whileHover`, `whileTap` - Interacciones instantáneas
  - `exit` animations - Transiciones suaves
  - Automatic Layout Animations
  - Drag & Drop built-in
  - Physics-based springs

#### **Instalación:**
```bash
npm install framer-motion
```

#### **Ejemplo Básico:**
```tsx
import { motion } from 'framer-motion';

<motion.div
  whileHover={{ scale: 1.05, y: -4 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 300, damping: 20 }}
  className="rune-card"
>
  <RuneContent />
</motion.div>
```

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### **FASE 1: Fundamentos del Museo (1-2 días)**

#### **1.1 Instalación de Dependencias**
```bash
npm install framer-motion
npm install @radix-ui/react-tooltip @radix-ui/react-dialog
npm install clsx tailwind-merge
```

#### **1.2 Actualizar Design Tokens**

**Agregar a `design-system/tokens/colors.ts`:**
```typescript
// Museum Premium Colors
export const museumPremium = {
  'gold-50': '#FFFBF0',
  'gold-100': '#FFF4D6',
  'gold-200': '#FFE9AD',
  'gold-300': '#FFD666',  // Accent primary
  'gold-400': '#FFC233',
  'gold-500': '#FFB800',
  'cream-white': '#FDFDF8',
  'exhibition-gray': '#F5F5F0',
  'frame-charcoal': '#2C2C2C',
} as const;
```

**Agregar a `design-system/tokens/spacing.ts`:**
```typescript
// Golden Ratio Spacing (φ = 1.618)
export const goldenRatio = {
  'gr-xs': '0.618rem',   // 9.9px
  'gr-sm': '1rem',       // 16px
  'gr-base': '1.618rem', // 25.9px
  'gr-md': '2.618rem',   // 41.9px
  'gr-lg': '4.236rem',   // 67.8px
  'gr-xl': '6.854rem',   // 109.7px
} as const;

// Museum Spacing (generous isolation)
export const museumSpacing = {
  'card-padding': '2rem',
  'card-gap': '3rem',      // Golden ratio: 2 * 1.5
  'section-padding': '5rem',
  'hero-padding': '8rem',
  'isolation-space': '4rem', // Extra space around premium items
} as const;
```

#### **1.3 Crear Animation Presets**

**Crear `design-system/motion/presets.ts`:**
```typescript
import { Variants } from 'framer-motion';

// Card Animations
export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1], // Custom easing
    },
  },
  hover: {
    y: -8,
    scale: 1.02,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  tap: {
    scale: 0.98,
  },
};

// Gallery Grid Stagger
export const gridVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08, // Efecto cascada
    },
  },
};

// Fade In Up (para textos)
export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 24,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

// Magnetic Button
export const magneticVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },
  tap: { scale: 0.95 },
};

// Page Transitions
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2,
    },
  },
};
```

---

### **FASE 2: Componentes Premium (2-3 días)**

#### **2.1 RuneCard Premium**

**Crear `components/runes/RuneCardPremium.tsx`:**
```tsx
'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useState, useRef } from 'react';
import { RegistryEntry } from '@/types/canisters';
import { cardVariants } from '@/design-system/motion/presets';

interface RuneCardPremiumProps {
  rune: RegistryEntry;
  onSelect?: () => void;
}

export function RuneCardPremium({ rune, onSelect }: RuneCardPremiumProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Magnetic effect on hover
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-50, 50], [5, -5]);
  const rotateY = useTransform(x, [-50, 50], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className="group relative cursor-pointer"
    >
      {/* Card Container */}
      <div className="relative bg-museum-white border border-museum-light-gray rounded-2xl overflow-hidden">
        {/* Gradient Header with Symbol */}
        <motion.div
          className="h-48 bg-gradient-to-br from-gold-100 via-museum-cream to-gold-50 relative"
          animate={{
            backgroundPosition: isHovered ? '100% 100%' : '0% 0%',
          }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-5">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="museum-pattern"
                  x="0"
                  y="0"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="20" cy="20" r="1" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#museum-pattern)" />
            </svg>
          </div>

          {/* Rune Symbol */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-7xl font-bold text-gold-400 drop-shadow-lg"
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {rune.metadata.symbol}
            </motion.div>
          </div>

          {/* Shimmer Effect on Hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
            animate={{
              x: isHovered ? '100%' : '-100%',
              opacity: isHovered ? 0.3 : 0,
            }}
            transition={{ duration: 0.8 }}
          />
        </motion.div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <motion.h3
              className="font-serif text-2xl font-bold text-museum-black mb-1"
              animate={{
                color: isHovered ? '#FFB800' : '#1A1A1A',
              }}
            >
              {rune.metadata.name}
            </motion.h3>
            <p className="text-sm text-museum-dark-gray font-mono">
              {rune.metadata.key.block.toString()}:{rune.metadata.key.tx}
            </p>
          </div>

          {/* Divider */}
          <motion.div
            className="h-px bg-gradient-to-r from-transparent via-gold-200 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isHovered ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-museum-cream rounded-lg p-3">
              <p className="text-xs text-museum-dark-gray mb-1">Total Supply</p>
              <p className="font-semibold text-museum-black">
                {Number(rune.metadata.total_supply).toLocaleString()}
              </p>
            </div>
            <div className="bg-museum-cream rounded-lg p-3">
              <p className="text-xs text-museum-dark-gray mb-1">Holders</p>
              <p className="font-semibold text-museum-black">
                {rune.holder_count?.toString() || '0'}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <motion.button
            className="w-full py-3 px-4 bg-gold-300 hover:bg-gold-400 text-museum-black font-semibold rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View Details
          </motion.button>
        </div>

        {/* Glow Effect on Hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: isHovered
              ? '0 0 40px rgba(255, 184, 0, 0.3)'
              : '0 0 0px rgba(255, 184, 0, 0)',
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
```

#### **2.2 Gallery Grid con Stagger Animation**

**Actualizar `components/runes/RuneGrid.tsx`:**
```tsx
'use client';

import { motion } from 'framer-motion';
import { gridVariants } from '@/design-system/motion/presets';
import { RuneCardPremium } from './RuneCardPremium';
import { RegistryEntry } from '@/types/canisters';

interface RuneGridProps {
  runes: RegistryEntry[];
  columns?: 2 | 3 | 4;
}

export function RuneGrid({ runes, columns = 3 }: RuneGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      animate="show"
      className={`grid ${gridCols[columns]} gap-8`}
    >
      {runes.map((rune) => (
        <RuneCardPremium
          key={`${rune.metadata.key.block}:${rune.metadata.key.tx}`}
          rune={rune}
        />
      ))}
    </motion.div>
  );
}
```

---

### **FASE 3: Página Gallery Premium (1 día)**

#### **3.1 Hero Section con Parallax**

**Actualizar `app/gallery/page.tsx`:**
```tsx
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { RuneGrid } from '@/components/runes/RuneGrid';
import { fadeInUp } from '@/design-system/motion/presets';

export default function GalleryPage() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 300], [0, 100]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <div className="min-h-screen bg-museum-white">
      {/* Hero Section */}
      <motion.section
        style={{ y, opacity }}
        className="relative h-[60vh] flex items-center justify-center overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-gold-50 to-museum-white opacity-50" />

        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="relative z-10 text-center space-y-6 px-4"
        >
          <motion.h1
            className="font-serif text-6xl md:text-7xl font-bold text-museum-black"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Bitcoin Runes Gallery
          </motion.h1>

          <motion.p
            className="text-xl text-museum-dark-gray max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Explore a curated collection of premium Bitcoin Runes,
            <br />
            each one a unique digital artifact on the blockchain.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <button className="px-8 py-4 bg-gold-300 hover:bg-gold-400 text-museum-black font-semibold rounded-xl transition-colors">
              Start Exploring
            </button>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Gallery Grid */}
      <section className="container mx-auto px-4 py-16">
        <RuneGrid runes={runes} columns={3} />
      </section>
    </div>
  );
}
```

---

### **FASE 4: Micro-interacciones Globales (1 día)**

#### **4.1 Botones con Estados Hover**

**Crear `components/ui/ButtonPremium.tsx`:**
```tsx
'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { magneticVariants } from '@/design-system/motion/presets';
import { ReactNode } from 'react';

interface ButtonPremiumProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function ButtonPremium({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonPremiumProps) {
  const baseStyles = 'font-semibold rounded-xl transition-all inline-flex items-center justify-center gap-2';

  const variants = {
    primary: 'bg-gold-300 hover:bg-gold-400 text-museum-black border-2 border-gold-400',
    secondary: 'bg-museum-cream hover:bg-museum-light-gray text-museum-black border-2 border-museum-light-gray',
    outline: 'bg-transparent hover:bg-museum-cream text-museum-black border-2 border-museum-light-gray hover:border-gold-300',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <motion.button
      variants={magneticVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
```

#### **4.2 Tooltips Elegantes**

**Crear `components/ui/TooltipPremium.tsx`:**
```tsx
'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface TooltipPremiumProps {
  children: ReactNode;
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function TooltipPremium({
  children,
  content,
  side = 'top',
}: TooltipPremiumProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>

        <AnimatePresence>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side={side}
              sideOffset={8}
              asChild
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: side === 'top' ? 4 : -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: side === 'top' ? 4 : -4 }}
                transition={{ duration: 0.15 }}
                className="bg-museum-black text-museum-white px-3 py-2 rounded-lg text-sm shadow-lg"
              >
                {content}
                <TooltipPrimitive.Arrow className="fill-museum-black" />
              </motion.div>
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </AnimatePresence>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
```

---

## 🎯 CHECKLIST DE IMPLEMENTACIÓN

### **Fase 1: Fundamentos** ✅
- [ ] Instalar Framer Motion + dependencias
- [ ] Actualizar design tokens (colors, spacing)
- [ ] Crear motion presets (animations)
- [ ] Configurar golden ratio spacing

### **Fase 2: Componentes Premium** ✅
- [ ] RuneCardPremium con magnetic effect
- [ ] RuneGrid con stagger animations
- [ ] ButtonPremium con micro-interactions
- [ ] TooltipPremium con smooth transitions

### **Fase 3: Páginas** ✅
- [ ] Gallery page con hero parallax
- [ ] Explorer page con filtered animations
- [ ] Dashboard con loading skeletons
- [ ] Transitions entre páginas

### **Fase 4: Polish** ✅
- [ ] Page transitions globales
- [ ] Loading states elegantes
- [ ] Error states con animaciones
- [ ] Performance optimization
- [ ] Accessibility (reduced motion)

---

## 📊 MÉTRICAS DE ÉXITO

### **Experiencia de Usuario**
- ⏱️ **Time on page:** +40% (engagement)
- 🖱️ **Hover interactions:** +60% (exploración)
- 📈 **Conversion rate:** +25% (CTAs efectivos)
- 😊 **User satisfaction:** 4.5+ / 5.0

### **Performance**
- 🚀 **FCP:** < 1.5s (First Contentful Paint)
- ⚡ **LCP:** < 2.5s (Largest Contentful Paint)
- 📊 **CLS:** < 0.1 (Cumulative Layout Shift)
- 🎯 **Lighthouse Score:** 95+ (Performance)

### **Calidad Técnica**
- ✅ **Componentes modulares:** 100%
- ✅ **Type safety:** 100% (TypeScript estricto)
- ✅ **Accessibility:** WCAG 2.1 AA
- ✅ **Test coverage:** 80%+ (unit + integration)

---

## 🔄 PRÓXIMOS PASOS

1. **Implementar Fase 1** (Fundamentos) - 1 día
2. **Crear RuneCardPremium** - 1 día
3. **Actualizar Gallery page** - 1 día
4. **Micro-interacciones globales** - 1 día
5. **Testing + Polish** - 1 día

**Tiempo total estimado:** 5 días de trabajo enfocado

---

**Última actualización:** 2025-01-18
**Status:** Listo para implementación 🚀

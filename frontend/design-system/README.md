# QURI Protocol Design System

A comprehensive, production-ready design system for the QURI Protocol frontend.

## Structure

```
design-system/
├── tokens/           # Design tokens (colors, typography, spacing, shadows, animations)
├── primitives/       # Basic UI components (Select, Checkbox, Radio, Switch, etc.)
├── patterns/         # Composite components (DataTable, FormField, EmptyState, etc.)
└── index.ts          # Main export
```

## Usage

### Import Design Tokens

```tsx
import { colors, typography, spacing, shadows, animations } from '@/design-system/tokens';

// Use in styled components or inline styles
const myColor = colors.gold[500];
const mySpacing = spacing.semantic.lg;
```

### Import Primitives

```tsx
import { Select, Checkbox, Radio, Switch, Slider, Tabs, Tooltip, Alert, Avatar } from '@/design-system/primitives';

// Example: Select
<Select
  options={[
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ]}
  value={value}
  onChange={setValue}
  size="md"
/>

// Example: Checkbox
<Checkbox
  checked={checked}
  onChange={setChecked}
  label="Accept terms"
  description="You must accept the terms and conditions"
/>
```

### Import Patterns

```tsx
import { DataTable, FormField, EmptyState, LoadingState, Skeleton } from '@/design-system/patterns';

// Example: DataTable
<DataTable
  data={users}
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
  ]}
  keyExtractor={(row) => row.id}
  sortable
  onRowClick={handleRowClick}
/>

// Example: FormField
<FormField
  label="Email Address"
  htmlFor="email"
  error={errors.email}
  hint="We'll never share your email"
  required
>
  <Input id="email" type="email" {...register('email')} />
</FormField>
```

## Components

### Tokens

- **colors**: Complete color palette (museum theme, gold, semantic colors, gradients)
- **typography**: Font families, sizes, weights, line heights, letter spacing, text styles
- **spacing**: Consistent spacing scale (4px grid system)
- **shadows**: Elevation system with colored shadows and glows
- **animations**: Durations, easing functions, keyframes, transitions

### Primitives

#### Form Controls
- **Select**: Dropdown select with keyboard navigation
- **Checkbox**: Checkbox with indeterminate state support
- **Radio & RadioGroup**: Radio buttons with grouping
- **Switch**: Toggle switch
- **Slider**: Range slider with value display

#### Navigation & Display
- **Tabs**: Tab navigation (line, pills, enclosed variants)
- **Tooltip**: Hover tooltip with positioning
- **Alert**: Alert messages (info, success, warning, error)
- **Avatar & AvatarGroup**: User avatars with fallbacks and status indicators

### Patterns

- **DataTable**: Sortable table with selection and pagination
- **FormField**: Consistent form field wrapper with label, hint, and error
- **EmptyState**: Empty state with icon, title, description, and action
- **LoadingState**: Loading indicators (spinner, dots, pulse, skeleton)
- **Skeleton**: Loading placeholders (text, rect, circle)
- **SkeletonCard**: Predefined skeleton for card layouts
- **SkeletonTable**: Predefined skeleton for table layouts

## Design Principles

1. **Consistency**: All components follow the same design patterns
2. **Accessibility**: WCAG 2.1 AA compliant, keyboard navigation, ARIA labels
3. **Scalability**: Modular architecture for easy expansion
4. **Performance**: Optimized for production use
5. **Type Safety**: Full TypeScript support

## Size Variants

Most components support 3 size variants:
- `sm`: Small (compact layouts, mobile)
- `md`: Medium (default, most common use case)
- `lg`: Large (emphasis, hero sections)

## Color Palette

### Museum Theme (Primary)
- White, Cream, Light Gray, Dark Gray, Charcoal, Black

### Accent Colors
- Gold (primary accent)
- Orange (Bitcoin/ckBTC)
- Blue (info/links)
- Green (success)
- Red (error/danger)
- Purple (premium)
- Yellow (warning)

## Animation System

All animations use consistent timing:
- **fast**: 100ms (micro-interactions)
- **normal**: 200ms (default transitions)
- **slow**: 300ms (larger movements)

Easing functions:
- **smooth**: cubic-bezier(0.4, 0.0, 0.2, 1) (default)
- **bounce**: cubic-bezier(0.68, -0.55, 0.265, 1.55)
- **elastic**: cubic-bezier(0.175, 0.885, 0.32, 1.275)

## Examples

See `/app/design-system-demo` for a complete showcase of all components (coming soon).

## Best Practices

1. Always use design tokens instead of hardcoded values
2. Prefer semantic color names over specific shades
3. Use spacing scale for consistent layouts
4. Leverage patterns for complex UI compositions
5. Follow accessibility guidelines (labels, ARIA, keyboard nav)

## Contributing

When adding new components:
1. Follow existing naming conventions
2. Include TypeScript types
3. Support size variants (sm, md, lg)
4. Add accessibility features (ARIA, keyboard nav)
5. Document props and usage examples
6. Export from appropriate index.ts

# Modern UI Components Guide

**Phase 3 Complete: Production-Ready React Components**

This guide documents all modern UI components created for the QURI Protocol frontend. All components use React Query for data fetching, Zustand for state management, and integrate directly with ICP canisters.

---

## 📋 Table of Contents

1. [ModernEtchingForm](#modernetchingform)
2. [ProcessMonitor](#processmonitor)
3. [ModernRuneGallery](#modernrunegallery)
4. [ModernDashboard](#moderndashboard)
5. [ActiveProcesses](#activeprocesses)
6. [SystemHealth](#systemhealth)
7. [Usage Examples](#usage-examples)
8. [Migration Guide](#migration-guide)

---

## ModernEtchingForm

**File:** `components/ModernEtchingForm.tsx`

### Purpose
Clean, validated form for creating new Runes on Bitcoin. Uses React Hook Form with Zod validation and integrates with React Query mutations.

### Features
- ✅ Real-time form validation with Zod schema
- ✅ Auto-uppercase inputs for rune_name and symbol
- ✅ Advanced mint terms (collapsible)
- ✅ Live preview of Rune details
- ✅ Toast notifications on success/error
- ✅ Automatic process ID tracking
- ✅ Loading states during submission

### Props
None - self-contained component

### Usage
```tsx
import { ModernEtchingForm } from '@/components/ModernEtchingForm';

export default function CreateRunePage() {
  return (
    <div className="container mx-auto py-8">
      <ModernEtchingForm />
    </div>
  );
}
```

### Validation Rules
```typescript
- rune_name: 1-26 uppercase letters, • spacer allowed
- symbol: 1-4 uppercase letters only
- divisibility: 0-18 integer
- premine: non-negative integer
- mintAmount/mintCap: both required if either is set
```

### State Management
- Uses `useEtchRuneMutation` for form submission
- Stores active process ID in `useEtchingStore`
- Resets form on successful submission

### Example Output
When user submits the form:
1. Validates all fields
2. Calls `etch_rune` canister method
3. Shows toast: "Creating BITCOIN•RUNE..."
4. On success: Shows toast with process ID
5. Redirects to process monitor view

---

## ProcessMonitor

**File:** `components/ProcessMonitor.tsx`

### Purpose
Real-time monitoring of individual etching processes with auto-polling and progress visualization.

### Features
- ✅ Auto-polls every 5 seconds while active
- ✅ Animated progress bar (0-100%)
- ✅ Toast notifications on completion/failure
- ✅ Retry button for failed processes
- ✅ Transaction link to mempool.space
- ✅ Retry count display

### Props
```typescript
interface ProcessMonitorProps {
  processId: string;           // The process ID to monitor
  onComplete?: (txid: string) => void;  // Callback when completed
}
```

### Usage
```tsx
import { ProcessMonitor } from '@/components/ProcessMonitor';

export default function ProcessPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-8">
      <ProcessMonitor
        processId={params.id}
        onComplete={(txid) => {
          console.log('Rune created!', txid);
          // Navigate to rune details page
        }}
      />
    </div>
  );
}
```

### Process States & Progress
```typescript
Pending: 5%
Validating: 10%
CheckingBalance: 20%
SelectingUtxos: 35%
BuildingTransaction: 50%
SigningTransaction: 65%
Broadcasting: 80%
AwaitingConfirmation: 90%
Indexing: 95%
Completed: 100%
Failed: 0%
```

### Auto-Polling Logic
```typescript
// Polls every 5 seconds if process is active
refetchInterval: (query) => {
  if (!processId || !query.state.data) return false;
  const isActive = !['Completed', 'Failed'].includes(query.state.data.state);
  return isActive ? 5000 : false;
}
```

### Related Components
- `ProcessBadge`: Minimal status badge for lists

---

## ModernRuneGallery

**File:** `components/ModernRuneGallery.tsx`

### Purpose
Paginated gallery of all Runes with infinite scroll, search, and filtering.

### Features
- ✅ Infinite scroll using Intersection Observer
- ✅ Debounced search (300ms delay)
- ✅ Grid/List view toggle
- ✅ Sort by: created, volume, trending
- ✅ Auto-caches results in Zustand store
- ✅ Shows bonding curve badge
- ✅ Loading skeletons

### Props
None - self-contained component

### Usage
```tsx
import { ModernRuneGallery } from '@/components/ModernRuneGallery';

export default function ExplorePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Explore Runes</h1>
      <ModernRuneGallery />
    </div>
  );
}
```

### State Management
```typescript
// UI State (Zustand)
const { searchQuery, setSearchQuery, viewMode, setViewMode, sortBy, setSortBy } = useRuneStore();

// Server State (React Query)
const searchResults = useSearchRunesQuery(debouncedSearch);
const infiniteQuery = useInfiniteRunesQuery(20n);
```

### Infinite Scroll Implementation
```typescript
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, { threshold: 1.0 });

  if (observerTarget.current) {
    observer.observe(observerTarget.current);
  }

  return () => observer.disconnect();
}, [hasNextPage, isFetchingNextPage]);
```

### Rune Card Display
Each rune shows:
- Name & Symbol (font-mono)
- Total Supply
- 24h Volume
- Holder Count
- Divisibility
- Created Date
- "View Details" button
- Bonding Curve badge (if applicable)

---

## ModernDashboard

**File:** `components/ModernDashboard.tsx`

### Purpose
Real-time metrics dashboard showing system health, stats, and active processes.

### Features
- ✅ System health banner
- ✅ 4 stat cards (Total Runes, 24h Volume, Success Rate, Active Processes)
- ✅ Performance metrics grid
- ✅ Active etchings list
- ✅ Auto-updates every 30-60 seconds
- ✅ Trend indicators

### Props
None - self-contained component

### Usage
```tsx
import { ModernDashboard } from '@/components/ModernDashboard';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <ModernDashboard />
    </div>
  );
}
```

### Data Sources
```typescript
const { data: registryStats } = useRegistryStatsQuery();  // 1 min refetch
const { data: metrics } = useMetricsSummaryQuery();       // 30s refetch
const { data: health } = useHealthQuery();                // 1 min refetch
const { activeProcesses, totalActive } = useActiveProcessesMonitor();
```

### Metrics Displayed
1. **Registry Stats**
   - Total Runes
   - 24h Volume (BTC)

2. **Performance Metrics**
   - Total Runes Created
   - Total Errors
   - Avg Etching Latency (ms)
   - Active Processes
   - Pending Processes

3. **System Health**
   - Config Initialized ✓/✗
   - Bitcoin Integration ✓/✗
   - Registry Configured ✓/✗

4. **Active Processes**
   - Live list with status badges
   - Created timestamps

---

## ActiveProcesses

**File:** `components/ActiveProcesses.tsx`

### Purpose
Dedicated component for monitoring all active, completed, and failed etching processes.

### Features
- ✅ Auto-updates for active processes
- ✅ Expand/collapse for long lists
- ✅ Filter by status (active/completed/failed)
- ✅ Summary statistics
- ✅ Time since creation display
- ✅ Retry count badges
- ✅ Empty state handling

### Props
```typescript
interface ActiveProcessesProps {
  maxVisible?: number;        // Default: 5
  showCompleted?: boolean;    // Default: true
  showFailed?: boolean;       // Default: true
}
```

### Usage
```tsx
import { ActiveProcesses } from '@/components/ActiveProcesses';

// Show only active processes
<ActiveProcesses maxVisible={10} showCompleted={false} showFailed={false} />

// Show all processes with compact view
<ActiveProcesses maxVisible={3} />

// Show everything expanded
<ActiveProcesses maxVisible={999} />
```

### Summary Statistics
Displays 3 metrics:
- **Active**: Processes in progress (orange)
- **Completed**: Successfully finished (green)
- **Failed**: Errored processes (red)

### Time Display
```typescript
function getTimeSince(date: Date): string {
  < 60s: "45s ago"
  < 60m: "23m ago"
  < 24h: "5h ago"
  >= 24h: "2d ago"
}
```

---

## SystemHealth

**File:** `components/SystemHealth.tsx`

### Purpose
Comprehensive system health monitoring with canister status and performance metrics.

### Features
- ✅ Real-time health checks
- ✅ Component-level status (Config, Bitcoin, Registry)
- ✅ System metrics summary
- ✅ Compact mode for headers/nav
- ✅ Live status indicator
- ✅ Color-coded alerts (green/red)

### Props
```typescript
interface SystemHealthProps {
  showMetrics?: boolean;  // Default: true
  compact?: boolean;      // Default: false
}
```

### Usage

**Full Dashboard View:**
```tsx
import { SystemHealth } from '@/components/SystemHealth';

<SystemHealth showMetrics={true} compact={false} />
```

**Compact Header Badge:**
```tsx
import { SystemHealthBadge } from '@/components/SystemHealth';

<header className="flex items-center gap-4">
  <Logo />
  <SystemHealthBadge />
</header>
```

### Health Checks
```typescript
interface HealthStatus {
  healthy: boolean;                          // Overall status
  etching_config_initialized: boolean;       // Config canister
  bitcoin_integration_configured: boolean;   // Bitcoin canister
  registry_configured: boolean;              // Registry canister
}
```

### Metrics Displayed
- Total Runes
- Active Processes (orange)
- Pending Processes (yellow)
- Success Rate (green if ≥95%, orange if <95%)
- Avg Latency (ms)
- Total Errors (red if >0, green if 0)

### Visual States
```typescript
Healthy: Green border, green icons, "All Systems Operational"
Issues: Red border, red icons, "System Issues Detected"
Loading: Gray spinner, "Checking system health..."
Offline: Red badge, "Unable to fetch system health"
```

---

## 🚀 Usage Examples

### Complete Dashboard Page
```tsx
// app/dashboard/page.tsx
import { ModernDashboard } from '@/components/ModernDashboard';
import { SystemHealth } from '@/components/SystemHealth';
import { ActiveProcesses } from '@/components/ActiveProcesses';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">QURI Protocol Dashboard</h1>

      <SystemHealth showMetrics={true} />

      <ModernDashboard />

      <ActiveProcesses maxVisible={5} />
    </div>
  );
}
```

### Create Rune Flow
```tsx
// app/create/page.tsx
import { ModernEtchingForm } from '@/components/ModernEtchingForm';
import { useEtchingStore } from '@/lib/store/useEtchingStore';
import { ProcessMonitor } from '@/components/ProcessMonitor';
import { useRouter } from 'next/navigation';

export default function CreatePage() {
  const { activeProcessId } = useEtchingStore();
  const router = useRouter();

  return (
    <div className="container mx-auto py-8">
      {!activeProcessId ? (
        <>
          <h1 className="text-3xl font-bold mb-6">Create New Rune</h1>
          <ModernEtchingForm />
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">Etching in Progress</h1>
          <ProcessMonitor
            processId={activeProcessId}
            onComplete={(txid) => {
              router.push(`/rune/${txid}`);
            }}
          />
        </>
      )}
    </div>
  );
}
```

### Explore Runes Page
```tsx
// app/explore/page.tsx
import { ModernRuneGallery } from '@/components/ModernRuneGallery';
import { SystemHealthBadge } from '@/components/SystemHealth';

export default function ExplorePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Explore Runes</h1>
        <SystemHealthBadge />
      </div>

      <ModernRuneGallery />
    </div>
  );
}
```

### Monitoring Page
```tsx
// app/monitor/page.tsx
import { ActiveProcesses } from '@/components/ActiveProcesses';
import { SystemHealth } from '@/components/SystemHealth';

export default function MonitorPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">System Monitor</h1>

      <SystemHealth showMetrics={true} compact={false} />

      <ActiveProcesses
        maxVisible={20}
        showCompleted={true}
        showFailed={true}
      />
    </div>
  );
}
```

---

## 📦 Migration Guide

### Replacing Old Components

#### Before (Mock Data)
```tsx
// ❌ Old: Used mock data
import { EtchingForm } from '@/components/EtchingForm';

<EtchingForm
  onSubmit={(data) => {
    console.log('Mock submission:', data);
  }}
/>
```

#### After (Real Canister Integration)
```tsx
// ✅ New: Uses real canister calls
import { ModernEtchingForm } from '@/components/ModernEtchingForm';

<ModernEtchingForm />
// Automatically handles submission, toast, and process tracking
```

### Replacing Dashboard
```tsx
// ❌ Old: Static mock stats
import { Dashboard } from '@/components/Dashboard';
<Dashboard stats={{ totalRunes: 100, volume: 1000 }} />

// ✅ New: Real-time data
import { ModernDashboard } from '@/components/ModernDashboard';
<ModernDashboard />
// Auto-fetches and updates every 30-60 seconds
```

### Replacing Rune Gallery
```tsx
// ❌ Old: Manual pagination
import { RuneGallery } from '@/components/RuneGallery';
const [page, setPage] = useState(0);
<RuneGallery runes={mockRunes} page={page} onPageChange={setPage} />

// ✅ New: Infinite scroll
import { ModernRuneGallery } from '@/components/ModernRuneGallery';
<ModernRuneGallery />
// Automatically loads more on scroll
```

---

## 🎯 Component Decision Tree

**Need to create a Rune?**
→ Use `ModernEtchingForm`

**Need to monitor a specific process?**
→ Use `ProcessMonitor` with processId

**Need to show all Runes?**
→ Use `ModernRuneGallery`

**Need a metrics overview?**
→ Use `ModernDashboard`

**Need to monitor all active processes?**
→ Use `ActiveProcesses`

**Need to show system health?**
→ Use `SystemHealth` (full) or `SystemHealthBadge` (compact)

---

## 🔧 Technical Architecture

### Data Flow
```
User Action
    ↓
Component (React)
    ↓
React Query Hook (useEtchRuneMutation)
    ↓
Canister Hook (useRuneEngine)
    ↓
Actor (ICP Actor)
    ↓
Canister Method (etch_rune)
    ↓
ICP Canister (rune-engine)
    ↓
Response
    ↓
Query Invalidation (auto-refetch related data)
    ↓
Zustand Store Update (cache)
    ↓
Component Re-render (updated data)
    ↓
Toast Notification (user feedback)
```

### State Management Layers
1. **React Query**: Server state (canister data)
   - Caching
   - Auto-refetch
   - Polling
   - Invalidation

2. **Zustand**: Client state (UI preferences)
   - Search query
   - View mode (grid/list)
   - Sort preference
   - Active process ID

3. **Component State**: Local state
   - Form inputs
   - Expanded/collapsed sections
   - Loading states

### Performance Optimizations
- **Debouncing**: Search queries (300ms)
- **Intersection Observer**: Infinite scroll (native browser API)
- **Query Caching**: React Query prevents duplicate requests
- **Conditional Polling**: Only polls active processes
- **Map-based Storage**: O(1) lookups in Zustand
- **Lazy Loading**: Components load data on mount

---

## 📚 Related Documentation

- [CANISTER_INTEGRATION_COMPLETE.md](./CANISTER_INTEGRATION_COMPLETE.md) - Phase 1: Backend Integration
- [STATE_MANAGEMENT_COMPLETE.md](./STATE_MANAGEMENT_COMPLETE.md) - Phase 2: State Management
- [FRONTEND_MODERNIZATION_PLAN.md](./FRONTEND_MODERNIZATION_PLAN.md) - Original Plan

---

## ✅ Phase 3 Summary

### Components Created (6)
1. ✅ ModernEtchingForm - Production-ready Rune creation
2. ✅ ProcessMonitor - Real-time process tracking
3. ✅ ModernRuneGallery - Infinite scroll gallery
4. ✅ ModernDashboard - Metrics dashboard
5. ✅ ActiveProcesses - Process monitoring hub
6. ✅ SystemHealth - Health monitoring

### Key Features Implemented
- ✅ Auto-polling for active processes (5s interval)
- ✅ Infinite scroll with Intersection Observer
- ✅ Debounced search (300ms)
- ✅ Toast notifications for all operations
- ✅ Real-time metrics updates (30-60s)
- ✅ Progress visualization (0-100%)
- ✅ Retry mechanism for failed processes
- ✅ Transaction links to mempool.space
- ✅ Loading states and error handling
- ✅ Empty state UI for all components
- ✅ Responsive design (mobile-first)
- ✅ TypeScript strict mode compliance

### Mock Code Eliminated
All components now use:
- ✅ Real canister actors
- ✅ React Query for server state
- ✅ Zustand for client state
- ✅ No mock data or placeholders
- ✅ Production-ready error handling

---

**Status: Phase 3 Complete** ✅

Next Steps:
1. Integrate components into actual pages
2. Add E2E tests
3. Performance testing
4. User acceptance testing
5. Deploy to production

For questions or issues, refer to the individual component files or the related documentation above.

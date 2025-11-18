# Registry Canister API Documentation

> **QURI Protocol Registry Canister** - Global registry for Bitcoin Runes with advanced pagination and search

## 📚 Table of Contents

- [Overview](#overview)
- [Pagination System](#pagination-system)
- [API Reference](#api-reference)
  - [Read Operations](#read-operations)
  - [Write Operations](#write-operations)
  - [Statistics](#statistics)
- [Frontend Integration](#frontend-integration)
- [Performance Notes](#performance-notes)
- [Examples](#examples)

## Overview

The Registry Canister provides a global, searchable registry for all Bitcoin Runes created through QURI Protocol. It features:

- ✅ **Advanced Pagination** - Offset-based pagination with configurable sorting
- ✅ **Multiple Sort Options** - Sort by block height, name, volume, holder count, or index time
- ✅ **Efficient Indexing** - O(log n) lookups via secondary indexes
- ✅ **Type Safety** - Full Candid type safety across Rust and TypeScript
- ✅ **Open Source** - Reusable pagination types for other canisters

## Pagination System

### Core Types

```candid
/// Sort order
type SortOrder = variant {
    Asc;   // Ascending (oldest first, A-Z)
    Desc;  // Descending (newest first, Z-A)
};

/// Sort criteria for Rune listings
type RuneSortBy = variant {
    Block;      // Sort by block height (etching time)
    Name;       // Sort by name (alphabetically)
    Volume;     // Sort by trading volume (24h)
    Holders;    // Sort by holder count (popularity)
    IndexedAt;  // Sort by indexed timestamp
};

/// Page request with sorting
type Page = record {
    offset : nat64;              // Number of items to skip
    limit : nat64;               // Maximum items to return (max 1000)
    sort_by : opt RuneSortBy;    // Sort field (default: Block)
    sort_order : opt SortOrder;  // Sort direction (default: Desc)
};

/// Paged response
type PagedResponse = record {
    items : vec RegistryEntry;   // Items in this page
    total : nat64;               // Total items across all pages
    offset : nat64;              // Offset used for this page
    limit : nat64;               // Limit used for this page
    has_more : bool;             // Whether there are more items
};
```

### Default Behavior

If you call `list_runes` with `null` or without specifying sort options, you get:

- **offset**: `0`
- **limit**: `100`
- **sort_by**: `Block` (by etching block height)
- **sort_order**: `Desc` (newest first)

## API Reference

### Read Operations

#### `list_runes`

List Runes with advanced pagination and sorting.

```candid
list_runes : (opt Page) -> (PagedResponse) query;
```

**Examples:**

```candid
// Get first 100 runes, newest first (default)
list_runes(null)

// Get runes sorted by name, A-Z
list_runes(opt record {
    offset = 0;
    limit = 50;
    sort_by = opt variant { Name };
    sort_order = opt variant { Asc };
})

// Get trending runes by volume
list_runes(opt record {
    offset = 0;
    limit = 100;
    sort_by = opt variant { Volume };
    sort_order = opt variant { Desc };
})

// Get most popular by holder count
list_runes(opt record {
    offset = 0;
    limit = 20;
    sort_by = opt variant { Holders };
    sort_order = opt variant { Desc };
})
```

**Response:**

```json
{
  "items": [
    {
      "metadata": {
        "key": { "block": 840000, "tx": 1 },
        "name": "UNCOMMON•GOODS",
        "symbol": "UG",
        "divisibility": 2,
        "creator": "principal-id",
        "created_at": 1234567890000000000,
        "total_supply": 21000000,
        "premine": 0,
        "terms": null
      },
      "bonding_curve": null,
      "trading_volume_24h": 50000,
      "holder_count": 1234,
      "indexed_at": 1234567890000000000
    }
  ],
  "total": 1523,
  "offset": 0,
  "limit": 100,
  "has_more": true
}
```

---

#### `get_rune`

Get a specific Rune by its key.

```candid
get_rune : (RuneKey) -> (opt RegistryEntry) query;
```

**Example:**

```candid
get_rune(record { block = 840000; tx = 1 })
```

---

#### `get_rune_by_name`

Get a Rune by its name (O(log n) via name index).

```candid
get_rune_by_name : (text) -> (opt RegistryEntry) query;
```

**Example:**

```candid
get_rune_by_name("UNCOMMON•GOODS")
```

---

#### `get_my_runes`

Get all Runes created by the caller.

```candid
get_my_runes : () -> (vec RegistryEntry) query;
```

**Example:**

```candid
get_my_runes()
```

---

#### `search_runes`

Search Runes by name or symbol (legacy endpoint).

```candid
search_runes : (text, nat64, nat64) -> (SearchResult) query;
```

**Example:**

```candid
search_runes("BITCOIN", 0, 50)
```

---

#### `get_trending`

Get trending Runes by 24h volume (legacy endpoint - prefer `list_runes` with Volume sort).

```candid
get_trending : (nat64, nat64) -> (PaginatedResult) query;
```

**Example:**

```candid
get_trending(0, 100)
```

---

#### `total_runes`

Get total number of registered Runes.

```candid
total_runes : () -> (nat64) query;
```

---

#### `get_stats`

Get registry statistics.

```candid
get_stats : () -> (RegistryStats) query;
```

**Response:**

```json
{
  "total_runes": 1523,
  "total_volume_24h": 5000000,
  "status": "Live"
}
```

---

### Write Operations

#### `register_rune`

Register a new Rune in the global registry.

```candid
register_rune : (RuneMetadata) -> (variant { Ok : RuneKey; Err : text });
```

**Validations:**

- ✅ RuneKey must be unique
- ✅ Name must be unique
- ✅ Caller must be authenticated (not anonymous)
- ✅ Metadata must be valid (via builder pattern)

**Example:**

```candid
register_rune(record {
    key = record { block = 840000; tx = 1 };
    name = "UNCOMMON•GOODS";
    symbol = "UG";
    divisibility = 2;
    creator = principal "...";
    created_at = 1234567890000000000;
    total_supply = 21000000;
    premine = 0;
    terms = null;
})
```

---

#### `update_volume`

Update 24h trading volume for a Rune.

```candid
update_volume : (RuneKey, nat64) -> (variant { Ok : null; Err : text });
```

---

#### `update_holder_count`

Update holder count for a Rune.

```candid
update_holder_count : (RuneKey, nat64) -> (variant { Ok : null; Err : text });
```

---

## Frontend Integration

### TypeScript Types

```typescript
import type {
  Page,
  PagedResponse,
  RegistryEntry,
  RuneSortBy,
  SortOrder,
} from '@/types/canisters';
```

### Using the Hook

```typescript
import { useRegistry } from '@/hooks/useRegistry';

function RuneExplorer() {
  const { listRunes, loading, error } = useRegistry();

  // Get first page (default: 100 runes, newest first)
  const page1 = await listRunes();

  // Get trending runes by volume
  const trending = await listRunes({
    offset: 0n,
    limit: 50n,
    sort_by: [{ Volume: null }],
    sort_order: [{ Desc: null }],
  });

  // Get alphabetically
  const alphabetical = await listRunes({
    offset: 0n,
    limit: 100n,
    sort_by: [{ Name: null }],
    sort_order: [{ Asc: null }],
  });

  // Navigate pages
  const nextPage = await listRunes({
    offset: page1.offset + page1.limit,
    limit: 100n,
    sort_by: [{ Block: null }],
    sort_order: [{ Desc: null }],
  });

  return (
    <div>
      {page1.items.map((rune) => (
        <RuneCard key={rune.metadata.name} rune={rune} />
      ))}

      {page1.has_more && <button onClick={loadMore}>Load More</button>}

      <p>
        Showing {page1.items.length} of {Number(page1.total)} runes
      </p>
    </div>
  );
}
```

### Pagination Helper

```typescript
interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

function usePagination(response: PagedResponse<any>) {
  const currentPage = Number(response.offset / response.limit);
  const totalPages = Math.ceil(Number(response.total / response.limit));

  return {
    currentPage,
    totalPages,
    hasNextPage: response.has_more,
    hasPrevPage: currentPage > 0,
  };
}
```

---

## Performance Notes

### Query Costs

- ✅ All query calls are **free** (0 cycles)
- ✅ Response size limit: ~2MB
- ✅ 100-500 runes/page: ~150KB (well within limit)

### Time Complexity

| Operation           | Complexity  | Notes                          |
| ------------------- | ----------- | ------------------------------ |
| `get_rune`          | O(log n)    | Direct BTreeMap lookup         |
| `get_rune_by_name`  | O(log n)    | Name index lookup              |
| `get_my_runes`      | O(m log n)  | m = runes created by user      |
| `list_runes`        | O(n log n)  | Requires sorting all entries   |
| `search_runes`      | O(n)        | Full scan for partial matches  |
| `total_runes`       | O(1)        | BTreeMap.len()                 |

### Optimization Tips

1. **For large datasets (>10K runes):**
   - Cache sorted results in stable memory
   - Use cursor-based pagination instead of offset
   - Pre-compute trending lists

2. **For frequent queries:**
   - Use `get_rune_by_name` instead of `search_runes` for exact matches
   - Cache results on frontend with appropriate TTL

3. **For best performance:**
   - Use default limit (100) for general listings
   - Use smaller limits (20-50) for trending/popular lists
   - Avoid very large offsets (>10K)

---

## Examples

### Example 1: Infinite Scroll

```typescript
function InfiniteRuneList() {
  const [runes, setRunes] = useState<RegistryEntry[]>([]);
  const [offset, setOffset] = useState(0n);
  const [hasMore, setHasMore] = useState(true);
  const { listRunes } = useRegistry();

  const loadMore = async () => {
    const response = await listRunes({
      offset,
      limit: 50n,
      sort_by: [{ Block: null }],
      sort_order: [{ Desc: null }],
    });

    setRunes((prev) => [...prev, ...response.items]);
    setOffset(offset + 50n);
    setHasMore(response.has_more);
  };

  return (
    <InfiniteScroll
      dataLength={runes.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<Spinner />}
    >
      {runes.map((rune) => (
        <RuneCard key={rune.metadata.name} rune={rune} />
      ))}
    </InfiniteScroll>
  );
}
```

### Example 2: Sortable Table

```typescript
function RuneTable() {
  const [sortBy, setSortBy] = useState<RuneSortBy>({ Block: null });
  const [sortOrder, setSortOrder] = useState<SortOrder>({ Desc: null });
  const { listRunes } = useRegistry();

  const { data, isLoading } = useQuery(['runes', sortBy, sortOrder], () =>
    listRunes({
      offset: 0n,
      limit: 100n,
      sort_by: [sortBy],
      sort_order: [sortOrder],
    })
  );

  const toggleSort = (field: RuneSortBy) => {
    if (JSON.stringify(sortBy) === JSON.stringify(field)) {
      setSortOrder(sortOrder.Asc ? { Desc: null } : { Asc: null });
    } else {
      setSortBy(field);
      setSortOrder({ Desc: null });
    }
  };

  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => toggleSort({ Name: null })}>Name</th>
          <th onClick={() => toggleSort({ Block: null })}>Block</th>
          <th onClick={() => toggleSort({ Volume: null })}>Volume 24h</th>
          <th onClick={() => toggleSort({ Holders: null })}>Holders</th>
        </tr>
      </thead>
      <tbody>
        {data?.items.map((rune) => (
          <tr key={rune.metadata.name}>
            <td>{rune.metadata.name}</td>
            <td>{Number(rune.metadata.key.block)}</td>
            <td>{Number(rune.trading_volume_24h)}</td>
            <td>{Number(rune.holder_count)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Example 3: Trending Dashboard

```typescript
function TrendingDashboard() {
  const { listRunes } = useRegistry();

  // Top by volume
  const { data: byVolume } = useQuery('trending-volume', () =>
    listRunes({
      offset: 0n,
      limit: 10n,
      sort_by: [{ Volume: null }],
      sort_order: [{ Desc: null }],
    })
  );

  // Top by holders
  const { data: byHolders } = useQuery('trending-holders', () =>
    listRunes({
      offset: 0n,
      limit: 10n,
      sort_by: [{ Holders: null }],
      sort_order: [{ Desc: null }],
    })
  );

  // Recently created
  const { data: recent } = useQuery('recent-runes', () =>
    listRunes({
      offset: 0n,
      limit: 10n,
      sort_by: [{ Block: null }],
      sort_order: [{ Desc: null }],
    })
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      <TrendingCard title="Top by Volume" runes={byVolume?.items} />
      <TrendingCard title="Most Popular" runes={byHolders?.items} />
      <TrendingCard title="Recently Created" runes={recent?.items} />
    </div>
  );
}
```

---

## License

MIT License - Free to use and modify for your own projects.

## Contributing

This pagination system is designed to be generic and reusable. The core types in `libs/quri-types/src/pagination.rs` can be copied and used in any ICP canister project.

If you improve this system, consider contributing back to QURI Protocol or sharing your enhancements with the community.

---

**Built with ❤️ by QURI Protocol**

For questions or issues: https://github.com/AndeLabs/QURI-PROTOCOL/issues

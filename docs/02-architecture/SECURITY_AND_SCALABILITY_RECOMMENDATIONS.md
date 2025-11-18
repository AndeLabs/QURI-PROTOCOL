# 🔐 Security & Scalability Recommendations for QURI Protocol

> **Comprehensive guide to enhance security and scalability of the Registry Canister and pagination system**

## 📋 Table of Contents

- [Current Implementation Status](#current-implementation-status)
- [Security Enhancements](#security-enhancements)
- [Scalability Improvements](#scalability-improvements)
- [Performance Optimizations](#performance-optimizations)
- [Monitoring & Observability](#monitoring--observability)
- [Implementation Roadmap](#implementation-roadmap)

---

## 🎯 Current Implementation Status

### ✅ What We Have

1. **Generic Pagination System**
   - Offset-based pagination
   - Multiple sort criteria
   - Type-safe implementation

2. **Basic Access Control**
   - Anonymous principal rejection
   - Caller authentication
   - Name uniqueness validation

3. **Efficient Data Structures**
   - StableBTreeMap for main storage
   - Secondary indexes for fast lookups
   - Bounded keys (RuneKey) for stability

### ⚠️ What Needs Enhancement

1. Rate limiting
2. Query result certification
3. DoS protection
4. Advanced monitoring
5. Horizontal scaling preparation

---

## 🔐 Security Enhancements

### 1. Query Result Certification ⭐⭐⭐ (CRITICAL)

**Problem**: Query calls (like `list_runes`) are not threshold-signed, so a malicious replica/boundary node could modify responses.

**Solution**: Implement certified variables for security-critical data.

```rust
use ic_certified_map::{AsHashTree, HashTree, RbTree};
use ic_cdk::api::set_certified_data;

thread_local! {
    static CERTIFIED_DATA: RefCell<RbTree<Vec<u8>, Vec<u8>>> =
        RefCell::new(RbTree::new());
}

/// Update certified data after each registry change
fn update_certification() {
    CERTIFIED_DATA.with(|tree| {
        let tree_hash = tree.borrow().root_hash();
        set_certified_data(&tree_hash);
    });
}

/// Provide certification with query responses
#[query]
fn list_runes_certified(page: Option<Page>) -> (PagedResponse<RegistryEntry>, Vec<u8>) {
    let response = list_runes_internal(page);

    let certificate = ic_cdk::api::data_certificate()
        .expect("No certificate available");

    (response, certificate)
}
```

**Implementation Priority**: HIGH
**Effort**: Medium (2-3 days)
**Impact**: High security improvement

---

### 2. Rate Limiting & DoS Protection ⭐⭐⭐ (CRITICAL)

**Problem**: Unlimited query calls could exhaust canister resources.

**Solution**: Implement multi-level rate limiting.

```rust
use std::collections::HashMap;
use candid::Principal;

thread_local! {
    static RATE_LIMITS: RefCell<HashMap<Principal, RateLimitState>> =
        RefCell::new(HashMap::new());
}

#[derive(Clone, Debug)]
struct RateLimitState {
    last_request: u64,
    request_count: u64,
    window_start: u64,
}

const REQUESTS_PER_MINUTE: u64 = 60;
const REQUESTS_PER_HOUR: u64 = 1000;

/// Check rate limit before processing request
fn check_rate_limit(caller: Principal) -> Result<(), String> {
    let now = ic_cdk::api::time();

    RATE_LIMITS.with(|limits| {
        let mut limits = limits.borrow_mut();
        let state = limits.entry(caller).or_insert(RateLimitState {
            last_request: now,
            request_count: 0,
            window_start: now,
        });

        // Reset window if expired (1 minute)
        if now - state.window_start > 60_000_000_000 {
            state.window_start = now;
            state.request_count = 0;
        }

        // Check limit
        if state.request_count >= REQUESTS_PER_MINUTE {
            return Err(format!(
                "Rate limit exceeded. Try again in {} seconds",
                (state.window_start + 60_000_000_000 - now) / 1_000_000_000
            ));
        }

        state.request_count += 1;
        state.last_request = now;
        Ok(())
    })
}

#[query]
fn list_runes_rate_limited(page: Option<Page>) -> Result<PagedResponse<RegistryEntry>, String> {
    let caller = ic_cdk::caller();

    // Skip rate limiting for whitelisted principals
    if !is_whitelisted(caller) {
        check_rate_limit(caller)?;
    }

    Ok(list_runes_internal(page))
}
```

**Implementation Priority**: HIGH
**Effort**: Low (1 day)
**Impact**: Critical DoS protection

---

### 3. Inspect Message for Ingress Filtering ⭐⭐

**Problem**: Update calls consume cycles even if they fail validation.

**Solution**: Use `inspect_message` to reject invalid calls early.

```rust
use ic_cdk_macros::inspect_message;

#[inspect_message]
fn inspect_message() {
    let method = ic_cdk::api::call::method_name();
    let caller = ic_cdk::caller();

    // Reject anonymous callers early (no cycles consumed)
    if caller == Principal::anonymous() {
        ic_cdk::api::call::reject("Anonymous principals not allowed");
        return;
    }

    // Method-specific validation
    match method.as_str() {
        "register_rune" => {
            // Check if caller has permission
            if !has_permission(caller, Permission::CreateRune) {
                ic_cdk::api::call::reject("Insufficient permissions");
                return;
            }
        }
        "update_volume" | "update_holder_count" => {
            // Only authorized canisters can update stats
            if !is_authorized_canister(caller) {
                ic_cdk::api::call::reject("Unauthorized canister");
                return;
            }
        }
        _ => {}
    }

    ic_cdk::api::call::accept_message();
}
```

**Implementation Priority**: MEDIUM
**Effort**: Low (1 day)
**Impact**: Reduced cycles waste

---

### 4. Access Control & Permissions ⭐⭐

**Problem**: Current implementation only checks anonymous principals.

**Solution**: Implement role-based access control (RBAC).

```rust
#[derive(CandidType, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Role {
    Owner,
    Admin,
    Operator,
    User,
}

#[derive(CandidType, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Permission {
    CreateRune,
    UpdateStats,
    ManageRoles,
    ViewPrivate,
}

thread_local! {
    static ROLES: RefCell<StableBTreeMap<Principal, Role, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4)))
        ));
}

fn has_permission(principal: Principal, permission: Permission) -> bool {
    ROLES.with(|roles| {
        let role = roles.borrow().get(&principal).unwrap_or(Role::User);

        match (role, permission) {
            (Role::Owner, _) => true, // Owner has all permissions
            (Role::Admin, Permission::CreateRune) => true,
            (Role::Admin, Permission::UpdateStats) => true,
            (Role::Operator, Permission::UpdateStats) => true,
            (Role::User, Permission::CreateRune) => true,
            _ => false,
        }
    })
}

#[update]
fn assign_role(principal: Principal, role: Role) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // Only owners can assign roles
    if !has_permission(caller, Permission::ManageRoles) {
        return Err("Unauthorized: Only owners can assign roles".to_string());
    }

    ROLES.with(|roles| {
        roles.borrow_mut().insert(principal, role);
    });

    Ok(())
}
```

**Implementation Priority**: MEDIUM
**Effort**: Medium (2 days)
**Impact**: Better access control

---

### 5. Input Validation & Sanitization ⭐⭐⭐

**Problem**: Current validation is basic.

**Solution**: Comprehensive input validation.

```rust
/// Validate pagination parameters
fn validate_page(page: &Page) -> Result<(), String> {
    // Limit validation
    if page.limit == 0 {
        return Err("Limit must be greater than 0".to_string());
    }

    if page.limit > 1000 {
        return Err("Limit cannot exceed 1000".to_string());
    }

    // Offset validation
    if page.offset > 1_000_000 {
        return Err("Offset too large (max: 1,000,000)".to_string());
    }

    Ok(())
}

#[query]
fn list_runes(page: Option<Page>) -> Result<PagedResponse<RegistryEntry>, String> {
    let page = page.unwrap_or_default();

    // Validate input
    validate_page(&page)?;

    Ok(list_runes_internal(page))
}
```

**Implementation Priority**: HIGH
**Effort**: Low (1 day)
**Impact**: Prevent invalid queries

---

## 📈 Scalability Improvements

### 1. Cursor-Based Pagination ⭐⭐⭐

**Problem**: Offset-based pagination is inefficient for large offsets.

**Solution**: Implement cursor-based pagination for better performance.

```rust
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Cursor {
    last_key: RuneKey,
    direction: SortOrder,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CursorPage {
    cursor: Option<Cursor>,
    limit: u64,
    sort_by: Option<RuneSortBy>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CursorResponse<T> {
    items: Vec<T>,
    next_cursor: Option<Cursor>,
    has_more: bool,
}

#[query]
fn list_runes_cursor(page: CursorPage) -> CursorResponse<RegistryEntry> {
    let limit = page.limit.min(1000);

    REGISTRY.with(|r| {
        let registry = r.borrow();

        let mut items = Vec::new();
        let mut last_key = None;

        // Start from cursor or beginning
        let start_range = match &page.cursor {
            Some(cursor) => registry.range((
                std::ops::Bound::Excluded(&cursor.last_key),
                std::ops::Bound::Unbounded,
            )),
            None => registry.range(..),
        };

        for (key, entry) in start_range.take(limit as usize + 1) {
            if items.len() < limit as usize {
                items.push(entry);
                last_key = Some(key);
            }
        }

        let has_more = items.len() > limit as usize;
        if has_more {
            items.pop();
        }

        let next_cursor = if has_more && last_key.is_some() {
            Some(Cursor {
                last_key: last_key.unwrap(),
                direction: SortOrder::Desc,
            })
        } else {
            None
        };

        CursorResponse {
            items,
            next_cursor,
            has_more,
        }
    })
}
```

**Implementation Priority**: MEDIUM
**Effort**: High (3-5 days)
**Impact**: Much better performance at scale

---

### 2. Cached Sorted Views ⭐⭐⭐

**Problem**: Sorting all runes on every query is expensive.

**Solution**: Pre-compute and cache sorted lists.

```rust
thread_local! {
    // Cache for pre-sorted lists
    static SORTED_BY_VOLUME: RefCell<StableVec<RuneKey, Memory>> = RefCell::new(
        StableVec::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(5)))
        ).expect("Failed to init sorted cache")
    );

    static SORTED_BY_HOLDERS: RefCell<StableVec<RuneKey, Memory>> = RefCell::new(
        StableVec::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(6)))
        ).expect("Failed to init sorted cache")
    );

    static CACHE_TIMESTAMP: RefCell<u64> = RefCell::new(0);
}

const CACHE_TTL_NS: u64 = 300_000_000_000; // 5 minutes

/// Update sorted caches (call after registry changes)
fn update_sorted_caches() {
    let entries: Vec<_> = REGISTRY.with(|r| {
        r.borrow().iter().collect()
    });

    // Sort by volume
    let mut by_volume = entries.clone();
    by_volume.sort_by(|a, b| b.1.trading_volume_24h.cmp(&a.1.trading_volume_24h));

    SORTED_BY_VOLUME.with(|cache| {
        let mut cache = cache.borrow_mut();
        cache.clear();
        for (key, _) in by_volume {
            let _ = cache.push(&key);
        }
    });

    // Sort by holders
    let mut by_holders = entries;
    by_holders.sort_by(|a, b| b.1.holder_count.cmp(&a.1.holder_count));

    SORTED_BY_HOLDERS.with(|cache| {
        let mut cache = cache.borrow_mut();
        cache.clear();
        for (key, _) in by_holders {
            let _ = cache.push(&key);
        }
    });

    CACHE_TIMESTAMP.with(|ts| {
        *ts.borrow_mut() = ic_cdk::api::time();
    });
}

/// Check if cache is fresh
fn is_cache_fresh() -> bool {
    CACHE_TIMESTAMP.with(|ts| {
        ic_cdk::api::time() - *ts.borrow() < CACHE_TTL_NS
    })
}

#[query]
fn list_runes_cached(page: Option<Page>) -> PagedResponse<RegistryEntry> {
    let page = page.unwrap_or_default();

    // Use cache for common sorts if fresh
    if is_cache_fresh() {
        match page.sort_by() {
            RuneSortBy::Volume => {
                return list_from_cache(&SORTED_BY_VOLUME, page);
            }
            RuneSortBy::Holders => {
                return list_from_cache(&SORTED_BY_HOLDERS, page);
            }
            _ => {}
        }
    }

    // Fallback to regular sorting
    list_runes_internal(page)
}

fn list_from_cache(
    cache: &RefCell<StableVec<RuneKey, Memory>>,
    page: Page,
) -> PagedResponse<RegistryEntry> {
    cache.with(|cache| {
        let cache = cache.borrow();
        let total = cache.len();
        let start = page.offset as usize;
        let end = (page.offset + page.effective_limit()) as usize;

        let keys: Vec<_> = (start..end.min(total as usize))
            .filter_map(|i| cache.get(i as u64))
            .collect();

        let items: Vec<_> = REGISTRY.with(|r| {
            keys.iter()
                .filter_map(|key| r.borrow().get(key))
                .collect()
        });

        PagedResponse::new(items, total, page.offset, page.effective_limit())
    })
}
```

**Implementation Priority**: HIGH (for production with >10K runes)
**Effort**: High (4-5 days)
**Impact**: 100x+ performance improvement

---

### 3. Memory Allocation & Compute Reservation ⭐⭐

**Problem**: Other canisters on the subnet could consume resources.

**Solution**: Reserve resources for the registry canister.

```bash
# Reserve 2GB of memory
dfx canister update-settings registry \
  --memory-allocation 2000000000

# Reserve 10% of compute
dfx canister update-settings registry \
  --compute-allocation 10
```

**In code:**

```rust
// Document memory requirements
/// MEMORY LAYOUT
///
/// Total Reserved: 2GB
///
/// MemoryId(0): Registry Storage (1.5GB max)
/// MemoryId(1): Name Index (200MB max)
/// MemoryId(2): Creator Index (200MB max)
/// MemoryId(3): Global Index (100MB max)
/// MemoryId(4): Roles (10MB max)
/// MemoryId(5): Volume Cache (100MB max)
/// MemoryId(6): Holders Cache (100MB max)
```

**Implementation Priority**: MEDIUM
**Effort**: Low (configuration only)
**Impact**: Guaranteed resources

---

### 4. Horizontal Scaling Preparation ⭐⭐

**Problem**: Single canister has limits (4GB memory, compute capacity).

**Solution**: Design for multi-canister architecture.

```rust
/// Registry Shard - Part of a multi-canister registry
pub struct RegistryShard {
    shard_id: u8,
    total_shards: u8,
}

impl RegistryShard {
    /// Determine if a rune belongs to this shard
    fn owns_rune(&self, key: &RuneKey) -> bool {
        let hash = self.hash_key(key);
        (hash % self.total_shards as u64) == self.shard_id as u64
    }

    fn hash_key(&self, key: &RuneKey) -> u64 {
        // Simple hash - can use more sophisticated method
        key.block ^ (key.tx as u64)
    }
}

/// Coordinator canister - Routes queries to appropriate shards
#[query]
async fn list_runes_distributed(page: Option<Page>) -> PagedResponse<RegistryEntry> {
    let page = page.unwrap_or_default();

    // Query all shards in parallel
    let shard_futures: Vec<_> = SHARDS.with(|shards| {
        shards
            .borrow()
            .iter()
            .map(|shard_id| {
                ic_cdk::call::<_, (PagedResponse<RegistryEntry>,)>(
                    *shard_id,
                    "list_runes",
                    (Some(page.clone()),)
                )
            })
            .collect()
    });

    // Collect results
    let mut all_items = Vec::new();
    let mut total = 0u64;

    for future in shard_futures {
        match future.await {
            Ok((response,)) => {
                all_items.extend(response.items);
                total += response.total;
            }
            Err(e) => {
                ic_cdk::println!("Shard query failed: {:?}", e);
            }
        }
    }

    // Sort combined results
    sort_entries(&mut all_items, &page);

    // Apply pagination to combined results
    let items = paginate_items(all_items, &page);

    PagedResponse::new(items, total, page.offset, page.limit)
}
```

**Implementation Priority**: LOW (only needed at >100K runes)
**Effort**: Very High (2-3 weeks)
**Impact**: Unlimited scalability

---

## ⚡ Performance Optimizations

### 1. Lazy Loading & Streaming ⭐⭐

**Problem**: Large responses consume memory.

**Solution**: Implement streaming responses.

```rust
use ic_cdk::api::call::ManualReply;

#[query(manual_reply = true)]
fn list_runes_stream(page: Option<Page>) -> ManualReply<PagedResponse<RegistryEntry>> {
    let page = page.unwrap_or_default();

    // Process in chunks to avoid memory spikes
    const CHUNK_SIZE: usize = 100;

    let mut items = Vec::with_capacity(page.effective_limit() as usize);

    REGISTRY.with(|r| {
        let registry = r.borrow();
        let mut iter = registry.iter().skip(page.offset as usize);

        while items.len() < page.effective_limit() as usize {
            let chunk: Vec<_> = iter
                .by_ref()
                .take(CHUNK_SIZE)
                .map(|(_, entry)| entry)
                .collect();

            if chunk.is_empty() {
                break;
            }

            items.extend(chunk);
        }
    });

    let total = REGISTRY.with(|r| r.borrow().len());
    let response = PagedResponse::new(items, total, page.offset, page.limit);

    ManualReply::one(response)
}
```

**Implementation Priority**: LOW
**Effort**: Medium (2 days)
**Impact**: Better memory efficiency

---

### 2. Query Optimization with Indexes ⭐⭐⭐

**Problem**: Some queries require full scans.

**Solution**: Add more specialized indexes.

```rust
// Index by creation time (for "recently created" queries)
type TimeIndex = StableBTreeMap<u64, RuneKey, Memory>; // timestamp -> key

// Index by volume ranges (for trending queries)
type VolumeIndex = StableBTreeMap<u64, Vec<RuneKey>, Memory>; // volume_bucket -> keys

// Composite index for complex queries
type CompositeKey = (u64, u32); // (volume_bucket, holder_count_bucket)
type CompositeIndex = StableBTreeMap<CompositeKey, Vec<RuneKey>, Memory>;
```

**Implementation Priority**: MEDIUM
**Effort**: High (4-5 days)
**Impact**: 10x+ improvement for specific queries

---

## 📊 Monitoring & Observability

### 1. Metrics Collection ⭐⭐⭐

**Implementation:**

```rust
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RegistryMetrics {
    // Query metrics
    pub total_queries: u64,
    pub queries_per_second: f64,
    pub avg_query_time_ms: u64,
    pub slow_queries: u64, // >1s

    // Resource metrics
    pub memory_used_bytes: u64,
    pub cycles_balance: u64,
    pub cycles_consumed_per_hour: u64,

    // Data metrics
    pub total_runes: u64,
    pub new_runes_today: u64,
    pub total_volume_24h: u64,

    // Error metrics
    pub rate_limit_hits: u64,
    pub validation_errors: u64,
    pub internal_errors: u64,
}

#[query]
fn get_metrics() -> RegistryMetrics {
    collect_metrics()
}
```

**Implementation Priority**: HIGH
**Effort**: Medium (2-3 days)
**Impact**: Essential for production monitoring

---

## 🗺️ Implementation Roadmap

### Phase 1: Critical Security (Week 1-2) 🔴

1. ✅ Input validation
2. ✅ Rate limiting
3. ✅ Inspect message
4. ✅ Basic RBAC
5. ✅ Metrics collection

**Goal**: Production-ready security baseline

---

### Phase 2: Performance & Caching (Week 3-4) 🟡

1. ✅ Sorted view caching
2. ✅ Memory/compute reservation
3. ✅ Query optimization
4. ✅ Performance benchmarking

**Goal**: Handle 10K+ runes efficiently

---

### Phase 3: Advanced Features (Week 5-8) 🟢

1. ✅ Cursor-based pagination
2. ✅ Query result certification
3. ✅ Advanced monitoring dashboard
4. ✅ Comprehensive logging

**Goal**: Enterprise-grade reliability

---

### Phase 4: Horizontal Scaling (Month 3+) 🔵

1. ✅ Multi-canister architecture
2. ✅ Shard coordinator
3. ✅ Load balancing
4. ✅ Cross-shard queries

**Goal**: Support millions of runes

---

## 📝 Quick Wins (Implement Now)

### Priority 1: Input Validation (1 day)

```rust
// Add to lib.rs
fn validate_page(page: &Page) -> Result<(), String> {
    if page.limit == 0 || page.limit > 1000 {
        return Err("Invalid limit".to_string());
    }
    Ok(())
}
```

### Priority 2: Rate Limiting (1 day)

```rust
// Add rate_limit.rs module
// Implement check_rate_limit()
// Add to all query methods
```

### Priority 3: Metrics (1 day)

```rust
// Add metrics.rs module
// Track query counts, errors, timing
// Expose via get_metrics() endpoint
```

---

## 🎯 Conclusion

This roadmap provides a clear path to:

1. ✅ **Secure** the registry against attacks
2. ✅ **Scale** to millions of runes
3. ✅ **Monitor** system health
4. ✅ **Optimize** query performance

**Next Steps:**

1. Review this document with the team
2. Prioritize Phase 1 implementations
3. Set up monitoring infrastructure
4. Begin implementation sprint

---

**Questions?** Open an issue: https://github.com/AndeLabs/QURI-PROTOCOL/issues

**Built with ❤️ by QURI Protocol Team**

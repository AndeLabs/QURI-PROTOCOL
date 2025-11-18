/*!
 * Generic Pagination Types for QURI Protocol
 *
 * This module provides reusable pagination types that can be used across
 * all canisters in the QURI ecosystem. It's designed to be:
 *
 * - ✅ Generic and reusable
 * - ✅ Type-safe with Candid
 * - ✅ Performance-optimized
 * - ✅ Easy to extend
 *
 * ## Usage Example
 *
 * ```rust
 * use quri_types::pagination::{Page, SortOrder, PagedResponse};
 *
 * #[query]
 * fn list_items(page: Option<Page>) -> PagedResponse<Item> {
 *     let page = page.unwrap_or_default();
 *     // ... implementation
 * }
 * ```
 */

use candid::{CandidType, Deserialize};
use serde::Serialize;

// ============================================================================
// PAGINATION REQUEST
// ============================================================================

/// Sort order for pagination results
#[derive(CandidType, Deserialize, Serialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum SortOrder {
    /// Ascending order (oldest first, A-Z)
    Asc,
    /// Descending order (newest first, Z-A)
    Desc,
}

impl Default for SortOrder {
    fn default() -> Self {
        Self::Desc
    }
}

/// Sort criteria for Rune listings
#[derive(CandidType, Deserialize, Serialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum RuneSortBy {
    /// Sort by block height (etching time)
    Block,
    /// Sort by name (alphabetically)
    Name,
    /// Sort by trading volume (24h)
    Volume,
    /// Sort by holder count (popularity)
    Holders,
    /// Sort by indexed timestamp
    IndexedAt,
}

impl Default for RuneSortBy {
    fn default() -> Self {
        Self::Block
    }
}

/// Generic page request with offset-based pagination
///
/// ## Performance Notes
///
/// - Offset-based pagination is O(offset + limit)
/// - For very large datasets, consider cursor-based pagination
/// - Default limit: 100 items
/// - Maximum limit: 1000 items (enforced by canister)
///
/// ## Example
///
/// ```rust
/// // Get first page (default)
/// let page1 = Page::default();
///
/// // Get second page
/// let page2 = Page {
///     offset: 100,
///     limit: 100,
///     sort_by: Some(RuneSortBy::Volume),
///     sort_order: Some(SortOrder::Desc),
/// };
/// ```
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Page {
    /// Number of items to skip
    pub offset: u64,

    /// Maximum number of items to return
    pub limit: u64,

    /// Sort field (optional)
    pub sort_by: Option<RuneSortBy>,

    /// Sort direction (optional)
    pub sort_order: Option<SortOrder>,
}

impl Default for Page {
    fn default() -> Self {
        Self {
            offset: 0,
            limit: 100,
            sort_by: Some(RuneSortBy::default()),
            sort_order: Some(SortOrder::default()),
        }
    }
}

impl Page {
    /// Create a new page with default values
    pub fn new() -> Self {
        Self::default()
    }

    /// Create a page with specific offset and limit
    pub fn with_bounds(offset: u64, limit: u64) -> Self {
        Self {
            offset,
            limit,
            ..Default::default()
        }
    }

    /// Create a page with specific sort criteria
    pub fn with_sort(sort_by: RuneSortBy, sort_order: SortOrder) -> Self {
        Self {
            offset: 0,
            limit: 100,
            sort_by: Some(sort_by),
            sort_order: Some(sort_order),
        }
    }

    /// Get effective limit (capped at maximum)
    pub fn effective_limit(&self) -> u64 {
        self.limit.min(1000)
    }

    /// Get sort criteria, defaulting if not specified
    pub fn sort_by(&self) -> RuneSortBy {
        self.sort_by.unwrap_or_default()
    }

    /// Get sort order, defaulting if not specified
    pub fn sort_order(&self) -> SortOrder {
        self.sort_order.unwrap_or_default()
    }
}

// ============================================================================
// PAGINATION RESPONSE
// ============================================================================

/// Generic paged response
///
/// This type is used for all paginated API responses across QURI canisters.
///
/// ## Fields
///
/// - `items`: The actual data (generic type T)
/// - `total`: Total number of items available (across all pages)
/// - `offset`: Offset that was used for this page
/// - `limit`: Limit that was used for this page
/// - `has_more`: Whether there are more items after this page
///
/// ## Example Response
///
/// ```json
/// {
///   "items": [...],
///   "total": 1523,
///   "offset": 0,
///   "limit": 100,
///   "has_more": true
/// }
/// ```
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PagedResponse<T> {
    /// Items in this page
    pub items: Vec<T>,

    /// Total number of items across all pages
    pub total: u64,

    /// Offset used for this page
    pub offset: u64,

    /// Limit used for this page
    pub limit: u64,

    /// Whether there are more items after this page
    pub has_more: bool,
}

impl<T> PagedResponse<T> {
    /// Create a new paged response
    pub fn new(items: Vec<T>, total: u64, offset: u64, limit: u64) -> Self {
        let items_len = items.len() as u64;
        let has_more = offset + items_len < total;

        Self {
            items,
            total,
            offset,
            limit,
            has_more,
        }
    }

    /// Create an empty response
    pub fn empty(offset: u64, limit: u64) -> Self {
        Self {
            items: vec![],
            total: 0,
            offset,
            limit,
            has_more: false,
        }
    }

    /// Get the number of items in this page
    pub fn count(&self) -> usize {
        self.items.len()
    }

    /// Check if this is the first page
    pub fn is_first_page(&self) -> bool {
        self.offset == 0
    }

    /// Check if this is the last page
    pub fn is_last_page(&self) -> bool {
        !self.has_more
    }

    /// Get the page number (0-indexed)
    pub fn page_number(&self) -> u64 {
        if self.limit == 0 {
            0
        } else {
            self.offset / self.limit
        }
    }

    /// Get total number of pages
    pub fn total_pages(&self) -> u64 {
        if self.limit == 0 {
            0
        } else {
            (self.total + self.limit - 1) / self.limit
        }
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Apply pagination to a slice
///
/// Returns (paginated_items, total_count, has_more)
pub fn paginate_slice<T: Clone>(
    items: &[T],
    offset: u64,
    limit: u64,
) -> (Vec<T>, u64, bool) {
    let total = items.len() as u64;
    let start = offset as usize;
    let end = (offset + limit) as usize;

    let paginated = if start < items.len() {
        items[start..end.min(items.len())].to_vec()
    } else {
        vec![]
    };

    let has_more = end < items.len();

    (paginated, total, has_more)
}

/// Apply pagination to a vector (consumes the vector)
///
/// Returns PagedResponse<T>
pub fn paginate_vec<T>(
    mut items: Vec<T>,
    offset: u64,
    limit: u64,
) -> PagedResponse<T> {
    let total = items.len() as u64;
    let start = offset as usize;
    let end = (offset + limit) as usize;

    let paginated = if start < items.len() {
        items.drain(start..end.min(items.len())).collect()
    } else {
        vec![]
    };

    PagedResponse::new(paginated, total, offset, limit)
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_page_defaults() {
        let page = Page::default();
        assert_eq!(page.offset, 0);
        assert_eq!(page.limit, 100);
        assert_eq!(page.sort_by(), RuneSortBy::Block);
        assert_eq!(page.sort_order(), SortOrder::Desc);
    }

    #[test]
    fn test_page_effective_limit() {
        let page = Page { limit: 5000, ..Default::default() };
        assert_eq!(page.effective_limit(), 1000);

        let page2 = Page { limit: 50, ..Default::default() };
        assert_eq!(page2.effective_limit(), 50);
    }

    #[test]
    fn test_paged_response() {
        let items = vec![1, 2, 3];
        let response = PagedResponse::new(items, 10, 0, 3);

        assert_eq!(response.count(), 3);
        assert_eq!(response.total, 10);
        assert!(response.has_more);
        assert!(response.is_first_page());
        assert!(!response.is_last_page());
    }

    #[test]
    fn test_paginate_slice() {
        let data = vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

        // First page
        let (page1, total, has_more) = paginate_slice(&data, 0, 3);
        assert_eq!(page1, vec![1, 2, 3]);
        assert_eq!(total, 10);
        assert!(has_more);

        // Second page
        let (page2, _, has_more2) = paginate_slice(&data, 3, 3);
        assert_eq!(page2, vec![4, 5, 6]);
        assert!(has_more2);

        // Last page
        let (page_last, _, has_more_last) = paginate_slice(&data, 9, 3);
        assert_eq!(page_last, vec![10]);
        assert!(!has_more_last);

        // Beyond end
        let (page_beyond, _, _) = paginate_slice(&data, 20, 3);
        assert!(page_beyond.is_empty());
    }

    #[test]
    fn test_paginate_vec() {
        let data = vec![1, 2, 3, 4, 5];
        let response = paginate_vec(data, 2, 2);

        assert_eq!(response.items, vec![3, 4]);
        assert_eq!(response.total, 5);
        assert_eq!(response.offset, 2);
        assert!(response.has_more);
    }

    #[test]
    fn test_page_calculations() {
        let response = PagedResponse::<i32>::new(vec![1, 2, 3], 100, 30, 10);
        assert_eq!(response.page_number(), 3);
        assert_eq!(response.total_pages(), 10);
    }
}

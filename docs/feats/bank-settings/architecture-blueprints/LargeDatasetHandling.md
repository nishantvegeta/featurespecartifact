---
id: architecture-blueprint-large-dataset-handling
name: LargeDatasetHandling
type: architecture-blueprint
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# LargeDatasetHandling

**Type:** Architecture pattern for efficient checklist rendering at scale

## Problem Statement

As checklist item count grows (50+, 100+), rendering all items in a single table becomes:
- Slow initial page load (browser rendering overhead)
- High memory usage (DOM nodes, JavaScript objects)
- Poor sorting/filtering performance
- Sluggish table interactions

## Solution Approach

### Pagination

**Strategy:** Load and display fixed-size page (20 items by default)

**Implementation:**
- GetChecklistItemsQuery supports PagedAndSortedResultRequestDto
- SkipCount + MaxResultCount parameters
- TotalCount returned for UI pagination controls
- Default: 20 items/page; max 50 items/page (configurable)

**Benefits:**
- Initial load: Only 20 items fetched and rendered
- Memory: Only current page in DOM
- Performance: Sorting/filtering only on current page

**UI:** Pagination controls (Previous, Next, Page numbers, Items per page selector)

### Sorting

**Strategy:** Explicit sort field switch (no LINQ.Dynamic.Core)

**Implementation:**
- Supported fields: SequenceNumber (default), IsActive, CreatedAt
- Explicit case statement in query handler
- No dynamic query building (safety, performance)

**Default:** SequenceNumber ascending (maintains configured order)

### Database Indexes

**Indexes to create:**

1. **TenantId + SequenceNumber**
   - Purpose: Fast retrieval of items in sequence order
   - Usage: GetChecklistItemsQuery sorting by SequenceNumber
   - Impact: 10x faster for 100+ item checklists

2. **TenantId + IsActive**
   - Purpose: Filter active items for LC review
   - Usage: Future integration (LC review checklist)
   - Impact: Efficient inactive item exclusion

**Migration:** Add via EF Core fluent API in ChecklistItemConfiguration

### Lazy Loading (Future Enhancement)

**Consideration for 100+ items:**

Instead of pagination button clicks, implement infinite scroll or virtual scrolling:
- Load next 20 items as user scrolls down
- Render only visible items (virtual scrolling)
- Significantly better UX for large lists

**Implementation:** Defer to v2.0 if scrolling volume justifies complexity

## Performance Targets

| Operation | Target | Achievability |
|-----------|--------|--------|
| Initial page load (first 20 items) | < 2 seconds | ✓ with pagination + index |
| Sort operation | < 1 second | ✓ with explicit sort + index |
| Add/edit/delete operation | < 1 second | ✓ soft delete (no full reindex) |
| Real-time subscription update (per client) | < 1 second | ✓ SignalR optimized |
| 100-item checklist navigation | Smooth | ✓ with pagination |

## Scaling Considerations

| Item Count | Pagination | Indexes | Lazy Load | Notes |
|-----------|-----------|---------|-----------|-------|
| 1–20 | Not required | Not required | No | Single page load |
| 21–50 | Recommended | Recommended | No | 2–3 pages |
| 51–100 | Required | Required | No | 5 pages @ 20/page |
| 100+ | Required | Required | Yes | Consider virtual scrolling |

## Implementation Checklist

- ✓ GetChecklistItemsQuery pagination (PagedAndSortedResultRequestDto)
- ✓ Explicit sort switch in query handler
- ✓ EF Core indexes (TenantId + SequenceNumber, TenantId + IsActive)
- ✓ UI pagination controls (Previous/Next, page selector)
- TBD (v2.0): Virtual scrolling for 100+ items

## Source

- [FRS #15 — Non-Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/15)
- [FRS #15 — Edge Cases](http://localhost:8080/root/trade-finance/-/issues/15#16-edge-cases)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial architecture blueprint |

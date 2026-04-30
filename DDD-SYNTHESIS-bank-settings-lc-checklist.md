# DDD/ABP Synthesis: BankSettings LC Issuance Checklist Module

**Module:** BankSettings | **Feature:** LC Issuance Checklist Management  
**Version:** 1.0  
**Date:** 2026-04-28  
**References:** FRS-LCI-00 through FRS-LCI-05  
**Stack:** ABP Framework, C# / .NET, Entity Framework Core, PostgreSQL, FluentValidation, Mapperly

---

## Table of Contents

1. [Entity: ChecklistItem](#entity-checklistitem)
2. [Value Objects](#value-objects)
3. [Commands](#commands)
4. [Queries](#queries)
5. [States](#states)
6. [Decisions](#decisions)
7. [Architecture Blueprints](#architecture-blueprints)
8. [Conflicts & Resolution](#conflicts--resolution)
9. [Permissions Map](#permissions-map)
10. [ABP Artifact Map](#abp-artifact-map)
11. [Summary & Commit Message](#summary--commit-message)

---

## Entity: ChecklistItem

**Aggregate Root for LC Issuance Checklist Management**

**Base class:** `FullAuditedAggregateRoot<Guid>`  
**Interfaces:** `IMultiTenant`  
**Tenant scoped:** Yes (multi-tenant per customer)

### Fields

- **Id**: Guid (primary key)
- **TenantId**: Guid? (tenant scoping; required for multi-tenancy)
- **Description**: string (1-500 characters, required, non-empty, trimmed)
- **SequenceNumber**: int (1+, unique per tenant, auto-managed, reflects position in ordered list)
- **IsActive**: bool (default true; controls visibility in LC review checklists used by Branch/CTF teams)
- **CreatedBy**: string (user ID of creator; ABP standard)
- **CreatedAt**: DateTime (UTC timestamp of creation; ABP standard)
- **LastModifiedBy**: string (user ID of last editor; nullable; ABP standard)
- **LastModifiedAt**: DateTime? (UTC timestamp of last edit; ABP standard)
- **IsDeleted**: bool (soft delete flag; ABP standard via FullAuditedAggregateRoot)
- **DeletionTime**: DateTime? (soft delete timestamp; ABP standard)
- **DeleterUserId**: Guid? (user who soft-deleted; ABP standard)

### Domain Events

1. **ChecklistItemCreatedDomainEvent**
   - Raised when: New ChecklistItem is created
   - Payload: ItemId (Guid), Description (string), SequenceNumber (int), TenantId (Guid), CreatedBy (string)
   - Purpose: Notify other modules (e.g., audit logging, real-time synchronization) of new item creation

2. **ChecklistItemEditedDomainEvent**
   - Raised when: Item description is updated
   - Payload: ItemId (Guid), OldDescription (string), NewDescription (string), TenantId (Guid), ModifiedBy (string)
   - Purpose: Track description changes for audit trail and real-time UI updates

3. **ChecklistItemDeletedDomainEvent**
   - Raised when: Item is deleted (soft deleted via IsDeleted = true)
   - Payload: ItemId (Guid), OldSequenceNumber (int), TenantId (Guid), DeletedBy (string)
   - Purpose: Notify modules to remove item from active reviews and update real-time UIs

4. **ChecklistItemStatusToggledDomainEvent**
   - Raised when: Item active status is toggled
   - Payload: ItemId (Guid), NewIsActive (bool), TenantId (Guid), ModifiedBy (string)
   - Purpose: Update LC review checklist visibility for Branch/CTF teams immediately

5. **ChecklistItemReorderedDomainEvent**
   - Raised when: Item sequence number changes (moved up/down)
   - Payload: ItemId (Guid), OldSequenceNumber (int), NewSequenceNumber (int), TenantId (Guid), ModifiedBy (string)
   - Purpose: Reflect new order in real-time UI and update dependent systems

### Constructor & Invariants

```
// Pseudo-code invariants:
- Description must be non-empty and non-whitespace-only
- Description maximum 500 characters
- SequenceNumber must be > 0
- SequenceNumber must be unique within tenant's checklist
- IsActive defaults to true on creation
- TenantId is required (IMultiTenant enforcement)
```

### Key Business Methods (Domain Logic)

- **ToggleStatus()**: Inverts IsActive (true → false, false → true); raises ChecklistItemStatusToggledDomainEvent
- **UpdateDescription(string newDescription)**: Validates new description; updates Description field; raises ChecklistItemEditedDomainEvent
- **ReorderTo(int newSequenceNumber)**: Updates SequenceNumber atomically; raises ChecklistItemReorderedDomainEvent (called only by domain service)
- **MarkDeleted()**: Sets IsDeleted = true, DeletionTime = UtcNow; raises ChecklistItemDeletedDomainEvent (via soft delete)

---

## Value Objects

### ChecklistItemDescription

**Type:** String value object with validation  
**Purpose:** Encapsulate and validate the description text for a checklist item

**Constraints:**
- Non-empty and non-whitespace-only (after trimming)
- Maximum 500 characters
- UTF-8 text; special characters (é, ñ, etc.) allowed
- Trimmed on set (leading/trailing whitespace removed)
- Immutable once set

**Validation Rules (FluentValidation):**
```
- NotEmpty().NotWhitespace() → "Description must not be empty"
- MaximumLength(500) → "Description must not exceed 500 characters"
- Custom: Trim whitespace before validation
```

**Usage:** Stored directly as string field in ChecklistItem entity (not a separate CLR class; validation in DTO validators)

---

### ChecklistItemSequence

**Type:** Integer value object with auto-management  
**Purpose:** Represent the sequential position (S.N) of a checklist item within tenant's list

**Constraints:**
- Must be >= 1 (ordinal numbering)
- Must be unique within tenant's checklist
- Auto-incremented when new items added (max current + 1)
- Recalculated on delete/reorder to maintain contiguous sequence (1, 2, 3, ...)
- Immutable during edit; only updated via Reorder or Delete commands

**Domain Logic:**
- On CreateChecklistItem: SequenceNumber = max(current) + 1
- On ReorderChecklistItem: Swap SequenceNumber values between two adjacent items
- On DeleteChecklistItem: Decrement SequenceNumber for all items with SequenceNumber > deleted item's

**Usage:** Stored as int field in ChecklistItem entity

---

### ChecklistItemStatus

**Type:** Enum with two states  
**Purpose:** Represent the active/inactive state affecting visibility in LC review checklists

**Values:**
- **Active** (serialized as "active" lowercase via JsonStringEnumConverter(CamelCase))
- **Inactive** (serialized as "inactive" lowercase)

**Semantics:**
- Active: Item included in LC review checklists presented to Branch/CTF teams during LC review
- Inactive: Item hidden from LC review checklists but still visible in Bank Admin configuration UI

**Transitions:**
- Active ↔ Inactive (via ToggleChecklistItemStatusCommand; bidirectional; no restrictions)

**Validation:** Enum value validation via data annotations

---

## Commands

### Command 1: CreateChecklistItem

**Input DTO:** `CreateChecklistItemCommandInputDto`

**Input Fields:**
- **Description** (string, required): Text description of the verification checkpoint
  - Validation: NotEmpty, NotWhitespace, MaximumLength(500)

**Output DTO:** `CreateChecklistItemCommandOutputDto`

**Output Fields:**
- **ItemId** (Guid): Newly created item's ID
- **SequenceNumber** (int): Assigned S.N value
- **Description** (string): Echoed description
- **IsActive** (bool): Always true on creation
- **CreatedAt** (DateTime): Timestamp of creation

**Validator:** `CreateChecklistItemCommandInputValidator` (FluentValidation)
```
RuleFor(x => x.Description)
  .NotEmpty()
  .NotNull()
  .NotWhitespace()
  .MaximumLength(500);
```

**Authorization:** `[Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]`  
**Audience:** Private (`/api/private/app/bank-settings/checklist-items`)  
**HTTP Method:** POST

**Domain Logic:**
1. Validate input via validator
2. Determine next SequenceNumber (max current + 1, or 1 if empty)
3. Create ChecklistItem aggregate with:
   - Id = Guid.NewGuid()
   - TenantId = CurrentTenant.Id
   - Description = input.Description.Trim()
   - SequenceNumber = nextSequence
   - IsActive = true
   - CreatedBy = CurrentUser.Id
4. Save to repository
5. Raise ChecklistItemCreatedDomainEvent
6. Return output DTO

**Idempotency:** Not idempotent (creates new item each time)

**Error Handling:**
- InvalidOperationException if TenantId is null
- ValidationException if description validation fails

**Database Transaction:** ACID required (one item creation atomic)

---

### Command 2: EditChecklistItem

**Input DTO:** `EditChecklistItemCommandInputDto`

**Input Fields:**
- **ItemId** (Guid, required): ID of item to edit
- **Description** (string, required): New description text
  - Validation: NotEmpty, NotWhitespace, MaximumLength(500)

**Output DTO:** `EditChecklistItemCommandOutputDto`

**Output Fields:**
- **ItemId** (Guid): Item's ID
- **Description** (string): Updated description
- **SequenceNumber** (int): Unchanged S.N
- **IsActive** (bool): Unchanged status
- **LastModifiedAt** (DateTime): Updated timestamp

**Validator:** `EditChecklistItemCommandInputValidator`
```
RuleFor(x => x.ItemId)
  .NotEqual(Guid.Empty);
RuleFor(x => x.Description)
  .NotEmpty()
  .NotNull()
  .NotWhitespace()
  .MaximumLength(500);
```

**Authorization:** `[Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]`  
**Audience:** Private  
**HTTP Method:** PUT

**Domain Logic:**
1. Validate input
2. Load ChecklistItem by ItemId (tenant-scoped)
3. If not found, raise EntityNotFoundException("Item no longer exists")
4. If IsDeleted = true, raise EntityNotFoundException("Item no longer exists")
5. Call domain method: item.UpdateDescription(input.Description)
6. Save to repository
7. Raise ChecklistItemEditedDomainEvent
8. Return output DTO

**Immutability Rules:**
- SequenceNumber NOT updated during edit (use Reorder command)
- IsActive NOT updated during edit (use Toggle command)
- Position NOT changed during edit

**Concurrent Edit Conflict Handling:**
- If item deleted by another user before save: Detected via entity not found check; error raised
- Last-write-wins: No optimistic locking currently; consider adding ConcurrencyStamp if data loss unacceptable

**Error Handling:**
- EntityNotFoundException if item not found or deleted
- ValidationException if description validation fails
- ConcurrencyException (future) if optimistic lock added

---

### Command 3: ToggleChecklistItemStatus

**Input DTO:** `ToggleChecklistItemStatusCommandInputDto`

**Input Fields:**
- **ItemId** (Guid, required): ID of item to toggle
  - Validation: NotEqual(Guid.Empty)

**Output DTO:** `ToggleChecklistItemStatusCommandOutputDto`

**Output Fields:**
- **ItemId** (Guid): Item's ID
- **IsActive** (bool): New active status (true = active, false = inactive)
- **LastModifiedAt** (DateTime): Updated timestamp

**Validator:** `ToggleChecklistItemStatusCommandInputValidator`
```
RuleFor(x => x.ItemId)
  .NotEqual(Guid.Empty);
```

**Authorization:** `[Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]`  
**Audience:** Private  
**HTTP Method:** PATCH `/api/private/app/bank-settings/checklist-items/{itemId}/status`

**Domain Logic:**
1. Validate input
2. Load ChecklistItem by ItemId (tenant-scoped)
3. If not found, raise EntityNotFoundException("Item no longer exists")
4. Call domain method: item.ToggleStatus()
   - IsActive inverts: true → false, false → true
5. Save to repository
6. Raise ChecklistItemStatusToggledDomainEvent
7. Return output DTO with new IsActive value

**Business Rule:** Inactive items excluded from LC review checklists presented to Branch/CTF teams; still visible in Bank Admin UI

**Atomicity:** Single toggle operation is atomic; no race conditions expected with last-write-wins

**Error Handling:**
- EntityNotFoundException if item not found or deleted

---

### Command 4: ReorderChecklistItem

**Input DTO:** `ReorderChecklistItemCommandInputDto`

**Input Fields:**
- **ItemId** (Guid, required): ID of item to reorder
- **Direction** (enum "Up" | "Down", required): Direction to move item
  - Validation: IsInEnum()
  - Custom: If Direction = "Up", SequenceNumber != 1
  - Custom: If Direction = "Down", SequenceNumber != max

**Output DTO:** `ReorderChecklistItemCommandOutputDto`

**Output Fields:**
- **Items** (ChecklistItemDto[]): All items with updated sequence numbers
  - Sorted by SequenceNumber ascending
- **MovedItemId** (Guid): ID of item that was moved
- **NewSequenceNumber** (int): New position of moved item

**Validator:** `ReorderChecklistItemCommandInputValidator`
```
RuleFor(x => x.ItemId)
  .NotEqual(Guid.Empty);
RuleFor(x => x.Direction)
  .IsInEnum();
Custom: if Direction == "Up", validate SequenceNumber > 1 for item
Custom: if Direction == "Down", validate SequenceNumber < max for item
```

**Authorization:** `[Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]`  
**Audience:** Private  
**HTTP Method:** PATCH `/api/private/app/bank-settings/checklist-items/{itemId}/reorder`

**Domain Logic:**
1. Validate input
2. Load ChecklistItem by ItemId (tenant-scoped)
3. If not found, raise EntityNotFoundException("Item no longer exists")
4. Determine adjacent item:
   - If Direction = "Up": item with SequenceNumber = current - 1
   - If Direction = "Down": item with SequenceNumber = current + 1
5. Validate adjacent item exists; if not, raise InvalidOperationException("Cannot move further")
6. Atomic swap:
   - oldSeq = item.SequenceNumber
   - newSeq = adjacentItem.SequenceNumber
   - item.SequenceNumber = newSeq
   - adjacentItem.SequenceNumber = oldSeq
7. Save both items to repository (transaction)
8. Raise ChecklistItemReorderedDomainEvent for moved item
9. Return output DTO with all items in new order

**Boundary Conditions:**
- First item (SequenceNumber = 1) cannot move up; validation error
- Last item (SequenceNumber = max) cannot move down; validation error
- UI disables buttons for boundary items

**Atomicity:** Both item updates in single transaction; if either fails, both roll back

**Preservation Rules:**
- Description NOT changed
- IsActive NOT changed
- CreatedBy NOT changed
- Only SequenceNumber swapped

**Error Handling:**
- EntityNotFoundException if item not found or deleted
- InvalidOperationException if boundary condition violated
- Database TransactionAbortedException if atomic swap fails

---

### Command 5: DeleteChecklistItem

**Input DTO:** `DeleteChecklistItemCommandInputDto`

**Input Fields:**
- **ItemId** (Guid, required): ID of item to delete
  - Validation: NotEqual(Guid.Empty)

**Output DTO:** `DeleteChecklistItemCommandOutputDto`

**Output Fields:**
- **ItemId** (Guid): ID of deleted item
- **DeletedAt** (DateTime): Timestamp of deletion
- **Message** (string): "Checklist item removed successfully"

**Validator:** `DeleteChecklistItemCommandInputValidator`
```
RuleFor(x => x.ItemId)
  .NotEqual(Guid.Empty);
```

**Authorization:** `[Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]`  
**Audience:** Private  
**HTTP Method:** DELETE `/api/private/app/bank-settings/checklist-items/{itemId}`

**Domain Logic:**
1. Validate input
2. Load ChecklistItem by ItemId (tenant-scoped)
3. If not found, operation is idempotent; return success (no error)
4. If IsDeleted = true, operation is idempotent; return success (already deleted)
5. Mark item deleted:
   - IsDeleted = true
   - DeletionTime = UtcNow
   - DeleterUserId = CurrentUser.Id
6. Resequence remaining items:
   - oldSeq = deleted item's SequenceNumber
   - For all items with SequenceNumber > oldSeq:
     - Decrement SequenceNumber by 1
7. Save deleted item and all affected items to repository (transaction)
8. Raise ChecklistItemDeletedDomainEvent
9. Return output DTO

**Soft Delete:** Uses ABP's FullAuditedAggregateRoot soft-delete mechanism (IsDeleted = true)

**Resequencing:** After deletion, renumber 1, 2, 3, ... to maintain contiguous sequence without gaps

**Idempotency:** Deleting already-deleted item succeeds without error (safe idempotent operation)

**Atomicity:** All resequencing in single transaction

**Error Handling:**
- None on idempotent re-delete
- Database TransactionAbortedException if resequencing fails

---

## Queries

### Query 1: GetChecklistItems

**Input DTO:** `GetChecklistItemsQueryInputDto` (extends `PagedAndSortedResultRequestDto`)

**Input Fields (from PagedAndSortedResultRequestDto):**
- **SkipCount** (int, default 0): Page offset (0-based)
- **MaxResultCount** (int, default 20, max 50): Items per page
- **Sorting** (string, optional): Explicit field names (e.g., "SequenceNumber ASC", "IsActive DESC", "CreatedAt DESC")

**Query Filters (optional):**
- **IsActiveFilter** (bool?, optional): Filter by active/inactive
  - null = all items
  - true = only active items
  - false = only inactive items

**Output DTO:** `PagedResultDto<ChecklistItemDto>`

**Output Fields:**
- **Items** (ChecklistItemDto[]):
  - Id (Guid)
  - SequenceNumber (int)
  - Description (string)
  - IsActive (bool)
  - CreatedAt (DateTime)
  - CreatedBy (string)
- **TotalCount** (long): Total matching items (for pagination)

**Authorization:** `[Authorize(TradeFinancePermissions.BankSettings.ViewChecklistItems)]`  
**Audience:** Private  
**HTTP Method:** GET `/api/private/app/bank-settings/checklist-items`

**Query Logic:**
1. Retrieve all ChecklistItem records for current tenant (implicit TenantId filter)
2. Filter soft-deleted items (IsDeleted = false, implicit)
3. Apply IsActiveFilter if provided:
   - If true: Where(x => x.IsActive == true)
   - If false: Where(x => x.IsActive == false)
   - If null: No filter (all items)
4. Apply sorting via explicit switch (no System.Linq.Dynamic.Core):
   ```csharp
   switch (sorting)
   {
       case "SequenceNumber ASC":
           query = query.OrderBy(x => x.SequenceNumber);
           break;
       case "SequenceNumber DESC":
           query = query.OrderByDescending(x => x.SequenceNumber);
           break;
       case "IsActive ASC":
           query = query.OrderBy(x => x.IsActive);
           break;
       case "IsActive DESC":
           query = query.OrderByDescending(x => x.IsActive);
           break;
       case "CreatedAt ASC":
           query = query.OrderBy(x => x.CreatedAt);
           break;
       case "CreatedAt DESC" (default):
           query = query.OrderByDescending(x => x.CreatedAt);
           break;
   }
   ```
5. Apply pagination: Skip(input.SkipCount).Take(input.MaxResultCount)
6. Execute query and map to ChecklistItemDto[]
7. Get TotalCount via separate count query (before pagination)
8. Return PagedResultDto<ChecklistItemDto>

**Tenant Scoping:** Implicit via IMultiTenant and current tenant context

**Performance Considerations:**
- Default sort by SequenceNumber (natural order) or CreatedAt descending
- Pagination default 20 items; max 50 per page
- For 100+ items, pagination mandatory
- Database index on (TenantId, SequenceNumber) and (TenantId, IsActive) recommended

**Error Handling:**
- Invalid sort field: fallback to default (SequenceNumber ASC)
- Invalid pagination params: clamp to valid ranges

---

### Query 2: GetChecklistItem

**Input DTO:** `GetChecklistItemQueryInputDto`

**Input Fields:**
- **ItemId** (Guid, required): ID of item to retrieve
  - Validation: NotEqual(Guid.Empty)

**Output DTO:** `ChecklistItemDto`

**Output Fields:**
- Id (Guid)
- SequenceNumber (int)
- Description (string)
- IsActive (bool)
- CreatedAt (DateTime)
- CreatedBy (string)
- LastModifiedAt (DateTime?)
- LastModifiedBy (string?)

**Authorization:** `[Authorize(TradeFinancePermissions.BankSettings.ViewChecklistItems)]`  
**Audience:** Private  
**HTTP Method:** GET `/api/private/app/bank-settings/checklist-items/{itemId}`

**Query Logic:**
1. Load ChecklistItem by ItemId (tenant-scoped)
2. If not found or IsDeleted = true, raise EntityNotFoundException("Item not found")
3. Map to ChecklistItemDto
4. Return output DTO

**Use Cases:**
- Load current item data into edit dialog
- Validate item exists before showing details
- Fetch specific item for audit logging

**Error Handling:**
- EntityNotFoundException if item not found or deleted

---

### Query 3: CountActiveItems (Optional)

**Input DTO:** `CountActiveItemsQueryInputDto`

**Input Fields:** None (query current tenant only)

**Output DTO:** `CountActiveItemsQueryOutputDto`

**Output Fields:**
- **ActiveCount** (int): Number of items with IsActive = true

**Authorization:** `[Authorize(TradeFinancePermissions.BankSettings.ViewChecklistItems)]`  
**Audience:** Private  
**HTTP Method:** GET `/api/private/app/bank-settings/checklist-items/count/active`

**Query Logic:**
1. Count ChecklistItem records for current tenant where IsActive = true and IsDeleted = false
2. Return output DTO with count

**Use Cases:**
- Display summary badge "N active items"
- Warn if all items toggled inactive

**Performance:** Single aggregation query (fast)

---

## States

### ChecklistItemStatus Enum

**Type:** String-serialized enum (via JsonStringEnumConverter(CamelCase) global config)

**Values:**
- **Active** → serializes to `"active"`
- **Inactive** → serializes to `"inactive"`

**Semantics:**
- **Active** (IsActive = true): Item included in LC review checklists presented to Branch/CTF teams
- **Inactive** (IsActive = false): Item hidden from LC review checklists; still visible in Bank Admin configuration UI

**State Transitions:**
- Active ↔ Inactive (bidirectional toggle; no restrictions)

**Storage:** Mapped from bool field IsActive (true = Active, false = Inactive)

---

### ChecklistItemLifecycle State Machine

**States:**
1. **Created**: New ChecklistItem instantiated with Description, SequenceNumber, IsActive = true
2. **Active**: Item visible in LC review checklists (IsActive = true)
3. **Inactive**: Item hidden from LC review checklists (IsActive = false); still editable/deletable
4. **Edited**: Description updated (only field editable; SequenceNumber/IsActive/Position unchanged)
5. **Reordered**: SequenceNumber changed via up/down commands
6. **Deleted**: IsDeleted = true (soft delete); no longer visible in any list

**Valid Transitions:**
```
Created → Active (initial state, IsActive = true)
Active ↔ Inactive (toggle status anytime)
Active → Edited (update description anytime)
Active → Reordered (move up/down anytime)
Active → Deleted (delete anytime)
Inactive → Edited (edit while inactive)
Inactive → Reordered (reorder while inactive)
Inactive → Deleted (delete while inactive)
Edited → Inactive (toggle after edit)
Edited → Reordered (reorder after edit)
Edited → Deleted (delete after edit)
Any State → Deleted (idempotent)
```

**No Backward Transitions (except toggle):**
- Deleted → any other state: Not allowed (permanent)
- Reordered: SequenceNumber cannot change except via Reorder command

---

## Decisions

### Decision 1: ItemValidationRules

**Rule 1: Non-Empty Description**
- **Input:** Description string
- **Constraint:** Must not be empty; must not be only whitespace (after trimming)
- **Enforcement Location:** CreateChecklistItemCommandInputValidator, EditChecklistItemCommandInputValidator
- **Error Message:** "Description must not be empty or contain only whitespace"
- **UI Feedback:** "Add Item" and "Save Changes" buttons disabled until non-empty text entered

**Rule 2: Description Max Length**
- **Input:** Description string
- **Constraint:** Maximum 500 characters (UTF-8)
- **Enforcement Location:** Input validators (MaximumLength(500))
- **Error Message:** "Description must not exceed 500 characters"
- **UI Feedback:** Character counter or validation error, item not created/updated

**Rule 3: Whitespace Trimming**
- **Input:** Description string with potential leading/trailing spaces
- **Action:** Trim before storage
- **Example:** "  Verify Document Authenticity  " → "Verify Document Authenticity"
- **Enforcement:** DTO validator or domain method

**Rule 4: Button Enable/Disable State**
- **Input:** Dialog form field state (real-time)
- **Constraint:** Submit button disabled if description empty or exceeds 500 chars
- **Enforcement:** UI state machine (React component validation on change)
- **User Feedback:** Real-time validation feedback as user types

---

### Decision 2: ImmutabilityRules

**Rule 1: SequenceNumber Immutable During Edit**
- **Field:** SequenceNumber (int)
- **Operations:** Edit description only
- **Enforcement:** EditChecklistItemCommand does NOT accept SequenceNumber as input
- **Domain Service Check:** UpdateDescription() method does NOT modify SequenceNumber
- **Consequence:** Reordering requires separate ReorderChecklistItemCommand
- **Rationale:** Prevents confusion of edit and reorder operations; maintains separation of concerns

**Rule 2: IsActive Immutable During Edit**
- **Field:** IsActive (bool)
- **Operations:** Edit description only
- **Enforcement:** EditChecklistItemCommand does NOT accept IsActive as input
- **Domain Service Check:** UpdateDescription() method preserves IsActive value
- **Consequence:** Status toggling via separate ToggleChecklistItemStatusCommand only
- **Rationale:** Edit is description-only; status toggling is a distinct operation

**Rule 3: IsActive Immutable During Reorder**
- **Field:** IsActive (bool)
- **Operations:** Reorder (move up/down)
- **Enforcement:** ReorderChecklistItemCommand does NOT modify IsActive
- **Domain Service Check:** Reorder logic only swaps SequenceNumber values
- **Consequence:** Item remains active/inactive throughout reordering
- **Rationale:** Status and position are independent concerns

**Rule 4: Description Immutable During Reorder**
- **Field:** Description (string)
- **Operations:** Reorder (move up/down)
- **Enforcement:** ReorderChecklistItemCommand only swaps SequenceNumber
- **Consequence:** Description unchanged; only position changed

---

### Decision 3: BoundaryConditionRules

**Rule 1: Up Arrow Disabled for First Item**
- **Condition:** SequenceNumber == 1 (item is first in list)
- **UI State:** Up arrow button grayed out / disabled (CSS class: disabled, aria-disabled: true)
- **Enforcement:** Frontend prevents click; backend validates in ReorderChecklistItemCommand
- **Backend Validation:** If Direction = "Up", validate SequenceNumber > 1
- **Behavior:** Click has no effect (button disabled); no network request sent

**Rule 2: Down Arrow Disabled for Last Item**
- **Condition:** SequenceNumber == max(SequenceNumber for tenant) (item is last in list)
- **UI State:** Down arrow button grayed out / disabled
- **Enforcement:** Frontend prevents click; backend validates in ReorderChecklistItemCommand
- **Backend Validation:** If Direction = "Down", validate SequenceNumber < max
- **Behavior:** Click has no effect; no network request sent

**Rule 3: Disabled Button Visual Feedback**
- **CSS:** opacity: 0.5, cursor: not-allowed
- **Aria Labels:** aria-disabled="true" for accessibility
- **Tooltip (optional):** "Item is already at the top" / "Item is already at the bottom"

---

### Decision 4: ConcurrentUpdateHandling

**Scenario 1: Item Deleted by Another Admin During Edit**
- **Trigger:** Admin A opens edit dialog for Item X; Admin B deletes Item X; Admin A submits edit
- **Detection:** EditChecklistItemCommand loads item by ItemId; checks if exists or IsDeleted = true
- **Resolution:** Command fails with error "Item no longer exists. Please refresh and try again."
- **UI Behavior:** Error toast displayed; dialog remains open; entered text preserved (no data loss)
- **Idempotency:** DeleteChecklistItemCommand is idempotent; already-deleted item returns success

**Scenario 2: Concurrent Status Toggles**
- **Trigger:** Admin A and Admin B click toggle for same item simultaneously
- **Concurrent Behavior:** Both operations fetch item, toggle status, save
- **Resolution:** Last-write-wins (final toggle value persists; earlier value overwritten)
- **Consistency:** No data corruption; only the order of toggles indeterminate
- **Future Enhancement:** Add optimistic locking (ConcurrencyStamp) if order matters

**Scenario 3: Concurrent Reorders**
- **Trigger:** Admin A reorders item 2 up; Admin B reorders item 3 down simultaneously
- **Concurrent Behavior:** Both operations swap SequenceNumber values atomically
- **Resolution:** Transaction isolation ensures atomic completion
- **Final State:** Determined by transaction commit order (database-level ordering)
- **No Race Condition:** Each transaction commits or aborts completely

**Scenario 4: Item Deleted While Another Admin Reorders**
- **Trigger:** Admin A clicks "move down" for item that Admin B deletes between fetch and update
- **Detection:** During reorder, adjacent item lookup fails; item no longer exists
- **Resolution:** Operation aborts with error "One or more items no longer exist"
- **UI Behavior:** Error toast; table refreshes to show current state

**Implementation Strategy:**
- Optimistic concurrency (last-write-wins) for now
- Future: Add ConcurrencyStamp to ChecklistItem if data loss unacceptable
- EF Core ConcurrencyToken on IsActive and Description fields; SequenceNumber changes managed atomically

---

## Architecture Blueprints

### Blueprint 1: LargeDatasetHandling

**Scenario:** Checklist with 50+ items

**Challenge:** Performance of table rendering, sorting, and paging with large datasets

**Solution Approach:**

**Pagination Strategy:**
- GetChecklistItemsQuery supports PagedAndSortedResultRequestDto
- Default page size: 20 items per page
- Maximum page size: 50 items per page (prevent abuse)
- UI renders only current page (not full 50+)

**Sorting Strategy:**
- Explicit switch on supported fields: SequenceNumber, IsActive, CreatedAt (no LINQ.Dynamic.Core)
- Default sort: SequenceNumber ASC (natural order)
- Server-side sorting (avoid client-side sort of large datasets)

**Database Optimization:**
- Index on (TenantId, SequenceNumber) for fast ordering
- Index on (TenantId, IsActive) for fast filtering
- Clustered index on (TenantId, Id) for primary key lookup

**Performance Targets:**
- Initial page load (first 20 items): < 2 seconds
- Sort operation: < 1 second
- Add/edit/delete operation: < 500ms
- Real-time subscription update: < 1 second

**Lazy Loading (Optional Future):**
- For 100+ items, consider virtual scrolling (IntersectionObserver)
- Load items on-demand as user scrolls
- Fetch next page when approaching bottom

**UI Considerations:**
- Table header with pagination controls (page, per-page dropdown)
- Loading spinner during fetch
- "No results" message if filters result in empty list
- Responsive table (horizontal scroll on mobile if needed)

---

### Blueprint 2: RealTimeDataSynchronization

**Scenario:** Multiple Bank Admins viewing/editing checklist simultaneously; changes by one admin should appear on other admins' screens within 1-2 seconds

**Challenge:** Keep all connected clients synchronized without constant polling

**Solution Approach:**

**Event-Driven Architecture:**
- Every command (Create, Edit, Toggle, Reorder, Delete) raises a domain event
- Domain events published to message queue (RabbitMQ)
- Subscribers (e.g., SignalR Hub) receive events and push to connected clients

**Subscription Mechanism (Contract):**
- SignalR Hub endpoint: `/hubs/checklist-updates`
- Client connects on page load: `connection.start()`
- Hub groups by TenantId: `group = "checklist-" + tenantId`
- Client joins group on mount; leaves on unmount

**Event Flow:**
```
Bank Admin submits EditChecklistItem command
  ↓
Application Service validates and executes
  ↓
Domain event: ChecklistItemEditedDomainEvent published
  ↓
Event handler catches event
  ↓
RabbitMQ message published to "checklist.events" exchange
  ↓
SignalR event handler receives message
  ↓
Hub sends message to all clients in "checklist-[tenantId]" group
  ↓
Client receives update via SignalR
  ↓
UI state updated; table re-rendered with latest data
```

**Event Contract (Payload):**
```json
{
  "eventType": "ChecklistItemEdited",
  "itemId": "guid",
  "oldDescription": "string",
  "newDescription": "string",
  "modifiedAt": "ISO8601",
  "modifiedBy": "userId"
}
```

**SignalR Hub Methods:**
- `OnChecklistItemCreated(item)`: Push new item to all viewers
- `OnChecklistItemEdited(itemId, newDescription)`: Update item in table
- `OnChecklistItemToggled(itemId, newIsActive)`: Update toggle switch
- `OnChecklistItemReordered(items[])`: Refresh entire table with new order
- `OnChecklistItemDeleted(itemId)`: Remove row from table

**UI Update Logic (React):**
- Maintain checklist state: `const [items, setItems] = useState<ChecklistItemDto[]>([])`
- On SignalR message received:
  - For EditedDomainEvent: Find item by ID, update description
  - For ToggleEventEvent: Find item by ID, toggle IsActive
  - For ReorderedDomainEvent: Replace entire items array
  - For DeletedDomainEvent: Filter out deleted item
  - Trigger re-render automatically

**Propagation Latency Target:** < 1 second from command completion to UI update across all connected clients

**Failure Mode:**
- If real-time subscription fails (network issue, hub disconnect), UI shows "Sync failed" banner
- Offer manual refresh button: "Click to sync latest changes"
- Resume auto-sync when connection restored

**Scalability:**
- RabbitMQ handles message durability and delivery guarantees
- Multiple SignalR hubs can scale horizontally (sticky sessions not required for this use case)
- TenantId-based grouping isolates messages per tenant (multi-tenant isolation)

---

## Conflicts & Resolution

### Conflict 1: ConcurrentEditConflict

**Title:** Concurrent Edit by Multiple Administrators

**Type:** concurrent-write  
**Blocking Severity:** high  
**Status:** Partially mitigated (last-write-wins with notification recommendation)

**Description:**
Two Bank Admins simultaneously edit the same ChecklistItem description.

**Scenario:**
1. Admin A opens edit dialog for Item 5, loads current description "Verify Document Authenticity"
2. Admin B opens edit dialog for Item 5, loads same description "Verify Document Authenticity"
3. Admin A submits edit: "Admin A's updated description" (succeeds)
4. Admin B submits edit: "Admin B's updated description" (overwrites Admin A's change)
5. Result: Admin A's edit is silently lost; Admin B's version persists

**Current Resolution:** Last-write-wins (implicit in EF Core default behavior)

**Problem Statement:**
- Admin A's edit is silently lost without notification
- No indication that concurrent change occurred
- Potential data loss risk in fast-paced environments

**Possible Mitigations:**

**Option 1: Optimistic Locking (Recommended)**
- Add `ConcurrencyStamp` field to ChecklistItem entity
- EF Core ConcurrencyToken configuration
- On save attempt, compare ConcurrencyStamp; if mismatch, throw `ConcurrencyException`
- Catch exception in AppService; return error: "Item was modified by another user; please refresh and try again"
- UI displays error toast; dialog remains open with text preserved

**Option 2: Last-Write-Wins with Audit Trail (Current)**
- No optimistic lock; last edit persists silently
- Log edit event to audit table with timestamp and user ID
- Compliance can review audit trail if needed
- Accept data loss risk as acceptable trade-off for simplicity

**Option 3: Pessimistic Locking (Not Recommended)**
- Lock item during edit; prevent other edits until first completes
- Simpler conceptually but blocks other admins; poor UX
- Not recommended for this use case

**Decision:** TBD via architecture review
- **Default Implementation:** Option 2 (last-write-wins, no optimistic lock)
- **Recommended Path Forward:** Upgrade to Option 1 (optimistic locking) if users report data loss concerns

---

### Conflict 2: ConcurrentDeleteConflict

**Title:** Item Deleted by Another Administrator During Edit

**Type:** concurrent-delete  
**Blocking Severity:** high  
**Status:** RESOLVED

**Description:**
Admin A is editing Item 5; Admin B deletes Item 5 before Admin A submits.

**Scenario:**
1. Admin A: Load Item 5, open edit dialog
2. Admin B: Delete Item 5 (soft delete, IsDeleted = true)
3. Admin A: Submit edit for Item 5 (attempt to save changes)

**Resolution:** EditChecklistItemCommand detects deletion gracefully

**Behavior:**
1. EditChecklistItemCommand loads item by ItemId
2. Check: if item not found or IsDeleted = true, raise EntityNotFoundException
3. Error raised: "Item no longer exists. Please refresh and try again."
4. AppService catches exception; returns error response
5. UI displays error toast; dialog remains open with entered text preserved (no data loss for user)
6. User can copy text, close dialog, refresh page, and re-create item if needed

**Idempotency:** Deleting an already-deleted item succeeds without error (idempotent delete)

**Status:** RESOLVED — Error detection + user notification handles gracefully without data loss

**User Experience:**
- Clear error message: "Item no longer exists"
- Text entered in dialog preserved (can copy to clipboard)
- User can refresh to see current state
- No silent failures or data corruption

---

## Permissions Map

| Actor | Operation | Command/Query | Permission | Notes |
|-------|-----------|---------------|-----------|-------|
| Bank Admin | View checklist items | GetChecklistItems | TradeFinancePermissions.BankSettings.ViewChecklistItems | Retrieve paged list for configuration |
| Bank Admin | View single item | GetChecklistItem | TradeFinancePermissions.BankSettings.ViewChecklistItems | Load item for edit dialog |
| Bank Admin | Create item | CreateChecklistItem | TradeFinancePermissions.BankSettings.ManageChecklistItems | Add new verification checkpoint |
| Bank Admin | Edit item | EditChecklistItem | TradeFinancePermissions.BankSettings.ManageChecklistItems | Update description |
| Bank Admin | Toggle status | ToggleChecklistItemStatus | TradeFinancePermissions.BankSettings.ManageChecklistItems | Activate/deactivate |
| Bank Admin | Reorder items | ReorderChecklistItem | TradeFinancePermissions.BankSettings.ManageChecklistItems | Move up/down |
| Bank Admin | Delete item | DeleteChecklistItem | TradeFinancePermissions.BankSettings.ManageChecklistItems | Remove from configuration |
| Branch/CTF Staff | View active items for LC review | GetChecklistItems (IsActiveFilter=true) | TradeFinancePermissions.LCIssuance.PerformLCReview | Retrieve only active items (future integration) |

**Permission Hierarchy:**
- ViewChecklistItems: Subset of ManageChecklistItems (read-only)
- ManageChecklistItems: Superset of ViewChecklistItems (read + write)

**Enforcement:**
- All commands decorated with `[Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]`
- All queries decorated with `[Authorize(TradeFinancePermissions.BankSettings.ViewChecklistItems)]`
- AppService methods check user has required permission; throw UnauthorizedAccessException if not

---

## ABP Artifact Map

Complete 6-layer artifact breakdown for BankSettings LC Issuance Checklist module.

### Layer 1: Domain Layer

**Namespace:** `Amnil.TradeFinance.Domain.BankSettings`

**Files:**
- `ChecklistItem.cs` — Aggregate root entity
- `ChecklistItemCreatedDomainEvent.cs`
- `ChecklistItemEditedDomainEvent.cs`
- `ChecklistItemStatusToggledDomainEvent.cs`
- `ChecklistItemReorderedDomainEvent.cs`
- `ChecklistItemDeletedDomainEvent.cs`
- `IChecklistItemRepository.cs` — Repository interface
- `ChecklistItemDomainService.cs` — Domain service for resequencing logic

**Key Entities:**
- `ChecklistItem(Guid id)`: FullAuditedAggregateRoot<Guid>, IMultiTenant
  - Methods: UpdateDescription(), ToggleStatus(), MarkDeleted()
  - Events: Raised in domain methods
  - Repository: IChecklistItemRepository

**Domain Services:**
- `ChecklistItemDomainService`: Coordinates resequencing after delete/reorder
  - Method: ResequenceItemsAfterDelete(deletedSeqNum)
  - Method: SwapSequenceNumbers(item1Id, item2Id)

---

### Layer 2: Application Contracts Layer

**Namespace:** `Amnil.TradeFinance.Application.Contracts.BankSettings`

**Command DTOs:**
- `CreateChecklistItemCommandInputDto`: { Description }
- `CreateChecklistItemCommandOutputDto`: { ItemId, SequenceNumber, Description, IsActive, CreatedAt }
- `EditChecklistItemCommandInputDto`: { ItemId, Description }
- `EditChecklistItemCommandOutputDto`: { ItemId, Description, SequenceNumber, IsActive, LastModifiedAt }
- `ToggleChecklistItemStatusCommandInputDto`: { ItemId }
- `ToggleChecklistItemStatusCommandOutputDto`: { ItemId, IsActive, LastModifiedAt }
- `ReorderChecklistItemCommandInputDto`: { ItemId, Direction: enum("Up"|"Down") }
- `ReorderChecklistItemCommandOutputDto`: { Items: ChecklistItemDto[], MovedItemId, NewSequenceNumber }
- `DeleteChecklistItemCommandInputDto`: { ItemId }
- `DeleteChecklistItemCommandOutputDto`: { ItemId, DeletedAt, Message }

**Query DTOs:**
- `GetChecklistItemsQueryInputDto`: extends PagedAndSortedResultRequestDto; plus IsActiveFilter: bool?
- `GetChecklistItemQueryInputDto`: { ItemId }
- `ChecklistItemDto`: { Id, SequenceNumber, Description, IsActive, CreatedAt, CreatedBy, LastModifiedAt?, LastModifiedBy? }

**AppService Interface:**
- `IChecklistAppService`:
  - Task<CreateChecklistItemCommandOutputDto> CreateChecklistItemAsync(CreateChecklistItemCommandInputDto input)
  - Task<EditChecklistItemCommandOutputDto> EditChecklistItemAsync(EditChecklistItemCommandInputDto input)
  - Task<ToggleChecklistItemStatusCommandOutputDto> ToggleChecklistItemStatusAsync(ToggleChecklistItemStatusCommandInputDto input)
  - Task<ReorderChecklistItemCommandOutputDto> ReorderChecklistItemAsync(ReorderChecklistItemCommandInputDto input)
  - Task<DeleteChecklistItemCommandOutputDto> DeleteChecklistItemAsync(DeleteChecklistItemCommandInputDto input)
  - Task<PagedResultDto<ChecklistItemDto>> GetChecklistItemsAsync(GetChecklistItemsQueryInputDto input)
  - Task<ChecklistItemDto> GetChecklistItemAsync(GetChecklistItemQueryInputDto input)

---

### Layer 3: Application Service Layer

**Namespace:** `Amnil.TradeFinance.Application.BankSettings`

**AppService Implementation:**
- `BankSettingsChecklistAppService : CrudAppService<ChecklistItem, ChecklistItemDto, Guid, ...>, IChecklistAppService`
  - Methods implement all IChecklistAppService operations
  - Validation via FluentValidation validators
  - Mapping via Mapperly mappers
  - All methods decorated with [Authorize(TradeFinancePermissions.BankSettings.*)]

**Validators:**
- `CreateChecklistItemCommandInputValidator: AbstractValidator<CreateChecklistItemCommandInputDto>`
  - RuleFor(x => x.Description).NotEmpty().NotWhitespace().MaximumLength(500)
- `EditChecklistItemCommandInputValidator: AbstractValidator<EditChecklistItemCommandInputDto>`
  - RuleFor(x => x.ItemId).NotEqual(Guid.Empty)
  - RuleFor(x => x.Description).NotEmpty().NotWhitespace().MaximumLength(500)
- `ToggleChecklistItemStatusCommandInputValidator`
- `ReorderChecklistItemCommandInputValidator`
- `DeleteChecklistItemCommandInputValidator`

**Mappers (Mapperly):**
- `ChecklistItemMapper`:
  - CreateChecklistItemCommandInputDto → ChecklistItem
  - EditChecklistItemCommandInputDto → ChecklistItem
  - ChecklistItem → ChecklistItemDto
  - PagedResult<ChecklistItem> → PagedResultDto<ChecklistItemDto>

**Event Handlers:**
- `ChecklistItemCreatedDomainEventHandler`: Subscribe to ChecklistItemCreatedDomainEvent
  - Publish to RabbitMQ for real-time sync
  - Log to audit table
- `ChecklistItemEditedDomainEventHandler`: Similar
- `ChecklistItemDeletedDomainEventHandler`: Similar
- Similar handlers for StatusToggled and Reordered events

---

### Layer 4: EntityFrameworkCore Layer

**Namespace:** `Amnil.TradeFinance.EntityFrameworkCore.BankSettings`

**DbContext Integration:**
- `TradeFinanceDbContext: DbContext`
  - DbSet<ChecklistItem> ChecklistItems { get; set; }
  - OnModelCreating(): Configure entity mappings via ChecklistItemConfiguration

**Entity Configuration:**
- `ChecklistItemConfiguration: IEntityTypeConfiguration<ChecklistItem>`
  - Table: "AppChecklistItem" (prefix "App" per CLAUDE.md)
  - Primary Key: Id (Guid)
  - TenantId: Required, indexed
  - Description: nvarchar(500), required
  - SequenceNumber: int, required
  - IsActive: bit (bool), default true
  - CreatedBy, CreatedAt, LastModifiedBy, LastModifiedAt, IsDeleted: ABP standard
  - Indexes:
    - (TenantId, SequenceNumber) — for ordering
    - (TenantId, IsActive) — for active filter in LC review
    - (TenantId, CreatedAt DESC) — for recent items
  - Unique constraint: (TenantId, SequenceNumber)
  - Soft-delete filter: .HasQueryFilter(x => !x.IsDeleted)
  - Property mappings: Value object conversion if needed (e.g., Description trimming)

**Repository Implementation:**
- `ChecklistItemRepository: EfCoreRepository<TradeFinanceDbContext, ChecklistItem, Guid>, IChecklistItemRepository`
  - Method: GetListAsync(GetChecklistItemsQueryInputDto input) → PagedResultDto<ChecklistItem>
    - Filter by TenantId, IsDeleted
    - Apply IsActiveFilter if provided
    - Sort via explicit switch
    - Paginate
    - Execute and return PagedResult
  - Method: GetCountByStatusAsync(string status) → int
    - Count where TenantId == currentTenant and IsActive == (status == "active") and IsDeleted == false
  - Method: GetMaxSequenceNumberAsync() → int
    - Return max SequenceNumber for current tenant, or 0 if empty
  - Method: ResequenceAsync(int deletedSeqNum, CancellationToken cancellationToken)
    - Decrement SequenceNumber for all items with SequenceNumber > deletedSeqNum
    - Execute in transaction

---

### Layer 5: HttpApi Layer

**Namespace:** `Amnil.TradeFinance.HttpApi.Controllers`

**Controller:**
- `BankSettingsChecklistController: AbpController`
  - Inject: IChecklistAppService
  - Route base: `/api/private/app/bank-settings/checklist-items`
  - Authorization: All methods check permissions via [Authorize()] attributes

**Endpoint Definitions:**

1. **GET /api/private/app/bank-settings/checklist-items**
   - Handler: GetChecklistItemsAsync(GetChecklistItemsQueryInputDto input)
   - Authorization: ViewChecklistItems
   - Returns: 200 OK, PagedResultDto<ChecklistItemDto>

2. **GET /api/private/app/bank-settings/checklist-items/{id}**
   - Handler: GetChecklistItemAsync(Guid id)
   - Authorization: ViewChecklistItems
   - Returns: 200 OK, ChecklistItemDto

3. **POST /api/private/app/bank-settings/checklist-items**
   - Handler: CreateChecklistItemAsync(CreateChecklistItemCommandInputDto input)
   - Authorization: ManageChecklistItems
   - Returns: 201 Created, CreateChecklistItemCommandOutputDto

4. **PUT /api/private/app/bank-settings/checklist-items/{id}**
   - Handler: EditChecklistItemAsync(Guid id, EditChecklistItemCommandInputDto input)
   - Authorization: ManageChecklistItems
   - Returns: 200 OK, EditChecklistItemCommandOutputDto

5. **PATCH /api/private/app/bank-settings/checklist-items/{id}/status**
   - Handler: ToggleChecklistItemStatusAsync(Guid id, ToggleChecklistItemStatusCommandInputDto input)
   - Authorization: ManageChecklistItems
   - Returns: 200 OK, ToggleChecklistItemStatusCommandOutputDto

6. **PATCH /api/private/app/bank-settings/checklist-items/{id}/reorder**
   - Handler: ReorderChecklistItemAsync(Guid id, ReorderChecklistItemCommandInputDto input)
   - Authorization: ManageChecklistItems
   - Returns: 200 OK, ReorderChecklistItemCommandOutputDto

7. **DELETE /api/private/app/bank-settings/checklist-items/{id}**
   - Handler: DeleteChecklistItemAsync(Guid id)
   - Authorization: ManageChecklistItems
   - Returns: 204 No Content or 200 OK, DeleteChecklistItemCommandOutputDto

**Error Handling:**
- 400 BadRequest: Validation errors, malformed request
- 401 Unauthorized: Missing authentication
- 403 Forbidden: Insufficient permissions
- 404 NotFound: Item not found or deleted
- 409 Conflict: Concurrent modification (future optimistic lock)
- 500 InternalServerError: Unhandled exceptions

**CORS & Security:**
- Inherit from ABP CORS configuration
- No special CORS rules for this module

---

### Layer 6: Module Startup & DI

**Namespace:** `Amnil.TradeFinance.Application.BankSettings`

**Module Class:**
- `BankSettingsModule : AbpModule`
  - Configure(): Register services
    - AddObjectMapper<BankSettingsApplicationAutoMapperProfile>() — Mapperly profile
    - AddFluentValidation() — Register validators
    - AddTransient<IChecklistAppService, BankSettingsChecklistAppService>()
    - AddScoped<IChecklistItemRepository, ChecklistItemRepository>()
    - AddDomainService<ChecklistItemDomainService>()
    - Configure<AbpHttpApiOptions>() — Register HttpApi module

**Event Subscriptions:**
- OnApplicationInitialization():
  - Subscribe to domain events via event bus
  - Register event handlers for real-time sync
  - Example: `context.Services.ExecutePreConfiguredActions()` (ABP's generic event registration)

**AutoMapper/Mapperly Profile:**
- `BankSettingsApplicationAutoMapperProfile : Profile`
  - CreateMap<ChecklistItem, ChecklistItemDto>()
  - CreateMap<CreateChecklistItemCommandInputDto, ChecklistItem>()
  - CreateMap<EditChecklistItemCommandInputDto, ChecklistItem>()
  - etc.

**Validator Registration:**
- FluentValidation auto-discovers validators in assembly
- Validators inherit from AbstractValidator<T>
- Automatically registered and injected into AppService

---

## Summary & Commit Message

### Node Count

- **Entity:** 1 (ChecklistItem)
- **Value Objects:** 3 (ChecklistItemDescription, ChecklistItemSequence, ChecklistItemStatus)
- **Commands:** 5 (Create, Edit, Toggle, Reorder, Delete)
- **Queries:** 3 (GetChecklistItems, GetChecklistItem, CountActiveItems)
- **States:** 2 (ChecklistItemStatus enum, ChecklistItemLifecycle state machine)
- **Decisions:** 4 (ItemValidationRules, ImmutabilityRules, BoundaryConditionRules, ConcurrentUpdateHandling)
- **Architecture Blueprints:** 2 (LargeDatasetHandling, RealTimeDataSynchronization)
- **Conflicts:** 2 (ConcurrentEditConflict, ConcurrentDeleteConflict)
- **Total DDD Nodes:** 22

### Key Design Characteristics

**All Commands/Queries:**
- Audience: Private (`/api/private/app/bank-settings/checklist-items`)
- Authorization: TradeFinancePermissions.BankSettings.* (ViewChecklistItems, ManageChecklistItems)
- Tenancy: IMultiTenant implicit on all operations
- Validation: FluentValidation per command input DTO
- Mapping: Mapperly for all DTO conversions

**Sorting Strategy:**
- Explicit switch statement (no System.Linq.Dynamic.Core)
- Supported fields: SequenceNumber, IsActive, CreatedAt
- Default: SequenceNumber ASC (natural order)

**Soft Delete:**
- ChecklistItem uses FullAuditedAggregateRoot (inherits IsDeleted, DeletionTime, DeleterUserId)
- All queries filter IsDeleted = false implicitly

**Concurrency Handling:**
- Current: Last-write-wins (no optimistic lock)
- Future: Consider ConcurrencyStamp for critical operations
- Delete conflict: Resolved gracefully with error message

**Database:**
- Table: AppChecklistItem (prefix "App" per CLAUDE.md)
- Indexes: (TenantId, SequenceNumber), (TenantId, IsActive)
- Unique constraint: (TenantId, SequenceNumber)

**Real-Time Synchronization:**
- Domain events published to RabbitMQ
- SignalR Hub pushes updates to connected clients
- Latency target: < 1 second

**Performance Targets:**
- Page load: < 2 seconds
- CRUD operations: < 500ms
- Pagination default: 20 per page, max 50

---

### Commit Message

```
feat(bank-settings-ddd): Synthesize 22 DDD/ABP nodes for LC Issuance Checklist module

Entities:
  - ChecklistItem (aggregate root, FullAuditedAggregateRoot<Guid>, IMultiTenant)
    Domains events: Created, Edited, Toggled, Reordered, Deleted

Value Objects:
  - ChecklistItemDescription (1-500 chars, non-empty, trimmed)
  - ChecklistItemSequence (int >= 1, auto-managed, unique per tenant)
  - ChecklistItemStatus (enum Active|Inactive, lowercase serialization)

Commands (5 total, all /api/private/app/bank-settings/checklist-items):
  - CreateChecklistItem: Add new verification checkpoint; assign next S.N; IsActive=true by default
  - EditChecklistItem: Update description only; preserve S.N, IsActive, position (immutable)
  - ToggleChecklistItemStatus: Invert IsActive; controls LC review visibility
  - ReorderChecklistItem: Swap with adjacent item (up/down); atomic SequenceNumber swap
  - DeleteChecklistItem: Soft delete; idempotent; resequence remaining items (renumber 1,2,3...)

Queries (3 total, paged + sorted):
  - GetChecklistItems: PagedAndSortedResultRequestDto; sort by SequenceNumber|IsActive|CreatedAt (explicit switch)
  - GetChecklistItem: Load single item by ID (for edit dialogs)
  - CountActiveItems: Summary count of active items

States:
  - ChecklistItemStatus: Active|Inactive (affects LC review visibility)
  - ChecklistItemLifecycle: Created → Active ↔ Inactive → Edited → Reordered → Deleted (soft delete)

Decisions:
  - ItemValidationRules: Non-empty description, max 500 chars, whitespace trimming
  - ImmutabilityRules: SequenceNumber/IsActive immutable during edit; preserve during reorder
  - BoundaryConditionRules: Up/down arrows disabled for first/last item
  - ConcurrentUpdateHandling: Last-write-wins (current); graceful delete conflict detection; error notifications

Architecture:
  - LargeDatasetHandling: Pagination (20/page, max 50); explicit sort; indexes on (TenantId, SequenceNumber)
  - RealTimeDataSynchronization: Domain events → RabbitMQ → SignalR Hub → UI update (<1s latency target)

Conflicts:
  - ConcurrentEditConflict: Last-write-wins (TBD optimistic lock with ConcurrencyStamp)
  - ConcurrentDeleteConflict: Resolved via "item no longer exists" error + notification

Permissions:
  - TradeFinancePermissions.BankSettings.ViewChecklistItems (read)
  - TradeFinancePermissions.BankSettings.ManageChecklistItems (read + write)

ABP Artifacts (6 layers):
  - Domain: ChecklistItem, IChecklistItemRepository, ChecklistItemDomainService, 5 domain events
  - Application Contracts: 10 DTOs (5 command pairs, 3 query pairs), IChecklistAppService interface
  - Application: BankSettingsChecklistAppService, 5 FluentValidation validators, Mapperly mappers, event handlers
  - EF Core: ChecklistItemConfiguration (AppChecklistItem table), ChecklistItemRepository (IQueryable filtering)
  - HttpApi: BankSettingsChecklistController (7 endpoints)
  - Module: BankSettingsModule (DI, event subscriptions, AutoMapper profile)

Database:
  - Table: AppChecklistItem (TenantId, SequenceNumber, Description, IsActive, soft-delete fields)
  - Indexes: (TenantId, SequenceNumber), (TenantId, IsActive)
  - Unique constraint: (TenantId, SequenceNumber)
  - Soft delete via IsDeleted (FullAuditedAggregateRoot)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## End of DDD Synthesis

**Document Version:** 1.0  
**Created:** 2026-04-28  
**Status:** Ready for implementation and architecture review

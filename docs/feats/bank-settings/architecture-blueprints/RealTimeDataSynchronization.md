---
id: architecture-blueprint-real-time-data-synchronization
name: RealTimeDataSynchronization
type: architecture-blueprint
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# RealTimeDataSynchronization

**Type:** Architecture pattern for multi-user synchronization

## Problem Statement

Multiple Bank Admins view/edit checklist simultaneously. Without synchronization:
- Changes made by User A not visible to User B until manual page refresh
- Data staleness / race condition visibility
- Poor collaborative experience

## Solution Approach

### Event-Driven Architecture

**Pattern:** Publish-Subscribe via Domain Events

**Flow:**
1. Command executes (e.g., EditChecklistItemCommand)
2. Domain event raised (ChecklistItemEditedDomainEvent)
3. Event published to message broker (RabbitMQ)
4. Event subscribers notified in real-time
5. UI updated via SignalR Hub

### Domain Events

**Events published:**

1. **ChecklistItemCreatedDomainEvent**
   - ItemId, TenantId, Description, SequenceNumber, CreatedAt

2. **ChecklistItemEditedDomainEvent**
   - ItemId, OldDescription, NewDescription, LastModifiedAt

3. **ChecklistItemStatusToggledDomainEvent**
   - ItemId, NewIsActive status, ToggledAt

4. **ChecklistItemReorderedDomainEvent**
   - ItemId, OldSequenceNumber, NewSequenceNumber

5. **ChecklistItemDeletedDomainEvent**
   - ItemId, DeletedSequenceNumber, DeletedAt

### Message Broker

**Technology:** RabbitMQ (per CLAUDE.md)

**Queue naming:**
- `amnil.trade-finance.bank-settings.checklist-items.created`
- `amnil.trade-finance.bank-settings.checklist-items.edited`
- `amnil.trade-finance.bank-settings.checklist-items.toggled`
- `amnil.trade-finance.bank-settings.checklist-items.reordered`
- `amnil.trade-finance.bank-settings.checklist-items.deleted`

**Publishing:** Domain event handler publishes to RabbitMQ on transaction commit

### SignalR Hub

**Technology:** SignalR (real-time WebSocket communication)

**Hub:** ChecklistSyncHub

**Methods:**
- `NotifyChecklistItemCreated(ItemId, Description, SequenceNumber)`
- `NotifyChecklistItemEdited(ItemId, NewDescription)`
- `NotifyChecklistItemStatusToggled(ItemId, IsActive)`
- `NotifyChecklistItemReordered(ItemId, NewSequenceNumber)`
- `NotifyChecklistItemDeleted(ItemId)`

**Connections:**
- Each connected client subscribes to hub group: `checklist-{tenantId}`
- Broadcast to group on event receipt

### UI Update Strategy

**on event:**
1. **Created:** Add new row to table; update pagination count; refresh UI
2. **Edited:** Update row description; preserve other fields
3. **Toggled:** Update row IsActive status
4. **Reordered:** Refresh table; re-render rows in new order
5. **Deleted:** Remove row from table; update pagination; show empty state if needed

**Latency target:** < 1 second from command completion to UI update

### Failure Modes

**Real-time subscription fails:**
- Show "Manual Refresh" button to user
- User clicks to fetch latest data via GetChecklistItemsQuery
- Fallback acceptable; not SLA-critical

**RabbitMQ down:**
- Commands still execute (event publishing delayed)
- UI updates stale
- Service recovers when RabbitMQ available (events resume)

### Event Contract (JSON)

```json
{
  "eventType": "ChecklistItemEdited",
  "tenantId": "<guid>",
  "itemId": "<guid>",
  "oldDescription": "Previous text",
  "newDescription": "Updated text",
  "timestamp": "2026-04-28T10:30:00Z",
  "userId": "<guid>"
}
```

### Implementation Checklist

- ✓ Domain events defined and raised in commands
- ✓ RabbitMQ event handler (publish to queues)
- TBD: SignalR Hub setup (ChecklistSyncHub)
- TBD: Hub method definitions
- TBD: UI subscription to hub
- TBD: UI update logic on event receipt

## Source

- [FRS #15 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/15#7-main-flow) (real-time subscription mentioned)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial architecture blueprint |

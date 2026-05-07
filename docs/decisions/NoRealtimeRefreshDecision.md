---
id: no-realtime-refresh-decision
name: NoRealtimeRefreshDecision
type: Decision
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Decision
**Title:** Use manual reload only for checklist list; no real-time auto-refresh
**Status:** Accepted

**Context:**
FRS BS-01 §22 and subsequent resolution by the product owner confirm that the LC Issuance Checklist management page in the backoffice UI should not automatically refresh after another BankAdmin makes a change. The question arose because checklist mutations (add, edit, toggle, reorder, delete) by one admin session do not push updates to other open sessions. Without auto-refresh, an admin viewing a stale list could attempt to reorder or delete an item that has already been moved or deleted by a concurrent session — a scenario handled by optimistic concurrency stamps rather than by live data synchronization.

**Decision:**
The checklist list page does not poll the API and does not subscribe to server-sent events or WebSocket notifications. After any successful mutating operation (create, update, toggle, reorder, delete) in the current session, the UI explicitly re-invokes [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/queries/ListChecklistItems) to reload the list. Other concurrent admin sessions that have not performed a mutation see the list as of their last load. The optimistic concurrency mechanism ([OptimisticConcurrencyStrategy](http://localhost:8080/root/trade-finance/-/wikis/decisions/OptimisticConcurrencyStrategy)) provides safety: stale-read mutations are rejected with HTTP 409 and the UI can prompt the user to reload and retry.

**Rationale:**
- Checklist management is a low-frequency, low-concurrency backoffice operation. Two BankAdmins editing the same checklist simultaneously is an edge case that does not justify the engineering cost of real-time push infrastructure.
- The optimistic concurrency strategy already handles concurrent mutation conflicts safely (HTTP 409 with reload prompt), which is a sufficient UX for this use case.
- No WebSocket or Server-Sent Event infrastructure exists in the current platform; adding it for a low-frequency admin screen would introduce an unbalanced infrastructure cost.
- Manual reload after own mutations is standard for ABP-based CRUD admin screens and aligns with the existing patterns in other Bank Settings modules.

**Rejected alternatives:**
- **Polling (periodic auto-refresh every N seconds):** rejected because it generates continuous unnecessary API traffic for a screen that may sit open for extended periods. It also causes disruptive list re-renders while an admin is reviewing item details.
- **WebSocket / Server-Sent Events for push refresh:** rejected because no such infrastructure is present in the platform stack and the use case does not justify adding it. The complexity vs. value ratio is extremely unfavorable for a low-frequency admin CRUD screen.

**Consequences:**
- **Positive:** Zero infrastructure overhead for real-time sync.
- **Positive:** Consistent with existing ABP admin screen patterns in the project.
- **Positive:** Optimistic concurrency (HTTP 409 + reload prompt) provides an adequate safety net for the rare concurrent mutation scenario.
- **Negative:** An admin viewing a stale list may see outdated sequence numbers or statuses if another admin makes changes in a different session; they must manually reload to see the current state.
- **Negative:** After a failed mutation due to concurrency conflict, the admin must reload and re-apply their change, which is a minor UX friction for an already-rare scenario.

**Revisit if:** Product introduces a requirement for real-time collaboration (e.g., multiple BankAdmins editing the checklist simultaneously with visible updates), which would justify a SignalR hub or SSE endpoint.

**Source:**
- [FRS BS-01 — Non-functional requirements](http://localhost:8080/root/trade-finance/-/issues/15#22-non-functional)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.

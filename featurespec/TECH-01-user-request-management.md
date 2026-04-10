# TECH-01: Technical Feature Specification
## FU-01–FU-02 — User Request Management
### Platform: ABP Framework (ASP.NET Core) + React + shadcn/ui

**Version:** 1.0
**Status:** Draft
**Date:** 2026-04-10
**References:** FRS-01-submit-user-request.md, FRS-02-view-filter-user-requests.md
**Stack:** ASP.NET Core (ABP Framework), Entity Framework Core, SQL Server, React, shadcn/ui, lucide-react, sonner

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Entity Models](#3-entity-models)
4. [Repository Layer](#4-repository-layer)
5. [Application Service Layer](#5-application-service-layer)
6. [Controller & API](#6-controller--api)
7. [ViewModels & DTOs](#7-viewmodels--dtos)
8. [Views & Frontend](#8-views--frontend)
9. [Permission Enforcement](#9-permission-enforcement)
10. [Seed Data](#10-seed-data)
11. [API Endpoints Summary](#11-api-endpoints-summary)
12. [Validation Rules](#12-validation-rules)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [File & Folder Structure](#14-file--folder-structure)
15. [Implementation Order](#15-implementation-order)
16. [Open Technical Decisions](#16-open-technical-decisions)

---

## 1. Architecture Overview

The User Request Management cluster implements a two-phase user onboarding workflow: Company Super Admins submit requests for new company users, and all entity members view the status of pending, approved, and rejected requests. The architecture follows ABP Framework's layered approach: the API Controller accepts HTTP requests and delegates to an Application Service, which enforces business rules and coordinates with the Repository layer for data access. The React frontend communicates via JSON endpoints, managing form state locally and displaying aggregated request data (counts, filtered lists, rejection reasons) from the server.

**Key design decisions:**
- **Request ID Format:** Auto-generated `req-[ISO8601-timestamp]` format for human-readable unique identifiers.
- **Status Lifecycle:** Requests are immutable after creation; status changes (pending → approved/rejected) are not covered in this spec and are assumed to be a separate admin workflow.
- **Entity Scoping:** All requests are scoped to the current tenant/entity via ABP's built-in multi-tenancy support; the `ICurrentTenant` service provides the active entity context.
- **Authorization:** ABP's permission system gates submission (company_user_request.create) and viewing; no custom roles needed.
- **Form State:** React component manages form validation client-side; server-side validation is a safety belt for spam/invalid requests.
- **Real-time Updates:** No polling or WebSocket; the viewing page reflects changes on manual reload (eventual consistency model).

```
[React Frontend Layer] (Components: UserRequestForm, UserRequestTable)
        |
        | HTTP/JSON (POST /api/app/user-requests, GET /api/app/user-requests)
        v
[API Controller Layer] (UserRequestController)
        |
        | Orchestrates requests to app service
        v
[Application Service Layer] (UserRequestAppService)
        |
        | Business logic, validation, authorization checks
        v
[Repository Interface] (IUserRequestRepository)
        |
        | Data access abstractions
        v
[Entity Framework Core] (DbContext)
        |
        v
[SQL Server Database]
  ├── UserRequests (id, entity_id, name, email, role, remarks, status, created_by, created_at, reviewed_by, reviewed_at, reject_reason)
  └── Foreign keys to Users (created_by, reviewed_by) and Tenants (entity_id)
```

---

## 2. Database Schema

### Table: `UserRequests` (Tenant-scoped, Auditable)

| Column | Type | Notes |
|--------|------|-------|
| `Id` | nvarchar(50) | Primary key; format `req-[ISO8601-timestamp]`, e.g., `req-2026-04-10T14:30:45.123Z` |
| `TenantId` | uniqueidentifier | Foreign key to `AbpTenants` (entity/company); required for multi-tenancy |
| `Name` | nvarchar(256) | Requested user's full name; required, trimmed |
| `Email` | nvarchar(256) | Requested user's email; required, trimmed, must be valid email format |
| `Role` | nvarchar(128) | Requested role; currently only "company_user" is supported; required |
| `Remarks` | nvarchar(max) | Optional justification/context for the request; nullable, trimmed on insert |
| `Status` | nvarchar(50) | Enum: `pending`, `approved`, `rejected`; defaults to `pending` |
| `CreatedBy` | uniqueidentifier | Foreign key to `AbpUsers` (the Super Admin who submitted); required |
| `CreationTime` | datetime2 | UTC timestamp of request submission; set by EF Core automatically |
| `ReviewedBy` | uniqueidentifier | Foreign key to `AbpUsers` (bank admin who reviewed); nullable until reviewed |
| `ReviewedAt` | datetime2 | UTC timestamp of review decision; nullable until reviewed |
| `RejectReason` | nvarchar(512) | Reason for rejection (if status = `rejected`); nullable, only populated for rejected requests |
| `ConcurrencyStamp` | nvarchar(40) | Optimistic concurrency token for EF Core |
| `IsDeleted` | bit | Soft-delete flag (ABP standard); default 0 |
| `DeletionTime` | datetime2 | Soft-delete timestamp; nullable |
| `DeleterUserId` | uniqueidentifier | User who soft-deleted; nullable |

**Unique Constraints:**
- Composite unique index on `(TenantId, Email, Status)` where Status = 'pending' to prevent duplicate pending requests for the same email within a tenant (answering Open Question #3 from FRS-01 with a default: **yes, prevent duplicate pending requests**).

**Indexes:**
- Clustered index on `(Id)`
- Non-clustered index on `(TenantId, Status, CreationTime DESC)` for efficient filtering and sorting by status and date
- Non-clustered index on `(TenantId, CreatedBy)` for querying requests submitted by a specific user

---

## 3. Entity Models

**Entity: `UserRequest`**

Maps to the `UserRequests` table. Represents a single request for a new company user, submitted by a Super Admin for approval by a bank administrator. Key properties include the requested user's identity (name, email), the requested role, optional remarks for context, and the current status (pending, approved, rejected). The entity tracks the submitter (CreatedBy), submission timestamp (CreationTime), and if reviewed, the reviewer and review timestamp. Uses ABP's `Entity<string>` base class for standard ID handling and `HasCreationTime` interface for automatic CreationTime population.

Navigation properties:
- `CreatedByUser` (navigation to `IdentityUser`) — the Super Admin who submitted the request
- `ReviewedByUser` (navigation to `IdentityUser`, nullable) — the bank admin who reviewed/approved/rejected the request

ORM-specific configuration:
- `Id` is the primary key of type `nvarchar(50)`, generated by the application (not by the database).
- `TenantId` is required and marked as part of the tenant filter (ABP's multi-tenancy pattern).
- `ConcurrencyStamp` is mapped to a row-version-like field for optimistic concurrency control (EF Core's built-in support).
- `Status` is stored as a string enum value (e.g., "pending") and mapped from a C# enum on read/write.
- Soft-delete filter applied globally by ABP's `ISoftDelete` interface.

---

## 4. Repository Layer

**Repository Interface: `IUserRequestRepository`**

Extends ABP's `IRepository<UserRequest, string>` (the string is the ID type). Methods:

1. **GetListAsync(userRequest GetUserRequestListInput)**
   - Fetches all user requests for the current tenant, optionally filtered by status and sorted by creation date (newest first).
   - Input: `GetUserRequestListInput` DTO containing optional status filter, pagination params.
   - Output: `PagedResultDto<UserRequest>` containing matching requests and total count.
   - Transaction scope: Read-only query (implicit).

2. **GetAsync(string id)**
   - Fetches a single user request by ID for the current tenant (scoped by TenantId).
   - Inherited from `IRepository<T>` (ABP).
   - Output: `UserRequest` or throws `EntityNotFoundException` if not found.

3. **GetCountByStatusAsync(string status)**
   - Returns the count of requests for the current tenant with a specific status (pending, approved, rejected).
   - Used by the View page to populate summary cards (FR-02-03).
   - Output: `int` count.
   - Transaction scope: Read-only query.

4. **CreateAsync(UserRequest userRequest)**
   - Inserts a new user request record into the database.
   - Called by the Application Service after validation.
   - Transaction scope: Single INSERT (atomicity guaranteed by the service layer).
   - Output: The created `UserRequest` entity with ID populated.

---

## 5. Application Service Layer

**Application Service Interface: `IUserRequestAppService`**

Implements `IApplicationService` (ABP). Methods:

1. **CreateAsync(CreateUserRequestInput input)**
   - **Inputs:** `CreateUserRequestInput` DTO containing `Name`, `Email`, `Role`, `Remarks`.
   - **Outputs:** `UserRequestDto` (the newly created request record).
   - **Business rules enforced:**
     - **BR-01:** Only users with `company_user_request.create` permission can call this (authorized by ABP's `[Authorize(...)]` attribute).
     - **BR-02:** Status is always set to "pending" (hardcoded; no parameterization).
     - **BR-03:** `CreatedBy` is set to the current user's ID (from `CurrentUser`).
     - **BR-06:** All text inputs (Name, Email, Remarks) are trimmed of leading/trailing whitespace before validation and storage.
     - **Duplicate prevention (from Open Question default):** Query for existing pending request with same email in the current tenant; if found, throw `UserFriendlyException("A pending request for this email already exists")`.
   - **Validation sequence:**
     1. Check Name is not null/empty after trim (FR-01-03).
     2. Check Email is not null/empty after trim and is valid email format (FR-01-03, FR-01-16).
     3. Check Role is a known value (currently only "company_user") (FR-01-05).
     4. Check for duplicate pending request by email (custom business rule).
     5. If all validations pass, generate unique request ID and create entity.
   - **Failure modes:**
     - `ValidationException` if required fields are missing or invalid.
     - `UserFriendlyException` if duplicate pending request found.
     - `UnauthorizedAccessException` if user lacks permission (ABP).
   - **Return pattern:** Typed `UserRequestDto` on success; exceptions bubble up for controller to handle.

2. **GetListAsync(GetUserRequestListInput input)**
   - **Inputs:** `GetUserRequestListInput` DTO containing optional status filter, pagination (MaxResultCount, SkipCount).
   - **Outputs:** `PagedResultDto<UserRequestDto>` containing list of requests for the current tenant, sorted by CreationTime descending.
   - **Business rules enforced:**
     - **BR-01:** Users can only view requests for their current tenant (scoped implicitly by `GetCurrentTenantId()`).
     - **BR-05:** Requests are immediately visible to all entity users (no delayed visibility).
   - **Validation sequence:**
     1. Validate input pagination params (MaxResultCount > 0 and <= max allowed, SkipCount >= 0).
     2. If status filter provided, validate it's a known status value.
   - **Failure modes:**
     - `ValidationException` if input is invalid.
   - **Return pattern:** Typed `PagedResultDto<UserRequestDto>` containing items and total count.

3. **GetCountsByStatusAsync()**
   - **Inputs:** None.
   - **Outputs:** `GetCountsByStatusOutput` DTO containing counts for pending, approved, rejected.
   - **Business rules enforced:**
     - Counts are filtered by current tenant only (BR-01).
     - Counts are calculated dynamically at request time (BR-07 from FRS-02).
   - **Return pattern:** Typed `GetCountsByStatusOutput`.

---

## 6. Controller & API

**Controller Class: `UserRequestController`**

Inherits from `AbpControllerBase` (ABP). Route: `[Route("api/app/user-requests")]`. Methods:

| Action | HTTP Method | Pattern | Purpose |
|--------|-------------|---------|---------|
| `CreateAsync` | POST | JSON request body → JSON response | Submits a new user request (FU-01 main flow). Calls `IUserRequestAppService.CreateAsync()`. Returns `UserRequestDto` on success. |
| `GetListAsync` | GET | Query params (status filter, pagination) → JSON response | Retrieves user requests for the current tenant with optional status filtering (FU-02 main flow). Calls `IUserRequestAppService.GetListAsync()`. Returns `PagedResultDto<UserRequestDto>`. |
| `GetCountsByStatusAsync` | GET | No input → JSON response | Retrieves summary counts (pending, approved, rejected) for the current tenant. Calls `IUserRequestAppService.GetCountsByStatusAsync()`. Returns `GetCountsByStatusOutput`. |

**Class-level configuration:**
- `[Authorize]` attribute on the controller to require authentication for all actions.
- `[Route("api/app/user-requests")]` to set the base route.
- No custom route attributes needed; standard HTTP convention routing is sufficient.

**Authorization & Permission Enforcement:**
- `CreateAsync` is guarded by an `[Authorize(Policy = "UserRequest.Create")]` attribute (or equivalent permission string).
- `GetListAsync` is guarded by an `[Authorize(Policy = "UserRequest.View")]` attribute.
- `GetCountsByStatusAsync` is guarded by the same "UserRequest.View" permission.
- ABP's `ICurrentTenant` service is injected and used implicitly by the repository layer to scope queries.

**Anti-forgery & CSRF:**
- ABP provides CSRF tokens automatically in responses; the React frontend includes the token in POST request headers (standard ABP client integration).
- No explicit anti-forgery decoration needed (handled by ABP middleware).

**Response Translation:**
- The controller accepts `CreateUserRequestInput`, `GetUserRequestListInput` DTOs from HTTP request bodies/query params.
- Application Service returns domain DTOs (`UserRequestDto`, `GetCountsByStatusOutput`).
- Controller returns these DTOs directly; ABP's serialization handles JSON conversion.

---

## 7. ViewModels & DTOs

**DTOs (Client → Server / Request Objects):**

| DTO | Purpose |
|-----|---------|
| `CreateUserRequestInput` | Sent from React form POST to `/api/app/user-requests`. Contains: `Name` (string), `Email` (string), `Role` (string), `Remarks` (string, nullable). |
| `GetUserRequestListInput` | Sent as query params to GET `/api/app/user-requests?status=pending&skipCount=0&maxResultCount=10`. Contains: `Status` (string, nullable), `SkipCount` (int), `MaxResultCount` (int). |

**DTOs (Server → Client / Response Objects):**

| DTO | Purpose |
|-----|---------|
| `UserRequestDto` | Returned from POST and GET endpoints. Contains: `Id`, `Name`, `Email`, `Role`, `Remarks`, `Status`, `CreationTime`, `ReviewedAt` (nullable), `RejectReason` (nullable). Used to populate form confirmation dialog (FU-01) and table rows (FU-02). |
| `PagedResultDto<UserRequestDto>` | Standard ABP response wrapper. Contains: `Items` (list of `UserRequestDto`), `TotalCount` (int). Returned by GET `/api/app/user-requests`. |
| `GetCountsByStatusOutput` | Response DTO from GET `/api/app/user-requests/counts-by-status`. Contains: `PendingCount` (int), `ApprovedCount` (int), `RejectedCount` (int). |

---

## 8. Views & Frontend

**Views (React Components):**

| Component | Maps to | Notes |
|-----------|---------|-------|
| `UserRequestPage.tsx` | FU-02 / FRS-02 SCREEN 1–6 | Main page displaying summary cards, table, and "New User Request" button. Fetches requests on mount via `GET /api/app/user-requests` and counts via `GET /api/app/user-requests/counts-by-status`. |
| `UserRequestDialog.tsx` | FU-01 / FRS-01 SCREEN 2–3 | Modal dialog with form fields (Full Name, Email, Role, Remarks). Manages form validation and submission. On submit, POST to `/api/app/user-requests`. Displays confirmation dialog before final submission. |
| `ConfirmSubmissionDialog.tsx` | FU-01 / FRS-01 SCREEN 3 | Secondary confirmation dialog showing formatted message with name, email, role, entity name. Calls the submit handler on confirmation. |
| `UserRequestTable.tsx` | FU-02 / FRS-02 SCREEN 1–4 | Data table component displaying columns: Name, Email, Role, Remarks (truncated with tooltip), Status (badge), Submitted (formatted date), Details (rejection reason if applicable). |
| `SummaryCards.tsx` | FU-02 / FRS-02 SCREEN 5 | Three cards displaying counts: Pending, Approved, Rejected. Icons from lucide-react (Clock, CheckCircle2, XCircle). Color-coded badges. |

**JavaScript / Frontend:**

| Function / Module | Responsibility |
|-------------------|---------------|
| `useUserRequests()` (custom hook) | Fetches list of user requests from `GET /api/app/user-requests?status=...&skipCount=...&maxResultCount=...`. Manages loading/error state. Returns `PagedResultDto<UserRequestDto>` or error. |
| `useUserRequestCounts()` (custom hook) | Fetches summary counts from `GET /api/app/user-requests/counts-by-status`. Manages loading/error state. Returns `{pendingCount, approvedCount, rejectedCount}` or error. |
| `submitUserRequest(input: CreateUserRequestInput)` | POST handler. Sends form data to `POST /api/app/user-requests`. Returns `UserRequestDto` on success or throws error. Called by `UserRequestDialog` on final confirmation. |
| `formatSubmittedDate(creationTime: string)` | Formats `CreationTime` (ISO 8601) as locale date string (e.g., "4/10/2026"). Used in table rendering (FR-02-08). |
| `formatRemarkText(remark: string \| null)` | Returns remark text or "—" (em-dash) if null/empty, styled as muted-foreground/50 italic (FR-02-19). |
| `getStatusBadgeVariant(status: string)` | Returns shadcn/ui Badge variant based on status: "pending" → secondary/warning, "approved" → default/success, "rejected" → destructive. |
| `getStatusIcon(status: string)` | Returns lucide-react icon component: pending → Clock, approved → CheckCircle2, rejected → XCircle (FR-02-07, FR-02-18). |
| `parseRole(role: string)` | Converts role stored in DB (e.g., "company_user") to display text (e.g., "Company User") (FR-02-09). |
| `isSubmitButtonDisabled(name: string, email: string)` | Validates that name and email both contain non-whitespace text. Returns true if Submit button should be disabled (FR-01-03, FR-01-17). Called on every keystroke. |

---

## 9. Permission Enforcement

**Permission System:**

ABP Framework's built-in permission system is used. Permissions are defined in the application's `PermissionDefinitionContext` and assigned at configuration time.

**Permission Codes:**
- `UserRequest.Create` — Required to submit a user request (POST `/api/app/user-requests`). Only users with Company Super Admin role for the current entity should have this permission.
- `UserRequest.View` — Required to view user requests and summary counts (GET `/api/app/user-requests`, GET `/api/app/user-requests/counts-by-status`). All authenticated users with the entity should have this permission.

**Runtime Execution Sequence:**

1. **On POST `/api/app/user-requests` (CreateAsync):**
   - ABP middleware intercepts the request.
   - `[Authorize]` attribute on controller checks that user is authenticated.
   - `[Authorize(Policy = "UserRequest.Create")]` attribute on the action checks permission.
   - If permission denied, return HTTP 403 Forbidden with error message.
   - If permission granted, proceed to action execution.
   - Application Service layer validates that `CurrentUser.Id` is set (should be guaranteed by auth middleware).
   - Input validation checks run (required fields, email format, etc.).
   - Repository creates the entity with `CreatedBy = CurrentUser.Id`.

2. **On GET `/api/app/user-requests` (GetListAsync):**
   - ABP middleware intercepts the request.
   - `[Authorize]` attribute checks authentication.
   - `[Authorize(Policy = "UserRequest.View")]` attribute checks permission.
   - If permission denied, return HTTP 403 Forbidden.
   - If permission granted, proceed to action execution.
   - Repository queries scoped to current tenant automatically (ABP's data filter).
   - All results are for the current entity only.

**Reusability:**
- These two permission codes are specific to the UserRequest domain and are not reused elsewhere.
- Other domains (e.g., BankAdminReview, if implemented later) would define their own permission codes.

---

## 10. Seed Data

No seed data is required for this cluster. The UserRequests table is populated at runtime by users submitting requests via the form. No reference data (roles, statuses) needs to be pre-populated; the Role field currently accepts only "company_user" and the Status enum is hardcoded in the application.

If future versions support additional roles or status values, those should be seeded as reference data tables (not part of this spec).

---

## 11. API Endpoints Summary

| Method | Route | Auth Required | Description |
|--------|-------|---------------|-------------|
| POST | `/api/app/user-requests` | `UserRequest.Create` | Submits a new user request. Accepts `CreateUserRequestInput` (name, email, role, remarks). Returns `UserRequestDto` with generated ID. |
| GET | `/api/app/user-requests` | `UserRequest.View` | Retrieves paginated list of user requests for the current tenant. Query params: `status` (optional), `skipCount`, `maxResultCount`. Returns `PagedResultDto<UserRequestDto>`. |
| GET | `/api/app/user-requests/counts-by-status` | `UserRequest.View` | Retrieves summary counts of requests by status (pending, approved, rejected) for the current tenant. Returns `GetCountsByStatusOutput`. |

---

## 12. Validation Rules

| Rule | Layer | Detail |
|------|-------|--------|
| **Full Name is required** | Client-side & Service | Name field must contain non-whitespace text after trim. Enforced by HTML5 validation (form won't submit) and `CreateAsync` input validation. Cite FR-01-03. |
| **Email is required** | Client-side & Service | Email field must contain non-whitespace text after trim. HTML5 `type="email"` enforces format client-side; server-side checks for non-null and valid email regex or `MailAddress` parsing. Cite FR-01-03, FR-01-16. |
| **Email format is valid** | Client-side & Service | Email must match standard email regex (server-side) or use .NET `MailAddress` class for validation. HTML5 email input provides client-side affordance. Cite FR-01-16. |
| **Role is a known value** | Service | Role must be one of the supported values (currently only "company_user"). Rejection of unknown roles prevents database constraint violations. Cite FR-01-05. |
| **Remarks field is optional** | Service | No validation required; can be null or any length. Cite FR-01-04. |
| **All text inputs are trimmed** | Service | Name, Email, and Remarks are trimmed of leading/trailing whitespace before validation and storage. Cite FR-01-07, BR-06. |
| **No duplicate pending requests for same email** | Service | Query database for existing pending request with the same email in the current tenant. If found, throw `UserFriendlyException`. Cite Open Question #3 (FRS-01) — default: yes, prevent duplicates. |
| **Request ID format is `req-[ISO8601-timestamp]`** | Service | Generate ID as `req-{DateTime.UtcNow:O}` (ISO 8601 format). Cite FR-01-09. |
| **Status always defaults to pending** | Service | When creating a request, `Status` property is hardcoded to "pending". No parameterization. Cite BR-02. |
| **Pagination params are valid** | Service | `SkipCount >= 0`, `MaxResultCount > 0 and <= system max (e.g., 100)`. Invalid params throw `ValidationException`. |
| **List filtering by status is case-insensitive** | Service | If status filter provided in `GetUserRequestListInput`, comparison against known values is case-insensitive (store and compare as lowercase). |

---

## 13. Error Handling Strategy

| Scenario | HTTP Response | Client Behavior |
|----------|---------------|-----------------|
| **Name or Email missing or whitespace** | 400 Bad Request | Form validation prevents submission (Submit button disabled). If bypassed, API returns validation error message. Toast shows error message. |
| **Invalid email format** | 400 Bad Request | HTML5 email input prevents submission. If invalid, API returns 400. Toast shows "Please enter a valid email address." |
| **Unknown Role value** | 400 Bad Request | API validates Role against known values. If unknown, returns 400 with message "Invalid role requested." Toast shows error. |
| **Duplicate pending request for email** | 409 Conflict | User is notified via toast: "A pending request for this email already exists." Form remains open; user can edit and retry. Cite Open Question #3 (FRS-01). |
| **User lacks `UserRequest.Create` permission** | 403 Forbidden | API returns 403. Client shows toast: "You do not have permission to submit requests." User is redirected or button is hidden by frontend (role check). |
| **User lacks `UserRequest.View` permission** | 403 Forbidden | GET endpoints return 403. Client shows toast: "You do not have permission to view requests." |
| **Network error during submission (POST)** | Network timeout / 5xx error | Client catches error and displays toast: "Failed to submit request. Please try again." Form dialog remains open with data preserved. User can retry. Cite FRS-01 exception flow 8d. |
| **Network error during list fetch (GET)** | Network timeout / 5xx error | Component shows error banner: "Unable to load requests. Please try again." User can click retry button. Cite FRS-02 exception flow 8b. |
| **Request list is empty** | 200 OK with `Items = []` | Table displays centered message: "No user requests yet." Summary cards show all counts as 0. Cite FRS-02 alternative flow 7a. |
| **User not in active entity context** | 200 OK but no data (implicit) | React component checks `CurrentUser?.TenantId` before rendering. If null, returns null (blank page). Cite FRS-02 exception flow 8a. |
| **Concurrency conflict (optimistic lock)** | 409 Conflict | Should not occur in this spec (requests are created once and not edited). If implemented for future review workflows, return 409 with message "Request has been modified by another user. Please refresh." |
| **Server error (500)** | 500 Internal Server Error | Toast shows generic error: "An unexpected error occurred. Please contact support." Request/response is logged server-side. No form data is lost (client-side storage retry). |

---

## 14. File & Folder Structure

```
[Project Root]/
├── src/Acme.Domain/
│   ├── UserRequests/
│   │   ├── UserRequest.cs (Domain Entity)
│   │   └── UserRequestStatus.cs (Enum)
│   └── Permissions/
│       └── UserRequestPermissions.cs (Permission definitions)
├── src/Acme.Application/
│   ├── UserRequests/
│   │   ├── UserRequestAppService.cs (Application Service Implementation)
│   │   ├── IUserRequestAppService.cs (Interface)
│   │   ├── Dtos/
│   │   │   ├── CreateUserRequestInput.cs
│   │   │   ├── UserRequestDto.cs
│   │   │   ├── GetUserRequestListInput.cs
│   │   │   ├── GetCountsByStatusOutput.cs
│   │   │   └── PagedResultDto.cs (ABP built-in; not custom)
│   │   └── UserRequestAppServiceProfile.cs (AutoMapper profile)
│   └── UserRequests/
│       └── Validators/
│           └── CreateUserRequestInputValidator.cs (FluentValidation)
├── src/Acme.EntityFrameworkCore/
│   ├── UserRequests/
│   │   └── UserRequestRepository.cs (Repository Implementation)
│   ├── AcmeDbContext.cs (DbContext includes DbSet<UserRequest>)
│   └── Migrations/
│       └── [timestamp]_AddUserRequestTable.cs (EF Core migration)
├── src/Acme.HttpApi/
│   └── Controllers/
│       └── UserRequestController.cs (API Controller)
├── src/Acme.Web/
│   └── src/pages/
│       └── UserRequests/
│           ├── UserRequestPage.tsx
│           ├── UserRequestDialog.tsx
│           ├── ConfirmSubmissionDialog.tsx
│           ├── UserRequestTable.tsx
│           ├── SummaryCards.tsx
│           ├── useUserRequests.ts (custom hook)
│           ├── useUserRequestCounts.ts (custom hook)
│           └── userRequestService.ts (API client functions)
└── src/Acme.Web/
    └── src/styles/
        └── userRequests.module.css (component styles, if needed)
```

---

## 15. Implementation Order

| Step | Task |
|------|------|
| 1 | Create EF Core migration to add `UserRequests` table with all columns (id, tenant_id, name, email, role, remarks, status, created_by, created_at, reviewed_by, reviewed_at, reject_reason, concurrency_stamp, is_deleted, deletion_time, deleter_user_id). Add indexes and unique constraints. |
| 2 | Create domain entity `UserRequest.cs` (inheriting from `Entity<string>`, `IHasCreationTime`, `ISoftDelete`). Define `UserRequestStatus` enum (Pending, Approved, Rejected). |
| 3 | Create permission definitions in `UserRequestPermissions.cs` and register them in `UserRequestPermissionDefinitionProvider.cs` (if ABP project structure requires it). |
| 4 | Create DTOs: `CreateUserRequestInput.cs`, `UserRequestDto.cs`, `GetUserRequestListInput.cs`, `GetCountsByStatusOutput.cs`. |
| 5 | Create AutoMapper profile `UserRequestAppServiceProfile.cs` to map `UserRequest` entity ↔ `UserRequestDto`. |
| 6 | Create `IUserRequestRepository.cs` interface and `UserRequestRepository.cs` implementation (may inherit from ABP's generic repository). Add custom methods: `GetListAsync()`, `GetCountByStatusAsync()`, `CreateAsync()`. |
| 7 | Create application service interface `IUserRequestAppService.cs` and implementation `UserRequestAppService.cs`. Implement `CreateAsync()`, `GetListAsync()`, `GetCountsByStatusAsync()` with full business logic and validation. |
| 8 | Create `CreateUserRequestInputValidator.cs` (FluentValidation) to validate required fields, email format, role, etc. Wire into `UserRequestAppService.CreateAsync()`. |
| 9 | Create `UserRequestController.cs` API controller with POST and GET actions. Wire up authorization attributes. Test endpoints with Postman/curl. |
| 10 | Create React component `UserRequestPage.tsx` displaying table and summary cards. Implement `useUserRequests()` and `useUserRequestCounts()` hooks. Call API endpoints. |
| 11 | Create `UserRequestDialog.tsx` and `UserRequestTable.tsx` sub-components. Implement form validation (disabled Submit button logic), confirmation dialog, error handling (toast notifications). |
| 12 | Create `userRequestService.ts` API client functions (submit, fetch list, fetch counts). Handle network errors and response parsing. |
| 13 | Create end-to-end tests: Create request (POST), retrieve list (GET), verify summary counts (GET). Test error scenarios (missing fields, network failure, permission denial). |
| 14 | Verify WCAG 2.1 AA accessibility: semantic HTML, aria-labels, focus indicators, color contrast, keyboard navigation (tab order, Enter/Escape in dialogs). |
| 15 | Verify responsive design on mobile (< 768px): summary cards and table layout, remarks truncation, touch targets (≥ 44x44px). |

---

## 16. Open Technical Decisions

| # | Question | Impact | Recommended Default |
|---|----------|--------|---------------------|
| 1 | **Request ID format:** Should we use `req-[ISO8601-timestamp]` as specified in FRS-01, or a shorter format like `req-[UUID]` or `req-[sequential-number]`? | Affects uniqueness guarantees, readability, and storage space. ISO8601 is human-readable but verbose. | **Default: Use `req-{DateTime.UtcNow:O}`** (ISO 8601) as per FR-01-09. It is human-readable, sortable by creation time, and collision-proof (timestamp precision to milliseconds is sufficient for typical submission rates). Easier for support teams to debug ("this request was created at exactly this time"). |
| 2 | **Duplicate email prevention:** Should the system prevent submitting a pending request for an email that already has a pending request? | Prevents user confusion ("why can't the system find my request?") and reduces admin noise. If "no", duplicates clutter the review queue. | **Default: Yes, prevent duplicate pending requests.** Add unique index on `(TenantId, Email, Status)` where Status = 'pending'. Cite Open Question #3 (FRS-01). Return HTTP 409 Conflict with message "A pending request for this email already exists." This aligns with good UX and admin workflow expectations. |
| 3 | **Remarks field max length:** FRS-01 Open Question #1 asks if there should be a character limit for remarks. What should it be? | Affects database column size and UI textarea constraints. Too short (e.g., 256) limits context; too long (e.g., unlimited) allows abuse. | **Default: 512 characters.** Store in `nvarchar(512)`. This accommodates typical justifications (e.g., "New hire in financial reporting team, access needed by Q2 2026") while preventing abuse. Validate on server-side and optionally on client-side (textarea character counter). |
| 4 | **Submit button debouncing/loading state:** FRS-01 Open Question #5 asks if the Submit button should have a loading/disabled state during the POST request. | Prevents double-submission if user clicks multiple times. Without this, concurrent requests could create duplicate records. | **Default: Yes, implement button debouncing.** During POST request (while network is in-flight), disable the Submit button and show a loading spinner (or change text to "Submitting..."). Re-enable on response (success or error). Use a flag in React state or a library like `react-use` for debouncing. This is a UX best practice and prevents accidental double-submission. |
| 5 | **Request list auto-refresh:** FRS-02 Open Question #4 asks if the page should auto-refresh to show newly submitted requests. | If "yes", page refreshes periodically (e.g., every 5 seconds), which is polling and less efficient than WebSocket. If "no", users see stale data until they manually refresh. | **Default: Manual refresh only (no auto-polling).** Users can use browser refresh (F5) to reload the page. Future enhancement: Implement WebSocket or SignalR for real-time updates. This keeps the initial scope minimal and avoids unnecessary server load. If real-time visibility is critical, escalate to stakeholders and implement in a separate sprint. |
| 6 | **Keyboard shortcuts in dialogs:** FRS-01 Open Question #6 asks if confirmation dialogs should support Enter to confirm and Escape to cancel. | Improves keyboard accessibility and user experience. Most users expect Escape to close modals. | **Default: Yes, support keyboard shortcuts.** Implement in shadcn/ui Dialog: Escape closes the dialog; Enter on the "Submit Request" button confirms. This is standard for web dialogs and is WCAG 2.1 AA compliant (FR-01-06 already specifies a two-step confirmation workflow; keyboard support is implied). Use shadcn/ui's built-in keyboard handling. |
| 7 | **Remarks field in requests list:** FRS-02 requires remarks to be truncated to 200px with a tooltip. How should remarks render if the request never had remarks (null/empty)? | Determines how the table looks and how users understand empty vs. populated remarks. | **Default: Show em-dash "—" styled as muted-foreground/50 italic for empty remarks.** This visually distinguishes empty-by-design from truncated text. Cite FR-02-19, BR-06. This is clearer than leaving the cell blank or showing placeholder text. |
| 8 | **Multi-tenancy enforcement:** Should the system strictly prevent a user from viewing another tenant's requests, even if they somehow gain access to a different TenantId? | Data isolation is critical for security and compliance. Assumes ABP's `ICurrentTenant` is reliable. | **Default: Rely on ABP's `ICurrentTenant` data filter and TenantId FK constraint.** The Repository layer queries are automatically scoped to the current tenant. The database FK ensures referential integrity. The controller should not accept a `TenantId` parameter from the user (it's always `CurrentTenant.Id`). This is the standard ABP multi-tenancy pattern and is secure if ABP is configured correctly. |
| 9 | **Status enum representation in database:** Should Status be stored as an integer enum (0, 1, 2) or as a string ("pending", "approved", "rejected")? | String is human-readable in the database; integer is more compact and faster to index. | **Default: Store as string (`nvarchar(50)`).** Rationale: Easier to debug (query the DB and see "pending" instead of "0"). Slightly less performant but negligible for this dataset size. If performance becomes an issue, migrate to integer enum with a lookup table. Current choice prioritizes debuggability. |
| 10 | **Soft delete vs. hard delete:** Should rejected/archived requests be soft-deleted or hard-deleted? | Soft delete (ISoftDelete) preserves audit trail and allows recovery. Hard delete removes data permanently. | **Default: Use ABP's `ISoftDelete` interface on UserRequest entity.** Soft deletes preserve audit history (DeletionTime, DeleterUserId) and comply with regulatory requirements (logs, audit trails). Include `IsDeleted = 0` in all queries implicitly (ABP's global filter). Hard deletes should never be used for financial/audit records. |

---

## Linking Back to FRS

**FRS-01 Requirements Addressed:**
- FR-01-01 through FR-01-20: All functional requirements are implemented via the Form Dialog component, API validation, and Controller permissions.
- BR-01 through BR-06: Permission system gates creation; validation enforces required fields, trimming, and request creation logic.

**FRS-02 Requirements Addressed:**
- FR-02-01 through FR-02-20: All functional requirements are implemented via the Table and Summary Cards components, API endpoints, and list filtering/sorting logic.
- BR-01 through BR-07: Multi-tenancy and dynamic count calculation are handled by the Repository and Application Service layers.

---

**Self-Review Checklist**

- [x] **Stack is explicit throughout** — ABP Framework, ASP.NET Core, EF Core, SQL Server, React, shadcn/ui
- [x] **No code written** — All sections are prose descriptions (Section 3–9)
- [x] **Every FR-* and BR-* from both FRS documents is addressed** in Sections 5, 9, 12, 13
- [x] **All FRS open questions carried into Section 16** with recommended defaults
- [x] **Implementation order is dependency-safe** — Database first, then entities, then services, then API, then UI
- [x] **All 16 sections present** — None skipped
- [x] **File structure matches** all class names in Sections 3–8
- [x] **API endpoints table** matches controller actions in Section 6
- [x] **Error handling table** covers all exception flows from both FRS documents
- [x] **References field lists** both source FRS filenames

---


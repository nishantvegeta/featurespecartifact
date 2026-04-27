# Reference: Value Object nodes

A Value Object is an immutable structure identified by the combination of its attribute values — not by a distinct ID. Two Value Objects with identical attribute values are considered equal.

> **Field contract:** Required fields and enforcement live in `agents/ddd-synthesizer.md`. This file covers when to create a Value Object, the criteria framework, equality semantics, the worked example, and common defects.
>
> Value Objects have no `Id` field, no audit fields, no lifecycle, and no domain events. If a proposed Value Object has any of these, it should be an Entity instead.

---

## When to create a Value Object

Create a Value Object only when the clause describes a concept meeting **at least one** of these criteria:

- **(a) Multi-attribute composition** — the concept groups two or more attributes that only make sense together (e.g., amount + currency, street + city + postal code). A single-primitive concept does not qualify.
- **(b) Non-trivial construction-time invariants** — explicit domain rules must be enforced at creation (e.g., a postal code must match a country-specific regex; a date range must have start ≤ end).
- **(c) Custom or case-insensitive equality semantics** — equality is not simple value equality on all fields (e.g., email addresses are equal regardless of case).
- **(d) Encapsulation of a canonical domain concept** — the concept has a well-understood meaning that benefits from type safety beyond a raw primitive (e.g., `Money`, `DateRange`, `GeoCoordinate`).

**Single-primitive wrappers do not qualify.** A field like `RequesterRemark` (a string), `RequestedRole` (a string or enum), or `Amount` (a decimal) without invariants must be modeled as an Entity field or DTO property — not as a Value Object. Demote immediately.

Do **not** create a Value Object for:

- A single primitive with no validation, no custom equality, and no canonical domain concept status — demote to Entity field or DTO property.
- A DTO used only for input/output of a single Command — the DTO table inside the Command entry is sufficient.
- A structure with a lifecycle — that's an Entity.
- Something already provided by ABP.

---

## Base class

Value Objects in ABP typically inherit from `ValueObject` (`Volo.Abp.Domain.Values.ValueObject`), which provides structural equality based on the components returned by `GetAtomicValues()`.

For simple Value Objects with no special equality logic, a plain record type can be used. Note the choice as `**Base class:** ValueObject` or `**Base class:** C# record`.

---

## Attributes table conventions

Columns: `Name | Type | Required | Validation | Notes`.

- Field names are **PascalCase**.
- Every attribute is set at construction or never set (immutable).
- `Validation` lists constructor-level validation (length, format, range). Validation that depends on external state belongs on the consuming Entity, not here.
- No `Id` field, no audit fields, no `TenantId`.

---

## Equality rule

State equality semantics explicitly:

- **By all fields** — two Value Objects are equal iff every attribute matches. Default choice.
- **By subset \<fields\>** — only the listed fields participate in equality. Rare; requires clause justification.
- **Custom** — special equality logic (e.g., case-insensitive string comparison). Describe the rule.

---

## Example entry (reference only — follow format)

> **Node type:** Value Object
> **Name:** Address
> **Module:** Onboarding
> **Purpose:** A structured postal address used on customer profiles.
> **Base class:** `ValueObject`
>
> **Attributes table:**
>
> | Name | Type | Required | Validation | Notes |
> |---|---|---|---|---|
> | `Street1` | `string` | yes | 1–128 chars, non-whitespace | |
> | `Street2` | `string?` | no | 0–128 chars | |
> | `City` | `string` | yes | 1–64 chars | |
> | `Region` | `string` | yes | 1–64 chars | State/province |
> | `PostalCode` | `string` | yes | country-specific format | See construction rules |
> | `CountryCode` | `string` | yes | ISO 3166-1 alpha-2 | Stored uppercase |
>
> **Equality rule:** by all fields, case-insensitive on `CountryCode` only.
>
> **Invariants:**
> - `CountryCode` must be a valid ISO 3166-1 alpha-2 code.
> - `PostalCode` must match the regex registered for `CountryCode`.
> - All string fields are trimmed before validation.
>
> **Construction rules:**
> - Trim all string inputs before validation.
> - Uppercase `CountryCode` before storing.
>
> **Serialization notes:**
> - Stored as owned-type in EF Core; fields map to `Address_Street1`, `Address_Street2`, etc. on the owning entity's table.
>
> **Used by:**
> - [CustomerProfile](<wiki_url>/entities/CustomerProfile)
> - [ShippingDestination](<wiki_url>/entities/ShippingDestination)
>
> **Source:**
> - [FRS #124 — Reference format](http://localhost:8080/root/trade-finance/-/issues/124#3-reference-format)
> - [FRS #124 — Uniqueness rules](http://localhost:8080/root/trade-finance/-/issues/124#9-uniqueness-rules)

---

## Common defects

| Defect | Fix |
|---|---|
| Value Object with an `Id` field | Remove `Id`; if identity is truly needed, promote to Entity |
| Value Object with audit fields | Remove; audit is an Entity concept |
| Value Object with `IMultiTenant` | Remove; tenancy belongs to the owning Entity |
| Value Object that fires domain events | Move event logic to the owning Entity |
| Mutable setters | Replace with constructor-only assignment and document in `**Construction rules:**` |
| No validation rules on fields with clear constraints | Extract constraints from FRS; populate Validation column and `**Invariants:**` |
| Value Object that's only used as a Command input | Collapse into the Command's Input DTO table; remove the Value Object entry |
| Single-primitive field modeled as Value Object (e.g., `RequesterRemark`, `RequestedRole`, `Amount` without currency) | Demote to Entity field or DTO property; no VO entry needed unless criteria (a–d) are met |

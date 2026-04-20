# Reference: Value Object nodes

A Value Object is an immutable structure identified by the combination of its attribute values — not by a distinct ID. Two Value Objects with identical attribute values are considered equal.

> **Enforcement:** Value Objects have no `Id` field, no base class from ABP's entity hierarchy, no lifecycle, and no domain events. If a proposed Value Object has any of these, it should be an Entity instead.

---

## When to create a Value Object

Create a Value Object when a clause describes a concept that:

- Has no persistent identity independent of its values, AND
- Is fully defined by its attributes (change any attribute → it's a different value), AND
- Has domain meaning beyond a primitive (formatting rules, validation, equality semantics), AND
- May appear as a compound field on an Entity or as an input/output DTO component.

Do **not** create a Value Object for:

- A single primitive (use the primitive type directly unless validation demands a wrapper).
- A DTO used only for input/output of a single Command — the DTO table inside the Command entry is sufficient.
- A structure with a lifecycle — that's an Entity.
- Something already provided by ABP (e.g., money amounts — check `Volo.Abp.MultiLingualObject` or similar before synthesizing).

---

## ABP base class

Value Objects in ABP typically inherit from `ValueObject` (`Volo.Abp.Domain.Values.ValueObject`). This provides structural equality based on the components returned by `GetAtomicValues()`.

For simple Value Objects with no special equality logic, a plain record type can be used. The choice should be noted in the entry as `**Base class:** ValueObject` or `**Base class:** C# record`.

---

## Required fields

Every Value Object entry must include these bold-labeled fields:

- `**Node type:** Value Object`
- `**Name:** <PascalCase>`
- `**Module:** <module>`
- `**Purpose:** <1 sentence, business-level>`
- `**Base class:** ValueObject | C# record`
- `**Attributes table:** <columns: Name, Type, Required, Validation, Notes>`
- `**Equality rule:** <by all fields | by subset <fields> | custom>`
- `**Invariants:** <bullet list — validation rules enforced in the constructor>`
- `**Used by:** <bullet list of wiki links to Entities or DTOs that include this VO>`
- `**Source:** <bullet list of GitLab section-anchor deep links; see SKILL.md Clause Source Deep-Linking>`

Optional:

- `**Construction rules:** <bullet list — e.g., "trim and lowercase email", "validate format before accepting">`
- `**Serialization notes:** <e.g., "stored as single string via owned-type mapping in EF Core">`

---

## Attributes table

Columns:

| Name | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `<FieldName>` | `<C# type>` | yes/no | `<rule>` | Short note |

Guidelines:

- Field names are **PascalCase**.
- Every attribute is either set at construction or never set (immutable).
- `Validation` column lists constructor-level validation (length, format, range). Any validation that depends on external state belongs on the consuming Entity, not here.
- No `Id` field, no audit fields, no `TenantId`.

---

## Equality rule

State the equality semantics explicitly:

- **By all fields** — two Value Objects are equal iff every attribute matches. Default choice.
- **By subset <fields>** — only the listed fields participate in equality (other fields are derived or cosmetic). Rare; requires clause justification.
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
| No validation rules on fields with clear constraints | Extract constraints from FRS and populate the Validation column and `**Invariants:**` |
| Value Object that's only used as a Command input | Collapse into the Command's Input DTO table and remove the Value Object entry |

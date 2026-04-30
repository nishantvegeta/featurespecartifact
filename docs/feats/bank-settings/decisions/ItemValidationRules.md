---
id: decision-item-validation-rules
name: ItemValidationRules
type: decision
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# ItemValidationRules

**Type:** Validation constraints for checklist item creation and editing

## Rule 1: Non-Empty Description

**Input:** Description string field

**Constraint:** Must not be empty; must not be only whitespace

**Enforcement:**
- FluentValidation: .NotEmpty().NotWhitespace()
- Validator classes: CreateChecklistItemCommandInputValidator, EditChecklistItemCommandInputValidator
- UI: Submit button disabled when description empty

**Example failures:**
- "" (empty string)
- "   " (whitespace only)
- "\t\n" (whitespace characters)

**Example passes:**
- "Item description" ✓
- " Item description " ✓ (whitespace trimmed on validation)

## Rule 2: Description Maximum Length

**Input:** Description string field

**Constraint:** Maximum 500 characters (UTF-8, unicode counted as characters)

**Enforcement:**
- FluentValidation: .MaximumLength(500)
- Validator classes: CreateChecklistItemCommandInputValidator, EditChecklistItemCommandInputValidator
- UI: Validation error toast "Description must not exceed 500 characters"

**Example failures:**
- 501-character string ✗

**Example passes:**
- Up to 500 characters ✓

## Rule 3: Button Disable on Invalid Input

**Input:** Dialog form fields (Description)

**Constraint:** Submit button (Add Item, Save Changes) disabled when description invalid

**Enforcement:**
- Real-time validation feedback
- Button state synchronized with validation state
- No submission allowed while invalid

**Invalid states:**
- Description empty
- Description whitespace-only
- Description > 500 characters

**Valid state:** Description 1-500 characters (non-whitespace)

## Source

- [FRS #16 — Form Fields](http://localhost:8080/root/trade-finance/-/issues/16#11-form-fields)
- [FRS #16 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/16#12-functional-requirements)
- [FRS #17 — Form Fields](http://localhost:8080/root/trade-finance/-/issues/17#11-form-fields)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial decision synthesis |

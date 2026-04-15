# FRS Document Template (17 Sections)

Each FRS file follows this template. Populate all 17 sections.
Save to: `docs/frs/[module-slug]/FRS-[NN]-[operation-slug].md`

---

```markdown
# [FRS-NN] [Feature Name]

**Module:** [Module Name]
**FRS ID:** FRS-NN
**Operation:** [HTTP Method] — [brief description]
**Version:** 1.0.0
**Status:** Draft
**Backend Scope:** ABP Framework (.NET)

---

## 1. Overview
[One paragraph — what this operation does, who triggers it, what the outcome is.]

## 2. Actors
| Actor | Role | Permission Required |
|---|---|---|
| [Actor Name] | [Role] | [ABP permission constant] |

## 3. Preconditions
- [What must be true before this operation can be invoked]

## 4. Postconditions
- [What is guaranteed after successful execution]

## 5. Main Flow (Happy Path)
1. Caller sends [METHOD] /api/app/[resource] with [payload].
2. System validates input fields.
3. System applies business rules.
4. System executes domain operation.
5. System persists via repository.
6. System raises domain event (if applicable).
7. System returns [status code] with [response shape].

## 6. Inputs
| Field | Type | Required | Validation |
|---|---|---|---|
| [field] | [type] | Yes/No | [rule] |

## 7. Outputs
| Field | Type | Description |
|---|---|---|
| [field] | [type] | [description] |

## 8. Business Rules
| Rule ID | Rule | Enforcement |
|---|---|---|
| BR-NN | The system SHALL... | hard-block / soft-warning / audit-log |

## 9. Validation Rules
| Rule ID | Field | Rule | Error Message |
|---|---|---|---|
| VR-NN | [field] | [constraint] | [message shown to API caller] |

## 10. Alternate Flows
| ID | Condition | Steps | Outcome |
|---|---|---|---|
| AF-NN | [trigger] | [steps] | [result] |

## 11. Exception Flows
| ID | Trigger | System Response | HTTP Status | Recovery |
|---|---|---|---|---|
| EX-NN | [cause] | [system action] | [4xx/5xx] | [recovery path] |

## 12. Edge Cases
| ID | Scenario | Expected Behavior | Risk |
|---|---|---|---|
| EC-NN | [unusual but valid scenario] | [expected outcome] | High/Medium/Low |

## 13. State Transitions (if applicable)
| Entity | From | To | Trigger | Guards |
|---|---|---|---|---|
| [Entity] | [state] | [state] | [event] | [conditions] |

## 14. Acceptance Criteria
| ID | Given | When | Then |
|---|---|---|---|
| AC-NN | [context] | [action] | [expected result] |

## 15. Backend Implementation Scope (ABP Framework)
| Layer | Artifact | Notes |
|---|---|---|
| Domain.Shared | `[Feature]Consts.cs` | Max length constants, enum values |
| Domain | `[Entity].cs` | Aggregate root / entity |
| Domain | `I[Entity]Repository.cs` | Custom query methods needed |
| Domain | `[Feature]Manager.cs` | Only if complex domain logic required |
| Application.Contracts | `[Input]Dto.cs` | Fields and validation attributes |
| Application.Contracts | `I[Feature]AppService.cs` | Method signature |
| Application.Contracts | `[Feature]Permissions.cs` | Permission constant |
| Application | `[Feature]AppService.cs` | Implementation |
| EntityFrameworkCore | `Ef[Entity]Repository.cs` | Custom EF queries |

## 16. Open Questions
- [Ambiguity requiring stakeholder clarification]

## 17. Assumptions
- [What was assumed in absence of explicit guidance]
```

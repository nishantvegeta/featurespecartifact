- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              FRS-GENERATOR v1.1
        (MODULE RESOLUTION + FRS GENERATION)
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



[ LAYER 0 — CONTROL PLANE ]
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| SKILL RULES:                                                |
|                                                             |
| CORE RULES:                                                 |
| - MUST resolve confirmed_module_list before generation      |
| - module = milestone                                        |
| - one FRS per business operation                            |
|                                                             |
| CONFLICT RULE:                                              |
| - If multiple modules detected → trigger user gate          |
| - If single module detected → auto-select                   |
|                                                             |
| CONSTRAINTS:                                                |
| - all FRS must align to their locked module                 |
| - FRS describes WHAT, never HOW                             |
| - no technical implementation details in any FRS            |
| - skipped FRS → no issue created                            |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



[ LAYER 1 — SKILL ]
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| frs-generator                                               |
| type: single_skill                                          |
|                                                             |
| RESPONSIBILITY:                                             |
| - module resolution                                         |
| - FRS generation + enforcement                              |
| - GitLab milestone + issue sync                             |
|                                                             |
| OUTPUT (FINAL ONLY):                                        |
|  - milestone titles                                         |
|  - FRS → issue IDs                                          |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



==============================================================
                PHASE 1 — PARSE & MODULE RESOLUTION
==============================================================

INPUT
  |
  v
[ Parse Input ]
  - identify modules (= domains)
  - extract business operations per module
  |
  v

OUTPUT:
- candidate_modules (ranked)
- confirmed_module_list
- business operations per module



==============================================================
        MODULE RESOLUTION (CONDITIONAL USER GATE)
==============================================================

        IF (single module detected):
                |
                v
        [ auto-select module ]
                |
                v
             CONTINUE


        IF (multiple modules detected):
                |
                v

        ┌────────────────────────────────────────────┐
        | USER GATE (ONLY HERE)                      |
        |                                            |
        | "Modules detected:"                        |
        |                                            |
        | 1. User Management                         |
        | 2. Inventory                               |
        | 3. Reporting                               |
        |                                            |
        | Confirm, or add / remove / merge           |
        └───────────────┬────────────────────────────┘
                        |
                  (BLOCKING)
                        |
                        v
           [ confirmed_module_list ]



==============================================================
        PHASE 2 — FRS PLAN + MILESTONE CREATION
==============================================================

            |
            v
[ Build FRS manifest ]
  - expand modules → business operations
  - assign FRS IDs (reset per module)
  - derive file paths
  - all status = pending-approval
            |
            v
[ Present manifest to user ]
            |
            v
[ Create milestone per module (ONCE) ]
  - milestone title = module name
  - store: (module → milestone_id)



==============================================================
        PHASE 3 — ENRICHMENT
==============================================================

            |
            v

        IF (meeting notes / business rules provided):
                |
                v
        [ extract & tag rules to modules ]

        IF (nothing provided):
                |
                v
        [ Skill Constraint infers rules ]

            |
            v
[ enrichment_map: module → rules ]



==============================================================
        PHASE 4 — GENERATION + SYNC LOOP (PER FRS)
==============================================================

            |
            v

==============================================================
        FRS ITERATION LOOP (PER FRS)
==============================================================

for each module:
  for each FRS_i in module:

    |
    v
[ Generate FRS_i internally ]
  - all sections
  - business language only
  - actors, goals, flows, rules, outcomes
  - apply Skill Constraint
    (≥2 business rules, ≥2 edge cases, ≥1 exception flow)
    |
    v
[ Self-Review Checklist ]
  - one business operation only?
  - all requirements testable by business?
  - zero technical / implementation details?
  - exception flows cover: invalid input, unauthorized, failure?
  - postconditions stated as business outcomes?
    |
    v
(if checklist fails → refine inline, re-check)
    |
    v
[ Domain-Expert Enforcement ]
  - all actors belong to locked_module?
  - all business rules scoped to locked_module?
  - no cross-module logic leaked in?
  - outcomes affect only this module's scope?
    |
    v
(if violation found → strip, rewrite, re-enforce)
    |
    v
[ VALID CLEAN FRS_i ]
    |
    v
[ Present FRS_i to user ]
    |
    v
[ user response? ]
    |
    v
  ┌──────────────┬─────────────────┬──────────┐
  | approved     | change request  | skip     |
  └──────┬───────┴───────┬─────────┴────┬─────┘
         |               |              |
         v               v              v
   [ save file ]  [ apply change ]  [ mark skipped ]
         |         [ re-show ]           |
         |         [ confirm ]           |
         |               |               |
         └───────┬────────┘               |
                 v                        |
         [ GitLab-Sync ]                  |
           - create issue                 |
             under milestone_id           |
             for this module              |
           - store:                       |
             (FRS_title → issue_id)       |
                 |                        |
                 v                        |
           [ next FRS_i ] ←──────────────┘

end loop



==============================================================
                DOMAIN-EXPERT (ENFORCER)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - FRS_i                                                    |
|  - locked_module                                            |
|                                                             |
| RESPONSIBILITY:                                             |
|  - reject cross-module logic                                |
|  - enforce strict module alignment                          |
|  - reject any technical implementation detail               |
|                                                             |
| GUARANTEE:                                                  |
|  FRS belongs ONLY to locked_module                          |
|  FRS contains ONLY business language                        |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



==============================================================
                SKILL CONSTRAINT
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| APPLIES TO: business rules, edge cases, exception flows     |
|                                                             |
| GUARANTEES PER FRS:                                         |
|  - ≥2 business rules                                        |
|  - ≥2 edge cases                                            |
|  - ≥1 exception flow                                        |
|                                                             |
| FOCUS:                                                       |
|  - business constraints, not technical limits               |
|  - policy violations, not system errors                     |
|  - user-facing outcomes, not implementation failures        |
|                                                             |
| NOTE:                                                       |
|  - runs even when no enrichment is provided                 |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



==============================================================
                GITLAB-SYNC
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| milestone = module name                                     |
| created ONCE per module before loop                         |
| issues attach to their module's milestone                   |
| skipped FRS → no issue created                              |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -



==============================================================
                PHASE 5 — FINAL OUTPUT
==============================================================

Milestones:
  User Management  →  #M1
  Inventory        →  #M2

FRS Issues:
  User Management:
    FRS-01  register-user         →  #123
    FRS-02  update-user-profile   →  #124
    FRS-03  deactivate-user       →  skipped

  Inventory:
    FRS-01  add-inventory-item    →  #125
    FRS-02  update-inventory-item →  #126

Bundle ID      : FRS-BUNDLE-{YYYYMMDD}-001
Total FRS docs : {N} across {M} modules
Milestones     : {M}
Saved          : {N}
Skipped        : {N}
Issues created : {N}
Business Rules : {N}
Edge Cases     : {N}
Open Questions : {N}



==============================================================
                KEY DESIGN DECISIONS
==============================================================

USER GATE EXISTS ONLY FOR:

→ resolving module ambiguity (Phase 1)
→ per-FRS approve / change / skip (Phase 4)

NOT FOR:
- automatic generation steps
- enrichment inference
- milestone creation
- domain enforcement


FRS CONTAINS ONLY:

→ business actors
→ business goals and outcomes
→ business rules and constraints
→ user-facing exception flows

NEVER:
- database or storage details
- API or service names
- framework or language references
- infrastructure or deployment concerns



==============================================================
                SYSTEM GUARANTEES
==============================================================

- one milestone per module, created before loop
- one issue per approved FRS, created immediately on approval
- skipped FRS never synced to GitLab
- strict module purity enforced on every FRS before presentation
- strict business-only language enforced on every FRS
- Skill Constraint runs on every FRS regardless of input



- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                    END BLUEPRINT v1.1
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
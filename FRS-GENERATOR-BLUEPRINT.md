- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              FRS GENERATOR SYSTEM v1.0
    (Generates Production-Ready Functional Requirement Specs)
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


[ LAYER 0 — CONTROL PLANE ]
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| HARD-GATE (Non-negotiable Preconditions)                    |
|                                                             |
| CORE RULES:                                                 |
| - UI prototype, wireframes, or feature description MUST     |
|   be provided before proceeding                             |
| - At least one module with one identifiable backend         |
|   operation required                                        |
| - Project/system name must be explicitly provided or        |
|   identifiable from input                                   |
| - NO files saved without explicit per-FRS user approval     |
|                                                             |
| CONFLICT RULE:                                              |
| - If any hard-gate fails → STOP and return error message    |
| - If FRS exists but user wants technical design → use       |
|   feat-spec-generator instead, not frs-generator            |
|                                                             |
| CONSTRAINTS:                                                |
| - ABP Framework (.NET) backend scope ONLY                   |
| - No frontend components, no UI styling specs               |
| - One FRS document = one backend operation                  |
| - File naming: docs/frs/[module-slug]/FRS-[NN]-[op-slug].md |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


[ LAYER 1 — ORCHESTRATOR ]
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| /frs-generator                                              |
| type: skill (Step 1 of 5 in SDLC pipeline)                  |
|                                                             |
| RESPONSIBILITY:                                             |
| - Accept UI prototypes, wireframes, or module descriptions  |
| - Transform visual/textual input into production FRS docs   |
| - Guide user through review-and-approve cycle               |
| - Emit FRS bundle for downstream skill consumption          |
|                                                             |
| OUTPUT (FINAL):                                             |
|  - FRS-BUNDLE-{YYYYMMDD}-{NNN}: N FRS documents            |
|  - Shared Context metadata                                  |
|  - File manifest (saved + skipped)                          |
|  - Pipeline handoff signal                                  |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


==============================================================
                PHASE 1 — STRATEGY
        (Parse Input & Identify Modules)
==============================================================

INPUT:
  UI prototype | wireframes | module list | feature description
  |
  v
[ INPUT PARSER ]
  |
  v
Verify input is text-based (no binary/image-only)
  |
  v
Extract MODULES (logical groupings of related operations)
  |
  v
For each module, derive backend operations ONLY:
  - Add/Create button    → POST Create [Entity]
  - Edit icon            → PUT Update [Entity]
  - Delete icon          → DELETE Delete [Entity]
  - Table/list view      → GET Get [Entity] List
  - Detail/view screen   → GET Get [Entity] By ID
  |
  v
[ HARD-GATE: Module Extraction ]
IF (≥1 module with ≥1 operation):
    CONTINUE
ELSE:
    STOP with error: "Input too vague to extract requirements"
  |
  v
[ HARD-GATE: Project Name ]
IF (system/project name identifiable):
    CONTINUE
ELSE:
    STOP with error: "Project name required"
  |
  v

OUTPUT:
- Identified modules (with slugs)
- Backend operations per module
- Project name
- Input classification (prototype | description | wireframes)


==============================================================
                PHASE 2 — DISCOVERY
        (Conditional Interview Mode)
==============================================================

INPUT:
  Identified modules + operations
  |
  v
[ DECISION GATE ]
  |
  IF (interview_mode = true):
    |
    v
  [ INTERVIEW AGENT ]
    |
    Questions (one at a time, blocking):
    1. "What are the most important business rules not visible?"
    2. "What should the system PREVENT?"
    3. "What happens to related data on [key entity] delete?"
    4. "Role-based restrictions per operation?"
    5. "Compliance/audit requirements?"
    6. "Behavior on critical operation failure?"
    7. "Time-based rules? (deadlines, expiry, rate limits)"
    8. "Ambiguities or disagreements on requirements?"
    |
    v
  [ ENRICHMENT COLLECTED ]
    |
  ELSE:
    |
    v
  [ SKIP INTERVIEW ]
    |
  ENDIF
  |
  v

OUTPUT:
- User-provided business rules (if interview mode)
- Or: empty enrichment set (to be inferred by brainstorm)


==============================================================
                PHASE 3 — ENRICHMENT INGESTION
==============================================================

INPUT:
  Interview results (optional) | Meeting notes (optional)
  Business rules (optional) | Compliance requirements (optional)
  |
  v
[ ENRICHMENT INGESTER ]
  |
  IF (meeting notes provided):
    Extract business rules, constraints, decisions
  |
  IF (business rules provided):
    Tag each rule to module | mark cross-cutting
  |
  IF (compliance requirements provided):
    Flag for injection into relevant FRS sections
    (GDPR, HIPAA, PCI-DSS, etc.)
  |
  Verify: All rules tagged to module or marked cross-cutting
  |
  IF (rule cannot be attributed):
    Mark as cross-cutting, add to Shared Context
    Open Questions field
  |
  v

OUTPUT:
- Structured enrichment map (rules → modules)
- Compliance flag list
- Cross-cutting rules
- Open questions collected


==============================================================
                PHASE 4 — FRS GENERATION LOOP
        (Per Module — Generate All Internally)
==============================================================

for each module_i:

    |
    v
[ ASSIGN FRS IDS ]
    FRS-01, FRS-02, ... (reset per module)
    |
    v
for each operation_j in module_i:

    |
    v
[ DERIVE OPERATION METADATA ]
    - Operation slug: kebab-case
    - File path: docs/frs/[module-slug]/FRS-[NN]-[op-slug].md
    - Derived entity, HTTP verb, endpoints
    |
    v
[ POPULATE FRS TEMPLATE ]
    Sections 1-17 (see schema below)
    |
    v
[ APPLY BRAINSTORM SUPERPOWER ]
    IF (≥2 business rules) AND (≥2 edge cases)
        AND (≥1 exception flow):
        CONTINUE
    ELSE:
        Infer missing rules, edge cases, flows
    |
    Brainstorm asks:
    - What PREVENTS this operation?
      (permission, state, quota, ordering)
    - Min/max constraints on input fields?
    - Can it be undone? By whom? When?
    - Side effects? (notifications, cascades, events)
    - Edge cases?
      (soft-deleted target, missing related entity,
       concurrent calls, logically invalid but
       technically valid input)
    - Exception flows?
      (DB unavailable, session expired, partial writes)
    - ABP backend scope?
      (Domain Service vs AppService,
       custom Repository methods, domain events,
       transaction boundaries)
    |
    v
[ VALIDATE FRS COMPLETENESS ]
    IF (all 17 sections populated AND
        brainstorm minimums met):
        HOLD in memory (do not save)
    ELSE:
        Complete sections, re-validate
    |
    v

end for (each operation_j)

end for (each module_i)

OUTPUT (held in memory):
- N FRS documents, all complete
- None written to disk yet


==============================================================
                PHASE 5 — SHARED CONTEXT ASSEMBLY
==============================================================

INPUT:
  Generated FRS documents (in memory)
  Enrichment map
  Module metadata
  |
  v
[ CONTEXT BUILDER ]
  |
  Assemble shared context block (travels with bundle):
  |
  - Project name: {System name}
  - Overview: One-paragraph description
  - Actors: Role list with ABP permission names
  - Non-functional requirements:
      * Performance (latency, throughput)
      * Security (auth, encryption, audit)
      * Availability (uptime, SLA)
      * Compliance (GDPR, HIPAA, PCI-DSS)
  - Open questions: Ambiguities needing stakeholder input
  - Assumptions: Inferred values, gaps filled
  - Out of scope: Explicitly excluded features
  |
  v
[ VALIDATE SHARED CONTEXT ]
  IF (all 7 fields non-empty):
    CONTINUE
  ELSE:
    Infer reasonable values, mark as assumptions
  |
  v

OUTPUT:
- Shared Context metadata
- Field validation: PASS


==============================================================
                PHASE 6 — FILE MANIFEST ASSEMBLY
==============================================================

INPUT:
  Generated FRS documents (in memory)
  Shared Context metadata
  |
  v
[ MANIFEST BUILDER ]
  |
  Create file manifest:
  
  | FRS ID | File Path                              | Status          |
  |--------|----------------------------------------|-----------------|
  | FRS-01 | docs/frs/[mod-slug]/FRS-01-[op-slug].md| pending-approval|
  | FRS-02 | docs/frs/[mod-slug]/FRS-02-[op-slug].md| pending-approval|
  | ...    | ...                                    | ...             |
  |
  v
[ VALIDATE MANIFEST ]
  IF (manifest rows == FRS documents generated):
    CONTINUE
  ELSE:
    Reconcile before proceeding
  |
  v

OUTPUT:
- File manifest (all entries: pending-approval)
- Count: N FRS documents awaiting review


==============================================================
                PHASE 7 — INTERACTIVE REVIEW LOOP
        (Present, Approve, Save, Repeat)
==============================================================

for each frs_i in manifest (in sequence, grouped by module):

    |
    v

    ┌────────────────────────────────────────────────────────┐
    | PRESENT NEXT FRS                                       |
    |                                                        |
    | Header:                                                |
    | ─────────────────────────────────────────────          |
    | 📄 FRS {current} of {total}  ·  {Module Name}         |
    | ─────────────────────────────────────────────          |
    |                                                        |
    | [Print full FRS document: all 17 sections]             |
    |                                                        |
    | Prompt: "Does this look good, or would you like to    |
    | change anything before I save it?"                    |
    │                                                        |
    │ WAIT FOR REPLY (BLOCKING)                             |
    └────────────┬───────────────────────────────────────────┘
                 |
        (blocking user response)
                 |
                 v

        IF (reply == "yes" or "approved"):
            |
            v
        [ SAVE FILE IMMEDIATELY ]
            |
            Create directory: mkdir -p docs/frs/{module-slug}
            Write file: docs/frs/{module-slug}/FRS-{NN}-{op-slug}.md
            Confirm: ✅ Saved: {filePath}
            Update manifest: status → "saved"
            |
            v

        ELSE IF (reply == "change" or contains suggestion):
            |
            v
        [ APPLY CHANGE INLINE ]
            |
            IF (change violates HARD-GATE or removes section):
                Explain conflict, ask to rephrase
            ELSE:
                Apply change to FRS in memory
                Re-print affected section only
                Prompt: "Does that look right now?"
                WAIT FOR CONFIRMATION (BLOCKING)
            |
            v
        [ LOOP: Re-show section until approved ]
            |
            (return to "APPROVE" branch above)
            |
            v

        ELSE IF (reply == "skip"):
            |
            v
        [ MARK SKIPPED ]
            |
            Do not write file
            Update manifest: status → "skipped"
            |
            v

        ELSE IF (reply == "stop"):
            |
            v
        [ HALT REVIEW ]
            |
            Save any files already approved
            Jump to Phase 8 (Print Summary)
            |
            v

        ENDIF
        |
        v

    [ MORE FRS REMAINING? ]
    |
    IF (next FRS exists):
        Loop back to PRESENT NEXT FRS
    ELSE:
        Proceed to Phase 8
    |
    v

end for (each frs_i)


==============================================================
                PHASE 8 — FINALIZATION & HANDOFF
==============================================================

INPUT:
  File manifest (with status updates)
  Generated FRS documents
  Shared Context metadata
  |
  v
[ SUMMARY PRINTER ]
  |
  Print:
  
    ✅ FRS review complete!
    
      Saved:   {N} files
      Skipped: {N} files
    
      docs/frs/{mod-slug}/FRS-01-[op-slug].md       ✅ saved
      docs/frs/{mod-slug}/FRS-02-[op-slug].md       ✅ saved
      ...
      docs/frs/{mod-slug}/FRS-N-[op-slug].md        ⏭ skipped
  |
  v

[ PIPELINE HANDOFF ]
  |
  Print:
  
    ✅ FRS set complete!
    
    Bundle ID:        FRS-BUNDLE-{YYYYMMDD}-{NNN}
    Total FRS docs:   {N} across {M} modules
    Files saved:      {N} / {total}
    Business Rules:   {N} total (aggregated)
    Edge Cases:       {N} total (aggregated)
    Compliance Flags: {list or none}
    Open Questions:   {N}
    
    Next steps:
      → Run /milestone-planning to plan GitLab milestones
      → Run /feat-spec-generator to create ABP tech design
  |
  v

OUTPUT (final):
- All approved FRS files written to disk
- Summary report
- Ready for downstream skill consumption


==============================================================
                FRS DOCUMENT STRUCTURE
            (17 Sections per FRS Document)
==============================================================

Each FRS document contains:

1.   Metadata (ID, operation, HTTP verb, endpoints)
2.   Overview (one-paragraph operation summary)
3.   Actors (roles with ABP permission names)
4.   Inputs (required + optional fields with types)
5.   Outputs (response fields + success conditions)
6.   Business Rules (≥2 rules: permissions, state, constraints)
7.   State Transitions (before/after states if applicable)
8.   Preconditions (what must be true before operation)
9.   Success Criteria (definition of successful operation)
10.  Edge Cases (≥2 cases: soft-delete, missing relations, races)
11.  Exception Flows (≥1 flow: DB down, auth failure, partial writes)
12.  Side Effects (notifications, cascades, domain events)
13.  Compliance & Audit (GDPR, HIPAA, PCI-DSS flags)
14.  Assumptions (inferred values, unstated constraints)
15.  Open Questions (ambiguities requiring clarification)
16.  ABP Backend Scope (Domain Service vs AppService, Repos,
                        domain events, transaction boundaries)
17.  References (related operations, schemas, designs)


==============================================================
                AGENT / COMPONENT DEFINITIONS
==============================================================

==============================================================
                INPUT PARSER (STRATEGY)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - User-provided input (UI prototype, wireframes,           |
|    module list, feature description)                        |
|                                                             |
| RESPONSIBILITY:                                             |
|  - Verify input is text-based (refuse binary/images)        |
|  - Extract modules and backend operations from visual/text  |
|  - Ignore frontend concerns (styling, chrome, animation)    |
|  - Verify at least one module with one operation exists     |
|  - Verify project/system name is identifiable              |
|                                                             |
| OUTPUT:                                                     |
|  - Identified modules (with slugs)                          |
|  - Backend operations per module (verb + entity + path)     |
|  - Project name                                             |
|  - Input classification                                     |
|                                                             |
| GUARANTEE:                                                  |
|  - No module is included without at least one operation     |
|  - All operations are backend-only (no UI concerns)         |
|  - Project name always present before proceeding            |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

==============================================================
                INTERVIEW AGENT (OPTIONAL DISCOVERY)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - Identified modules and operations                        |
|  - User requests interview_mode = true                      |
|                                                             |
| RESPONSIBILITY:                                             |
|  - Ask 8 structured questions (one at a time, blocking)     |
|  - Collect business rules, constraints, compliance reqs     |
|  - Tag rules to modules or mark cross-cutting               |
|  - Produce enrichment map for downstream generators         |
|                                                             |
| OUTPUT:                                                     |
|  - User-provided business rules (tagged to modules)         |
|  - Compliance requirements list                             |
|  - Cross-cutting rules (if any)                             |
|  - Open questions (if any ambiguities noted)                |
|                                                             |
| GUARANTEE:                                                  |
|  - Every rule is tagged or marked cross-cutting             |
|  - All 8 questions asked (unless user stops early)          |
|  - No assumptions made; enrichment is user-provided         |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

==============================================================
                ENRICHMENT INGESTER (DISCOVERY)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - Meeting notes (optional)                                 |
|  - Business rules (optional)                                |
|  - Compliance requirements (optional)                       |
|  - Interview results (optional)                             |
|                                                             |
| RESPONSIBILITY:                                             |
|  - Extract business rules, constraints, decisions           |
|  - Tag each rule to a module or mark cross-cutting          |
|  - Flag compliance requirements for injection               |
|  - Resolve unattributable rules (mark cross-cutting)        |
|                                                             |
| OUTPUT:                                                     |
|  - Structured enrichment map (rules → modules)              |
|  - Compliance flag list                                     |
|  - Cross-cutting rules                                      |
|  - Open questions (unresolved ambiguities)                  |
|                                                             |
| GUARANTEE:                                                  |
|  - Every rule is either tagged to a module or               |
|    marked cross-cutting (no unattributed rules)             |
|  - Compliance requirements never lost or dropped            |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

==============================================================
                FRS GENERATOR (GENERATION)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - Identified modules + operations                          |
|  - Enrichment map (rules, compliance, open questions)       |
|  - Shared context metadata                                  |
|                                                             |
| RESPONSIBILITY:                                             |
|  - Populate all 17 FRS sections per operation               |
|  - Apply Brainstorm Superpower (rules, edge cases, flows)   |
|  - Ensure ≥2 business rules, ≥2 edge cases, ≥1 flow/op      |
|  - Validate ABP backend scope (no frontend)                 |
|  - Hold all documents in memory (do not write yet)          |
|                                                             |
| OUTPUT:                                                     |
|  - N complete FRS documents (held in memory)                |
|  - All brainstorm minimums met                              |
|                                                             |
| GUARANTEE:                                                  |
|  - Every FRS has all 17 sections fully populated            |
|  - Every FRS meets brainstorm minimums:                     |
|    ≥2 business rules, ≥2 edge cases, ≥1 exception flow      |
|  - No file written to disk before user approval             |
|  - ABP backend scope only (no UI, styling, chrome)          |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

==============================================================
                BRAINSTORM SUPERPOWER
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - Incomplete or inferred business rules, edge cases,       |
|    exception flows                                          |
|                                                             |
| RESPONSIBILITY:                                             |
|  - Apply reasoning framework to infer missing rules:        |
|    What prevents operation? Constraints? Undo? Side effects?|
|  - Infer missing edge cases:                                |
|    Soft-delete, missing relations, races, contradictions    |
|  - Infer missing exception flows:                           |
|    DB unavailable, auth failure, partial writes             |
|  - Infer ABP backend scope:                                 |
|    Domain Service vs AppService, custom Repos, events       |
|                                                             |
| OUTPUT:                                                     |
|  - Enriched business rules (≥2 per FRS)                     |
|  - Enriched edge cases (≥2 per FRS)                         |
|  - Enriched exception flows (≥1 per FRS)                    |
|  - ABP scope decisions (Domain Service, Repos, events)      |
|                                                             |
| GUARANTEE:                                                  |
|  - Brainstorm minimums always met:                          |
|    ≥2 rules, ≥2 edge cases, ≥1 exception flow               |
|  - No user input needed; pure inference                     |
|  - All inferred content flagged as assumptions              |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

==============================================================
                SHARED CONTEXT BUILDER (ASSEMBLY)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - Generated FRS documents (in memory)                      |
|  - Enrichment map and open questions                        |
|  - Project metadata                                         |
|                                                             |
| RESPONSIBILITY:                                             |
|  - Assemble 7-field shared context block:                   |
|    Project name, Overview, Actors, NFRs,                   |
|    Open questions, Assumptions, Out of scope               |
|  - Ensure all 7 fields are non-empty                        |
|  - Infer reasonable values where gaps exist                 |
|                                                             |
| OUTPUT:                                                     |
|  - Shared Context metadata (7 fields)                       |
|  - Validation: PASS (all fields non-empty)                  |
|                                                             |
| GUARANTEE:                                                  |
|  - Every shared context field populated                     |
|  - Inferred values marked as assumptions                    |
|  - No nil/empty fields in final context                     |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

==============================================================
                MANIFEST BUILDER (ASSEMBLY)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - Generated FRS documents (in memory)                      |
|  - Module slugs and operation slugs                         |
|                                                             |
| RESPONSIBILITY:                                             |
|  - Create file manifest table (FRS ID, file path, status)   |
|  - Set all entries to status: pending-approval              |
|  - Validate manifest row count == FRS document count        |
|                                                             |
| OUTPUT:                                                     |
|  - File manifest (N rows, all pending-approval)             |
|  - Count: N FRS documents awaiting review                   |
|                                                             |
| GUARANTEE:                                                  |
|  - Manifest has exactly one row per FRS document            |
|  - All entries start with status: pending-approval          |
|  - Manifest count reconciled before proceeding              |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

==============================================================
                REVIEW LOOP ORCHESTRATOR (REVIEW)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - Generated FRS documents (in memory)                      |
|  - File manifest (all pending-approval)                     |
|  - User interactions (approve/change/skip/stop)             |
|                                                             |
| RESPONSIBILITY:                                             |
|  - Present one FRS at a time (full 17 sections)             |
|  - Wait for user response (blocking)                        |
|  - Route to: Save, Apply Change, Mark Skip, Halt            |
|  - Update manifest status (saved/skipped)                   |
|  - Loop until all FRS reviewed or user stops                |
|                                                             |
| OUTPUT:                                                     |
|  - Updated manifest (status per FRS)                        |
|  - Saved count + Skipped count                              |
|  - Ready for Phase 8 (Summary & Handoff)                    |
|                                                             |
| GUARANTEE:                                                  |
|  - One FRS shown at a time (no bulk dumps)                  |
|  - User can change, skip, or stop any FRS                  |
|  - Files only written on explicit per-FRS approval          |
|  - Loop blocks until user responds                          |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

==============================================================
                FILE SYNC AGENT (FINALIZATION)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - Generated FRS document (in memory)                       |
|  - Module slug, operation slug                              |
|  - User approval (explicit)                                 |
|                                                             |
| RESPONSIBILITY:                                             |
|  - Create directory: mkdir -p docs/frs/{module-slug}        |
|  - Write file: docs/frs/{module-slug}/FRS-{NN}-{op-slug}.md |
|  - Confirm save: ✅ Saved: {filePath}                       |
|  - Update manifest entry: status → saved                    |
|                                                             |
| OUTPUT:                                                     |
|  - Written .md file on disk                                 |
|  - Confirmation message                                     |
|  - Updated manifest                                         |
|                                                             |
| GUARANTEE:                                                  |
|  - Files ONLY written after explicit user approval          |
|  - Directory created before write                           |
|  - Confirmation printed to user                             |
|  - Manifest immediately updated                             |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

==============================================================
                SUMMARY PRINTER (FINALIZATION)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - Final manifest (all FRS reviewed)                        |
|  - Generated FRS documents (for aggregation)                |
|  - Shared Context metadata                                  |
|                                                             |
| RESPONSIBILITY:                                             |
|  - Print FRS review summary (saved + skipped counts)        |
|  - Print pipeline handoff metadata:                         |
|    Bundle ID, FRS count, modules, rules, compliance flags   |
|  - Print next steps: /milestone-planning or               |
|    /feat-spec-generator                                     |
|                                                             |
| OUTPUT:                                                     |
|  - Review completion summary                                |
|  - Pipeline handoff block with bundle metadata              |
|  - User ready to proceed downstream                         |
|                                                             |
| GUARANTEE:                                                  |
|  - Summary always printed at end of workflow                |
|  - Handoff signals generation (Pipeline ready)              |
|  - Bundle ID generated with timestamp + sequence            |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


==============================================================
                AGENT INVOCATION MAP
==============================================================

/frs-generator
        |
        +-----> [ INPUT PARSER ]
        |           |
        |           +-----> Check HARD-GATE (input, modules, name)
        |           |
        |           v
        |           (decision) interview_mode?
        |           |
        |           +-----> YES: [ INTERVIEW AGENT ]
        |           |           |
        |           |           +-----> Ask 8 questions (blocking)
        |           |           |
        |           |           v
        |           |           [ ENRICHMENT COLLECTED ]
        |           |
        |           +-----> NO: [ SKIP INTERVIEW ]
        |                       |
        |                       v
        |                   (proceed to enrichment ingestion)
        |
        +-----> [ ENRICHMENT INGESTER ]
        |           |
        |           +-----> Extract rules from meeting notes (opt.)
        |           +-----> Extract rules from business rules (opt.)
        |           +-----> Flag compliance requirements
        |           |
        |           v
        |           [ ENRICHMENT MAP ]
        |
        +-----> [ FRS GENERATOR ] (loop per module)
        |           |
        |           +-----> for each operation_j:
        |           |           |
        |           |           +-----> [ DERIVE METADATA ]
        |           |           |
        |           |           +-----> [ POPULATE 17 SECTIONS ]
        |           |           |
        |           |           +-----> [ APPLY BRAINSTORM ]
        |           |           |
        |           |           v
        |           |       [ VALID FRS-NN ]
        |           |
        |           v
        |           [ N FRS DOCUMENTS (in memory) ]
        |
        +-----> [ SHARED CONTEXT BUILDER ]
        |           |
        |           v
        |           [ SHARED CONTEXT (7 fields) ]
        |
        +-----> [ MANIFEST BUILDER ]
        |           |
        |           v
        |           [ FILE MANIFEST (pending-approval) ]
        |
        +-----> [ REVIEW LOOP ORCHESTRATOR ]
        |           |
        |           +-----> for each frs_i:
        |           |           |
        |           |           +-----> PRESENT FRS (full doc)
        |           |           |
        |           |           +-----> WAIT USER RESPONSE (blocking)
        |           |           |
        |           |           +-----> (if approved)
        |           |           |           |
        |           |           |           v
        |           |           |       [ FILE SYNC AGENT ]
        |           |           |           |
        |           |           |           v
        |           |           |       [ FILE WRITTEN ]
        |           |           |
        |           |           +-----> (if change requested)
        |           |           |           |
        |           |           |           v
        |           |           |       [ APPLY CHANGE ]
        |           |           |       [ RE-SHOW SECTION ]
        |           |           |       [ LOOP UNTIL APPROVED ]
        |           |           |
        |           |           +-----> (if skipped)
        |           |           |           |
        |           |           |           v
        |           |           |       [ MARK SKIPPED ]
        |           |           |
        |           |           +-----> (if stop)
        |           |               |
        |           |               v
        |           |               [ HALT REVIEW ]
        |           |
        |           v
        |           [ MANIFEST UPDATED ]
        |
        +-----> [ SUMMARY PRINTER ]
        |           |
        |           v
        |           [ FRS REVIEW COMPLETE ]
        |           [ BUNDLE METADATA ]
        |           [ NEXT STEPS (milestone-planning OR feat-spec-generator) ]
        |
        v
    READY FOR DOWNSTREAM SKILLS


==============================================================
                FINAL OUTPUT
==============================================================

FRS Bundle:
  Bundle ID: FRS-BUNDLE-{YYYYMMDD}-{NNN}

FRS Documents (N total):
  docs/frs/{module-slug}/FRS-01-[operation-slug].md      ✅ saved
  docs/frs/{module-slug}/FRS-02-[operation-slug].md      ✅ saved
  docs/frs/{module-slug}/FRS-NN-[operation-slug].md      ⏭ skipped

Shared Context:
  - Project name: {system_name}
  - Overview: {one-paragraph summary}
  - Actors: {role list with ABP permissions}
  - Non-functional requirements: {performance, security, etc.}
  - Open questions: {N unresolved ambiguities}
  - Assumptions: {N inferred values}
  - Out of scope: {explicitly excluded features}

Metadata:
  Total FRS docs:   {N}
  Modules:          {M}
  Files saved:      {N} / {total}
  Files skipped:    {N}
  Business Rules:   {N} total
  Edge Cases:       {N} total
  Exception Flows:  {N} total
  Compliance Flags: {list or none}


==============================================================
                KEY CHANGE (v1.0)
==============================================================

FRS GENERATION SKILL CHARACTERISTICS:

EXISTS ONLY FOR:

→ Starting the SDLC pipeline from UI artifacts
→ Extracting backend requirements from prototypes
→ Producing production-grade FRS documents
→ ABP Framework (.NET) backend projects

NOT FOR:

- Converting existing FRS to technical design
  (use /feat-spec-generator instead)
- Planning GitLab milestones from FRS
  (use /milestone-planning instead)
- Writing requirements for non-.NET backends
- Generating UI specs or frontend requirements
- Creating test plans or QA scenarios


==============================================================
                SYSTEM GUARANTEES
==============================================================

1. HARD-GATE INTEGRITY
   - No operation proceeds without checking:
     a) Valid input provided (not binary/image-only)
     b) At least one module with one operation
     c) Project name identifiable
     d) User approval-per-FRS before file write

2. FRS COMPLETENESS
   - Every generated FRS has all 17 sections populated
   - Every FRS meets brainstorm minimums:
     ≥2 business rules, ≥2 edge cases, ≥1 exception flow
   - No incomplete documents shown to user

3. INTERVIEW INTEGRITY
   - If interview_mode = true, all 8 questions asked
   - One question at a time, blocking (no batch)
   - User responses never silently ignored

4. FILE WRITE SAFETY
   - No file written without explicit per-FRS approval
   - Files written immediately on approval
   - Directory created before write
   - Manifest updated immediately after write

5. REVIEW LOOP DISCIPLINE
   - One FRS shown at a time (no bulk dumps)
   - Review loop blocks on user response
   - Changes applied inline, re-shown to user
   - User can skip or stop at any point

6. MANIFEST CORRECTNESS
   - Manifest rows == FRS documents (always reconciled)
   - Status progression: pending-approval → saved OR skipped
   - Final summary counts verified

7. PIPELINE HANDOFF READINESS
   - Bundle ID always generated with timestamp + sequence
   - Next steps clear: /milestone-planning OR /feat-spec-generator
   - All metadata available for downstream skills

8. ABP BACKEND SCOPE
   - No UI components, styling, or chrome specs
   - Only backend operations (HTTP verbs + entities)
   - Domain Service vs AppService decisions made
   - Custom Repository methods identified
   - Domain events and transaction boundaries captured


==============================================================
                CONSTRAINTS & INVARIANTS
==============================================================

HARD CONSTRAINTS:

- No file saved without explicit per-FRS user approval
- No bulk file writes at end; save immediately per approval
- One FRS shown at a time during review (no batch dumps)
- User response always required; never guess intent
- All 8 interview questions asked if interview_mode = true
- Brainstorm minimums never negotiable:
  ≥2 rules, ≥2 edge cases, ≥1 exception flow per FRS
- Project name and modules verified before proceeding
- Shared context all 7 fields always non-empty

SOFT CONSTRAINTS (inferred if not provided):

- Open questions and assumptions marked when inferred
- ABP backend scope inferred via brainstorm if not explicit
- Compliance flags inferred from rules if not stated
- Non-functional requirements inferred as reasonable defaults


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                    END BLUEPRINT v1.0
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

# SKILL: Blueprint Wireframe Generator
**Version:** 1.0  
**Type:** orchestrator_skill  
**Trigger:** User asks to design a system, workflow, agent pipeline, or architectural blueprint in structured ASCII wireframe format.

---

## PURPOSE

Generate a structured ASCII wireframe document that captures system architecture, agent/component roles, phase flows, and guarantees — following the R2G Blueprint style.

---

## WIREFRAME ANATOMY

Every blueprint wireframe is composed of the following canonical sections. Use only the sections relevant to the system being described.

---

### SECTION 1 — HEADER BLOCK

```
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
              <SYSTEM NAME> v<VERSION>
        (<SUBTITLE OR ROLE DESCRIPTION>)
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

**Fields:**
- `SYSTEM NAME` — Short identifier (e.g. R2G ORCHESTRATOR, AUTH PIPELINE)
- `VERSION` — Semantic version (e.g. v1.0, v3.2)
- `SUBTITLE` — One-line descriptor of the system's primary role

---

### SECTION 2 — CONTROL PLANE (LAYER 0)

```
[ LAYER 0 — CONTROL PLANE ]
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| <CONFIG FILE OR ROOT RULE>                                  |
|                                                             |
| CORE RULES:                                                 |
| - <rule 1>                                                  |
| - <rule 2>                                                  |
|                                                             |
| CONFLICT RULE:                                              |
| - <condition> → <action>                                    |
|                                                             |
| CONSTRAINTS:                                                |
| - <constraint>                                              |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

**Use when:** The system has global invariants, config files, or hard rules that govern all layers beneath it.

---

### SECTION 3 — ORCHESTRATOR / ENTRY POINT (LAYER 1)

```
[ LAYER 1 — ORCHESTRATOR ]
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| /<command-or-trigger>                                       |
| type: <skill_type>                                          |
|                                                             |
| RESPONSIBILITY:                                             |
| - <responsibility 1>                                        |
| - <responsibility 2>                                        |
|                                                             |
| OUTPUT (FINAL ONLY):                                        |
|  - <output field 1>                                         |
|  - <output field 2>                                         |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

**Use when:** There is a single entry-point skill or command that coordinates all downstream work.

---

### SECTION 4 — PHASE BLOCKS

Use `======` dividers to separate named phases. Each phase should have:
- A clear phase title
- One or more `[ Component ]` nodes
- Directional flow arrows using `|`, `v`, `→`
- Output declarations

```
==============================================================
                PHASE <N> — <PHASE NAME>
==============================================================

INPUT
  |
  v
[ <Component Name> ]
  |
  v

OUTPUT:
- <output A>
- <output B>
```

**Naming convention for phases:**
| Phase Type        | Suggested Name           |
|-------------------|--------------------------|
| Analysis/Planning | STRATEGY / DISCOVERY     |
| Decision Point    | RESOLUTION / GATE        |
| Lock-in           | DOMAIN LOCK-IN / COMMIT  |
| Execution         | EXECUTION / PROCESSING   |
| Output/Sync       | SYNC / DELIVERY / OUTPUT |

---

### SECTION 5 — CONDITIONAL USER GATE

Use this block when human input is required — but **only** when truly needed (ambiguity, irreversible decision, etc.).

```
==============================================================
        <GATE NAME> (CONDITIONAL USER GATE)
==============================================================

        IF (<condition A>):
                |
                v
        [ <auto action> ]
                |
                v
             CONTINUE


        IF (<condition B — ambiguous>):
                |
                v

        ┌────────────────────────────────────────────┐
        | USER GATE (ONLY HERE)                      |
        |                                            |
        | "<Prompt shown to user>"                   |
        |                                            |
        | 1. Option A (weight: <x>)                  |
        | 2. Option B (weight: <y>)                  |
        |                                            |
        | Select ONE                                 |
        └───────────────┬────────────────────────────┘
                        |
                  (BLOCKING)
                        |
                        v
           [ <result variable> ]
```

**Rule:** Gates must be labeled `(BLOCKING)` if the system cannot proceed without user input.

---

### SECTION 6 — ITERATION LOOP

Use when a step must repeat over a collection of items.

```
==============================================================
        <LOOP NAME> (PER <ITEM>)
==============================================================

for each <item>_i:

    |
    v
[ <Agent/Component> ]
    |
    v
[ <Validation Step> ]
    |
    v
(if invalid → refine loop)
    |
    v
[ VALID <item>_i ]
    |
    v
[ <Sync/Store Step> ]
    |
    v
store: (<field_1>, <field_2>)

end loop
```

---

### SECTION 7 — AGENT / COMPONENT DEFINITIONS

For each named agent or component, define it using the boxed format:

```
==============================================================
                <Agent Name> (<ROLE LABEL>)
==============================================================

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
| INPUT:                                                      |
|  - <input field 1>                                          |
|  - <input field 2>                                          |
|                                                             |
| RESPONSIBILITY:                                             |
|  - <what this agent does>                                   |
|                                                             |
| OUTPUT:                                                     |
|  - <output field 1>                                         |
|                                                             |
| GUARANTEE:                                                  |
|  <invariant this agent upholds>                             |
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

**Roles to use as labels:**
- `FORKED` — spawned as a parallel subprocess
- `ENFORCER` — validates or rejects
- `ROUTER` — dispatches to sub-agents
- `SYNC` — external I/O or persistence layer
- `RESOLVER` — resolves conflicts or ambiguity

---

### SECTION 8 — AGENT INVOCATION MAP

Visualize the full call tree using ASCII tree notation:

```
==============================================================
                AGENT INVOCATION MAP
==============================================================

/<entry-point>
        |
        +-----> <Agent A> (forked)
        |
        +-----> (conditional) USER GATE
        |
        +-----> <Agent B> (milestone)
        |
        +-----> loop <item>_i:
        |           |
        |           +-----> <Sub-Agent X>
        |           |
        |           +-----> <Sub-Agent Y>
        |
        +-----> return final output
```

---

### SECTION 9 — FINAL OUTPUT

```
==============================================================
                FINAL OUTPUT
==============================================================

<Primary Entity>: <Value>

<Collection Name>:
- <Item A> → <ID or Result>
- <Item B> → <ID or Result>
- <Item C> → <ID or Result>
```

---

### SECTION 10 — KEY CHANGES / CHANGELOG

```
==============================================================
                KEY CHANGE (v<X.Y>)
==============================================================

<FEATURE OR GATE> EXISTS ONLY FOR:

→ <intended use case>

NOT FOR:
- <anti-pattern 1>
- <anti-pattern 2>
```

---

### SECTION 11 — SYSTEM GUARANTEES

```
==============================================================
                SYSTEM GUARANTEES
==============================================================

- <guarantee 1>
- <guarantee 2>
- <guarantee 3>
- <guarantee 4>
```

---

### SECTION 12 — FOOTER

```
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                    END BLUEPRINT v<X.Y>
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

---

## STYLE RULES

| Element              | Style                              |
|----------------------|------------------------------------|
| Phase dividers       | `======` (62 chars)                |
| Box borders          | `- - -` dashed lines (62 chars)    |
| Box content lines    | `\| ... \|` padded to 62 chars     |
| Section headers      | UPPERCASE, centered inside `======`|
| Component nodes      | `[ Name ]` in square brackets      |
| Flow arrows          | `\|` vertical, `v` downward, `→` horizontal |
| Conditional branches | `IF (condition):` blocks           |
| Loop bounds          | `for each X_i:` / `end loop`      |
| Variables            | `<snake_case>`                     |
| Blocking labels      | `(BLOCKING)` inline                |

---

## GENERATION WORKFLOW

When asked to create a blueprint wireframe, follow these steps:

1. **Extract system intent** — What does this system do? What is its entry point?
2. **Identify components** — List all agents, services, or steps involved.
3. **Map the flow** — Determine phases: strategy → resolution → execution → output.
4. **Detect gates** — Are there decision points requiring human input?
5. **Detect loops** — Are there repeated operations over a collection?
6. **Define guarantees** — What invariants must the system uphold?
7. **Render sections** — Assemble only the sections relevant to the system.
8. **Add version + changelog** — Note what changed from prior version, if applicable.

---

## EXAMPLE INVOCATION

**User prompt:**
> "Create a blueprint for an AI content moderation pipeline with human escalation."

**Expected output sections:**
- Header Block
- Control Plane (moderation policy rules)
- Orchestrator (trigger: `/moderate-content`)
- Phase 1 — Strategy (classifier agents)
- Conditional User Gate (escalation if confidence < threshold)
- Phase 2 — Execution (flagging, tagging)
- Agent Definitions: Classifier, Escalation-Router, Audit-Sync
- Invocation Map
- Final Output
- System Guarantees

---

*END OF SKILL*

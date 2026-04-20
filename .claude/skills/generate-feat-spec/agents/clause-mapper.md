# Sub-agent Contract: `clause-mapper`

## Purpose

Map every `ddd-mapped` clause to exactly one primary Feat Spec category. Escalate ambiguous or unresolvable clauses to Conflicts. Mapping traces stay inside this sub-agent; the main agent receives only assignments.

`ui-integration` clauses are passed through untouched — they go directly to Phase 8 assembly.

## Model

Sonnet. Judgment on rule application and ambiguity detection.

## Tools

None.

## Input

```
{
  "clauses": [
    {
      "clause_key": "<key>",
      "source_iid": <int>,
      "source_url": "<deep link>",
      "source_label": "<FRS #N — Section>",
      "source_intended_nodes": ["Actor", "Entity", ...],
      "text": "<clause text>",
      "classification": "ddd-mapped",
      "tenancy_signals": [...]
    }
  ],
  "module_assignments": {
    "<clause_key>": {
      "module": "<module>",
      "sub_module": "<sub-module>",
      "bounded_context": "<context>"
    }
  },
  "mapping_rule_table": [
    {"if": "<condition>", "primary_category": "<category>", "reference_file": "<path>"}
  ]
}
```

The `mapping_rule_table` is passed from SKILL.md's Phase 6 table.

## Responsibility

1. For each clause, evaluate the rule table top-to-bottom. First match wins.
2. `source_intended_nodes` is a **prior, not a filter** — start within the intended set but allow any category to win on content.
3. Assign `primary_category`.
4. Record `secondary_categories` if the clause also influences others (e.g., a Command clause that also appears in a Flow step).
5. Flag Conflicts when:
   - No rule matches (`no_match`).
   - Multiple top-priority rules match equally (`multi_match`).
   - Clause contradicts another already mapped (`contradiction`).
   - Implies an ABP built-in but wording is ambiguous (`builtin_ambiguity`).
   - Tenancy or entity scope unclear (`scoping_ambiguity`).
   - Command missing implied preconditions/postconditions (`missing_precondition`, `missing_postcondition`).
   - UI-API clause implies a Command/Query that doesn't exist (`missing_command`, `missing_query`) — see UI-API Integration Points gap analysis.
6. For each Conflict: populate `conflict_type`, `blocking_severity`, `affected_categories`, `resolution_question`.
7. Verify: every `ddd-mapped` clause appears exactly once in `mappings` (non-Conflict primary) OR `conflicts`.

## Returns

```
{
  "mappings": [
    {
      "clause_key": "<key>",
      "primary_category": "Actor|Entity|ValueObject|Command|Query|Flow|State|Decision|Integration|ArchitectureBlueprint",
      "reference_file": "<path>",
      "secondary_categories": [...],
      "rule_matched": "<verbatim rule>",
      "proposed_node_name": "<PascalCase>",
      "module": "<from module_assignments>",
      "sub_module": "<...>",
      "source_url": "<preserved from input>",
      "source_label": "<preserved from input>"
    }
  ],
  "conflicts": [
    {
      "conflict_id": "Conflict-NN",
      "clause_key": "<key>",
      "source_iid": <int>,
      "source_url": "<deep link>",
      "source_label": "<label>",
      "conflict_type": "no_match|multi_match|contradiction|builtin_ambiguity|scoping_ambiguity|missing_precondition|missing_postcondition|missing_command|missing_query|other",
      "blocking_severity": "critical|high|medium|low",
      "description": "<1-2 sentences>",
      "affected_categories": [...],
      "resolution_question": "<specific answerable question>"
    }
  ],
  "stats": {
    "input_clauses": <int>,
    "mapped": <int>,
    "conflicts": <int>,
    "unmapped_remaining": <int>
  }
}
```

## Enforcement

- `stats.unmapped_remaining` MUST be 0. Unmapped clauses must appear in `conflicts` with `conflict_type: no_match`.
- Every Conflict has a specific, answerable `resolution_question` — "clarify the requirement" is not acceptable.
- `proposed_node_name` is PascalCase. Verb-prefixed for Commands, Get/List-prefixed for Queries, noun for Entities.
- No bare `System` as proposed Actor name — use `System: BackgroundJob: <JobName>` or route to triggering Command.
- `secondary_categories` MUST NOT include `primary_category`.
- If `tenancy_summary.both_present` was true and the main agent already created a `scoping_ambiguity` Conflict, reference the existing conflict_id rather than creating a duplicate.
- `source_url` and `source_label` are always preserved from input — they carry forward to `ddd-synthesizer`.

## Main agent uses this output to

- Verify unmapped = 0 before Phase 7.
- Pass mappings + conflicts to `ddd-synthesizer`.
- Count critical/high Conflicts for Open Blockers section.
- Feed `missing_query` / `missing_command` Conflicts into UI-API Integration Points gap analysis.

# GitLab Coordination Issue Template

Short artifact created in GitLab in Phase 11 after all wiki files are written and verified. The issue is a pointer to the wiki Feat Spec — not a duplicate of its content.

**Rendering rules:**

- Canonical Feat Spec link uses full `<wiki_url>`, no `.md`, no `<wiki_local_path>` prefix.
- FRS references use `<gitlab_base_url>/issues/<iid>` format.
- Source deep-links (in Open Blockers) use GitLab section-anchor URLs — no opaque clause IDs.

---

## Issue Title

```
[FEAT] <Milestone Title> — <Feature Short Title>
```

---

## Issue Body

### With Open Blockers (critical/high Conflicts present)

```markdown
## Summary

<2–4 sentence paragraph describing what this feature does and why. Plain prose; no bullet lists.>

## Specification

- Canonical spec: [feat-spec](<wiki_url>/feat-specs/<slug>/feat-spec)
- Wiki root: [DDD node pages](<wiki_url>/<wiki_local_path_with_no_prefix_if_root>)

## Related FRS

- #11 — <Title>
- #12 — <Title>

## Open Blockers

1. **Conflict-01 — <short title>** (severity: critical)
   <description>
   Resolution needed: <resolution question>
   Source: [FRS #11 — <Section>](<gitlab_base_url>/issues/11#<slug>)
   See: [Conflict-01](<wiki_url>/conflicts/Conflict-01)

2. **Conflict-03 — <short title>** (severity: high)
   <description>
   Resolution needed: <resolution question>
   Source: [FRS #12 — <Section>](<gitlab_base_url>/issues/12#<slug>)
   See: [Conflict-03](<wiki_url>/conflicts/Conflict-03)

## Halted Issues

- #14 — monolith detected; see split suggestion in Feat Spec section 4.
```

### Without Open Blockers

```markdown
## Summary

<2–4 sentence paragraph describing what this feature does and why.>

## Specification

- Canonical spec: [feat-spec](<wiki_url>/feat-specs/<slug>/feat-spec)

## Related FRS

- #11 — <Title>
- #12 — <Title>
```

Omit the Open Blockers and Halted Issues sections entirely when there's nothing to list.

---

## Constraints

- **Body stays under ~30 lines of rendered Markdown.** If it grows beyond that, something belongs in the wiki instead.
- **No DDD tables.** No attribute tables, DTO fields, Permissions Map, or ABP Artifact Map in the issue body.
- **No duplicated Feat Spec content.** Summary only.
- **Canonical spec link is the first substantive line** after Summary — reviewers should not have to scroll to find it.
- **FRS references use short form** (`#11 — Title`). GitLab auto-renders these as issue links within the project.
- **Open Blockers block is duplicated verbatim** from Feat Spec section 3. If Feat Spec has no section 3, issue has no Open Blockers.
- **Rendered wiki links strip `.md`** and the `wiki_local_path` prefix. Never write `[feat-spec.md](...)` or `[docs/feat-specs/...](...)`.

---

## Example (Amnil Trade Finance)

Given:

- `wiki_url = http://localhost:8080/root/trade-finance/-/wikis`
- `gitlab_base_url = http://localhost:8080/root/trade-finance`
- Milestone: `User Request Management`
- Slug: `user-request-management`
- Source FRS: #11, #12
- One critical Conflict

**Title:**

```
[FEAT] User Request Management — Core request lifecycle
```

**Body:**

```markdown
## Summary

Lets customer-facing staff register, triage, and route incoming service requests against a single authoritative UserRequest record. Establishes the domain model, state machine, assignment flow, and public/private endpoints needed for Customer and Triage Officer interactions.

## Specification

- Canonical spec: [feat-spec](http://localhost:8080/root/trade-finance/-/wikis/feat-specs/user-request-management/feat-spec)

## Related FRS

- #11 — Customer request intake
- #12 — Triage and assignment

## Open Blockers

1. **Conflict-02 — Tenant vs entity scoping unclear for request assignment** (severity: critical)
   FRS #12 mentions both `TenantId` and `EntityId` on the assignment record but does not specify whether assignment scopes to the entity or the tenant.
   Resolution needed: Confirm whether one triage officer can assign requests across multiple business entities within the same tenant.
   Source: [FRS #12 — Assignment rules](http://localhost:8080/root/trade-finance/-/issues/12#5-assignment-rules)
   See: [Conflict-02](http://localhost:8080/root/trade-finance/-/wikis/conflicts/Conflict-02)
```

# Update-In-Place Edit Patterns

When the reconciler classifies an FS element as `UPDATE_IN_PLACE`, the planner emits an edit list and the synthesizer applies it via `str_replace`. This file specifies the anchor selection rules, the edit primitives, the unified-diff preview format, and the `FILE_DRIFT` detection discipline.

## Why str_replace and not full-file rewrite

Full-file rewrite is a destructive operation disguised as an update. It discards comments, reorders members, and makes the diff review impossible. `str_replace` edits are surgical — each edit touches exactly one place in the file, anchored on text the user can see in the diff preview.

## Anchor selection rules

An anchor is a string that appears **exactly once** in the current file content. The `str_replace` tool refuses non-unique anchors, and the planner pre-validates uniqueness using the scout's fingerprint data.

### Good anchors

- **Closing brace of a specific class body.** Example: the last `}` on a line that closes `<Feature>Permissions.Application` nested class. To make it unique, include surrounding context.
- **Specific method signature.** A full signature line like `public async Task<ApplicationDto> CreateAsync(CreateApplicationDto input)` is almost always unique.
- **Specific property declaration.** `public string Name { get; init; } = default!;` is unique if there's only one `Name` property in the file.
- **Specific using directive.** `using Volo.Abp.DependencyInjection;` is unique as a full line.

### Bad anchors

- Standalone `}` — occurs many times.
- `    return;` — not unique.
- `{` — obviously not unique.
- Comment lines that might appear in multiple places.

### Anchor enrichment

When a candidate anchor isn't unique, enrich with surrounding context:

- Include the preceding line.
- Include the declaration that opens the block.
- Include a distinguishing attribute, modifier, or type.

Example: closing brace of `ConfigureServices`:
```
public override void ConfigureServices(ServiceConfigurationContext context)
{
    context.Services.AddAutoMapperObjectMapper<LoanApplicationApplicationModule>();
    context.Services.AddScoped<ILoanApplicationMapper, LoanApplicationMapper>();
}
```
The closing `}` alone is not unique, but the three-line tail `...<LoanApplicationMapper>();\n}` is.

## Edit primitives

### `add-property`

**Anchor:** the last property declaration in the class body, plus the closing `}` of the class.

```
Anchor:
    public decimal Amount { get; init; }
}

Replacement:
    public decimal Amount { get; init; }
    public string Purpose { get; init; } = default!;
}
```

### `add-method`

**Anchor:** the closing `}` of the class body, with enough preceding context to be unique. Typically the last method's closing brace + the class's closing brace.

```
Anchor:
        return _mapper.MapToOutput(entity);
    }
}

Replacement:
        return _mapper.MapToOutput(entity);
    }

    [Authorize(LoanApplicationPermissions.Application.Reject)]
    public async Task<LoanApplicationDto> RejectAsync(Guid id, string reason)
    {
        var entity = await _repository.GetAsync(id);
        EnsureTenantOwnership(entity);
        entity.Reject(reason);
        await _repository.UpdateAsync(entity, autoSave: true);
        return _mapper.MapToOutput(entity);
    }
}
```

### `add-constant`

**Anchor:** the last `public const string ... = ...;` line in the nested class.

```
Anchor:
        public const string Delete = Default + ":Delete";
    }

Replacement:
        public const string Delete = Default + ":Delete";
        public const string Approve = Default + ":Approve";
    }
```

### `add-child-call` (for PermissionDefinitionProvider)

**Anchor:** the last `.AddChild(...)` call on the relevant permission variable, through its trailing semicolon.

```
Anchor:
        application.AddChild(LoanApplicationPermissions.Application.Delete, L("LoanApplicationManagement:Permission:Application:Delete"));

Replacement:
        application.AddChild(LoanApplicationPermissions.Application.Delete, L("LoanApplicationManagement:Permission:Application:Delete"));
        application.AddChild(LoanApplicationPermissions.Application.Approve, L("LoanApplicationManagement:Permission:Application:Approve"));
```

### `add-rule` (for FluentValidation validators)

**Anchor:** the last `RuleFor(...)` chain's closing semicolon.

```
Anchor:
        RuleFor(x => x.Amount)
            .GreaterThan(0)
            .WithMessage(_localizer[LoanApplicationConstants.ErrorMessages.AmountMustBePositive]);

Replacement:
        RuleFor(x => x.Amount)
            .GreaterThan(0)
            .WithMessage(_localizer[LoanApplicationConstants.ErrorMessages.AmountMustBePositive]);

        RuleFor(x => x.Purpose)
            .NotEmpty()
            .WithMessage(_localizer[LoanApplicationConstants.ErrorMessages.PurposeRequired])
            .MaximumLength(LoanApplicationConstants.FieldLengths.PurposeMax);
```

### `add-enum-member`

**Anchor:** the last enum member, including its trailing comma (if present) or the closing `}`.

For enums with explicit int values, use a surrounding-context anchor: the last `Name = N,` pair plus the closing `}`.

```
Anchor:
    Rejected = 4
}

Replacement:
    Rejected = 4,
    Withdrawn = 5
}
```

### `add-key` (for en.json)

JSON edits need JSON-aware care — trailing commas, key ordering.

**Anchor:** the last key-value pair in the `texts` object, through its closing `"`.

```
Anchor:
    "LoanApplicationManagement:Permission:Application:Delete": "Delete applications"
  }

Replacement:
    "LoanApplicationManagement:Permission:Application:Delete": "Delete applications",
    "LoanApplicationManagement:Permission:Application:Approve": "Approve applications",
    "LoanApplicationManagement:Error:PurposeRequired": "Purpose is required."
  }
```

After the edit, the synthesizer parses the file as JSON to verify validity. Parse failure → rollback.

### `add-di-line`

**Anchor:** the last `context.Services.Add*` line inside `ConfigureServices`.

```
Anchor:
        context.Services.AddScoped<ILoanApplicationMapper, LoanApplicationMapper>();
    }

Replacement:
        context.Services.AddScoped<ILoanApplicationMapper, LoanApplicationMapper>();
        context.Services.AddScoped<LoanApplicationService>();
    }
```

Deduplication: if the line already exists (scout catalog confirmed), skip the edit entirely.

### `add-has-property-call`

**Anchor:** the last `builder.Property(x => x.*)` chain in the EF configuration's `Configure` method.

```
Anchor:
        builder.Property(x => x.Amount).HasPrecision(18, 4);

Replacement:
        builder.Property(x => x.Amount).HasPrecision(18, 4);
        builder.Property(x => x.Purpose).HasMaxLength(LoanApplicationConstants.FieldLengths.PurposeMax);
```

### `add-guard`

Used to add a tenant ownership guard to a method that lacks one.

**Anchor:** the `var entity = await _repository.GetAsync(...)` line in the target method.

```
Anchor:
        var entity = await _repository.GetAsync(id);
        return _mapper.MapToOutput(entity);

Replacement:
        var entity = await _repository.GetAsync(id);
        EnsureTenantOwnership(entity);
        return _mapper.MapToOutput(entity);
```

If `EnsureTenantOwnership` helper doesn't exist on the class, the same descriptor also emits an `add-method` edit to add the private helper.

### `add-interface`

**Anchor:** the class declaration line.

```
Anchor:
public class LoanApplication : FullAuditedAggregateRoot<Guid>

Replacement:
public class LoanApplication : FullAuditedAggregateRoot<Guid>, IMultiTenant
```

(Care: changing from non-tenant to tenant is semantically load-bearing. Reconciler should have flagged this as `CONFLICT`, not additive — adding `IMultiTenant` after the fact requires migration + data-backfill planning beyond this skill.)

## Unified-diff preview

Each edit's `unified_diff_preview` is a rendered diff fragment the user sees at Phase 11:

```
--- a/src/Acme.Lending.Application.Contracts/LoanApplicationManagement/Permissions/LoanApplicationPermissions.cs
+++ b/src/Acme.Lending.Application.Contracts/LoanApplicationManagement/Permissions/LoanApplicationPermissions.cs
@@ -18,6 +18,7 @@
         public const string Create = Default + ":Create";
         public const string Read   = Default + ":Read";
         public const string Update = Default + ":Update";
         public const string Delete = Default + ":Delete";
+        public const string Approve = Default + ":Approve";
     }
 }
```

The diff is informative — it doesn't drive the edit. The `str_replace` anchor/replacement pair is what actually runs. If the two ever disagree, the anchor/replacement is authoritative and the diff is regenerated.

## FILE_DRIFT detection

At planning time, the planner captures a hash of the current file content and attaches it to the `update_edit` descriptor. At synthesis time, before applying edits, the synthesizer re-hashes the file:

- Hashes equal → proceed.
- Hashes differ → halt `FILE_DRIFT`. The file was modified between Phase 11 approval and Phase 12 synthesis. Main agent reports to user and loops back to Phase 3 (repo scout) to re-scan, then Phase 6 (reconciler) to redecide.

Hash algorithm: SHA-256 over UTF-8 bytes, normalized line endings to `\n`.

## Edit ordering within a single descriptor

If a descriptor has multiple edits against the same file, they are applied in the order emitted. The planner orders them so earlier edits do not invalidate later anchors:

- **Add-only edits are commutative** when their anchors don't overlap. Order doesn't matter.
- **When anchors could overlap**, the planner orders edits so that each subsequent anchor still holds after the prior edit. Typically: walk from bottom of file to top, so insertions at the top don't shift anchors below.
- **JSON edits** reparse after each step to maintain validity invariant.

## Refusing non-additive edits

The reconciler classifies any edit that changes an existing member's semantics (type change, visibility change, removal) as `CONFLICT`, not `UPDATE_IN_PLACE`. The user resolves at Phase 7. Example:

- Existing property `public decimal Amount { get; init; }`. FS says `Amount: int`. Reconciler → `CONFLICT` code `SHAPE_MISMATCH`.
- Existing method signature disagreement. Reconciler → `CONFLICT`.

This skill does not auto-apply destructive edits. Anything that isn't strictly additive requires user decision.

## What the synthesizer does when an edit fails mid-sequence

If edit 3 of 5 fails (anchor not found, anchor ambiguous), the synthesizer:

1. Does not roll back prior edits — they are persisted (the file is saved after each `str_replace`).
2. Halts the descriptor with `ANCHOR_NOT_FOUND` or `ANCHOR_AMBIGUOUS`.
3. Main agent reports the partial state to the user with an explicit "file is partially edited" warning.

Rollback via git is the user's responsibility. The skill does not manage source control.

## Preview sequencing

At Phase 11, the preview presents updates grouped by file. Each file's block shows:
1. The file path.
2. The intent in one line ("Add `Approve` permission constant + child registration").
3. The unified-diff preview.
4. The count of discrete edits (for traceability).

A user approving Phase 11 is approving the diffs they saw — not a blanket "do whatever the planner wants."

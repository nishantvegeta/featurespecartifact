# Update In Place — Edit Primitives

`update_edit` actions modify existing files via `str_replace`, never full-file rewrite. Each edit is described by an **edit primitive** — a small typed shape the synthesizer applies as a single atomic `str_replace`.

## File-drift safety

Before applying any edit on a file, synthesizer:

1. Loads current file content from disk.
2. Computes SHA-256 of normalized content (`\r\n` → `\n`).
3. Compares to `content_hash_at_plan_time` recorded by the planner.
4. Mismatch → halt `FILE_DRIFT`. (User edited the file between Phase 5 approval and Phase 6 synthesis. Re-plan required.)

Match → apply edits sequentially.

## Edit primitive types

### `add-property`

**Target.** Class body. **Anchor.** Last existing property's closing `}` line, or class declaration's opening `{` if zero properties.

```yaml
kind: add-property
target_path: <Ns>.Domain/<Feature>/LoanApplication.cs
anchor: |
  public decimal Amount { get; private set; }
  
  protected LoanApplication()
replacement: |
  public decimal Amount { get; private set; }
  public DateTime SubmittedAt { get; private set; }
  
  protected LoanApplication()
```

### `add-method`

**Target.** Class body. **Anchor.** Last existing method's closing `}`, or class closing `}` if zero methods.

```yaml
kind: add-method
target_path: <Ns>.Domain/<Feature>/LoanApplication.cs
anchor: |
      Status = LoanStatus.Approved;
  }

  private class Builder
replacement: |
      Status = LoanStatus.Approved;
  }
  
  public void Reject(Guid rejectorId, string reason)
  {
      if (Status != LoanStatus.Submitted)
          throw new BusinessException(LoanApplicationConstants.ErrorMessages.CannotRejectNonSubmitted);
      Status = LoanStatus.Rejected;
  }

  private class Builder
```

### `add-constant`

**Target.** Static class body (`<Feature>Constants` or its nested classes).

```yaml
kind: add-constant
target_path: <Ns>.Domain.Shared/<Feature>/Constants/LoanApplicationConstants.cs
anchor: |
  public const string AmountMustBePositive = "LoanApplication:Error:AmountMustBePositive";
}
replacement: |
  public const string AmountMustBePositive = "LoanApplication:Error:AmountMustBePositive";
  public const string CannotRejectNonSubmitted = "LoanApplication:Error:CannotRejectNonSubmitted";
}
```

### `add-child-call`

**Target.** Permission Provider's `Define(...)`. **Anchor.** Last `AddChild(...)` call on parent permission's chain.

```yaml
kind: add-child-call
target_path: <Ns>.Application.Contracts/Permissions/<Feature>PermissionDefinitionProvider.cs
anchor: |
  application.AddChild(LoanApplicationPermissions.Application.Approve,
      L("LoanApplication:Permission:Application:Approve"));
replacement: |
  application.AddChild(LoanApplicationPermissions.Application.Approve,
      L("LoanApplication:Permission:Application:Approve"));
  application.AddChild(LoanApplicationPermissions.Application.Reject,
      L("LoanApplication:Permission:Application:Reject"));
```

### `add-rule`

**Target.** Validator constructor body. **Anchor.** Last `RuleFor(...)` chain.

```yaml
kind: add-rule
target_path: <Ns>.Application.Contracts/<Feature>/Validators/CreateLoanApplicationValidator.cs
anchor: |
  RuleFor(x => x.Amount)
      .GreaterThan(0)
      .WithMessage(localizer[LoanApplicationConstants.ErrorMessages.AmountMustBePositive]);
}
replacement: |
  RuleFor(x => x.Amount)
      .GreaterThan(0)
      .WithMessage(localizer[LoanApplicationConstants.ErrorMessages.AmountMustBePositive]);
  
  RuleFor(x => x.ApplicantEmail)
      .NotEmpty()
      .WithMessage(localizer[LoanApplicationConstants.ErrorMessages.EmailRequired])
      .EmailAddress()
      .WithMessage(localizer[LoanApplicationConstants.ErrorMessages.EmailInvalid]);
}
```

### `add-enum-member`

**Target.** Enum body. **Anchor.** Last existing member.

```yaml
kind: add-enum-member
target_path: <Ns>.Domain.Shared/<Feature>/Enums/LoanStatus.cs
anchor: |
  Approved = 2
}
replacement: |
  Approved = 2,
  Rejected = 3
}
```

(Note trailing comma added on previous line — JSON-compliant pattern.)

### `add-key`

**Target.** Localization JSON. **Anchor.** Last entry in `texts` object.

```yaml
kind: add-key
target_path: <Ns>.Domain.Shared/Localization/Resources/<Feature>/en.json
anchor: |
  "LoanApplication:Error:AmountMustBePositive": "Amount must be positive."
}
replacement: |
  "LoanApplication:Error:AmountMustBePositive": "Amount must be positive.",
  "LoanApplication:Error:CannotRejectNonSubmitted": "Cannot reject a non-submitted application."
}
```

After applying, synthesizer re-parses the JSON to verify validity.

### `add-di-line`

**Target.** Module class `ConfigureServices(...)` body. **Anchor.** Last existing `context.Services.Add*<...>()` call.

```yaml
kind: add-di-line
target_path: <Ns>.Application/<Feature>ApplicationModule.cs
anchor: |
  context.Services.AddScoped<ILoanApplicationMapper, LoanApplicationMapper>();
}
replacement: |
  context.Services.AddScoped<ILoanApplicationMapper, LoanApplicationMapper>();
  context.Services.AddScoped<IRejectionReasonResolver, RejectionReasonResolver>();
}
```

### `add-has-property-call`

**Target.** EF entity configuration body. **Anchor.** Last `b.Property(...)` chain or `b.HasIndex(...)` chain.

```yaml
kind: add-has-property-call
target_path: <Ns>.EntityFrameworkCore/<Feature>/<Feature>EntityFrameworkCoreExtensions.cs
anchor: |
  b.HasIndex(x => x.Status);
});
replacement: |
  b.HasIndex(x => x.Status);
  
  b.Property(x => x.SubmittedAt)
      .IsRequired();
});
```

### `add-guard`

**Target.** AppService method body. **Anchor.** Line immediately after entity load.

```yaml
kind: add-guard
target_path: <Ns>.Application/<Feature>/LoanApplicationAppService.cs
anchor: |
  var entity = await _repository.GetAsync(id);
replacement: |
  var entity = await _repository.GetAsync(id);
  EnsureTenantOwnership(entity);
```

If `EnsureTenantOwnership` helper missing, paired `add-method` adds it.

### `add-interface`

**Target.** Class declaration. **Anchor.** Class declaration line up to opening `{` (exclusive).

```yaml
kind: add-interface
target_path: <Ns>.Domain/<Feature>/LoanApplication.cs
anchor: |
  public class LoanApplication : FullAuditedAggregateRoot<Guid>
{
replacement: |
  public class LoanApplication : FullAuditedAggregateRoot<Guid>, IMultiTenant
{
```

When adding `IMultiTenant`, synthesizer also runs paired `add-property` for `public Guid? TenantId { get; private set; }`.

## Anchor uniqueness

Each `anchor` MUST appear exactly once in the target file. Reconciler computes anchors from scout's content snapshots; planner re-verifies; synthesizer halts `ANCHOR_AMBIGUOUS` if uniqueness lost between plan time and write time (concurrent edit).

When uniqueness can't be achieved with surface-level text, anchor includes more surrounding context (next ~3 lines).

## Edit ordering

Within a single file's edit list, edits are applied **sequentially** in declared order. Earlier edits must not invalidate later anchors. Reconciler/planner detect this by simulating each edit on the in-memory copy and re-checking uniqueness.

If an edit list reorders the file (e.g., adds a property at line 30 then a method whose anchor was at line 50), the second anchor is recomputed against the post-first-edit content.

## What the skill NEVER does on update

- Replace whole file (not even when the resulting "diff" is large).
- Delete a line (only adds; subtractive changes require a Conflict resolution).
- Reorder existing members.
- Rename a symbol (cross-file refactor — out of scope).
- Modify a method body's logic (add to it, not transform it).

## Failure semantics

If any edit in a sequence fails (anchor not found / ambiguous after prior edits / drift mid-way), synthesizer halts the **whole file's** edit application immediately. Already-applied edits remain on disk — there is no rollback. The user receives a halt code naming the failed edit and the partial-state path so they can decide whether to revert manually or re-plan from the current state.

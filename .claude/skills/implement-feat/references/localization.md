# Localization

All user-visible text in generated code resolves through ABP's localization system via `IStringLocalizer<<Feature>Resource>`. The skill never emits hardcoded English (or any language) strings in C#.

## Components

### Resource marker class

- Path: `<Ns>.Domain.Shared/<Feature>/Localization/<Feature>Resource.cs`.
- Namespace: `<Ns>.Localization`.
- Declaration:
  ```
  [LocalizationResourceName("<Feature>")]
  public class <Feature>Resource { }
  ```
- Empty body — the class is a type-tag for `IStringLocalizer<T>`.

### JSON file

- Path: `<Ns>.Domain.Shared/Localization/Resources/<Feature>/en.json`.
- Schema:
  ```
  {
    "culture": "en",
    "texts": {
      "<key>": "<text>",
      ...
    }
  }
  ```

### Module registration

In `<Ns>DomainSharedModule.ConfigureServices`, ABP's conventional localization scans `Localization/Resources/<Feature>` automatically when the resource class is present. The skill emits a `di-registration-edit` only if the existing module doesn't already register a virtual file system path for `/Localization/Resources/<Feature>`:

```
Configure<AbpLocalizationOptions>(options =>
{
    options.Resources
        .Add<<Feature>Resource>("en")
        .AddVirtualJson("/Localization/Resources/<Feature>");
});

Configure<AbpVirtualFileSystemOptions>(options =>
{
    options.FileSets.AddEmbedded<<Ns>DomainSharedModule>();
});
```

(The second `Configure` is typically already present project-wide — dedupe if so.)

## Key conventions

All keys for a feature use the prefix `<Feature>:`, colon-separated hierarchical segments:

| Purpose | Pattern | Example |
|---|---|---|
| Error message | `<Feature>:Error:<n>` | `LoanApplication:Error:AmountBelowMinimum` |
| Permission (group) | `<Feature>:Permission:Group` | `LoanApplication:Permission:Group` |
| Permission (entity) | `<Feature>:Permission:<Entity>` | `LoanApplication:Permission:Application` |
| Permission (operation) | `<Feature>:Permission:<Entity>:<Op>` | `LoanApplication:Permission:Application:Approve` |
| Enum value display | `<Feature>:Display:<EnumName>.<Value>` | `LoanApplication:Display:LoanStatus.Submitted` |
| Misc display | `<Feature>:Display:<TypeOrField>` | `LoanApplication:Display:ApplicantName` |

**Never:**
- No dots as separators except inside enum display keys (which use `.` between enum name and value for clarity).
- No slashes.
- No spaces.
- No lowercase segments except when they are already-canonical identifiers like enum values that the serializer emits lowercase.

## Usage in code

### Validators

```
RuleFor(x => x.ApplicantName)
    .NotEmpty()
    .WithMessage(_localizer[<Feature>Constants.ErrorMessages.ApplicantNameRequired]);
```

`ErrorMessages.ApplicantNameRequired` is the key `"LoanApplication:Error:ApplicantNameRequired"`. `_localizer` is `IStringLocalizer<<Feature>Resource>` injected by constructor.

### AppServices

ABP's `ApplicationService` base exposes `L` — an `IStringLocalizer` bound to the module's primary resource. Inside AppService methods:

```
throw new AbpAuthorizationException(L["<Feature>:Error:CrossTenantAccessDenied"]);
```

When the AppService needs a `<Feature>`-scoped localizer (not the default module one), inject `IStringLocalizer<<Feature>Resource>` explicitly.

### Domain layer

Aggregates do **not** inject `IStringLocalizer`. They throw `BusinessException` with the key directly:

```
throw new BusinessException(<Feature>Constants.ErrorMessages.AmountBelowMinimum);
```

ABP's exception middleware resolves the key to localized text at the HTTP boundary. This keeps the domain free of cross-cutting dependencies.

### Aggregate `BusinessException` arguments

For parameterized messages (`"Amount must be between {0} and {1}"`), pass arguments via `WithData`:

```
throw new BusinessException(<Feature>Constants.ErrorMessages.AmountOutOfRange)
    .WithData("Min", minValue)
    .WithData("Max", maxValue);
```

The JSON template uses `{Min}` and `{Max}`:

```
"<Feature>:Error:AmountOutOfRange": "Amount must be between {Min} and {Max}."
```

## Adding languages

`en.json` is the only file this skill generates. Additional languages (`tr.json`, `fr.json`, etc.) are added by translators and must contain the same key set. `traceability-validator` does not cross-check translation files — only `en.json`.

## Key completeness checks (by `traceability-validator`)

- Every key referenced from `<Feature>Constants.ErrorMessages` exists in `en.json`.
- Every permission constant has a matching `<Feature>:Permission:*` key.
- Orphan keys in `en.json` (not referenced anywhere) are a warning, not a halt — translators may have added keys the code hasn't caught up to.

## What the skill NEVER puts in `en.json`

- Keys belonging to other features.
- Duplicated keys from the shared `<Ns>Resource.json` (if the project has one).
- Keys with English-only placeholder values (e.g., `"TODO"`).
- Keys for system messages ABP already provides (validation, auth, etc.).

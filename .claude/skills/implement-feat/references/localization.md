# Localization

All user-visible text in generated code resolves through ABP's localization via `IStringLocalizer<<Feature>Resource>`. Skill never emits hardcoded English (or any language) strings in C#.

## Components

### Resource marker

- Path: `<Ns>.Domain.Shared/<Feature>/Localization/<Feature>Resource.cs`. Namespace `<Ns>.Localization`.
  ```csharp
  [LocalizationResourceName("<Feature>")]
  public class <Feature>Resource { }
  ```
- Empty body — class is a type-tag for `IStringLocalizer<T>`.

### JSON file

- Path: `<Ns>.Domain.Shared/Localization/Resources/<Feature>/en.json`.
- Schema: `{ "culture": "en", "texts": { "<key>": "<text>", ... } }`.

### Module registration

In `<Ns>DomainSharedModule.ConfigureServices`. Skill emits a `di-registration-edit` only if existing module doesn't already register a virtual file system path for `/Localization/Resources/<Feature>`:

```csharp
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

All keys for a feature use prefix `<Feature>:`, colon-separated hierarchical segments:

| Purpose | Pattern | Example |
|---|---|---|
| Error message | `<Feature>:Error:<Name>` | `LoanApplication:Error:AmountBelowMinimum` |
| Permission group | `<Feature>:Permission:Group` | `LoanApplication:Permission:Group` |
| Permission entity | `<Feature>:Permission:<Entity>` | `LoanApplication:Permission:Application` |
| Permission op | `<Feature>:Permission:<Entity>:<Op>` | `LoanApplication:Permission:Application:Approve` |
| Enum value | `<Feature>:Display:<EnumName>.<Value>` | `LoanApplication:Display:LoanStatus.Submitted` |
| Misc display | `<Feature>:Display:<TypeOrField>` | `LoanApplication:Display:ApplicantName` |

**Never:** dots as separators (except enum display key inside the value segment). No slashes, no spaces, no lowercase segments except canonical identifiers (e.g., enum values that the serializer emits lowercase).

## Usage in code

### Validators

```csharp
RuleFor(x => x.ApplicantName)
    .NotEmpty()
    .WithMessage(_localizer[<Feature>Constants.ErrorMessages.ApplicantNameRequired]);
```

`ErrorMessages.ApplicantNameRequired` is the key `"LoanApplication:Error:ApplicantNameRequired"`. `_localizer` is `IStringLocalizer<<Feature>Resource>` injected by ctor.

### AppServices

`ApplicationService` base exposes `L` — `IStringLocalizer` bound to module's primary resource:

```csharp
throw new AbpAuthorizationException(L["<Feature>:Error:CrossTenantAccessDenied"]);
```

When AppService needs `<Feature>`-scoped localizer (not module default), inject `IStringLocalizer<<Feature>Resource>` explicitly.

### Domain layer

Aggregates do NOT inject `IStringLocalizer`. Throw `BusinessException` with key directly:

```csharp
throw new BusinessException(<Feature>Constants.ErrorMessages.AmountBelowMinimum);
```

ABP's exception middleware resolves the key to localized text at HTTP boundary. Keeps domain free of cross-cutting deps.

### Parameterized messages

Pass arguments via `WithData`:

```csharp
throw new BusinessException(<Feature>Constants.ErrorMessages.AmountOutOfRange)
    .WithData("Min", minValue)
    .WithData("Max", maxValue);
```

JSON template: `"<Feature>:Error:AmountOutOfRange": "Amount must be between {Min} and {Max}."`.

## Adding languages

`en.json` is the only file the skill generates. Additional languages (`tr.json`, `fr.json`, etc.) added by translators with same key set. Planner does not cross-check translation files — only `en.json`.

## Key completeness checks (planner holistic pass)

- Every key referenced from `<Feature>Constants.ErrorMessages` exists in `en.json`.
- Every permission constant has matching `<Feature>:Permission:*` key.
- Orphan keys in `en.json` (not referenced) → warning, not halt.

## What the skill NEVER puts in `en.json`

Keys belonging to other features · duplicated keys from shared `<Ns>Resource.json` · placeholder values (`"TODO"`) · keys for system messages ABP already provides (validation, auth, etc.).

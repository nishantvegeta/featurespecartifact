# Domain.Shared Layer — Enums, Constants, Roles, Localization

`Domain.Shared` holds types both Domain and Application.Contracts depend on: enums, constants, role names, localization resource marker, localization JSON.

## Folder layout under `<Ns>.Domain.Shared/<Feature>/`

```
Enums/
  <State>Enum.cs                 // one file per State node on the FS
Constants/
  <Feature>Constants.cs          // business constants + nested ErrorMessages
Roles/
  <Feature>Roles.cs              // one constant per human actor
Localization/
  <Feature>Resource.cs           // marker class, empty body
```

And at `<Ns>.Domain.Shared/Localization/Resources/<Feature>/`: `en.json`.

## Enums

- One enum per State node, namespace `<Ns>.<Feature>.Enums`.
- Values use **explicit integer assignments** matching FS page `int_value` column.
- Do not use `[Flags]` unless FS declares it. Do not add synthetic `Unknown = 0` unless FS lists it.

## Constants

- `public static class <Feature>Constants` in `<Ns>.<Feature>.Constants`.
- **Business-value constants only** — max lengths, regex patterns, default values declared on Entity pages. Never user-visible strings.
- Nested `public static class ErrorMessages` — **keys only**, matching keys in `en.json`:
  ```
  public const string ApplicantNameRequired = "<Feature>:Error:ApplicantNameRequired";
  ```
- Other nested classes for category groupings (`FieldLengths`, etc.) as needed.

**Never:** put any-language text in `<Feature>Constants`. Never use `nameof(...)` to derive keys — keys are stable strings independent of symbol renames.

## Roles

- `public static class <Feature>Roles` in `<Ns>.<Feature>.Roles`.
- One `public const string <RoleName> = "<RoleName>";` per human actor.
- System actors are not represented here.

## Resource marker

- `public class <Feature>Resource` — empty body.
- Decorated with `[LocalizationResourceName("<Feature>")]` so ABP localization locates the JSON.
- Namespace `<Ns>.Localization`.

## Localization JSON

Path: `<Ns>.Domain.Shared/Localization/Resources/<Feature>/en.json`.

```json
{
  "culture": "en",
  "texts": {
    "<Feature>:Error:ApplicantNameRequired": "Applicant name is required.",
    "<Feature>:Error:AmountOutOfRange":      "Amount must be between {Min} and {Max}.",

    "<Feature>:Permission:Group":              "<Feature>",
    "<Feature>:Permission:Application":        "Applications",
    "<Feature>:Permission:Application:Create": "Create applications",

    "<Feature>:Display:LoanApplication":       "Loan application",
    "<Feature>:Display:Status.Submitted":      "Submitted"
  }
}
```

Rules:
- Every key in `<Feature>Constants.ErrorMessages` has a `texts` entry.
- Every permission constant has a corresponding `<Feature>:Permission:<path>` key.
- Keys use colon-separated hierarchical paths — never slashes, never dots (except inside enum display: `<Feature>:Display:<EnumName>.<Value>`).

## Module registration

`<Ns>DomainSharedModule.ConfigureServices` registers `<Feature>Resource`. Synthesizer emits as `di-registration-edit`:

```csharp
Configure<AbpLocalizationOptions>(options =>
{
    options.Resources
        .Add<<Feature>Resource>("en")
        .AddVirtualJson("/Localization/Resources/<Feature>");
});
```

## Convention checks (planner holistic pass)

- Every `ErrorMessages.*` constant has matching `en.json` key.
- Every permission constant has matching `en.json` label key.
- Orphan keys in `en.json` (not referenced) → warning, not halt.

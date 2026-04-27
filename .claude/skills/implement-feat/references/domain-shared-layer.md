# Domain.Shared Layer — Enums, Constants, Roles, Localization

`Domain.Shared` holds the types that both the Domain and the Application.Contracts layers depend on: enums, constant values, role name constants, a localization resource marker class, and the localization JSON file.

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

And at `<Ns>.Domain.Shared/Localization/Resources/<Feature>/`:

```
en.json                          // default language; extend per CLAUDE.md
```

## Enums

- One enum per State node.
- `public enum <StateName>` declared in the feature namespace `<Ns>.<Feature>.Enums`.
- Values use **explicit integer assignments** matching the FS page's `int_value` column. This allows safe DB storage when a project stores enums as ints (ABP default for EF Core) or as camelCase strings (recommended via global `JsonStringEnumConverter`).
- Do not use `[Flags]` unless the FS page explicitly declares it.
- Do not add a synthetic `Unknown = 0` unless the FS page lists it.

## Constants

- `public static class <Feature>Constants` in `<Ns>.<Feature>.Constants`.
- **Business-value constants only** — max lengths, regex patterns, default values declared on Entity pages. Never user-visible strings.
- Nested `public static class ErrorMessages` — **keys only**, matching the keys in `en.json`:
  - `public const string ApplicantNameRequired = "<Feature>:Error:ApplicantNameRequired";`
- Nested classes may be added for other constant categories (`public static class FieldLengths`).

**Never:**
- Never put English (or any language) text in `<Feature>Constants`.
- Never use `nameof(...)` to derive keys — keys are stable strings independent of symbol renames.

## Roles

- `public static class <Feature>Roles` in `<Ns>.<Feature>.Roles`.
- One `public const string <RoleName> = "<RoleName>";` per human actor declared on the FS.
- System actors are not represented here — they have no role constant.

## Resource marker class

- `public class <Feature>Resource` — empty body.
- Decorated with `[LocalizationResourceName("<Feature>")]` so ABP's localization system locates the JSON.
- Namespace `<Ns>.Localization`.

## Localization JSON

Path: `<Ns>.Domain.Shared/Localization/Resources/<Feature>/en.json`.

Shape:

```
{
  "culture": "en",
  "texts": {
    "<Feature>:Error:ApplicantNameRequired": "Applicant name is required.",
    "<Feature>:Error:AmountOutOfRange": "Amount must be between {0} and {1}.",

    "<Feature>:Permission:Group": "<Feature>",
    "<Feature>:Permission:Application":        "Applications",
    "<Feature>:Permission:Application:Create": "Create applications",
    "<Feature>:Permission:Application:Read":   "Read applications",
    "<Feature>:Permission:Application:Update": "Update applications",
    "<Feature>:Permission:Application:Delete": "Delete applications",

    "<Feature>:Display:LoanApplication": "Loan application",
    "<Feature>:Display:Status.Submitted": "Submitted"
  }
}
```

Rules:
- Every key referenced by `<Feature>Constants.ErrorMessages` must have a `texts` entry.
- Every permission constant has a corresponding `<Feature>:Permission:<path>` key.
- Keys use colon-separated hierarchical paths — `<Feature>:<Category>:<Name>` — never slashes, never dots.
- Enum value labels follow `<Feature>:Display:<EnumName>.<Value>` when referenced from the UI (these keys are registered but may not all appear in the skill's output — the FS page indicates which are needed).

## Resource registration in the module

`<Ns>DomainSharedModule.ConfigureServices` must register `<Feature>Resource`. The synthesizer adds:

```
Configure<AbpLocalizationOptions>(options =>
{
    options.Resources
        .Add<<Feature>Resource>("en")
        .AddVirtualJson("/Localization/Resources/<Feature>");
});
```

(Illustrative — synthesizer emits this as a `di-registration-edit` descriptor.)

## Language extension

If the project needs additional languages, additional JSON files are placed alongside `en.json` with the same key set. This skill generates only `en.json`; translation is out of scope.

## Convention checks

`traceability-validator` confirms:

- Every `ErrorMessages.*` constant has a matching `en.json` key.
- Every permission constant has a matching `en.json` label key.
- No key appears in `en.json` without a constant reference (orphan messages → warning, not halt).

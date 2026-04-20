## Amnil Trade Finance

Multi-tenant SaaS trade finance platform built with **ABP Framework**, **PostgreSQL**, **RabbitMQ**, and **OpenIddict**.

### Project Info

* **GitLab:** `http://localhost:8080/root/trade-finance` (ID: 7)
* **Wiki:** `http://localhost:8080/root/trade-finance/-/wikis`
* **Wiki Path:** `/docs`
* **Tenancy:** `per-customer`
* **Validation:** `FluentValidation`

---

## `api/` — ABP Backend

**Stack:** C# / .NET (latest LTS), ABP Framework, EF Core, PostgreSQL, OpenIddict, RabbitMQ

### Structure

```
src/
├── Amnil.TradeFinance.Domain/                 # Entities, domain services, repository interfaces
├── Amnil.TradeFinance.Domain.Shared/          # Enums, constants, shared DTOs
├── Amnil.TradeFinance.Application/            # AppService implementations
├── Amnil.TradeFinance.Application.Contracts/  # DTOs, IAppService interfaces
├── Amnil.TradeFinance.EntityFrameworkCore/    # DbContext, entity configs, migrations
├── Amnil.TradeFinance.HttpApi/                # Thin controllers delegating to AppServices
├── Amnil.TradeFinance.HttpApi.Host/           # API host startup
├── Amnil.TradeFinance.DbMigrator/             # Migration runner and DB seeding
└── Amnil.TradeFinance.AuthServer/             # OpenIddict auth server
```

### Commands

```bash
dotnet build
dotnet run --project src/Amnil.TradeFinance.HttpApi.Host
dotnet run --project src/Amnil.TradeFinance.AuthServer
dotnet test
dotnet ef migrations add <Name> -p src/Amnil.TradeFinance.EntityFrameworkCore -s src/Amnil.TradeFinance.HttpApi.Host
```

### Routing
* `PublicAppService` → `/api/public/app/...` for customer UI
* `PrivateAppService` → `/api/private/app/...` for backoffice UI

### AppService Conventions

* Apply `[Authorize(TradeFinancePermissions.X.Default)]` to **every** method including reads
- Filter: `query.WhereIf(input.Field.HasValue, x => x.Field == input.Field!.Value)`
* use `System.Linq.Dynamic.Core` for sorting
* Use **Mapperly** for mapping
* Keep all permissions in `TradeFinancePermissions` with nested classes per module
* If domain-service prechecks are required, entity mutation methods stay `internal`; AppServices must go through domain services

### Gotchas

* Enums serialize as **lowercase strings** via global `JsonStringEnumConverter(CamelCase)`
* Use UI badge variants like `"active"` or `"bank"`, not `0` or `1`
* In Domain services, use **`AsyncExecuter`** for async LINQ
* Do not call EF Core directly across layer boundaries
  
## Note
- Generate a commit message at the end of your response.

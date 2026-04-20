using Volo.Abp.Modularity;
using Volo.Abp.Authorization;
using Volo.Abp.Ddd.Application.Contracts;

namespace Amnil.TradeFinance;

[DependsOn(typeof(TradeFinanceDomainSharedModule))]
[DependsOn(typeof(AbpDddApplicationContractsModule))]
[DependsOn(typeof(AbpAuthorizationModule))]
public class TradeFinanceApplicationContractsModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        base.ConfigureServices(context);
    }
}

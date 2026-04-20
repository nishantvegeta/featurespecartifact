using Volo.Abp.Modularity;
using Volo.Abp.MultiTenancy;
using Volo.Abp.Ddd.Domain;

namespace Amnil.TradeFinance;

[DependsOn(typeof(TradeFinanceDomainSharedModule))]
[DependsOn(typeof(AbpDddDomainModule))]
[DependsOn(typeof(AbpMultiTenancyModule))]
public class TradeFinanceDomainModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        base.ConfigureServices(context);
    }
}

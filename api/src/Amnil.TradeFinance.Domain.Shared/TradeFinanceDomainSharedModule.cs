using Volo.Abp.Modularity;
using Volo.Abp;

namespace Amnil.TradeFinance;

[DependsOn(typeof(AbpCoreModule))]
public class TradeFinanceDomainSharedModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        base.ConfigureServices(context);
    }
}

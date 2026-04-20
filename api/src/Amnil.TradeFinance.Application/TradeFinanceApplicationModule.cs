using Volo.Abp.AutoMapper;
using Volo.Abp.Modularity;
using Volo.Abp.Ddd.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Amnil.TradeFinance;

[DependsOn(typeof(TradeFinanceApplicationContractsModule))]
[DependsOn(typeof(TradeFinanceDomainModule))]
[DependsOn(typeof(AbpDddApplicationModule))]
[DependsOn(typeof(AbpAutoMapperModule))]
public class TradeFinanceApplicationModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        context.Services.AddAutoMapper(typeof(TradeFinanceApplicationModule));
    }
}

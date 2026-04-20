using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using Volo.Abp.AspNetCore;
using Volo.Abp.Modularity;

namespace Amnil.TradeFinance;

[DependsOn(typeof(TradeFinanceApplicationModule))]
[DependsOn(typeof(TradeFinanceEntityFrameworkCoreModule))]
[DependsOn(typeof(AbpAspNetCoreModule))]
public class TradeFinanceHttpApiHostModule : AbpModule
{
    public override void ConfigureServices(ServiceConfigurationContext context)
    {
        var configuration = context.Services.GetConfiguration();

        context.Services.AddCors(options =>
        {
            options.AddPolicy("CorsPolicy", builder =>
            {
                builder
                    .AllowAnyOrigin()
                    .AllowAnyMethod()
                    .AllowAnyHeader();
            });
        });

        context.Services.AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(
                    new JsonStringEnumConverter(allowIntegerValues: false));
            });
    }

    public override void OnApplicationInitialization(ApplicationInitializationContext context)
    {
        var app = context.GetApplicationBuilder();

        app.UseRouting();
        app.UseCors("CorsPolicy");
        app.UseConfiguredEndpoints();
    }
}

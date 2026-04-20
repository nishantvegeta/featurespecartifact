using Microsoft.EntityFrameworkCore;
using Volo.Abp.Data;
using Volo.Abp.EntityFrameworkCore;

namespace Amnil.TradeFinance;

[ConnectionStringName("Default")]
public class TradeFinanceDbContext : AbpDbContext<TradeFinanceDbContext>
{
    public TradeFinanceDbContext(DbContextOptions<TradeFinanceDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(TradeFinanceDbContext).Assembly);
    }
}

using Microsoft.EntityFrameworkCore;
using Volo.Abp;

namespace Amnil.TradeFinance;

public static class TradeFinanceDbContextModelCreatingExtensions
{
    public static void ConfigureTradeFinance(this ModelBuilder builder)
    {
        Check.NotNull(builder, nameof(builder));

        builder.ApplyConfigurationsFromAssembly(typeof(TradeFinanceDbContext).Assembly);
    }
}

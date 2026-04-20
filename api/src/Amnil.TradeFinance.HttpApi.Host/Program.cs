using Amnil.TradeFinance;
using Volo.Abp.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication<TradeFinanceHttpApiHostModule>();

var app = builder.Build();

await app.InitializeAsync();

app.MapControllers();

app.Run();

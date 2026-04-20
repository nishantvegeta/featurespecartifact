using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amnil.TradeFinance.LCChecklistManagement.DTOs;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Amnil.TradeFinance.LCChecklistManagement;

/// <summary>
/// <see href="http://localhost:8080/root/trade-finance/-/wikis/feat-specs/lc-checklist-management/feat-spec.md"/>
/// </summary>
public interface ILCChecklistManagementPublicAppService : IApplicationService
{
    Task<LCChecklistItemDto> CreateAsync(CreateLCChecklistItemDto input);
    Task<LCChecklistItemDto> UpdateAsync(Guid id, UpdateLCChecklistItemDto input);
    Task DeleteAsync(Guid id);
    Task<List<LCChecklistItemDto>> ReorderAsync(Guid id, ReorderLCChecklistItemDto input);
    Task<LCChecklistItemDto> ToggleStatusAsync(Guid id, ToggleLCChecklistItemStatusDto input);
    Task<PagedResultDto<LCChecklistItemDto>> GetListAsync(GetLCChecklistItemsInput input);
}

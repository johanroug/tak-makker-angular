import type { AiSuggestionSummary } from './ai-feedback.component';

export function shouldShowSuggestionNotice(result: AiSuggestionSummary): boolean {
  return result.workItems > 0 || result.materials > 0 || !!result.scopeWarnings?.length;
}

export function scopeWarningSummary(warnings: string[]): AiSuggestionSummary {
  return { scopeWarnings: warnings, workItems: 0, materials: 0, updatedWorkItems: 0,
    updatedMaterials: 0, materialPrices: 0, materialQuantities: 0, materialUnits: 0, workHours: 0 };
}

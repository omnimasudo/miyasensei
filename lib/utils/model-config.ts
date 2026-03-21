import { useSettingsStore } from '@/lib/store/settings';

/**
 * Get current model configuration from settings store
 */
export function getCurrentModelConfig() {
  const { providerId, modelId, providersConfig } = useSettingsStore.getState();
  
  // Fix for broken/deprecated model IDs being persisted in localStorage
  let effectiveModelId = modelId;
  if (modelId === 'google/gemini-2.0-pro-exp-02-05:free') {
    effectiveModelId = 'google/gemini-2.5-flash-lite-preview-09-2025';
  }

  const modelString = `${providerId}:${effectiveModelId}`;

  // Get current provider's config
  const providerConfig = providersConfig[providerId];

  return {
    providerId,
    modelId,
    modelString,
    apiKey: providerConfig?.apiKey || '',
    baseUrl: providerConfig?.baseUrl || '',
    providerType: providerConfig?.type,
    requiresApiKey: providerConfig?.requiresApiKey,
    isServerConfigured: providerConfig?.isServerConfigured,
  };
}

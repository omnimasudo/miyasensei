/**
 * AI Provider Utilities
 *
 * Core provider registry and model resolution functions.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { PROVIDERS, getProviderConfig } from './providers-config';
import type { ProviderId, ModelInfo, ModelConfig } from '@/lib/types/provider';

// Re-export the provider registry
export { PROVIDERS } from './providers-config';

/**
 * Combined model information with provider context
 */
export interface ModelWithInfo {
  model: LanguageModel;
  modelInfo: ModelInfo;
}

/**
 * Parse a model string into provider and model IDs
 *
 * @param modelString - Model string in format "provider/model" or just "model"
 * @returns Object with providerId and modelId
 */
export function parseModelString(modelString: string): { providerId: ProviderId; modelId: string } {
  const parts = modelString.split('/');

  if (parts.length === 2) {
    return {
      providerId: parts[0] as ProviderId,
      modelId: parts[1],
    };
  }

  // Default to openai if no provider specified
  return {
    providerId: 'openai',
    modelId: modelString,
  };
}

/**
 * Get a language model instance and its information
 *
 * @param config - Model configuration
 * @returns Language model instance and metadata
 */
export function getModel(config: ModelConfig): ModelWithInfo {
  const providerConfig = getProviderConfig(config.providerId);

  if (!providerConfig) {
    throw new Error(`Unknown provider: ${config.providerId}`);
  }

  // Find the model info
  const modelInfo = providerConfig.models.find(m => m.id === config.modelId);
  if (!modelInfo) {
    throw new Error(`Unknown model: ${config.modelId} for provider ${config.providerId}`);
  }

  // Create the language model instance based on provider type
  let model: LanguageModel;

  switch (providerConfig.type) {
    case 'openai':
      model = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      })(config.modelId);
      break;

    case 'anthropic':
      model = createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      })(config.modelId);
      break;

    case 'google':
      model = createGoogleGenerativeAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      })(config.modelId);
      break;

    default:
      throw new Error(`Unsupported provider type: ${providerConfig.type}`);
  }

  return {
    model,
    modelInfo,
  };
}
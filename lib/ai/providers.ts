/**
 * AI Provider Utilities
 *
 * Core provider registry and model resolution functions.
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import { getProviderConfig } from './providers-config';
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
  // Support either "/" or ":" as delimiters
  // If starts with "openrouter:" specifically handle it
  if (modelString.startsWith('openrouter:')) {
    return {
      providerId: 'openrouter',
      modelId: modelString.slice('openrouter:'.length),
    };
  }
  
  const slashIndex = modelString.indexOf('/');
  if (slashIndex !== -1) {
    return {
      providerId: modelString.substring(0, slashIndex) as ProviderId,
      modelId: modelString.substring(slashIndex + 1),
    };
  }

  const colonIndex = modelString.indexOf(':');
  if (colonIndex !== -1) {
    return {
      providerId: modelString.substring(0, colonIndex) as ProviderId,
      modelId: modelString.substring(colonIndex + 1),
    };
  }

  // Default to openrouter if no provider specified
  return {
    providerId: 'openrouter',
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

  // Determine the base URL: explicitly set > provider default
  const baseUrl = config.baseUrl || providerConfig.defaultBaseUrl;

  switch (providerConfig.type) {
    case 'openai':
      model = createOpenAI({
        apiKey: config.apiKey,
        baseURL: baseUrl,
      })(config.modelId);
      break;

    case 'anthropic':
      model = createAnthropic({
        apiKey: config.apiKey,
        baseURL: baseUrl,
      })(config.modelId);
      break;

    case 'google':
      model = createGoogleGenerativeAI({
        apiKey: config.apiKey,
        // Google Generative AI SDK expects baseURL, NOT baseUrl
        baseURL: baseUrl,
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
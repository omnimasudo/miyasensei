import type {
  ProviderId,
  ProviderConfig,
  ModelInfo,
  ModelConfig,
} from '@/lib/types/provider';
import { createLogger } from '@/lib/logger';

const log = createLogger('AIProviders-Config');

// Re-export types for backward compatibility
export type { ProviderId, ProviderConfig, ModelInfo, ModelConfig };

/**
 * Provider registry
 */
export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    icon: '/logos/openai.svg',
    models: [],
  },

  anthropic: {
    id: 'anthropic',
    name: 'Claude',
    type: 'anthropic',
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    icon: '/logos/claude.svg',
    models: [],
  },
  
  google: {
    id: 'google',
    name: 'Google Gemini',
    type: 'google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    icon: '/logos/gemini.svg', 
    models: [],
  },
  
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    type: 'openai',
    defaultBaseUrl: 'https://api.minimax.chat/v1',
    requiresApiKey: true,
    icon: '/logos/minimax.svg',
    models: [],
  },

  kimi: {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    type: 'openai',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    requiresApiKey: true,
    icon: '/logos/kimi.svg',
    models: [],
  },
  
  glm: {
    id: 'glm',
    name: 'Zhipu GLM',
    type: 'openai',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    requiresApiKey: true,
    icon: '/logos/glm.svg',
    models: [],
  },

  qwen: {
    id: 'qwen',
    name: 'Qwen',
    type: 'openai',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    requiresApiKey: true,
    icon: '/logos/qwen.svg',
    models: [],
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'openai',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    requiresApiKey: true,
    icon: '/logos/deepseek.svg',
    models: [],
  },

  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow',
    type: 'openai',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    requiresApiKey: true,
    icon: '/logos/siliconflow.svg',
    models: [],
  },

  doubao: {
    id: 'doubao',
    name: '豆包',
    type: 'openai',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    requiresApiKey: true,
    icon: '/logos/doubao.svg',
    models: [],
  },
  
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'openai',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    icon: '/logos/openai.svg', 
    models: [
      {
        id: 'google/gemini-2.5-flash-lite-preview-09-2025',
        name: 'Gemini 2.5 Flash Lite Preview (09-2025)',
        contextWindow: 1000000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'google/gemini-2.0-flash-lite-001',
        name: 'Gemini 2.0 Flash Lite 001',
        contextWindow: 1000000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'deepseek/deepseek-chat-v3.1',
        name: 'DeepSeek Chat v3.1',
        contextWindow: 128000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'meta-llama/llama-3.2-3b-instruct:free',
        name: 'Llama 3.2 3B Instruct (Free)',
        contextWindow: 128000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
    ],
  },
};

/**
 * Get provider config (from built-in or unified config in localStorage)
 */
export function getProviderConfig(providerId: ProviderId): ProviderConfig | null {
  // Check built-in providers first
  if (PROVIDERS[providerId]) {
    return PROVIDERS[providerId];
  }

  // Check unified providersConfig in localStorage (browser only)
  if (typeof window !== 'undefined') {
    try {
      const storedConfig = localStorage.getItem('providersConfig');
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        const providerSettings = config[providerId];
        if (providerSettings) {
          return {
            id: providerId,
            name: providerSettings.name,
            type: providerSettings.type,
            defaultBaseUrl: providerSettings.defaultBaseUrl,
            icon: providerSettings.icon,
            requiresApiKey: providerSettings.requiresApiKey,
            models: providerSettings.models,
          };
        }
      }
    } catch (e) {
      log.error('Failed to load provider config:', e);
    }
  }

  return null;
}

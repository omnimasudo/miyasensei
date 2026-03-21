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
    models: [
      {
        id: 'gpt-5.2',
        name: 'GPT-5.2',
        contextWindow: 400000,
        outputWindow: 128000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          thinking: {
            toggleable: true,
            budgetAdjustable: true,
            defaultEnabled: false,
          },
        },
      },
      {
        id: 'gpt-5.1',
        name: 'GPT-5.1',
        contextWindow: 400000,
        outputWindow: 128000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          thinking: {
            toggleable: true,
            budgetAdjustable: true,
            defaultEnabled: false,
          },
        },
      },
      {
        id: 'gpt-5',
        name: 'GPT-5',
        contextWindow: 400000,
        outputWindow: 128000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          thinking: {
            toggleable: false,
            budgetAdjustable: true,
            defaultEnabled: true,
          },
        },
      },
      {
        id: 'gpt-5-mini',
        name: 'GPT-5-mini',
        contextWindow: 128000,
        outputWindow: 4096,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          thinking: {
            toggleable: false,
            budgetAdjustable: true,
            defaultEnabled: true,
          },
        },
      },
      {
        id: 'gpt-5-nano',
        name: 'GPT-5-nano',
        contextWindow: 128000,
        outputWindow: 4096,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          thinking: {
            toggleable: false,
            budgetAdjustable: true,
            defaultEnabled: true,
          },
        },
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o-mini',
        contextWindow: 128000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4-turbo',
        contextWindow: 128000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'o4-mini',
        name: 'o4-mini',
        contextWindow: 200000,
        outputWindow: 100000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
          thinking: {
            toggleable: false,
            budgetAdjustable: true,
            defaultEnabled: true,
          },
        },
      },
      {
        id: 'o3',
        name: 'o3',
        contextWindow: 200000,
        outputWindow: 100000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
          thinking: {
            toggleable: false,
            budgetAdjustable: true,
            defaultEnabled: true,
          },
        },
      },
      {
        id: 'o3-mini',
        name: 'o3-mini',
        contextWindow: 200000,
        outputWindow: 100000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: false,
          thinking: {
            toggleable: false,
            budgetAdjustable: true,
            defaultEnabled: true,
          },
        },
      },
      {
        id: 'o1',
        name: 'o1',
        contextWindow: 200000,
        outputWindow: 100000,
        capabilities: {
          streaming: true,
          tools: false,
          vision: false,
          thinking: {
            toggleable: false,
            budgetAdjustable: true,
            defaultEnabled: true,
          },
        },
      },
      {
        id: 'deepseek/deepseek-r1:free',
        name: 'DeepSeek R1 (Free)',
        contextWindow: 128000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'liquid/lfm-40b:free',
        name: 'Liquid LFM 40B (Free)',
        contextWindow: 32000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: false },
      },
    ],
  },

  anthropic: {
    id: 'anthropic',
    name: 'Claude',
    type: 'anthropic',
    requiresApiKey: true,
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    icon: '/logos/claude.svg',
    models: [
      {
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6',
        contextWindow: 200000,
        outputWindow: 128000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          thinking: {
            toggleable: true,
            budgetAdjustable: true,
            defaultEnabled: false,
          },
        },
      },
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        contextWindow: 200000,
        outputWindow: 128000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          thinking: {
            toggleable: true,
            budgetAdjustable: true,
            defaultEnabled: false,
          },
        },
      },
      {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        contextWindow: 200000,
        outputWindow: 64000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          thinking: {
            toggleable: true,
            budgetAdjustable: true,
            defaultEnabled: false,
          },
        },
      },
      {
        id: 'claude-haiku-4-5',
        name: 'Claude Haiku 4.5',
        contextWindow: 200000,
        outputWindow: 32000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          thinking: {
            toggleable: true,
            budgetAdjustable: true,
            defaultEnabled: false,
          },
        },
      },
      {
        id: 'claude-3-7-sonnet-20250219',
        name: 'Claude 3.7 Sonnet',
        contextWindow: 200000,
        outputWindow: 64000,
        capabilities: {
          streaming: true,
          tools: true,
          vision: true,
          thinking: {
            toggleable: true,
            budgetAdjustable: true,
            defaultEnabled: false,
          },
        },
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        contextWindow: 200000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: true },
      },
    ],
  },
  
  google: {
    id: 'google',
    name: 'Google Gemini',
    type: 'google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    icon: '/logos/gemini.svg', 
    models: [
      {
        id: 'gemini-2.0-flash-001',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1048576,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'gemini-2.0-flash-lite-preview-02-05',
        name: 'Gemini 2.0 Flash Lite',
        contextWindow: 1048576,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'gemini-1.5-pro-002',
        name: 'Gemini 1.5 Pro',
        contextWindow: 2097152,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'gemini-1.5-flash-002',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1048576,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
    ],
  },
  
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    type: 'openai',
    defaultBaseUrl: 'https://api.minimax.chat/v1',
    requiresApiKey: true,
    icon: '/logos/minimax.svg',
    models: [
      {
        id: 'MiniMax-Text-01',
        name: 'MiniMax-Text-01',
        contextWindow: 1000000,
        outputWindow: 131072,
        capabilities: { streaming: true, tools: true, vision: true },
      },
    ],
  },

  kimi: {
    id: 'kimi',
    name: 'Kimi (Moonshot)',
    type: 'openai',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    requiresApiKey: true,
    icon: '/logos/kimi.svg',
    models: [
      {
        id: 'moonshot-v1-8k',
        name: 'Kimi V1 8k',
        contextWindow: 8192,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'moonshot-v1-32k',
        name: 'Kimi V1 32k',
        contextWindow: 32768,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'moonshot-v1-128k',
        name: 'Kimi V1 128k',
        contextWindow: 128000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: false },
      },
    ],
  },
  
  glm: {
    id: 'glm',
    name: 'Zhipu GLM',
    type: 'openai',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    requiresApiKey: true,
    icon: '/logos/glm.svg',
    models: [
      {
        id: 'glm-4-plus',
        name: 'GLM-4-Plus',
        contextWindow: 128000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'glm-4-0520',
        name: 'GLM-4',
        contextWindow: 128000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'glm-4-airx',
        name: 'GLM-4-AirX',
        contextWindow: 8000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'glm-4-air',
        name: 'GLM-4-Air',
        contextWindow: 128000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'glm-4-flashx',
        name: 'GLM-4-FlashX',
        contextWindow: 128000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'glm-4.5-flash',
        name: 'GLM-4.5-Flash',
        contextWindow: 128000,
        outputWindow: 96000,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'glm-4-long',
        name: 'GLM-4-Long',
        contextWindow: 1000000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: false },
      },
    ],
  },

  qwen: {
    id: 'qwen',
    name: 'Qwen',
    type: 'openai',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    requiresApiKey: true,
    icon: '/logos/qwen.svg',
    models: [
      {
        id: 'qwen3.5-flash',
        name: 'Qwen3.5 Flash',
        contextWindow: 1000000,
        outputWindow: 65536,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'qwen3.5-plus',
        name: 'Qwen3.5 Plus',
        contextWindow: 1000000,
        outputWindow: 65536,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'qwen3-max',
        name: 'Qwen3 Max',
        contextWindow: 262144,
        outputWindow: 65536,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'qwen3-vl-plus',
        name: 'Qwen3 VL Plus',
        contextWindow: 262144,
        outputWindow: 32768,
        capabilities: { streaming: true, tools: true, vision: true },
      },
    ],
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'openai',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    requiresApiKey: true,
    icon: '/logos/deepseek.svg',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek-V3',
        contextWindow: 64000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek-R1',
        contextWindow: 64000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: false },
      },
    ],
  },

  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow',
    type: 'openai',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    requiresApiKey: true,
    icon: '/logos/siliconflow.svg',
    models: [
      // DeepSeek Series
      {
        id: 'deepseek-ai/DeepSeek-V3',
        name: 'DeepSeek-V3',
        contextWindow: 64000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'deepseek-ai/DeepSeek-R1',
        name: 'DeepSeek-R1',
        contextWindow: 64000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      // Qwen Series
      {
        id: 'Qwen/Qwen2.5-72B-Instruct',
        name: 'Qwen2.5-72B-Instruct',
        contextWindow: 128000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'Qwen/Qwen2.5-Coder-7B-Instruct',
        name: 'Qwen2.5-Coder-7B-Instruct',
        contextWindow: 128000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'Qwen/Qwen2.5-7B-Instruct',
        name: 'Qwen2.5-7B-Instruct',
        contextWindow: 128000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'Qwen/Qwen3-VL-32B-Instruct',
        name: 'Qwen3-VL-32B-Instruct',
        contextWindow: 256000,
        outputWindow: 32768,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      // MiniMax Series
      {
        id: 'MiniMaxAI/MiniMax-M2',
        name: 'MiniMax-M2',
        contextWindow: 204800,
        outputWindow: 131072,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      // Kimi Series
      {
        id: 'Pro/moonshotai/Kimi-K2.5',
        name: 'Kimi-K2.5',
        contextWindow: 256000,
        outputWindow: 96000,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      // GLM Series
      {
        id: 'THUDM/GLM-Z1-Rumination-32B-0414',
        name: 'GLM-Z1-Rumination-32B',
        contextWindow: 32000,
        outputWindow: 16384,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'THUDM/GLM-4.1V-9B-Thinking',
        name: 'GLM-4.1V-9B-Thinking',
        contextWindow: 64000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
    ],
  },

  doubao: {
    id: 'doubao',
    name: '豆包',
    type: 'openai',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    requiresApiKey: true,
    icon: '/logos/doubao.svg',
    models: [
      {
        id: 'doubao-seed-2-0-pro-260215',
        name: 'Doubao Seed 2.0 Pro',
        contextWindow: 128000,
        outputWindow: 32768,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'doubao-seed-2-0-lite-260215',
        name: 'Doubao Seed 2.0 Lite',
        contextWindow: 128000,
        outputWindow: 32768,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'doubao-seed-2-0-mini-260215',
        name: 'Doubao Seed 2.0 Mini',
        contextWindow: 128000,
        outputWindow: 32768,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'doubao-seed-1-8-251228',
        name: 'Doubao Seed 1.8',
        contextWindow: 128000,
        outputWindow: 32768,
        capabilities: { streaming: true, tools: true, vision: true },
      },
    ],
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
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        contextWindow: 1000000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'deepseek/deepseek-r1:free',
        name: 'DeepSeek R1 (Free)',
        contextWindow: 128000,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'liquid/lfm-40b:free',
        name: 'Liquid LFM 40B (Free)',
        contextWindow: 32000,
        outputWindow: 4096,
        capabilities: { streaming: true, tools: true, vision: false },
      },
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini 1.5 Pro',
        contextWindow: 1048576,
        outputWindow: 8192,
        capabilities: { streaming: true, tools: true, vision: true },
      },
      {
        id: 'google/gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro Preview (via OpenRouter)',
        contextWindow: 1048576,
        outputWindow: 65536,
        capabilities: { streaming: true, tools: true, vision: true },
      }
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

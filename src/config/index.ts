export interface SoloAIConfig {
  gemini?: {
    apiKey?: string;
  };
  openai?: {
    apiKey?: string;
  };
  anthropic?: {
    apiKey?: string;
  };
  xai?: {
    apiKey?: string;
  };
  mistral?: {
    apiKey?: string;
  };
  nvidia?: {
    apiKey?: string;
  };
}

let config: SoloAIConfig = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  xai: {
    apiKey: process.env.XAI_API_KEY,
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
  },
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY,
  },
};

export const init = (newConfig: SoloAIConfig) => {
  config = {
    ...config,
    ...newConfig,
    gemini: { ...config.gemini, ...newConfig.gemini },
    openai: { ...config.openai, ...newConfig.openai },
    anthropic: { ...config.anthropic, ...newConfig.anthropic },
    xai: { ...config.xai, ...newConfig.xai },
    mistral: { ...config.mistral, ...newConfig.mistral },
    nvidia: { ...config.nvidia, ...newConfig.nvidia },
  };
};

export const getConfig = () => config;

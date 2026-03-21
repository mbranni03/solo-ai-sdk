export const FoundationalModels = Object.freeze({
  "KIMI_K_2.5": {
    aws_bedrock: {
      modelId: "moonshotai.kimi-k2.5",
      pp1mInputTokens: 0.6,
      pp1mOutputTokens: 3.0,
    },
  },
  "CLAUDE_OPUS_4.6": {
    aws_bedrock: {
      modelId: "anthropic.claude-opus-4-6-v1",
      pp1mInputTokens: 5.0,
      pp1mOutputTokens: 25.0,
    },
  },
  "GLM_4.7_FLASH": {
    aws_bedrock: {
      modelId: "zai.glm-4.7-flash",
      pp1mInputTokens: 0.07,
      pp1mOutputTokens: 0.4,
    },
  },
  GLM_5: {
    aws_bedrock: {
      modelId: "zai.glm-5",
      pp1mInputTokens: 1.0,
      pp1mOutputTokens: 3.2,
    },
  },
});

export const FoundationalModels = Object.freeze({
  "kimi-k2.5": {
    aws_bedrock: {
      modelId: "moonshotai.kimi-k2.5",
      pp1mInputTokens: 0.6,
      pp1mOutputTokens: 3.0,
    },
  },
  "claude-opus-4-6": {
    aws_bedrock: {
      modelId: "anthropic.claude-opus-4-6-v1",
      pp1mInputTokens: 5.0,
      pp1mOutputTokens: 25.0,
    },
  },
  "glm-4.7-flash": {
    aws_bedrock: {
      modelId: "zai.glm-4.7-flash",
      pp1mInputTokens: 0.07,
      pp1mOutputTokens: 0.4,
    },
  },
  "glm-5": {
    aws_bedrock: {
      modelId: "zai.glm-5",
      pp1mInputTokens: 1.0,
      pp1mOutputTokens: 3.2,
    },
  },
});

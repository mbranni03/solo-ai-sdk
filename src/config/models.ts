export const FoundationalModels = Object.freeze({
  "kimi-k2.5": {
    aws_bedrock: {
      modelId: "moonshotai.kimi-k2.5",
      pp1mInputTokens: 0.6,
      pp1mOutputTokens: 3.0,
    },
  },
  "claude-haiku-4-5": {
    aws_bedrock: {
      modelId: "anthropic.claude-haiku-4-5-20251001-v1:0",
      pp1mInputTokens: 1,
      pp1mOutputTokens: 5,
    },
  },
  "claude-sonnet-4-6": {
    aws_bedrock: {
      modelId: "anthropic.claude-sonnet-4-6",
      pp1mInputTokens: 3,
      pp1mOutputTokens: 15,
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
  "nova-2-lite": {
    aws_bedrock: {
      modelId: "us.amazon.nova-2-lite-v1:0",
      pp1mInputTokens: 0.3,
      pp1mOutputTokens: 2.5,
    },
  },
  "nemotron-3-super-120b-a12b": {
    aws_bedrock: {
      modelId: "nvidia.nemotron-super-3-120b",
      pp1mInputTokens: 0.15,
      pp1mOutputTokens: 0.65,
    },
  },
});

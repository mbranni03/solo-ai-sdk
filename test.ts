import Agent from "./src";
import { FoundationalModels } from "./src/config/models";

const agent = new Agent("bedrock");

// 1. Unified generation with usage (OpenAI ChatCompletion format)
console.log("--- Generating... ---");
const response = await agent.generate(
  "You are a helpful story teller.",
  [
    {
      role: "user",
      content: "What is the primary directive of a robot in 3 words?",
    },
  ],
  {
    model: FoundationalModels["glm-4.7-flash"].aws_bedrock.modelId,
  },
);

console.log("Model:", response.model);
console.log("Answer:", response.choices?.[0]?.message?.content);
console.log("Finish Reason:", response.choices?.[0]?.finish_reason);
console.log("Usage:", response.usage);
console.log("\n-------------------\n");

// 2. SSE Streaming with OpenAI chat.completion.chunk format
console.log("--- Streaming... ---");
const stream = agent.streamSSE(
  "You are a helpful assistant.",
  [
    {
      role: "user",
      content: "Tell me a short story about a robot.",
    },
  ],
  {
    model: FoundationalModels["glm-4.7-flash"].aws_bedrock.modelId,
  },
);

const reader = stream.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === "[DONE]") {
        if (jsonStr === "[DONE]") console.log("\n\n--- Stream finished ---");
        continue;
      }

      try {
        const data = JSON.parse(jsonStr);

        // Extract content from delta (OpenAI format)
        const delta = data.choices?.[0]?.delta;
        if (delta?.content) {
          process.stdout.write(delta.content);
        }

        // Check for final chunk with usage
        if (data.choices?.[0]?.finish_reason === "stop" && data.usage) {
          console.log("\n\n--- Usage Tracking (OpenAI format) ---");
          console.log(`Prompt tokens: ${data.usage.prompt_tokens}`);
          console.log(`Completion tokens: ${data.usage.completion_tokens}`);
          console.log(`Total tokens: ${data.usage.total_tokens}`);
          console.log("--------------------------------------");
        }
      } catch (e) {
        // skip parsing error for partial chunks
      }
    }
  }
}

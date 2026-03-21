import Agent from "./src";
import { FoundationalModels } from "./src/config/models";

const agent = new Agent("bedrock");

// 1. Unified generation with usage
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
    model: FoundationalModels["GLM_5"].aws_bedrock.modelId,
  }
);

console.log("Answer:", response.content);
console.log("Usage:", response.usage);
console.log("\n-------------------\n");

// 2. SSE Streaming with usage in the 'done' event
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
    model: FoundationalModels["GLM_5"].aws_bedrock.modelId,
  }
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
      if (!jsonStr || jsonStr === "[DONE]") continue;

      try {
        const data = JSON.parse(jsonStr);
        if (data.type === "chunk") {
          process.stdout.write(data.text || "");
        } else if (data.type === "done") {
          console.log("\n\n--- Usage Tracking via SDK ---");
          console.log(`Input tokens: ${data.usage.input_tokens}`);
          console.log(`Output tokens: ${data.usage.output_tokens}`);
          console.log("------------------------------");
        }
      } catch (e) {
        // skip parsing error for partial chunks
      }
    }
  }
}

import Agent from "@/services/agent";
import { z } from "zod";
import { Tool } from "@/types/Tool";

const agent = new Agent("gemini");

const get_weather = new Tool({
  name: "get_weather",
  description: "Get the weather in a given location",
  schema: z.object({
    location: z.string().describe("The city and state"),
  }),
  execute: async ({ location }) => {
    return `The weather in ${location} is sunny.`;
  },
});

console.log("--- Streaming ---");
const stream = await agent.stream(
  "You are a helpful assistant.",
  [{ role: "user", content: "What is the weather in Potomac, MD?" }],
  { tools: { get_weather } },
);
console.log("Stream result:", JSON.stringify(stream, null, 2));

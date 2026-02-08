import Agent from "@/services/agent";
const agent = new Agent("gemini");
const stream = await agent.stream("You are a helpful assistant.", [
  { role: "user", content: "Hello, how are you?" },
]);

const generate = await agent.generate("You are a helpful assistant.", [
  { role: "user", content: "Hello, how are you?" },
]);

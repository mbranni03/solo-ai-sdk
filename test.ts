import Agent from "./src";

const agent = new Agent("gemini");

const response = await agent.generate("You are a helpful assistant.", [
  { role: "user", content: "What is the capital of France?" },
]);

console.log(response);
console.log("\n---------------\n");
console.log(response.content);

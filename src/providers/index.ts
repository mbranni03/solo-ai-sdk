import GeminiProvider from "@/providers/gemini";

const getProvider = (provider: string) => {
  switch (provider) {
    case "gemini":
      return new GeminiProvider();
    default:
      throw new Error("Provider not found");
  }
};

export default getProvider;

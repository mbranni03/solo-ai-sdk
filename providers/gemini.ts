const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GeminiProvider = async () => {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": GEMINI_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: "Explain how AI works." }],
          },
        ],
      }),
    },
  );

  const data = await response.json();
  return data;
};

export default GeminiProvider;

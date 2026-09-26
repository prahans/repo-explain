import { GoogleGenAI } from "@google/genai";

export async function POST() {
  // This temporary test endpoint runs only during development.
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { message: "GEMINI_API_KEY is missing from .env.local" },
      { status: 500 },
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input:
        "Explain what a GitHub repository is in two short sentences for a beginner.",
    });

    const text = result.output_text;

    if (!text?.trim()) {
      return Response.json(
        { message: "Gemini returned no text" },
        { status: 502 },
      );
    }

    return Response.json({ text });
  } catch (error) {
    console.error("Gemini test failed:", error);

    return Response.json(
      { message: "Gemini request failed. Check the server terminal." },
      { status: 502 },
    );
  }
}

export async function callLLM(provider, config, messages) {
  const username = localStorage.getItem("username");
  const apiKey = localStorage.getItem(`apiKey_${username}`);

  if (!apiKey && provider.toLowerCase() === "groq") {
    console.error("No API key found in localStorage for user:", username);
    return "Error: No API key provided. Please enter an API key in the dashboard.";
  }

  try {
    switch (provider.toLowerCase()) {
      case "chatgpt":
      case "openai": {
        const res = await fetch(`${process.env.REACT_APP_GROQ_API_LINK}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            top_p: config.topP,
          }),
        });

        const data = await res.json();
        return (
          data?.choices?.[0]?.message?.content || "No response from OpenAI"
        );
      }

      case "groq": {
        const res = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: config.model,
              messages,
              temperature: config.temperature,
              max_tokens: config.maxTokens,
              top_p: config.topP,
            }),
          }
        );

        const data = await res.json();
        return data?.choices?.[0]?.message?.content || "No response from Groq";
      }

      case "gemini": {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: messages.map((m) => ({ text: m.content })),
                },
              ],
              generationConfig: {
                temperature: config.temperature,
                topP: config.topP,
                maxOutputTokens: config.maxTokens,
              },
            }),
          }
        );

        const data = await res.json();
        return (
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "No response from Gemini"
        );
      }

      default: {
        const res = await fetch(`${process.env.REACT_APP_GROQ_API_LINK}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            top_p: config.topP,
          }),
        });

        const data = await res.json();
        return data?.choices?.[0]?.message?.content || "No response from Groq";
      }
    }
  } catch (err) {
    console.error(`[LLM ERROR - ${provider}]:`, err);
    return `Error calling ${provider}: ${err.message || "Unknown error"}`;
  }
}

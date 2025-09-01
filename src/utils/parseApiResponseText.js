export const parseApiResponseText = (apiResponseText, context = "") => {
  console.log("📡 [parseApiResponseText] Raw response:", apiResponseText);

  if (!apiResponseText) return "";

  try {
    let input = apiResponseText;

    // If input is not a string, convert it to a string
    if (typeof input !== "string") {
      input = JSON.stringify(input);
    }

    // 🛠 Remove Markdown code fences like ```json ... ```
    input = input
      .replace(/```json\s*/i, "")
      .replace(/```/g, "")
      .trim();

    // ✅ First try: parse as JSON
    try {
      const parsed = JSON.parse(input);
      if (parsed && typeof parsed === "object" && "display_text" in parsed) {
        return parsed.display_text ?? "";
      }
    } catch (err) {
      // Try sanitization if JSON.parse fails
      const sanitizedInput = input.replace(/\\([()])/g, "\\\\$1");
      const parsed = JSON.parse(sanitizedInput);
      if (parsed && typeof parsed === "object" && "display_text" in parsed) {
        return parsed.display_text ?? "";
      }
    }

    return "";
  } catch (err) {
    console.warn(`⚠️ [parseApiResponseText] Failed to parse (${context}):`, err);

    // Fallback: Extract display_text using regex
    const displayTextMatch = apiResponseText.match(
      /"display_text"\s*:\s*"([^"]*(?:""[^"]*)*)"/
    );
    if (displayTextMatch && displayTextMatch[1]) {
      return displayTextMatch[1].replace(/""/g, '"');
    }

    return "";
  }
};
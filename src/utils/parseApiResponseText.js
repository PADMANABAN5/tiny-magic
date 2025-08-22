export const parseApiResponseText = (apiResponseText, context = "") => {
  console.log("📡 [parseApiResponseText] Raw response:", apiResponseText);

  if (!apiResponseText) return "";

  try {
    let input = apiResponseText;

    // If input is not a string, convert it to a string
    if (typeof input !== "string") {
      input = JSON.stringify(input);
    }

    // Sanitize LaTeX escape sequences (e.g., \( to \\(), \) to \\))
    const sanitizedInput = input.replace(/\\([()])/g, '\\\\$1');

    // Try to parse the sanitized input as JSON
    const parsed = JSON.parse(sanitizedInput);

    // Extract display_text if it exists
    if (parsed && typeof parsed === "object" && "display_text" in parsed) {
      return parsed.display_text ?? "";
    }

    // If display_text is not found, return empty string
    return "";
  } catch (err) {
    console.warn(
      `⚠️ [parseApiResponseText] Failed to parse (${context}):`,
      err
    );

    // Fallback: Extract display_text using regex
    const displayTextMatch = apiResponseText.match(/"display_text"\s*:\s*"([^"]*(?:""[^"]*)*)"/);
    if (displayTextMatch && displayTextMatch[1]) {
      // Unescape double quotes and return the display_text content
      return displayTextMatch[1].replace(/""/g, '"');
    }

    // Return empty string if extraction fails
    return "";
  }
};
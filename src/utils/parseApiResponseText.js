export const parseApiResponseText = (apiResponseText, context = "") => {
  console.log("📡 [parseApiResponseText] Raw response:", apiResponseText);

  if (!apiResponseText) return "";

  let input = apiResponseText;

  if (typeof input !== "string") {
    input = JSON.stringify(input);
  }

  // Remove Markdown fences
  input = input.replace(/```json\s*/i, "").replace(/```/g, "").trim();

  // Try strict JSON first
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === "object" && "display_text" in parsed) {
      return parsed.display_text ?? "";
    }
  } catch (err1) {
    console.warn("⚠️ JSON.parse failed, attempting cleanup:", err1.message);

    // Attempt repairs
    let repaired = input
      .replace(/,\s*([}\]])/g, "$1")     // remove trailing commas
      .replace(/[“”]/g, '"')             // replace smart quotes
      .replace(/\n/g, "\\n")             // escape raw newlines
      .replace(/:\s*undefined/g, ': null') // replace undefined with null
      .replace(/:\s*NaN/g, ': 0');        // replace NaN with 0

    try {
      const parsed = JSON.parse(repaired);
      if (parsed && typeof parsed === "object" && "display_text" in parsed) {
        return parsed.display_text ?? "";
      }
    } catch (err2) {
      console.error("❌ Repair parse failed:", err2.message);
    }
  }

  // Fallback regex to extract display_text manually
  const displayTextMatch = input.match(/"display_text"\s*:\s*"([^"]*)"/);
  if (displayTextMatch && displayTextMatch[1]) {
    return displayTextMatch[1];
  }

  // As last fallback, just return raw text
  return input;
};

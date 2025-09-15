export const parseApiResponseText = (apiResponseText, context = "") => {
  console.log("📡 [parseApiResponseText] Raw response:", apiResponseText);

 if (!apiResponseText) return "";

  // 🔹 If already an object with display_text, return it directly
  if (typeof apiResponseText === "object" && apiResponseText.display_text) {
    return apiResponseText.display_text;
  }

  let input = typeof apiResponseText === "string"
    ? apiResponseText.trim()
    : JSON.stringify(apiResponseText);
  // 🔹 Step 1: Remove markdown fences
  input = input.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

  const tryParse = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  // 🔹 Step 2: Strict parse first
  let parsed = tryParse(input);
  if (parsed && parsed.display_text) return parsed.display_text;

  console.warn("⚠️ JSON.parse failed, trying cleanup...");

  // 🔹 Step 3: Extract JSON-looking block
  const jsonMatch = input.match(/\{[\s\S]*\}/);
  if (jsonMatch) input = jsonMatch[0];

  // 🔹 Step 4: Repair common issues
  let repaired = input
    .replace(/,\s*([}\]])/g, "$1")      // remove trailing commas
    .replace(/[“”‘’]/g, '"')            // smart quotes → normal
    .replace(/:\s*undefined/g, ": null") // undefined → null
    .replace(/:\s*NaN/g, ": 0")          // NaN → 0
    .replace(/:\s*Infinity/g, ": 0")     // Infinity → 0
    .replace(/\n+/g, " ");               // collapse raw newlines

    parsed = tryParse(repaired);
  if (parsed && parsed.display_text) return parsed.display_text;

  console.error("❌ Still not valid JSON, attempting lenient parse...");

  // 🔹 Step 5: Lenient parse → wrap unquoted values in strings
  try {
    const safeJson = repaired.replace(/:\s*([^,"{}\[\]\s][^,}\]]*)/g, (match, value) => {
      // If it looks like a number, leave it
      if (/^-?\d+(\.\d+)?$/.test(value.trim())) return `: ${value.trim()}`;
      // Otherwise wrap in quotes
      return `: "${value.trim()}"`;
    });

    parsed = JSON.parse(safeJson);
    if (parsed && parsed.display_text) return parsed.display_text;
  } catch (err) {
    console.error("❌ Lenient parse failed too", err);
  }

  // 🔹 Step 6: Last resort → try regex for display_text only
  const displayTextMatch = repaired.match(/"display_text"\s*:\s*"([^"]+)"/);
  if (displayTextMatch) return displayTextMatch[1];

  // 🔹 Step 7: Absolute fallback → return raw string
  return input;

};

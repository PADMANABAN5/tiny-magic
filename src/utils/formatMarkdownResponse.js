// src/utils/formatMarkdownResponse.js
export function formatMarkdownResponse(responseText) {
  if (!responseText) return '';
 
  let t = String(responseText)
    .replace(/\r\n/g, '\n')        // normalize
    .replace(/[ \t]+\n/g, '\n')    // trim EOL spaces
    .replace(/\n{3,}/g, '\n\n')    // collapse big gaps
    .trim();
 
  // Bold heading lines like "Data Refresh:" or "Network Layers:"
  t = t.replace(/(^|\n)([A-Z][A-Za-z0-9 ]+:)/g, (_, pre, title) => `${pre}**${title}**`);
 
  // Convert each contiguous "-" bullet block to an ordered list
  t = t.replace(/(^|\n)(?:\s*-\s+.+)(?:\n\s*-\s+.+)*/g, (block) => {
    const prefixNL = block.startsWith('\n') ? '\n' : '';
    const lines = block.trim().split('\n');
    const numbered = lines
      .map((line, i) => line.replace(/^\s*-\s+/, `${i + 1}. `))
      .join('\n');
    return prefixNL + numbered;
  });
 
  // --- CRITICAL FIXES FOR ALIGNMENT ---
 
  // 1) If a newline sneaks in right after "n.", pull the text back up
  //    e.g., "1.\n  Text" -> "1. Text"
  t = t.replace(/(^|\n)(\d+)\.\s*\n\s+/g, '$1$2. ');
 
  // 2) Do NOT force blank lines before/after numbered items.
  //    (Remove any accidental double blank lines inside lists)
  t = t.replace(/\n{3,}/g, '\n\n');
 
  return t;
}
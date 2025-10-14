// src/utils/formatMarkdownResponse.js
export function formatMarkdownResponse(responseText, opts = {}) {
  const {
    boldHeadings = true,          // bold "Heading:" lines
    normalizeBullets = true,      // normalize • – — * … to "-"
    normalizeNumbers = true,      // unify 1), ①, 1️⃣ -> "1."
    numberDashLists = true,       // convert - items to 1., 2., 3.
    splitInlineEmojiBullets = true,
    stripInlineBold = true,       // remove **...** added by models
  } = opts;

  if (!responseText) return "";

  // Helpers
  const KEYCAP_RE = /([0-9])(?:\uFE0F)?\u20E3/gu; // 0️⃣..9️⃣
  const CIRCLED_MAP = new Map([
    ["①","1."],["②","2."],["③","3."],["④","4."],["⑤","5."],
    ["⑥","6."],["⑦","7."],["⑧","8."],["⑨","9."],["⑩","10."]
  ]);

  // Protect fenced code blocks
  const fenceRe = /```[\s\S]*?```/g;
  const segments = [];
  let last = 0, m;
  while ((m = fenceRe.exec(responseText)) !== null) {
    if (m.index > last) segments.push({ code:false, text: responseText.slice(last, m.index) });
    segments.push({ code:true, text: m[0] });
    last = fenceRe.lastIndex;
  }
  if (last < responseText.length) segments.push({ code:false, text: responseText.slice(last) });

  const out = segments.map(seg => {
    if (seg.code) return seg.text;

    // Protect inline code inside non-code segments
    const inlineRe = /`[^`\n]+`/g;
    const parts = [];
    let li = 0, mi;
    while ((mi = inlineRe.exec(seg.text)) !== null) {
      if (mi.index > li) parts.push({ inline:false, text: seg.text.slice(li, mi.index) });
      parts.push({ inline:true, text: mi[0] });
      li = inlineRe.lastIndex;
    }
    if (li < seg.text.length) parts.push({ inline:false, text: seg.text.slice(li) });

    function processPlain(s) {
      let t = String(s)
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trimStart();

      // 0) Strip random inline bold
      if (stripInlineBold) {
        t = t.replace(/\*\*(.*?)\*\*/g, "$1");
      }

      // A) Split inline emoji/diamond bullets → real lines (- )
      if (splitInlineEmojiBullets) {
        const inlineBulletClass =
          /([^\n])\s*(?:[\u25C6\u25C7\u25C8\u25C9\u25AA\u25AB\u25CF\u25CB\u25E6\u2022\u2023\u2043\u204C\u204D\u2027\u2219]|\u{1F536}|\u{1F537}|\u{1F538}|\u{1F539})\s+/gu;
        t = t.replace(inlineBulletClass, (_m, prev) => `${prev}\n- `);
      }

      // B) Normalize bullets at start of lines -> "- "
      if (normalizeBullets) {
        t = t.replace(
          /(^|\n)[ \t]*(?:[\u2022\u2023\u2043\u204C\u204D\u2027\u2219\-\*\u25AA\u25AB\u25CF\u25CB\u25C6\u25C7\u25C8\u25C9\u25E6\u2013\u2014]|\u{1F536}|\u{1F537}|\u{1F538}|\u{1F539})\s+/gu,
          "$1- "
        );
      }

      // C) Force line-breaks before inline numbered items like "… are: 1. A 2. B 3. C"
      t = t.replace(/([^\n])\s+(\d+)\.\s/g, (_, prev, n) => `${prev}\n${n}. `);

      // C1) Also handle "1.Title 2.Next" (no space after dot, typical in 3.5)
      t = t.replace(/([^\n])(\d+)\.(?=[A-Za-z])/g, (_, prev, n) => `${prev}\n${n}. `);

      // Ensure a blank line before a list for Markdown
      t = t.replace(/([^\n])\n(\d+\.\s)/g, "$1\n\n$2");

      // D) Normalize numbering styles
      if (normalizeNumbers) {
        // keycaps -> "n."
        t = t.replace(KEYCAP_RE, (_full, d) => `${d}.`);
        // circled -> "n."
        for (const [k,v] of CIRCLED_MAP) t = t.replace(new RegExp(k,"gu"), v);
        // "1)"/"1-"/"1:" -> "1. "
        t = t.replace(/(^|\n)(\s*)(\d+)[\)\-:]\s+/g, (_ , pre, sp, n) => `${pre}${sp}${n}. `);
      }

      // E) Bold topic title inside numbered lines (sanitize accidental inner numbering/bullets)
      t = t.replace(
        /(^|\n)(\s*)(\d+)\.\s*([^\n]*?)(\s*(?:–|—|-|:))/g,
        (_, nl, sp, n, maybeTitle, sep) => {
          let title = (maybeTitle || "").trim();
          // remove accidental leading bullet/number inside the title: "2. Factoring", "- Terms"
          title = title.replace(/^(?:-|\d+\.)\s*/, "");
          title = title.replace(/\s{2,}/g, " ");
          if (!title) return `${nl}${sp}${n}. `;
          return `${nl}${sp}${n}. **${title}**${sep}`;
        }
      );

      // F) Bold standalone "Heading:" lines (not list items)
      if (boldHeadings) {
        t = t.replace(
          /(^|\n)(?!\s*(?:-|\d+\.)\s)([A-Za-z][A-Za-z0-9/&()., \-]{2,}:\s*)(?=$|\n)/g,
          "$1**$2**"
        );
      }
      // 0b) Strip single-asterisk and single-underscore italics: *like this* or _like this_
t = t
  // remove *italics* but keep **bold**
  .replace(/(^|[^*])\*(?!\*)([^*\n]+)\*(?!\*)/g, "$1$2")
  // remove _italics_ but keep __bold__
  .replace(/(^|[^_])_(?!_)([^_\n]+)_(?!_)/g, "$1$2");

      // G) Convert dash lists to ordered lists (optional)
      if (numberDashLists) {
        t = t.replace(/(^|\n)(?:\s*-\s+.+)(?:\n\s*-\s+.+)*/g, (block) => {
          const prefixNL = block.startsWith("\n") ? "\n" : "";
          const lines = block.trim().split("\n");
          if (lines.every(l => /^\s*\d+\.\s+/.test(l))) return block;
          return prefixNL + lines.map((l,i) => l.replace(/^\s*-\s+/, `${i+1}. `)).join("\n");
        });
      }

      // H) Fix broken list breaks: "1.\n  Text" -> "1. Text"
      t = t.replace(/(^|\n)(\d+)\.\s*\n\s+/g, "$1$2. ");

      // Cleanup
      t = t.replace(/\n{3,}/g, "\n\n");
      return t;
    }

    return parts.map(p => (p.inline ? p.text : processPlain(p.text))).join("");
  }).join("");

  return out;
}

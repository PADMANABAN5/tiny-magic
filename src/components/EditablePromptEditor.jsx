import React, { useRef, useEffect } from 'react';

export default function EditablePromptEditor({ initialContent, onSave, style: propStyle = {} }) {
  const editorRef = useRef(null);

  // Replace {{TOKEN}} with protected <span>
  const parseContent = (text) => {
    return text.replace(/({{[^}]+}})/g, (match) => {
      return `<span contenteditable="false" data-token="true" style="user-select: none; background:#e2e3e5;padding:2px;border-radius:3px;">\uFEFF${match}\uFEFF</span>`;
    });
  };

  // Convert HTML back to plain text with {{TAGS}}
  const serializeContent = () => {
    const container = editorRef.current;
    const clone = container.cloneNode(true);
    clone.querySelectorAll('[data-token]').forEach((el) => {
      const text = el.textContent;
      el.replaceWith(document.createTextNode(text));
    });
    return clone.innerText;
  };

  const allowCopyPaste = (e) => {
      e.stopPropagation(); // Prevent global event handlers from blocking
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.innerHTML = parseContent(initialContent);
    }

    const handleKeydown = (e) => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;

      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      const offset = range.startOffset;
      const parent = node.nodeType === 3 ? node.parentElement : node;

      const isToken = (el) =>
        el?.nodeType === 1 && el.getAttribute('data-token') === 'true';

      // Block editing inside token spans
      if (isToken(parent)) {
        e.preventDefault();
        return;
      }

      // Allow all keys except when backspacing or deleting near a token
      if (e.key === 'Backspace') {
        if (
          node.nodeType === 3 && offset === 0 &&
          isToken(node.previousSibling)
        ) {
          e.preventDefault();
        }
        if (
          node.nodeType === 1 &&
          isToken(node.childNodes[offset - 1])
        ) {
          e.preventDefault();
        }
      }

      if (e.key === 'Delete') {
        if (
          node.nodeType === 3 &&
          offset === node.textContent.length &&
          isToken(node.nextSibling)
        ) {
          e.preventDefault();
        }
        if (
          node.nodeType === 1 &&
          isToken(node.childNodes[offset])
        ) {
          e.preventDefault();
        }
      }
    };

    editor?.addEventListener("keydown", handleKeydown);
    return () => {
      editor?.removeEventListener("keydown", handleKeydown);
    };
  }, [initialContent]);

  const handleInput = () => {
    const newText = serializeContent();
    onSave(newText);
  };

  const allowEvent = (e) => {
    e.stopPropagation();         // stop bubbling
    e.nativeEvent.stopImmediatePropagation(); // ✅ also stop native listeners (App.js)
  };

  const baseStyle = {
    minHeight: '150px', // Reduced min to allow flex shrinking
    width: '100%',
    overflowY: 'auto',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    outline: 'none',
    userSelect: 'text',   // override global 'none'
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      className="p-3 bg-light border rounded"
      onInput={handleInput}
      onBlur={handleInput}
      // ✅ Allow inside editor
      onCopy={allowEvent}
      onCut={allowEvent}
      onPaste={allowEvent}
      onKeyDown={allowEvent}
      style={{ ...baseStyle, ...propStyle }}
    />
  );
}
import React, { useRef, useEffect } from 'react';

export default function EditablePromptEditor({ initialContent, onSave, style: propStyle = {} }) {
  const editorRef = useRef(null);

  // Render tokens as styled spans (but editable)
  const parseContent = (text) => {
    return text.replace(/({{[^}]+}})/g, (match) => {
      return `<span style="background:#e2e3e5;padding:2px;border-radius:3px;">${match}</span>`;
    });
  };

  // Convert back to plain text
  const serializeContent = () => {
    const container = editorRef.current;
    return container.innerText;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      editor.innerHTML = parseContent(initialContent);
    }
  }, [initialContent]);

  const handleInput = () => {
    const newText = serializeContent();
    onSave(newText);
  };

  const baseStyle = {
    minHeight: '150px',
    width: '100%',
    overflowY: 'auto',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    outline: 'none',
    userSelect: 'text',
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      className="p-3 bg-light border rounded"
      onInput={handleInput}
      onBlur={handleInput}
      style={{ ...baseStyle, ...propStyle }}
    />
  );
}

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { Tab, Nav, Row, Col, Button } from 'react-bootstrap';
import { FaEdit, FaSave, FaEye } from 'react-icons/fa';

const initialTexts = {
  tab1: { label: 'Concept mentor', content: '' },
  tab2: { label: 'Assessment prompt', content: '' },
  tab3: { label: 'Default values', content: '' },
};

function EditableContent({ tabKey, content, onChange, isEditable }) {
  const ref = useRef(null);
  const hasInitialized = useRef(false);

  const parseContent = (text) => {
    return text.replace(/{{[^}]+}}/g, (match) => {
      return `<span contenteditable="false" data-token="true" style="user-select: none; background:#e2e3e5;padding:2px;border-radius:3px;">${match}</span>`;
    });
  };

  function saveSelection(container) {
    const sel = window.getSelection();
    if (sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;

    return { start, end: start + range.toString().length };
  }

  function restoreSelection(container, savedSel) {
    if (!savedSel) return;

    let charIndex = 0;
    let range = document.createRange();
    range.setStart(container, 0);
    range.collapse(true);

    const nodeStack = [container];
    let node, foundStart = false, stop = false;

    while (!stop && (node = nodeStack.pop())) {
      if (node.nodeType === 3) {
        const nextCharIndex = charIndex + node.length;
        if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
          range.setStart(node, savedSel.start - charIndex);
          foundStart = true;
        }
        if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
          range.setEnd(node, savedSel.end - charIndex);
          stop = true;
        }
        charIndex = nextCharIndex;
      } else {
        let i = node.childNodes.length;
        while (i--) nodeStack.push(node.childNodes[i]);
      }
    }

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const parseJSONContent = (jsonText) => {
    try {
      const obj = JSON.parse(jsonText);
      return Object.entries(obj)
        .map(
          ([key, val]) => `
            <div style="margin-bottom: 8px; font-family: monospace;">
              <span contenteditable="false" style="background:#d3d3d3;padding:2px 6px; border-radius:3px;">"${key}": </span>
              <span
                contenteditable="${isEditable ? 'true' : 'false'}"
                data-key="${key}"
                style="padding:2px 6px; border-bottom: 1px dotted #666; min-width: 50px; display: inline-block;"
                spellCheck="false"
              >${val}</span>
              <span contenteditable="false">,</span>
            </div>`
        )
        .join('');
    } catch (e) {
      return `<pre style="color:red;">Invalid JSON format</pre>`;
    }
  };

  const serializeJSONContent = () => {
    if (!ref.current) return '';
    const valueSpans = ref.current.querySelectorAll('[data-key]');
    let obj = {};
    valueSpans.forEach((span) => {
      const key = span.getAttribute('data-key');
      let val = span.innerText.trim();
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val === '') val = null;
      else if (!isNaN(val) && val !== '') val = Number(val);
      obj[key] = val;
    });
    return JSON.stringify(obj, null, 2);
  };

  const serializeContent = () => {
    if (!ref.current) return '';
    const clone = ref.current.cloneNode(true);
    clone.querySelectorAll('[data-token]').forEach((el) => {
      const text = el.textContent;
      el.replaceWith(document.createTextNode(text));
    });
    return clone.innerText;
  };

  useEffect(() => {
    hasInitialized.current = false;
  }, [tabKey]);

  useEffect(() => {
    if (!ref.current) return;
    const container = ref.current;
    const isFocused = document.activeElement === container;
    const savedSel = isFocused ? saveSelection(container) : null;

    let newContent = '';
    if (tabKey === 'tab3') {
      newContent = parseJSONContent(content);
    } else {
      newContent = parseContent(content);
    }

    if (container.innerHTML !== newContent) {
      container.innerHTML = newContent;
      if (isFocused) restoreSelection(container, savedSel);
    }

    hasInitialized.current = true;
  }, [tabKey, content]);

  useEffect(() => {
  if (!ref.current) return;

  const handleKeyDown = (e) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return; // Only caret, no range

    const { startContainer, startOffset } = range;
    const container = ref.current;

    if (!container) return;

    // Helper to check if node is locked (contenteditable=false) inside tab3
    const isLocked = (node) =>
      node &&
      node.nodeType === 1 &&
      node.getAttribute('contenteditable') === 'false' &&
      container.contains(node);

    if (e.key === 'Backspace') {
      let nodeBefore = null;

      if (startContainer.nodeType === 3) {
        if (startOffset > 0) {
          // splitText is destructive, so instead do this:
          // get previous sibling or previous character node
          // better way:
          nodeBefore = startContainer;
          if (startOffset === 0) {
            nodeBefore = startContainer.previousSibling;
          } else {
            // Caret inside text node but not at start: no locked node before caret in this text node
            // So safe to allow backspace
            return;
          }
        } else {
          nodeBefore = startContainer.previousSibling;
        }
      } else if (startContainer.nodeType === 1) {
        nodeBefore = startContainer.childNodes[startOffset - 1];
      }

      if (isLocked(nodeBefore)) {
        e.preventDefault();
        return;
      }
    } else if (e.key === 'Delete') {
      let nodeAfter = null;

      if (startContainer.nodeType === 3) {
        if (startOffset < startContainer.length) {
          // Caret inside text node and not at end, safe to delete text content
          return;
        } else {
          nodeAfter = startContainer.nextSibling;
        }
      } else if (startContainer.nodeType === 1) {
        nodeAfter = startContainer.childNodes[startOffset];
      }

      if (isLocked(nodeAfter)) {
        e.preventDefault();
        return;
      }
    }
  };

  if (tabKey === 'tab3') {
    ref.current.addEventListener('keydown', handleKeyDown);
  }

  return () => {
    if (ref.current) {
      ref.current.removeEventListener('keydown', handleKeyDown);
    }
  };
}, [tabKey]);


  const handleInput = () => {
    const newText = tabKey === 'tab3' ? serializeJSONContent() : serializeContent();
    onChange(newText);
  };

  return (
    <div
      ref={ref}
      contentEditable={isEditable}
      suppressContentEditableWarning
      spellCheck={false}
      className="p-3 bg-white text-dark border rounded"
      onInput={handleInput}
      onBlur={() => onChange(tabKey === 'tab3' ? serializeJSONContent() : serializeContent())}
      style={{
        minHeight: '300px',
        maxHeight: '400px',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        outline: 'none',
        resize: 'vertical',
        fontFamily: 'monospace',
        userSelect: 'text',
      }}
    />
  );
}

function Prompt() {
  const [texts, setTexts] = useState(initialTexts);
  const [editMode, setEditMode] = useState({ tab1: false, tab2: false, tab3: false });
  const [currentTab, setCurrentTab] = useState('tab1');
  const [editedTexts, setEditedTexts] = useState(initialTexts);

  const fetchTabContent = async (tabKey, fileName) => {
    try {
      const res = await fetch(`/${fileName}`);
      if (!res.ok) throw new Error(`Failed to load ${fileName}`);
      const text = await res.text();
      setTexts((prev) => ({ ...prev, [tabKey]: { ...prev[tabKey], content: text } }));
      setEditedTexts((prev) => ({ ...prev, [tabKey]: { ...prev[tabKey], content: text } }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTabContent('tab1', 'conceptMentor.txt');
    fetchTabContent('tab2', 'assessmentPrompt.txt');
    fetchTabContent('tab3', 'defaultTemplateValues.json');
  }, []);

  const handleEdit = (tab) => {
    setEditMode((prev) => ({ ...prev, [tab]: true }));
  };

  const handleSave = (tab) => {
    setTexts((prev) => ({ ...prev, [tab]: editedTexts[tab] }));
    setEditMode((prev) => ({ ...prev, [tab]: false }));
  };

  return (
    <div className="d-flex flex-column flex-md-row dashboard-container position-relative">
      <Sidebar />
      <div className="flex-grow-1 pt-3 px-4">
        <h3 className="mb-3 text-center">Prompt Management</h3>
        <Tab.Container activeKey={currentTab} onSelect={(k) => setCurrentTab(k)}>
          <Row>
            <Col sm={3}>
              <Nav variant="pills" className="flex-column">
                {Object.keys(texts).map((tabKey) => (
                  <Nav.Item key={tabKey}>
                    <Nav.Link
                      eventKey={tabKey}
                      className="text-start border"
                      style={{ borderColor: currentTab === tabKey ? '#0d6efd' : '#dee2e6' }}
                    >
                      {texts[tabKey].label}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            </Col>
            <Col sm={9}>
              <Tab.Content>
                {Object.keys(texts).map((tabKey) => (
                  <Tab.Pane eventKey={tabKey} key={tabKey}>
                    <div className="border rounded p-3 shadow-sm bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="mb-0">
                          <FaEye className="me-2" />
                          Editor
                        </h5>
                        {!editMode[tabKey] ? (
                          <Button style={{ width: '70px' }} variant="warning" size="sm" onClick={() => handleEdit(tabKey)}>
                            <FaEdit className="me-1" />
                            Edit
                          </Button>
                        ) : (
                          <Button style={{ width: '70px' }} variant="success" size="sm" onClick={() => handleSave(tabKey)}>
                            <FaSave className="me-1" />
                            Save
                          </Button>
                        )}
                      </div>
                      <EditableContent
                        tabKey={tabKey}
                        content={editedTexts[tabKey].content}
                        onChange={(newVal) =>
                          setEditedTexts((prev) => ({
                            ...prev,
                            [tabKey]: { ...prev[tabKey], content: newVal },
                          }))
                        }
                        isEditable={editMode[tabKey]}
                      />
                    </div>
                  </Tab.Pane>
                ))}
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      </div>
    </div>
  );
}

export default Prompt;

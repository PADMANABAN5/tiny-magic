import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { Tab, Nav, Row, Col, Button } from 'react-bootstrap';
import { FaEdit, FaSave, FaEye, FaSyncAlt  } from 'react-icons/fa';
import axios from 'axios'; // Import axios

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
            nodeBefore = startContainer;
            if (startOffset === 0) {
              nodeBefore = startContainer.previousSibling;
            } else {
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

// This function converts plain text "key: value" format to JSON
// It's used specifically for tab3's initial content if it comes as plain text
function convertTxtToJson(text) {
  const lines = text.split('\n');
  const jsonObj = {};

  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length < 2) return; // Skip malformed lines

    const key = parts[0].trim();
    const rawVal = parts.slice(1).join(':').trim(); // Join remaining parts in case value contains colons

    if (!key) return;

    let value;
    if (rawVal === 'true') value = true;
    else if (rawVal === 'false') value = false;
    else if (!isNaN(rawVal) && rawVal !== '') value = Number(rawVal);
    else value = rawVal;

    jsonObj[key] = value;
  });

  return JSON.stringify(jsonObj, null, 2);
}


function Prompt() {
  const [texts, setTexts] = useState(initialTexts);
  const [editMode, setEditMode] = useState({ tab1: false, tab2: false, tab3: false });
  const [currentTab, setCurrentTab] = useState('tab1');
  const [editedTexts, setEditedTexts] = useState(initialTexts);

  const templateMap = {
    tab1: 'conceptMentor',
    tab2: 'assessmentPrompt',
    tab3: 'defaultTemplateValues',
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        console.log("Attempting to fetch templates...");
        const requests = Object.entries(templateMap).map(([, templateType]) => {
          const url = `https://tinymagiq-backend.onrender.com/api/templates/defaults?templateType=${templateType}`;
          console.log(`Fetching: ${url}`);
          return axios.get(url);
        });
        const responses = await Promise.all(requests);
        console.log("Axios responses received:", responses);

        const updatedTexts = {};

        Object.keys(templateMap).forEach((tabKey, i) => {
          const apiResponse = responses[i].data;
          console.log(`Processing tab ${tabKey}, raw apiResponse:`, apiResponse);

          let content = apiResponse.data?.content || ''; 
          
          if (tabKey === 'tab3') {
            console.log(`Tab3 original content:`, content);
            try {
              const parsedJson = JSON.parse(content);
              content = JSON.stringify(parsedJson, null, 2);
            } catch (jsonParseError) {
              console.warn(`Content for ${tabKey} was not valid JSON, attempting plain text conversion.`, jsonParseError);
              try {
                content = convertTxtToJson(content);
                console.log(`Tab3 converted JSON content:`, content);
              } catch (txtConvertError) {
                console.error(`Failed to convert plain text for ${tabKey}:`, txtConvertError);
                content = `<pre style="color:red;">Failed to parse content. Raw: ${content}</pre>`;
              }
            }
          }
          updatedTexts[tabKey] = {
            label: initialTexts[tabKey].label,
            content,
          };
          console.log(`UpdatedTexts for ${tabKey}:`, updatedTexts[tabKey]);
        });

        setTexts(updatedTexts);
        setEditedTexts(updatedTexts);
        console.log("All templates fetched and states updated.");
      } catch (err) {
        console.error('Error loading templates:', err);
        if (axios.isAxiosError(err)) {
          console.error('Axios error details:', err.response?.data, err.response?.status, err.config?.url);
        }
        alert(`Failed to load templates: ${err.response?.data?.message || err.message || 'An unknown error occurred.'}`);
      }
    };

    fetchTemplates();
  }, []);

  const handleEdit = (tab) => {
    setEditMode((prev) => ({ ...prev, [tab]: true }));
  };

  const handleSave = async (tabKey) => {
    const payload = {
      username: 'kavitha',
      templateType: templateMap[tabKey],
      content: editedTexts[tabKey].content,
    };
    console.log("Saving payload:", payload);
    try {
      const res = await axios.post('https://tinymagiq-backend.onrender.com/api/templates', payload);
      
      console.log("Save successful response:", res.data);
      alert('Template saved successfully!');

      // On successful save, update the main 'texts' state and exit edit mode
      setTexts((prev) => ({ ...prev, [tabKey]: editedTexts[tabKey] }));
      setEditMode((prev) => ({ ...prev, [tabKey]: false }));

    } catch (err) {
      console.error('Save error', err);
      if (axios.isAxiosError(err)) {
        console.error('Axios save error details:', err.response?.data, err.response?.status);
        if (err.response?.status === 409) {
          // Specific handling for 409 conflict: template already exists.
          // This means the POST failed to create a *new* template.
          // The frontend should NOT assume an update happened unless the backend explicitly confirmed it.
          console.warn(`Received 409 Conflict for ${tabKey}. Message: ${err.response.data?.message}. Template with this type/username already exists.`);
          alert(`Failed to save: Template for '${texts[tabKey].label}' already exists. No new template was created. Please edit the existing template directly.`);
          
          // IMPORTANT: Do NOT update state or exit edit mode here,
          // as the save operation (creating a *new* template) failed.
          // Keep the user in edit mode with their unsaved changes.
        } else {
          // Handle other HTTP errors (e.g., 400, 500) as actual failures
          alert(`Failed to save: ${err.response?.data?.message || err.message || 'An unknown error occurred.'}`); 
          // Keep user in edit mode as save failed
        }
      } else {
        // Handle non-Axios errors
        alert(`Failed to save: ${err.message || 'An unknown error occurred.'}`);
        // Keep user in edit mode as save failed
      }
      // Revert edited texts to original if save fails (optional, but good for user experience)
      // setEditedTexts(texts); // Uncomment if you want to revert changes on any save failure
    }
  };

  const handleResetToDefault = async (tabKey) => {
    const confirmReset = window.confirm(`Are you sure you want to reset "${texts[tabKey].label}" to its default? This cannot be undone.`);
    if (!confirmReset) return;

    const payload = {
      username: 'kavitha',
      templateType: templateMap[tabKey],
      resetToDefault: true,
    };
    console.log("Resetting to default payload:", payload);

    try {
      await axios.post('https://tinymagiq-backend.onrender.com/api/templates/defaults', payload);

      alert(`${texts[tabKey].label} has been reset to default.`);
      
      const defaultRes = await axios.get(`https://tinymagiq-backend.onrender.com/api/templates/defaults?templateType=${templateMap[tabKey]}`);
      console.log("Refetched default content after reset:", defaultRes.data);

      let newContent = defaultRes.data?.content || '';
      if (tabKey === 'tab3') {
        try {
          const parsedJson = JSON.parse(newContent);
          newContent = JSON.stringify(parsedJson, null, 2);
        } catch (jsonParseError) {
          console.warn(`Content for ${tabKey} after reset was not valid JSON, attempting plain text conversion.`, jsonParseError);
          try {
            newContent = convertTxtToJson(newContent);
          } catch (txtConvertError) {
            console.error(`Failed to convert plain text for ${tabKey} after reset:`, txtConvertError);
            newContent = `<pre style="color:red;">Failed to parse content after reset. Raw: ${newContent}</pre>`;
          }
        }
      }
      setTexts((prev) => ({ ...prev, [tabKey]: { ...prev[tabKey], content: newContent } }));
      setEditedTexts((prev) => ({ ...prev, [tabKey]: { ...prev[tabKey], content: newContent } }));
      setEditMode((prev) => ({ ...prev, [tabKey]: false })); // Exit edit mode after reset
    } catch (err) {
      console.error('Reset to default error', err);
      if (axios.isAxiosError(err)) {
        console.error('Axios reset error details:', err.response?.data, err.response?.status);
      }
      alert(`Failed to reset to default: ${err.response?.data?.message || err.message || 'An unknown error occurred.'}`);
    }
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
                        <div className="d-flex gap-2">
                          {!editMode[tabKey] ? (
                            <>
                              <Button
                                style={{ width: '70px' }}
                                variant="warning"
                                size="sm"
                                onClick={() => handleEdit(tabKey)}
                              >
                                <FaEdit className="me-1" />
                                
                              </Button>
                              <Button
                                style={{ width: '70px' }}
                                variant="danger"
                                size="sm"
                                onClick={() => handleResetToDefault(tabKey)}
                                title="Reset to Default"
                              >
                                <FaSyncAlt className="me-1" />
                                
                              </Button>
                            </>
                          ) : (
                            <Button
                              style={{ width: '70px' }}
                              variant="success"
                              size="sm"
                              onClick={() => handleSave(tabKey)}
                            >
                              <FaSave className="me-1" />
                              
                            </Button>
                          )}
                        </div>
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
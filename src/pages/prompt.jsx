import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import { Tab, Nav, Row, Col, Button } from 'react-bootstrap';
import { FaEdit, FaSave, FaEye, FaSyncAlt } from 'react-icons/fa';
import axios from 'axios';

// Improved username retrieval with fallbacks
const getUsername = () => {
  return sessionStorage.getItem("username") || 
         localStorage.getItem("username") || 
         localStorage.getItem("selectedModel") || 
         "guest_user";
};

const username = getUsername(); 

const initialTexts = {
  tab1: { label: 'Concept mentor', content: '' },
  tab2: { label: 'Assessment prompt', content: '' },
  tab3: { label: 'Default values', content: '' },
};

// Improved JSON Editor Component for tab3
function ImprovedJSONEditor({ content, onChange, isEditable }) {
  const [jsonData, setJsonData] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      if (content.trim()) {
        const parsed = JSON.parse(content);
        setJsonData(parsed);
        setError('');
      } else {
        setJsonData({});
      }
    } catch (e) {
      setError('Invalid JSON format');
      setJsonData({});
    }
  }, [content]);

  const handleFieldChange = (key, value) => {
    const updated = { ...jsonData, [key]: value };
    setJsonData(updated);
    // Immediately notify parent component of changes
    onChange(JSON.stringify(updated, null, 2));
  };

  const formatLabel = (key) => {
    return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const renderFieldInput = (key, value) => {
    const stringValue = String(value || '');
    
    if (stringValue.length > 100 || stringValue.includes('\n') || stringValue.includes('\\n')) {
      const displayValue = stringValue.replace(/\\n/g, '\n');
      return (
        <textarea
          className="form-control"
          rows={Math.max(4, Math.min(10, displayValue.split('\n').length + 1))}
          value={displayValue}
          onChange={(e) => handleFieldChange(key, e.target.value.replace(/\n/g, '\\n'))}
          disabled={!isEditable}
          style={{ 
            minHeight: '100px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      );
    }
    
    return (
      <input
        type="text"
        className="form-control"
        value={stringValue}
        onChange={(e) => handleFieldChange(key, e.target.value)}
        disabled={!isEditable}
      />
    );
  };

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <strong>JSON Parse Error:</strong> {error}
        <div className="mt-2">
          <small>Please check the JSON format and try again.</small>
        </div>
      </div>
    );
  }

  return (
    // Scrollable container with fixed height
    <div 
      style={{
        maxHeight: '400px',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '10px',
        border: '1px solid #dee2e6',
        borderRadius: '5px',
        backgroundColor: '#fff'
      }}
    >
      {Object.keys(jsonData).length === 0 ? (
        <div className="alert alert-info" role="alert">
          No configuration fields available.
        </div>
      ) : (
        <div>
          {Object.entries(jsonData).map(([key, value]) => (
            <div key={key} className="card mb-3">
              <div className="card-body">
                <div className="row align-items-start">
                  <div className="col-md-3">
                    <label className="form-label fw-bold text-muted">
                      {formatLabel(key)}
                    </label>
                  </div>
                  <div className="col-md-9">
                    {renderFieldInput(key, value)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 

function EditableContent({ tabKey, content, onChange, isEditable }) {
  // Declare all hooks at the top level (before any early returns)
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
    if (!ref.current || tabKey === 'tab3') return; // Skip for tab3
    const container = ref.current;
    const isFocused = document.activeElement === container;
    const savedSel = isFocused ? saveSelection(container) : null;

    const newContent = parseContent(content);

    if (container.innerHTML !== newContent) {
      container.innerHTML = newContent;
      if (isFocused) restoreSelection(container, savedSel);
    }

    hasInitialized.current = true;
  }, [tabKey, content]);

  // Use improved JSON editor for tab3
  if (tabKey === 'tab3') {
    return (
      <ImprovedJSONEditor
        content={content}
        onChange={onChange}
        isEditable={isEditable}
      />
    );
  }

  // Keep existing logic for tab1 and tab2
  const handleInput = () => {
    const newText = serializeContent();
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
      onBlur={() => onChange(serializeContent())}
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
function convertTxtToJson(text) {
  const lines = text.split('\n');
  const jsonObj = {};

  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length < 2) return;

    const key = parts[0].trim();
    const rawVal = parts.slice(1).join(':').trim();

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
  const [loadingTabs, setLoadingTabs] = useState({});

  const templateMap = {
    tab1: 'conceptMentor',
    tab2: 'assessmentPrompt',
    tab3: 'defaultTemplateValues',
  };

  // Function to fetch user's custom template first, then fallback to default
  const fetchTemplateForTab = async (tabKey) => {
    const templateType = templateMap[tabKey];
    if (!templateType) {
      setLoadingTabs(prev => ({ ...prev, [tabKey]: false }));
      return;
    }

    const currentUsername = getUsername();
    if (!currentUsername || currentUsername === 'null' || currentUsername === '') {
      console.warn('No valid username found, skipping template fetch');
      setLoadingTabs(prev => ({ ...prev, [tabKey]: false }));
      return;
    }

    setLoadingTabs(prev => ({ ...prev, [tabKey]: true }));

    let templateContent = '';
    let templateFound = false;

    try {
      // First, try to fetch user's custom template
      const customTemplateUrl = `${process.env.REACT_APP_API_LINK}/templates?username=${currentUsername}&templateType=${templateType}`;
      console.log(`Fetching custom template for ${tabKey}:`, customTemplateUrl);
      
      const customResponse = await axios.get(customTemplateUrl);
      console.log(`Custom template response for ${tabKey}:`, customResponse.data);
      
      if (customResponse.status === 200 && customResponse.data.success) {
        if (customResponse.data.data?.template?.content) {
          console.log(`✅ Found custom template for ${tabKey}`);
          templateContent = customResponse.data.data.template.content;
          templateFound = true;
        } else if (customResponse.data.data?.content) {
          console.log(`✅ Found custom template for ${tabKey} (alternate structure)`);
          templateContent = customResponse.data.data.content;
          templateFound = true;
        } else {
          console.log(`❌ Custom template response structure unexpected for ${tabKey}:`, customResponse.data);
        }
      } else {
        console.log(`❌ Custom template response not successful for ${tabKey}:`, customResponse.data);
      }
    } catch (customErr) {
      console.log(`⚠️ No custom template found for ${tabKey}, falling back to default. Error:`, customErr.response?.status, customErr.message);
    }

    // If no custom template found, try default template
    if (!templateFound) {
      try {
        const defaultUrl = `${process.env.REACT_APP_API_LINK}/templates/defaults?templateType=${templateType}`;
        console.log(`Fetching default template for ${tabKey}:`, defaultUrl);
        
        const response = await axios.get(defaultUrl);
        console.log(`Default template response for ${tabKey}:`, response.data);
        
        // Handle multiple possible response structures
        if (response.data.success) {
          templateContent = response.data.data?.content || 
                           response.data.data?.defaultContent || 
                           response.data.data?.template?.content || '';
        } else {
          templateContent = response.data.content || 
                           response.data.defaultContent || '';
        }
        
        if (templateContent) {
          console.log(`✅ Found default template for ${tabKey}`);
          templateFound = true;
        } else {
          console.log(`❌ Default template response structure unexpected for ${tabKey}:`, response.data);
        }

      } catch (err) {
        console.error(`❌ Failed to load default template for ${tabKey}:`, err);
        if (axios.isAxiosError(err)) {
          console.error('Axios error details:', err.response?.data, err.response?.status, err.config?.url);
        }
        
        // Show alert after error handling
        setTimeout(() => {
          alert(`❌ Failed to load ${initialTexts[tabKey].label}: ${err.response?.data?.message || err.message || 'An unknown error occurred.'}`);
        }, 100);
      }
    }

    // Process the content regardless of source
    if (templateFound && templateContent) {
      try {
        let processedContent = templateContent;
        
        // Handle tab3 JSON formatting
        if (tabKey === 'tab3') {
          try {
            const parsedJson = JSON.parse(processedContent);
            processedContent = JSON.stringify(parsedJson, null, 2);
          } catch (jsonParseError) {
            console.warn(`Template content for ${tabKey} was not valid JSON, attempting plain text conversion.`, jsonParseError);
            try {
              processedContent = convertTxtToJson(processedContent);
            } catch (txtConvertError) {
              console.error(`Failed to convert plain text for ${tabKey}:`, txtConvertError);
              processedContent = `Failed to parse content. Raw: ${processedContent}`;
            }
          }
        }

        const updatedTabData = {
          label: initialTexts[tabKey].label,
          content: processedContent,
        };

        console.log(`✅ Setting content for ${tabKey}:`, processedContent.substring(0, 200) + '...');
        console.log(`✅ Content length for ${tabKey}:`, processedContent.length);
        setTexts(prev => ({ ...prev, [tabKey]: updatedTabData }));
        setEditedTexts(prev => ({ ...prev, [tabKey]: updatedTabData }));
      } catch (processingError) {
        console.error(`Error processing content for ${tabKey}:`, processingError);
        alert(`❌ Error processing template content for ${texts[tabKey].label}`);
      }
    } else {
      console.log(`❌ No template content found for ${tabKey}`);
      // Set empty content to stop loading
      const emptyTabData = {
        label: initialTexts[tabKey].label,
        content: '',
      };
      setTexts(prev => ({ ...prev, [tabKey]: emptyTabData }));
      setEditedTexts(prev => ({ ...prev, [tabKey]: emptyTabData }));
    }

    // Always clear loading state
    setLoadingTabs(prev => ({ ...prev, [tabKey]: false }));
  };

  // Handle tab selection - fetch data when tab is clicked
  const handleTabSelect = (tabKey) => {
    setCurrentTab(tabKey);
    
    if (!texts[tabKey].content) {
      fetchTemplateForTab(tabKey);
    }
  };

  useEffect(() => {
    fetchTemplateForTab('tab1');
  }, []);

  const handleEdit = (tab) => {
    setEditMode((prev) => ({ ...prev, [tab]: true }));
  };

  const handleSave = async (tabKey) => {
    // Validate username before making API call
    const currentUsername = getUsername();
    if (!currentUsername || currentUsername === 'null' || currentUsername === '') {
      alert('❌ Username is required to save templates. Please log in again.');
      return;
    }

    const payload = {
      username: currentUsername,
      templateType: templateMap[tabKey],
      content: editedTexts[tabKey].content,
    }; 

    try {
      const res = await axios.post(`${process.env.REACT_APP_API_LINK}/templates`, payload);
      
      // Show success alert after API response
      setTimeout(() => {
        alert('✅ Template saved successfully!');
      }, 100);

      setTexts((prev) => ({ ...prev, [tabKey]: editedTexts[tabKey] }));
      setEditMode((prev) => ({ ...prev, [tabKey]: false }));

    } catch (err) {
      console.error('Save error:', err);
      
      // Show error alert after API response with delay
      setTimeout(() => {
        if (axios.isAxiosError(err)) {
          console.error('Axios save error details:', err.response?.data, err.response?.status);
          if (err.response?.status === 409) {
            console.warn(`Received 409 Conflict for ${tabKey}. Message: ${err.response.data?.message}. Template with this type/username already exists.`);
            alert(`⚠️ Failed to save: Template for '${texts[tabKey].label}' already exists. No new template was created. Please edit the existing template directly.`);
          } else {
            alert(`❌ Failed to save: ${err.response?.data?.message || err.message || 'An unknown error occurred.'}`);
          }
        } else {
          alert(`❌ Failed to save: ${err.message || 'An unknown error occurred.'}`);
        }
      }, 100);
    }
  };

  const handleResetToDefault = async (tabKey) => {
    const confirmReset = window.confirm(`⚠️ Are you sure you want to reset "${texts[tabKey].label}" to its default? This will overwrite your current template and cannot be undone.`);
    if (!confirmReset) return;

    // Validate username before making API call
    const currentUsername = getUsername();
    if (!currentUsername || currentUsername === 'null' || currentUsername === '') {
      alert('❌ Username is required to reset templates. Please log in again.');
      return;
    }

    setLoadingTabs(prev => ({ ...prev, [tabKey]: true }));

    const payload = {
      username: currentUsername,
      templateType: templateMap[tabKey],
      resetToDefault: true,
    };

    try {
      console.log(`Resetting ${tabKey} to default with payload:`, payload);
      const response = await axios.post(`${process.env.REACT_APP_API_LINK}/templates/defaults`, payload);
      console.log(`Reset response for ${tabKey}:`, response.data);

      // Show success alert after API response
      setTimeout(() => {
        alert(`✅ ${texts[tabKey].label} has been reset to default.`);
      }, 100);
      
      // Extract the default content from the response
      let content = response.data.data?.defaultContent || response.data.data?.content || '';
      console.log(`Reset content for ${tabKey}:`, content.substring(0, 100) + '...');
      
      // Handle tab3 JSON formatting
      if (tabKey === 'tab3') {
        try {
          const parsedJson = JSON.parse(content);
          content = JSON.stringify(parsedJson, null, 2);
        } catch (jsonParseError) {
          console.warn(`Reset content for ${tabKey} was not valid JSON, attempting plain text conversion.`, jsonParseError);
          try {
            content = convertTxtToJson(content);
          } catch (txtConvertError) {
            console.error(`Failed to convert plain text for ${tabKey}:`, txtConvertError);
            content = `Failed to parse content. Raw: ${content}`;
          }
        }
      }

      const updatedTabData = {
        label: initialTexts[tabKey].label,
        content,
      };

      console.log(`✅ Setting reset content for ${tabKey}`);
      setTexts(prev => ({ ...prev, [tabKey]: updatedTabData }));
      setEditedTexts(prev => ({ ...prev, [tabKey]: updatedTabData }));
      setEditMode((prev) => ({ ...prev, [tabKey]: false }));
      
    } catch (err) {
      console.error('Reset to default error', err);
      
      // Show error alert after API response with delay
      setTimeout(() => {
        if (axios.isAxiosError(err)) {
          console.error('Axios reset error details:', err.response?.data, err.response?.status);
        }
        alert(`❌ Failed to reset to default: ${err.response?.data?.message || err.message || 'An unknown error occurred.'}`);
      }, 100);
    } finally {
      setLoadingTabs(prev => ({ ...prev, [tabKey]: false }));
    }
  };

  return (
    <div className="d-flex flex-column flex-md-row dashboard-container position-relative">
      <Sidebar />
      <div className="flex-grow-1 pt-3 px-4">
        <h3 className="mb-3 text-center">Prompt Management</h3>
        <Tab.Container activeKey={currentTab} onSelect={handleTabSelect}>
          <Row>
            <Col sm={3}>
              <Nav variant="pills" className="flex-column">
                {Object.keys(texts).map((tabKey) => (
                  <Nav.Item key={tabKey}>
                    <Nav.Link
                      eventKey={tabKey}
                      className="text-start border prompt-nav nav-link"
                    >
                      {texts[tabKey].label}
                      {loadingTabs[tabKey] && (
                        <span className="ms-2 spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      )}
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
                          {loadingTabs[tabKey] && (
                            <span className="ms-2 text-muted">Loading...</span>
                          )}
                        </h5>
                        <div className="d-flex gap-2">
                          {!editMode[tabKey] ? (
                            <>
                              <Button
                                style={{ width: '70px', color:'#fff' }}
                                variant="warning"
                                size="sm"
                                onClick={() => handleEdit(tabKey)}
                                disabled={loadingTabs[tabKey]}
                              >
                                <FaEdit className="me-1" />Edit
                              </Button>
                              <Button
                                style={{ width: '80px' }}
                                variant="danger"
                                size="sm"
                                onClick={() => handleResetToDefault(tabKey)}
                                title="Reset to Default"
                                disabled={loadingTabs[tabKey]}
                              >
                                <FaSyncAlt className="me-1" />Reset
                              </Button>
                            </>
                          ) : (
                            <Button
                              style={{ width: '70px' , color:'#fff' }}
                              variant="success"
                              size="sm"
                              onClick={() => handleSave(tabKey)}
                              disabled={loadingTabs[tabKey]}
                            >
                              <FaSave className="me-1" />Save
                            </Button>
                          )}
                        </div>
                      </div>
                      {loadingTabs[tabKey] ? (
                        <div className="text-center p-4">
                          <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                          <div className="mt-2">Loading {texts[tabKey].label}...</div>
                        </div>
                      ) : (
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
                      )}
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
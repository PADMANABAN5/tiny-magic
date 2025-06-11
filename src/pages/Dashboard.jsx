import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import "../styles/dashboard.css";
import { FiSend, FiDownload, FiSave } from "react-icons/fi";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import axios from "axios";
import { callLLM } from "../utils/callLLM.js";
import { processPromptAndCallLLM } from "../utils/processPromptAndCallLLM";

const BASE_URL = process.env.REACT_APP_API_LINK;

function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);
  const model = sessionStorage.getItem("selectedModel");
  const [selectedModel, setSelectedModel] = useState(model);
  const [selectedPrompt, setSelectedPrompt] = useState("conceptMentor");
  const username = sessionStorage.getItem("username");
  const [llmContent, setLlmContent] = useState("");
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isChecked, setIsChecked] = useState(false);
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [isCountsLoading, setIsCountsLoading] = useState(false);
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(
    !sessionStorage.getItem(`apiKey_${username}`)
  );
  const [apiKey, setApiKey] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");
  const [showSaveOptions, setShowSaveOptions] = useState(false);

  // Enhanced state for proper session management
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sessionType, setSessionType] = useState(null); // 'fresh' or 'resume'
  const [resumedFromStatus, setResumedFromStatus] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Refs for outside click detection
  const saveButtonRef = useRef(null);
  const saveOptionsRef = useRef(null);

  const [chatCounts, setChatCounts] = useState({
    stopped: 0,
    paused: 0,
    completed: 0,
    incomplete: 0,
    archived: 0,
  });

  // Handle outside click to close save options
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSaveOptions &&
        saveButtonRef.current &&
        saveOptionsRef.current &&
        !saveButtonRef.current.contains(event.target) &&
        !saveOptionsRef.current.contains(event.target)) {
        setShowSaveOptions(false);
      }
    };

    if (showSaveOptions) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showSaveOptions]);

  // CRITICAL FIX: Clear all session data when starting fresh
  const clearSessionData = () => {
    setChatHistory([]);
    setSessionHistory([]);
    setCurrentChatId(null);
    setSessionType(null);
    setResumedFromStatus(null);

    // Clear session storage
    sessionStorage.removeItem("chatHistory");
    sessionStorage.removeItem("currentChatId");
    sessionStorage.removeItem("sessionType");
  };

  // SCENARIO 1: Start fresh mentor message (AUTOMATICALLY for fresh sessions)
  const initiateFirstMentorMessage = async () => {
    // Remove the condition checks - always call Groq API for fresh sessions
    if (sessionStorage.getItem(`apiKey_${username}`)) {
      setIsLoading(true);
      try {
        // CRITICAL: Clear any existing session data first
        clearSessionData();

        const response = await processPromptAndCallLLM({
          username,
          selectedPrompt: "conceptMentor",
          selectedModel,
          sessionHistory: [], // Always empty for fresh start
          userPrompt: "",
        });

        const mentorMessage = response.apiResponseText;
        const updatedHistory = [
          {
            user: "",
            system: mentorMessage,
          },
        ];

        setChatHistory(updatedHistory);
        setSessionHistory([
          {
            Mentee: "",
            Mentor: mentorMessage,
          },
        ]);

        setSessionType('fresh');
        setCurrentChatId(null);
        setResumedFromStatus(null);

        // Store fresh session data
        sessionStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
        sessionStorage.setItem("sessionType", "fresh");

      } catch (err) {
        console.error("❌ Failed to load initial mentor message:", err);
        alert("Failed to start conversation. Please try again.");
      } finally {
        setIsLoading(false);
        setIsInitializing(false);
      }
    } else {
      setIsInitializing(false);
    }
  };

  // SCENARIO 2: Check session status on login
  const checkSessionStatus = async () => {
    if (!username || !sessionStorage.getItem(`apiKey_${username}`)) {
      setIsInitializing(false);
      return;
    }

    setIsLoading(true);
    setIsInitializing(true);

    try {
      const response = await axios.get(`${BASE_URL}/chat/session-status/${username}`);

      if (response.data && response.data.success) {
        const { sessionType, hasActiveSession, shouldStartFresh, chat, message } = response.data.data;

        if (hasActiveSession && chat && !shouldStartFresh) {

          setChatHistory(chat.conversation);

          const loadedSessionHistory = chat.conversation
            .filter(item => item.user !== undefined && item.system !== undefined)
            .map(item => ({ Mentee: item.user, Mentor: item.system }));
          setSessionHistory(loadedSessionHistory);

          setCurrentChatId(chat.id);
          setSessionType('resume');
          setResumedFromStatus(chat.status);

          // Store resumed session data
          sessionStorage.setItem("chatHistory", JSON.stringify(chat.conversation));
          sessionStorage.setItem("currentChatId", chat.id.toString());
          sessionStorage.setItem("sessionType", "resume");

        } else {
          await initiateFirstMentorMessage();
        }
      }

      // Always fetch counts
      await fetchChatCounts();

    } catch (error) {
      console.error("❌ Error checking session status:", error);

      if (error.response && error.response.status === 404) {
        await initiateFirstMentorMessage();
      } else {
        await initiateFirstMentorMessage();
      }
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  const handleToggle = () => {
    const newChecked = !isChecked;
    setIsChecked(newChecked);
    if (newChecked) {
      navigate('/variables');
    }
  };

  const handleApiKeySubmit = async () => {
    if (apiKey.length < 10) {
      setApiKeyError("API Key must be at least 10 characters long");
      return;
    }

    const existingApiKeys = JSON.parse(
      sessionStorage.getItem("apiKeys") || "{}"
    );

    const isKeyUsed = Object.entries(existingApiKeys).some(
      ([storedUsername, storedApiKey]) =>
        storedApiKey === apiKey && storedUsername !== username
    );

    if (isKeyUsed) {
      setApiKeyError("This API Key is already used by another user");
      return;
    }

    sessionStorage.setItem(`apiKey_${username}`, apiKey);
    existingApiKeys[username] = apiKey;
    sessionStorage.setItem("apiKeys", JSON.stringify(existingApiKeys));

    setShowApiKeyPopup(false);
    setApiKeyError("");
  };

  // PDF Download function
  const handleDownloadPDF = () => {
    const chatDiv = document.getElementById("chat-history");
    if (!chatDiv) {
      console.error("Chat history div not found");
      return;
    }

    // Store original styles and scroll position
    const originalMaxHeight = chatDiv.style.maxHeight;
    const originalOverflowY = chatDiv.style.overflowY;
    const originalScrollTop = chatDiv.scrollTop;
    const originalPosition = chatDiv.style.position;
    const originalTop = chatDiv.style.top;

    // Temporarily modify styles to ensure all content is rendered
    chatDiv.style.maxHeight = "none";
    chatDiv.style.overflowY = "visible";

    const parentOfChatDiv = chatDiv.parentElement;
    if (parentOfChatDiv) {
      parentOfChatDiv.style.flexGrow = '0';
    }

    chatDiv.style.position = "absolute";
    chatDiv.style.top = "0";
    chatDiv.style.width = "auto";
    chatDiv.scrollTop = 0;

    setTimeout(() => {
      html2canvas(chatDiv, {
        scale: 2,
        useCORS: true,
      }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let currentHeight = 0;

        while (currentHeight < imgHeight) {
          if (currentHeight > 0) {
            pdf.addPage();
          }
          pdf.addImage(imgData, "PNG", 0, -currentHeight, imgWidth, imgHeight);
          currentHeight += pdfHeight;
        }

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `chat-history-${timestamp}.pdf`;
        pdf.save(filename);

        // Restore original styles
        chatDiv.style.maxHeight = originalMaxHeight;
        chatDiv.style.overflowY = originalOverflowY;
        chatDiv.style.position = originalPosition;
        chatDiv.style.top = originalTop;
        chatDiv.style.width = "";
        chatDiv.scrollTop = originalScrollTop;

        if (parentOfChatDiv) {
          parentOfChatDiv.style.flexGrow = '';
        }

      }).catch(error => {
        console.error("❌ PDF generation error:", error);
        alert("Failed to generate PDF. Please try again.");

        // Restore styles on error
        chatDiv.style.maxHeight = originalMaxHeight;
        chatDiv.style.overflowY = originalOverflowY;
        chatDiv.style.position = originalPosition;
        chatDiv.style.top = originalTop;
        chatDiv.style.width = "";
        chatDiv.scrollTop = originalScrollTop;

        if (parentOfChatDiv) {
          parentOfChatDiv.style.flexGrow = '';
        }
      });
    }, 700);
  };

  const handleInputChange = (event) => {
    setPrompt(event.target.value);
  };

  // SCENARIO 3: Save chat with FIXED logic
  const handleSaveChat = async (status) => {
    if (!username) {
      alert("Cannot save chat: User not identified.");
      return;
    }
    if (chatHistory.length === 0) {
      alert("No chat history to save.");
      return;
    }

    setIsLoading(true);
    try {
      let response;
      let actionMessage = "";

      if (currentChatId && sessionType === 'resume') {
        // Update existing conversation
        response = await axios.put(`${BASE_URL}/chat/conversation/${currentChatId}`, {
          conversation: chatHistory,
          status: status
        });
        actionMessage = `Updated existing chat (ID: ${currentChatId})`;
      } else {
        // Create new conversation
        response = await axios.post(`${BASE_URL}/chat`, {
          user_id: username,
          conversation: chatHistory,
          status: status
        });
        actionMessage = "Created new chat";
      }
      setShowSaveOptions(false);

      alert(` Chat saved as ${status}!`);

      // CRITICAL FIX: Handle post-save logic based on shouldStartFresh
      if (response.data.data.shouldStartFresh) {
        clearSessionData();

        if (status === 'completed' || status === 'stopped') {
          setTimeout(async () => {
            await initiateFirstMentorMessage();
          }, 1000); // Small delay to show the completion message
        }

        // Update UI to show fresh state
        setSessionType(status === 'completed' || status === 'stopped' ? 'completed' : 'fresh');

        // Remove current chat tracking
        setCurrentChatId(null);
        setResumedFromStatus(null);

      } else {
        // Update current chat ID for future updates (paused chats)
        const newChatId = response.data.data.id || currentChatId;
        setCurrentChatId(newChatId);
        setSessionType('resume');
        setResumedFromStatus(status);

        if (newChatId) {
          sessionStorage.setItem("currentChatId", newChatId.toString());
          sessionStorage.setItem("sessionType", "resume");
        }
      }

      // Update session storage with current state
      sessionStorage.setItem("chatHistory", JSON.stringify(chatHistory));

      // Refresh counts
      await fetchChatCounts();

    } catch (error) {
      console.error("❌ Error saving chat:", error);
      if (error.response) {
        alert(`Failed to save chat: ${error.response.data.message || 'Server error'}`);
      } else {
        alert("Failed to save chat. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // SCENARIO 4: Continue conversation
  const handleSendClick = async () => {
    if (
      !prompt.trim() ||
      !selectedPrompt ||
      selectedModel === "Choose a model"
    ) {
      alert("Please enter a prompt, select a prompt type, and choose a model.");
      return;
    }

    setIsLoading(true);
    const userPrompt = prompt.trim();
    setPrompt("");

    try {
      const initialResponse = await processPromptAndCallLLM({
        username,
        selectedPrompt,
        selectedModel,
        sessionHistory,
        userPrompt: userPrompt,
      });

      const newChatEntry = {
        user: userPrompt,
        system: initialResponse.apiResponseText,
      };

      let currentChatHistory = [];

      setChatHistory((prev) => {
        currentChatHistory = [...prev, newChatEntry];
        sessionStorage.setItem("chatHistory", JSON.stringify(currentChatHistory));
        return currentChatHistory;
      });

      setSessionHistory((prev) => [
        ...prev,
        { Mentee: userPrompt, Mentor: initialResponse.apiResponseText },
      ]);

      // Auto-save progress for resumed sessions (but not for fresh sessions)
      if (currentChatId && sessionType === 'resume') {
        try {
          await axios.put(`${BASE_URL}/chat/conversation/${currentChatId}`, {
            conversation: currentChatHistory,
            status: 'incomplete'
          });
        } catch (saveError) {
          console.error("⚠️ Failed to auto-save progress:", saveError);
        }
      }

      // Handle assessment if conversation ended
      if (initialResponse.endRequested || initialResponse.interactionCompleted) {

        const assessmentResponse = await processPromptAndCallLLM({
          username,
          selectedPrompt: "assessmentPrompt",
          selectedModel,
          sessionHistory: [
            ...sessionHistory,
            { Mentee: userPrompt, Mentor: initialResponse.apiResponseText },
          ],
          userPrompt: userPrompt,
        });

        setLlmContent(assessmentResponse.apiResponseText);

        const assessmentChatEntry = {
          user: "",
          system: assessmentResponse.apiResponseText,
        };

        setChatHistory((prev) => {
          const updatedHistory = [...prev, assessmentChatEntry];
          sessionStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
          return updatedHistory;
        });

        setSessionHistory((prev) => [
          ...prev,
          { Mentee: "", Mentor: assessmentResponse.apiResponseText },
        ]);

        setSelectedPrompt("conceptMentor");

        // Auto-save with assessment for resumed sessions
        if (currentChatId && sessionType === 'resume') {
          try {
            const finalHistory = [...currentChatHistory, assessmentChatEntry];
            await axios.put(`${BASE_URL}/chat/conversation/${currentChatId}`, {
              conversation: finalHistory,
              status: 'incomplete'
            });
          } catch (saveError) {
            console.error("⚠️ Failed to auto-save assessment:", saveError);
          }
        }
      }

    } catch (error) {
      console.error("❌ Error in API request:", error);
      if (error.response) {
        alert(`Failed to process request: ${error.response.data.message || 'Server error'}`);
      } else {
        alert("Failed to process request. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendClick();
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  // Fetch chat counts
  const fetchChatCounts = async () => {
    if (!username || !sessionStorage.getItem(`apiKey_${username}`)) {
      return;
    }

    setIsCountsLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/chat/counts/${username}`);

      if (response.data &&
        response.data.success &&
        response.data.data &&
        response.data.data.counts) {

        setChatCounts(response.data.data.counts);
      } else {
        setChatCounts({ stopped: 0, paused: 0, completed: 0, incomplete: 0, archived: 0 });
      }
    } catch (error) {
      console.error("❌ Error loading chat counts:", error);
      setChatCounts({ stopped: 0, paused: 0, completed: 0, incomplete: 0, archived: 0 });
    } finally {
      setIsCountsLoading(false);
    }
  };

  // MAIN INITIALIZATION: Check session status when component mounts
  useEffect(() => {
    if (!showApiKeyPopup) {
      checkSessionStatus();
    }
  }, [username, showApiKeyPopup]);

  // CRITICAL FIX: Don't restore session storage for completed sessions
  useEffect(() => {
    if (!isInitializing && !chatHistory.length) {
      const savedSessionType = sessionStorage.getItem("sessionType");

      // Don't restore if last session was completed
      if (savedSessionType === "completed") {
        clearSessionData();
        return;
      }

      const savedHistory = sessionStorage.getItem("chatHistory");
      const savedChatId = sessionStorage.getItem("currentChatId");

      if (savedHistory && savedSessionType === "resume") {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            setChatHistory(parsedHistory);

            if (savedChatId) {
              setCurrentChatId(parseInt(savedChatId));
              setSessionType('resume');
            }
          }
        } catch (error) {
          console.error("❌ Error parsing saved chat history:", error);
          clearSessionData();
        }
      }
    }
  }, [isInitializing]);

  // Assessment data parsing functions
  const extractScoringData = (content) => {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      const possibleJson = content.match(/\{[\s\S]*"OverallScore"[\s\S]*\}/);
      if (possibleJson) {
        return JSON.parse(possibleJson[0]);
      }
      return {};
    } catch (e) {
      console.error("Error parsing scoring JSON:", e);
      return {};
    }
  };

  const renderScoringTable = (content) => {
    const scoringData = extractScoringData(content);
    return Object.keys(scoringData)
      .filter((key) => key !== "OverallScore" && key !== "EvaluationSummary")
      .map((key) => (
        <tr key={key}>
          <td className="scoring-table">{key}</td>
          <td className="score-cell">{scoringData[key].score}</td>
          <td className="evidence-cell">{scoringData[key].evidence}</td>
        </tr>
      ));
  };

  const renderOverallScoreAndSummary = (content) => {
    const scoringData = extractScoringData(content);
    const overallScore = scoringData.OverallScore || "N/A";
    const evaluationSummary = scoringData.EvaluationSummary || "N/A";

    return (
      <div className="overall-score-summary">
        <div className="overall-score-item">
          <strong className="overall-score-label">🎯 Overall Score:</strong>
          <span className="overall-score-value">{overallScore}</span>
        </div>
        <div className="overall-score-item">
          <strong className="overall-score-label">📋 Evaluation Summary:</strong>
          <span className="overall-summary-value">{evaluationSummary}</span>
        </div>
      </div>
    );
  };

  const parseAssessmentContent = (content) => {
    const detailedAssessmentHeader = "### Part 1: Detailed Assessment";
    const deterministicScoringHeader = "### Part 2: Deterministic Scoring";

    const part1Index = content.indexOf(detailedAssessmentHeader);
    if (part1Index === -1) {
      const altHeader = "### Part1: Detailed Assessment";
      const altPart1Index = content.indexOf(altHeader);
      if (altPart1Index === -1) {
        return content;
      }
      const assessmentStart = altPart1Index + altHeader.length;
      const part2Index = content.indexOf("### Part2: Deterministic Scoring");
      if (part2Index === -1) {
        return content.slice(assessmentStart).trim();
      }
      return content.slice(assessmentStart, part2Index).trim();
    }

    const assessmentStart = part1Index + detailedAssessmentHeader.length;
    const part2Index = content.indexOf(deterministicScoringHeader);
    if (part2Index === -1) {
      return content.slice(assessmentStart).trim();
    }
    return content.slice(assessmentStart, part2Index).trim();
  };

  const hasAssessmentData = (content) => {
    return (
      content &&
      content.includes("Detailed Assessment") &&
      content.includes("Deterministic Scoring")
    );
  };

  return (
    <div className="dashboard-container bg-light">
      {showApiKeyPopup && (
        <div className="modal d-block api-modal-backdrop">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content api-modal-content">
              <div className="modal-header api-modal-header">
                <h5 className="modal-title api-modal-title">🔐 Enter API Key</h5>
              </div>
              <div className="modal-body api-modal-body">
                <input
                  type="text"
                  className="form-control api-modal-input"
                  placeholder="Enter your API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                {apiKeyError && (
                  <div className="text-danger mt-2 api-modal-error">{apiKeyError}</div>
                )}
              </div>
              <div className="modal-footer api-modal-footer">
                <button
                  className="btn btn-primary api-modal-submit"
                  onClick={handleApiKeySubmit}
                  disabled={apiKey.length < 10}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Sidebar />

      <div className="dashboard-content">
        {/* Header Section with Everything in One Line */}
        <div className="dashboard-header">
          {/* Model Info */}
          <div className="model-info-section">
            <h5 className="text-primary mb-0">
              <span className="text-dark">Model: </span>
              <span className="model-badge">{selectedModel || "No Model Selected"}</span>
            </h5>
          </div>

          {/* Count Cards in Horizontal Layout */}
          <div className="counts-container-horizontal">
            {isCountsLoading ? (
              <div className="loading-container-horizontal">
                <div className="spinner-border text-info" role="status">
                  <span className="visually-hidden">Loading counts...</span>
                </div>
                <span>Loading...</span>
              </div>
            ) : (
              <>
                <div className="chat-count-card-horizontal stopped">
                  <div className="card-content">
                    <p className="card-title">Stopped</p>
                    <p className="card-text">{chatCounts.stopped || 0}</p>
                  </div>
                </div>
                <div className="chat-count-card-horizontal paused">
                  <div className="card-content">
                    <p className="card-title">Paused</p>
                    <p className="card-text">{chatCounts.paused || 0}</p>
                  </div>
                </div>
                <div className="chat-count-card-horizontal completed">
                  <div className="card-content">
                    <p className="card-title">Completed</p>
                    <p className="card-text">{chatCounts.completed || 0}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons in Header */}
          {chatHistory.length > 0 && !isInitializing && (
            <div className="action-buttons-horizontal">
              {/* Save Button */}
              <button
                ref={saveButtonRef}
                className="action-button-horizontal"
                onClick={() => setShowSaveOptions(!showSaveOptions)}
                disabled={showApiKeyPopup || isLoading}
                title="💾 Save Chat"
              >
                <FiSave size={18} />
              </button>

              {/* Save Options Dropdown */}
              {showSaveOptions && (
                <div ref={saveOptionsRef} className="save-options-dropdown-horizontal">
                  <h6>💾 Save as:</h6>
                  <button
                    className="btn btn-outline-success"
                    onClick={() => handleSaveChat('completed')}
                    title="Mark as completed - next session will start fresh"
                  >
                    ✅ Completed
                  </button>
                  <button
                    className="btn btn-outline-info"
                    onClick={() => handleSaveChat('paused')}
                    title="Pause session - can be resumed later"
                  >
                    ⏸️ Paused
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    onClick={() => handleSaveChat('stopped')}
                    title="Stop session - next session will start fresh"
                  >
                    ⏹️ Stopped
                  </button>
                </div>
              )}

              {/* Download PDF Button */}
              <button
                className="action-button-horizontal"
                onClick={handleDownloadPDF}
                disabled={showApiKeyPopup || isLoading}
                title="📄 Download PDF"
              >
                <FiDownload size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Chat History Section */}
        <div className="chat-history-container">
          <div id="chat-history" className="chat-history">
            {chatHistory.length === 0 ? (
              <></>
            ) : (
              chatHistory.map((item, index) => (
                <div key={index}>
                  {item.user && (
                    <div className="chat-message user">
                      <div className="message-bubble user">
                        <strong>👤 You:</strong> {item.user}
                      </div>
                    </div>
                  )}

                  <div className="chat-message system">
                    <div className="message-bubble system">
                      {hasAssessmentData(item.system) ? (
                        <div>
                          <div className="message-header">
                            <strong className="message-model-name">{selectedModel}:</strong>
                          </div>

                          <div className="assessment-section">
                            <h6 className="assessment-title">
                              📊 Detailed Assessment:
                            </h6>
                            <p className="assessment-content">
                              {parseAssessmentContent(item.system)}
                            </p>
                          </div>

                          <div>
                            <h6 className="scoring-title">
                              🎯 Deterministic Scoring:
                            </h6>
                            <div className="scoring-table-wrapper">
                              <table className="table table-hover scoring-table">
                                <thead>
                                  <tr>
                                    <th>📝 Category</th>
                                    <th>⭐ Score</th>
                                    <th>📋 Evidence</th>
                                  </tr>
                                </thead>
                                <tbody>{renderScoringTable(item.system)}</tbody>
                              </table>
                            </div>
                            {renderOverallScoreAndSummary(item.system)}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="message-header">
                            <strong className="message-model-name">{selectedModel}:</strong>
                          </div>
                          <div className="message-content">
                            {item.system}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="input-area-container">
          {isLoading && (
            <div className="input-loading-indicator">
              <div className="spinner-border text-primary input-loading-spinner" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span className="input-loading-text">AI is thinking...</span>
            </div>
          )}

          <textarea
            className="form-control"
            placeholder="💭 Type your message here..."
            value={prompt}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={showApiKeyPopup || isLoading || isInitializing}
          />
          <button
            className="btn btn-primary"
            onClick={handleSendClick}
            disabled={!prompt.trim() || showApiKeyPopup || isLoading || isInitializing}
            title="Send message"
          >
            <FiSend size={20} />
          </button>
        </div>
      </div>

      {/* No Action Buttons here anymore - they're in the header */}
    </div>
  );
}

export default Dashboard;
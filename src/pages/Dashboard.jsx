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
import Progressbar from "../components/Progressbar.jsx";

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
  // MODIFICATION 1: Initial stage from API response structure (0 implies not started, or Main Stage 1)
  const [currentStage, setCurrentStage] = useState(0); // Initialize to 0, or determine based on initial API status
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
      if (
        showSaveOptions &&
        saveButtonRef.current &&
        saveOptionsRef.current &&
        !saveButtonRef.current.contains(event.target) &&
        !saveOptionsRef.current.contains(event.target)
      ) {
        setShowSaveOptions(false);
      }
    };

    if (showSaveOptions) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showSaveOptions]);

  // CRITICAL FIX: Clear all session data when starting fresh
  const clearSessionData = () => {
    setChatHistory([]);
    setSessionHistory([]);
    setCurrentChatId(null);
    setCurrentStage(0); // Reset stage to "Main Stage 1" (index 0) on clear
    setSessionType(null);
    setResumedFromStatus(null);

    // Clear session storage
    sessionStorage.removeItem("chatHistory");
    sessionStorage.removeItem("currentChatId");
    sessionStorage.removeItem("sessionType");
  };

  // Function to map API's currentStage to Progressbar's index
  // Progressbar stages:
  // 0: Main Stage 1
  // 1: Main Stage 2
  // 2: Substage 1
  // 3: Substage 2
  // 4: Substage 3
  // 5: Substage 4
  // 6: Substage 5
  // 7: Main Stage 3
  const mapApiStageToProgressbarIndex = (apiCurrentStage, interactionCompleted) => {
    if (interactionCompleted) {
      return 7; // Main Stage 3 (Interaction Completed)
    }
    switch (apiCurrentStage) {
      case 0:
        return 0; // Main Stage 1 (Not started / Initial state)
      case 1:
        return 2; // Substage 1 (after Main Stage 2 which is index 1)
      case 2:
        return 3; // Substage 2
      case 3:
        return 4; // Substage 3
      case 4:
        return 5; // Substage 4
      case 5:
        return 6; // Substage 5
      // If the API returns a stage of 0, but a user has initiated the first message,
      // the `handleSendClick` will set it to Main Stage 2 (index 1).
      // For resumed chats with API currentStage 0, and chat history, we'll assume Main Stage 2.
      default:
        return 0; // Default to Main Stage 1 if something unexpected
    }
  };


  // SCENARIO 1: Start fresh mentor message (AUTOMATICALLY for fresh sessions)
  const initiateFirstMentorMessage = async () => {
    if (sessionStorage.getItem(`apiKey_${username}`)) {
      setIsLoading(true);
      try {
        clearSessionData(); // Ensure a clean slate

        const response = await processPromptAndCallLLM({
          username,
          selectedPrompt: "conceptMentor",
          selectedModel,
          sessionHistory: [],
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
        // MODIFICATION: Set initial stage based on API response for fresh start
        // For a fresh start, currentStage from API might be 0, and interactionCompleted false
        // This corresponds to Main Stage 1.
        setCurrentStage(mapApiStageToProgressbarIndex(response.currentStage, response.interactionCompleted));


        setSessionType("fresh");
        setCurrentChatId(null);
        setResumedFromStatus(null);

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
      const response = await axios.get(
        `${BASE_URL}/chat/session-status/${username}`
      );

      if (response.data && response.data.success) {
        const { sessionType, hasActiveSession, shouldStartFresh, chat } =
          response.data.data;

        if (hasActiveSession && chat && !shouldStartFresh) {
          setChatHistory(chat.conversation);

          const loadedSessionHistory = chat.conversation
            .filter((item) => item.user !== undefined && item.system !== undefined)
            .map((item) => ({ Mentee: item.user, Mentor: item.system }));
          setSessionHistory(loadedSessionHistory);

          setCurrentChatId(chat.id);
          setSessionType("resume");
          setResumedFromStatus(chat.status);

          // MODIFICATION: Set currentStage based on the chat's saved stage from API
          // You'll need `chat.currentStage` and `chat.interactionCompleted` from your backend response
          // For now, let's assume `chat` object includes these. If not, you'll need to fetch them or
          // update your backend response.
          // For a resumed chat, if `chat.currentStage` is 0, but there's history, assume Main Stage 2 (index 1)
          let currentChatStageFromAPI = chat.currentStage !== undefined ? chat.currentStage : 0;
          let interactionCompletedFromAPI = chat.interactionCompleted !== undefined ? chat.interactionCompleted : false;

          if (currentChatStageFromAPI === 0 && chat.conversation.length > 1) { // More than just initial mentor message
              setCurrentStage(1); // Set to Main Stage 2 if API is 0 but chat has started
          } else {
              setCurrentStage(mapApiStageToProgressbarIndex(currentChatStageFromAPI, interactionCompletedFromAPI));
          }


          sessionStorage.setItem("chatHistory", JSON.stringify(chat.conversation));
          sessionStorage.setItem("currentChatId", chat.id.toString());
          sessionStorage.setItem("sessionType", "resume");
        } else {
          await initiateFirstMentorMessage();
        }
      }

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
      navigate("/variables");
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

  const handleDownloadPDF = () => {
    const chatDiv = document.getElementById("chat-history");
    if (!chatDiv) {
      console.error("Chat history div not found");
      return;
    }

    const originalMaxHeight = chatDiv.style.maxHeight;
    const originalOverflowY = chatDiv.style.overflowY;
    const originalScrollTop = chatDiv.scrollTop;
    const originalPosition = chatDiv.style.position;
    const originalTop = chatDiv.style.top;

    chatDiv.style.maxHeight = "none";
    chatDiv.style.overflowY = "visible";

    const parentOfChatDiv = chatDiv.parentElement;
    if (parentOfChatDiv) {
      parentOfChatDiv.style.flexGrow = "0";
    }

    chatDiv.style.position = "absolute";
    chatDiv.style.top = "0";
    chatDiv.style.width = "auto";
    chatDiv.scrollTop = 0;

    setTimeout(() => {
      html2canvas(chatDiv, {
        scale: 2,
        useCORS: true,
      })
        .then((canvas) => {
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

          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
          const filename = `chat-history-${timestamp}.pdf`;
          pdf.save(filename);

          chatDiv.style.maxHeight = originalMaxHeight;
          chatDiv.style.overflowY = originalOverflowY;
          chatDiv.style.position = originalPosition;
          chatDiv.style.top = originalTop;
          chatDiv.style.width = "";
          chatDiv.scrollTop = originalScrollTop;

          if (parentOfChatDiv) {
            parentOfChatDiv.style.flexGrow = "";
          }
        })
        .catch((error) => {
          console.error("❌ PDF generation error:", error);
          alert("Failed to generate PDF. Please try again.");

          chatDiv.style.maxHeight = originalMaxHeight;
          chatDiv.style.overflowY = originalOverflowY;
          chatDiv.style.position = originalPosition;
          chatDiv.style.top = originalTop;
          chatDiv.style.width = "";
          chatDiv.scrollTop = originalScrollTop;

          if (parentOfChatDiv) {
            parentOfChatDiv.style.flexGrow = "";
          }
        });
    }, 700);
  };

  const handleInputChange = (event) => {
    setPrompt(event.target.value);
  };

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

      if (currentChatId && sessionType === "resume") {
        response = await axios.put(`${BASE_URL}/chat/conversation/${currentChatId}`, {
          conversation: chatHistory,
          status: status,
        });
        actionMessage = `Updated existing chat (ID: ${currentChatId})`;
      } else {
        response = await axios.post(`${BASE_URL}/chat`, {
          user_id: username,
          conversation: chatHistory,
          status: status,
        });
        actionMessage = "Created new chat";
      }
      setShowSaveOptions(false);

      alert(` Chat saved as ${status}!`);

      if (response.data.data.shouldStartFresh) {
        clearSessionData();

        if (status === "completed" || status === "stopped") {
          setTimeout(async () => {
            await initiateFirstMentorMessage();
          }, 1000);
        }

        setSessionType(status === "completed" || status === "stopped" ? "completed" : "fresh");

        setCurrentChatId(null);
        setResumedFromStatus(null);
        setCurrentStage(0); // If starting fresh after completion/stop, reset to Main Stage 1
      } else {
        const newChatId = response.data.data.id || currentChatId;
        setCurrentChatId(newChatId);
        setSessionType("resume");
        setResumedFromStatus(status);
        // MODIFICATION: Update stage after save if not starting fresh
        // The stage should reflect the current status of the conversation
        // For a paused/incomplete session, it should stay at its last known stage.
        // We'll rely on the API response for currentStage in handleSendClick
      }

      sessionStorage.setItem("chatHistory", JSON.stringify(chatHistory));
      await fetchChatCounts();
    } catch (error) {
      console.error("❌ Error saving chat:", error);
      if (error.response) {
        alert(`Failed to save chat: ${error.response.data.message || "Server error"}`);
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

      // MODIFICATION: Update currentStage based on initialResponse from API
      // If it's the very first user message and API returns 0 for currentStage,
      // it means we've moved past "Main Stage 1" and are "In Progress" (Main Stage 2).
      // Otherwise, use the API's currentStage and interactionCompleted for more specific mapping.

      let newApiCurrentStage = initialResponse.currentStage;
      let newInteractionCompleted = initialResponse.interactionCompleted;

      // Special case: If first user prompt, and API says stage 0, move to Main Stage 2 (index 1)
      if (chatHistory.length === 0 && newApiCurrentStage === 0 && !newInteractionCompleted) {
        setCurrentStage(1); // Main Stage 2
      } else {
        setCurrentStage(mapApiStageToProgressbarIndex(newApiCurrentStage, newInteractionCompleted));
      }

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

      if (currentChatId && sessionType === "resume") {
        try {
          await axios.put(`${BASE_URL}/chat/conversation/${currentChatId}`, {
            conversation: currentChatHistory,
            status: "incomplete",
            // Also send updated stage info if backend handles it
            current_stage: newApiCurrentStage, // Pass back the current stage from LLM response
            interaction_completed: newInteractionCompleted // Pass back interaction status
          });
        } catch (saveError) {
          console.error("⚠️ Failed to auto-save progress:", saveError);
        }
      }

      if (newInteractionCompleted) { // Use the updated flag directly
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

        // Update stage to Main Stage 3 (index 7) when interaction is completed
        setCurrentStage(7);

        if (currentChatId && sessionType === "resume") {
          try {
            const finalHistory = [...currentChatHistory, assessmentChatEntry];
            await axios.put(`${BASE_URL}/chat/conversation/${currentChatId}`, {
              conversation: finalHistory,
              status: "incomplete", // Or 'completed' if you want to force status here
              current_stage: 5, // Assuming 5 is the final substage before assessment
              interaction_completed: true // Mark as completed interaction
            });
          } catch (saveError) {
            console.error("⚠️ Failed to auto-save assessment:", saveError);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in API request:", error);
      if (error.response) {
        alert(`Failed to process request: ${error.response.data.message || "Server error"}`);
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

  const fetchChatCounts = async () => {
    if (!username || !sessionStorage.getItem(`apiKey_${username}`)) {
      return;
    }

    setIsCountsLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/chat/counts/${username}`);

      if (
        response.data &&
        response.data.success &&
        response.data.data &&
        response.data.data.counts
      ) {
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

  useEffect(() => {
    if (!showApiKeyPopup) {
      checkSessionStatus();
    }
  }, [username, showApiKeyPopup]);


  // CRITICAL FIX: Ensure currentStage is set correctly on initial load/resume
  useEffect(() => {
    if (!isInitializing && !chatHistory.length) {
      const savedSessionType = sessionStorage.getItem("sessionType");

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
              setSessionType("resume");

              // This useEffect runs after checkSessionStatus has likely already run,
              // but as a fallback, ensure currentStage is set if chatHistory is loaded from session storage
              // and checkSessionStatus didn't set it (e.g., if API response was incomplete).
              // We'll try to infer the stage if API didn't provide it directly in `checkSessionStatus`
              // For now, if chatHistory exists from resume, it should generally be Main Stage 2 or higher
              // A more robust solution might involve storing `apiCurrentStage` in sessionStorage as well.
              // For simplicity, if we have history from a resumed session, it means it's "in progress"
              if(parsedHistory.length > 1){ // More than just the initial mentor message
                 setCurrentStage(1); // Set to Main Stage 2
              } else {
                 setCurrentStage(0); // Only initial mentor message, still Main Stage 1
              }
            }
          }
        } catch (error) {
          console.error("❌ Error parsing saved chat history:", error);
          clearSessionData();
        }
      }
    }
  }, [isInitializing, chatHistory.length]); // Add chatHistory.length to dependency array

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
        <div className="dashboard-header">
          <div>
            <Progressbar currentStage={currentStage} />
          </div>
          {/* <div className="model-info-section">
            <h5 className="text-primary mb-0">
              <span className="text-dark">Model: </span>
              <span className="model-badge">{selectedModel || "No Model Selected"}</span>
            </h5>
          </div> */}

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

          {chatHistory.length > 0 && !isInitializing && (
            <div className="action-buttons-horizontal">
              <button
                ref={saveButtonRef}
                className="action-button-horizontal"
                onClick={() => setShowSaveOptions(!showSaveOptions)}
                disabled={showApiKeyPopup || isLoading}
                title="💾 Save Chat"
              >
                <FiSave size={18} />
              </button>

              {showSaveOptions && (
                <div ref={saveOptionsRef} className="save-options-dropdown-horizontal">
                  <h6>💾 Save as:</h6>
                  <button
                    className="btn btn-outline-success"
                    onClick={() => handleSaveChat("completed")}
                    title="Mark as completed - next session will start fresh"
                  >
                    ✅ Completed
                  </button>
                  <button
                    className="btn btn-outline-info"
                    onClick={() => handleSaveChat("paused")}
                    title="Pause session - can be resumed later"
                  >
                    ⏸️ Paused
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    onClick={() => handleSaveChat("stopped")}
                    title="Stop session - next session will start fresh"
                  >
                    ⏹️ Stopped
                  </button>
                </div>
              )}

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
                          <div className="message-content">{item.system}</div>
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
    </div>
  );
}

export default Dashboard;
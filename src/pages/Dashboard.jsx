import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import "../styles/dashboard.css";
import {
  FiSend,
  FiDownload,
  FiSave,
  FiBook,
  FiCheckCircle,
  FiClock,
  FiPlay,
  FiUser,
  FiMessageCircle,
  FiChevronDown,
  FiTarget,
  FiTrendingUp,
  FiStopCircle,
  FiRefreshCw,
  FiAlertCircle
} from "react-icons/fi";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import axios from "axios";
import { processPromptAndCallLLM } from "../utils/processPromptAndCallLLM";
import Progressbar from "../components/Progressbar.jsx";
import Tesseract from 'tesseract.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "jspdf-autotable";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

const BASE_URL = process.env.REACT_APP_API_LINK;

function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);
  const [selectedPrompt, setSelectedPrompt] = useState("conceptMentor");
  const username = sessionStorage.getItem("username");
  const userId = sessionStorage.getItem("userId");
  const [llmContent, setLlmContent] = useState("");
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isChecked, setIsChecked] = useState(false);
  const navigate = useNavigate();
  const [currentStage, setCurrentStage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCountsLoading, setIsCountsLoading] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);

  // Enhanced state for proper session management
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sessionType, setSessionType] = useState(null);
  const [resumedFromStatus, setResumedFromStatus] = useState(null);
  const [currentChatStatus, setCurrentChatStatus] = useState('not_started');
  const [isInitializing, setIsInitializing] = useState(true);

  // New states for chat ending functionality
  const [isChatEnded, setIsChatEnded] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [endReason, setEndReason] = useState(null); // 'endRequested' or 'interactionCompleted'

  const [concepts, setConcepts] = useState([]);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [showConceptDropdown, setShowConceptDropdown] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Refs for outside click detection
  const conceptDropdownRef = useRef(null);
  const topSaveButtonRef = useRef(null);
  const topSaveOptionsRef = useRef(null);

  const [chatCounts, setChatCounts] = useState({
    not_started: 0,
    inprogress: 0,
    completed: 0,
    archived: 0,
  });

  // Function to fetch API key from API
  const fetchApiKey = async () => {
    try {
      console.log("🔑 Fetching API key from server...");
      const response = await axios.get(`${BASE_URL}/apikey`);

      if (response.data && response.data.apiKey) {
        const apiKey = response.data.apiKey;
        sessionStorage.setItem(`apiKey_${username}`, apiKey);
        console.log("✅ API key fetched and stored successfully");
        return apiKey;
      } else {
        throw new Error("No API key received from server");
      }
    } catch (error) {
      console.error("❌ Error fetching API key:", error);
      toast.error("Failed to fetch API key from server. Please try again or contact support.");
      return null;
    }
  };

  // Handle outside click to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showSaveOptions &&
        topSaveButtonRef.current &&
        topSaveOptionsRef.current &&
        !topSaveButtonRef.current.contains(event.target) &&
        !topSaveOptionsRef.current.contains(event.target)
      ) {
        setShowSaveOptions(false);
      }

      if (
        showConceptDropdown &&
        conceptDropdownRef.current &&
        !conceptDropdownRef.current.contains(event.target)
      ) {
        setShowConceptDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSaveOptions, showConceptDropdown]);

  // Helper function to fetch concepts and return them
  const fetchAndReturnConcepts = async () => {
    if (!username || conceptsLoading) return [];

    try {
      console.log("🎯 Fetching concepts for fresh session:", username);
      const response = await axios.get(`${BASE_URL}/pod-users/user/${username}`);

      if (response.data && response.data.success && response.data.data) {
        const conceptsData = response.data.data.batch?.concepts || [];
        console.log("✅ Concepts fetched for fresh session:", conceptsData.length);
        setConcepts(conceptsData);
        return conceptsData;
      } else {
        console.warn("⚠️ No concepts data in response for fresh session");
        return [];
      }
    } catch (error) {
      console.error("❌ Error fetching concepts for fresh session:", error);
      return [];
    }
  };

  // Fetch concepts from API
  const fetchConcepts = async () => {
    if (!username || conceptsLoading) return;

    setConceptsLoading(true);
    try {
      console.log("🎯 Fetching concepts for user:", username);
      const response = await axios.get(`${BASE_URL}/pod-users/user/${username}`);

      if (response.data && response.data.success && response.data.data) {
        const conceptsData = response.data.data.batch?.concepts || [];
        console.log("✅ Concepts loaded:", conceptsData.length);
        setConcepts(conceptsData);

        // Auto-select first active concept if none selected and auto-start conversation
        const firstActiveConcept = conceptsData.find(concept => concept.is_active) || conceptsData[0];
        if (firstActiveConcept && !selectedConcept) {
          console.log("🎯 Auto-selecting concept:", firstActiveConcept.concept_name);
          setSelectedConcept(firstActiveConcept);

          // If we have API key and no chat history, auto-start conversation
          if (sessionStorage.getItem(`apiKey_${username}`) && chatHistory.length === 0 && !isInitializing) {
            console.log("🚀 Auto-starting conversation after concept selection");
            setTimeout(async () => {
              await initiateFirstMentorMessageWithConcept(firstActiveConcept);
            }, 500);
          }
        }
      } else {
        console.warn("⚠️ No concepts data in response");
        setConcepts([]);
      }
    } catch (error) {
      console.error("❌ Error fetching concepts:", error);
      setConcepts([]);
      if (error.response?.status !== 404) {
        toast.error("Failed to load concepts. Please try again.");
      }
    } finally {
      setConceptsLoading(false);
    }
  };

  // Initiate first mentor message with specific concept
  const initiateFirstMentorMessageWithConcept = async (concept) => {
    if (!sessionStorage.getItem(`apiKey_${username}`) || !concept) {
      setIsInitializing(false);
      return;
    }

    console.log("🚀 Initiating first mentor message with concept:", concept.concept_name);
    setIsLoading(true);
    try {
      clearSessionData();
      const response = await processPromptAndCallLLM({
        username,
        selectedPrompt: "conceptMentor",
        selectedModel: "gpt-4o",
        sessionHistory: [],
        userPrompt: "",
        selectedConcept: concept,
      });

      const mentorMessage = response.apiResponseText;
      const updatedHistory = [{ user: "", system: mentorMessage }];

      setChatHistory(updatedHistory);
      setSessionHistory([{ Mentee: "", Mentor: mentorMessage }]);
      setCurrentStage(0);
      setCurrentChatStatus('not_started');
      setSessionType("fresh");
      setCurrentChatId(null);
      setResumedFromStatus(null);
      setIsChatEnded(false);
      setEndReason(null);
      sessionStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
      sessionStorage.setItem("sessionType", "fresh");

      console.log("✅ First mentor message initiated successfully");
    } catch (err) {
      console.error("❌ Failed to load initial mentor message:", err);
      toast.error("Failed to start conversation. Please try again.");
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  const clearSessionData = () => {
    setChatHistory([]);
    setSessionHistory([]);
    setCurrentChatId(null);
    setCurrentStage(0);
    setSessionType(null);
    setResumedFromStatus(null);
    setCurrentChatStatus('not_started');
    setIsChatEnded(false);
    setEndReason(null);
    sessionStorage.removeItem("chatHistory");
    sessionStorage.removeItem("currentChatId");
    sessionStorage.removeItem("sessionType");
  };

  // Updated stage mapping to match API response
  const mapApiStageToProgressbarIndex = (apiCurrentStage, status, interactionCompleted) => {
    if (interactionCompleted || status === 'completed') return 7;
    if (status === 'not_started') return 0;

    // For inprogress status, map API stages 0-5 to progress stages 0-6
    switch (apiCurrentStage) {
      case 0: return 1; // Stage 0 -> Progress 1 (just started)
      case 1: return 2; // Stage 1 -> Progress 2
      case 2: return 3; // Stage 2 -> Progress 3
      case 3: return 4; // Stage 3 -> Progress 4
      case 4: return 5; // Stage 4 -> Progress 5
      case 5: return 6; // Stage 5 -> Progress 6
      default: return 1;
    }
  };

  const initiateFirstMentorMessage = async () => {
    if (!sessionStorage.getItem(`apiKey_${username}`) || !selectedConcept) {
      setIsInitializing(false);
      return;
    }

    console.log("🚀 Initiating first mentor message");
    setIsLoading(true);
    try {
      const response = await processPromptAndCallLLM({
        username,
        selectedPrompt: "conceptMentor",
        selectedModel: "gpt-4o",
        sessionHistory: [],
        userPrompt: "",
        selectedConcept: selectedConcept,
      });

      const mentorMessage = response.apiResponseText;
      const updatedHistory = [{ user: "", system: mentorMessage }];

      setChatHistory(updatedHistory);
      setSessionHistory([{ Mentee: "", Mentor: mentorMessage }]);
      setCurrentStage(0);
      setCurrentChatStatus('not_started');
      setSessionType("fresh");
      setCurrentChatId(null);
      setResumedFromStatus(null);
      setIsChatEnded(false);
      setEndReason(null);
      sessionStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
      sessionStorage.setItem("sessionType", "fresh");
    } catch (err) {
      console.error("❌ Failed to load initial mentor message:", err);
      toast.error("Failed to start conversation. Please try again.");
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  // Function to handle chat restart with save dialog
  const handleRestartChat = () => {
    setShowRestartDialog(true);
  };

  // Function to restart without saving
  const restartWithoutSaving = async () => {
    setShowRestartDialog(false);
    console.log("🔄 Restarting chat without saving");

    clearSessionData();
    setIsLoading(true);

    try {
      // Start fresh conversation with current selected concept
      if (selectedConcept) {
        await initiateFirstMentorMessageWithConcept(selectedConcept);
      } else {
        // If no concept selected, fetch concepts and start with first one
        const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
        if (currentConcepts.length > 0) {
          const conceptToUse = currentConcepts[0];
          setSelectedConcept(conceptToUse);
          await initiateFirstMentorMessageWithConcept(conceptToUse);
        }
      }

      // Refresh chat counts
      await fetchChatCounts();
    } catch (error) {
      console.error("❌ Error restarting chat:", error);
      toast.error("Failed to restart conversation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to restart with saving current session
  const restartWithSaving = async () => {
    setShowRestartDialog(false);
    console.log("💾 Saving session before restart");

    setIsLoading(true);

    try {
      // Save current session with appropriate status
      const statusToSave = 'completed';
      await handleSaveChat(statusToSave);

      // Clear session data and start fresh
      clearSessionData();

      // Start fresh conversation
      if (selectedConcept) {
        await initiateFirstMentorMessageWithConcept(selectedConcept);
      } else {
        const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
        if (currentConcepts.length > 0) {
          const conceptToUse = currentConcepts[0];
          setSelectedConcept(conceptToUse);
          await initiateFirstMentorMessageWithConcept(conceptToUse);
        }
      }

      // Refresh chat counts
      await fetchChatCounts();
    } catch (error) {
      console.error("❌ Error saving and restarting chat:", error);
      toast.error("Failed to save and restart conversation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

pdfMake.vfs = pdfFonts.vfs;

const handleDownloadPDF = () => {
  // ✅ Helper to remove emojis from any string
  const removeEmojis = (text) => {
    return text.replace(
    /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F700}-\u{1F77F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    ""
  );
  };

  const content = [];

  content.push({
    text: "Chat History",
    style: "header",
    margin: [0, 0, 0, 10],
  });

  // Replace emojis from each message
  chatHistory.forEach((item) => {
    if (item.user) {
      content.push(
        {
          alignment: "right",
          text: "You:",
          style: "userLabel",
          margin: [0, 5, 0, 2],
        },
        {
          alignment: "right",
          text: removeEmojis(item.user),
          style: "userText",
        }
      );
    }

    if (item.system) {
      content.push(
        {
          alignment: "left",
          text: "Mentor:",
          style: "botLabel",
          margin: [0, 10, 0, 2],
        },
        {
          alignment: "left",
          text: removeEmojis(item.system),
          style: "botText",
        }
      );
    }
  });

  const docDefinition = {
    content,
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      userLabel: { fontSize: 12, bold: true, color: "#007ACC" },
      userText: { fontSize: 11, margin: [0, 0, 0, 5] },
      botLabel: { fontSize: 12, bold: true, color: "#4CAF50" },
      botText: { fontSize: 11, margin: [0, 0, 0, 10] },
    },
    defaultStyle: {
      font: "Roboto",
    },
    pageMargins: [40, 60, 40, 60],
  };

  pdfMake.createPdf(docDefinition).download("chat-history.pdf");
};

  const handleInputChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleSendClick = async () => {
    if (!prompt.trim() || !selectedConcept || isChatEnded) {
      if (isChatEnded) {
        toast.warn("This conversation has ended. Please restart to begin a new session.");
        return;
      }
      toast.warn("Please enter a prompt and select a concept.");
      return;
    }

    const isFirstUserMessage = currentStage === 0;

    if (isFirstUserMessage) {
      setIsTransitioning(true);
      setCurrentStage(1);
      setTimeout(() => setIsTransitioning(false), 800);
    }

    setIsLoading(true);
    const userPrompt = prompt.trim();
    setPrompt("");

    try {
      const initialResponse = await processPromptAndCallLLM({
        username,
        selectedPrompt,
        selectedModel: "gpt-4o",
        sessionHistory,
        userPrompt: userPrompt,
        selectedConcept: selectedConcept,
      });

      console.log("📡 Raw API Response:", initialResponse);

      let newApiCurrentStage = initialResponse.currentStage || 0;
      let newInteractionCompleted = initialResponse.interactionCompleted || false;
      let newEndRequested = initialResponse.endRequested || false;

      console.log("🔍 API Response Details:", {
        apiCurrentStage: newApiCurrentStage,
        interactionCompleted: newInteractionCompleted,
        endRequested: newEndRequested,
        currentProgressStage: currentStage,
        isFirstUserMessage,
      });

      const newProgressStage = mapApiStageToProgressbarIndex(newApiCurrentStage, 'inprogress', newInteractionCompleted);

      if (isFirstUserMessage || newProgressStage >= currentStage) {
        setCurrentStage(newProgressStage);
        setCurrentChatStatus('inprogress');
        console.log("✅ Progress updated:", {
          from: currentStage,
          to: newProgressStage,
          apiStage: newApiCurrentStage,
          status: 'inprogress',
        });
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

      // Auto-save after regular LLM response
      console.log("💾 Auto-saving after regular LLM response...");
      await handleSaveChat('inprogress');

      // Check for end conditions - both endRequested and interactionCompleted trigger assessment
      if (newEndRequested || newInteractionCompleted) {
        console.log(
          newInteractionCompleted
            ? "🎉 Interaction completed! Triggering assessment..."
            : "🛑 End requested by mentor, triggering assessment..."
        );

        // Call assessment
        const assessmentResponse = await processPromptAndCallLLM({
          username,
          selectedPrompt: "assessmentPrompt",
          selectedModel: "gpt-4o",
          sessionHistory: [
            ...sessionHistory,
            { Mentee: userPrompt, Mentor: initialResponse.apiResponseText },
          ],
          userPrompt: userPrompt,
          selectedConcept: selectedConcept,
        });

        setLlmContent(assessmentResponse.apiResponseText);

        const assessmentChatEntry = {
          user: "",
          system: assessmentResponse.apiResponseText,
        };

        let finalChatHistory = [];
        setChatHistory((prev) => {
          finalChatHistory = [...prev, assessmentChatEntry];
          sessionStorage.setItem("chatHistory", JSON.stringify(finalChatHistory));
          return finalChatHistory;
        });

        setSessionHistory((prev) => [
          ...prev,
          { Mentee: "", Mentor: assessmentResponse.apiResponseText },
        ]);

        // Set completed stage and status
        setCurrentStage(7);
        setCurrentChatStatus('completed');

        // Set the end reason for UI messaging
        if (newInteractionCompleted) {
          setEndReason('interactionCompleted');
        } else {
          setEndReason('endRequested');
        }

        // Auto-save after assessment
        console.log("💾 Auto-saving after assessment...");
        await handleSaveChat('completed');

        setSelectedPrompt("conceptMentor");

        // Set chat as ended AFTER assessment is added to chat history
        setTimeout(() => {
          setIsChatEnded(true);
          console.log("🔒 Chat input restricted after assessment display");
        }, 100);
      }
    } catch (error) {
      console.error("❌ Error in API request:", error);
      if (error.response) {
        toast.error(`Failed to process request: ${error.response.data.message || "Server error"}`);
      } else {
        toast.error("Failed to process request. Please check your connection and try again.");
      }
    } finally {
      // ✅ FIX 2: Always hide loading indicator at the end
      setIsLoading(false);
    }
  };

  const getCurrentStageForAPI = (saveStatus) => {
    // If user is manually setting status, use that
    if (saveStatus === "not_started") {
      return 0;
    } else if (saveStatus === "completed") {
      return 5;
    } else if (saveStatus === "inprogress") {
      // For inprogress, calculate stage based on current frontend state
      if (currentStage === 0) return 0; // Just started, no progress yet
      if (currentStage === 7) return 5; // Assessment completed = stage 5
      return Math.min(Math.max(currentStage - 1, 0), 5); // Convert progress stages 1-6 to API stages 0-5
    }

    // Fallback: determine from current frontend state
    const frontendStatus = getStageStatus();
    if (frontendStatus === 'not-started') return 0;
    if (frontendStatus === 'completed') return 5;

    // For in-progress, map currentStage to API stage
    if (currentStage === 0) return 0;
    if (currentStage === 7) return 5;
    return Math.min(Math.max(currentStage - 1, 0), 5);
  };

  const getFrontendStatusForSave = () => {
    // If chat has ended (either interactionCompleted or endRequested), save as completed
    if (isChatEnded) {
      return 'completed';
    }

    // Determine current frontend status based on stage and chat state
    if (currentStage === 0 && chatHistory.length <= 1) {
      return 'not_started';
    } else {
      return 'inprogress';
    }
  };

  const handleSaveChat = async (requestedStatus = null) => {
    if (!username) {
      toast.error("Cannot save chat: User not identified.");
      return;
    }
    if (chatHistory.length === 0) {
      toast.warn("No chat history to save.");
      return;
    }

    // Determine the status to save
    const statusToSave = requestedStatus || getFrontendStatusForSave();
    const stageToSave = getCurrentStageForAPI(statusToSave);
    const conceptNameToSave = selectedConcept?.concept_name || null;

    console.log("💾 Saving chat with:", {
      requestedStatus,
      statusToSave,
      stageToSave,
      currentStage,
      frontendStatus: getStageStatus(),
      currentChatStatus,
      chatHistoryLength: chatHistory.length,
      conceptName: conceptNameToSave
    });

    setIsLoading(true);
    try {
      let response;
      let actionMessage = "";

      if (currentChatId && sessionType === "resume") {
        // Update existing chat
        response = await axios.put(`${BASE_URL}/chat/conversation/${currentChatId}`, {
          conversation: chatHistory,
          status: statusToSave,
          current_stage: stageToSave,
          concept_name: conceptNameToSave
        });
        actionMessage = `Updated existing chat (ID: ${currentChatId})`;
      } else {
        // Create new chat
        response = await axios.post(`${BASE_URL}/chat`, {
          user_id: userId,
          conversation: chatHistory,
          status: statusToSave,
          current_stage: stageToSave,
          concept_name: conceptNameToSave
        });
        actionMessage = "Created new chat";
      }

      setShowSaveOptions(false);

      console.log("✅ Chat saved successfully:", {
        status: statusToSave,
        stage: stageToSave,
        conceptName: conceptNameToSave,
        chatId: response.data.data.id
      });

      // Show success toast notification
      toast.success(`Chat saved as ${statusToSave}!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      if (response.data.data.shouldStartFresh) {
        clearSessionData();

        if (statusToSave === "completed") {
          setTimeout(async () => {
            await initiateFirstMentorMessage();
          }, 1000);
        }

        setSessionType(statusToSave === "completed" ? "completed" : "fresh");
        setCurrentChatId(null);
        setResumedFromStatus(null);
        setCurrentStage(0);
        setCurrentChatStatus(statusToSave);
      } else {
        const newChatId = response.data.data.id || currentChatId;
        setCurrentChatId(newChatId);
        setSessionType("resume");
        setResumedFromStatus(statusToSave);
        setCurrentChatStatus(statusToSave);
      }

      sessionStorage.setItem("chatHistory", JSON.stringify(chatHistory));
      await fetchChatCounts();
    } catch (error) {
      console.error("❌ Error saving chat:", error);
      if (error.response) {
        toast.error(`Failed to save chat: ${error.response.data.message || "Server error"}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        toast.error("Failed to save chat. Please check your connection and try again.", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    }  
  };

  const fetchChatCounts = async () => {
    if (!userId || !sessionStorage.getItem(`apiKey_${username}`)) {
      return;
    }

    setIsCountsLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/chat/counts/${userId}`);

      if (
        response.data &&
        response.data.success &&
        response.data.data &&
        response.data.data.counts
      ) {
        setChatCounts(response.data.data.counts);
      } else {
        setChatCounts({ not_started: 0, inprogress: 0, completed: 0, archived: 0 });
      }
    } catch (error) {
      console.error("❌ Error loading chat counts:", error);
      setChatCounts({ not_started: 0, inprogress: 0, completed: 0, archived: 0 });
    } finally {
      setIsCountsLoading(false);
    }
  };

  const checkSessionStatus = async (conceptName = null) => {
    if (!username || !userId) {
      setIsInitializing(false);
      await fetchConcepts();
      return;
    }

    // Check if we already have an API key, if not fetch it
    if (!sessionStorage.getItem(`apiKey_${username}`)) {
      const apiKey = await fetchApiKey();
      if (!apiKey) {
        setIsInitializing(false);
        await fetchConcepts();
        return;
      }
    }

    setIsLoading(true);
    setIsInitializing(true);

    try {
      // Build API URL with concept_name parameter if provided
      let apiUrl = `${BASE_URL}/chat/session-status/${userId}`;
      if (conceptName) {
        apiUrl += `?concept_name=${encodeURIComponent(conceptName)}`;
      }

      const response = await axios.get(apiUrl);

      if (response.data && response.data.success) {
        const { sessionType, hasActiveSession, shouldStartFresh, chat } = response.data.data;

        // Check if resumed session is completed
        if (chat && chat.status === 'completed') {
          console.log("🎯 Resumed session is completed, starting fresh conversation instead");
          clearSessionData();
          setCurrentChatStatus('not_started');

          await fetchConcepts();

          setTimeout(async () => {
            const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
            if (currentConcepts.length > 0) {
              const conceptToUse = selectedConcept || currentConcepts[0];
              console.log("🚀 Starting fresh conversation for completed session:", conceptToUse.concept_name);
              setSelectedConcept(conceptToUse);
              await initiateFirstMentorMessageWithConcept(conceptToUse);
            }
          }, 1000);
          return;
        }

        if (sessionType === "resume" && hasActiveSession && chat && !shouldStartFresh) {
          // Resume existing session
          console.log("🔄 Resuming existing session:", chat);

          setChatHistory(chat.conversation);

          const loadedSessionHistory = chat.conversation
            .filter((item) => item.user !== undefined && item.system !== undefined)
            .map((item) => ({ Mentee: item.user, Mentor: item.system }));
          setSessionHistory(loadedSessionHistory);

          setCurrentChatId(chat.id);
          setSessionType("resume");
          setResumedFromStatus(chat.status);
          setCurrentChatStatus(chat.status);

          // Map API stage to progress stage
          const progressStage = mapApiStageToProgressbarIndex(
            chat.current_stage,
            chat.status,
            false
          );
          setCurrentStage(progressStage);

          console.log("✅ Session resumed with stage:", {
            apiStage: chat.current_stage,
            status: chat.status,
            progressStage: progressStage,
            conceptName: chat.concept_name
          });

          sessionStorage.setItem("chatHistory", JSON.stringify(chat.conversation));
          sessionStorage.setItem("currentChatId", chat.id.toString());
          sessionStorage.setItem("sessionType", "resume");

          // If no concepts loaded yet, fetch them
          if (concepts.length === 0) {
            await fetchConcepts();
          }

          // Restore selectedConcept based on the chat's concept_name
          if (chat.concept_name && concepts.length > 0) {
            const matchingConcept = concepts.find(c => c.concept_name === chat.concept_name);
            if (matchingConcept) {
              setSelectedConcept(matchingConcept);
              console.log("✅ Concept restored from session:", matchingConcept.concept_name);
            } else {
              console.warn("⚠️ Concept from session not found in available concepts:", chat.concept_name);
              // If conceptName was provided, try to find it
              if (conceptName) {
                const providedConcept = concepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
                if (providedConcept) {
                  setSelectedConcept(providedConcept);
                  console.log("🔄 Using provided concept:", providedConcept.concept_name);
                }
              }
            }
          } else if (conceptName && concepts.length > 0) {
            // If conceptName was provided in the API call, use it
            const providedConcept = concepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
            if (providedConcept) {
              setSelectedConcept(providedConcept);
              console.log("🔄 Using provided concept for fresh session:", providedConcept.concept_name);
            }
          }

        } else if (sessionType === "fresh") {
          // Start fresh session
          console.log("🆕 Starting fresh session");
          clearSessionData();
          setCurrentChatStatus('not_started');

          // Load concepts first, then initiate conversation
          if (concepts.length === 0) {
            await fetchConcepts();
          }

          // Automatically start conversation for fresh session
          setTimeout(async () => {
            const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
            if (currentConcepts.length > 0) {
              let conceptToUse;

              // If conceptName was provided, try to find matching concept
              if (conceptName) {
                conceptToUse = currentConcepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
              }

              // Fallback to selected concept or first active concept
              if (!conceptToUse) {
                conceptToUse = selectedConcept || currentConcepts.find(concept => concept.is_active) || currentConcepts[0];
              }

              if (conceptToUse) {
                console.log("🚀 Auto-starting fresh conversation with concept:", conceptToUse.concept_name);
                setSelectedConcept(conceptToUse);
                await initiateFirstMentorMessageWithConcept(conceptToUse);
              }
            }
          }, 1000);
        }
      } else {
        // Fallback to fresh session
        console.log("⚠️ No session data, starting fresh");
        clearSessionData();
        setCurrentChatStatus('not_started');

        if (concepts.length === 0) {
          await fetchConcepts();
        }

        // Force start fresh conversation
        setTimeout(async () => {
          const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
          if (currentConcepts.length > 0) {
            let conceptToUse;

            // If conceptName was provided, try to find matching concept
            if (conceptName) {
              const providedConcept = concepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
              if (providedConcept) {
                setSelectedConcept(providedConcept);
                console.log("🔄 Using provided concept for fresh session:", providedConcept.concept_name);
              }
            }

            // Fallback to selected concept or first active concept
            if (!conceptToUse) {
              conceptToUse = selectedConcept || currentConcepts.find(concept => concept.is_active) || currentConcepts[0];
            }

            console.log("🚀 Force-starting fresh conversation:", conceptToUse.concept_name);
            setSelectedConcept(conceptToUse);
            await initiateFirstMentorMessageWithConcept(conceptToUse);
          } else {
            console.error("❌ No concepts available for fresh conversation");
          }
        }, 1000);
      }

      await fetchChatCounts();
    } catch (error) {
      console.error("❌ Error checking session status:", error);
      // On error, force fresh session start
      clearSessionData();
      setCurrentChatStatus('not_started');

      if (concepts.length === 0) {
        await fetchConcepts();
      }

      setTimeout(async () => {
        const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
        if (currentConcepts.length > 0) {
          let conceptToUse;

          // If conceptName was provided, try to find matching concept
          if (conceptName) {
            conceptToUse = currentConcepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
          }

          // Fallback to selected concept or first active concept
          if (!conceptToUse) {
            conceptToUse = selectedConcept || currentConcepts.find(concept => concept.is_active) || currentConcepts[0];
          }

          console.log("🚀 Error recovery - starting fresh conversation:", conceptToUse.concept_name);
          setSelectedConcept(conceptToUse);
          await initiateFirstMentorMessageWithConcept(conceptToUse);
        } else {
          console.error("❌ No concepts available for error recovery");
        }
      }, 1000);
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isChatEnded) {
        handleSendClick();
      }
    }
  };

  const handleConceptSelect = async (concept) => {
    console.log("🎯 Concept selected:", concept.concept_name);
    setSelectedConcept(concept);
    setShowConceptDropdown(false);

    // Clear current session data
    clearSessionData();
    setCurrentChatStatus('not_started');

    // Check session status with the selected concept
    if (sessionStorage.getItem(`apiKey_${username}`)) {
      console.log("🔍 Checking session status for concept:", concept.concept_name);
      await checkSessionStatus(concept.concept_name);
    }
  };

  const getStageStatus = () => {
    // Priority: Use currentChatStatus from API, fallback to currentStage logic
    if (currentChatStatus === 'completed') return 'completed';
    if (currentChatStatus === 'not_started') return 'not-started';
    if (currentChatStatus === 'inprogress') return 'in-progress';

    // Fallback to stage-based logic
    if (currentStage === 0) return 'not-started';
    if (currentStage === 7) return 'completed';
    return 'in-progress';
  };

  useEffect(() => {
    if (username && userId) {
      // Get the first available concept and call checkSessionStatus with it
      const initializeWithConcept = async () => {
        // First fetch concepts if not already loaded
        if (concepts.length === 0) {
          await fetchConcepts();
        }

        // Get concepts from state or fetch them
        const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();

        if (currentConcepts.length > 0) {
          // Use first active concept or first concept available
          const initialConcept = currentConcepts.find(concept => concept.is_active) || currentConcepts[0];
          console.log("🎯 Initial concept for session check:", initialConcept.concept_name);

          // Call checkSessionStatus with the initial concept name
          await checkSessionStatus(initialConcept.concept_name);
        } else {
          // No concepts available, call without concept_name as fallback
          console.log("⚠️ No concepts available, checking session without concept_name");
          await checkSessionStatus();
        }
      };

      initializeWithConcept();
    }
  }, [username, userId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

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

              if (parsedHistory.length > 1) {
                setCurrentStage(1);
              } else {
                setCurrentStage(0);
              }
            }
          }
        } catch (error) {
          console.error("❌ Error parsing saved chat history:", error);
          clearSessionData();
        }
      }
    }
  }, [isInitializing, chatHistory.length]);

  // Assessment helper functions
  const hasAssessmentData = (content) => {
    return (
      content &&
      (content.includes("Detailed Assessment") || content.includes("Part 1:")) &&
      (content.includes("Deterministic Scoring") || content.includes("Part 2:"))
    );
  };

  const parseAssessmentContent = (content) => {
    const detailedAssessmentHeader = "Part 1: 🌟 Detailed Assessment 📝";
    const deterministicScoringHeader = "Part 2: Deterministic Scoring (JSON Format) 📊";

    const part1Index = content.indexOf(detailedAssessmentHeader);
    if (part1Index === -1) {
      // Try alternative headers
      const altHeader = "### Part 1: 🌟 Detailed Assessment";
      const altPart1Index = content.indexOf(altHeader);
      if (altPart1Index === -1) {
        return content;
      }
      const assessmentStart = altPart1Index + altHeader.length;
      const part2Index = content.indexOf("### Part 2: Deterministic Scoring");
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

  const extractScoringData = (content) => {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      // Fallback: try to find JSON-like structure with new format
      const possibleJson = content.match(/\{[\s\S]*"FinalWeightedScore"[\s\S]*\}/);
      if (possibleJson) {
        return JSON.parse(possibleJson[0]);
      }
      return {};
    } catch (e) {
      console.error("Error parsing scoring JSON:", e);
      return {};
    }
  };

  const calculateOverallScore = (scoringData) => {
    if (scoringData.FinalWeightedScore && typeof scoringData.FinalWeightedScore === 'number') {
      return Math.round(scoringData.FinalWeightedScore * 10) / 10;
    }

    const sixFacetsScore = scoringData.SixFacets?.OverallScore || 0;
    const understandingSkillsScore = scoringData.UnderstandingSkills?.OverallScore || 0;

    const finalWeightedScore = (0.6 * sixFacetsScore) + (0.4 * understandingSkillsScore);

    return Math.round(finalWeightedScore * 10) / 10;
  };

  const getScoreColor = (score) => {
    if (score === 5) return '#10b981'; // Green for Masterful
    if (score >= 4) return '#10b981'; // Green for Strong
    if (score >= 3) return '#3b82f6'; // Blue for Developing
    if (score >= 2) return '#f59e0b'; // Yellow for Emerging
    return '#ef4444'; // Red for Absent/Minimal
  };

  const getScoreLabel = (score) => {
    if (score === 5) return 'Masterful';
    if (score >= 4) return 'Strong';
    if (score >= 3) return 'Developing';
    if (score >= 2) return 'Emerging';
    return 'Absent/Minimal';
  };

  const formatCriterionName = (name) => {
    // Handle camelCase to readable format
    return name.replace(/([A-Z])/g, ' $1').trim();
  };

  const renderScoringTable = (content) => {
    const scoringData = extractScoringData(content);

    return (
      <div className="assessment-scoring-table">
        <div className="scoring-header">
          <h4>📊 Learning Assessment Scores</h4>
        </div>

        {/* Six Facets of Understanding */}
        {scoringData.SixFacets && (
          <div className="scoring-section">
            <h5>🌟 Six Facets of Understanding</h5>
            <div className="scoring-grid">
              {["Explanation", "Interpretation", "Application", "Perspective", "Empathy", "Self-Knowledge"].map((key) => {
                if (!scoringData.SixFacets[key]) return null;

                const facetData = scoringData.SixFacets[key];
                const scoreValue = facetData.score || 0;
                const scoreColor = getScoreColor(scoreValue);

                return (
                  <div key={key} className="score-card">
                    <div className="score-card-header">
                      <h6 className="criterion-name">{formatCriterionName(key)}</h6>
                      <div
                        className="score-badge"
                        style={{ backgroundColor: scoreColor }}
                      >
                        {scoreValue}/5
                      </div>
                    </div>
                    {facetData.justification && (
                      <div className="score-justification">
                        <p><strong>🧠 Why:</strong> {facetData.justification}</p>
                      </div>
                    )}
                    {facetData.example && (
                      <div className="score-example">
                        <p><strong>💬 Example:</strong> {facetData.example}</p>
                      </div>
                    )}
                    {facetData.improvement && (
                      <div className="score-improvement">
                        <p><strong>🔧 How to improve:</strong> {facetData.improvement}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <br />

        {/* Understanding Skills */}
        {scoringData.UnderstandingSkills && (
          <div className="scoring-section">
            <h5>🎯 Understanding Skills</h5>
            <div className="scoring-grid">
              {["AskingQuestions", "ClarifyingAmbiguity", "SummarizingConfirming", "ChallengingIdeas", "ComparingConcepts", "AbstractConcrete"].map((key) => {
                if (!scoringData.UnderstandingSkills[key]) return null;

                const skillData = scoringData.UnderstandingSkills[key];
                const scoreValue = skillData.score || 0;
                const scoreColor = getScoreColor(scoreValue);

                return (
                  <div key={key} className="score-card">
                    <div className="score-card-header">
                      <h6 className="criterion-name">{formatCriterionName(key)}</h6>
                      <div
                        className="score-badge"
                        style={{ backgroundColor: scoreColor }}
                      >
                        {scoreValue}/5
                      </div>
                    </div>
                    {skillData.justification && (
                      <div className="score-justification">
                        <p><strong>🧠 Why:</strong> {skillData.justification}</p>
                      </div>
                    )}
                    {skillData.example && (
                      <div className="score-example">
                        <p><strong>💬 Example:</strong> {skillData.example}</p>
                      </div>
                    )}
                    {skillData.improvement && (
                      <div className="score-improvement">
                        <p><strong>🔧 How to improve:</strong> {skillData.improvement}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOverallScoreAndSummary = (content) => {
    const scoringData = extractScoringData(content);
    
    // Calculate overall score from frontend instead of trusting LLM
    const calculatedOverallScore = calculateOverallScore(scoringData);
    
    // Use LLM's summary if available, otherwise create a basic one
    const evaluationSummary = scoringData.EvaluationSummary || "Assessment completed based on conversation analysis.";
    
    const overallColor = getScoreColor(calculatedOverallScore);
    const overallLabel = getScoreLabel(calculatedOverallScore);

    return (
      <div className="overall-assessment">
        <div className="overall-score-card">
          <div className="overall-header">
            <h4>🎯 Overall Assessment</h4>
            <div
              className="overall-score-badge"
              style={{ backgroundColor: overallColor }}
            >
              <span className="score-value">{calculatedOverallScore}/5</span>
              <span className="score-label">{overallLabel}</span>
            </div>
          </div>
          <div className="overall-summary">
            <h5>📋 Summary</h5>
            <p>{evaluationSummary}</p>
          </div>
          
          {/* Show score breakdown */}
          <div className="score-breakdown">
            <h5>📈 Score Breakdown</h5>

            {/* Six Facets Breakdown */}
            {scoringData.SixFacets && (
              <div className="breakdown-section">
                <h6>🌟 Six Facets of Understanding</h6>
                <div className="breakdown-grid">
                  {["Explanation", "Interpretation", "Application", "Perspective", "Empathy", "Self-Knowledge"].map(facet => {
                    if (!scoringData.SixFacets[facet]) return null;
                    const score = scoringData.SixFacets[facet].score || 0;
                    const color = getScoreColor(score);

                    return (
                      <div key={facet} className="breakdown-item">
                        <span className="breakdown-label">{formatCriterionName(facet)}</span>
                        <span
                          className="breakdown-score"
                          style={{ color: color, fontWeight: 'bold' }}
                        >
                          {score}/5
                        </span>
                      </div>
                    );
                  })}
                  <div className="breakdown-average">
                    <span className="breakdown-label"><strong>Six Facets Average</strong></span>
                    <span
                      className="breakdown-score"
                      style={{ color: getScoreColor(scoringData.SixFacets?.OverallScore || 0), fontWeight: 'bold' }}
                    >
                      {scoringData.SixFacets?.OverallScore || 0}/5
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Understanding Skills Breakdown */}
            {scoringData.UnderstandingSkills && (
              <div className="breakdown-section">
                <h6>🎯 Understanding Skills</h6>
                <div className="breakdown-grid">
                  {["AskingQuestions", "ClarifyingAmbiguity", "SummarizingConfirming", "ChallengingIdeas", "ComparingConcepts", "AbstractConcrete"].map(skill => {
                    if (!scoringData.UnderstandingSkills[skill]) return null;
                    const score = scoringData.UnderstandingSkills[skill].score || 0;
                    const color = getScoreColor(score);

                    return (
                      <div key={skill} className="breakdown-item">
                        <span className="breakdown-label">{formatCriterionName(skill)}</span>
                        <span
                          className="breakdown-score"
                          style={{ color: color, fontWeight: 'bold' }}
                        >
                          {score}/5
                        </span>
                      </div>
                    );
                  })}
                  <div className="breakdown-average">
                    <span className="breakdown-label"><strong>Skills Average</strong></span>
                    <span
                      className="breakdown-score"
                      style={{ color: getScoreColor(scoringData.UnderstandingSkills?.OverallScore || 0), fontWeight: 'bold' }}
                    >
                      {scoringData.UnderstandingSkills?.OverallScore || 0}/5
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Final Weighted Score */}
            <div className="breakdown-final">
              <span className="breakdown-label"><strong>Final Weighted Score</strong></span>
              <span
                className="breakdown-score"
                style={{ color: overallColor, fontWeight: 'bold', fontSize: '1.2em' }}
              >
                {calculatedOverallScore}/5
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="learning-dashboard">
      <Sidebar />
      
      {/* Toast Container for Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* Restart Dialog Modal */}
      {showRestartDialog && (
        <div className="restart-dialog-overlay">
          <div className="restart-dialog">
            <div className="restart-dialog-header">
              <FiAlertCircle className="restart-dialog-icon" />
              <h3>Save Current Session?</h3>
            </div>
            <div className="restart-dialog-content">
              <p>
                You're about to start a new conversation. Would you like to save your current session before restarting?
              </p>
            </div>
            <div className="restart-dialog-actions">
              <button
                className="restart-btn save-and-restart"
                onClick={restartWithSaving}
                disabled={isLoading}
              >
                <FiSave /> Save & Restart
              </button>
              <button
                className="restart-btn restart-only"
                onClick={restartWithoutSaving}
                disabled={isLoading}
              >
                <FiRefreshCw /> Just Restart
              </button>
              <button
                className="restart-btn cancel"
                onClick={() => setShowRestartDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <div className="dashboard-layout">
        {/* Left Control Panel */}
        <div className="control-panel">
          {/* Concept Selection */}
          <div className="control-section">
            <div className="section-header">
              <FiTarget className="section-icon" />
              <h3>Select Concept</h3>
            </div>
            <div className="concept-selector" ref={conceptDropdownRef}>
              <div
                className="concept-dropdown-trigger"
                onClick={() => setShowConceptDropdown(!showConceptDropdown)}
              >
                <span className="concept-text">
                  {conceptsLoading
                    ? "Loading concepts..."
                    : selectedConcept
                      ? selectedConcept.concept_name
                      : concepts.length > 0
                        ? "Choose a concept to learn"
                        : "No concepts available"
                  }
                </span>
                <FiChevronDown className={`dropdown-arrow ${showConceptDropdown ? 'open' : ''}`} />
              </div>

              {showConceptDropdown && (
                <div className="concept-dropdown">
                  {conceptsLoading ? (
                    <div className="concept-option">
                      <div className="concept-name">Loading...</div>
                    </div>
                  ) : concepts.length > 0 ? (
                    concepts.map((concept) => (
                      <div
                        key={concept.concept_id}
                        className="concept-option"
                        onClick={() => handleConceptSelect(concept)}
                      >
                        <div className="concept-name">{concept.concept_name}</div>
                      </div>
                    ))
                  ) : (
                    <div className="concept-option">
                      <div className="concept-name">No concepts available</div>
                      <div className="concept-description">Contact your administrator</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Learning Stages */}
          <div className="control-section">
            <div className="section-header">
              <FiTrendingUp className="section-icon" />
              <h3>Learning Progress</h3>
            </div>

            <div className="stage-cards">
              {/* Not Started */}
              <div className={`stage-card ${getStageStatus() === 'not-started' ? 'active' : ''}`}>
                <div className="stage-icon not-started">
                  <FiClock />
                </div>
                <div className="stage-content">
                  <h4>Not Started</h4>
                </div>
              </div>

              {/* In Progress */}
              <div className={`stage-card ${getStageStatus() === 'in-progress' ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}>
                <div className="stage-icon in-progress">
                  <FiPlay />
                </div>
                <div className="stage-content">
                  <div className="stage-header">
                    <h4>In Progress</h4>
                  </div>

                  {getStageStatus() === 'in-progress' && (
                    <div className="stage-progress-content">
                      <div className={`substage-progress ${isTransitioning ? 'fade-in' : ''}`}>
                        <div className="progress-info">
                          <span>
                            {currentStage <= 1 ? "Starting..." :
                              currentStage === 7 ? "Completed" :
                                `Stage ${currentStage - 1}/5`}
                          </span>
                          <span>
                            {currentStage <= 1 ? "0%" :
                              currentStage === 7 ? "100%" :
                                `${Math.round(((currentStage - 1) / 5) * 100)}%`}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${currentStage <= 1 ? 0 :
                                currentStage === 7 ? 100 :
                                  Math.round(((currentStage - 1) / 5) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="substages">
                          <Progressbar currentStage={currentStage} showOnlyStages={true} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Completed */}
              <div className={`stage-card ${getStageStatus() === 'completed' ? 'active' : ''}`}>
                <div className="stage-icon completed">
                  <FiCheckCircle />
                </div>
                <div className="stage-content">
                  <h4>Completed</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="chat-panel">
          {/* Top Right Action Icons */}
          <div className="top-right-actions">
            <div className="save-section">
              <button
                ref={topSaveButtonRef}
                className="top-action-btn"
                onClick={() => setShowSaveOptions(!showSaveOptions)}
                disabled={chatHistory.length === 0}
                data-tooltip="Save Progress"
              >
                <FiSave />
              </button>

              {showSaveOptions && (
                <div ref={topSaveOptionsRef} className="top-save-dropdown">
                  <button className="top-save-option current" onClick={() => handleSaveChat()}>
                    <FiSave /> Save Current Progress
                  </button>
                </div>
              )}
            </div>

            <button
              className="top-action-btn top-download-btn"
              onClick={handleDownloadPDF}
              disabled={chatHistory.length === 0}
              data-tooltip="Export Chat"
            >
              <FiDownload />
            </button>
          </div>

          <div className="chat-container">
            <div className="chat-messages" id="chat-history">
              {chatHistory.length === 0 ? (
                <div className="chat-empty">
                  <div className="empty-icon">
                    <FiMessageCircle />
                  </div>
                  <h3>Ready to start learning?</h3>
                  <p>
                    {conceptsLoading
                      ? "Loading your concepts..."
                      : selectedConcept
                        ? "Your AI mentor is ready! Type a message to begin."
                        : concepts.length > 0
                          ? "Select a concept from the left panel and begin your AI-mentored journey!"
                          : "No concepts available. Please contact your administrator."
                    }
                  </p>
                  {isInitializing && (
                    <div className="loading-indicator">
                      <div className="loading-spinner"></div>
                      <span>Initializing your learning session...</span>
                    </div>
                  )}
                </div>
              ) : (
                chatHistory.map((item, index) => (
                  <div key={index} className="message-group">
                    {item.user && (
                      <div className="message user-message">
                        <div className="message-avatar user">
                          <FiUser />
                        </div>
                        <div className="message-content">
                          <div className="message-text">{item.user}</div>
                        </div>
                      </div>
                    )}

                    <div className="message mentor-message">
                      <div className="message-avatar mentor">
                        <FiMessageCircle />
                      </div>
                      <div className="message-content">
                        <div className="message-header">
                          <span className="message-author">AI Mentor</span>
                        </div>
                        <div className="message-text">
                          {hasAssessmentData(item.system) ? (
                            <div>
                              {/* Overall Score and Summary */}
                              {renderOverallScoreAndSummary(item.system)}

                              {/* Scoring Table */}
                              {renderScoringTable(item.system)}
                            </div>
                          ) : (
                            item.system
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Chat End Message and Restart Button */}
              {isChatEnded && (
                <div className="chat-end-section">
                  <div className="chat-end-message">
                    <div className="end-content">
                      <h4>
                        {endReason === 'interactionCompleted'
                          ? '🎉 Learning Session Complete!'
                          : '⏸️ Session Ended with Assessment'
                        }
                      </h4>

                      <p className="end-action-hint">
                        Ready to start a new learning session? Click the button below to begin fresh!
                      </p>
                    </div>
                  </div>
                  <div className="restart-button-container">
                    <button
                      className="restart-session-btn"
                      onClick={handleRestartChat}
                      disabled={isLoading}
                    >
                      <FiRefreshCw />
                      Start New Session
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="chat-input-container">
              {isLoading && (
                <div className="loading-indicator">
                  <div className="loading-spinner"></div>
                  <span>AI is thinking...</span>
                </div>
              )}

              <div className="chat-input-wrapper">
                <textarea
                  className={`chat-input ${isChatEnded ? 'disabled' : ''}`}
                  placeholder={
                    isChatEnded
                      ? "This conversation has ended. Please restart to begin a new session."
                      : isInitializing
                        ? "Initializing..."
                        : selectedConcept
                          ? "Ask your mentor anything..."
                          : conceptsLoading
                            ? "Loading concepts..."
                            : "Please select a concept first..."
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || !selectedConcept || isInitializing || isChatEnded}
                  rows="1"
                />
                <button
                  className="send-button"
                  onClick={handleSendClick}
                  disabled={!prompt.trim() || isLoading || !selectedConcept || isInitializing || isChatEnded}
                >
                  <FiSend />
                </button>
              </div>

              {isChatEnded && (
                <div className="chat-ended-notice">
                  <FiAlertCircle />
                  <span>Conversation ended. Use "Start New Session" to continue learning.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
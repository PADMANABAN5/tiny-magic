
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
  FiAlertCircle,
  FiChevronUp
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import { FaDownload } from 'react-icons/fa';
import axios from "axios";
import { processPromptAndCallLLM } from "../utils/processPromptAndCallLLM";
import Progressbar from "../components/Progressbar.jsx";
import Tesseract from 'tesseract.js';
import {toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PDFDownloader from "../components/PDFDownloader.jsx";
import AssessmentDisplay, { hasAssessmentData, extractScoringData } from "../components/AssessmentDisplay.jsx";
import usePreventBack from "../utils/usePreventBack.js";
import { useAuth } from "../components/AuthContext.jsx";
import StageCompletionToast from "../components/StageCompletionToast.jsx";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import { formatMarkdownResponse } from "../utils/formatMarkdownResponse.js";
import ReactMarkdown from 'react-markdown';
import remarkGfm from "remark-gfm";

const BASE_URL = process.env.REACT_APP_API_LINK;
function Dashboard() {
  usePreventBack("/dashboard");
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
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const voiceRecorderRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
const lastSystemMsg = chatHistory.length
  ? chatHistory[chatHistory.length - 1].system || ""
  : "";
const normalized = formatMarkdownResponse(lastSystemMsg, {
  splitInlineEmojiBullets: true,
  normalizeBullets: true,
  normalizeNumbers: true,
  numberDashLists: true,
  boldHeadings: true,
});
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const batchDropdownRef = useRef(null);
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false; // only final results
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      setPrompt(prev => (prev ? prev + " " : "") + finalTranscript.trim());
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };
  // Enhanced state for proper session management
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sessionType, setSessionType] = useState(null);
  const [resumedFromStatus, setResumedFromStatus] = useState(null);
  const [currentChatStatus, setCurrentChatStatus] = useState('not_started');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const [isProcessingAssessment, setIsProcessingAssessment] = useState(false);
  const [isChatEnded, setIsChatEnded] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [endReason, setEndReason] = useState(null);
  const [concepts, setConcepts] = useState([]);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [showConceptDropdown, setShowConceptDropdown] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);
  // Lock for initialization to prevent race conditions
  const isInitializingRef = useRef(false);
  const previousStage = currentStage;
   const [isMobile, setIsMobile] = useState(window.innerWidth < 768.98);
  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768.98);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  // Refs for outside click detection
  const conceptDropdownRef = useRef(null);
  const topSaveButtonRef = useRef(null);
  const topSaveOptionsRef = useRef(null);
  const storedToken = sessionStorage.getItem("token");
  const { token } = useAuth();
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  useEffect(() => {
    const unlisten = () => {
      if (isProcessingAssessment && prevPathRef.current !== location.pathname) {
        toast.warn("⚠️ Assessment is still loading. Please wait...");
        navigate(prevPathRef.current, { replace: true });
      } else {
        prevPathRef.current = location.pathname;
      }
    };
    unlisten();
  }, [location.pathname, isProcessingAssessment]);
  const [chatCounts, setChatCounts] = useState({
    not_started: 0,
    inprogress: 0,
    completed: 0,
    archived: 0,
  });
  // Initialize PDF downloader
  const { handleDownloadPDF } = PDFDownloader({
    chatHistory,
    selectedConcept
  });
  useEffect(() => {
    if (isProcessingAssessment) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = 'An assessment is being processed. Are you sure you want to leave?';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isProcessingAssessment]);
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

      // Add batch dropdown detection
      if (
        showBatchDropdown &&
        batchDropdownRef.current &&
        !batchDropdownRef.current.contains(event.target)
      ) {
        setShowBatchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSaveOptions, showConceptDropdown, showBatchDropdown]);

  const fetchAndReturnConcepts = async () => {
    if (!username || conceptsLoading) return [];
    setConceptsLoading(true);
    try {
      console.log("🎯 Fetching concepts for fresh session:", username);
      const response = await axios.get(`${BASE_URL}/pod-users/user/${username}`, config);
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
    } finally {
      setConceptsLoading(false);
    }
  };
  const fetchConcepts = async () => {
    if (!username || conceptsLoading) return;
    setConceptsLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/pod-users/user/${username}`, config);
      if (response.data && response.data.success && response.data.data) {
        const data = response.data.data;

        // Fetch batches
        const batchesData = data.batches || [];
        setBatches(batchesData);

        // Set initial batch (current batch from pod)
        const currentBatch = batchesData.find(b => b.batch_id === data.batch?.batch_id);
        if (currentBatch) {
          setSelectedBatch(currentBatch);
        } else if (batchesData.length > 0) {
          setSelectedBatch(batchesData[0]);
        }

        // Set concepts based on selected batch
        const conceptsData = currentBatch?.concepts || data.batch?.concepts || [];
        console.log("✅ Concepts loaded:", conceptsData.length);
        setConcepts(conceptsData);
        const batch = response.data.data.batch;
        if (batch?.batch_id && batch?.organization_id) {
          sessionStorage.setItem("batchId", batch.batch_id);
          sessionStorage.setItem("organizationId", batch.organization_id);
          console.log("✅ Stored batchId and orgId in sessionStorage", {
            batchId: batch.batch_id,
            orgId: batch.organization_id,
          });
        } else {
          console.warn("⚠️ Could not find batchId or orgId in pod-user response.");
        }
      } else {
        console.warn("⚠️ No concepts data in response");
        setConcepts([]);
        setBatches([]);
      }
    } catch (error) {
      console.error("❌ Error fetching concepts:", error);
      setConcepts([]);
      setBatches([]);
      if (error.response?.status !== 404) {
        toast.error("Failed to load concepts. Please try again.");
      }
    } finally {
      setConceptsLoading(false);
    }
  };
  const handleBatchSelect = async (batch) => {
    if (isProcessingAssessment) {
      toast.warn("⚠️ Please wait, assessment is being processed.");
      return;
    }

    console.log("🎯 Batch selected:", batch.batch_name);
    setSelectedBatch(batch);
    setShowBatchDropdown(false);

    // Update concepts based on selected batch
    const batchConcepts = batch.concepts || [];
    setConcepts(batchConcepts);

    // Update sessionStorage with new batch info
    sessionStorage.setItem("batchId", batch.batch_id);
    sessionStorage.setItem("organizationId", batch.organization_id);

    toast.info(`Switched to batch: ${batch.batch_name}`);

    // Auto-select first concept if available
    if (batchConcepts.length > 0) {
      const firstConcept = batchConcepts.find(concept => concept.is_active) || batchConcepts[0];
      console.log("🚀 Auto-selecting first concept:", firstConcept.concept_name);
      setSelectedConcept(firstConcept);

      // Clear session data before checking for existing session
      clearSessionData();
      setCurrentChatStatus('not_started');

      // Check if there's an existing session for this concept
      console.log("🔍 Checking session status for concept:", firstConcept.concept_name);
      await checkSessionStatus(firstConcept.concept_name, batchConcepts);
    } else {
      setSelectedConcept(null);
      clearSessionData();
      setCurrentChatStatus('not_started');
      toast.warn("No concepts available in this batch");
    }
  };
  const initiateFirstMentorMessageWithConcept = async (concept) => {
    if (!concept) {
      setIsInitializing(false);
      return;
    }
    const organizationId = sessionStorage.getItem("organizationId");
    const batchId = sessionStorage.getItem("batchId");
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
        organizationId,
        batchId,
        
        
      });
      const mentorMessage = formatMarkdownResponse(response.apiResponseText);
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
  const mapApiStageToProgressbarIndex = (apiCurrentStage, status, interactionCompleted) => {
    if (interactionCompleted || status === 'completed') return 7;
    if (status === 'not_started') return 0;
    switch (apiCurrentStage) {
      case 0: return 1;
      case 1: return 2;
      case 2: return 3;
      case 3: return 4;
      case 4: return 5;
      case 5: return 6;
      default: return 1;
    }
  };
  const initiateFirstMentorMessage = async () => {
    if (!selectedConcept) {
      setIsInitializing(false);
      return;
    }
    console.log("🚀 Initiating first mentor message");
    setIsLoading(true);
    try {
      const organizationId = sessionStorage.getItem("organizationId");
      const batchId = sessionStorage.getItem("batchId");
      const response = await processPromptAndCallLLM({
        username,
        selectedPrompt: "conceptMentor",
        selectedModel: "gpt-4o",
        sessionHistory: [],
        userPrompt: "",
        selectedConcept,
        organizationId,
        batchId
      });
      const cleaned = response.apiResponseText.replace(/\*\*(.*?)\*\*/g, '$1');
const mentorMessage = formatMarkdownResponse(cleaned, {
  boldHeadings: false,
  numberDashLists: true,
  normalizeBullets: true,
  normalizeNumbers: true,
  splitInlineEmojiBullets: true,
});
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
  const handleRestartChat = () => {
    setShowRestartDialog(true);
  };
  const handleEndSession = async () => {
    setShowEndSessionDialog(false);
    if (voiceRecorderRef.current) {
      await voiceRecorderRef.current.stopRecording();
    }
    setIsLoading(true);
    setIsProcessingAssessment(true);
    try {
      const organizationId = sessionStorage.getItem("organizationId");
      const batchId = sessionStorage.getItem("batchId");
      const assessmentResponse = await processPromptAndCallLLM({
        username,
        selectedPrompt: "assessmentPrompt",
        selectedModel: "gpt-4o",
        sessionHistory,
        userPrompt: "",
        selectedConcept,
        organizationId,
        batchId
      });
      setLlmContent(assessmentResponse.apiResponseText);
      const assessmentChatEntry = {
        user: "",
        system: assessmentResponse.apiResponseText,
      };
      setChatHistory((prev) => {
        const finalHistory = [...prev, assessmentChatEntry];
        sessionStorage.setItem("chatHistory", JSON.stringify(finalHistory));
        return finalHistory;
      });
      setSessionHistory((prev) => [
        ...prev,
        { Mentee: "", Mentor: assessmentResponse.apiResponseText },
      ]);
      setCurrentChatStatus("completed");
      setIsChatEnded(true);
      setEndReason("endRequested");
    } catch (error) {
      toast.error("❌ Failed to end session and load assessment.");
      console.error("End session error:", error);
    } finally {
      setIsLoading(false);
      setIsProcessingAssessment(false);
    }
  };
  const restartWithoutSaving = async () => {
    setShowRestartDialog(false);
    console.log("🔄 Restarting chat without saving");
    setIsLoading(true);
    try {
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
      await fetchChatCounts();
    } catch (error) {
      console.error("❌ Error restarting chat:", error);
      toast.error("Failed to restart conversation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const restartWithSaving = async () => {
    setShowRestartDialog(false);
    console.log("💾 Saving session before restart");
    setIsLoading(true);
    try {
      const statusToSave = 'completed';
      await handleSaveChat(statusToSave);
      clearSessionData();
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
      await fetchChatCounts();
    } catch (error) {
      console.error("❌ Error saving and restarting chat:", error);
      toast.error("Failed to save and restart conversation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleInputChange = (event) => {
    setPrompt(event.target.value);
  };
  const handleSendClick = async () => {
    if (voiceRecorderRef.current) {
      await voiceRecorderRef.current.stopRecording(); // 🔴 auto-stop recording
    }
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
  // Step 1: Add only user message first
  setChatHistory((prev) => {
    const updated = [...prev, { user: userPrompt, system: "" }];
    sessionStorage.setItem("chatHistory", JSON.stringify(updated));
    return updated;
  });
    console.log("🚀 handleSendClick: Setting isLoading to true");
    try {
      // const userPrompt = prompt.trim();
      // setPrompt("");
      const organizationId = sessionStorage.getItem("organizationId");
      const batchId = sessionStorage.getItem("batchId");
      const initialResponse = await processPromptAndCallLLM({
        username,
        selectedPrompt,
        selectedModel: "gpt-4o",
        sessionHistory,
        userPrompt: userPrompt,
        selectedConcept,
        organizationId,
        batchId
      });
      console.log("📡 handleSendClick: Received initial LLM response:", initialResponse);
      
      let newApiCurrentStage = initialResponse.currentStage || 0;
      let newInteractionCompleted = initialResponse.interactionCompleted || false;
      let newEndRequested = initialResponse.endRequested || false;
      const newProgressStage = mapApiStageToProgressbarIndex(newApiCurrentStage, 'inprogress', newInteractionCompleted);
      if (isFirstUserMessage || newProgressStage >= currentStage) {
        setCurrentStage(newProgressStage);
        setCurrentChatStatus('inprogress');
      }
       setChatHistory((prev) => {
      const updated = [...prev];
     const cleaned = initialResponse.apiResponseText.replace(/\*\*(.*?)\*\*/g, '$1');
updated[updated.length - 1].system = formatMarkdownResponse(cleaned, {
  boldHeadings: false,
  numberDashLists: true,
  normalizeBullets: true,
  normalizeNumbers: true,
  splitInlineEmojiBullets: true,
});
      sessionStorage.setItem("chatHistory", JSON.stringify(updated));
      return updated;
    });

      setSessionHistory((prev) => [
        ...prev,
        { Mentee: userPrompt, Mentor: initialResponse.apiResponseText },
      ]);
      if (newEndRequested || newInteractionCompleted) {
        console.log("🎯 handleSendClick: Triggering assessment due to", newInteractionCompleted ? "interactionCompleted" : "endRequested");
        setIsProcessingAssessment(true);
        const organizationId = sessionStorage.getItem("organizationId");
        const batchId = sessionStorage.getItem("batchId");
        const assessmentResponse = await processPromptAndCallLLM({
          username,
          selectedPrompt: "assessmentPrompt",
          selectedModel: "gpt-4o",
          sessionHistory: [
            ...sessionHistory,
            { Mentee: userPrompt, Mentor: initialResponse.apiResponseText },
          ],
          userPrompt: userPrompt,
          selectedConcept,
          organizationId,
          batchId
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
        console.log("📥 Assessment Response:", assessmentResponse.apiResponseText);
        
        setCurrentChatStatus('completed');
        if (newInteractionCompleted) {
          setEndReason('interactionCompleted');
        } else {
          setEndReason('endRequested');
        }
        setIsChatEnded(true);
        console.log("🔒 handleSendClick: Chat ended, input restricted");
      }
    } catch (error) {
      console.error("❌ handleSendClick: Error in API request:", error);
      toast.error("Failed to process request. Please try again.");
    } finally {
      console.log("🏁 handleSendClick: Setting isLoading to false");
      setIsLoading(false);
      setIsProcessingAssessment(false);
    }
  };
  const handleDownloadConcept = (downloadLink, conceptName) => {
    if (!downloadLink) {
      toast.warn(`No download available for ${conceptName}`);
      return;
    }
    window.open(downloadLink, '_blank');
  };
  const getCurrentStageForAPI = (saveStatus) => {
    if (saveStatus === "not_started") {
      return 0;
    } else if (saveStatus === "inprogress" || saveStatus === "completed") {
      if (currentStage === 0) return 0;
      return Math.min(Math.max(currentStage - 1, 0), 5);
    }
    const frontendStatus = getStageStatus();
    if (frontendStatus === 'not-started') return 0;
    if (currentStage === 7) return 5;
    return Math.min(Math.max(currentStage - 1, 0), 5);
  };
  const getFrontendStatusForSave = () => {
    if (isChatEnded) {
      return 'completed';
    }
    if (currentStage === 0 && chatHistory.length <= 1) {
      return 'not_started';
    } else {
      return 'inprogress';
    }
  };
  const handleSaveChat = async (requestedStatus = null, showLoader = true) => {
    if (!username) {
      toast.error("Cannot save chat: User not identified.");
      return;
    }
    if (chatHistory.length === 0) {
      toast.warn("No chat history to save.");
      return;
    }
    if (!selectedConcept || !selectedConcept.concept_name) {
      const concepts = await fetchAndReturnConcepts();
      if (concepts.length > 0) {
        setSelectedConcept(concepts[0]);
        // Proceed with save
      } else {
        toast.warn("No concepts available. Cannot save.");
        return;
      }
    }
    const statusToSave = requestedStatus || getFrontendStatusForSave();
    const stageToSave = getCurrentStageForAPI(statusToSave);
    const conceptNameToSave = selectedConcept?.concept_name;
    let scoring_data = null;
    if (statusToSave === 'completed' && llmContent) {
      scoring_data = extractScoringData(llmContent);
      console.log("📊 Extracted scoring data for save:", scoring_data);
    }
    console.log("💾 Saving chat with:", {
      requestedStatus,
      statusToSave,
      stageToSave,
      currentStage,
      frontendStatus: getStageStatus(),
      currentChatStatus,
      chatHistoryLength: chatHistory.length,
      conceptName: conceptNameToSave,
      hasScoring: !!scoring_data
    });
    if (showLoader) setIsLoading(true);
    try {
      let response;
      let actionMessage = "";
      const requestData = {
        conversation: chatHistory,
        status: statusToSave,
        current_stage: stageToSave,
        concept_name: conceptNameToSave
      };
      if (statusToSave === 'completed' && scoring_data) {
        requestData.scoring_data = scoring_data;
      }
      if (currentChatId && sessionType === "resume") {
        response = await axios.put(`${BASE_URL}/chat/conversation/${currentChatId}`, requestData, config);
        actionMessage = `Updated existing chat (ID: ${currentChatId})`;
      } else {
        response = await axios.post(`${BASE_URL}/chat`, {
          user_id: userId,
          ...requestData
        });
        actionMessage = "Created new chat";
      }
      setShowSaveOptions(false);
      console.log("✅ Chat saved successfully:", {
        status: statusToSave,
        stage: stageToSave,
        conceptName: conceptNameToSave,
        chatId: response.data.data.id,
        hasScoring: !!response.data.data.scoring
      });
      if (response.data.data.scoring) {
        console.log("📊 Scoring data saved:", {
          sixFacetsAverage: response.data.data.scoring.six_facets.average,
          skillsAverage: response.data.data.scoring.understanding_skills.average,
          finalScore: response.data.data.scoring.final_score
        });
      }
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
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };
  const fetchChatCounts = async () => {
    if (!userId) {
      return;
    }
    setIsCountsLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/chat/counts/${userId}`, config);
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
  const checkSessionStatus = async (conceptName = null, conceptsList = null) => {
    if (!username || !userId) {
      setIsInitializing(false);
      return;
    }
    setIsLoading(true);

    // ✅ Use provided conceptsList or fall back to state
    const availableConcepts = conceptsList || concepts;

    try {
      let apiUrl = `${BASE_URL}/chat/session-status/${userId}`;
      if (conceptName) {
        apiUrl += `?concept_name=${encodeURIComponent(conceptName)}`;
      }
      const response = await axios.get(apiUrl, config);
      if (response.data && response.data.success) {
        const { sessionType, hasActiveSession, shouldStartFresh, chat } = response.data.data;
        if (chat && chat.status === 'completed') {
          console.log("🎯 Resumed session is completed, starting fresh conversation instead");
          clearSessionData();
          setCurrentChatStatus('not_started');
          const currentConcepts = availableConcepts.length > 0 ? availableConcepts : await fetchAndReturnConcepts();
          if (currentConcepts.length > 0) {
            const conceptToUse = currentConcepts.find(c => c.concept_name === chat.concept_name) || currentConcepts[0];
            setSelectedConcept(conceptToUse);
            await initiateFirstMentorMessageWithConcept(conceptToUse);
          }
          return;
        }
        if (sessionType === "resume" && hasActiveSession && chat && !shouldStartFresh) {
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

          if (chat.concept_name && availableConcepts.length > 0) {
            const matchingConcept = availableConcepts.find(c => c.concept_name === chat.concept_name);
            if (matchingConcept) {
              setSelectedConcept(matchingConcept);
              console.log("✅ Concept restored from session:", matchingConcept.concept_name);
            } else if (conceptName) {
              const providedConcept = availableConcepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
              if (providedConcept) {
                setSelectedConcept(providedConcept);
                console.log("🔄 Using provided concept:", providedConcept.concept_name);
              }
            }
          } else if (conceptName && availableConcepts.length > 0) {
            const providedConcept = availableConcepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
            if (providedConcept) {
              setSelectedConcept(providedConcept);
              console.log("🔄 Using provided concept for fresh session:", providedConcept.concept_name);
            }
          }
        } else {
          console.log("🆕 Starting fresh session");
          clearSessionData();
          setCurrentChatStatus('not_started');
          const currentConcepts = availableConcepts.length > 0 ? availableConcepts : await fetchAndReturnConcepts();
          if (currentConcepts.length > 0) {
            let conceptToUse;
            if (conceptName) {
              conceptToUse = currentConcepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
            }
            if (!conceptToUse) {
              conceptToUse = selectedConcept || currentConcepts.find(concept => concept.is_active) || currentConcepts[0];
            }
            if (conceptToUse) {
              console.log("🚀 Auto-starting fresh conversation with concept:", conceptToUse.concept_name);
              setSelectedConcept(conceptToUse);
              await initiateFirstMentorMessageWithConcept(conceptToUse);
            }
          }
        }
      } else {
        console.log("⚠️ No session data, starting fresh");
        clearSessionData();
        setCurrentChatStatus('not_started');
        const currentConcepts = availableConcepts.length > 0 ? availableConcepts : await fetchAndReturnConcepts();
        if (currentConcepts.length > 0) {
          let conceptToUse;
          if (conceptName) {
            conceptToUse = currentConcepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
          }
          if (!conceptToUse) {
            conceptToUse = selectedConcept || currentConcepts.find(concept => concept.is_active) || currentConcepts[0];
          }
          console.log("🚀 Force-starting fresh conversation:", conceptToUse.concept_name);
          setSelectedConcept(conceptToUse);
          await initiateFirstMentorMessageWithConcept(conceptToUse);
        } else {
          console.error("❌ No concepts available for fresh conversation");
        }
      }
      await fetchChatCounts();
    } catch (error) {
      console.error("❌ Error checking session status:", error);
      clearSessionData();
      setCurrentChatStatus('not_started');
      const currentConcepts = availableConcepts.length > 0 ? availableConcepts : await fetchAndReturnConcepts();
      if (currentConcepts.length > 0) {
        let conceptToUse;
        if (conceptName) {
          conceptToUse = currentConcepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
        }
        if (!conceptToUse) {
          conceptToUse = selectedConcept || currentConcepts.find(concept => concept.is_active) || currentConcepts[0];
        }
        console.log("🚀 Error recovery - starting fresh conversation:", conceptToUse.concept_name);
        setSelectedConcept(conceptToUse);
        await initiateFirstMentorMessageWithConcept(conceptToUse);
      } else {
        console.error("❌ No concepts available for error recovery");
      }
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
      isInitializingRef.current = false;
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
    if (isProcessingAssessment) {
      toast.warn("⚠️ Please wait, assessment is being processed.");
      return;
    }
    console.log("🎯 Concept selected:", concept.concept_name);
    setSelectedConcept(concept);
    setShowConceptDropdown(false);
    clearSessionData();
    setCurrentChatStatus('not_started');
    console.log("🔍 Checking session status for concept:", concept.concept_name);
    await checkSessionStatus(concept.concept_name);
  };
  const getStageStatus = () => {
    if (currentChatStatus === 'completed') return 'completed';
    if (currentChatStatus === 'not_started') return 'not-started';
    if (currentChatStatus === 'inprogress') return 'in-progress';
    if (currentStage === 0) return 'not-started';
    if (currentStage === 7) return 'completed';
    return 'in-progress';
  };
  useEffect(() => {
    if (username && userId && !isInitializingRef.current) {
      isInitializingRef.current = true; // Set lock to prevent concurrent initializations
      setIsInitializing(true);
      const initializeSession = async () => {
        console.log("🚀 Starting session initialization");
        try {
          // Fetch concepts first
          if (concepts.length === 0) {
            await fetchConcepts();
          }
          const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
          if (currentConcepts.length > 0) {
            const initialConcept = currentConcepts.find(concept => concept.is_active) || currentConcepts[0];
            console.log("🎯 Initial concept for session check:", initialConcept.concept_name);
            setSelectedConcept(initialConcept); // Set initial concept before checking session
            await checkSessionStatus(initialConcept.concept_name);
          } else {
            console.log("⚠️ No concepts available, checking session without concept_name");
            await checkSessionStatus();
          }
        } catch (error) {
          console.error("❌ Error during session initialization:", error);
          setIsInitializing(false);
          isInitializingRef.current = false;
        }
      };
      initializeSession();
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
  useEffect(() => {
    if (
      chatHistory.length > 0 &&
      !isInitializing &&
      !isLoading
    ) {
      const lastEntry = chatHistory[chatHistory.length - 1];
      const isAssessmentEntry = lastEntry?.user === "" && hasAssessmentData(lastEntry?.system);
      if (isAssessmentEntry && currentChatStatus === 'completed') {
        console.log("💾 Detected assessment response, auto-saving as completed...");
        handleSaveChat('completed', false);
      } else if (
        lastEntry?.system &&
        lastEntry?.user !== undefined &&
        currentChatStatus === 'inprogress'
      ) {
        console.log("💾 Detected regular LLM response, auto-saving as inprogress...");
        handleSaveChat('inprogress', false);
      }
    }
  }, [chatHistory, isInitializing, currentChatStatus, isLoading]);
  return (
    <div className="learning-dashboard">
      <Sidebar isProcessingAssessment={isProcessingAssessment} isLoading={isLoading} menuOpen={menuOpen}
        setMenuOpen={setMenuOpen} showMobileMenu={true}/>
      
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
      {showEndSessionDialog && (
        <div className="restart-dialog-overlay">
          <div className="restart-dialog">
            <div className="restart-dialog-header">
              <FiAlertCircle className="restart-dialog-icon" />
              <h3>End Current Session?</h3>
            </div>
            <div className="restart-dialog-content">
              <p>This will end your current learning session and show an assessment. Are you sure?</p>
            </div>
            <div className="restart-dialog-actions">
              <button
                className="restart-btn save-and-restart"
                onClick={handleEndSession}
                disabled={isLoading}
              >
                <FiCheckCircle /> Yes, End Session
              </button>
              <button
                className="restart-btn cancel"
                onClick={() => setShowEndSessionDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {(currentStage > 1 && currentStage <= 6) && (
      <StageCompletionToast stage={currentStage - 1} />
    )}
      <div className="dashboard-layout">
        {(isMobile ? menuOpen : true) && (
        <div className="control-panel">
          <div className="control-section">
            <div className="section-header">
              <FiBook className="section-icon" />
              <h3>Select Batch</h3>
            </div>
            <div className="concept-selector" ref={batchDropdownRef}>
              <div
                className={`concept-dropdown-trigger ${isProcessingAssessment || isLoading ? 'disabled' : ''}`}
                onClick={() => !isProcessingAssessment && setShowBatchDropdown(!showBatchDropdown)}
              >
                <span className="concept-text">
                  {conceptsLoading
                    ? "Loading batches..."
                    : selectedBatch
                      ? selectedBatch.batch_name
                      : batches.length > 0
                        ? "Choose a batch"
                        : "No batches available"
                  }
                </span>
                <FiChevronDown className={`dropdown-arrow ${showBatchDropdown ? 'open' : ''}`} />
              </div>
              {showBatchDropdown && (
                <div className="concept-dropdown">
                  {conceptsLoading ? (
                    <div className="concept-option">
                      <div className="concept-name">Loading...</div>
                    </div>
                  ) : batches.length > 0 ? (
                    batches.map((batch) => (
                      <div
                        key={batch.batch_id}
                        className={`concept-option ${selectedBatch?.batch_id === batch.batch_id ? 'selected' : ''}`}
                        onClick={() => handleBatchSelect(batch)}
                      >
                        <div className="concept-name">{batch.batch_name}</div>
                      </div>
                    ))
                  ) : (
                    <div className="concept-option">
                      <div className="concept-name">No batches available</div>
                      <div className="concept-description">Contact your administrator</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="control-section">
            <div className="section-header">
              <FiTarget className="section-icon" />
              <h3>Select Concept</h3>
            </div>
            <div className="concept-selector" ref={conceptDropdownRef}>
              <div
                className={`concept-dropdown-trigger ${isProcessingAssessment || isLoading ? 'disabled' : ''}`}
                onClick={() => !isProcessingAssessment && setShowConceptDropdown(!showConceptDropdown)}
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
                        className="concept-option flex items-center justify-between cursor-pointer"
                        onClick={() => handleConceptSelect(concept)}
                      >
                        <div className="concept-name">{concept.concept_name}</div>
                        {concept.download_link && (
                          <button
                            className="download-btn1 relative group"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadConcept(concept.download_link, concept.concept_name);
                            }}
                            data-tooltip="Download concept material"
                            aria-label={`Download ${concept.concept_name} material`}
                          >
                            <FiDownload className="w-5 h-5" />
                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-700 text-white text-xs px-3 py-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                              Download
                            </span>
                          </button>
                        )}
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
          <div className="control-section">
            <div className="section-header"
              style={{
                cursor: isMobile ? 'pointer' : 'default',
                userSelect: 'none'
              }}>
              <FiTrendingUp className="section-icon" />
              <h3>Learning Progress</h3>
            </div>
            <div className="stage-cards">
              <div className={`stage-card ${getStageStatus() === 'not-started' ? 'active' : ''}`}>
                <div className="stage-icon not-started">
                  <FiClock />
                </div>
                <div className="stage-content">
                  <h4>Not Started</h4>
                </div>
              </div>
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
                            {(() => {
                              const completed = Math.max(currentStage - 2, 0);
                              return `${Math.round((completed / 5) * 100)}%`;
                            })()}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.round((Math.max(currentStage - 2, 0) / 5) * 100)}%`
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
        )}
        <div className="chat-panel">
          <div className="top-right-actions">
            <div className="save-section">
              <button
                ref={topSaveButtonRef}
                className="top-action-btn top-save-btn"
                onClick={() => !isProcessingAssessment && setShowSaveOptions(!showSaveOptions)}
                disabled={chatHistory.length === 0 || isProcessingAssessment || currentChatStatus === 'not_started'}
                data-tooltip="Save Progress"
              >
                <FiSave />
              </button>
              {showSaveOptions && (
                <div ref={topSaveOptionsRef} className="top-save-dropdown">
                  <button className="top-save-option current" onClick={() => !isProcessingAssessment && handleSaveChat()}
                    disabled={isProcessingAssessment || currentChatStatus === 'not_started'}>
                    <FiSave /> Save Current Progress
                  </button>
                </div>
              )}
            </div>
            <button
              className="top-action-btn top-download-btn"
              onClick={() => !isProcessingAssessment && handleDownloadPDF()}
              disabled={chatHistory.length === 0 || isProcessingAssessment || currentChatStatus === 'not_started'}
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
                    {item.system && (
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
                              // Assessment JSON → custom UI
                              <AssessmentDisplay content={item.system} />
                            ) : (
                              // Normal mentor text → Markdown
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
  {item.system}
</ReactMarkdown>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
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
            <div className="chat-input-container">
              {isLoading && (
                <div className="loading-indicator">
                  <div className="loading-spinner"></div>
                  <span>
                    {isProcessingAssessment
                      ? "Please wait. We are calculating your score"
                      : "AI is thinking..."
                    }
                  </span>
                </div>
              )}
              <div className="chat-input-wrapper">
                <div className="tooltip-container" data-tooltip={
                  currentChatStatus === 'not_started' ? "Start a conversation first" :
                    isChatEnded ? "Session already ended" :
                      "End Session"
                }>
                  <button
                    className="end-session-btn"
                    onClick={() => setShowEndSessionDialog(true)}
                    disabled={isProcessingAssessment || currentChatStatus === 'not_started' || isChatEnded || isLoading}
                    style={isProcessingAssessment || currentChatStatus === 'not_started' || isChatEnded ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <FiStopCircle />
                  </button>
                </div>
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
                <VoiceRecorder
                  ref={voiceRecorderRef}
                  onTranscription={(text) => {
                    setPrompt((prev) => (prev ? prev + " " : "") + text);
                  }}
                  disabled={isLoading || !selectedConcept || isInitializing || isChatEnded || isProcessingAssessment}
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

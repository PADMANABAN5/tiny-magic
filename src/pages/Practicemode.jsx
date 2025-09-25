import React, { useState, useEffect, useRef, useCallback } from "react";
import debounce from "lodash/debounce";
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
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { processPromptAndCallLLM } from "../utils/processPromptAndCallLLM";
import Progressbar from "../components/PracticeProgress.jsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PDFDownloader from "../components/PDFDownloader.jsx";
import AssessmentDisplay, { hasAssessmentData, extractScoringData } from "../components/AssessmentDisplay.jsx";
import { parseApiResponseText } from "../utils/parseApiResponseText.js";
import { useAuth } from "../components/AuthContext.jsx";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import LevelCompletionToast from "../components/LevelCompletionToast.jsx";
const BASE_URL = process.env.REACT_APP_API_LINK || "http://localhost:5000"; // Fallback URL

function Practicemode() {
  const [prompt, setPrompt] = useState("");
  const [practiceChatHistory, setPracticeChatHistory] = useState([]);
  const chatEndRef = useRef(null);
  const [selectedPrompt, setSelectedPrompt] = useState("practicePrompt");
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
  const [apiData, setApiData] = useState({});
  const apiDataRef = useRef({});

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

 const getLevelName = (level) => {
    if (!selectedConcept) return null;
    switch (level) {
      case 1:
        return selectedConcept.level_1_name || null;
      case 2:
        return selectedConcept.level_2_name || null;
      case 3:
        return selectedConcept.level_3_name || null;
      case 4:
        return selectedConcept.level_4_name || null;
      case 5:
        return selectedConcept.level_5_name || null;
      default:
        return null;
    }
  };



  // Enhanced state for proper session management
  const [currentPracticeChatId, setCurrentPracticeChatId] = useState(null);
  const [PracSessionType, setPracSessionType] = useState(null);
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

  // In Practicemode.jsx
  // 1. build finalAssessment first
  let finalAssessment = null;
  try {
    let parsed =
      typeof apiData === "string"
        ? JSON.parse(apiData)
        : apiData?.apiResponseText
        ? JSON.parse(apiData.apiResponseText)
        : apiData;

    finalAssessment = parsed?.final_assessment || null;
  } catch (err) {
    console.error("❌ Failed to parse apiData for PDF:", err);
  }

  // ✅ Pass this into PDFDownloader
  const { handleDownloadPDF } = PDFDownloader({
    chatHistory: practiceChatHistory,
    selectedConcept,
    finalAssessment: apiData?.final_assessment
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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.addEventListener("mousedown", handleClickOutside);
  }, [showSaveOptions, showConceptDropdown]);

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
        const conceptsData = data.batch?.concepts || [];

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
        selectedPrompt: "practicePrompt",
        selectedModel: "gpt-4o",
        sessionHistory: [],
        userPrompt: "",
        selectedConcept: concept,
        organizationId,
        batchId
      });

      const mentorMessage = parseApiResponseText(response.apiResponseText);
      // Try parsing response for scenario progress
      try {
        const cleanedText = response.apiResponseText
          .replace(/```json\s*/i, "")
          .replace(/```$/, "")
          .trim();

        const parsedResponse = JSON.parse(cleanedText);

        setApiData(parsedResponse);

        if (concept?.concept_name || selectedConcept?.concept_name) {
          const conceptName = concept?.concept_name || selectedConcept.concept_name;
          sessionStorage.setItem(
            `scenarioProgress_${conceptName}`,
            JSON.stringify(parsedResponse)
          );
        }
      } catch (err) {
        console.warn("⚠️ Could not parse scenario progress from initial mentor message");
      }

      const updatedHistory = [{ user: "", system: mentorMessage }];

      setPracticeChatHistory(updatedHistory);
      setSessionHistory([{ Mentee: "", Mentor: mentorMessage }]);
      setCurrentStage(0);
      setCurrentChatStatus('not_started');
      setPracSessionType("fresh");
      setCurrentPracticeChatId(null);
      setResumedFromStatus(null);
      setIsChatEnded(false);
      setEndReason(null);
      sessionStorage.setItem("practiceChatHistory", JSON.stringify(updatedHistory));
      sessionStorage.setItem("PracSessionType", "fresh");

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
    setPracticeChatHistory([]);
    setSessionHistory([]);
    setCurrentPracticeChatId(null);
    setCurrentStage(0);
    setPracSessionType(null);
    setResumedFromStatus(null);
    setCurrentChatStatus('not_started');
    setIsChatEnded(false);
    setEndReason(null);
    sessionStorage.removeItem("practiceChatHistory");
    sessionStorage.removeItem("currentPracticeChatId");
    sessionStorage.removeItem("PracSessionType");
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
        selectedPrompt: "practicePrompt",
        selectedModel: "gpt-4o",
        sessionHistory: [],
        userPrompt: "",
        selectedConcept,
        organizationId,
        batchId
      });

      const mentorMessage = parseApiResponseText(response.apiResponseText);
      // Try parsing response for scenario progress
      try {
        const cleanedText = response.apiResponseText
          .replace(/```json\s*/i, "")
          .replace(/```$/, "")
          .trim();
        const parsedResponse = JSON.parse(cleanedText);

        setApiData(parsedResponse);
        sessionStorage.setItem(
          `scenarioProgress_${selectedConcept.concept_name}`,
          JSON.stringify(parsedResponse)
        );
      } catch (err) {
        console.warn("⚠️ Could not parse scenario progress from initial mentor message");
      }

      const updatedHistory = [{ user: "", system: mentorMessage }];

      setPracticeChatHistory(updatedHistory);
      setSessionHistory([{ Mentee: "", Mentor: mentorMessage }]);
      setCurrentStage(0);
      setCurrentChatStatus('not_started');
      setPracSessionType("fresh");
      setCurrentPracticeChatId(null);
      setResumedFromStatus(null);
      setIsChatEnded(false);
      setEndReason(null);
      sessionStorage.setItem("practiceChatHistory", JSON.stringify(updatedHistory));
      sessionStorage.setItem("PracSessionType", "fresh");
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
    setIsLoading(true);
    setIsProcessingAssessment(true);

    try {
      const organizationId = sessionStorage.getItem("organizationId");
      const batchId = sessionStorage.getItem("batchId");
      const assessmentResponse = await processPromptAndCallLLM({
        username,
        selectedPrompt: "practicePrompt",
        selectedModel: "gpt-4o",
        sessionHistory,
        userPrompt: "",
        selectedConcept,
        organizationId,
        batchId
      });

      setLlmContent(assessmentResponse.apiResponseText);
      let parsedAssessment = null;
      try {
        const cleanedAssessmentText = assessmentResponse.apiResponseText
          .replace(/```json\s*/i, "")
          .replace(/```$/, "")
          .trim();
        parsedAssessment = JSON.parse(cleanedAssessmentText);

        // Update apiData with the latest assessment
        setApiData(prev => ({
          ...prev,
          final_assessment: parsedAssessment.final_assessment || prev.final_assessment
        }));

        if (selectedConcept?.concept_name) {
          sessionStorage.setItem(
            `scenarioProgress_${selectedConcept.concept_name}`,
            JSON.stringify(parsedAssessment)
          );
        }
      } catch (err) {
        console.warn("⚠️ Could not parse assessment response", err);
      }

      const assessmentChatEntry = {
        user: "",
        system: parseApiResponseText(assessmentResponse.apiResponseText),
      };

      const finalHistory = [...practiceChatHistory, assessmentChatEntry];

      // Update state and sessionStorage
      setPracticeChatHistory(finalHistory);
      sessionStorage.setItem("practiceChatHistory", JSON.stringify(finalHistory));

      setSessionHistory((prev) => [
        ...prev,
        { Mentee: "", Mentor: parseApiResponseText(assessmentResponse.apiResponseText) },
      ]);

      setCurrentChatStatus("completed");
      setIsChatEnded(true);
      setEndReason("endRequested");

      // Pass the parsed assessment to handleSaveChat
      await handleSaveChat("completed", true, finalHistory, parsedAssessment?.final_assessment);

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
    setPracticeChatHistory((prev) => {
      const updated = [...prev, { user: userPrompt, system: "" }];
      sessionStorage.setItem("practiceChatHistory", JSON.stringify(updated));
      return updated;
    });

    try {
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

      const parsedResponse = (() => {
        try {
          const cleanedText = initialResponse.apiResponseText
            .replace(/```json\s*/i, "")
            .replace(/```$/, "")
            .trim();
          return JSON.parse(cleanedText);
        } catch (e) {
          return {};
        }
      })();

      // Update apiData with the latest response
      setApiData(parsedResponse);
      if (selectedConcept?.concept_name) {
        sessionStorage.setItem(
          `scenarioProgress_${selectedConcept.concept_name}`,
          JSON.stringify(parsedResponse)
        );
      }

      const apiCurrentLevel = Number(parsedResponse.current_level) || 0;
      const newStatus = parsedResponse.status || "";

      const newProgressStage = apiCurrentLevel > 0 ? apiCurrentLevel + 1 : 0;

      if (newStatus === "complete" || newStatus === "exit") {
        setIsChatEnded(true);
        setEndReason("interactionCompleted");
        setCurrentChatStatus("completed");

        const finalHistory = [...practiceChatHistory, {
          user: userPrompt,
          system: parseApiResponseText(initialResponse.apiResponseText)
        }];

        // Pass the parsed final_assessment to handleSaveChat
        await handleSaveChat('completed', true, finalHistory, parsedResponse.final_assessment);

        setCurrentStage(7);
        console.log("🎯 Session completed, moved to Completed card");
      } else {
        if (isFirstUserMessage || newProgressStage >= currentStage) {
          setCurrentStage(newProgressStage);
          setCurrentChatStatus("inprogress");
          console.log("➡️ Progressing to stage:", newProgressStage);
        }
      }

      setPracticeChatHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].system = parseApiResponseText(initialResponse.apiResponseText);
        sessionStorage.setItem("practiceChatHistory", JSON.stringify(updated));
        return updated;
      });

      setSessionHistory((prev) => [
        ...prev,
        { Mentee: userPrompt, Mentor: parseApiResponseText(initialResponse.apiResponseText) },
      ]);

      if (parsedResponse.endRequested || parsedResponse.interactionCompleted) {
        console.log("🎯 handleSendClick: Triggering assessment due to", parsedResponse.interactionCompleted ? "interactionCompleted" : "endRequested");
        setIsProcessingAssessment(true);
        const assessmentResponse = await processPromptAndCallLLM({
          username,
          selectedPrompt: "practicePrompt",
          selectedModel: "gpt-4o",
          sessionHistory: [
            ...sessionHistory,
            { Mentee: userPrompt, Mentor: parseApiResponseText(initialResponse.apiResponseText) },
          ],
          userPrompt: userPrompt,
          selectedConcept,
          organizationId,
          batchId
        });

        setLlmContent(assessmentResponse.apiResponseText);

        let parsedAssessment = null;
        try {
          const cleanedAssessmentText = assessmentResponse.apiResponseText
            .replace(/```json\s*/i, "")
            .replace(/```$/, "")
            .trim();
          parsedAssessment = JSON.parse(cleanedAssessmentText);

          // Update apiData with the latest assessment
          setApiData(prev => ({
            ...prev,
            final_assessment: parsedAssessment.final_assessment || prev.final_assessment
          }));

          if (selectedConcept?.concept_name) {
            sessionStorage.setItem(
              `scenarioProgress_${selectedConcept.concept_name}`,
              JSON.stringify(parsedAssessment)
            );
          }
        } catch (err) {
          console.warn("⚠️ Could not parse assessment response", err);
        }

        const assessmentChatEntry = {
          user: "",
          system: parseApiResponseText(assessmentResponse.apiResponseText),
        };

        const finalChatHistory = [...practiceChatHistory, assessmentChatEntry];

        setPracticeChatHistory(finalChatHistory);
        sessionStorage.setItem("practiceChatHistory", JSON.stringify(finalChatHistory));

        setSessionHistory((prev) => [
          ...prev,
          { Mentee: "", Mentor: parseApiResponseText(assessmentResponse.apiResponseText) },
        ]);

        setCurrentChatStatus('completed');
        // Pass the parsed assessment to handleSaveChat
        await handleSaveChat("completed", true, finalChatHistory, parsedAssessment?.final_assessment);

        setEndReason(parsedResponse.interactionCompleted ? 'interactionCompleted' : 'endRequested');
        setIsChatEnded(true);
        console.log("🔒 handleSendClick: Chat ended, input restricted");
      }
    } catch (error) {
      console.error("❌ handleSendClick: Error in API request:", error);
      toast.error("Failed to process request. Please try again.");
    } finally {
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

  const getCurrentStageForAPI = (saveStatus, apiStage = null) => {
    if (saveStatus === "not_started") return 0;
    if (saveStatus === "inprogress") {
      if (currentStage === 0) return 0;
      return Math.min(Math.max(currentStage - 1, 0), 5);
    }
    if (saveStatus === "completed") {
      // Use passed apiStage if available (preserves the level where completion happened)
      if (apiStage !== null) return Math.min(Math.max(apiStage, 0), 5);
      // Fallback: calculate from frontend stage (but cap at 5 for completed)
      return currentStage === 7 ? 5 : Math.min(Math.max(currentStage - 1, 0), 5);
    }

    // fallback
    if (currentStage === 0) return 0;
    if (currentStage === 7) return 5;
    return Math.min(Math.max(currentStage - 1, 0), 5);
  };

  const getFrontendStatusForSave = () => {
    if (isChatEnded) {
      return 'completed';
    }

    if (currentStage === 0 && practiceChatHistory.length <= 1) {
      return 'not_started';
    } else {
      return 'inprogress';
    }
  };

  const handleSaveChat = async (requestedStatus = null, showLoader = true, historyOverride = null, finalAssessmentOverride = null) => {
    console.log("🐞 handleSaveChat: Starting with apiData:", apiData, "finalAssessmentOverride:", finalAssessmentOverride);

    const historyToSave = historyOverride || practiceChatHistory;
    if (!username) {
      toast.error("Cannot save chat: User not identified.");
      return;
    }

    if (historyToSave.length === 0) {
      toast.warn("No chat history to save.");
      return;
    }

    if (!selectedConcept || !selectedConcept.concept_name) {
      const concepts = await fetchAndReturnConcepts();
      if (concepts.length > 0) {
        setSelectedConcept(concepts[0]);
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
      chatHistoryLength: historyToSave.length,
      conceptName: conceptNameToSave,
      hasScoring: !!scoring_data
    });

    if (showLoader) setIsLoading(true);

    try {
      let response;
      let actionMessage = "";

      // Prioritize finalAssessmentOverride, then apiData, then llmContent
      let finalAssessment = finalAssessmentOverride || {};
      if (!finalAssessmentOverride && statusToSave === "completed") {
        if (apiData?.final_assessment) {
          finalAssessment = apiData.final_assessment;
          console.log("✅ Using final_assessment from apiData:", finalAssessment);
        } else if (llmContent) {
          try {
            const cleaned = llmContent.replace(/```json\s*/i, "").replace(/```$/, "").trim();
            const parsed = JSON.parse(cleaned);
            if (parsed.final_assessment) {
              finalAssessment = parsed.final_assessment;
              console.log("✅ Parsed final_assessment from llmContent:", finalAssessment);
            } else {
              console.warn("⚠️ No final_assessment in llmContent");
            }
          } catch (err) {
            console.warn("⚠️ Could not parse final_assessment from llmContent:", err);
          }
        }
      }

      const facetRatings = finalAssessment.facet_ratings || {};

      // Build requestData with actual values
      const requestData = {
        conversation: historyToSave,
        status: statusToSave,
        current_stage: stageToSave,
        concept_name: conceptNameToSave,
        overall_performance: finalAssessment.overall_performance || "Not rated",
        facet_ratings_explanation: facetRatings.explanation || "Not rated",
        facet_ratings_interpretation: facetRatings.interpretation || "Not rated",
        facet_ratings_application: facetRatings.application || "Not rated",
        facet_ratings_perspective: facetRatings.perspective || "Not rated",
        facet_ratings_empathy: facetRatings.empathy || "Not rated",
        facet_ratings_self_knowledge: facetRatings.self_knowledge || "Not rated",
        key_patterns: finalAssessment.key_patterns || [],
        recommended_focus_areas: finalAssessment.recommended_focus_areas || [],
        personalized_next_steps: finalAssessment.personalized_next_steps || [],
        session_summary: finalAssessment.session_summary || "",
        ...(statusToSave === "completed" && scoring_data ? { scoring_data } : {})
      };

      console.log("📤 requestData for save:", requestData);

      if (currentPracticeChatId && PracSessionType === "resume") {
        response = await axios.put(
          `${BASE_URL}/practicemode/conversation/${currentPracticeChatId}`,
          requestData,
          config
        );
        actionMessage = `Updated existing chat (ID: ${currentPracticeChatId})`;
      } else {
        response = await axios.post(`${BASE_URL}/practicemode`, {
          user_id: userId,
          ...requestData
        }, config);
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
        setPracSessionType(statusToSave === "completed" ? "completed" : "fresh");
        setCurrentPracticeChatId(null);
        setResumedFromStatus(null);
        setCurrentStage(0);
        setCurrentChatStatus(statusToSave);
      } else {
        const newChatId = response.data.data.id || currentPracticeChatId;
        setCurrentPracticeChatId(newChatId);
        setPracSessionType("resume");
        setResumedFromStatus(statusToSave);
        setCurrentChatStatus(statusToSave);
      }

      sessionStorage.setItem("practiceChatHistory", JSON.stringify(historyToSave));
      await fetchChatCounts();
    } catch (error) {
      console.error("❌ Error saving chat:", error);
      toast.error(
        `Failed to save chat: ${error.response?.data?.message || "Server error"}`,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
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
      const response = await axios.get(`${BASE_URL}/practicemode/counts/${userId}`, config);

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
      return;
    }

    setIsLoading(true);
    try {
      let apiUrl = `${BASE_URL}/practicemode/session-status/${userId}`;
      if (conceptName) {
        apiUrl += `?concept_name=${encodeURIComponent(conceptName)}`;
      }

      const response = await axios.get(apiUrl, config);

      if (response.data && response.data.success) {
        const { PracSessionType, hasActiveSession, shouldStartFresh, practicemode: chat } = response.data.data;
        if (chat && chat.status === 'completed') {
          console.log("🎯 Resumed session is completed, starting fresh conversation instead");
          clearSessionData();
          setCurrentChatStatus('not_started');

          const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
          if (currentConcepts.length > 0) {
            const conceptToUse = currentConcepts.find(c => c.concept_name === chat.concept_name) || currentConcepts[0];
            setSelectedConcept(conceptToUse);
            await initiateFirstMentorMessageWithConcept(conceptToUse);
          }
          return;
        }

        if (PracSessionType === "resume" && hasActiveSession && chat && !shouldStartFresh) {
          console.log("🔄 Resuming existing session:", chat);

          setPracticeChatHistory(chat.conversation);

          const loadedSessionHistory = chat.conversation
            .filter((item) => item.user !== undefined && item.system !== undefined)
            .map((item) => ({ Mentee: item.user, Mentor: item.system }));
          setSessionHistory(loadedSessionHistory);

          setCurrentPracticeChatId(chat.id);
          setPracSessionType("resume");
          setResumedFromStatus(chat.status);
          setCurrentChatStatus(chat.status);

          const progressStage = mapApiStageToProgressbarIndex(
            chat.current_stage,
            chat.status,
            false
          );
          setCurrentStage(progressStage);

          if (chat) {
            setApiData(prev => ({
              ...prev,
              current_scenario_number: chat.current_scenario_number,
              scenarios_completed: chat.scenarios_completed,
              session_progress: {
                ...(prev.session_progress || {}),
                total_scenarios: chat.total_scenarios
              }
            }));
          }

          console.log("✅ Session resumed with stage:", {
            apiStage: chat.current_stage,
            status: chat.status,
            progressStage: progressStage,
            conceptName: chat.concept_name
          });

          sessionStorage.setItem("practiceChatHistory", JSON.stringify(chat.conversation));
          console.log("💾 Setting currentPracticeChatId:", chat.id);
          sessionStorage.setItem("currentPracticeChatId", chat.id.toString());
          sessionStorage.setItem("PracSessionType", "resume");

          if (chat.concept_name && concepts.length > 0) {
            const matchingConcept = concepts.find(c => c.concept_name === chat.concept_name);
            if (matchingConcept) {
              setSelectedConcept(matchingConcept);
              console.log("✅ Concept restored from session:", matchingConcept.concept_name);
            } else if (conceptName) {
              const providedConcept = concepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
              if (providedConcept) {
                setSelectedConcept(providedConcept);
                console.log("🔄 Using provided concept:", providedConcept.concept_name);
              }
            }
          } else if (conceptName && concepts.length > 0) {
            const providedConcept = concepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
            if (providedConcept) {
              setSelectedConcept(providedConcept);
              console.log("🔄 Using provided concept for fresh session:", providedConcept.concept_name);
            }
          }
        } else {
          console.log("🆕 Starting fresh session");
          clearSessionData();
          setCurrentChatStatus('not_started');

          const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
          if (currentConcepts.length > 0) {
            let conceptToUse;

            if (conceptName) {
              conceptToUse = currentConcepts.find(c => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
            }

            if (!conceptToUse) {
              conceptToUse = selectedConcept || currentConcepts.find(concept => concept.is_active) || currentConcepts[0];
            }

            console.log("🚀 Auto-starting fresh conversation with concept:", conceptToUse.concept_name);
            setSelectedConcept(conceptToUse);
            await initiateFirstMentorMessageWithConcept(conceptToUse);
          }
        }
      } else {
        console.log("⚠️ No session data, starting fresh");
        clearSessionData();
        setCurrentChatStatus('not_started');

        const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
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

      const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
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
    setApiData({}); 
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
  }, [practiceChatHistory]);

  useEffect(() => {
    if (!isInitializing && !practiceChatHistory.length) {
      const savedPracSessionType = sessionStorage.getItem("PracSessionType");

      if (savedPracSessionType === "completed") {
        clearSessionData();
        return;
      }

      const savedHistory = sessionStorage.getItem("practiceChatHistory");
      const savedChatId = sessionStorage.getItem("currentPracticeChatId");

      if (savedHistory && savedPracSessionType === "resume") {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            setPracticeChatHistory(parsedHistory);

            if (savedChatId) {
              setCurrentPracticeChatId(parseInt(savedChatId));
              setPracSessionType("resume");

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
  }, [isInitializing, practiceChatHistory.length]);

  useEffect(() => {
    if (practiceChatHistory.length > 0 && !isInitializing && !isLoading) {
      const lastEntry = practiceChatHistory[practiceChatHistory.length - 1];
      const isAssessmentEntry = lastEntry?.user === "" && hasAssessmentData(lastEntry?.system);

      if (isAssessmentEntry && currentChatStatus === 'completed') {
        console.log("💾 Detected assessment response, auto-saving as completed...");
        handleSaveChat('completed', false);
      } else if (
        lastEntry?.system &&
        lastEntry?.user && // Checks for non-empty user message
        currentChatStatus === 'inprogress'
      ) {
        console.log("💾 Detected regular LLM response, auto-saving as inprogress...");
        handleSaveChat('inprogress', false);
      }
    }
  }, [practiceChatHistory, isInitializing, currentChatStatus, isLoading]);

  useEffect(() => {
    if (selectedConcept?.concept_name) {
      const savedProgress = sessionStorage.getItem(
        `scenarioProgress_${selectedConcept.concept_name}`
      );
      if (savedProgress) {
        try {
          setApiData(JSON.parse(savedProgress));
        } catch (err) {
          console.error("❌ Failed to parse saved scenario progress:", err);
        }
      }
    }
  }, [selectedConcept]);

  return (
    <div className="learning-dashboard">
      <Sidebar isProcessingAssessment={isProcessingAssessment} isLoading={isLoading} />
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
        <LevelCompletionToast
          level={currentStage - 1}
          levelName={getLevelName(currentStage - 1)}
        />
      )}
      <div className="dashboard-layout">
        <div className="control-panel">
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
            <div className="section-header">
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
                                `Level ${currentStage - 1}/5`}
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
        <div className="chat-panel">
          <div className="top-right-actions">
            <div className="save-section">
              <button
                ref={topSaveButtonRef}
                className="top-action-btn top-save-btn"
                onClick={() => !isProcessingAssessment && setShowSaveOptions(!showSaveOptions)}
                disabled={practiceChatHistory.length === 0 || isProcessingAssessment || currentChatStatus === 'not_started'}
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
              disabled={practiceChatHistory.length === 0 || isProcessingAssessment || currentChatStatus === 'not_started'}
              data-tooltip="Export Chat"
            >
              <FiDownload />
            </button>
          </div>
          <div className="chat-container">
            <div className="chat-messages" id="chat-history">
              {practiceChatHistory.length === 0 ? (
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
                practiceChatHistory.map((item, index) => (
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
                            <AssessmentDisplay content={item.system} />
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
                                  onTranscription={(text) => {
                                    setPrompt((prev) => (prev ? prev + " " : "") + text);
                                  }}
                                  disabled={isLoading || !selectedConcept || isInitializing || isChatEnded}
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

export default Practicemode;

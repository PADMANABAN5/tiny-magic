
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
import Progressbar from "../components/Progressbar.jsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PDFDownloader from "../components/PDFDownloader.jsx";
import AssessmentDisplay, { hasAssessmentData, extractScoringData } from "../components/AssessmentDisplay.jsx";

const BASE_URL = process.env.REACT_APP_API_LINK || "http://localhost:5000"; // Fallback URL

function Practicemode() {
  const [prompt, setPrompt] = useState("");
  const [practicemodeHistory, setPracticemodeHistory] = useState([]);
  const practiceEndRef = useRef(null);
  const [selectedPrompt] = useState("conceptMentor");
  const username = sessionStorage.getItem("username") || "";
  const userId = sessionStorage.getItem("userId") || "";
  const [llmContent, setLlmContent] = useState("");
  const [sessionHistory, setSessionHistory] = useState([]);
  const [currentStage, setCurrentStage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCountsLoading, setIsCountsLoading] = useState(false);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const [currentPracticeId, setCurrentPracticeId] = useState(null);
  const [sessionType, setSessionType] = useState(null);
  const [resumedFromStatus, setResumedFromStatus] = useState(null);
  const [currentPracticeStatus, setCurrentPracticeStatus] = useState("not_started");
  const [isInitializing, setIsInitializing] = useState(true);
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const [isProcessingAssessment, setIsProcessingAssessment] = useState(false);
  const [isPracticeEnded, setIsPracticeEnded] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [endReason, setEndReason] = useState(null);
  const [concepts, setConcepts] = useState([]);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [showConceptDropdown, setShowConceptDropdown] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isInitializingRef = useRef(false);
  const navigate = useNavigate();

  const conceptDropdownRef = useRef(null);
  const topSaveButtonRef = useRef(null);
  const topSaveOptionsRef = useRef(null);
  const storedToken = sessionStorage.getItem("token") || "";
  const config = {
    headers: {
      Authorization: `Bearer ${storedToken}`,
    },
  };

  const [practiceCounts, setPracticeCounts] = useState({
    not_started: 0,
    inprogress: 0,
    completed: 0,
    archived: 0,
  });

  const { handleDownloadPDF } = PDFDownloader({
    practicemodeHistory,
    selectedConcept,
  });

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
  }, [location.pathname, isProcessingAssessment, navigate]);

  useEffect(() => {
    if (isProcessingAssessment) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = "An assessment is being processed. Are you sure you want to leave?";
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSaveOptions, showConceptDropdown]);

  const fetchAndReturnConcepts = async () => {
    if (!username || conceptsLoading) return [];

    const cachedConcepts = localStorage.getItem("cachedConcepts");
    if (cachedConcepts) {
      try {
        const parsedConcepts = JSON.parse(cachedConcepts);
        if (Array.isArray(parsedConcepts) && parsedConcepts.length > 0) {
          console.log("✅ Using cached concepts:", parsedConcepts.length);
          setConcepts(parsedConcepts);
          return parsedConcepts;
        }
      } catch (error) {
        console.error("❌ Error parsing cached concepts:", error);
      }
    }

    setConceptsLoading(true);
    try {
      console.log("🎯 Fetching concepts for fresh session:", username);
      const response = await axios.get(`${BASE_URL}/pod-users/user/${username}`, {
        ...config,
        timeout: 10000,
      });

      if (response.data?.success && response.data?.data?.batch?.concepts) {
        const conceptsData = response.data.data.batch.concepts || [];
        console.log("✅ Concepts fetched for fresh session:", conceptsData.length);
        setConcepts(conceptsData);
        localStorage.setItem("cachedConcepts", JSON.stringify(conceptsData));
        return conceptsData;
      } else {
        console.warn("⚠️ No concepts data in response for fresh session");
        return [];
      }
    } catch (error) {
      console.error("❌ Error fetching concepts for fresh session:", error);
      toast.error("Failed to load concepts. Please try again.");
      return [];
    } finally {
      setConceptsLoading(false);
    }
  };

  const fetchConcepts = async () => {
    if (!username || conceptsLoading) return;

    const cachedConcepts = localStorage.getItem("cachedConcepts");
    if (cachedConcepts) {
      try {
        const parsedConcepts = JSON.parse(cachedConcepts);
        if (Array.isArray(parsedConcepts) && parsedConcepts.length > 0) {
          console.log("✅ Using cached concepts for fetchConcepts:", parsedConcepts.length);
          setConcepts(parsedConcepts);
          const batch = {
            batch_id: sessionStorage.getItem("batchId"),
            organization_id: sessionStorage.getItem("organizationId"),
          };
          if (batch?.batch_id && batch?.organization_id) {
            sessionStorage.setItem("batchId", batch.batch_id);
            sessionStorage.setItem("organizationId", batch.organization_id);
            console.log("✅ Stored batchId and orgId in sessionStorage", {
              batchId: batch.batch_id,
              orgId: batch.organization_id,
            });
          }
          return;
        }
      } catch (error) {
        console.error("❌ Error parsing cached concepts:", error);
      }
    }

    setConceptsLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/pod-users/user/${username}`, {
        ...config,
        timeout: 10000,
      });

      if (response.data?.success && response.data?.data?.batch?.concepts) {
        const conceptsData = response.data.data.batch.concepts || [];
        console.log("✅ Concepts loaded:", conceptsData.length);
        setConcepts(conceptsData);
        localStorage.setItem("cachedConcepts", JSON.stringify(conceptsData));

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
    const organizationId = sessionStorage.getItem("organizationId") || "";
    const batchId = sessionStorage.getItem("batchId") || "";
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

      const mentorMessage = response.apiResponseText;
      const updatedHistory = [{ user: "", system: mentorMessage }];

      setPracticemodeHistory(updatedHistory);
      setSessionHistory([{ Mentee: "", Mentor: mentorMessage }]);
      setCurrentStage(0);
      setCurrentPracticeStatus("not_started");
      setSessionType("fresh");
      setCurrentPracticeId(null);
      setResumedFromStatus(null);
      setIsPracticeEnded(false);
      setEndReason(null);
      sessionStorage.setItem("practicemodeHistory", JSON.stringify(updatedHistory));
      sessionStorage.setItem("practicesessionType", "fresh");

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
    setPracticemodeHistory([]);
    setSessionHistory([]);
    setCurrentPracticeId(null);
    setCurrentStage(0);
    setSessionType(null);
    setResumedFromStatus(null);
    setCurrentPracticeStatus("not_started");
    setIsPracticeEnded(false);
    setEndReason(null);
    sessionStorage.removeItem("practicemodeHistory");
    sessionStorage.removeItem("currentPracticeId");
    sessionStorage.removeItem("practicesessionType");
  };

  const mapApiStageToProgressbarIndex = (apiCurrentStage, status, interactionCompleted) => {
    if (interactionCompleted || status === "completed") return 7;
    if (status === "not_started") return 0;

    switch (apiCurrentStage) {
      case 0:
        return 1;
      case 1:
        return 2;
      case 2:
        return 3;
      case 3:
        return 4;
      case 4:
        return 5;
      case 5:
        return 6;
      default:
        return 1;
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
      const organizationId = sessionStorage.getItem("organizationId") || "";
      const batchId = sessionStorage.getItem("batchId") || "";
      const response = await processPromptAndCallLLM({
        username,
        selectedPrompt: "conceptMentor",
        selectedModel: "gpt-4o",
        sessionHistory: [],
        userPrompt: "",
        selectedConcept,
        organizationId,
        batchId,
      });

      const mentorMessage = response.apiResponseText;
      const updatedHistory = [{ user: "", system: mentorMessage }];

      setPracticemodeHistory(updatedHistory);
      setSessionHistory([{ Mentee: "", Mentor: mentorMessage }]);
      setCurrentStage(0);
      setCurrentPracticeStatus("not_started");
      setSessionType("fresh");
      setCurrentPracticeId(null);
      setResumedFromStatus(null);
      setIsPracticeEnded(false);
      setEndReason(null);
      sessionStorage.setItem("practicemodeHistory", JSON.stringify(updatedHistory));
      sessionStorage.setItem("practicesessionType", "fresh");
    } catch (err) {
      console.error("❌ Failed to load initial mentor message:", err);
      toast.error("Failed to start conversation. Please try again.");
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  const handleRestartPractice = () => {
  setShowRestartDialog(true);
};

  const handleEndSession = async () => {
    setShowEndSessionDialog(false);
    setIsLoading(true);
    setIsProcessingAssessment(true);

    try {
      const organizationId = sessionStorage.getItem("organizationId") || "";
      const batchId = sessionStorage.getItem("batchId") || "";
      const assessmentResponse = await processPromptAndCallLLM({
        username,
        selectedPrompt: "assessmentPrompt",
        selectedModel: "gpt-4o",
        sessionHistory,
        userPrompt: "",
        selectedConcept,
        organizationId,
        batchId,
      });

      setLlmContent(assessmentResponse.apiResponseText);

      const assessmentPracticeEntry = {
        user: "",
        system: assessmentResponse.apiResponseText,
      };

      setPracticemodeHistory((prev) => {
        const finalHistory = [...prev, assessmentPracticeEntry];
        sessionStorage.setItem("practicemodeHistory", JSON.stringify(finalHistory));
        return finalHistory;
      });

      setSessionHistory((prev) => [
        ...prev,
        { Mentee: "", Mentor: assessmentResponse.apiResponseText },
      ]);

      setCurrentPracticeStatus("completed");
      setIsPracticeEnded(true);
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
    console.log("🔄 Restarting practice without saving");

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

      await fetchPracticeCounts();
    } catch (error) {
      console.error("❌ Error restarting practice:", error);
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
      const statusToSave = "completed";
      await handleSavePractice(statusToSave);

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

      await fetchPracticeCounts();
    } catch (error) {
      console.error("❌ Error saving and restarting practice:", error);
      toast.error("Failed to save and restart conversation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleSendClick = async () => {
    if (!prompt.trim() || !selectedConcept || isPracticeEnded) {
      if (isPracticeEnded) {
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
    console.log("🚀 handleSendClick: Setting isLoading to true");

    try {
      const userPrompt = prompt.trim();
      setPrompt("");
      const organizationId = sessionStorage.getItem("organizationId") || "";
      const batchId = sessionStorage.getItem("batchId") || "";

      const initialResponse = await processPromptAndCallLLM({
        username,
        selectedPrompt,
        selectedModel: "gpt-4o",
        sessionHistory,
        userPrompt: userPrompt,
        selectedConcept,
        organizationId,
        batchId,
      });

      console.log("📡 handleSendClick: Received initial LLM response:", initialResponse);

      let newApiCurrentStage = initialResponse.currentStage || 0;
      let newInteractionCompleted = initialResponse.interactionCompleted || false;
      let newEndRequested = initialResponse.endRequested || false;

      const newProgressStage = mapApiStageToProgressbarIndex(newApiCurrentStage, "inprogress", newInteractionCompleted);

      if (isFirstUserMessage || newProgressStage >= currentStage) {
        setCurrentStage(newProgressStage);
        setCurrentPracticeStatus("inprogress");
      }

      const newPracticeEntry = {
        user: userPrompt,
        system: initialResponse.apiResponseText,
      };

      let currentPracticeModeHistory = [];
      setPracticemodeHistory((prev) => {
        currentPracticeModeHistory = [...prev, newPracticeEntry];
        sessionStorage.setItem("practicemodeHistory", JSON.stringify(currentPracticeModeHistory));
        return currentPracticeModeHistory;
      });

      setSessionHistory((prev) => [
        ...prev,
        { Mentee: userPrompt, Mentor: initialResponse.apiResponseText },
      ]);

      if (newEndRequested || newInteractionCompleted) {
        console.log("🎯 handleSendClick: Triggering assessment due to", newInteractionCompleted ? "interactionCompleted" : "endRequested");
        setIsProcessingAssessment(true);
        const organizationId = sessionStorage.getItem("organizationId") || "";
        const batchId = sessionStorage.getItem("batchId") || "";
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
          batchId,
        });

        setLlmContent(assessmentResponse.apiResponseText);

        const assessmentPracticeEntry = {
          user: "",
          system: assessmentResponse.apiResponseText,
        };

        let finalPracticeModeHistory = [];
        setPracticemodeHistory((prev) => {
          finalPracticeModeHistory = [...prev, assessmentPracticeEntry];
          sessionStorage.setItem("practicemodeHistory", JSON.stringify(finalPracticeModeHistory));
          return finalPracticeModeHistory;
        });

        setSessionHistory((prev) => [
          ...prev,
          { Mentee: "", Mentor: assessmentResponse.apiResponseText },
        ]);
        console.log("📥 Assessment Response:", assessmentResponse.apiResponseText);

        setCurrentPracticeStatus("completed");

        if (newInteractionCompleted) {
          setEndReason("interactionCompleted");
        } else {
          setEndReason("endRequested");
        }

        setIsPracticeEnded(true);
        console.log("🔒 handleSendClick: Practice ended, input restricted");
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
    window.open(downloadLink, "_blank");
  };

  const getCurrentStageForAPI = (saveStatus) => {
    if (saveStatus === "not_started") {
      return 0;
    } else if (saveStatus === "inprogress" || saveStatus === "completed") {
      if (currentStage === 0) return 0;
      return Math.min(Math.max(currentStage - 1, 0), 5);
    }

    const frontendStatus = getStageStatus();
    if (frontendStatus === "not-started") return 0;
    if (currentStage === 7) return 5;
    return Math.min(Math.max(currentStage - 1, 0), 5);
  };

  const getFrontendStatusForSave = () => {
    if (isPracticeEnded) {
      return "completed";
    }

    if (currentStage === 0 && practicemodeHistory.length <= 1) {
      return "not_started";
    } else {
      return "inprogress";
    }
  };

  const handleSavePractice = async (requestedStatus = null, showLoader = true) => {
    if (!username) {
      toast.error("Cannot save practice: User not identified.");
      navigate("/login");
      return;
    }

    if (practicemodeHistory.length === 0) {
      toast.warn("No practice history to save.");
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
    const conceptNameToSave = selectedConcept?.concept_name || "";

    let scoring_data = null;
    if (statusToSave === "completed" && llmContent) {
      scoring_data = extractScoringData(llmContent);
      console.log("📊 Extracted scoring data for save:", scoring_data);
    }

    console.log("💾 Saving practice with:", {
      requestedStatus,
      statusToSave,
      stageToSave,
      currentStage,
      frontendStatus: getStageStatus(),
      currentPracticeStatus,
      practicemodeHistoryLength: practicemodeHistory.length,
      conceptName: conceptNameToSave,
      hasScoring: !!scoring_data,
    });

    if (showLoader) setIsLoading(true);

    try {
      let response;
      let actionMessage = "";

      const requestData = {
        conversation: practicemodeHistory,
        status: statusToSave,
        current_stage: stageToSave,
        concept_name: conceptNameToSave,
      };

      if (statusToSave === "completed" && scoring_data) {
        requestData.scoring_data = scoring_data;
      }

      if (currentPracticeId && sessionType === "resume") {
        response = await axios.put(
          `${BASE_URL}/practicemode/conversation/${currentPracticeId}`,
          requestData,
          { ...config, timeout: 10000 }
        );
        actionMessage = `Updated existing practice (ID: ${currentPracticeId})`;
      } else {
        response = await axios.post(
          `${BASE_URL}/practicemode`,
          {
            user_id: userId,
            ...requestData,
          },
          { ...config, timeout: 10000 }
        );
        actionMessage = "Created new practice";
      }

      setShowSaveOptions(false);

      console.log("✅ Practice saved successfully:", {
        status: statusToSave,
        stage: stageToSave,
        conceptName: conceptNameToSave,
        practiceId: response.data.data.id,
        hasScoring: !!response.data.data.scoring,
      });

      if (response.data.data.scoring) {
        console.log("📊 Scoring data saved:", {
          sixFacetsAverage: response.data.data.scoring.six_facets.average,
          skillsAverage: response.data.data.scoring.understanding_skills.average,
          finalScore: response.data.data.scoring.final_score,
        });
      }

      toast.success(`Practice saved as ${statusToSave}!`, {
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
        setCurrentPracticeId(null);
        setResumedFromStatus(null);
        setCurrentStage(0);
        setCurrentPracticeStatus(statusToSave);
      } else {
        const newPracticeId = response.data.data.id || currentPracticeId;
        setCurrentPracticeId(newPracticeId);
        setSessionType("resume");
        setResumedFromStatus(statusToSave);
        setCurrentPracticeStatus(statusToSave);
      }

      sessionStorage.setItem("practicemodeHistory", JSON.stringify(practicemodeHistory));
      await fetchPracticeCounts();
    } catch (error) {
      console.error("❌ Error saving practice:", error);
      if (error.response) {
        toast.error(`Failed to save practice: ${error.response.data.message || "Server error"}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        toast.error("Failed to save practice. Please check your connection and try again.", {
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

  const fetchPracticeCounts = async () => {
    if (!userId) {
      return;
    }

    setIsCountsLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/practicemode/counts/${userId}`, {
        ...config,
        timeout: 10000,
      });

      if (response.data?.success && response.data?.data?.counts) {
        setPracticeCounts(response.data.data.counts);
      } else {
        setPracticeCounts({ not_started: 0, inprogress: 0, completed: 0, archived: 0 });
      }
    } catch (error) {
      console.error("❌ Error loading practice counts:", error);
      setPracticeCounts({ not_started: 0, inprogress: 0, completed: 0, archived: 0 });
    } finally {
      setIsCountsLoading(false);
    }
  };

  const checkSessionStatus = async (conceptName = null) => {
    if (!username || !userId) {
      setIsInitializing(false);
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      let apiUrl = `${BASE_URL}/practicemode/session-status/${userId}`;
      if (conceptName) {
        apiUrl += `?concept_name=${encodeURIComponent(conceptName)}`;
      }

      const response = await axios.get(apiUrl, { ...config, timeout: 10000 });

      if (response.data?.success) {
        const { sessionType, hasActiveSession, shouldStartFresh, practice } = response.data.data;

        if (practice && practice.status === "completed") {
          console.log("🎯 Resumed session is completed, starting fresh conversation instead");
          clearSessionData();
          setCurrentPracticeStatus("not_started");

          const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
          if (currentConcepts.length > 0) {
            const conceptToUse = currentConcepts.find((c) => c.concept_name === practice.concept_name) || currentConcepts[0];
            setSelectedConcept(conceptToUse);
            await initiateFirstMentorMessageWithConcept(conceptToUse);
          }
          return;
        }

        if (sessionType === "resume" && hasActiveSession && practice && !shouldStartFresh) {
          console.log("🔄 Resuming existing session:", practice);

          setPracticemodeHistory(practice.conversation);

          const loadedSessionHistory = practice.conversation
            .filter((item) => item.user !== undefined && item.system !== undefined)
            .map((item) => ({ Mentee: item.user, Mentor: item.system }));
          setSessionHistory(loadedSessionHistory);

          setCurrentPracticeId(practice.id);
          setSessionType("resume");
          setResumedFromStatus(practice.status);
          setCurrentPracticeStatus(practice.status);

          const progressStage = mapApiStageToProgressbarIndex(practice.current_stage, practice.status, false);
          setCurrentStage(progressStage);

          console.log("✅ Session resumed with stage:", {
            apiStage: practice.current_stage,
            status: practice.status,
            progressStage: progressStage,
            conceptName: practice.concept_name,
          });

          sessionStorage.setItem("practicemodeHistory", JSON.stringify(practice.conversation));
          sessionStorage.setItem("currentPracticeId", practice.id.toString());
          sessionStorage.setItem("practicesessionType", "resume");

          if (practice.concept_name && concepts.length > 0) {
            const matchingConcept = concepts.find((c) => c.concept_name === practice.concept_name);
            if (matchingConcept) {
              setSelectedConcept(matchingConcept);
              console.log("✅ Concept restored from session:", matchingConcept.concept_name);
            } else if (conceptName) {
              const providedConcept = concepts.find((c) => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
              if (providedConcept) {
                setSelectedConcept(providedConcept);
                console.log("🔄 Using provided concept:", providedConcept.concept_name);
              }
            }
          } else if (conceptName && concepts.length > 0) {
            const providedConcept = concepts.find((c) => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
            if (providedConcept) {
              setSelectedConcept(providedConcept);
              console.log("🔄 Using provided concept for fresh session:", providedConcept.concept_name);
            }
          }
        } else {
          console.log("🆕 Starting fresh session");
          clearSessionData();
          setCurrentPracticeStatus("not_started");

          const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
          if (currentConcepts.length > 0) {
            let conceptToUse;

            if (conceptName) {
              conceptToUse = currentConcepts.find((c) => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
            }

            if (!conceptToUse) {
              conceptToUse = selectedConcept || currentConcepts.find((concept) => concept.is_active) || currentConcepts[0];
            }

            console.log("🚀 Auto-starting fresh conversation with concept:", conceptToUse.concept_name);
            setSelectedConcept(conceptToUse);
            await initiateFirstMentorMessageWithConcept(conceptToUse);
          }
        }
      } else {
        console.log("⚠️ No session data, starting fresh");
        clearSessionData();
        setCurrentPracticeStatus("not_started");

        const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
        if (currentConcepts.length > 0) {
          let conceptToUse;

          if (conceptName) {
            conceptToUse = currentConcepts.find((c) => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
          }

          if (!conceptToUse) {
            conceptToUse = selectedConcept || currentConcepts.find((concept) => concept.is_active) || currentConcepts[0];
          }

          console.log("🚀 Force-starting fresh conversation:", conceptToUse.concept_name);
          setSelectedConcept(conceptToUse);
          await initiateFirstMentorMessageWithConcept(conceptToUse);
        } else {
          console.error("❌ No concepts available for fresh conversation");
        }
      }

      await fetchPracticeCounts();
    } catch (error) {
      console.error("❌ Error checking session status:", error);
      clearSessionData();
      setCurrentPracticeStatus("not_started");

      const currentConcepts = concepts.length > 0 ? concepts : await fetchAndReturnConcepts();
      if (currentConcepts.length > 0) {
        let conceptToUse;

        if (conceptName) {
          conceptToUse = currentConcepts.find((c) => c.concept_name.toLowerCase().includes(conceptName.toLowerCase()));
        }

        if (!conceptToUse) {
          conceptToUse = selectedConcept || currentConcepts.find((concept) => concept.is_active) || currentConcepts[0];
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
      if (!isPracticeEnded) {
        handleSendClick();
      }
    }
  };

  const handleConceptSelect = async (concept) => {
    if (!concept) {
      toast.warn("No concept selected.");
      return;
    }
    if (isProcessingAssessment) {
      toast.warn("⚠️ Please wait, assessment is being processed.");
      return;
    }
    console.log("🎯 Concept selected:", concept.concept_name);
    setSelectedConcept(concept);
    setShowConceptDropdown(false);

    clearSessionData();
    setCurrentPracticeStatus("not_started");

    console.log("🔍 Checking session status for concept:", concept.concept_name);
    await checkSessionStatus(concept.concept_name);
  };

  const getStageStatus = () => {
    if (currentPracticeStatus === "completed") return "completed";
    if (currentPracticeStatus === "not_started") return "not-started";
    if (currentPracticeStatus === "inprogress") return "in-progress";

    if (currentStage === 0) return "not-started";
    if (currentStage === 7) return "completed";
    return "in-progress";
  };

  useEffect(() => {
    if (username && userId && !isInitializingRef.current) {
      isInitializingRef.current = true;
      setIsInitializing(true);
      const initializeSession = async () => {
        console.log("🚀 Starting session initialization");
        try {
          const currentConcepts = await fetchAndReturnConcepts();
          if (currentConcepts.length > 0) {
            const initialConcept = currentConcepts.find((concept) => concept.is_active) || currentConcepts[0];
            console.log("🎯 Initial concept for session check:", initialConcept.concept_name);
            setSelectedConcept(initialConcept);
            await checkSessionStatus(initialConcept.concept_name);
          } else {
            console.log("⚠️ No concepts available, checking session without concept_name");
            await checkSessionStatus();
          }
        } catch (error) {
          console.error("❌ Error during session initialization:", error);
          toast.error("Failed to initialize session. Please try again.");
        } finally {
          setIsInitializing(false);
          isInitializingRef.current = false;
        }
      };

      initializeSession();
    } else if (!username || !userId) {
      navigate("/login");
    }
  }, [username, userId, navigate]);

  useEffect(() => {
    if (practiceEndRef.current) {
      practiceEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [practicemodeHistory]);

  useEffect(() => {
    if (!isInitializing && !practicemodeHistory.length) {
      const savedSessionType = sessionStorage.getItem("practicesessionType");

      if (savedSessionType === "completed") {
        clearSessionData();
        return;
      }

      const savedHistory = sessionStorage.getItem("practicemodeHistory");
      const savedPracticeId = sessionStorage.getItem("currentPracticeId");

      if (savedHistory && savedSessionType === "resume") {
        try {
          const parsedHistory = JSON.parse(savedHistory);
          if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            setPracticemodeHistory(parsedHistory);

            if (savedPracticeId) {
              setCurrentPracticeId(parseInt(savedPracticeId));
              setSessionType("resume");

              if (parsedHistory.length > 1) {
                setCurrentStage(1);
              } else {
                setCurrentStage(0);
              }
            }
          }
        } catch (error) {
          console.error("❌ Error parsing saved practice history:", error);
          clearSessionData();
        }
      }
    }
  }, [isInitializing, practicemodeHistory.length]);

  const debouncedSavePractice = useCallback(
    debounce(async () => {
      if (!isLoading && !isInitializing && practicemodeHistory.length > 0 && selectedConcept) {
        setIsLoading(true);
        try {
          const statusToSave = getFrontendStatusForSave();
          const stageToSave = getCurrentStageForAPI(statusToSave);
          const conceptNameToSave = selectedConcept?.concept_name || "";

          const requestData = {
            conversation: practicemodeHistory,
            status: statusToSave,
            current_stage: stageToSave,
            concept_name: conceptNameToSave,
          };

          if (statusToSave === "completed" && llmContent) {
            const scoring_data = extractScoringData(llmContent);
            if (scoring_data) {
              requestData.scoring_data = scoring_data;
              console.log("📊 Auto-save: Extracted scoring data:", scoring_data);
            }
          }

          let response;
          if (currentPracticeId) {
            response = await axios.put(
              `${BASE_URL}/practicemode/conversation/${currentPracticeId}`,
              requestData,
              { ...config, timeout: 10000 }
            );
            console.log(`✅ Auto-saved updated practice (ID: ${currentPracticeId})`);
          } else {
            response = await axios.post(
              `${BASE_URL}/practicemode`,
              {
                user_id: userId,
                ...requestData,
              },
              { ...config, timeout: 10000 }
            );
            const newPracticeId = response.data.data.id;
            setCurrentPracticeId(newPracticeId);
            sessionStorage.setItem("currentPracticeId", newPracticeId);
            console.log(`✅ Auto-saved new practice (ID: ${newPracticeId})`);
          }
        } catch (error) {
          console.error("❌ Auto-save failed:", error);
          toast.error("Auto-save failed. Please check your connection and try again.", {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        } finally {
          setIsLoading(false);
        }
      }
    }, 2000),
    [isLoading, isInitializing, practicemodeHistory, selectedConcept, userId, llmContent]
  );

  useEffect(() => {
    debouncedSavePractice();
    return () => {
      debouncedSavePractice.cancel();
    };
  }, [debouncedSavePractice]);

  return (
    <div className="learning-dashboard">
      <Sidebar isProcessingAssessment={isProcessingAssessment} />
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
              <p>You're about to start a new conversation. Would you like to save your current session before restarting?</p>
            </div>
            <div className="restart-dialog-actions">
              <button className="restart-btn save-and-restart" onClick={restartWithSaving} disabled={isLoading}>
                <FiSave /> Save & Restart
              </button>
              <button className="restart-btn restart-only" onClick={restartWithoutSaving} disabled={isLoading}>
                <FiRefreshCw /> Just Restart
              </button>
              <button className="restart-btn cancel" onClick={() => setShowRestartDialog(false)} disabled={isLoading}>
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
              <button className="restart-btn save-and-restart" onClick={handleEndSession} disabled={isLoading}>
                <FiCheckCircle /> Yes, End Session
              </button>
              <button className="restart-btn cancel" onClick={() => setShowEndSessionDialog(false)} disabled={isLoading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
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
                className={`concept-dropdown-trigger ${isProcessingAssessment || isLoading ? "disabled" : ""}`}
                onClick={() => !isProcessingAssessment && setShowConceptDropdown(!showConceptDropdown)}
              >
                <span className="concept-text">
                  {conceptsLoading
                    ? "Loading concepts..."
                    : selectedConcept?.concept_name
                    ? selectedConcept.concept_name
                    : concepts.length > 0
                    ? "Choose a concept to learn"
                    : "No concepts available"}
                </span>
                <FiChevronDown className={`dropdown-arrow ${showConceptDropdown ? "open" : ""}`} />
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
              <div className={`stage-card ${getStageStatus() === "not-started" ? "active" : ""}`}>
                <div className="stage-icon not-started">
                  <FiClock />
                </div>
                <div className="stage-content">
                  <h4>Not Started</h4>
                </div>
              </div>
              <div className={`stage-card ${getStageStatus() === "in-progress" ? "active" : ""} ${isTransitioning ? "transitioning" : ""}`}>
                <div className="stage-icon in-progress">
                  <FiPlay />
                </div>
                <div className="stage-content">
                  <div className="stage-header">
                    <h4>In Progress</h4>
                  </div>
                  {getStageStatus() === "in-progress" && (
                    <div className="stage-progress-content">
                      <div className={`substage-progress ${isTransitioning ? "fade-in" : ""}`}>
                        <div className="progress-info">
                          <span>
                            {currentStage <= 1
                              ? "Starting..."
                              : currentStage === 7
                              ? "Completed"
                              : `Stage ${currentStage - 1}/5`}
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
                              width: `${Math.round((Math.max(currentStage - 2, 0) / 5) * 100)}%`,
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
              <div className={`stage-card ${getStageStatus() === "completed" ? "active" : ""}`}>
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
                disabled={practicemodeHistory.length === 0 || isProcessingAssessment || currentPracticeStatus === "not_started"}
                data-tooltip="Save Progress"
              >
                <FiSave />
              </button>
              {showSaveOptions && (
                <div ref={topSaveOptionsRef} className="top-save-dropdown">
                  <button
                    className="top-save-option current"
                    onClick={() => !isProcessingAssessment && handleSavePractice()}
                    disabled={isProcessingAssessment || currentPracticeStatus === "not_started"}
                  >
                    <FiSave /> Save Current Progress
                  </button>
                </div>
              )}
            </div>
            <button
              className="top-action-btn top-download-btn"
              onClick={() => !isProcessingAssessment && handleDownloadPDF()}
              disabled={practicemodeHistory.length === 0 || isProcessingAssessment || currentPracticeStatus === "not_started"}
              data-tooltip="Export practice"
            >
              <FiDownload />
            </button>
          </div>
          <div className="chat-container">
            <div className="chat-messages" id="chat-history">
              {practicemodeHistory.length === 0 ? (
                <div className="chat-empty">
                  <div className="empty-icon">
                    <FiMessageCircle />
                  </div>
                  <h3>Ready to start learning?</h3>
                  <p>
                    {conceptsLoading
                      ? "Loading your concepts..."
                      : selectedConcept?.concept_name
                      ? "Your AI mentor is ready! Type a message to begin."
                      : concepts.length > 0
                      ? "Select a concept from the left panel and begin your AI-mentored journey!"
                      : "No concepts available. Please contact your administrator."}
                  </p>
                  {isInitializing && (
                    <div className="loading-indicator">
                      <div className="loading-spinner"></div>
                      <span>Initializing your learning session...</span>
                    </div>
                  )}
                </div>
              ) : (
                practicemodeHistory.map((item, index) => (
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
                          <AssessmentDisplay content={item.system} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isPracticeEnded && (
                <div className="chat-end-section">
                  <div className="chat-end-message">
                    <div className="end-content">
                      <h4>{endReason === "interactionCompleted" ? "🎉 Learning Session Complete!" : "⏸️ Session Ended with Assessment"}</h4>
                      <p className="end-action-hint">Ready to start a new learning session? Click the button below to begin fresh!</p>
                    </div>
                  </div>
                  <div className="restart-button-container">
                    <button className="restart-session-btn" onClick={handleRestartPractice} disabled={isLoading}>
                      <FiRefreshCw />
                      Start New Session
                    </button>
                  </div>
                </div>
              )}
              <div ref={practiceEndRef} />
            </div>
            <div className="chat-input-container">
              {isLoading && (
                <div className="loading-indicator">
                  <div className="loading-spinner"></div>
                  <span>{isProcessingAssessment ? "Please wait. We are calculating your score" : "AI is thinking..."}</span>
                </div>
              )}
              <div className="chat-input-wrapper">
                <textarea
                  className={`chat-input ${isPracticeEnded ? "disabled" : ""}`}
                  placeholder={
                    isPracticeEnded
                      ? "This conversation has ended. Please restart to begin a new session."
                      : isInitializing
                      ? "Initializing..."
                      : selectedConcept?.concept_name
                      ? "Ask your mentor anything..."
                      : conceptsLoading
                      ? "Loading concepts..."
                      : "Please select a concept first..."
                  }
                  value={prompt}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || !selectedConcept?.concept_name || isInitializing || isPracticeEnded}
                  rows="1"
                />
                <button
                  className="send-button"
                  onClick={handleSendClick}
                  disabled={!prompt.trim() || isLoading || !selectedConcept?.concept_name || isInitializing || isPracticeEnded}
                >
                  <FiSend />
                </button>
              </div>
              {isPracticeEnded && (
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

import axios from "axios";
import * as Sentry from "@sentry/react";

const BASE_URL =
  process.env.REACT_APP_API_LINK ||
  "https://nextgenlearn.api.magiqspark.ai/api";

export const processPromptAndCallLLM = async (
  {
    username,
    selectedPrompt,
    selectedModel,
    sessionHistory,
    userPrompt,
    selectedConcept,
    organizationId,
    batchId,
  },
  retries = 3,
  retryDelay = 2000
) => {
  try {
    Sentry.captureMessage("Starting LLM processPromptAndCallLLM", "info");
    Sentry.captureEvent({
      message: "LLM Request Inputs",
      level: "info",
      extra: {
        username,
        selectedPrompt,
        selectedModel,
        sessionHistoryLength: sessionHistory?.length,
        userPrompt,
        selectedConcept,
        organizationId,
        batchId,
      },
    });
    // Validate inputs
    if (
      !username ||
      !selectedPrompt ||
      !selectedModel ||
      !selectedConcept ||
      !organizationId ||
      !batchId
    ) {
      Sentry.captureMessage("Missing required fields for LLM request", "error");
      console.error("Missing required fields:", {
        username,
        selectedPrompt,
        selectedModel,
        sessionHistoryLength: sessionHistory?.length,
        userPrompt,
        selectedConcept,
        organizationId,
        batchId,
      });
      Sentry.captureException(new Error("Missing required fields for LLM request"));
      throw new Error("Missing required fields for LLM request");
    }

    // Get token
    const token = sessionStorage.getItem("token");
    if (!token) {
      Sentry.captureMessage("No authentication token found in sessionStorage", "error");
      console.error("No authentication token found in sessionStorage");
      throw new Error("Authentication token missing");
    }

    // Prepare request data
    const requestData = {
      username,
      selectedPrompt,
      selectedModel,
      sessionHistory,
      userPrompt,
      selectedConcept,
      organizationId,
      batchId,
    };
    
    // Log request for debugging
    
    console.log(
      `Sending request to /api/prompts/process (Prompt: ${selectedPrompt}):`,
      requestData
    );


    // Attempt request with retries
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(
          `${BASE_URL}/prompts/process`,
          requestData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              // "Cache-Control": "no-cache",
            },
            timeout: 150000, // 150-second timeout for long-running requests
          }
        );

        if (!response.data.success) {
          Sentry.captureMessage(
            `Backend processing failed for ${selectedPrompt}: ${response.data.message}`,
            "error"
          );
          throw new Error(response.data.message || "Backend processing failed");
        }

        console.log(
          `Received response for ${selectedPrompt}:`,
          response.data.data
        );
        return response.data.data;
      } catch (error) {
        console.error(
          `Attempt ${attempt} failed for ${selectedPrompt}:`,
          error
        );
        Sentry.captureException(error);
        lastError = error;
        if (attempt === retries) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * attempt)
        );
      }
    }
    throw lastError;
  } catch (error) {
    // Handle token expiration 
    // (401 Unauthorized)
    Sentry.captureException(error);
    if (error.response?.status === 401) {
      console.warn("Unauthorized request, redirecting to login");
      sessionStorage.removeItem("token");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
      return {
        apiResponseText: "Unauthorized. Please log in again.",
        interactionCompleted: false,
        endRequested: false,
        readyForNextStage: false,
        currentStage: 0,
        pauseRequested: false,
      };
    }

    // Handle timeout or network errors
    if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") {
      console.error(
        `Network/Timeout error for ${selectedPrompt}:`,
        error.message
      );
      return {
        apiResponseText: `Network error: Request timed out or failed to reach the server. Please try again later.`,
        interactionCompleted: false,
        endRequested: false,
        readyForNextStage: false,
        currentStage: 0,
        pauseRequested: false,
      };
    }

    // Handle other errors
    console.error(
      `Error in processPromptAndCallLLM for ${selectedPrompt}:`,
      error
    );
    Sentry.captureException(error);
    return {
      apiResponseText:
        error.response?.data?.message ||
        "An error occurred while processing your request. Please try again.",
      interactionCompleted: false,
      endRequested: false,
      readyForNextStage: false,
      currentStage: 0,
      pauseRequested: false,
    };
  }
};

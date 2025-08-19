import axios from "axios";

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
  retryDelay = 1000
) => {
  try {
    // Validate inputs
    if (
      !username ||
      !selectedPrompt ||
      !selectedModel ||
      !selectedConcept ||
      !organizationId ||
      !batchId
    ) {
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
      throw new Error("Missing required fields for LLM request");
    }

    // Get token
    const token = sessionStorage.getItem("token");
    if (!token) {
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
    console.log("Sending request to /api/prompts/process:", requestData);

    // Attempt request with retries
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(
          `${BASE_URL}/prompts/process`,
          requestData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            timeout: 180000, // 180-second timeout
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || "Backend processing failed");
        }

        console.log("Received response:", response.data.data);
        return response.data.data;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt === retries) {
          throw error; // Throw on final attempt
        }
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * attempt)
        );
      }
    }
  } catch (error) {
    // Handle token expiration (401 Unauthorized)
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

    // Handle CORS or network errors
    if (error.code === "ERR_NETWORK") {
      console.error("Network error:", error.message);
      return {
        apiResponseText:
          "Network error: Unable to reach the server. Please check your connection or try again later.",
        interactionCompleted: false,
        endRequested: false,
        readyForNextStage: false,
        currentStage: 0,
        pauseRequested: false,
      };
    }

    // Handle other errors
    console.error("Error in processPromptAndCallLLM:", error);
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

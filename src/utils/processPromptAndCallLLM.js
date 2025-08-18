import axios from "axios";

// Main function - calls backend endpoint
export const processPromptAndCallLLM = async ({
  username,
  selectedPrompt,
  selectedModel,
  sessionHistory,
  userPrompt,
  selectedConcept,
  organizationId,
  batchId,
}) => {
  const BASE_URL = process.env.REACT_APP_API_LINK;

  try {
    // Prepare data to send to backend
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

    // Call backend endpoint for prompt processing and LLM call
    const response = await axios.post(
      `${BASE_URL}/prompts/process`,
      requestData,
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Backend processing failed");
    }

    // Return the parsed response from backend
    return response.data.data;
  } catch (error) {
    // ✅ Handle token expiration (401 Unauthorized)
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem("token"); // Clear token
      setTimeout(() => {
        window.location.href = "/login"; // Redirect to login page
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

    console.error("Error in processPromptAndCallLLM:", error);
    return {
      apiResponseText: "An error occurred while processing your request. Please try again.",
      interactionCompleted: false,
      endRequested: false,
      readyForNextStage: false,
      currentStage: 0,
      pauseRequested: false,
    };
  }
};


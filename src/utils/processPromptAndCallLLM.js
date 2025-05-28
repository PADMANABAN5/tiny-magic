import axios from "axios";
import { callLLM } from "./callLLM";

export const processPromptAndCallLLM = async ({
  username,
  selectedPrompt,
  selectedModel,
  sessionHistory,
  userPrompt,
}) => {
  // Prepare the input based on whether this is the first message or not
  const isFirstMessage = sessionHistory.length === 0;
  const userInput = isFirstMessage
    ? userPrompt
    : [
        ...sessionHistory.map(
          (entry) => `Mentee: ${entry.Mentee}\nMentor: ${entry.Mentor}`
        ),
        `Mentee: ${userPrompt}`,
      ].join("\n");

  // Prepare the request body for the API
  const processRequestBody = {
    username,
    promptType: selectedPrompt,
    llmProvider: selectedModel,
    userInput,
  };

  // Get the system prompt and configuration from your backend
  const processResponse = await axios.post(
    `${process.env.REACT_APP_API_LINK}/templates/process`,
    processRequestBody
  );

  const { messages, llmConfig } = processResponse.data;
  
  // Call the LLM with the prepared messages
  const llmResponse = await callLLM(selectedModel, llmConfig, messages);

  // Default response structure in case parsing fails
  let parsedResponse = {
    apiResponseText: "The LLM did not return a valid response. Please try again.",
    interactionCompleted: false,
    endRequested: false,
    readyForNextStage: false,
    currentStage: 0,
    pauseRequested: false,
  };

  // Special handling for assessment prompt which doesn't return JSON
  if (selectedPrompt === 'assessmentPrompt') {
    parsedResponse.apiResponseText = llmResponse;
    return parsedResponse;
  }
  
  // For concept mentor and other JSON-returning prompts
  try {
    // Method 1: Direct JSON parsing (clean JSON response)
    try {
      const parsed = JSON.parse(llmResponse.trim());
      parsedResponse = {
        apiResponseText: parsed.userText || parsedResponse.apiResponseText,
        interactionCompleted: parsed.interactionCompleted || false,
        endRequested: parsed.endRequested || false,
        readyForNextStage: parsed.readyForNextStage || false,
        currentStage: parsed.currentStage || 0,
        pauseRequested: parsed.pauseRequested || false,
      };
      return parsedResponse;
    } catch (directJsonError) {
      console.warn("Direct JSON parsing failed, trying alternative methods...");
    }
    
    // Method 2: Extract JSON from code blocks
    const jsonBlockMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        const extractedJson = JSON.parse(jsonBlockMatch[1].trim());
        parsedResponse = {
          apiResponseText: extractedJson.userText || parsedResponse.apiResponseText,
          interactionCompleted: extractedJson.interactionCompleted || false,
          endRequested: extractedJson.endRequested || false,
          readyForNextStage: extractedJson.readyForNextStage || false,
          currentStage: extractedJson.currentStage || 0,
          pauseRequested: extractedJson.pauseRequested || false,
        };
        return parsedResponse;
      } catch (blockJsonError) {
        console.warn("JSON block extraction failed:", blockJsonError);
      }
    }
    
    // Method 3: Find any JSON-like structure in the response
    const jsonRegex = /\{[\s\S]*?"userText"[\s\S]*?\}/g;
    const potentialJsonMatches = llmResponse.match(jsonRegex);
    
    if (potentialJsonMatches) {
      // Try each potential JSON match
      for (const match of potentialJsonMatches) {
        try {
          const extractedJson = JSON.parse(match);
          if (extractedJson.userText) {
            parsedResponse = {
              apiResponseText: extractedJson.userText,
              interactionCompleted: extractedJson.interactionCompleted || false,
              endRequested: extractedJson.endRequested || false,
              readyForNextStage: extractedJson.readyForNextStage || false,
              currentStage: extractedJson.currentStage || 0,
              pauseRequested: extractedJson.pauseRequested || false,
            };
            return parsedResponse;
          }
        } catch (matchError) {
          // Continue to the next match if this one fails
          continue;
        }
      }
    }
    
    // Method 4: If all else fails, use the full text as the response
    console.warn("All JSON parsing methods failed, using raw text");
    parsedResponse.apiResponseText = llmResponse;
    return parsedResponse;
    
  } catch (err) {
    console.error("Error processing LLM response:", err);
    return parsedResponse;
  }
};
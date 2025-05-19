import axios from "axios";
import { callLLM } from "./callLLM";

export const processPromptAndCallLLM = async ({
  username,
  selectedPrompt,
  selectedModel,
  sessionHistory,
  userPrompt,
}) => {
  const isFirstMessage = sessionHistory.length === 0;
  const userInput = isFirstMessage
    ? userPrompt
    : [
        ...sessionHistory.map(
          (entry) =>
            `Mentee: ${entry.Mentee}\nMentor: ${entry.Mentor}`
        ),
        `Mentee: ${userPrompt}`,
      ].join("\n");

  const processRequestBody = {
    username,
    promptType: selectedPrompt,
    llmProvider: selectedModel,
    userInput,
  };

  const processResponse = await axios.post(
    `${process.env.REACT_APP_API_LINK}/processPrompt`,
    processRequestBody
  );

  const { messages, llmConfig } = processResponse.data;
  const llmResponse = await callLLM(selectedModel, llmConfig, messages);

  let parsedResponse = {
    apiResponseText: "No structured response from model.",
    interactionCompleted: false,
    endRequested: false,
  };

  try {
    // Log the raw LLM response for debugging
    console.log("Raw LLM Response:", llmResponse);

    // Handle different response formats based on prompt type
    if (selectedPrompt === 'assessmentPrompt') {
      // For assessment prompts, try to parse the JSON structure
      try {
        // First try to parse the entire response as JSON
        const parsed = JSON.parse(llmResponse);
        parsedResponse.apiResponseText = parsed.choices?.[0]?.message?.content || 
                                         "No structured assessment response from model.";
      } catch (jsonError) {
        // If that fails, try to extract JSON from the response
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/s); // Match across multiple lines
        
        if (jsonMatch) {
          try {
            const extractedJson = JSON.parse(jsonMatch[0]);
            parsedResponse.apiResponseText = extractedJson.choices?.[0]?.message?.content || 
                                             "No structured assessment content found.";
          } catch (innerError) {
            // If JSON parsing still fails, use the raw response
            console.warn("Failed to parse extracted JSON:", innerError);
            parsedResponse.apiResponseText = llmResponse;
          }
        } else {
          // If no JSON structure is found, use the raw response
          console.warn("No JSON structure found in assessment response");
          parsedResponse.apiResponseText = llmResponse;
        }
      }
    } else {
      // For conceptMentor and other prompt types
      try {
        // Try parsing as JSON to extract userText
        const parsed = JSON.parse(llmResponse);
        parsedResponse.apiResponseText = parsed.userText || parsedResponse.apiResponseText;
        parsedResponse.interactionCompleted = parsed.interactionCompleted || false;
        parsedResponse.endRequested = parsed.endRequested || false;
      } catch (jsonError) {
        // If not valid JSON, try to extract the JSON part
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/s);
        
        if (jsonMatch) {
          try {
            const extractedJson = JSON.parse(jsonMatch[0]);
            parsedResponse.apiResponseText = extractedJson.userText || parsedResponse.apiResponseText;
            parsedResponse.interactionCompleted = extractedJson.interactionCompleted || false;
            parsedResponse.endRequested = extractedJson.endRequested || false;
          } catch (innerError) {
            console.warn("Failed to parse extracted JSON:", innerError);
            // For non-assessment prompts, we still need structured data, so don't fallback to raw text
          }
        } else {
          console.warn("No JSON structure found in response");
        }
      }
    }
  } catch (err) {
    console.error("Error processing LLM response:", err);
  }

  // Important: For assessment prompts, ensure we're returning the full content
  if (selectedPrompt === 'assessmentPrompt' && parsedResponse.apiResponseText === "No structured response from model.") {
    // Last resort: if everything fails, return the raw response for assessment prompts
    parsedResponse.apiResponseText = llmResponse;
  }

  return parsedResponse;
};
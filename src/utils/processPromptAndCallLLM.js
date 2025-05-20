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
    apiResponseText: "The LLM did not return a valid response. Please try again.",
    interactionCompleted: false,
    endRequested: false,
  };

  try {  
    if (selectedPrompt === 'assessmentPrompt') { 
      parsedResponse.apiResponseText = llmResponse;
    } else { 
      try { 
        const parsed = JSON.parse(llmResponse);
        parsedResponse.apiResponseText = parsed.userText || parsedResponse.apiResponseText;
        parsedResponse.interactionCompleted = parsed.interactionCompleted || false;
        parsedResponse.endRequested = parsed.endRequested || false;
      } catch (jsonError) { 
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/s);

        if (jsonMatch) {
          try {
            const extractedJson = JSON.parse(jsonMatch[0]);
            parsedResponse.apiResponseText = extractedJson.userText || parsedResponse.apiResponseText;
            parsedResponse.interactionCompleted = extractedJson.interactionCompleted || false;
            parsedResponse.endRequested = extractedJson.endRequested || false;
          } catch (innerError) {
            console.warn("Failed to parse extracted JSON:", innerError); 
          }
        } else {
          console.warn("No JSON structure found in response");
        }
      }
    }
  } catch (err) {
    console.error("Error processing LLM response:", err);
  }

  return parsedResponse;
};

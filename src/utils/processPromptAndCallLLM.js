// Template processing function
const processTemplate = (templateContent, selectedConcept) => {
  if (!templateContent || !selectedConcept) {
    return templateContent;
  }

  let processedContent = templateContent;

  // Map API response fields to template variables
  const replacements = {
    '{{CONCEPT_NAME}}': selectedConcept.concept_name || '',
    '{{CONCEPT_CONTENT}}': selectedConcept.concept_content || '',
    '{{CONCEPT_ENDURING_UNDERSTANDINGS}}': selectedConcept.concept_enduring_understandings || '',
    '{{CONCEPT_ESSENTIAL_QUESTIONS}}': selectedConcept.concept_essential_questions || '',
    '{{CONCEPT_KNOWLEDGE_SKILLS}}': selectedConcept.concept_knowledge_skills || '',
    '{{STAGE_1_CONTENT}}': selectedConcept.stage_1_content || '',
    '{{STAGE_2_CONTENT}}': selectedConcept.stage_2_content || '',
    '{{STAGE_3_CONTENT}}': selectedConcept.stage_3_content || '',
    '{{STAGE_4_CONTENT}}': selectedConcept.stage_4_content || '',
    '{{STAGE_5_CONTENT}}': selectedConcept.stage_5_content || '',
    '{{CONCEPT_UNDERSTANDING_RUBRIC}}': selectedConcept.concept_understanding_rubric || '',
    '{{UNDERSTANDING_SKILLS_RUBRIC}}': selectedConcept.understanding_skills_rubric || '',
    '{{LEARNING_ASSESSMENT_DIMENSIONS}}': selectedConcept.learning_assessment_dimensions || ''
  };

  // Replace each template variable
  Object.entries(replacements).forEach(([placeholder, value]) => {
    processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
  });

  return processedContent;
};

const loadTemplate = async (templateName, organization_id, batch_id) => {
  if (!organization_id || !batch_id) {
    throw new Error(`Missing organization_id or batch_id for template: ${templateName}`);
  }

  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_LINK}/api/prompts/fallback?organization_id=${organization_id}&batch_id=${batch_id}`
    );

    if (!response.ok) {
      throw new Error(`Fallback API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // NEW: Extract from array
    const matchingPrompt = data?.data?.find(
      (item) => item.prompt_type === templateName
    );

    const template = matchingPrompt?.prompt_content;

    if (!template) {
      throw new Error(`Template content not found in fallback response for ${templateName}`);
    }

    return template;

  } catch (error) {
    console.error(`❌ Error loading template from fallback API for ${templateName}:`, error);
    throw error;
  }
};



// Integrated OpenAI GPT-4o API call function
const callOpenAI = async (messages, apiKey) => {
  if (!apiKey) {
  console.error("❌ No API key provided to callOpenAI");
  throw new Error("No API key provided. Please check your decryption or dashboard setup.");
}

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // Fixed to use GPT-4o
        messages,
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API Error:", response.status, errorText);
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const responseText = data?.choices?.[0]?.message?.content;

    if (!responseText) {
      throw new Error("No response content from OpenAI API");
    }
    return responseText;

  } catch (error) {
    console.error("❌ Error calling OpenAI API:", error);
    throw error;
  }
};

// Main function
export const processPromptAndCallLLM = async ({
  username,
  selectedPrompt,
  selectedModel,
  sessionHistory,
  userPrompt,
  selectedConcept,
  apiKey,
  organizationId, // ✅ add this
  batchId          // ✅ add this
}) => {

  try {
    // Load the appropriate template
   // Load the appropriate template using fallback API only
let templateContent;
try {
  console.log("📦 Loading template with", {
    selectedPrompt,
    organizationId,
    batchId
  });
  templateContent = await loadTemplate(
    selectedPrompt,
    organizationId,
    batchId
  );
} catch (templateError) {
  console.error('Template loading failed:', templateError);
  throw new Error(`Failed to load template for ${selectedPrompt}. Please ensure the fallback API is reachable.`);
}


    // Process template with selected concept data
    const processedSystemContent = processTemplate(templateContent, selectedConcept);

    // Prepare user input
    const isFirstMessage = sessionHistory.length === 0;
    const userInput = isFirstMessage
      ? userPrompt
      : [
        ...sessionHistory.map(
          (entry) => `Mentee: ${entry.Mentee}\nMentor: ${entry.Mentor}`
        ),
        `Mentee: ${userPrompt}`,
      ].join("\n");

    // Prepare messages for OpenAI API
    const messages = [
      {
        role: "system",
        content: processedSystemContent
      }
    ];

    // Add user message only if there's actual content
    if (userInput && userInput.trim()) {
      messages.push({
        role: "user",
        content: userInput.trim()
      });
    } else {
      // For initial message (empty userPrompt), add empty user message
      messages.push({
        role: "user",
        content: ""
      });
    }

    // Call OpenAI API directly
    const llmResponse = await callOpenAI(messages, apiKey);

    // Default response structure in case parsing fails
    let parsedResponse = {
      apiResponseText: "The LLM did not return a valid response. Please try again.",
      interactionCompleted: false,
      endRequested: false,
      readyForNextStage: false,
      currentStage: 0,
      pauseRequested: false,
    };

    if (selectedPrompt === 'assessmentPrompt') {
  console.log("📤 Assessment LLM raw response:", llmResponse); // Add this line
  parsedResponse.apiResponseText = llmResponse;
  return parsedResponse;
}
if (!llmResponse || llmResponse.trim() === "") {
  parsedResponse.apiResponseText = "⚠️ No assessment response was generated.";
}
    try {
      try {
        const parsed = JSON.parse(llmResponse.trim());
        if (parsed.userText) {
          parsedResponse = {
            apiResponseText: parsed.userText,
            interactionCompleted: parsed.interactionCompleted || false,
            endRequested: parsed.endRequested || false,
            readyForNextStage: parsed.readyForNextStage || false,
            currentStage: parsed.currentStage || 0,
            pauseRequested: parsed.pauseRequested || false,
          };
          return parsedResponse;
        }
      } catch (directJsonError) {
        console.warn("Direct JSON parsing failed, trying alternative methods...");
      }

      // Method 2: Extract JSON from code blocks
      const jsonBlockMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        try {
          const extractedJson = JSON.parse(jsonBlockMatch[1].trim());
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
            continue;
          }
        }
      }

      console.warn("⚠️ All JSON parsing methods failed, using raw text");
      parsedResponse.apiResponseText = llmResponse;
      return parsedResponse;

    } catch (err) {
      console.error("❌ Error processing LLM response:", err);
      return parsedResponse;
    }

  } catch (error) {
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

import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import "../styles/dashboard.css";
import { FiSend, FiDownload } from "react-icons/fi";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import axios from "axios";
import { callLLM } from "../utils/callLLM.js";
import { processPromptAndCallLLM } from "../utils/processPromptAndCallLLM";
const BASE_URL = process.env.REACT_APP_CHAT_SAVE_KEY;

function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);
  const model = sessionStorage.getItem("selectedModel");
  const [selectedModel, setSelectedModel] = useState(model);
  const [selectedPrompt, setSelectedPrompt] = useState("conceptMentor");
  const username = sessionStorage.getItem("username");
  const [llmContent, setLlmContent] = useState("");
  const [interactionCompleted, setInteractionCompleted] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isChecked, setIsChecked] = useState(false);
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(
    !sessionStorage.getItem(`apiKey_${username}`)
  );
  const [apiKey, setApiKey] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");

  const initiateFirstMentorMessage = async () => {
    if (
      sessionHistory.length === 0 &&
      selectedPrompt === "conceptMentor" &&
      selectedModel &&
      selectedModel !== "Choose a model"
    ) {
      setIsLoading(true);
      try {
        const response = await processPromptAndCallLLM({
          username,
          selectedPrompt: "conceptMentor",
          selectedModel,
          sessionHistory: [],
          userPrompt: "",
        });

        const mentorMessage = response.apiResponseText;

        setChatHistory([
          {
            user: "",
            system: mentorMessage,
          },
        ]);

        setSessionHistory([
          {
            Mentee: "",
            Mentor: mentorMessage,
          },
        ]);
      } catch (err) {
        console.error("Failed to load initial mentor message:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };
  const handleToggle = () => {
    const newChecked = !isChecked;
    setIsChecked(newChecked);
    if (newChecked) {
      navigate('/variables'); 
    }
  };
  const handleApiKeySubmit = async() => {
    if (apiKey.length < 10) {
      setApiKeyError("API Key must be at least 10 characters long");
      return;
    }

    const existingApiKeys = JSON.parse(sessionStorage.getItem("apiKeys") || "{}");

    const isKeyUsed = Object.entries(existingApiKeys).some(
      ([storedUsername, storedApiKey]) =>
        storedApiKey === apiKey && storedUsername !== username
    );

    if (isKeyUsed) {
      setApiKeyError("This API Key is already used by another user");
      return;
    }

    sessionStorage.setItem(`apiKey_${username}`, apiKey);

    existingApiKeys[username] = apiKey;
    sessionStorage.setItem("apiKeys", JSON.stringify(existingApiKeys));

    setShowApiKeyPopup(false);
    setApiKeyError("");
    await initiateFirstMentorMessage();
  };

  const handleDownloadPDF = () => {
    const chatDiv = document.getElementById("chat-history");
    if (!chatDiv) {
      console.error("Chat history div not found");
      return;
    }

    const originalHeight = chatDiv.style.maxHeight;
    const originalOverflow = chatDiv.style.overflowY;
    chatDiv.style.maxHeight = "none";
    chatDiv.style.overflowY = "visible";

    setTimeout(() => {
      html2canvas(chatDiv, { scale: 2, useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save("chat-history.pdf");
        chatDiv.style.maxHeight = originalHeight;
        chatDiv.style.overflowY = originalOverflow;
      });
    }, 100);
  };

  const handleInputChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleSendClick = async () => {
    if (
      !prompt.trim() ||
      !selectedPrompt ||
      selectedModel === "Choose a model"
    ) {
      alert("Please enter a prompt, select a prompt type, and choose a model.");
      return;
    }
    setIsLoading(true);
    try {
      const initialResponse = await processPromptAndCallLLM({
        username,
        selectedPrompt,
        selectedModel,
        sessionHistory,
        userPrompt: prompt,
      });

      setChatHistory((prev) => {
        const updatedHistory = [
          ...prev,
          { user: prompt, system: initialResponse.apiResponseText },
        ];
        sessionStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
        return updatedHistory;
      });

      setSessionHistory((prev) => [
        ...prev,
        { Mentee: prompt, Mentor: initialResponse.apiResponseText },
      ]);

      if (
        initialResponse.endRequested ||
        initialResponse.interactionCompleted
      ) {
        const assessmentResponse = await processPromptAndCallLLM({
          username,
          selectedPrompt: "assessmentPrompt",
          selectedModel,
          sessionHistory: [
            ...sessionHistory,
            { Mentee: prompt, Mentor: initialResponse.apiResponseText },
          ],
          userPrompt: prompt,
        });

        setLlmContent(assessmentResponse.apiResponseText);
        setInteractionCompleted(initialResponse.interactionCompleted);

       /* setChatHistory((prev) => {
          const updatedHistory = [
            ...prev,
            { user: prompt, system: assessmentResponse.apiResponseText },
          ];
          const savePayload = {
            username,
            model: selectedModel,
            timestamp: new Date().toISOString(),
            chatHistory: updatedHistory,
          };

          axios
            .post(`${BASE_URL}/api/saveChatHistory`, savePayload)
            .then(() => console.log("Chat history saved"))
            .catch((err) => console.error("Failed to save chat history:", err));

          return updatedHistory;
        });*/
        setChatHistory((prev) => {
        const updatedHistory = [
          ...prev,
          { user: prompt, system: assessmentResponse.apiResponseText },
        ];
        sessionStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
        return updatedHistory;
      });

        setSessionHistory((prev) => [
          ...prev,
          { Mentee: prompt, Mentor: assessmentResponse.apiResponseText },
        ]);

        setSelectedPrompt("conceptMentor");
      }

      setPrompt("");
    } catch (error) {
      setIsLoading(false);
      console.error("Error in API request:", error);
      setInteractionCompleted(false);
      alert("Failed to process request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendClick();
    }
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/loadChat/${username}`);
        setChatHistory(response.data.chatHistory || []);
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };

    if (username && sessionStorage.getItem(`apiKey_${username}`)) {
      fetchChatHistory();
    }
  }, [username]);
  useEffect(() => {
  const savedChatHistory = sessionStorage.getItem("chatHistory");
  if (savedChatHistory) {
    setChatHistory(JSON.parse(savedChatHistory));
  }
}, []);


  // Improved JSON parsing function that handles different formats
  const extractScoringData = (content) => {
    try {
      // First, try to find JSON structure within ```json ... ``` block
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // If that fails, look for a JSON object anywhere in the content
      const possibleJson = content.match(/\{[\s\S]*"OverallScore"[\s\S]*\}/);
      if (possibleJson) {
        return JSON.parse(possibleJson[0]);
      }
      
      // If all parsing attempts fail, return empty object
      return {};
    } catch (e) {
      console.error("Error parsing scoring JSON:", e);
      return {};
    }
  };

  const renderScoringTable = (content) => {
    const scoringData = extractScoringData(content);
    
    return Object.keys(scoringData)
      .filter((key) => key !== "OverallScore" && key !== "EvaluationSummary")
      .map((key) => (
        <tr key={key}>
          <td>{key}</td>
          <td>{scoringData[key].score}</td>
          <td>{scoringData[key].evidence}</td>
        </tr>
      ));
  };

  const renderOverallScoreAndSummary = (content) => {
    const scoringData = extractScoringData(content);
    
    const overallScore = scoringData.OverallScore || "N/A";
    const evaluationSummary = scoringData.EvaluationSummary || "N/A";

    return (
      <div className="my-3">
        <div>
          <strong>Overall Score:</strong> {overallScore}
        </div>
        <div>
          <strong>Evaluation Summary:</strong> {evaluationSummary}
        </div>
      </div>
    );
  };

  const parseAssessmentContent = (content) => {
    // Extract the assessment content between Part 1 and Part 2
    const detailedAssessmentHeader = "### Part 1: Detailed Assessment";
    const deterministicScoringHeader = "### Part 2: Deterministic Scoring";
    
    const part1Index = content.indexOf(detailedAssessmentHeader);
    
    if (part1Index === -1) {
      // Try alternative format (without space)
      const altHeader = "### Part1: Detailed Assessment";
      const altPart1Index = content.indexOf(altHeader);
      
      if (altPart1Index === -1) {
        return content; // Return full content if headers not found
      }
      
      const assessmentStart = altPart1Index + altHeader.length;
      const part2Index = content.indexOf("### Part2: Deterministic Scoring");
      
      if (part2Index === -1) {
        return content.slice(assessmentStart).trim();
      }
      
      return content.slice(assessmentStart, part2Index).trim();
    }
    
    const assessmentStart = part1Index + detailedAssessmentHeader.length;
    const part2Index = content.indexOf(deterministicScoringHeader);
    
    if (part2Index === -1) {
      return content.slice(assessmentStart).trim();
    }
    
    return content.slice(assessmentStart, part2Index).trim();
  };

  // Determine if content contains assessment data
  const hasAssessmentData = (content) => {
    return content && (
      content.includes("Detailed Assessment") && 
      content.includes("Deterministic Scoring")
    );
  };

  useEffect(() => { 
    if (
      username &&
      selectedModel &&
      sessionStorage.getItem(`apiKey_${username}`)
    ) {
      initiateFirstMentorMessage();
    }
  }, [selectedModel]);

  return (
    <div className="d-flex flex-column flex-md-row dashboard-container bg-light min-vh-100">
      {showApiKeyPopup && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" >Enter API Key</h5>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                {apiKeyError && (
                  <div className="text-danger mt-2">{apiKeyError}</div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={handleApiKeySubmit}
                  disabled={apiKey.length < 10}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
       
      <Sidebar />
      <div className="flex-grow-1 p-4 d-flex flex-column position-relative dashboard-content">
        <div className="mt-5">
          <h5 className="text-primary">
            <span style={{ color: "black" }}>Model : </span>
            {selectedModel}
          </h5>
        </div>
        {/* {prompt === '' && (
        <div className="form-check form-switch m-3" style={{ marginRight: "10%" }}>
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleSwitch"
          checked={isChecked}
          onChange={handleToggle}
          style={{
          width: '3rem',
          height: '1.5rem',
          backgroundColor: isChecked ? '#0d6efd' : '#dee2e6',
          borderColor: isChecked ? '#0d6efd' : '#ced4da',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        />
        <label className="form-check-label" style={{ marginLeft: "5px", marginTop: "3px" }} htmlFor="toggleSwitch">
          change variables
        </label>
      </div>
        )} */}
        <div
          id="chat-history"
          className="chat-history flex-grow-1 overflow-auto p-3 border rounded shadow-sm bg-white"
          style={{ maxHeight: "60vh" }}
        >
          {chatHistory.map((item, index) => (
            <div key={index}>
              {item.user && (
                <div className="d-flex justify-content-end mb-2">
                  <div
                    className="alert alert-primary"
                    style={{
                      maxWidth: "100%",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <strong>You:</strong> {item.user}
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-start mb-3">
                <div
                  className="alert alert-secondary"
                  style={{
                    maxWidth: "100%",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {hasAssessmentData(item.system) ? (
                    <div>
                      <h5>{selectedModel}:</h5>
                      <h5>Detailed Assessment:</h5>
                      <p>{parseAssessmentContent(item.system)}</p>
                      <h5>Deterministic Scoring:</h5>
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th style={{ whiteSpace: 'nowrap' }}>Category</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Score</th>
                            <th style={{ whiteSpace: 'nowrap' }}>Evidence</th>
                          </tr>
                        </thead>
                        <tbody>{renderScoringTable(item.system)}</tbody>
                      </table>
                      {renderOverallScoreAndSummary(item.system)}
                    </div>
                  ) : (
                    <div>
                      <strong>{selectedModel}:</strong> {item.system}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="input-area-container mt-4 shadow-sm position-relative">
          {isLoading && (
            <div className="d-flex justify-content-center my-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          <textarea
            className="form-control rounded"
            placeholder="Type your prompt..."
            rows="2"
            style={{ resize: "none", paddingRight: "50px" }}
            value={prompt}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={showApiKeyPopup}
          />
          <button
            className="btn btn-primary position-absolute end-0 bottom-0 m-2"
            onClick={handleSendClick}
            disabled={!prompt.trim() || showApiKeyPopup}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              padding: 0,
            }}
          >
            <FiSend size={20} />
          </button>
        </div>
        {interactionCompleted && (
          <button
            className="btn btn-outline-dark position-fixed"
            style={{ top: "10%", right: "5%", width: "50px" }}
            onClick={handleDownloadPDF}
            disabled={showApiKeyPopup}
          >
            <FiDownload />
          </button>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
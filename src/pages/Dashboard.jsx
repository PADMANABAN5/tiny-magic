import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import "../styles/dashboard.css";
import { FiSend, FiDownload } from "react-icons/fi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";
import { callLLM } from "../utils/callLLM.js";
import { processPromptAndCallLLM } from "../utils/processPromptAndCallLLM";
const BASE_URL = process.env.REACT_APP_CHAT_SAVE_KEY;
function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);
  const model = localStorage.getItem("selectedModel");
  const [selectedModel, setSelectedModel] = useState(model);
  const [selectedPrompt, setSelectedPrompt] = useState("conceptMentor");
  const username = localStorage.getItem("username");
  const [llmContent, setLlmContent] = useState("");
  const [interactionCompleted, setInteractionCompleted] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(
    !localStorage.getItem(`apiKey_${username}`)
  );
  const [apiKey, setApiKey] = useState("");
  const [apiKeyError, setApiKeyError] = useState("");

  const handleApiKeySubmit = () => {
    if (apiKey.length < 10) {
      setApiKeyError("API Key must be at least 10 characters long");
      return;
    }

    const existingApiKeys = JSON.parse(localStorage.getItem("apiKeys") || "{}");

    const isKeyUsed = Object.entries(existingApiKeys).some(
      ([storedUsername, storedApiKey]) =>
        storedApiKey === apiKey && storedUsername !== username
    );

    if (isKeyUsed) {
      setApiKeyError("This API Key is already used by another user");
      return;
    }

    localStorage.setItem(`apiKey_${username}`, apiKey);

    existingApiKeys[username] = apiKey;
    localStorage.setItem("apiKeys", JSON.stringify(existingApiKeys));

    setShowApiKeyPopup(false);
    setApiKeyError("");
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
        localStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
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

        setChatHistory((prev) => {
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

    if (username && localStorage.getItem(`apiKey_${username}`)) {
      fetchChatHistory();
    }
  }, [username]);

  const renderScoringTable = (content) => {
    const scoringStart = content.indexOf("```json") + "```json".length;
    const scoringEnd = content.indexOf("```", scoringStart);

    const scoringJson = content.slice(scoringStart, scoringEnd).trim();
    let scoringData = {};

    try {
      scoringData = JSON.parse(scoringJson);
    } catch (e) {
      console.error("Error parsing scoring JSON:", e);
    }

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
    const overallScoreMatch = content.match(/"OverallScore":\s*(\d+)/);
    const evaluationSummaryMatch = content.match(
      /"EvaluationSummary":\s*"([^"]+)"/
    );

    const overallScore = overallScoreMatch ? overallScoreMatch[1] : "N/A";
    const evaluationSummary = evaluationSummaryMatch
      ? evaluationSummaryMatch[1]
      : "N/A";

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
    const assessmentStart =
      content.indexOf("### Part 1: Detailed Assessment") +
      "### Part 1: Detailed Assessment".length;
    const assessmentEnd = content.indexOf("### Part 2: Deterministic Scoring");
    return content.slice(assessmentStart, assessmentEnd).trim();
  };

  useEffect(() => {
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

    if (
      username &&
      selectedModel &&
      localStorage.getItem(`apiKey_${username}`)
    ) {
      initiateFirstMentorMessage();
    }
  }, [username, selectedModel]);

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
                <h5 className="modal-title">Enter API Key</h5>
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
      <div className="flex-grow-1 p-4 d-flex flex-column position-relative">
        <div className="mb-3 mt-5">
          <h5 className="text-primary">
            <span style={{ color: "black" }}>Model : </span>
            {selectedModel}
          </h5>
        </div>
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
                  {item.system &&
                  item.system.includes("### Part 1: Detailed Assessment") ? (
                    <div>
                      <h5>Detailed Assessment:</h5>
                      <p>{parseAssessmentContent(item.system)}</p>
                      <h5>Deterministic Scoring:</h5>
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Score</th>
                            <th>Evidence</th>
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

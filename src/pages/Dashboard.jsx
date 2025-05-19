import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import "../styles/dashboard.css";
import { FiSend, FiDownload } from "react-icons/fi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";
import { callLLM } from "../utils/callLLM.js";

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
      html2canvas(chatDiv).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("chat-history.pdf");
        chatDiv.style.maxHeight = originalHeight;
        chatDiv.style.overflowY = originalOverflow;
      });
    }, 100);
  };

  const handleInputChange = (event) => {
    setPrompt(event.target.value);
  };
  const [sessionHistory, setSessionHistory] = useState([]);
  const handleSendClick = async () => {
    if (
      !prompt.trim() ||
      !selectedPrompt ||
      selectedModel === "Choose a model"
    ) {
      alert("Please enter a prompt, select a prompt type, and choose a model.");
      return;
    }
    const isFirstMessage = sessionHistory.length === 0;
    const userInput = isFirstMessage
      ? prompt
      : [
          ...sessionHistory.map(
            (entry) =>
              `userText: ${entry.userText}\napiResponse: ${entry.apiResponse}`
          ),
          `userText: ${prompt}`,
        ].join("\n");

    const processRequestBody = {
      username,
      promptType: selectedPrompt,
      llmProvider: selectedModel,
      userInput,
    };

    try {
      const processResponse = await axios.post(
        `${process.env.REACT_APP_API_LINK}/processPrompt`,
        processRequestBody
      );

      const { messages, llmConfig } = processResponse.data;
      const llmResponse = await callLLM(selectedModel, llmConfig, messages);
      let apiResponseText = "No structured response from model.";

      try {
        const jsonStartIndex = llmResponse.indexOf("{");
        if (jsonStartIndex !== -1) {
          const jsonString = llmResponse.slice(jsonStartIndex);
          const parsed = JSON.parse(jsonString);
          apiResponseText = parsed.userText || apiResponseText;

          if (parsed.currentStage === 5) {
            setSelectedPrompt("assessmentPrompt");
          }

          setInteractionCompleted(parsed.interactionCompleted === true);
          // if (parsed.interactionCompleted === true) {
          //   setSelectedPrompt("conceptMentor");
          // }
        } else {
          console.warn(
            "JSON not found in llmResponse, hiding button:",
            llmResponse
          );
          setInteractionCompleted(false);
        }
      } catch (err) {
        console.error("Failed to parse llmResponse JSON, hiding button:", err);
        setInteractionCompleted(false);
      }
      setChatHistory((prev) => {
        const updatedHistory = [
          ...prev,
          { user: prompt, system: apiResponseText },
        ];
        localStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
        return updatedHistory;
      });

      setSessionHistory((prev) => [
        ...prev,
        { userText: prompt, apiResponse: apiResponseText },
      ]);

      setPrompt("");
    } catch (error) {
      console.error("Error in API request:", error);
      alert("Failed to process request. Please try again.");
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
    const savedChatHistory = localStorage.getItem("chatHistory");
    if (savedChatHistory) {
      setChatHistory(JSON.parse(savedChatHistory));
    }
  }, []);

  return (
    <div className="d-flex flex-column flex-md-row dashboard-container bg-light min-vh-100">
      <Sidebar />
      <div className="flex-grow-1 p-4 d-flex flex-column position-relative">
        <div className="mb-4 mt-5">
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
              {/* System Message */}
              <div className="d-flex justify-content-start mb-3">
                <div
                  className="alert alert-secondary"
                  style={{
                    maxWidth: "100%",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <strong>{selectedModel}:</strong> {item.system}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="input-area-container mt-4 shadow-sm position-relative">
          <textarea
            className="form-control rounded"
            placeholder="Type your prompt..."
            rows="2"
            style={{ resize: "none", paddingRight: "50px" }}
            value={prompt}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
          <button
            className="btn btn-primary position-absolute end-0 bottom-0 m-2"
            onClick={handleSendClick}
            disabled={!prompt.trim()}
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
          >
            <FiDownload />
          </button>
        )}
      </div>
    </div>
  );
}
export default Dashboard;

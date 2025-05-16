import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import "../styles/dashboard.css"; // Make sure you have this file
import TopRightDropdown from "../components/Toprightcorner.jsx";
import { FiSend, FiDownload } from "react-icons/fi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";

function Dashboard() {
 const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const location = useLocation();
  const chatEndRef = useRef(null);
  
  
  const storedPrompt = localStorage.getItem("selectedPrompt") || "";
  const storedModel = localStorage.getItem("selectedModel") || "Choose a model";

  const [selectedModel, setSelectedModel] = useState(
    location.state?.selectedModel || storedModel
  );
  const [selectedPrompt, setSelectedPrompt] = useState(storedPrompt);

  useEffect(() => {
    if (selectedModel && selectedModel !== "Choose a model") {
      localStorage.setItem("selectedModel", selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    if (selectedPrompt) {
      localStorage.setItem("selectedPrompt", selectedPrompt);
    }
  }, [selectedPrompt]);

  const handleDownloadPDF = () => {
    const chatDiv = document.getElementById("chat-history");

    if (!chatDiv) {
      console.error("Chat history div not found");
      return;
    }

    // Store original styles
    const originalHeight = chatDiv.style.maxHeight;
    const originalOverflow = chatDiv.style.overflowY;

    // Temporarily expand to fit all content
    chatDiv.style.maxHeight = "none";
    chatDiv.style.overflowY = "visible";

    // Give the browser a moment to reflow layout
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

  const handleSendClick = async () => {
    if (
      !prompt.trim() ||
      !selectedPrompt ||
      selectedModel === "Choose a model"
    ) {
      alert("Please enter a prompt, select a prompt type, and choose a model.");
      return;
    }

    const username = "Jhon Deo";
    const processRequestBody = {
      username,
      promptType: selectedPrompt,
      llmProvider: selectedModel,
      userInput: prompt,
    };

    try {
     
      const processResponse = await axios.post(
        "https://tinymagicapp.onrender.com/api/processPrompt",
        processRequestBody
      );

      const conversation = processResponse.data.messages;
      const systemMessage = conversation.find((msg) => msg.role === "system");
      const systemResponse = systemMessage
        ? systemMessage.content
        : "No system message";

      setChatHistory((prev) => [
        ...prev,
        { user: prompt, system: systemResponse },
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

  return (
    <div className="d-flex flex-column flex-md-row dashboard-container bg-light min-vh-100">
      <Sidebar />
      <div className="flex-grow-1 p-4 d-flex flex-column position-relative">
        <div className="position-absolute top-0 end-0 p-3">
          <TopRightDropdown onPromptSelect={setSelectedPrompt} />
        </div>

        <div className="mb-4 mt-5">
          <h5 className="text-primary">Model: {selectedModel}</h5>
          <h6 className="text-secondary">Prompt: {selectedPrompt || "None"}</h6>
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
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", padding: 0 }} 
          >
            <FiSend size={20} />
          </button>
        </div>

        <button
          className="btn btn-outline-dark position-fixed"
          style={{ top: "13%", right: "5%", width: "50px" }} 
          onClick={handleDownloadPDF}
        >
          <FiDownload /> 
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
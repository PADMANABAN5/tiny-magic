import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import "../styles/dashboard.css";
import TopRightDropdown from "../components/Toprightcorner.jsx";
import { FiSend } from "react-icons/fi";
import { FiDownload } from "react-icons/fi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import axios from "axios";

function Dashboard() {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const location = useLocation();
  const chatEndRef = useRef(null);
  const initialModel = location.state?.selectedModel || "Choose a model";
  const [selectedModel, setSelectedModel] = useState(initialModel);
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

      // Restore original styles
      chatDiv.style.maxHeight = originalHeight;
      chatDiv.style.overflowY = originalOverflow;
    });
  }, 100);
};

  const handleInputChange = (event) => {
    setPrompt(event.target.value);
  };

  const handleSendClick = () => {
    if (!prompt.trim()) return;

    const requestBody = {
      systemContent: "Hi",
      promptText: prompt,
      llmProvider: selectedModel,
    };
    // API Integration
    axios
      .post("https://tinymagicapp.onrender.com/api/reviewapi", requestBody)
      .then((response) => {
        const conversation = response.data;
        const systemMessage = conversation.find((msg) => msg.role === "system");
        const systemResponse = systemMessage
          ? systemMessage.content
          : "No system message";
        setChatHistory((prev) => [
          ...prev,
          { user: prompt, system: systemResponse },
        ]);
        setPrompt("");
      })
      .catch((error) => {
        console.error("Error making API request:", error);
      });
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
    <div className="d-flex flex-column flex-md-row dashboard-container position-relative">
      <Sidebar />
      <div
        className="flex-grow-1 dashboard-content position-relative"
        style={{ padding: "20px", height: "100vh", overflowY: "auto" }}
      >
        <div className="position-absolute top-0 end-0 m-3">
          <TopRightDropdown onModelSelect={setSelectedModel} />
        </div>

        <div className="mt-5 pt-5">
          <p className="text-muted">
            Selected Model: <strong>{selectedModel}</strong>
          </p>

          <div
          id="chat-history"
            className="chat-history mt-4 d-flex flex-column gap-3 p-2 border rounded"
            style={{
              maxHeight: "60vh",
              overflowY: "auto",
              backgroundColor: "transparent",
            }}
          >
            {chatHistory.map((item, index) => (
              <div key={index}>
                <div className="d-flex justify-content-end">
                  <div
                    className="alert alert-primary mb-1"
                    style={{ maxWidth: "70%" }}
                  >
                    <strong>You:</strong> {item.user}
                  </div>
                </div>
                <div className="d-flex justify-content-start">
                  <div
                    className="alert alert-secondary"
                    style={{ maxWidth: "70%" }}
                  >
                    <strong>{selectedModel} :</strong> {item.system}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
    <div className="position-fixed bottom-13 end-1 m-4">
      <button className="btn btn-outline-secondary" onClick={handleDownloadPDF}>
      <FiDownload size={20} className="me-2"  style={{position:"relative",left:"3px",color:"white"}}/>
    </button>
    </div>
        <div className="d-flex align-items-start gap-2 prompt-input-group mt-4">
          <textarea
            className="form-control"
            placeholder="Enter your prompt here..."
            rows="1"
            value={prompt}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          ></textarea>

          <button
            className="btn btn-primary d-flex align-items-center justify-content-center"
            type="button"
            onClick={handleSendClick}
            disabled={!prompt.trim()}
            style={{ height: "100%", width: "60px" }}
          >
            <FiSend size={20} />
          </button>
          
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import "../styles/dashboard.css";
import { FiSend, FiDownload, FiSave } from "react-icons/fi";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import axios from "axios";
import { callLLM } from "../utils/callLLM.js";
import { processPromptAndCallLLM } from "../utils/processPromptAndCallLLM";

const BASE_URL = process.env.REACT_APP_BASE_URL; // Using environment variable

function Dashboard() {
    const [prompt, setPrompt] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const chatEndRef = useRef(null);
    const model = sessionStorage.getItem("selectedModel");
    const [selectedModel, setSelectedModel] = useState(model);
    const [selectedPrompt, setSelectedPrompt] = useState("conceptMentor");
    const username = sessionStorage.getItem("username");
    const [llmContent, setLlmContent] = useState("");
    const [sessionHistory, setSessionHistory] = useState([]);
    const [isChecked, setIsChecked] = useState(false);
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false); // For LLM interaction
    const [isCountsLoading, setIsCountsLoading] = useState(false); // For chat counts API
    const [showApiKeyPopup, setShowApiKeyPopup] = useState(
        !sessionStorage.getItem(`apiKey_${username}`)
    );
    const [apiKey, setApiKey] = useState("");
    const [apiKeyError, setApiKeyError] = useState("");
    const [showSaveOptions, setShowSaveOptions] = useState(false);

    // New state for chat counts
    const [chatCounts, setChatCounts] = useState({
        stopped: 0,
        paused: 0,
        completed: 0,
    });

    // This function is for initiating the first mentor message when no chat history is found.
    // It should NOT save to the backend automatically here, unless you want that first message to be saved by default.
    // Given your requirement, this will just set up the chat history in the frontend.
    const initiateFirstMentorMessage = async () => {
        if (
            sessionHistory.length === 0 &&
            selectedPrompt === "conceptMentor" &&
            selectedModel &&
            selectedModel !== "Choose a model" &&
            sessionStorage.getItem(`apiKey_${username}`)
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
                const updatedHistory = [
                    {
                        user: "",
                        system: mentorMessage,
                    },
                ];

                setChatHistory(updatedHistory);
                setSessionHistory([
                    {
                        Mentee: "",
                        Mentor: mentorMessage,
                    },
                ]);

                // REMOVED: await saveChatHistoryToBackend(updatedHistory, 'incomplete');
                // The first message is now only in frontend state until user clicks save.

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

    const handleApiKeySubmit = async () => {
        if (apiKey.length < 10) {
            setApiKeyError("API Key must be at least 10 characters long");
            return;
        }

        const existingApiKeys = JSON.parse(
            sessionStorage.getItem("apiKeys") || "{}"
        );

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
    };

    // --- MODIFIED handleDownloadPDF function ---
    const handleDownloadPDF = () => {
        const chatDiv = document.getElementById("chat-history");
        if (!chatDiv) {
            console.error("Chat history div not found");
            return;
        }

        // Store original styles and scroll position
        const originalMaxHeight = chatDiv.style.maxHeight;
        const originalOverflowY = chatDiv.style.overflowY;
        const originalScrollTop = chatDiv.scrollTop;
        const originalPosition = chatDiv.style.position;
        const originalTop = chatDiv.style.top;

        // Temporarily modify styles to ensure all content is rendered for html2canvas
        // Remove max-height and overflow-y to allow full content rendering
        chatDiv.style.maxHeight = "none";
        chatDiv.style.overflowY = "visible";

        // To ensure html2canvas captures everything without viewport cutting,
        // temporarily position the element at the top of the document flow
        // and remove its fixed height if it had one, letting it take its natural height.
        // This is crucial for capturing all content, even if it extends beyond the viewport.
        const parentOfChatDiv = chatDiv.parentElement;
        if (parentOfChatDiv) {
             // Temporarily remove parent's flex-grow or fixed height if it limits chatDiv
            parentOfChatDiv.style.flexGrow = '0'; // or adjust height property
        }
        
        chatDiv.style.position = "absolute";
        chatDiv.style.top = "0";
        chatDiv.style.width = "auto"; // Ensure it takes natural width too
        chatDiv.scrollTop = 0; // Ensure it starts from the top

        // Give the browser time to render the full content after style changes
        setTimeout(() => {
            html2canvas(chatDiv, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                // height: chatDiv.scrollHeight, // Explicitly tell html2canvas the full height
            }).then((canvas) => {
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF("p", "mm", "a4");

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                // Calculate image dimensions relative to PDF page width
                const imgWidth = pdfWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width; // Total image height based on canvas aspect ratio

                let currentHeight = 0;

                // Loop through and add pages until all content is rendered
                while (currentHeight < imgHeight) {
                    if (currentHeight > 0) {
                        pdf.addPage();
                    }
                    // Add the image segment. The Y-coordinate needs to be negative
                    // to simulate scrolling the captured image up on each new PDF page.
                    pdf.addImage(imgData, "PNG", 0, -currentHeight, imgWidth, imgHeight);
                    currentHeight += pdfHeight; // Move to the next page's starting point
                }

                pdf.save("chat-history.pdf");

                // Restore original styles of chatDiv
                chatDiv.style.maxHeight = originalMaxHeight;
                chatDiv.style.overflowY = originalOverflowY;
                chatDiv.style.position = originalPosition;
                chatDiv.style.top = originalTop;
                chatDiv.style.width = ""; // Reset width
                chatDiv.scrollTop = originalScrollTop; // Restore original scroll position

                if (parentOfChatDiv) {
                    parentOfChatDiv.style.flexGrow = ''; // Restore parent's flex-grow
                }

            }).catch(error => {
                console.error("html2canvas or PDF generation error:", error);
                alert("Failed to generate PDF. Please try again. Check console for details.");
                // Ensure styles are restored even on error
                chatDiv.style.maxHeight = originalMaxHeight;
                chatDiv.style.overflowY = originalOverflowY;
                chatDiv.style.position = originalPosition;
                chatDiv.style.top = originalTop;
                chatDiv.style.width = "";
                chatDiv.scrollTop = originalScrollTop;
                 if (parentOfChatDiv) {
                    parentOfChatDiv.style.flexGrow = '';
                }
            });
        }, 700); // Increased timeout slightly for safer rendering
    };
    // --- END MODIFIED handleDownloadPDF function ---

    const handleInputChange = (event) => {
        setPrompt(event.target.value);
    };

    // Helper function to save chat history to the backend (now ONLY called by manual save)
    const saveChatHistoryToBackend = async (historyToSave, status) => {
        if (!username) {
            console.warn("Cannot save chat history: Username not available.");
            return;
        }
        try {
            const savePayload = {
                user_id: username,
                conversation: historyToSave,
                status: status,
            };
            await axios.post(`${BASE_URL}/api/chat`, savePayload);
            console.log(`Chat history saved to backend with status: ${status}.`);
        } catch (err) {
            console.error("Failed to save chat history to backend:", err);
            alert("Failed to save chat history. Please try again.");
        }
    };

    // Function to handle saving chat with a specific status
    const handleSaveChat = async (status) => {
        if (!username) {
            alert("Cannot save chat: User not identified.");
            return;
        }
        if (chatHistory.length === 0) {
            alert("No chat history to save.");
            return;
        }
        setIsLoading(true); // Using general loading for save operation
        try {
            await saveChatHistoryToBackend(chatHistory, status);
            setShowSaveOptions(false); // Hide options after saving
            alert(`Chat saved as ${status}!`);
            // Refresh counts after saving
            fetchChatCounts();
        } catch (error) {
            console.error("Error saving chat:", error);
            alert("Failed to save chat. Please try again.");
        } finally {
            setIsLoading(false);
        }
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
        const userPrompt = prompt;
        setPrompt("");

        try {
            const initialResponse = await processPromptAndCallLLM({
                username,
                selectedPrompt,
                selectedModel,
                sessionHistory,
                userPrompt: userPrompt,
            });

            const newChatEntry = {
                user: userPrompt,
                system: initialResponse.apiResponseText,
            };

            let currentChatHistory = [];

            setChatHistory((prev) => {
                currentChatHistory = [...prev, newChatEntry];
                sessionStorage.setItem("chatHistory", JSON.stringify(currentChatHistory));
                return currentChatHistory;
            });

            setSessionHistory((prev) => [
                ...prev,
                { Mentee: userPrompt, Mentor: initialResponse.apiResponseText },
            ]);

            if (initialResponse.endRequested || initialResponse.interactionCompleted) {
                const assessmentResponse = await processPromptAndCallLLM({
                    username,
                    selectedPrompt: "assessmentPrompt",
                    selectedModel,
                    sessionHistory: [
                        ...sessionHistory,
                        { Mentee: userPrompt, Mentor: initialResponse.apiResponseText },
                    ],
                    userPrompt: userPrompt,
                });

                setLlmContent(assessmentResponse.apiResponseText);

                const assessmentChatEntry = {
                    user: "",
                    system: assessmentResponse.apiResponseText,
                };

                setChatHistory((prev) => {
                    const updatedHistory = [...prev, newChatEntry, assessmentChatEntry];
                    sessionStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
                    return updatedHistory;
                });

                setSessionHistory((prev) => [
                    ...prev,
                    { Mentee: userPrompt, Mentor: assessmentResponse.apiResponseText },
                ]);

                setSelectedPrompt("conceptMentor");
            }

        } catch (error) {
            setIsLoading(false);
            console.error("Error in API request:", error);
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

    // New function to fetch chat counts
    const fetchChatCounts = async () => {
        if (!username || !sessionStorage.getItem(`apiKey_${username}`)) {
            console.log("Not fetching chat counts: API key or username missing.");
            return;
        }
        setIsCountsLoading(true);
        try {
            const response = await axios.get(`${BASE_URL}/api/chat/counts/${username}`);
            if (response.data && response.data.counts) {
                setChatCounts(response.data.counts);
                console.log("Chat counts loaded:", response.data.counts);
            } else {
                console.log("No chat counts found for this user or unexpected response.");
                setChatCounts({ stopped: 0, paused: 0, completed: 0 });
            }
        } catch (error) {
            console.error("Error loading chat counts from backend:", error);
            setChatCounts({ stopped: 0, paused: 0, completed: 0 }); // Reset on error
        } finally {
            setIsCountsLoading(false);
        }
    };

    // Load chat history and chat counts from backend on component mount
    useEffect(() => {
        const fetchInitialData = async () => {
            if (!username || !sessionStorage.getItem(`apiKey_${username}`)) {
                console.log("Not fetching initial data: API key or username missing.");
                return;
            }
            setIsLoading(true); // General loading for initial data fetch
            try {
                // Fetch latest chat history
                const chatResponse = await axios.get(`${BASE_URL}/api/chat/latest/${username}`);
                if (chatResponse.data && chatResponse.data.chat && chatResponse.data.chat.conversation) {
                    setChatHistory(chatResponse.data.chat.conversation);
                    const loadedSessionHistory = chatResponse.data.chat.conversation
                        .filter(item => item.user !== undefined && item.system !== undefined)
                        .map(item => ({ Mentee: item.user, Mentor: item.system }));
                    setSessionHistory(loadedSessionHistory);
                    setShowSaveOptions(true); // Set showSaveOptions if history is loaded
                    console.log("Chat history loaded from backend.");
                } else {
                    console.log("No previous chat history found for this user, initiating mentor message.");
                    initiateFirstMentorMessage();
                }

                // Fetch chat counts
                fetchChatCounts();

            } catch (error) {
                console.error("Error loading initial data from backend:", error);
                // If there's an error loading history, proceed to initiate.
                initiateFirstMentorMessage();
            } finally {
                setIsLoading(false);
            }
        };

        if (!showApiKeyPopup) {
            fetchInitialData();
        }
    }, [username, showApiKeyPopup]); // Rerun when username or API key popup state changes

    // This useEffect ensures the initial mentor message only fires once after model/api key are ready
    useEffect(() => {
        if (
            !showApiKeyPopup &&
            username &&
            selectedModel &&
            selectedModel !== "Choose a model" &&
            chatHistory.length === 0 &&
            sessionHistory.length === 0
        ) {
            // initiateFirstMentorMessage(); // This is now primarily handled by the fetchInitialData useEffect
        }
    }, [selectedModel, username, showApiKeyPopup, chatHistory.length, sessionHistory.length]);


    // Improved JSON parsing function that handles different formats
    const extractScoringData = (content) => {
        try {
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                return JSON.parse(jsonMatch[1]);
            }
            const possibleJson = content.match(/\{[\s\S]*"OverallScore"[\s\S]*\}/);
            if (possibleJson) {
                return JSON.parse(possibleJson[0]);
            }
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
        const detailedAssessmentHeader = "### Part 1: Detailed Assessment";
        const deterministicScoringHeader = "### Part 2: Deterministic Scoring";

        const part1Index = content.indexOf(detailedAssessmentHeader);
        if (part1Index === -1) {
            const altHeader = "### Part1: Detailed Assessment";
            const altPart1Index = content.indexOf(altHeader);
            if (altPart1Index === -1) {
                return content;
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

    const hasAssessmentData = (content) => {
        return (
            content &&
            content.includes("Detailed Assessment") &&
            content.includes("Deterministic Scoring")
        );
    };

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
            <div className="flex-grow-1 p-4 d-flex flex-column position-relative dashboard-content">
                <div className="mt-5">
                    <h5 className="text-primary">
                        <span style={{ color: "black" }}>Model : </span>
                        {selectedModel}
                    </h5>
                </div>

                <div className="d-flex justify-content-center flex-wrap gap-2">
                    {isCountsLoading ? (
                        <div className="d-flex justify-content-center my-3">
                            <div className="spinner-border text-info" role="status">
                                <span className="visually-hidden">Loading counts...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="card text-center shadow-sm flex-fill" style={{ maxWidth: '95px', minWidth: '60px', borderRadius: '10px', height: '80px', top: "-20px" }}>
                                <p className="card-title text-danger mb-1">Stopped</p> {/* Adjusted margin-bottom */}
                                <p className="card-text fs-5 fw-bold text-danger">{chatCounts.stopped}</p> {/* Changed fs-2 to fs-5 */}
                            </div>
                            <div className="card text-center shadow-sm flex-fill" style={{ maxWidth: '95px', minWidth: '60px', borderRadius: '10px', height: '80px', top: "-20px" }}>
                                <p className="card-title text-info mb-1">Paused </p> {/* Adjusted margin-bottom */}
                                <p className="card-text fs-5 fw-bold text-info">{chatCounts.paused}</p> {/* Changed fs-2 to fs-5 */}
                            </div>
                            <div className="card text-center shadow-sm flex-fill" style={{ maxWidth: '95px', minWidth: '60px', borderRadius: '10px', height: '80px', top: "-20px" }}>
                                <p className="card-title text-success mb-1">Completed </p> {/* Adjusted margin-bottom */}
                                <p className="card-text fs-5 fw-bold text-success">{chatCounts.completed}</p> {/* Changed fs-2 to fs-5 */}
                            </div>
                        </>
                    )}
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
                                    {hasAssessmentData(item.system) ? (
                                        <div>
                                            <h5>{selectedModel}:</h5>
                                            <h5>Detailed Assessment:</h5>
                                            <p>{parseAssessmentContent(item.system)}</p>
                                            <h5>Deterministic Scoring:</h5>
                                            <table className="table table-bordered">
                                                <thead>
                                                    <tr>
                                                        <th style={{ whiteSpace: "nowrap" }}>Category</th>
                                                        <th style={{ whiteSpace: "nowrap" }}>Score</th>
                                                        <th style={{ whiteSpace: "nowrap" }}>Evidence</th>
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

                {/* New Save Button and Options */}
                {chatHistory.length > 0 && ( // Only show save button if there's any chat history
                    <div
                        className="position-fixed d-flex flex-column align-items-end"
                        style={{ top: "10%", right: "5%", zIndex: 100 }}
                    >
                        <button
                            className="btn btn-outline-dark mb-2"
                            onClick={() => setShowSaveOptions(!showSaveOptions)}
                            disabled={showApiKeyPopup}
                            style={{ width: "50px", height: "50px", display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Save Chat"
                        >
                            <FiSave size={20} />
                        </button>

                        {/* Save Options Popover */}
                        {showSaveOptions && ( // Show status selection if save button is clicked
                            <div className="card shadow-sm p-3" style={{ width: '150px', position: 'absolute', right: '55px', top: '0px' }}>
                                <h6 className="mb-2">Save as:</h6>
                                <button className="btn btn-sm btn-outline-success mb-1" onClick={() => handleSaveChat('completed')}>
                                    Completed
                                </button>
                                <button className="btn btn-sm btn-outline-info mb-1" onClick={() => handleSaveChat('paused')}>
                                    Paused
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleSaveChat('stopped')}>
                                    Stopped
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Existing Download PDF Button */}
                {chatHistory.length > 0 && ( // Only show PDF button if there's any chat history
                    <button
                        className="btn btn-outline-dark position-fixed"
                        style={{ top: "10%", left: "85%", width: "50px", height: "50px", display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={handleDownloadPDF}
                        disabled={showApiKeyPopup}
                        
                    >
                        <FiDownload size={20} />
                    </button>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
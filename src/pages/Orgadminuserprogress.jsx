import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaDownload, FaArrowLeft } from 'react-icons/fa';
import {
  FiEye,
  FiClock,
  FiPlay,
  FiCheckCircle,
  FiUser,
  FiMessageCircle,
  FiX,
  FiCalendar,
  FiTarget,
  FiFilter,
  FiSearch,
  FiRefreshCw,
  FiDownload,
  FiChevronDown,
  FiChevronUp
} from "react-icons/fi";
import axios from 'axios';
import { Spinner, Alert, Card, Row, Col, Badge, Button } from 'react-bootstrap';
import Orgadminsidebar from '../components/Orgadminsidebar';
import PDFDownloader from '../components/PDFDownloader.jsx';
import AssessmentDisplay, { 
  hasAssessmentData, 
  extractScoringData, 
  calculateOverallScore, 
  getScoreColor, 
  getScoreLabel, 
  formatCriterionName 
} from '../components/AssessmentDisplay.jsx';
import '../styles/orgadminusers.css';

function Orgadminuserprogress() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Conversation-related state
  const [conversations, setConversations] = useState([]);
  const [isConversationsLoading, setIsConversationsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const modalRef = useRef(null);
  const chatEndRef = useRef(null);

  const BASE_URL = process.env.REACT_APP_API_LINK;

  // Convert conversation to format expected by PDFDownloader
  const convertConversationForPDF = (conversation) => {
    if (!conversation || !conversation.conversation) return [];
    
    return conversation.conversation.map(entry => ({
      user: entry.user || "",
      system: entry.system || ""
    }));
  };

  // Create concept object for PDFDownloader
  const createConceptObject = (conversation) => ({
    concept_name: conversation.concept_name || "Learning Session"
  });

  // Handle PDF download with loading state
  const downloadConversationPDF = async (conversation) => {
    if (!conversation) return;

    setIsDownloadingPDF(true);
    
    try {
      // Create temporary PDF downloader instance for this specific conversation
      const tempPDFDownloader = PDFDownloader({
        chatHistory: convertConversationForPDF(conversation),
        selectedConcept: createConceptObject(conversation)
      });

      // Call the PDF generation
      await tempPDFDownloader.handleDownloadPDF();
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  useEffect(() => {
    const fetchUserProgress = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_LINK}/pod-users/user/id/${userId}`
        );

        if (response.data.success) {
          setUserData(response.data.data);
        } else {
          setError(response.data.message || 'Failed to fetch user progress.');
        }
      } catch (err) {
        if (err.response) {
          console.error('Server error:', err.response.data);
          setError(`Server error: ${err.response.data.message || 'Unknown error'}`);
        } else if (err.request) {
          console.error('Network error:', err.request);
          setError('Network error: No response from server.');
        } else {
          console.error('Error:', err.message);
          setError('Error: ' + err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProgress();
      fetchChatHistory();
    }
  }, [userId]);

  // Fetch chat history from API
  const fetchChatHistory = async () => {
    if (!userId) {
      setError("User not identified");
      return;
    }

    setIsConversationsLoading(true);

    try {
      console.log("🔍 Fetching chat history for user:", userId);

      const params = {
        status: filterStatus === 'all' ? 'all' : filterStatus,
        limit: 50,
        offset: 0
      };

      if (searchTerm && searchTerm.trim()) {
        params.concept = searchTerm.trim();
      }

      const response = await axios.get(`${BASE_URL}/chat/history/${userId}`, { params });

      if (response.data && response.data.success) {
        const chats = response.data.data.chats || [];
        console.log("✅ Chat history loaded:", chats.length, "conversations");

        const enhancedChats = chats.map(chat => ({
          ...chat,
          concept_name: extractConceptFromConversation(chat.conversation, chat.concept_name)
        }));

        setConversations(enhancedChats);
      } else {
        console.warn("⚠️ No chat history data in response");
        setConversations([]);
      }
    } catch (error) {
      console.error("❌ Error fetching chat history:", error);
      setConversations([]);

      if (error.response?.status !== 404) {
        console.error("Failed to load conversations. Please try again.");
      }
    } finally {
      setIsConversationsLoading(false);
    }
  };

  // Extract concept name from conversation
  const extractConceptFromConversation = (conversation, apiConceptName) => {
    if (apiConceptName && apiConceptName.trim()) {
      return apiConceptName.trim();
    }

    if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
      return "Learning Session";
    }

    for (let i = 0; i < Math.min(3, conversation.length); i++) {
      const message = conversation[i];
      const textToAnalyze = (message.user || message.system || '').toLowerCase();

      if (textToAnalyze) {
        const conceptPatterns = [
          /(?:learning about|studying|understanding|exploring|discussing)\s+([a-zA-Z0-9\s-]+?)(?:\s+(?:concept|topic|subject|fundamentals?|basics?|principles?))?(?:\.|,|!|\?|$)/i,
          /(?:let's talk about|today we'll cover|we're going to discuss|focusing on)\s+([a-zA-Z0-9\s-]+?)(?:\.|,|!|\?|$)/i,
          /^([a-zA-Z0-9\s-]+?)\s+(?:is|are)\s+(?:a|an|the)?\s*(?:topic|concept|subject|important|fundamental|key)/i,
          /(?:^|\s)([A-Z][a-zA-Z0-9\s-]*[A-Z][a-zA-Z0-9\s-]*|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s|$)/g
        ];

        for (const pattern of conceptPatterns) {
          const match = textToAnalyze.match(pattern);
          if (match && match[1]) {
            let extractedConcept = match[1].trim()
              .replace(/\b(?:concept|topic|subject|fundamentals?|basics?|principles?)\b/gi, '')
              .replace(/\s+/g, ' ')
              .trim();

            if (extractedConcept.length > 2 &&
                !extractedConcept.match(/^(?:it|is|are|the|and|or|but|so|if|when|where|how|what|why|this|that|these|those)$/i)) {
              return extractedConcept.replace(/\b\w/g, l => l.toUpperCase());
            }
          }
        }
      }
    }

    return "Learning Session";
  };

  // Load conversations when filters change
  useEffect(() => {
    if (userId) {
      fetchChatHistory();
    }
  }, [filterStatus, searchTerm]);

  // Refresh data
  const handleRefresh = () => {
    fetchChatHistory();
  };

  // Utility functions
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'inprogress': return '#3b82f6';
      case 'not_started': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FiCheckCircle />;
      case 'inprogress': return <FiPlay />;
      case 'not_started': return <FiClock />;
      default: return <FiClock />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'inprogress': return 'In Progress';
      case 'not_started': return 'Not Started';
      default: return 'Unknown';
    }
  };

  const getStageProgress = (currentStage, status) => {
    if (status === 'not_started') return 0;
    if (status === 'completed') return 100;
    const maxStage = 5;
    return Math.round((currentStage / maxStage) * 100);
  };

  // Filter and sort conversations
  const filteredAndSortedConversations = () => {
    let filtered = conversations.filter(conv => {
      const matchesStatus = filterStatus === 'all' || conv.status === filterStatus;
      const matchesSearch = conv.concept_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.updated_at) - new Date(a.updated_at);
        case 'date_asc':
          return new Date(a.updated_at) - new Date(b.updated_at);
        case 'concept_asc':
          return a.concept_name.localeCompare(b.concept_name);
        case 'concept_desc':
          return b.concept_name.localeCompare(a.concept_name);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'stage':
          return b.current_stage - a.current_stage;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const handleViewConversation = (conversation) => {
    setSelectedConversation(conversation);
    setShowConversationModal(true);
  };

  const closeModal = () => {
    setShowConversationModal(false);
    setSelectedConversation(null);
  };

  // Auto-scroll to bottom when modal opens
  useEffect(() => {
    if (showConversationModal && chatEndRef.current) {
      setTimeout(() => {
        chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [showConversationModal]);

  // Render score cell for table - EXACTLY like conversation history
  const renderScoreCell = (conversation) => {
    const hasScoring = conversation.status === 'completed' && conversation.scoring;

    if (!hasScoring) {
      return <div className="score-cell-content"><span className="no-score">-</span></div>;
    }

    const finalScore = parseFloat(conversation.scoring.final_score) || null;
    const sixFacetsAvg = parseFloat(conversation.scoring.six_facets?.average) || null;
    const skillsAvg = parseFloat(conversation.scoring.understanding_skills?.average) || null;

    // Dynamic positioning function
    const handleMouseEnter = (e) => {
      const tooltip = e.currentTarget.querySelector('.score-tooltip');
      if (!tooltip) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Calculate position
      let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
      let top = rect.top - tooltipRect.height - 10;

      // Adjust if tooltip goes off-screen horizontally
      if (left < 10) {
        left = 10;
      } else if (left + tooltipRect.width > viewportWidth - 10) {
        left = viewportWidth - tooltipRect.width - 10;
      }

      // Adjust if tooltip goes off-screen vertically (show below instead)
      if (top < 10) {
        top = rect.bottom + 10;
        tooltip.classList.add('tooltip-below');
      } else {
        tooltip.classList.remove('tooltip-below');
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    const handleMouseLeave = (e) => {
      const tooltip = e.currentTarget.querySelector('.score-tooltip');
      if (tooltip) {
        tooltip.classList.remove('tooltip-below');
      }
    };

    return (
      <div className="score-cell-content">
        <div
          className="score-tooltip-container"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="score-badge-large"
            style={{ backgroundColor: getScoreColor(finalScore) }}
          >
            <span className="score-value">{finalScore ? finalScore.toFixed(1) : 'N/A'}</span>
            <span className="score-max">/5</span>
          </div>

          <div className="score-tooltip">
            <div className="tooltip-section">
              <strong>📊 Six Facets of Understanding: {sixFacetsAvg?.toFixed(1) || 'N/A'}</strong>
              <div className="mini-breakdown">
                {Object.entries({
                  'Explanation': conversation.scoring.six_facets.explanation,
                  'Interpretation': conversation.scoring.six_facets.interpretation,
                  'Application': conversation.scoring.six_facets.application,
                  'Perspective': conversation.scoring.six_facets.perspective,
                  'Empathy': conversation.scoring.six_facets.empathy,
                  'Self-Knowledge': conversation.scoring.six_facets.self_knowledge
                }).map(([key, value]) => (
                  <div key={key} className="mini-item">
                    <span>{key}</span>
                    <span style={{
                      color: getScoreColor(parseFloat(value)),
                      fontWeight: 'bold'
                    }}>
                      {parseFloat(value)?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tooltip-section">
              <strong>🎯 Understanding Skills: {skillsAvg?.toFixed(1) || 'N/A'}</strong>
              <div className="mini-breakdown">
                {Object.entries({
                  'Asking Questions': conversation.scoring.understanding_skills.asking_questions,
                  'Clarifying Ambiguity': conversation.scoring.understanding_skills.clarifying_ambiguity,
                  'Summarizing': conversation.scoring.understanding_skills.summarizing_confirming,
                  'Challenging Ideas': conversation.scoring.understanding_skills.challenging_ideas,
                  'Comparing Concepts': conversation.scoring.understanding_skills.comparing_concepts,
                  'Abstract Thinking': conversation.scoring.understanding_skills.abstract_concrete
                }).map(([key, value]) => (
                  <div key={key} className="mini-item">
                    <span>{key}</span>
                    <span style={{
                      color: getScoreColor(parseFloat(value)),
                      fontWeight: 'bold'
                    }}>
                      {parseFloat(value)?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tooltip-footer">
              <div style={{
                textAlign: 'center',
                padding: '8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px',
                marginTop: '8px'
              }}>
                <strong style={{ color: getScoreColor(finalScore) }}>
                  Overall Score: {finalScore?.toFixed(1) || 'N/A'}/5
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render conversation modal
  const renderConversationModal = () => {
    if (!selectedConversation) return null;

    const { date, time } = formatDate(selectedConversation.updated_at);

    return (
      <div className="conversation-modal-overlay" style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }} onClick={closeModal}>
        <div className="conversation-modal" ref={modalRef} style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          maxWidth: '90vw', 
          maxHeight: '90vh', 
          width: '75%',
          display: 'flex',
          flexDirection: 'column'
        }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header" style={{ 
            padding: '20px', 
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div className="modal-title-section">
              <h3>{selectedConversation.concept_name}</h3>
              <div className="modal-meta" style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <span className="modal-date">
                  <FiCalendar /> {date} at {time}
                </span>
                <span
                  className="modal-status"
                  style={{ color: getStatusColor(selectedConversation.status) }}
                >
                  {getStatusIcon(selectedConversation.status)}
                  {getStatusLabel(selectedConversation.status)}
                </span>
                <span className="modal-stage">
                  <FiTarget /> Stage {selectedConversation.current_stage}/5
                </span>
              </div>
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: '10px' }}>
              <button
                className="download-pdf-btn"
                onClick={() => downloadConversationPDF(selectedConversation)}
                disabled={isDownloadingPDF}
                title="Download as PDF"
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {isDownloadingPDF ? (
                  <span>Generating...</span>
                ) : (
                  <>
                    <FiDownload />
                    PDF
                  </>
                )}
              </button>

              <button className="modal-close" onClick={closeModal} style={{
                padding: '8px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}>
                <FiX />
              </button>
            </div>
          </div>

          <div className="modal-content" style={{ 
            flex: 1, 
            overflow: 'auto', 
            padding: '20px' 
          }}>
            <div className="conversation-messages">
              {selectedConversation.conversation.map((message, index) => (
                <div key={index} className="message-group" style={{ marginBottom: '20px' }}>
                  {message.user && (
                    <div className="message user-message" style={{ 
                      display: 'flex', 
                      justifyContent: 'flex-end', 
                      marginBottom: '10px' 
                    }}>
                      <div className="message-content">
                        <div className="message-text">{message.user}</div>
                      </div>
                      <div className="message-avatar user" style={{ 
                        marginLeft: '10px', 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        backgroundColor: '#007bff', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'white' 
                      }}>
                        <FiUser />
                      </div>
                    </div>
                  )}

                  <div className="message mentor-message" style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-start' 
                  }}>
                    <div className="message-avatar mentor" style={{ 
                      marginRight: '10px', 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      backgroundColor: '#28a745', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white' 
                    }}>
                      <FiMessageCircle />
                    </div>
                    <div className="message-content" style={{   
                      borderRadius: '15px',  
                    }}>
                      <div className="message-header" style={{ marginBottom: '5px' }}>
                        <span className="message-author" style={{ fontWeight: 'bold', color: '#28a745' }}>AI Mentor</span>
                      </div>
                      <div className="message-text">
                        <AssessmentDisplay content={message.system} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="conversation-history-page">
      <Orgadminsidebar />
      <div className="main-content">
        <div className="container mt-4">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span>Loading progress...</span>
            </div>
          ) : error ? (
            <Alert variant="danger" className="text-center">{error}</Alert>
          ) : (
            <>
              {/* User Info Card with Back Button in Header */}
              <Card className="shadow-sm rounded-4 border-primary mb-4">
                <Card.Header className="bg-primary text-white py-3 rounded-top-4">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <Button 
                      variant="outline-light" 
                      onClick={() => navigate(-1)} 
                      style={{ 
                        position: 'absolute',
                        left: '0',
                        padding: '8px', 
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background:'transparent',
                        boxShadow:'none'
                      }}
                    >
                      <FaArrowLeft />
                    </Button>
                    <h4 className="mb-0 fw-bold">
                      Progress of {userData.user.first_name} {userData.user.last_name}
                    </h4>
                  </div>
                </Card.Header>
                <Card.Body>
                  <p><strong>Email:</strong> {userData.user.email}</p>
                  <p><strong>Pod:</strong> <Badge bg="info">{userData.pod?.pod_name || 'N/A'}</Badge></p>
                  <p><strong>Batch:</strong> <Badge bg="secondary">{userData.batch?.batch_name || 'N/A'}</Badge></p>
                  <p><strong>Mentor:</strong> {userData.pod?.mentor?.first_name} {userData.pod?.mentor?.last_name} ({userData.pod?.mentor?.email})</p>
                </Card.Body>
              </Card>

              {/* Header Actions */}
              <div className="page-header">
                <div className="header-title">
                  <h1>
                    <FiMessageCircle className="page-icon" />
                    Conversation History
                  </h1>
                  
                </div>
                <div className="header-actions">
                  <button
                    className="filter-toggle"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <FiFilter />
                    Filters
                    {showFilters ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                  <button className="refresh-btn" onClick={handleRefresh}>
                    <FiRefreshCw />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Filters Section */}
              {showFilters && (
                <div className="filters-section">
                  <div className="filter-group">
                    <label>Search Concepts:</label>
                    <div className="search-input">
                      <FiSearch />
                      <input
                        type="text"
                        placeholder="Search by concept name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="filter-group">
                    <label>Status:</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="not_started">Not Started</option>
                      <option value="inprogress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Sort By:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="date_desc">Latest First</option>
                      <option value="date_asc">Oldest First</option>
                      <option value="concept_asc">Concept A-Z</option>
                      <option value="concept_desc">Concept Z-A</option>
                      <option value="status">Status</option>
                      <option value="stage">Stage Progress</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Conversations Table */}
              <div className="conversations-section">
                {isConversationsLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <span>Loading conversations...</span>
                  </div>
                ) : filteredAndSortedConversations().length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <FiMessageCircle />
                    </div>
                    <h3>No conversations found</h3>
                    <p>
                      {searchTerm || filterStatus !== 'all'
                        ? "Try adjusting your search or filter criteria."
                        : "This user hasn't started any learning sessions yet."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="conversations-table-container">
                    <table className="conversations-table">
                      <thead>
                        <tr>
                          <th>Concept</th>
                          <th>Status</th>
                          <th>Progress</th>
                          <th>Stage</th>
                          <th>Overall Score</th>
                          <th>Created</th>
                          <th>Last Updated</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedConversations().map((conversation) => {
                          const { date: createdDate, time: createdTime } = formatDate(conversation.created_at);
                          const { date: updatedDate, time: updatedTime } = formatDate(conversation.updated_at);
                          const progress = getStageProgress(conversation.current_stage, conversation.status);

                          return (
                            <tr key={conversation.id}>
                              <td className="concept-cell">
                                <div className="concept-name">{conversation.concept_name}</div>
                              </td>
                              <td className="status-cell">
                                <span
                                  className="status-badge"
                                  style={{
                                    backgroundColor: getStatusColor(conversation.status),
                                    color: 'white'
                                  }}
                                >
                                  {getStatusIcon(conversation.status)}
                                  {getStatusLabel(conversation.status)}
                                </span>
                              </td>
                              <td className="progress-cell">
                                <div className="progress-container">
                                  <div className="progress-bar">
                                    <div
                                      className="progress-fill"
                                      style={{
                                        width: `${progress}%`,
                                        backgroundColor: getStatusColor(conversation.status)
                                      }}
                                    ></div>
                                  </div>
                                  <span className="progress-text">{progress}%</span>
                                </div>
                              </td>
                              <td className="stage-cell">
                                <span className="stage-info">
                                  <FiTarget />
                                  {conversation.current_stage}/5
                                </span>
                              </td>
                              <td className="score-cell">
                                {renderScoreCell(conversation)}
                              </td>
                              <td className="date-cell">
                                <div className="date-info">
                                  <div className="date">{createdDate}</div>
                                  <div className="time">{createdTime}</div>
                                </div>
                              </td>
                              <td className="date-cell">
                                <div className="date-info">
                                  <div className="date">{updatedDate}</div>
                                  <div className="time">{updatedTime}</div>
                                </div>
                              </td>
                              <td className="actions-cell">
                                <button
                                  className="view-btn"
                                  onClick={() => handleViewConversation(conversation)}
                                >
                                  <FiEye />
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Conversation Modal */}
      {showConversationModal && renderConversationModal()}
    </div>
  );
}

export default Orgadminuserprogress;
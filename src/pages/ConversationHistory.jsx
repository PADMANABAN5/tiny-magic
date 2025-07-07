import React, { useState, useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Sidebar from "../components/Sidebar.jsx";
import "../styles/ConversationHistory.css";
import axios from "axios";
import jsPDF from "jspdf";
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
  FiTrendingUp,
  FiFilter,
  FiSearch,
  FiRefreshCw,
  FiDownload,
  FiChevronDown,
  FiChevronUp
} from "react-icons/fi";

const BASE_URL = process.env.REACT_APP_API_LINK;

const ConversationHistory = () => {
  const [conversations, setConversations] = useState([]);
  const [chatCounts, setChatCounts] = useState({
    not_started: 0,
    inprogress: 0,
    completed: 0,
    archived: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCountsLoading, setIsCountsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  
  const modalRef = useRef(null);
  const chatEndRef = useRef(null);

  // Get user data from session storage
  const userId = sessionStorage.getItem("userId");
  const username = sessionStorage.getItem("username");

  // Function to clean text by removing emojis and special characters
  const cleanTextForPDF = (text) => {
    if (!text) return '';
    
    // Remove emojis and special Unicode characters that don't render well in PDF
    return text
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Regional indicator symbols
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
      .replace(/\s+/g, ' ')                   // Replace multiple spaces with single space
      .trim();
  };

  // Function to download conversation as PDF (text format)
  const downloadConversationPDF = (conversation) => {
    if (!conversation) return;

    setIsDownloadingPDF(true);

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      let yPosition = margin;
      const lineHeight = 6;
      const sectionSpacing = 8;
      const messageSpacing = 12;

      // Helper function to add text with word wrapping
      const addWrappedText = (text, x, y, maxWidth, fontSize = 10, fontStyle = 'normal', textColor = [0, 0, 0]) => {
        pdf.setFontSize(fontSize);
        pdf.setFont("helvetica", fontStyle);
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        
        const cleanedText = cleanTextForPDF(text);
        const lines = pdf.splitTextToSize(cleanedText, maxWidth);
        
        for (let i = 0; i < lines.length; i++) {
          if (y + (i * lineHeight) > pageHeight - margin - 15) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(lines[i], x, y + (i * lineHeight));
        }
        return y + (lines.length * lineHeight);
      };

      // Helper function to check if we need a new page
      const checkNewPage = (additionalHeight) => {
        if (yPosition + additionalHeight > pageHeight - margin - 15) {
          pdf.addPage();
          yPosition = margin;
        }
      };

      // Title with better formatting
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(51, 51, 51);
      const title = `Learning Conversation: ${conversation.concept_name}`;
      yPosition = addWrappedText(title, margin, yPosition, maxWidth, 18, "bold", [51, 51, 51]);
      yPosition += sectionSpacing * 2;

      // Conversation metadata in a box-like format
      const { date, time } = formatDate(conversation.updated_at);
      
      // Add metadata box background
      pdf.setFillColor(248, 249, 250);
      pdf.roundedRect(margin, yPosition - 5, maxWidth, 35, 3, 3, 'F');
      
      const metadata = [
        `Status: ${getStatusLabel(conversation.status)}`,
        `Stage: ${conversation.current_stage}/5`,
        `Date: ${date} at ${time}` 
      ];

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(102, 102, 102);
      
      let metaY = yPosition;
      for (const meta of metadata) {
        pdf.text(meta, margin + 5, metaY);
        metaY += lineHeight + 1;
      }
      
      yPosition = metaY + sectionSpacing;

      // Add a separator line
      checkNewPage(5);
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += sectionSpacing * 2;

      // Conversation content header
      checkNewPage(lineHeight + sectionSpacing);
      yPosition = addWrappedText("CONVERSATION TRANSCRIPT", margin, yPosition, maxWidth, 14, "bold", [51, 51, 51]);
      yPosition += sectionSpacing * 2;

      // Process each message in the conversation
      conversation.conversation.forEach((message, index) => {
        // User message (if exists)
        if (message.user && message.user.trim()) {
          checkNewPage(lineHeight * 4 + messageSpacing);
          
          // User label with better styling
          pdf.setFillColor(59, 130, 246);
          pdf.roundedRect(margin, yPosition - 3, 60, 12, 2, 2, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.text("LEARNER", margin + 5, yPosition + 5);
          
          yPosition += 15;
          
          // User message content with background
          const userMessageHeight = Math.max(20, pdf.splitTextToSize(cleanTextForPDF(message.user), maxWidth - 20).length * lineHeight + 8);
          pdf.setFillColor(235, 245, 255);
          pdf.roundedRect(margin + 5, yPosition - 5, maxWidth - 10, userMessageHeight, 2, 2, 'F');
          
          yPosition = addWrappedText(message.user, margin + 10, yPosition, maxWidth - 20, 10, "normal", [51, 51, 51]);
          yPosition += messageSpacing;
        }

        // AI Mentor message
        if (message.system && message.system.trim()) {
          checkNewPage(lineHeight * 4 + messageSpacing);
          
          // Mentor label with better styling
          pdf.setFillColor(16, 185, 129);
          pdf.roundedRect(margin, yPosition - 3, 70, 12, 2, 2, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.text("AI MENTOR", margin + 5, yPosition + 5);
          
          yPosition += 15;
          
          // Mentor message content with background
          const mentorMessageHeight = Math.max(20, pdf.splitTextToSize(cleanTextForPDF(message.system), maxWidth - 20).length * lineHeight + 8);
          pdf.setFillColor(240, 253, 250);
          pdf.roundedRect(margin + 5, yPosition - 5, maxWidth - 10, mentorMessageHeight, 2, 2, 'F');
          
          yPosition = addWrappedText(message.system, margin + 10, yPosition, maxWidth - 20, 10, "normal", [51, 51, 51]);
          yPosition += messageSpacing;
        }

        // Add extra spacing between message pairs
        if (index < conversation.conversation.length - 1) {
          yPosition += 8;
        }
      });

      // Footer with better styling
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(156, 163, 175);
        
        const footerText = `Generated on ${new Date().toLocaleString()} | Page ${i} of ${totalPages}`;
        const textWidth = pdf.getStringUnitWidth(footerText) * 8 / pdf.internal.scaleFactor;
        const centerX = (pageWidth - textWidth) / 2;
        
        pdf.text(footerText, centerX, pageHeight - 8);
      }

      // Generate filename
      const sanitizedConceptName = conversation.concept_name.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `conversation_${sanitizedConceptName}_${timestamp}.pdf`;

      // Save the PDF
      pdf.save(filename);

      console.log("✅ PDF generated successfully:", filename);
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Fetch chat history from API with concept search support
  const fetchChatHistory = async () => {
    if (!userId) {
      setError("User not identified");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 Fetching chat history for user:", userId);
      
      const params = {
        status: filterStatus === 'all' ? 'all' : filterStatus,
        limit: 50, // Fetch more records for better filtering
        offset: 0
      };

      // Add concept search if searchTerm is provided
      if (searchTerm && searchTerm.trim()) {
        params.concept = searchTerm.trim();
      }
      
      const response = await axios.get(`${BASE_URL}/chat/history/${userId}`, { params });

      if (response.data && response.data.success) {
        const chats = response.data.data.chats || [];
        console.log("✅ Chat history loaded:", chats.length, "conversations");
        
        // Use concept_name from API directly, with fallback extraction
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
      setError("Failed to load conversation history");
      setConversations([]);
      
      if (error.response?.status !== 404) {
        alert("Failed to load conversations. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch chat counts from API
  const fetchChatCounts = async () => {
    if (!userId) return;

    setIsCountsLoading(true);
    try {
      console.log("📊 Fetching chat counts for user:", userId);
      
      const response = await axios.get(`${BASE_URL}/chat/counts/${userId}`);

      if (response.data && response.data.success && response.data.data.counts) {
        setChatCounts(response.data.data.counts);
        console.log("✅ Chat counts loaded:", response.data.data.counts);
      } else {
        console.warn("⚠️ No chat counts data in response");
        setChatCounts({
          not_started: 0,
          inprogress: 0,
          completed: 0,
          archived: 0,
          total: 0
        });
      }
    } catch (error) {
      console.error("❌ Error fetching chat counts:", error);
      setChatCounts({
        not_started: 0,
        inprogress: 0,
        completed: 0,
        archived: 0,
        total: 0
      });
    } finally {
      setIsCountsLoading(false);
    }
  };

  // Extract concept name from conversation - Now fully dynamic
  const extractConceptFromConversation = (conversation, apiConceptName) => {
    // First priority: Use concept_name from API if available
    if (apiConceptName && apiConceptName.trim()) {
      return apiConceptName.trim();
    }

    // Fallback: Try to extract from conversation content dynamically
    if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
      return "Learning Session";
    }

    // Try to extract concept from the first few messages
    for (let i = 0; i < Math.min(3, conversation.length); i++) {
      const message = conversation[i];
      
      // Check both user and system messages
      const textToAnalyze = (message.user || message.system || '').toLowerCase();
      
      if (textToAnalyze) {
        // Look for learning-related keywords and extract potential concept names
        const conceptPatterns = [
          // Pattern: "learning about X", "studying X", "understanding X"
          /(?:learning about|studying|understanding|exploring|discussing)\s+([a-zA-Z0-9\s-]+?)(?:\s+(?:concept|topic|subject|fundamentals?|basics?|principles?))?(?:\.|,|!|\?|$)/i,
          
          // Pattern: "Let's talk about X", "Today we'll cover X"
          /(?:let's talk about|today we'll cover|we're going to discuss|focusing on)\s+([a-zA-Z0-9\s-]+?)(?:\.|,|!|\?|$)/i,
          
          // Pattern: "X is a topic", "X is important"
          /^([a-zA-Z0-9\s-]+?)\s+(?:is|are)\s+(?:a|an|the)?\s*(?:topic|concept|subject|important|fundamental|key)/i,
          
          // Pattern: Extract capitalized terms (likely concept names)
          /(?:^|\s)([A-Z][a-zA-Z0-9\s-]*[A-Z][a-zA-Z0-9\s-]*|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s|$)/g
        ];

        for (const pattern of conceptPatterns) {
          const match = textToAnalyze.match(pattern);
          if (match && match[1]) {
            let extractedConcept = match[1].trim();
            
            // Clean up the extracted concept
            extractedConcept = extractedConcept
              .replace(/\b(?:concept|topic|subject|fundamentals?|basics?|principles?)\b/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
            
            // Only return if it's a meaningful concept (not too short/generic)
            if (extractedConcept.length > 2 && 
                !extractedConcept.match(/^(?:it|is|are|the|and|or|but|so|if|when|where|how|what|why|this|that|these|those)$/i)) {
              
              // Capitalize first letter of each word for better presentation
              return extractedConcept.replace(/\b\w/g, l => l.toUpperCase());
            }
          }
        }
      }
    }

    // If no concept found, return a generic name
    return "Learning Session";
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    if (userId) {
      fetchChatHistory();
      if (!searchTerm) { // Only fetch counts when not searching
        fetchChatCounts();
      }
    }
  }, [userId, filterStatus, searchTerm]); // Added searchTerm to dependencies

  // Refresh data
  const handleRefresh = () => {
    fetchChatHistory();
    fetchChatCounts();
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
      // case 'not_started': return 'Not Started';
      default: return 'Unknown';
    }
  };

  const getStageProgress = (currentStage, status) => {
    if (status === 'not_started') return 0;
    if (status === 'completed') return 100;
    
    // Convert stage (0-5) to percentage
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

    // Sort conversations
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

  const renderConversationModal = () => {
    if (!selectedConversation) return null;

    const { date, time } = formatDate(selectedConversation.updated_at);

    return (
      <div className="conversation-modal-overlay" onClick={closeModal}>
        <div className="conversation-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title-section">
              <h3>{selectedConversation.concept_name}</h3>
              <div className="modal-meta">
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
            
            <div className="modal-actions">
              <button 
                className="download-pdf-btn"
                onClick={() => downloadConversationPDF(selectedConversation)}
                disabled={isDownloadingPDF}
                title="Download as PDF"
              >
                {isDownloadingPDF ? (
                  <div className="loading-spinner-small"></div>
                ) : (
                  <FiDownload />
                )}
                {isDownloadingPDF ? "Generating..." : "PDF"}
              </button>
              
              <button className="modal-close" onClick={closeModal}>
                <FiX />
              </button>
            </div>
          </div>

          <div className="modal-content">
            <div className="conversation-messages">
              {selectedConversation.conversation.map((message, index) => (
                <div key={index} className="message-group">
                  {message.user && (
                    <div className="message user-message">
                      <div className="message-avatar user">
                        <FiUser />
                      </div>
                      <div className="message-content">
                        <div className="message-text">{message.user}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="message mentor-message">
                    <div className="message-avatar mentor">
                      <FiMessageCircle />
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-author">AI Mentor</span>
                      </div>
                      <div className="message-text">{message.system}</div>
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
      <Sidebar />
      
      <div className="main-content">
        <div className="page-header">
          <div className="header-title">
           <div className="stats-section">
          {/* <div className="stat-card">
            <div className="stat-icon not-started">
              <FiClock />
            </div>
            <div className="stat-content">
              <div className="stat-number">
                {isCountsLoading ? "..." : chatCounts.not_started}
              </div>
              <div className="stat-label">Not Started</div>
            </div>
          </div> */}

          <div className="stat-card">
            <div className="stat-icon in-progress">
              <FiPlay />
            </div>
            <div className="stat-content">
              <div className="stat-number">
                {isCountsLoading ? "..." : chatCounts.inprogress}
              </div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon completed">
              <FiCheckCircle />
            </div>
            <div className="stat-content">
              <div className="stat-number">
                {isCountsLoading ? "..." : chatCounts.completed}
              </div>
              <div className="stat-label">Completed</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon total">
              <FiTrendingUp />
            </div>
            <div className="stat-content">
              <div className="stat-number">
                {isCountsLoading ? "..." : chatCounts.total}
              </div>
              <div className="stat-label">Total Sessions</div>
            </div>
          </div>
        </div>
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
                {/* <option value="not_started">Not Started</option> */}
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
          {isLoading ? (
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
                {error ? error :
                  searchTerm || filterStatus !== 'all' 
                    ? "Try adjusting your search or filter criteria."
                    : "Start a new learning session to see your conversations here."
                }
              </p>
              {error && (
                <button className="view-btn" onClick={handleRefresh} style={{ marginTop: '1rem' }}>
                  <FiRefreshCw /> Try Again
                </button>
              )}
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
      </div>

      {/* Conversation Modal */}
      {showConversationModal && renderConversationModal()}
    </div>
  );
};

export default ConversationHistory;
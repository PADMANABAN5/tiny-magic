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


const hasAssessmentData = (content) => {
  return (
    content &&
    (content.includes("Detailed Assessment") || content.includes("Part 1:")) &&
    (content.includes("Deterministic Scoring") || content.includes("Part 2:"))
  );
};

const extractScoringData = (content) => {
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      const parsedData = JSON.parse(jsonMatch[1]);

      // Calculate proper averages for Six Facets if not present or incorrect
      if (parsedData.SixFacets && !parsedData.SixFacets.OverallScore) {
        const facetScores = [
          parsedData.SixFacets.Explanation?.score,
          parsedData.SixFacets.Interpretation?.score,
          parsedData.SixFacets.Application?.score,
          parsedData.SixFacets.Perspective?.score,
          parsedData.SixFacets.Empathy?.score,
          parsedData.SixFacets['Self-Knowledge']?.score
        ].filter(score => score != null);

        if (facetScores.length > 0) {
          const average = facetScores.reduce((sum, score) => sum + score, 0) / facetScores.length;
          parsedData.SixFacets.OverallScore = Math.round(average * 1000) / 1000;
        }
      }

      // Calculate proper averages for Understanding Skills if not present or incorrect
      if (parsedData.UnderstandingSkills && !parsedData.UnderstandingSkills.OverallScore) {
        const skillScores = [
          parsedData.UnderstandingSkills.AskingQuestions?.score,
          parsedData.UnderstandingSkills.ClarifyingAmbiguity?.score,
          parsedData.UnderstandingSkills.SummarizingConfirming?.score,
          parsedData.UnderstandingSkills.ChallengingIdeas?.score,
          parsedData.UnderstandingSkills.ComparingConcepts?.score,
          parsedData.UnderstandingSkills.AbstractConcrete?.score
        ].filter(score => score != null);

        if (skillScores.length > 0) {
          const average = skillScores.reduce((sum, score) => sum + score, 0) / skillScores.length;
          parsedData.UnderstandingSkills.OverallScore = Math.round(average * 1000) / 1000;
        }
      }

      return parsedData;
    }

    // Fallback: try to find JSON-like structure with new format
    const possibleJson = content.match(/\{[\s\S]*"FinalWeightedScore"[\s\S]*\}/);
    if (possibleJson) {
      return JSON.parse(possibleJson[0]);
    }
    return {};
  } catch (e) {
    console.error("Error parsing scoring JSON:", e);
    return {};
  }
};

const calculateOverallScore = (scoringData) => {
  if (scoringData.FinalWeightedScore && typeof scoringData.FinalWeightedScore === 'number') {
    return Math.round(scoringData.FinalWeightedScore * 100) / 100;
  }

  const sixFacetsScore = scoringData.SixFacets?.OverallScore || 0;
  const understandingSkillsScore = scoringData.UnderstandingSkills?.OverallScore || 0;

  const finalWeightedScore = (0.6 * sixFacetsScore) + (0.4 * understandingSkillsScore);

  return Math.round(finalWeightedScore * 100) / 100;
};

const getScoreColor = (score) => {
  if (score === 5) return '#10b981'; // Green for Masterful
  if (score >= 4) return '#10b981'; // Green for Strong
  if (score >= 3) return '#3b82f6'; // Blue for Developing
  if (score >= 2) return '#f59e0b'; // Yellow for Emerging
  return '#ef4444'; // Red for Absent/Minimal
};

const getScoreLabel = (score) => {
  if (score === 5) return 'Masterful';
  if (score >= 4) return 'Strong';
  if (score >= 3) return 'Developing';
  if (score >= 2) return 'Emerging';
  return 'Absent/Minimal';
};

const formatCriterionName = (name) => {
  // Handle camelCase to readable format
  return name.replace(/([A-Z])/g, ' $1').trim();
};

const renderScoringTable = (content) => {
  const scoringData = extractScoringData(content);

  return (
    <div className="assessment-scoring-table">
      <div className="scoring-header">
        <h4>📊 Learning Assessment Scores</h4>
      </div>

      {/* Six Facets of Understanding */}
      {scoringData.SixFacets && (
        <div className="scoring-section">
          <h5>🌟 Six Facets of Understanding</h5>
          <div className="scoring-grid">
            {["Explanation", "Interpretation", "Application", "Perspective", "Empathy", "Self-Knowledge"].map((key) => {
              if (!scoringData.SixFacets[key]) return null;

              const facetData = scoringData.SixFacets[key];
              const scoreValue = facetData.score || 0;
              const scoreColor = getScoreColor(scoreValue);

              return (
                <div key={key} className="score-card">
                  <div className="score-card-header">
                    <h6 className="criterion-name">{formatCriterionName(key)}</h6>
                    <div
                      className="score-badge"
                      style={{ backgroundColor: scoreColor }}
                    >
                      {scoreValue}/5
                    </div>
                  </div>
                  {facetData.justification && (
                    <div className="score-justification">
                      <p><strong>🧠 Why:</strong> {facetData.justification}</p>
                    </div>
                  )}
                  {facetData.example && (
                    <div className="score-example">
                      <p><strong>💬 Example:</strong> {facetData.example}</p>
                    </div>
                  )}
                  {facetData.improvement && (
                    <div className="score-improvement">
                      <p><strong>🔧 How to improve:</strong> {facetData.improvement}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <br />

      {/* Understanding Skills */}
      {scoringData.UnderstandingSkills && (
        <div className="scoring-section">
          <h5>🎯 Understanding Skills</h5>
          <div className="scoring-grid">
            {["AskingQuestions", "ClarifyingAmbiguity", "SummarizingConfirming", "ChallengingIdeas", "ComparingConcepts", "AbstractConcrete"].map((key) => {
              if (!scoringData.UnderstandingSkills[key]) return null;

              const skillData = scoringData.UnderstandingSkills[key];
              const scoreValue = skillData.score || 0;
              const scoreColor = getScoreColor(scoreValue);

              return (
                <div key={key} className="score-card">
                  <div className="score-card-header">
                    <h6 className="criterion-name">{formatCriterionName(key)}</h6>
                    <div
                      className="score-badge"
                      style={{ backgroundColor: scoreColor }}
                    >
                      {scoreValue}/5
                    </div>
                  </div>
                  {skillData.justification && (
                    <div className="score-justification">
                      <p><strong>🧠 Why:</strong> {skillData.justification}</p>
                    </div>
                  )}
                  {skillData.example && (
                    <div className="score-example">
                      <p><strong>💬 Example:</strong> {skillData.example}</p>
                    </div>
                  )}
                  {skillData.improvement && (
                    <div className="score-improvement">
                      <p><strong>🔧 How to improve:</strong> {skillData.improvement}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
const renderOverallScoreAndSummary = (content) => {
  const scoringData = extractScoringData(content);

  // Calculate overall score with better precision
  const calculatedOverallScore = calculateOverallScore(scoringData);

  // Use LLM's summary if available, otherwise create a basic one
  const evaluationSummary = scoringData.EvaluationSummary || "Assessment completed based on conversation analysis.";

  const overallColor = getScoreColor(calculatedOverallScore);
  const overallLabel = getScoreLabel(calculatedOverallScore);

  // Get precise averages
  const sixFacetsAvg = scoringData.SixFacets?.OverallScore;
  const skillsAvg = scoringData.UnderstandingSkills?.OverallScore;

  return (
    <div className="overall-assessment">
      <div className="overall-score-card">
        <div className="overall-header">
          <h4>🎯 Overall Assessment</h4>
          <div
            className="overall-score-badge"
            style={{ backgroundColor: overallColor }}
          >
            <span className="score-value">{calculatedOverallScore.toFixed(1)}/5</span>
            <span className="score-label">{overallLabel}</span>
          </div>
        </div>
        <div className="overall-summary">
          <h5>📋 Summary</h5>
          <p>{evaluationSummary}</p>
        </div>

        {/* Show score breakdown with precise values */}
        <div className="score-breakdown">
          <h5>📈 Score Breakdown</h5>

          {/* Six Facets Breakdown */}
          {scoringData.SixFacets && (
            <div className="breakdown-section">
              <h6>🌟 Six Facets of Understanding</h6>
              <div className="breakdown-grid">
                {["Explanation", "Interpretation", "Application", "Perspective", "Empathy", "Self-Knowledge"].map(facet => {
                  if (!scoringData.SixFacets[facet]) return null;
                  const score = scoringData.SixFacets[facet].score || 0;
                  const color = getScoreColor(score);

                  return (
                    <div key={facet} className="breakdown-item">
                      <span className="breakdown-label">{formatCriterionName(facet)}</span>
                      <span
                        className="breakdown-score"
                        style={{ color: color, fontWeight: 'bold' }}
                      >
                        {score}/5
                      </span>
                    </div>
                  );
                })}
                <div className="breakdown-average">
                  <span className="breakdown-label"><strong>Six Facets Average</strong></span>
                  <span
                    className="breakdown-score"
                    style={{ color: getScoreColor(sixFacetsAvg), fontWeight: 'bold' }}
                  >
                    {sixFacetsAvg ? sixFacetsAvg.toFixed(1) : '0'}/5
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Understanding Skills Breakdown */}
          {scoringData.UnderstandingSkills && (
            <div className="breakdown-section">
              <h6>🎯 Understanding Skills</h6>
              <div className="breakdown-grid">
                {["AskingQuestions", "ClarifyingAmbiguity", "SummarizingConfirming", "ChallengingIdeas", "ComparingConcepts", "AbstractConcrete"].map(skill => {
                  if (!scoringData.UnderstandingSkills[skill]) return null;
                  const score = scoringData.UnderstandingSkills[skill].score || 0;
                  const color = getScoreColor(score);

                  return (
                    <div key={skill} className="breakdown-item">
                      <span className="breakdown-label">{formatCriterionName(skill)}</span>
                      <span
                        className="breakdown-score"
                        style={{ color: color, fontWeight: 'bold' }}
                      >
                        {score}/5
                      </span>
                    </div>
                  );
                })}
                <div className="breakdown-average">
                  <span className="breakdown-label"><strong>Skills Average</strong></span>
                  <span
                    className="breakdown-score"
                    style={{ color: getScoreColor(skillsAvg), fontWeight: 'bold' }}
                  >
                    {skillsAvg ? skillsAvg.toFixed(1) : '0'}/5
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Final Weighted Score */}
          <div className="breakdown-final">
            <span className="breakdown-label"><strong>Final Weighted Score</strong></span>
            <span
              className="breakdown-score"
              style={{ color: overallColor, fontWeight: 'bold', fontSize: '1.2em' }}
            >
              {calculatedOverallScore.toFixed(1)}/5
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [expandedScores, setExpandedScores] = useState(new Set());
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
      const marginX = 20;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const maxWidth = pageWidth - marginX * 2;
      let y = 20;

      const cleanText = (text) =>
        text
          .normalize("NFKD")
          .replace(/[^\x00-\x7F]/g, "")
          .replace(/\s+/g, " ")
          .trim();

      // Title
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      const title = "Chat History";
      const titleWidth = pdf.getTextWidth(title);
      pdf.text(title, (pageWidth - titleWidth) / 2, y);
      y += 15;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);

      // Flatten conversation preserving order
      const flatConversation = [];
      conversation.conversation.forEach((entry) => {
        Object.entries(entry).forEach(([key, value]) => {
          if (value && value.trim()) {
            const role = key === "system" ? "mentor" : key === "user" ? "user" : null;
            if (role) {
              flatConversation.push({ role, message: value.trim() });
            }
          }
        });
      });

      // Render messages
      flatConversation.forEach((item) => {
        const lines = pdf.splitTextToSize(cleanText(item.message), maxWidth);

        if (item.role === "mentor") {
          // Mentor Label
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 128, 0); // Green
          pdf.text("Mentor:", marginX, y);
          y += 6;

          // Mentor Message (left-aligned)
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(0, 0, 0);
          if (y + lines.length * 6 > pageHeight - 30) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(lines, marginX, y);
          y += lines.length * 6 + 10;
        }

        if (item.role === "user") {
          // User Label
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 102, 204); // Blue
          const label = "You:";
          const labelWidth = pdf.getTextWidth(label);
          pdf.text(label, pageWidth - marginX - labelWidth, y);
          y += 6;

          // User Message (right-aligned block)
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(0, 0, 0);
          if (y + lines.length * 6 > pageHeight - 30) {
            pdf.addPage();
            y = 20;
          }

          lines.forEach((line) => {
            const lineWidth = pdf.getTextWidth(line);
            const lineX = pageWidth - marginX - lineWidth;
            pdf.text(line, lineX, y);
            y += 6;
          });
          y += 10;
        }

        if (y > pageHeight - 30) {
          pdf.addPage();
          y = 20;
        }
      });

      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      const timestamp = new Date().toLocaleString();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`Generated on ${timestamp}`, marginX, pageHeight - 10);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - marginX - 30, pageHeight - 10);
      }

      const sanitizedConceptName = conversation.concept_name?.replace(/[^a-zA-Z0-9]/g, "_") || "chat";
      const filename = `chat_history_${sanitizedConceptName}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`;
      pdf.save(filename);

    } catch (err) {
      console.error("❌ PDF generation error:", err);
      alert("Error generating PDF. Please try again.");
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
      case 'not_started': return 'Not Started';
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
                    <div className="message-text">
                      {hasAssessmentData(message.system) ? (
                        <div>
                          {/* Overall Score and Summary */}
                          {renderOverallScoreAndSummary(message.system)}

                          {/* Scoring Table */}
                          {renderScoringTable(message.system)}
                        </div>
                      ) : (
                        message.system
                      )}
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


  const toggleScoreExpansion = (conversationId) => {
    const newExpanded = new Set(expandedScores);
    if (newExpanded.has(conversationId)) {
      newExpanded.delete(conversationId);
    } else {
      newExpanded.add(conversationId);
    }
    setExpandedScores(newExpanded);
  };

  const getScoreColor = (score) => {
    if (!score) return '#6b7280';
    if (score >= 4.5) return '#10b981'; // Green for excellent
    if (score >= 3.5) return '#3b82f6'; // Blue for good
    if (score >= 2.5) return '#f59e0b'; // Yellow for fair
    return '#ef4444'; // Red for needs improvement
  };
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
  const renderScoreCell1 = (conversation) => {
    const hasScoring = conversation.status === 'completed' && conversation.scoring;
    const isExpanded = expandedScores.has(conversation.id);

    if (!hasScoring) {
      return (
        <div className="score-cell-content">
          <span className="no-score">-</span>
        </div>
      );
    }

    // Safely convert to numbers with fallbacks
    const finalScore = parseFloat(conversation.scoring.final_score) || null;
    const sixFacetsAvg = parseFloat(conversation.scoring.six_facets?.average) || null;
    const skillsAvg = parseFloat(conversation.scoring.understanding_skills?.average) || null;

    return (
      <div className="score-cell-content">
        <div
          className="overall-score-container"
          onClick={() => toggleScoreExpansion(conversation.id)}
          style={{ cursor: 'pointer' }}
        >
          <div
            className="overall-score"
            style={{
              backgroundColor: getScoreColor(finalScore),
              color: 'white'
            }}
          >
            {finalScore ? finalScore.toFixed(1) : 'N/A'}
          </div>
          <FiChevronDown
            className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
            style={{ marginLeft: '4px', fontSize: '12px' }}
          />
        </div>

        {isExpanded && (
          <div className="score-breakdown">
            <div className="score-row">
              <div className="score-box six-facets">
                <div className="score-label">Six Facets</div>
                <div
                  className="score-value"
                  style={{ color: getScoreColor(sixFacetsAvg) }}
                >
                  {sixFacetsAvg ? sixFacetsAvg.toFixed(1) : 'N/A'}
                </div>
              </div>

              <div className="score-box skills">
                <div className="score-label">Skills</div>
                <div
                  className="score-value"
                  style={{ color: getScoreColor(skillsAvg) }}
                >
                  {skillsAvg ? skillsAvg.toFixed(1) : 'N/A'}
                </div>
              </div>
            </div>

            {conversation.scoring.six_facets && (
              <div className="individual-scores">
                <div className="scores-section">
                  <div className="section-title">Six Facets</div>
                  <div className="mini-scores">
                    {Object.entries({
                      'Explanation': conversation.scoring.six_facets.explanation,
                      'Interpretation': conversation.scoring.six_facets.interpretation,
                      'Application': conversation.scoring.six_facets.application,
                      'Perspective': conversation.scoring.six_facets.perspective,
                      'Empathy': conversation.scoring.six_facets.empathy,
                      'Self-Knowledge': conversation.scoring.six_facets.self_knowledge
                    }).map(([key, value]) => {
                      const numValue = parseFloat(value) || null;
                      return (
                        <div key={key} className="mini-score">
                          <span className="mini-label">{key.substring(0, 4)}</span>
                          <span
                            className="mini-value"
                            style={{ color: getScoreColor(numValue) }}
                          >
                            {numValue || 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="scores-section">
                  <div className="section-title">Understanding Skills</div>
                  <div className="mini-scores">
                    {Object.entries({
                      'Questions': conversation.scoring.understanding_skills.asking_questions,
                      'Clarity': conversation.scoring.understanding_skills.clarifying_ambiguity,
                      'Summary': conversation.scoring.understanding_skills.summarizing_confirming,
                      'Challenge': conversation.scoring.understanding_skills.challenging_ideas,
                      'Compare': conversation.scoring.understanding_skills.comparing_concepts,
                      'Abstract': conversation.scoring.understanding_skills.abstract_concrete
                    }).map(([key, value]) => {
                      const numValue = parseFloat(value) || null;
                      return (
                        <div key={key} className="mini-score">
                          <span className="mini-label">{key}</span>
                          <span
                            className="mini-value"
                            style={{ color: getScoreColor(numValue) }}
                          >
                            {numValue || 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
              <div className="stat-card">
                <div className="stat-icon not-started">
                  <FiClock />
                </div>
                <div className="stat-content">
                  <div className="stat-number">
                    {isCountsLoading ? "..." : chatCounts.not_started}
                  </div>
                  <div className="stat-label">Not Started</div>
                </div>
              </div>

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
                    <th>Overall Score</th> {/* ADD THIS LINE */}
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
      </div>

      {/* Conversation Modal */}
      {showConversationModal && renderConversationModal()}
    </div>
  );
};

export default ConversationHistory;
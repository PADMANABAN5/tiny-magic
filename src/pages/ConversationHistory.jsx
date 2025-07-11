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
import jsPDF from "jspdf";
import { Spinner, Alert, Card, Row, Col, Badge, Button } from 'react-bootstrap';
import Orgadminsidebar from '../components/Orgadminsidebar';
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

  // Assessment data checking functions
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
    if (score === 5) return '#10b981';
    if (score >= 4) return '#10b981';
    if (score >= 3) return '#3b82f6';
    if (score >= 2) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score === 5) return 'Masterful';
    if (score >= 4) return 'Strong';
    if (score >= 3) return 'Developing';
    if (score >= 2) return 'Emerging';
    return 'Absent/Minimal';
  };

  const formatCriterionName = (name) => {
    return name.replace(/([A-Z])/g, ' $1').trim();
  };

  // PDF download function
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
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 128, 0);
          pdf.text("Mentor:", marginX, y);
          y += 6;

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
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 102, 204);
          const label = "You:";
          const labelWidth = pdf.getTextWidth(label);
          pdf.text(label, pageWidth - marginX - labelWidth, y);
          y += 6;

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

  // Render scoring components
  const renderScoringTable = (content) => {
    const scoringData = extractScoringData(content);

    return (
      <div className="assessment-scoring-table" style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div className="scoring-header">
          <h4>📊 Learning Assessment Scores</h4>
        </div>

        {scoringData.SixFacets && (
          <div className="scoring-section" style={{ marginBottom: '20px' }}>
            <h5>🌟 Six Facets of Understanding</h5>
            <div className="scoring-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
              {["Explanation", "Interpretation", "Application", "Perspective", "Empathy", "Self-Knowledge"].map((key) => {
                if (!scoringData.SixFacets[key]) return null;

                const facetData = scoringData.SixFacets[key];
                const scoreValue = facetData.score || 0;
                const scoreColor = getScoreColor(scoreValue);

                return (
                  <div key={key} className="score-card" style={{ padding: '15px', border: '1px solid #eee', borderRadius: '6px' }}>
                    <div className="score-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h6 className="criterion-name">{formatCriterionName(key)}</h6>
                      <div
                        className="score-badge"
                        style={{ backgroundColor: scoreColor, color: 'white', padding: '4px 8px', borderRadius: '4px' }}
                      >
                        {scoreValue}/5
                      </div>
                    </div>
                    {facetData.justification && (
                      <div className="score-justification" style={{ marginBottom: '8px' }}>
                        <p><strong>🧠 Why:</strong> {facetData.justification}</p>
                      </div>
                    )}
                    {facetData.example && (
                      <div className="score-example" style={{ marginBottom: '8px' }}>
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

        {scoringData.UnderstandingSkills && (
          <div className="scoring-section">
            <h5>🎯 Understanding Skills</h5>
            <div className="scoring-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
              {["AskingQuestions", "ClarifyingAmbiguity", "SummarizingConfirming", "ChallengingIdeas", "ComparingConcepts", "AbstractConcrete"].map((key) => {
                if (!scoringData.UnderstandingSkills[key]) return null;

                const skillData = scoringData.UnderstandingSkills[key];
                const scoreValue = skillData.score || 0;
                const scoreColor = getScoreColor(scoreValue);

                return (
                  <div key={key} className="score-card" style={{ padding: '15px', border: '1px solid #eee', borderRadius: '6px' }}>
                    <div className="score-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h6 className="criterion-name">{formatCriterionName(key)}</h6>
                      <div
                        className="score-badge"
                        style={{ backgroundColor: scoreColor, color: 'white', padding: '4px 8px', borderRadius: '4px' }}
                      >
                        {scoreValue}/5
                      </div>
                    </div>
                    {skillData.justification && (
                      <div className="score-justification" style={{ marginBottom: '8px' }}>
                        <p><strong>🧠 Why:</strong> {skillData.justification}</p>
                      </div>
                    )}
                    {skillData.example && (
                      <div className="score-example" style={{ marginBottom: '8px' }}>
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
    const calculatedOverallScore = calculateOverallScore(scoringData);
    const evaluationSummary = scoringData.EvaluationSummary || "Assessment completed based on conversation analysis.";
    const overallColor = getScoreColor(calculatedOverallScore);
    const overallLabel = getScoreLabel(calculatedOverallScore);
    const sixFacetsAvg = scoringData.SixFacets?.OverallScore;
    const skillsAvg = scoringData.UnderstandingSkills?.OverallScore;

    return (
      <div className="overall-assessment" style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
        <div className="overall-score-card">
          <div className="overall-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4>🎯 Overall Assessment</h4>
            <div
              className="overall-score-badge"
              style={{ backgroundColor: overallColor, color: 'white', padding: '10px 15px', borderRadius: '8px', textAlign: 'center' }}
            >
              <span className="score-value" style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{calculatedOverallScore.toFixed(1)}/5</span>
              <br />
              <span className="score-label" style={{ fontSize: '0.9em' }}>{overallLabel}</span>
            </div>
          </div>
          <div className="overall-summary" style={{ marginBottom: '15px' }}>
            <h5>📋 Summary</h5>
            <p>{evaluationSummary}</p>
          </div>

          <div className="score-breakdown">
            <h5>📈 Score Breakdown</h5>
            
            {scoringData.SixFacets && (
              <div className="breakdown-section" style={{ marginBottom: '15px' }}>
                <h6>🌟 Six Facets of Understanding</h6>
                <div className="breakdown-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {["Explanation", "Interpretation", "Application", "Perspective", "Empathy", "Self-Knowledge"].map(facet => {
                    if (!scoringData.SixFacets[facet]) return null;
                    const score = scoringData.SixFacets[facet].score || 0;
                    const color = getScoreColor(score);

                    return (
                      <div key={facet} className="breakdown-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '5px' }}>
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
                  <div className="breakdown-average" style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', borderTop: '1px solid #ddd', fontWeight: 'bold' }}>
                    <span className="breakdown-label">Six Facets Average</span>
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

            {scoringData.UnderstandingSkills && (
              <div className="breakdown-section" style={{ marginBottom: '15px' }}>
                <h6>🎯 Understanding Skills</h6>
                <div className="breakdown-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {["AskingQuestions", "ClarifyingAmbiguity", "SummarizingConfirming", "ChallengingIdeas", "ComparingConcepts", "AbstractConcrete"].map(skill => {
                    if (!scoringData.UnderstandingSkills[skill]) return null;
                    const score = scoringData.UnderstandingSkills[skill].score || 0;
                    const color = getScoreColor(score);

                    return (
                      <div key={skill} className="breakdown-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '5px' }}>
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
                  <div className="breakdown-average" style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', borderTop: '1px solid #ddd', fontWeight: 'bold' }}>
                    <span className="breakdown-label">Skills Average</span>
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

            <div className="breakdown-final" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1em' }}>
              <span className="breakdown-label">Final Weighted Score</span>
              <span
                className="breakdown-score"
                style={{ color: overallColor, fontWeight: 'bold' }}
              >
                {calculatedOverallScore.toFixed(1)}/5
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
          width: '800px',
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
                      <div className="message-content" style={{ 
                        backgroundColor: '#007bff', 
                        color: 'white', 
                        padding: '10px 15px', 
                        borderRadius: '15px', 
                        maxWidth: '70%' 
                      }}>
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
                      backgroundColor: '#f8f9fa', 
                      padding: '10px 15px', 
                      borderRadius: '15px', 
                      maxWidth: '70%' 
                    }}>
                      <div className="message-header" style={{ marginBottom: '5px' }}>
                        <span className="message-author" style={{ fontWeight: 'bold', color: '#28a745' }}>AI Mentor</span>
                      </div>
                      <div className="message-text">
                        {hasAssessmentData(message.system) ? (
                          <div>
                            {renderOverallScoreAndSummary(message.system)}
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
              {/* Back Button */}
              <div className="page-header">
                <div className="header-title">
                  <Button variant="secondary" onClick={() => navigate(-1)} style={{ borderRadius: '50px', marginBottom: '20px' }}>
                    <FaArrowLeft className="me-2" /> Back
                  </Button>
                </div>
              </div>

              {/* User Info Card */}
              <Card className="shadow-sm rounded-4 border-primary mb-4">
                <Card.Header className="bg-primary text-white text-center py-3 rounded-top-4">
                  <h4 className="mb-0 fw-bold">
                    Progress of {userData.user.first_name} {userData.user.last_name}
                  </h4>
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
                  <p>View and analyze learning conversations</p>
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
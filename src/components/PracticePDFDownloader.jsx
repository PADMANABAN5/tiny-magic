import React from 'react';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Set up pdfMake fonts
pdfMake.vfs = pdfFonts.vfs;

const PracticePDFDownloader = ({ practiceChatHistory, selectedConcept, first_name, last_name, updated_at }) => {
  // 🧩 Safe emoji removal that never throws
  const removeEmojis = (text) => {
    try {
      // Handle all possible non-string values safely
      if (text === null || text === undefined) return "";
      
      // Convert to string safely for all data types
      let textStr;
      if (typeof text === 'string') {
        textStr = text;
      } else if (typeof text === 'number' || typeof text === 'boolean') {
        textStr = String(text);
      } else if (typeof text === 'object') {
        // Handle objects and arrays by stringifying
        try {
          textStr = JSON.stringify(text);
        } catch {
          textStr = String(text);
        }
      } else {
        textStr = String(text);
      }

      // Double check final type
      if (typeof textStr !== 'string') {
        textStr = String(textStr);
      }

      // Now safely clean emojis and symbols
      return textStr
        .replace(
          /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83D[\uDE00-\uDE4F])/g,
          ""
        )
        .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // Misc Symbols
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Transport
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "") // Flags
        .replace(/[\u{2600}-\u{26FF}]/gu, "")   // Misc
        .replace(/[\u{2700}-\u{27BF}]/gu, "")   // Dingbats
        .replace(/[\u{FE00}-\u{FE0F}]/gu, "")   // Variations
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, "") // Supplemental
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, "") // Extended-A
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
    } catch (err) {
      console.error("⚠️ removeEmojis failed for:", text, err);
      return String(text || "");
    }
  };

  // Normalize score - always ensure string input
  const normalizeScore = (input) => {
    if (input == null) return '';
    const text = String(input);
    return text.replace(/(Score:\s*)([1-5])\b/gi, "$1$2/5");
  };

  // Strip JSON block and headers - always ensure string input
  const stripJsonBlockAndHeaders = (input) => {
    if (input == null) return '';
    const text = String(input);
    let stripped = text.replace(/```json[\s\S]*?```/gi, "").trim();
    stripped = stripped.replace(/### Part 2:.*(\n)?/gi, "").trim();
    return stripped;
  };

  // Clean misformatted lines - always ensure string input
  const cleanMisformattedLines = (input) => {
    if (input == null) return '';
    let text = String(input);
    
    const knownLabels = [
      "Explanation",
      "Interpretation", 
      "Application",
      "Perspective",
      "Empathy",
      "Self-Knowledge",
      "Asking Questions",
      "Clarifying Ambiguity",
      "Summarizing and Confirming",
      "Challenging Ideas",
      "Comparing Concepts",
      "Abstract vs Concrete",
      "Abstract  ",
      "Concrete"
    ];

    const labelPattern = knownLabels.map(label => label.replace(/ /g, "\\s+")).join("|");
    const regex = new RegExp(`^\\s*[-o*]?\\s*(${labelPattern})\\b`, "gim");

    return text.replace(regex, (_, label) => {
      const labelStr = String(label || '');
      return labelStr.replace(/\s+/g, " ");
    });
  };

  // Check if content has practice assessment data
  const hasPracticeAssessmentData = (content) => {
    if (!content) return false;
    const text = String(content);
    return (
      (text.includes("facet_assessments") || text.includes("overall_assessment")) &&
      (text.includes("learner_profile") || text.includes("pattern_analysis"))
    );
  };

  // Extract practice assessment data from content
  const extractPracticeAssessmentData = (content) => {
    try {
      const text = String(content);
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }

      // Fallback: try to find JSON-like structure
      const possibleJson = text.match(/\{[\s\S]*"facet_assessments"[\s\S]*\}/);
      if (possibleJson) {
        return JSON.parse(possibleJson[0]);
      }
      return null;
    } catch (e) {
      console.error("Error parsing practice assessment JSON:", e);
      return null;
    }
  };

  // Calculate overall score for practice assessment
  const calculatePracticeOverallScore = (assessmentData) => {
    if (assessmentData?.overall_assessment?.composite_score) {
      const composite = parseFloat(assessmentData.overall_assessment.composite_score);
      if (!isNaN(composite)) {
        return Math.round(composite * 100) / 100;
      }
    }

    // Calculate from facet scores if composite_score not available
    const facets = assessmentData?.facet_assessments;
    if (facets) {
      const facetScores = [
        parseFloat(facets.explanation?.score) || 0,
        parseFloat(facets.interpretation?.score) || 0,
        parseFloat(facets.application?.score) || 0,
        parseFloat(facets.perspective?.score) || 0,
        parseFloat(facets.empathy?.score) || 0,
        parseFloat(facets.self_knowledge?.score) || 0
      ].filter(score => score > 0);

      if (facetScores.length > 0) {
        const average = facetScores.reduce((sum, score) => sum + score, 0) / facetScores.length;
        return Math.round(average * 100) / 100;
      }
    }

    return 0;
  };

  // Get rating label description
  const getRatingDescription = (rating) => {
    const ratings = {
      "emerging": "Beginning to develop understanding",
      "developing": "Developing foundational skills", 
      "proficient": "Demonstrating solid understanding",
      "advanced": "Showing advanced comprehension",
      "exemplary": "Mastery level understanding"
    };
    return ratings[rating] || String(rating);
  };

  // Helper to add bullet list to content
  const addBulletList = (content, items, style, margin) => {
    if (items && Array.isArray(items) && items.length > 0) {
      items.forEach(item => {
        const safeItem = removeEmojis(item || '');
        content.push({
          text: `   • ${safeItem}`,
          style: style,
          margin: margin,
        });
      });
    }
  };

  // Main PDF generation function
  const handleDownloadPDF = () => {
    console.log('Starting PDF generation. practiceChatHistory:', practiceChatHistory);
    console.log('selectedConcept:', selectedConcept);
    const content = [];
    let practiceAssessmentData = null;

    // Debug: Check what's being passed to removeEmojis
    if (practiceChatHistory && Array.isArray(practiceChatHistory)) {
      console.log('Searching for assessment in chat history...');
      practiceChatHistory.forEach((item, index) => {
        console.log(`Item ${index} - user type:`, typeof item?.user, 'value:', item?.user);
        console.log(`Item ${index} - system type:`, typeof item?.system, 'value:', item?.system);
      });
      
      const assessmentMessage = practiceChatHistory.find(item => {
        console.log('Checking item.system:', item?.system, typeof item?.system);
        return hasPracticeAssessmentData(item?.system);
      });
      console.log('Found assessmentMessage:', assessmentMessage);
      if (assessmentMessage && assessmentMessage.system != null) {
        practiceAssessmentData = extractPracticeAssessmentData(assessmentMessage.system);
        console.log('Extracted practiceAssessmentData:', practiceAssessmentData);
      }
    } else {
      console.log('No valid practiceChatHistory provided.');
    }

    // Title and metadata
    content.push({
      text: "Practice Session Report",
      style: "header",
      margin: [0, 0, 0, 10],
    });

    // Add generation timestamp
    content.push({
      text: `Generated on: ${new Date().toLocaleString()}`,
      style: "metadata",
      margin: [0, 0, 0, 15],
    });

    // Learner Profile Section (if available)
    if (practiceAssessmentData?.learner_profile) {
      content.push({
        text: "Learner Profile",
        style: "sectionHeader",
        margin: [0, 10, 0, 8],
      });

      const profile = practiceAssessmentData.learner_profile;
      console.log('Profile fields:', { concept_assessed: profile.concept_assessed, type: typeof profile.concept_assessed });
      if (profile.concept_assessed != null) {
        content.push({
          text: `Concept Assessed: ${removeEmojis(profile.concept_assessed)}`,
          style: "summaryText",
          margin: [0, 0, 0, 3],
        });
      }
      if (profile.learning_objective != null) {
        content.push({
          text: `Learning Objective: ${removeEmojis(profile.learning_objective)}`,
          style: "summaryText",
          margin: [0, 0, 0, 3],
        });
      }
      if (profile.total_scenarios_completed != null) {
        content.push({
          text: `Total Scenarios Completed: ${removeEmojis(profile.total_scenarios_completed)}`,
          style: "summaryText",
          margin: [0, 0, 0, 3],
        });
      }
      if (profile.session_completion_status != null) {
        content.push({
          text: `Session Completion Status: ${removeEmojis(profile.session_completion_status)}`,
          style: "summaryText",
          margin: [0, 0, 0, 10],
        });
      }
    }

    // Add concept information if available (fallback if no profile)
    if (selectedConcept && !practiceAssessmentData?.learner_profile) {
      console.log('Using fallback concept:', selectedConcept.concept_name, typeof selectedConcept.concept_name);
      const conceptName = selectedConcept.concept_name != null ? removeEmojis(selectedConcept.concept_name) : '';
      content.push({
        text: `Concept: ${conceptName}`,
        style: "subHeader",
        margin: [0, 0, 0, 10],
      });
    }

    // Process practiceChatHistory for conversation section
    if (practiceChatHistory && practiceChatHistory.length > 0) {
      content.push({
        text: "Practice Conversation History",
        style: "sectionHeader",
        margin: [0, 10, 0, 10],
      });

      practiceChatHistory.forEach((item, index) => {
        console.log(`Processing chat item ${index}:`, { user: item.user, type: typeof item.user, system: item.system, type: typeof item.system });
        if (item.user != null) {
          content.push(
            {
              alignment: "right",
              text: "You:",
              style: "userLabel",
              margin: [0, 5, 0, 2],
            },
            {
              alignment: "right",
              text: removeEmojis(item.user),
              style: "userText",
            }
          );
        }

        if (item.system != null) {
          // Check if this is an assessment message - if so, skip it from conversation
          if (hasPracticeAssessmentData(item.system)) {
            return; // Skip assessment messages in conversation history
          }

          // For regular (non-assessment) messages only
          let cleaned = removeEmojis(item.system);
          let normalized = normalizeScore(stripJsonBlockAndHeaders(cleaned));
          normalized = cleanMisformattedLines(normalized);
          cleaned = removeEmojis(normalized);

          content.push(
            {
              alignment: "left",
              text: "AI Mentor:",
              style: "botLabel",
              margin: [0, 10, 0, 2],
            },
            {
              alignment: "left",
              text: cleaned,
              style: "botText",
            }
          );
        }
      });
    } else {
      // Add a message if no conversation history is available
      content.push({
        text: "No conversation history available for this session.",
        style: "summaryText",
        margin: [0, 10, 0, 10],
        italics: true
      });
    }

    // Practice Assessment Results Section (if available)
    if (practiceAssessmentData) {
      content.push({
        text: "Practice Assessment Results",
        style: "header",
        margin: [0, 30, 0, 15],
      });

      // Overall Score FIRST
      const overallScore = calculatePracticeOverallScore(practiceAssessmentData);
      content.push({
        text: `Overall Score: ${overallScore.toFixed(1)}/5`,
        style: "overallScore",
        margin: [0, 0, 0, 15],
      });

      // Overall Assessment SECOND (rating, summary)
      if (practiceAssessmentData.overall_assessment) {
        const overall = practiceAssessmentData.overall_assessment;

        if (overall.overall_rating != null) {
          const rating = String(overall.overall_rating);
          content.push({
            text: `Overall Rating: ${rating.charAt(0).toUpperCase() + rating.slice(1)}`,
            style: "subHeader",
            margin: [0, 0, 0, 5],
          });
          content.push({
            text: getRatingDescription(rating),
            style: "summaryText",
            margin: [0, 0, 0, 5],
          });
        }

        if (overall.summary != null) {
          content.push({
            text: "Summary",
            style: "subHeader",
            margin: [0, 5, 0, 5],
          });
          content.push({
            text: removeEmojis(overall.summary),
            style: "summaryText",
            margin: [0, 0, 0, 20],
          });
        }
      }

      // Six Facets of Understanding THIRD
      if (practiceAssessmentData.facet_assessments) {
        content.push({
          text: "Six Facets of Understanding",
          style: "subHeader",
          margin: [0, 10, 0, 8],
        });

        const facets = [
          { key: "explanation", label: "Explanation" },
          { key: "interpretation", label: "Interpretation" },
          { key: "application", label: "Application" },
          { key: "perspective", label: "Perspective" },
          { key: "empathy", label: "Empathy" },
          { key: "self_knowledge", label: "Self-Knowledge" }
        ];

        facets.forEach(facet => {
          const facetData = practiceAssessmentData.facet_assessments[facet.key];
          if (facetData) {
            const score = facetData.score || 0;
            const rating = facetData.rating_label != null ? String(facetData.rating_label) : "";
            
            content.push({
              text: `${facet.label}: ${score}/5`,
              style: "scoreItem",
              margin: [0, 8, 0, 3],
            });

            if (rating) {
              content.push({
                text: `   Rating: ${rating.charAt(0).toUpperCase() + rating.slice(1)}`,
                style: "scoreDetail",
                margin: [20, 0, 0, 3],
              });
            }

            // Evidence
            addBulletList(content, facetData.evidence, "scoreDetail", [20, 0, 0, 3]);

            // Strengths
            if (facetData.strengths && Array.isArray(facetData.strengths) && facetData.strengths.length > 0) {
              content.push({
                text: "   Strengths:",
                style: "scoreDetail",
                margin: [20, 0, 0, 0],
                bold: true,
              });
              addBulletList(content, facetData.strengths, "scoreDetail", [20, 0, 0, 3]);
            }

            // Growth Opportunities
            if (facetData.growth_opportunities && Array.isArray(facetData.growth_opportunities) && facetData.growth_opportunities.length > 0) {
              content.push({
                text: "   Growth Opportunities:",
                style: "scoreDetail",
                margin: [20, 0, 0, 0],
                bold: true,
              });
              addBulletList(content, facetData.growth_opportunities, "scoreDetail", [20, 0, 0, 3]);
            }

            // Developmental Notes
            if (facetData.developmental_notes != null) {
              content.push({
                text: `   Developmental Notes: ${removeEmojis(facetData.developmental_notes)}`,
                style: "scoreDetail",
                margin: [20, 0, 0, 8],
              });
            }
          }
        });

        // Calculate and display Six Facets Average
        const facetScores = facets
          .map(facet => parseFloat(practiceAssessmentData.facet_assessments[facet.key]?.score) || 0)
          .filter(score => score > 0);
        
        if (facetScores.length > 0) {
          const sixFacetsAvg = facetScores.reduce((sum, score) => sum + score, 0) / facetScores.length;
          content.push({
            text: `Six Facets Average: ${sixFacetsAvg.toFixed(1)}/5`,
            style: "averageScore",
            margin: [0, 8, 0, 15],
          });
        }
      }

      // Pattern Analysis FOURTH
      if (practiceAssessmentData.pattern_analysis) {
        content.push({
          text: "Pattern Analysis",
          style: "subHeader",
          margin: [0, 10, 0, 8],
        });

        const pattern = practiceAssessmentData.pattern_analysis;

        if (pattern.consistent_strengths && Array.isArray(pattern.consistent_strengths) && pattern.consistent_strengths.length > 0) {
          content.push({
            text: "Consistent Strengths:",
            style: "scoreItem",
            margin: [0, 4, 0, 3],
          });
          addBulletList(content, pattern.consistent_strengths, "scoreDetail", [20, 0, 0, 3]);
        }

        if (pattern.recurring_challenges && Array.isArray(pattern.recurring_challenges) && pattern.recurring_challenges.length > 0) {
          content.push({
            text: "Recurring Challenges:",
            style: "scoreItem",
            margin: [0, 8, 0, 3],
          });
          addBulletList(content, pattern.recurring_challenges, "scoreDetail", [20, 0, 0, 3]);
        }

        if (pattern.progression_trajectory != null) {
          content.push({
            text: "Progression Trajectory:",
            style: "scoreItem",
            margin: [0, 8, 0, 3],
          });
          content.push({
            text: removeEmojis(pattern.progression_trajectory),
            style: "scoreDetail",
            margin: [20, 0, 0, 3],
          });
        }

        if (pattern.thinking_style != null) {
          content.push({
            text: "Thinking Style:",
            style: "scoreItem",
            margin: [0, 8, 0, 8],
          });
          content.push({
            text: removeEmojis(pattern.thinking_style),
            style: "scoreDetail",
            margin: [20, 0, 0, 8],
          });
        }
      }

      // Personalized Feedback FIFTH
      if (practiceAssessmentData.personalized_feedback) {
        content.push({
          text: "Personalized Feedback",
          style: "subHeader",
          margin: [0, 15, 0, 8],
        });

        const feedback = practiceAssessmentData.personalized_feedback;

        if (feedback.key_accomplishments && Array.isArray(feedback.key_accomplishments) && feedback.key_accomplishments.length > 0) {
          content.push({
            text: "Key Accomplishments:",
            style: "scoreItem",
            margin: [0, 4, 0, 3],
          });
          addBulletList(content, feedback.key_accomplishments, "scoreDetail", [20, 0, 0, 3]);
        }

        if (feedback.priority_growth_areas && Array.isArray(feedback.priority_growth_areas) && feedback.priority_growth_areas.length > 0) {
          content.push({
            text: "Priority Growth Areas:",
            style: "scoreItem",
            margin: [0, 8, 0, 3],
          });
          feedback.priority_growth_areas.forEach(areaObj => {
            if (areaObj && areaObj.area != null) {
              content.push({
                text: `   • ${removeEmojis(areaObj.area)}`,
                style: "scoreDetail",
                margin: [20, 0, 0, 1],
                bold: true,
              });
            }
            if (areaObj && areaObj.rationale != null) {
              content.push({
                text: `     Rationale: ${removeEmojis(areaObj.rationale)}`,
                style: "scoreDetail",
                margin: [40, 0, 0, 1],
              });
            }
            if (areaObj && areaObj.actionable_steps && Array.isArray(areaObj.actionable_steps) && areaObj.actionable_steps.length > 0) {
              addBulletList(content, areaObj.actionable_steps, "scoreDetail", [40, 0, 0, 3]);
            }
          });
        }

        if (feedback.recommended_practice_focus && Array.isArray(feedback.recommended_practice_focus) && feedback.recommended_practice_focus.length > 0) {
          content.push({
            text: "Recommended Practice Focus:",
            style: "scoreItem",
            margin: [0, 8, 0, 3],
          });
          addBulletList(content, feedback.recommended_practice_focus, "scoreDetail", [20, 0, 0, 3]);
        }

        if (feedback.learning_style_observations != null) {
          content.push({
            text: "Learning Style Observations:",
            style: "scoreItem",
            margin: [0, 8, 0, 3],
          });
          content.push({
            text: removeEmojis(feedback.learning_style_observations),
            style: "scoreDetail",
            margin: [20, 0, 0, 8],
          });
        }
      }

      // Next Steps SIXTH
      if (practiceAssessmentData.next_steps) {
        content.push({
          text: "Next Steps",
          style: "subHeader",
          margin: [0, 15, 0, 8],
        });

        const steps = practiceAssessmentData.next_steps;

        if (steps.immediate_actions && Array.isArray(steps.immediate_actions) && steps.immediate_actions.length > 0) {
          content.push({
            text: "Immediate Actions:",
            style: "scoreItem",
            margin: [0, 4, 0, 3],
          });
          addBulletList(content, steps.immediate_actions, "scoreDetail", [20, 0, 0, 3]);
        }

        if (steps.short_term_goals && Array.isArray(steps.short_term_goals) && steps.short_term_goals.length > 0) {
          content.push({
            text: "Short-term Goals:",
            style: "scoreItem",
            margin: [0, 8, 0, 3],
          });
          addBulletList(content, steps.short_term_goals, "scoreDetail", [20, 0, 0, 3]);
        }

        if (steps.long_term_development != null) {
          let longTermText = steps.long_term_development;
          if (Array.isArray(longTermText)) {
            longTermText = longTermText.join(' ');
          }
          content.push({
            text: "Long-term Development:",
            style: "scoreItem",
            margin: [0, 8, 0, 3],
          });
          content.push({
            text: removeEmojis(longTermText),
            style: "scoreDetail",
            margin: [20, 0, 0, 3],
          });
        }

        if (steps.resources_suggested && Array.isArray(steps.resources_suggested) && steps.resources_suggested.length > 0) {
          content.push({
            text: "Suggested Resources:",
            style: "scoreItem",
            margin: [0, 8, 0, 3],
          });
          addBulletList(content, steps.resources_suggested, "scoreDetail", [20, 0, 0, 8]);
        }
      }

      // Session Metadata SEVENTH (FINAL)
      if (practiceAssessmentData.session_metadata) {
        content.push({
          text: "Session Metadata",
          style: "subHeader",
          margin: [0, 15, 0, 8],
        });

        const metadata = practiceAssessmentData.session_metadata;

        if (metadata.assessment_date != null) {
          content.push({
            text: `Assessment Date: ${removeEmojis(metadata.assessment_date)}`,
            style: "summaryText",
            margin: [0, 0, 0, 3],
          });
        }

        if (metadata.scenarios_by_level) {
          content.push({
            text: "Scenarios by Level:",
            style: "scoreItem",
            margin: [0, 4, 0, 3],
          });
          if (typeof metadata.scenarios_by_level === 'object' && metadata.scenarios_by_level !== null) {
            Object.entries(metadata.scenarios_by_level).forEach(([level, summary]) => {
              console.log('Processing scenarios level:', level, 'summary:', summary, typeof summary);
              const safeSummary = removeEmojis(summary || '');
              content.push({
                text: `   ${level}: ${safeSummary}`,
                style: "scoreDetail",
                margin: [20, 0, 0, 3],
              });
            });
          }
        }

        if (metadata.facet_coverage_completeness != null) {
          content.push({
            text: "Facet Coverage Completeness:",
            style: "scoreItem",
            margin: [0, 8, 0, 3],
          });
          content.push({
            text: removeEmojis(metadata.facet_coverage_completeness),
            style: "scoreDetail",
            margin: [20, 0, 0, 8],
          });
        }
      }
    }

    // Document definition
    const docDefinition = {
      content,
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          alignment: "center",
          color: "#000000"
        },
        sectionHeader: {
          fontSize: 16,
          bold: true,
          color: "#000000",
          margin: [0, 15, 0, 8]
        },
        subHeader: {
          fontSize: 14,
          bold: true,
          color: "#000000",
          margin: [0, 8, 0, 4]
        },
        metadata: {
          fontSize: 10,
          color: "#000000",
          alignment: "left"
        },
        userLabel: {
          fontSize: 12,
          bold: true,
          color: "#007ACC",
        },
        userText: {
          fontSize: 11,
          margin: [0, 0, 0, 8],
          color: "#000000"
        },
        botLabel: {
          fontSize: 12,
          bold: true,
          color: "#27ae60",
        },
        botText: {
          fontSize: 11,
          margin: [0, 0, 0, 12],
          color: "#000000"
        },
        overallScore: {
          fontSize: 16,
          bold: true,
          color: "#e74c3c",
          alignment: "center"
        },
        summaryText: {
          fontSize: 11,
          color: "#000000",
          lineHeight: 1.3
        },
        scoreItem: {
          fontSize: 12,
          bold: true,
          color: "#2980b9"
        },
        scoreDetail: {
          fontSize: 10,
          color: "#000000",
          italics: true
        },
        averageScore: {
          fontSize: 13,
          bold: true,
          color: "#000000"
        }
      },
      defaultStyle: {
        font: "Roboto",
        lineHeight: 1.2
      },
      pageMargins: [40, 60, 40, 60],
    };

    const userFirstName = first_name || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem("firstname") : null) || 'user';
    const userLastName = last_name || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem("lastname") : null) || 'user';
    const conceptNameSafe = selectedConcept?.concept_name != null ? String(selectedConcept.concept_name).replace(/\s+/g, "_") : "no-concept";
    const formattedTimestamp = updated_at
      ? new Date(updated_at).toISOString().replace(/[:.]/g, "-")
      : new Date().toISOString().replace(/[:.]/g, "-");

    const fileName = `${userFirstName}_${userLastName}_${conceptNameSafe}_practice_${formattedTimestamp}.pdf`;
    console.log('Generating PDF with filename:', fileName);

    pdfMake.createPdf(docDefinition).download(fileName);
  };

  return { handleDownloadPDF };
};

export default PracticePDFDownloader;
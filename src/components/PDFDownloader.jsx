import React from 'react';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Set up pdfMake fonts
pdfMake.vfs = pdfFonts.vfs;

const PDFDownloader = ({ chatHistory, practiceChatHistory, selectedConcept, first_name, last_name, updated_at, finalAssessment }) => {
  // Helper function to truncate score to 2 decimal places without rounding
 const truncateScore = (score) => {
  // String-based truncation: Handles JS FP by using toString() for clean decimal rep
  const strScore = score.toString();
  if (!strScore.includes('.')) {
    return `${strScore}.00`;
  }
  const [integerPart, decimalPart] = strScore.split('.');
  const truncatedDecimal = (decimalPart || '').slice(0, 2).padEnd(2, '0');
  return `${integerPart}.${truncatedDecimal}`;
};
const calculateOverallScore = (scoringData) => {
  // Recalc Six Facets avg from full-precision individual scores (ignore JSON's truncated OverallScore)
  const sixFacetScores = [
    scoringData?.SixFacets?.Explanation?.score,
    scoringData?.SixFacets?.Interpretation?.score,
    scoringData?.SixFacets?.Application?.score,
    scoringData?.SixFacets?.Perspective?.score,
    scoringData?.SixFacets?.Empathy?.score,
    scoringData?.SixFacets?.["Self-Knowledge"]?.score
  ].filter(score => typeof score === 'number');

  const sixFacetsAvg = sixFacetScores.length > 0
    ? sixFacetScores.reduce((sum, s) => sum + s, 0) / sixFacetScores.length
    : 0;

  // Recalc Understanding Skills avg from full-precision individual scores
  const skillScores = [
    scoringData?.UnderstandingSkills?.AskingQuestions?.score,
    scoringData?.UnderstandingSkills?.ClarifyingAmbiguity?.score,
    scoringData?.UnderstandingSkills?.SummarizingConfirming?.score,
    scoringData?.UnderstandingSkills?.ChallengingIdeas?.score,
    scoringData?.UnderstandingSkills?.ComparingConcepts?.score,
    scoringData?.UnderstandingSkills?.AbstractConcrete?.score
  ].filter(score => typeof score === 'number');

  const understandingSkillsAvg = skillScores.length > 0
    ? skillScores.reduce((sum, s) => sum + s, 0) / skillScores.length
    : 0;

  // Weighted formula (full precision)
  const finalWeightedScore = (0.6 * sixFacetsAvg) + (0.4 * understandingSkillsAvg);

  // Apply string truncation
  return truncateScore(finalWeightedScore);  // Yields "3.30" for your data
};

  // Helper function to remove emojis
  const removeEmojis = (text) =>
    text.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83D[\uDE00-\uDE4F])/g,
      ""
    ).replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
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

  // Helper function to normalize score format
  const normalizeScore = (text) => {
    return text.replace(/(Score:\s*)([1-5])\b/gi, "$1$2/5");
  };

  // Helper function to strip JSON blocks and headers
  const stripJsonBlockAndHeaders = (text) => {
    let stripped = text.replace(/```json[\s\S]*?```/gi, "").trim();
    stripped = stripped.replace(/### Part 2:.*(\n)?/gi, "").trim();
    return stripped;
  };

  // Helper function to clean misformatted lines
  const cleanMisformattedLines = (text) => {
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

    return text.replace(regex, (_, label) => label.replace(/\s+/g, " "));
  };

  // Extract scoring data from content (updated to match display: always recalculate exact averages)
  const extractScoringData = (content) => {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsedData = JSON.parse(jsonMatch[1]);

        // Always calculate exact averages for Six Facets
        if (parsedData.SixFacets) {
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
            parsedData.SixFacets.OverallScore = average;
          }
        }

        // Always calculate exact averages for Understanding Skills
        if (parsedData.UnderstandingSkills) {
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
            parsedData.UnderstandingSkills.OverallScore = average;
          }
        }

        return parsedData;
      }

      // Fallback: try to find JSON-like structure with new format
      const possibleJson = content.match(/\{[\s\S]*"FinalWeightedScore"[\s\S]*\}/);
      if (possibleJson) {
        const parsedData = JSON.parse(possibleJson[0]);

        // Always calculate exact averages for Six Facets
        if (parsedData.SixFacets) {
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
            parsedData.SixFacets.OverallScore = average;
          }
        }

        // Always calculate exact averages for Understanding Skills
        if (parsedData.UnderstandingSkills) {
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
            parsedData.UnderstandingSkills.OverallScore = average;
          }
        }

        return parsedData;
      }
      return {};
    } catch (e) {
      console.error("Error parsing scoring JSON:", e);
      return {};
    }
  };

  // Calculate overall score (updated to match display: always recalculate and truncate)

  // Check if content has assessment data
  const hasAssessmentData = (content) => {
    return (
      content &&
      (content.includes("Detailed Assessment") || content.includes("Part 1:")) &&
      (content.includes("Deterministic Scoring") || content.includes("Part 2:"))
    );
  };

  // Main PDF generation function
  const handleDownloadPDF = () => {
    const content = [];
    let summaryText = "";
    let assessmentScoringData = null;

    // Find assessment data from chat history
    const assessmentMessage = chatHistory.find(item => hasAssessmentData(item.system));
    if (assessmentMessage) {
      assessmentScoringData = extractScoringData(assessmentMessage.system);
      
      // Extract summary from assessment
      const cleanedAssessment = removeEmojis(assessmentMessage.system);
      const summaryPatterns = [
        /Summary\s*\n([\s\S]*?)(?=Six Facet|Understanding Skills|Targeted Recommendations|$)/i,
        /Learner Journey Summary\s*\n([\s\S]*?)(?=Six Facet|Understanding Skills|$)/i,
        /Constructive Feedback Summary\s*\n([\s\S]*?)(?=Targeted Recommendations|$)/i
      ];
      
      for (const pattern of summaryPatterns) {
        const match = cleanedAssessment.match(pattern);
        if (match && match[1]) {
          summaryText = removeEmojis(match[1]).trim();
          break;
        }
      }
    }

    // Title and metadata
    content.push({
      text: "Learning Session Report",
      style: "header",
      margin: [0, 0, 0, 10],
    });

    // Add generation timestamp - MOVED TO LEFT AND START POSITION
    content.push({
      text: `Generated on: ${new Date().toLocaleString()}`,
      style: "metadata",
      margin: [0, 0, 0, 15],
    });

    // Add concept information if available
    if (selectedConcept) {
      content.push({
        text: `Concept: ${selectedConcept.concept_name}`,
        style: "subHeader",
        margin: [0, 0, 0, 10],
      });
    }

    // Process chatHistory for conversation section
    content.push({
      text: "Conversation History",
      style: "sectionHeader",
      margin: [0, 10, 0, 10],
    });

    chatHistory.forEach((item, index) => {
      if (item.user) {
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

      if (item.system) {
        // Check if this is an assessment message - if so, skip it from conversation
        if (hasAssessmentData(item.system)) {
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

    // Assessment Results Section (if available) - ONLY ADD THIS ONCE
    if (assessmentScoringData && (assessmentScoringData.SixFacets || assessmentScoringData.UnderstandingSkills)) {
      content.push({
        text: "Assessment Results",
        style: "header",
        margin: [0, 30, 0, 15],
      });

      // Overall Score FIRST
      const overallScore = calculateOverallScore(assessmentScoringData);
      content.push({
        text: `Overall Score: ${overallScore}/5`,
        style: "overallScore",
        margin: [0, 0, 0, 15],
      });

      // Summary SECOND (moved to top)
      if (summaryText || assessmentScoringData.EvaluationSummary) {
        content.push({
          text: "Summary",
          style: "subHeader",
          margin: [0, 0, 0, 5],
        });
        content.push({
          text: removeEmojis(summaryText || assessmentScoringData.EvaluationSummary),
          style: "summaryText",
          margin: [0, 0, 0, 20],
        });
      }

      // Six Facets of Understanding THIRD
      if (assessmentScoringData.SixFacets) {
        content.push({
          text: "Six Facets of Understanding",
          style: "subHeader",
          margin: [0, 10, 0, 8],
        });

        const facets = ["Explanation", "Interpretation", "Application", "Perspective", "Empathy", "Self-Knowledge"];
        
        facets.forEach(facet => {
          if (assessmentScoringData.SixFacets[facet]) {
            const facetData = assessmentScoringData.SixFacets[facet];
            const score = facetData.score || 0;
            
            content.push({
              text: `${facet}: ${score}/5`,
              style: "scoreItem",
              margin: [0, 4, 0, 3],
            });
            
            if (facetData.justification) {
              content.push({
                text: `   Why: ${removeEmojis(facetData.justification)}`,
                style: "scoreDetail",
                margin: [20, 0, 0, 2],
              });
            }
            
            if (facetData.example && !facetData.example.includes("No ") && facetData.example.length > 10) {
              content.push({
                text: `   Example: ${removeEmojis(facetData.example)}`,
                style: "scoreDetail",
                margin: [20, 0, 0, 2],
              });
            }
            
            if (facetData.improvement) {
              content.push({
                text: `   How to improve: ${removeEmojis(facetData.improvement)}`,
                style: "scoreDetail",
                margin: [20, 0, 0, 6],
              });
            }
          }
        });

        // Six Facets Average (truncated)
        const sixFacetsAvg = assessmentScoringData.SixFacets.OverallScore;
        if (sixFacetsAvg) {
          content.push({
            text: `Six Facets Average: ${truncateScore(sixFacetsAvg)}/5`,
            style: "averageScore",
            margin: [0, 8, 0, 15],
          });
        }
      }

      // Understanding Skills FOURTH
      if (assessmentScoringData.UnderstandingSkills) {
        content.push({
          text: "Understanding Skills",
          style: "subHeader",
          margin: [0, 10, 0, 8],
        });

        const skills = ["AskingQuestions", "ClarifyingAmbiguity", "SummarizingConfirming", "ChallengingIdeas", "ComparingConcepts", "AbstractConcrete"];
        const skillLabels = {
          "AskingQuestions": "Asking Questions",
          "ClarifyingAmbiguity": "Clarifying Ambiguity", 
          "SummarizingConfirming": "Summarizing and Confirming",
          "ChallengingIdeas": "Challenging Ideas",
          "ComparingConcepts": "Comparing Concepts",
          "AbstractConcrete": "Abstract Vs Concrete"
        };

        skills.forEach(skill => {
          if (assessmentScoringData.UnderstandingSkills[skill]) {
            const skillData = assessmentScoringData.UnderstandingSkills[skill];
            const score = skillData.score || 0;
            const label = skillLabels[skill] || skill;
            
            content.push({
              text: `${label}: ${score}/5`,
              style: "scoreItem",
              margin: [0, 4, 0, 3],
            });
            
            if (skillData.justification) {
              content.push({
                text: `   Why: ${removeEmojis(skillData.justification)}`,
                style: "scoreDetail",
                margin: [20, 0, 0, 2],
              });
            }
            
            if (skillData.example && !skillData.example.includes("No ") && skillData.example.length > 10) {
              content.push({
                text: `   Example: ${removeEmojis(skillData.example)}`,
                style: "scoreDetail",
                margin: [20, 0, 0, 2],
              });
            }
            
            if (skillData.improvement) {
              content.push({
                text: `   How to improve: ${removeEmojis(skillData.improvement)}`,
                style: "scoreDetail",
                margin: [20, 0, 0, 6],
              });
            }
          }
        });

        // Understanding Skills Average - FINAL ITEM (truncated)
        const skillsAvg = assessmentScoringData.UnderstandingSkills.OverallScore;
        if (skillsAvg) {
          content.push({
            text: `Understanding Skills Average: ${truncateScore(skillsAvg)}/5`,
            style: "averageScore",
            margin: [0, 8, 0, 0],
          });
        }
      }
    }
   if (finalAssessment) {
      content.push({
        text: "Final Assessment",
        style: "header",
        margin: [0, 30, 0, 15],
      });

      // Overall Performance
      if (finalAssessment.overall_performance) {
        content.push({
          text: `Overall Performance: ${finalAssessment.overall_performance}`,
          style: "subHeader",
          margin: [0, 5, 0, 10],
        });
      }

      // Facet Ratings
if (finalAssessment.facet_ratings) {
  content.push({
    text: "Facet Ratings",
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
    const value = finalAssessment.facet_ratings[facet.key];
    if (value) {
      content.push({
        text: `${facet.label}: ${value}`,
        style: "scoreItem",
        margin: [0, 4, 0, 3],
      });
    }
  });
}


      // Key Patterns
      if (finalAssessment.key_patterns && finalAssessment.key_patterns.length > 0) {
        content.push({
          text: "Key Patterns",
          style: "subHeader",
          margin: [0, 15, 0, 8],
        });

        finalAssessment.key_patterns.forEach(pattern => {
          content.push({
            text: `• ${removeEmojis(pattern)}`,
            style: "summaryText",
            margin: [10, 2, 0, 2],
          });
        });
      }

      // Recommended Focus Areas
      if (finalAssessment.recommended_focus_areas && finalAssessment.recommended_focus_areas.length > 0) {
        content.push({
          text: "Recommended Focus Areas",
          style: "subHeader",
          margin: [0, 15, 0, 8],
        });

        finalAssessment.recommended_focus_areas.forEach(area => {
          content.push({
            text: `• ${removeEmojis(area)}`,
            style: "summaryText",
            margin: [10, 2, 0, 2],
          });
        });
      }

      // Personalized Next Steps
      if (finalAssessment.personalized_next_steps && finalAssessment.personalized_next_steps.length > 0) {
        content.push({
          text: "Personalized Next Steps",
          style: "subHeader",
          margin: [0, 15, 0, 8],
        });

        finalAssessment.personalized_next_steps.forEach(step => {
          content.push({
            text: `• ${removeEmojis(step)}`,
            style: "summaryText",
            margin: [10, 2, 0, 2],
          });
        });
      }

      // Session Summary
      if (finalAssessment.session_summary) {
        content.push({
          text: "Session Summary",
          style: "subHeader",
          margin: [0, 15, 0, 8],
        });

        content.push({
          text: removeEmojis(finalAssessment.session_summary),
          style: "summaryText",
          margin: [0, 0, 0, 15],
        });
      }
    }

    // NOTHING ELSE ADDED AFTER THIS POINT

    // Document definition
    const docDefinition = {
      content,
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          alignment: "center",
          color: "#2c3e50"
        },
        sectionHeader: {
          fontSize: 16,
          bold: true,
          color: "#34495e",
          margin: [0, 15, 0, 8]
        },
        subHeader: {
          fontSize: 14,
          bold: true,
          color: "#2980b9",
          margin: [0, 8, 0, 4]
        },
        metadata: {
          fontSize: 10,
          color: "#7f8c8d",
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
          color: "#2c3e50"
        },
        botLabel: {
          fontSize: 12,
          bold: true,
          color: "#27ae60",
        },
        botText: {
          fontSize: 11,
          margin: [0, 0, 0, 12],
          color: "#2c3e50"
        },
        overallScore: {
          fontSize: 16,
          bold: true,
          color: "#e74c3c",
          alignment: "center"
        },
        summaryText: {
          fontSize: 11,
          color: "#2c3e50",
          lineHeight: 1.3
        },
        scoreItem: {
          fontSize: 12,
          bold: true,
          color: "#2980b9"
        },
        scoreDetail: {
          fontSize: 10,
          color: "#7f8c8d",
          italics: true
        },
        averageScore: {
          fontSize: 13,
          bold: true,
          color: "#8e44ad"
        },
        calculationDetail: {
          fontSize: 11,
          color: "#2c3e50"
        },
        finalScore: {
          fontSize: 14,
          bold: true,
          color: "#e74c3c"
        }
      },
      defaultStyle: {
        font: "Roboto",
        lineHeight: 1.2
      },
      pageMargins: [40, 60, 40, 60],
    };

   const userFirstName = first_name || sessionStorage.getItem("firstname");
   const userLastName = last_name || sessionStorage.getItem("lastname");
   const conceptName = selectedConcept?.concept_name?.replace(/\s+/g, "_") || "no-concept";
   const formattedTimestamp = updated_at
  ? new Date(updated_at).toISOString().replace(/[:.]/g, "-")
  : new Date().toISOString().replace(/[:.]/g, "-");

   const fileName = `${userFirstName}_${userLastName}_${conceptName}_${formattedTimestamp}.pdf`;


    pdfMake.createPdf(docDefinition).download(fileName);
  };

  return { handleDownloadPDF };
};

export default PDFDownloader;
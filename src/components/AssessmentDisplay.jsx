import React from 'react';

// Utility function to check if content has assessment data
export const hasAssessmentData = (content) => {
  return (
    content &&
    (content.includes("Detailed Assessment") || content.includes("Part 1:")) &&
    (content.includes("Deterministic Scoring") || content.includes("Part 2:"))
  );
};

// Extract scoring data from assessment content
export const extractScoringData = (content) => {
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      const parsedData = JSON.parse(jsonMatch[1]);

      // ✅ Always calculate averages fresh for Six Facets
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

      // ✅ Always calculate averages fresh for Understanding Skills
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

    // Fallback for inline JSON
    const possibleJson = content.match(/\{[\s\S]*"FinalWeightedScore"[\s\S]*\}/);
    if (possibleJson) {
      const parsedData = JSON.parse(possibleJson[0]);

      // ✅ Always recalc Six Facets
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

      // ✅ Always recalc Understanding Skills
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


// Helper to truncate score to 2 decimal places using slice (no rounding)
const truncateScore = (score) => {
  // Convert to string with high precision to avoid float artifacts
  const strScore = score.toString();
  if (!strScore.includes('.')) {
    return `${strScore}.00`;
  }
  const [integerPart, decimalPart] = strScore.split('.');
  const truncatedDecimal = (decimalPart || '').slice(0, 2).padEnd(2, '0');
  return `${integerPart}.${truncatedDecimal}`;
};

export const calculateOverallScore = (scoringData) => {
  // Compute Six Facets average manually
  const sixFacetScores = [
    scoringData?.SixFacets?.Explanation?.score,
    scoringData?.SixFacets?.Interpretation?.score,
    scoringData?.SixFacets?.Application?.score,
    scoringData?.SixFacets?.Perspective?.score,
    scoringData?.SixFacets?.Empathy?.score,
    scoringData?.SixFacets?.["Self-Knowledge"]?.score
  ].filter(score => typeof score === 'number');

  const sixFacetsAvg =
    sixFacetScores.length > 0
      ? sixFacetScores.reduce((sum, s) => sum + s, 0) / sixFacetScores.length
      : 0;

  // Compute Understanding Skills average manually
  const skillScores = [
    scoringData?.UnderstandingSkills?.AskingQuestions?.score,
    scoringData?.UnderstandingSkills?.ClarifyingAmbiguity?.score,
    scoringData?.UnderstandingSkills?.SummarizingConfirming?.score,
    scoringData?.UnderstandingSkills?.ChallengingIdeas?.score,
    scoringData?.UnderstandingSkills?.ComparingConcepts?.score,
    scoringData?.UnderstandingSkills?.AbstractConcrete?.score
  ].filter(score => typeof score === 'number');

  const understandingSkillsAvg =
    skillScores.length > 0
      ? skillScores.reduce((sum, s) => sum + s, 0) / skillScores.length
      : 0;

  // Weighted formula (60% facets + 40% skills)
  const finalWeightedScore = (0.6 * sixFacetsAvg) + (0.4 * understandingSkillsAvg);

  // Truncate to 2 decimal places without rounding
  return parseFloat(truncateScore(finalWeightedScore));
};

// Get score color based on score value
export const getScoreColor = (score) => {
  if (score === 5) return '#10b981'; // Green for Masterful
  if (score >= 4) return '#10b981'; // Green for Strong
  if (score >= 3) return '#3b82f6'; // Blue for Developing
  if (score >= 2) return '#f59e0b'; // Yellow for Emerging
  return '#ef4444'; // Red for Absent/Minimal
};

// Get score label based on score value
export const getScoreLabel = (score) => {
  if (score === 5) return 'Masterful';
  if (score >= 4) return 'Strong';
  if (score >= 3) return 'Developing';
  if (score >= 2) return 'Emerging';
  return 'Absent/Minimal';
};

// Format criterion name from camelCase to readable format
export const formatCriterionName = (name) => {
  // Handle special cases
  if (name === 'AbstractConcrete') {
    return 'Abstract vs Concrete';
  } 
  return name.replace(/([A-Z])/g, ' $1').trim();
};

// Parse assessment content to extract detailed assessment part
export const parseAssessmentContent = (content) => {
  const detailedAssessmentHeader = "Part 1: 🌟 Detailed Assessment 📝";
  const deterministicScoringHeader = "Part 2: Deterministic Scoring (JSON Format) 📊";

  const part1Index = content.indexOf(detailedAssessmentHeader);
  if (part1Index === -1) {
    // Try alternative headers
    const altHeader = "### Part 1: 🌟 Detailed Assessment";
    const altPart1Index = content.indexOf(altHeader);
    if (altPart1Index === -1) {
      return content;
    }
    const assessmentStart = altPart1Index + altHeader.length;
    const part2Index = content.indexOf("### Part 2: Deterministic Scoring");
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

// Component to render the scoring table
export const ScoringTable = ({ content }) => {
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

// Component to render overall score and summary
export const OverallScoreAndSummary = ({ content }) => {
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
            <span className="score-value">{truncateScore(calculatedOverallScore)}/5</span>
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
                    {sixFacetsAvg ? truncateScore(sixFacetsAvg) : '0.00'}/5
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
                    {skillsAvg ? truncateScore(skillsAvg) : '0.00'}/5
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
              {truncateScore(calculatedOverallScore)}/5
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component to render complete assessment display
const AssessmentDisplay = ({ content }) => {
  if (!hasAssessmentData(content)) {
    return <div>{content}</div>;
  }

  return (
    <div className="assessment-display">
      {/* Overall Score and Summary */}
      <OverallScoreAndSummary content={content} />

      {/* Scoring Table */}
      <ScoringTable content={content} />
    </div>
  );
};

export default AssessmentDisplay;
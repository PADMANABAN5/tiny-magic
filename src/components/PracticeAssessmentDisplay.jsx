import React from 'react';

// Utility function to check if content has practice assessment data
export const hasPracticeAssessmentData = (content) => {
  if (!content) return false;

  // Check for JSON code block or direct JSON
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      return !!(
        parsed.learner_profile || 
        parsed.facet_assessments || 
        parsed.overall_assessment || 
        parsed.pattern_analysis ||
        parsed.personalized_feedback ||
        parsed.next_steps ||
        parsed.session_metadata
      );
    } catch (e) {
      return false;
    }
  }

  // Fallback: Try direct JSON parse
  try {
    const parsed = JSON.parse(content);
    return !!(
      parsed.learner_profile || 
      parsed.facet_assessments || 
      parsed.overall_assessment
    );
  } catch (e) {
    return false;
  }
};

// Extract practice assessment data from content
export const extractPracticeAssessmentData = (content) => {
  try {
    // Try to extract JSON from code block
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Direct parse if no code block
    return JSON.parse(content);
  } catch (e) {
    console.error("Error parsing practice assessment JSON:", e);
    return {};
  }
};

// Truncate number to 2 decimal places without rounding
export const truncateToTwoDecimals = (num) => {
  return Math.floor(num * 100) / 100;
};

// Calculate overall score as average of facet scores
// Calculate overall score as average of all six facet scores (insufficient data = 0)
export const calculatePracticeOverallScore = (assessmentData) => {
  const facets = assessmentData.facet_assessments || {};
  
  // All six facets that should contribute to the weighted average
  const facetKeys = ['explanation', 'interpretation', 'application', 'perspective', 'empathy', 'self_knowledge'];
  
  let totalScore = 0;

  facetKeys.forEach(key => {
    const facet = facets[key];
    let score = 0; // Default to 0 if insufficient data
    
    // Only use the facet score if it exists and is valid
    if (facet && facet.score !== undefined && facet.score !== null) {
      const parsedScore = parseFloat(facet.score);
      if (!isNaN(parsedScore)) {
        score = parsedScore;
      }
    }
    // If insufficient data, score remains 0
    
    totalScore += score;
  });

  // Always divide by 6 to get the proper weighted average
  // This ensures each missing facet contributes 0 to the average
  return totalScore / 6;
};
// Get score color based on score (1-5 scale)
export const getPracticeScoreColor = (score) => {
  if (score >= 4) return '#10b981'; // Green
  if (score >= 3) return '#3b82f6'; // Blue
  if (score >= 2) return '#f59e0b'; // Yellow
  return '#ef4444'; // Red
};

// Get score label based on score
export const getPracticeScoreLabel = (score) => {
  if (score === 5) return 'Masterful';
  if (score >= 4) return 'Strong';
  if (score >= 3) return 'Developing';
  if (score >= 2) return 'Emerging';
  return 'Absent/Minimal';
};


// Format facet name to readable format
export const formatPracticeFacetName = (name) => {
  const nameMap = {
    explanation: 'Explanation',
    interpretation: 'Interpretation',
    application: 'Application',
    perspective: 'Perspective',
    empathy: 'Empathy',
    self_knowledge: 'Self-Knowledge'
  };
  return nameMap[name] || name.charAt(0).toUpperCase() + name.slice(1);
};

// Component to render facet assessments
export const PracticeFacetAssessmentsTable = ({ assessmentData }) => {
  const facets = assessmentData.facet_assessments || {};
  const profile = assessmentData.learner_profile || {};

  return (
    <div className="practice-assessment-facet-table">
        <div className='overall-score-card'>
      <div className="scoring-header">
        <h4>📊 Facet Assessments</h4>
        <div className="profile-summary">
          <p><strong>Concept:</strong> {profile.concept_assessed || 'N/A'}</p>
          <p><strong>Objective:</strong> {profile.learning_objective || 'N/A'}</p>
          <p><strong>Scenarios Completed:</strong> {profile.total_scenarios_completed || '0'}</p>
          <p><strong>Session Status:</strong> {profile.session_completion_status || 'N/A'}</p>
        </div>
      </div>

      <div className="scoring-grid">
        {Object.entries(facets).map(([key, facet]) => {
          const scoreValue = parseFloat(facet.score || 0);
          const truncatedScore = truncateToTwoDecimals(scoreValue);
          const scoreColor = getPracticeScoreColor(scoreValue);
          const label = facet.rating_label || getPracticeScoreLabel(scoreValue);

          return (
            <div key={key} className="score-card">
              <div className="score-card-header">
                <h6 className="criterion-name">{formatPracticeFacetName(key)}</h6>
                <div className="score-badge" style={{ backgroundColor: scoreColor }}>
                  <span>{truncatedScore}/5</span>
                  
                </div>
              </div>
              {facet.evidence && facet.evidence.length > 0 && (
                <div className="score-evidence">
                  <p><strong>📝 Evidence:</strong></p>
                  <ul>
                    {facet.evidence.map((ev, idx) => <li key={idx}>{ev}</li>)}
                  </ul>
                </div>
              )}
              {facet.strengths && facet.strengths.length > 0 && (
                <div className="score-justification">
                  <p><strong>✅ Strengths:</strong></p>
                  <ul>
                    {facet.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                  </ul>
                </div>
              )}
              {facet.growth_opportunities && facet.growth_opportunities.length > 0 && (
                <div className="score-example">
                  <p><strong>🚀 Growth Opportunities:</strong></p>
                  <ul>
                    {facet.growth_opportunities.map((g, idx) => <li key={idx}>{g}</li>)}
                  </ul>
                </div>
              )}
              {facet.developmental_notes && (
                <div className="score-improvement">
                  <p><strong>📚 Notes:</strong> {facet.developmental_notes}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
};

// Component to render overall assessment and other sections
export const PracticeOverallAssessmentSummary = ({ assessmentData }) => {
  const overall = assessmentData.overall_assessment || {};
  const pattern = assessmentData.pattern_analysis || {};
  const personalized = assessmentData.personalized_feedback || {};
  const nextSteps = assessmentData.next_steps || {};
  const metadata = assessmentData.session_metadata || {};

  const calculatedOverallScore = calculatePracticeOverallScore(assessmentData);
  const truncatedOverallScore = truncateToTwoDecimals(calculatedOverallScore);
  const overallColor = getPracticeScoreColor(calculatedOverallScore);

  return (
    <div className="practice-overall-assessment">
      <div className="overall-score-card">
        <div className="overall-header">
          <h4>🎯 Overall Assessment</h4>
          <div className="overall-score-badge" style={{ backgroundColor: overallColor }}>
            <span className="score-value">{truncatedOverallScore}/5</span>
          </div>
        </div>
        <div className="overall-summary">
          <h5>📋 Summary</h5>
          <p>{overall.summary || 'Assessment based on session analysis.'}</p>
        </div>

        {/* Pattern Analysis */}
        {Object.keys(pattern).length > 0 && (
            <div className="score-card" >
          <div className="pattern-section">
            <h5 style={{textAlign:"center"}}><strong>🔍 Pattern Analysis</strong></h5>
            {pattern.consistent_strengths && pattern.consistent_strengths.length > 0 && (
              <>
                <p><strong>✅ Consistent Strengths:</strong></p>
                <ul>{pattern.consistent_strengths.map((s, idx) => <li key={idx}>{s}</li>)}</ul>
              </>
            )}
            {pattern.recurring_challenges && pattern.recurring_challenges.length > 0 && (
              <>
                <p><strong>⚠️ Recurring Challenges:</strong></p>
                <ul>{pattern.recurring_challenges.map((c, idx) => <li key={idx}>{c}</li>)}</ul>
              </>
            )}
            {pattern.progression_trajectory && (
              <p><strong>📈 Progression Trajectory:</strong> {pattern.progression_trajectory}</p>
            )}
            {pattern.thinking_style && (
              <p><strong>🧠 Thinking Style:</strong> {pattern.thinking_style}</p>
            )}
          </div>
          </div>
        )}

        {/* Personalized Feedback */}
        {Object.keys(personalized).length > 0 && (
            <div className="score-card" style={{ marginTop: "20px" }}>
          <div className="feedback-section">
            <h5 style={{textAlign:"center"}}><strong>💡 Personalized Feedback</strong></h5>
            {personalized.key_accomplishments && personalized.key_accomplishments.length > 0 && (
              <>
                <p><strong>🏆 Key Accomplishments:</strong></p>
                <ul>{personalized.key_accomplishments.map((a, idx) => <li key={idx}>{a}</li>)}</ul>
              </>
            )}
            {personalized.priority_growth_areas && personalized.priority_growth_areas.length > 0 && (
              <>
                <p><strong>🎯 Priority Growth Areas:</strong></p>
                {personalized.priority_growth_areas.map((area, idx) => (
                  <div key={idx} className="growth-area">
                    <h6>{area.area}: {area.rationale}</h6>
                    <p><strong>Actionable Steps:</strong></p>
                    <ul>
                      {area.actionable_steps.map((step, sidx) => <li key={sidx}>{step}</li>)}
                    </ul>
                  </div>
                ))}
              </>
            )}
            {personalized.recommended_practice_focus && personalized.recommended_practice_focus.length > 0 && (
              <>
                <p><strong>📚 Recommended Practice Focus:</strong></p>
                <ul>{personalized.recommended_practice_focus.map((f, idx) => <li key={idx}>{f}</li>)}</ul>
              </>
            )}
            {personalized.learning_style_observations && (
              <p><strong>👁️ Learning Style Observations:</strong> {personalized.learning_style_observations}</p>
            )}
          </div>
          </div>
        )}

        {/* Next Steps */}
        {Object.keys(nextSteps).length > 0 && (
            <div className="score-card" style={{ marginTop: '20px' }}>
          <div className="next-steps-section">
            <h5 style={{textAlign:"center"}}><strong>🚀 Next Steps</strong></h5>
            {nextSteps.immediate_actions && nextSteps.immediate_actions.length > 0 && (
              <>
                <p><strong>⚡ Immediate Actions:</strong></p>
                <ul>{nextSteps.immediate_actions.map((a, idx) => <li key={idx}>{a}</li>)}</ul>
              </>
            )}
            {nextSteps.short_term_goals && nextSteps.short_term_goals.length > 0 && (
              <>
                <p><strong>📅 Short-Term Goals:</strong></p>
                <ul>{nextSteps.short_term_goals.map((g, idx) => <li key={idx}>{g}</li>)}</ul>
              </>
            )}
            {nextSteps.long_term_development && (
              <p><strong>🌟 Long-Term Development:</strong> {nextSteps.long_term_development}</p>
            )}
            {nextSteps.resources_suggested && nextSteps.resources_suggested.length > 0 && (
              <>
                <p><strong>📖 Suggested Resources:</strong></p>
                <ul>{nextSteps.resources_suggested.map((r, idx) => <li key={idx}>{r}</li>)}</ul>
              </>
            )}
          </div>
          </div>
        )}

        {/* Session Metadata */}
        {Object.keys(metadata).length > 0 && (
            <div className="score-card" style={{ marginTop: "20px" }}>
          <div className="metadata-section">
            <h5 style={{textAlign:"center"}}><strong>📅 Session Metadata</strong></h5>
            {metadata.scenarios_by_level && Object.keys(metadata.scenarios_by_level).length > 0 && (
              <>
                <p><strong>Scenarios by Level:</strong></p>
                <ul>
                  {Object.entries(metadata.scenarios_by_level).map(([level, desc]) => (
                    <li key={level}><strong>Level {level}:</strong> {desc}</li>
                  ))}
                </ul>
              </>
            )}
            {metadata.facet_coverage_completeness && (
              <p><strong>Facet Coverage:</strong> {metadata.facet_coverage_completeness}</p>
            )}
          </div>
          </div>
        )}
      </div>

    </div>
  );
};

// Main component for Practice Assessment Display
const PracticeAssessmentDisplay = ({ content }) => {
  if (!hasPracticeAssessmentData(content)) {
    return <div>{content}</div>; // Fallback to raw content if not assessment
  }

  const assessmentData = extractPracticeAssessmentData(content);

  return (
    <div className="practice-assessment-display">
      {/* Overall Assessment and Summary */}
      <PracticeOverallAssessmentSummary assessmentData={assessmentData} />

      {/* Facet Assessments Table */}
      <PracticeFacetAssessmentsTable assessmentData={assessmentData} />
    </div>
  );
};

export default PracticeAssessmentDisplay;
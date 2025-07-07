import React from "react";
import "../styles/Progressbar.css";

const Progressbar = ({ currentStage, showOnlyStages = false }) => {
  const stages = [
    { stage: 1, icon: "🥇" },
    { stage: 2, icon: "🥈"  },
    { stage: 3, icon: "🥉"  },
    { stage: 4, icon: "🎖️"  },
    { stage: 5, icon: "🏆"  },
  ];

  // If showOnlyStages is true, render simplified version for dashboard
  if (showOnlyStages) {
    return (
      <div className="stages-only-container">
        {stages.map((stage, index) => {
          // Updated logic for new stage mapping:
          // currentStage 0 = Not started (no stages highlighted)
          // currentStage 1 = Just started (no stages highlighted yet)
          // currentStage 2 = Stage 1 highlighted (current)
          // currentStage 3 = Stage 1 completed, Stage 2 current
          // currentStage 7 = All completed
          
          const isCompleted = currentStage > (stage.stage + 1); // Stages completed
          const isCurrent = currentStage === (stage.stage + 1);  // Current stage
          
          return (
            <div 
              key={index}
              className={`stage-mini ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <div className="stage-mini-icon">{stage.icon}</div>
              <span className="stage-mini-label">Stage {stage.stage}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="vertical-progress-container">
      <div className="progress-header">
        <h4>Learning Journey</h4>
        <span className="progress-indicator">
          {currentStage === 0 ? "Not Started" :
           currentStage === 1 ? "Getting Started" : 
           currentStage === 7 ? "Completed" : 
           `Stage ${currentStage - 1} of 5`}
        </span>
      </div>

      <div className="vertical-milestone-bar">
        <div className="progress-line-bg"></div>
        
        {/* Active Progress Line */}
        <div
          className="progress-line-active"
          style={{
            height: `${Math.min(Math.max(((currentStage - 1) / 6) * 100, 0), 100)}%`
          }}
        ></div>

        {stages.map((stage, index) => {
          // Updated logic for new stage mapping:
          // currentStage 0 = Not started (no stages active)
          // currentStage 1 = Just started (no stages active yet)
          // currentStage 2 = Stage 1 current
          // currentStage 3 = Stage 1 completed, Stage 2 current
          // currentStage 7 = All completed
          
          const isCompleted = currentStage > (stage.stage + 1);
          const isCurrent = currentStage === (stage.stage + 1);
          const isUpcoming = currentStage < (stage.stage + 1);

          return (
            <div
              className={`vertical-stage ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
              key={index}
            >
              <div className="stage-content">
                <div className="stage-circle">
                  {isCompleted ? (
                    <span className="check-icon">✓</span>
                  ) : (
                    <span className="stage-number">{stage.stage}</span>
                  )}
                </div>

                <div className="stage-info">
                  <div className="stage-title">
                    <span className="stage-emoji">{stage.icon}</span>
                    <span className="stage-label">Stage {stage.stage}</span>
                  </div>
                  <div className="stage-description">
                    <span className="stage-subtitle">{stage.label}</span>
                  </div>
                </div>
              </div>

              {/* Pulse animation for current stage */}
              {isCurrent && (
                <div className="pulse-ring"></div>
              )}
              
              {/* Green glow effect for completed stages */}
              {isCompleted && (
                <div className="completion-glow"></div>
              )}
            </div>
          );
        })}
      </div>

      <div className="progress-footer">
        <div className="progress-bar-mini">
          <div
            className="progress-fill-mini"
            style={{
              width: `${Math.min(Math.max(((currentStage - 1) / 6) * 100, 0), 100)}%`
            }}
          ></div>
        </div>
        <span className="progress-percentage">
          {currentStage === 0 ? "0%" :
           currentStage === 1 ? "5%" :
           currentStage === 7 ? "100%" : 
           `${Math.round(((currentStage - 1) / 6) * 100)}%`} Complete
        </span>
      </div>
    </div>
  );
};

export default Progressbar;
import React from "react";
import "../styles/Progressbar.css";

const Progressbar = ({ currentStage }) => {
  const stages = [
    { label: "Not Started", isMain: true, position: "bottom" },
    { label: "In Progress", isMain: true, position: "bottom" },
    { label: "stage 1", isMain: false, position: "bottom" },
    { label: "stage 2", isMain: false, position: "bottom" },
    { label: "stage 3", isMain: false, position: "bottom" },
    { label: "stage 4", isMain: false, position: "bottom" },
    { label: "stage 5", isMain: false, position: "bottom" },
    { label: "Completed", isMain: true, position: "bottom" },
  ];

  let subStageCounter = 0;

  return (
    <div className="milestone-bar">
      {stages.map((stage, index) => {
        const isCompleted = index <= currentStage;
        const isCurrent = index === currentStage;

        // Increment subStageCounter for display (only for sub stages)
        let displayNumber = "";
        if (!stage.isMain) {
          subStageCounter += 1;
          displayNumber = subStageCounter;
        }

        return (
          <div className="stage" key={index}>
            {stage.position === "top" && (
              <div
                className={`label ${stage.position} ${
                  isCompleted ? "label-completed" : ""
                } ${stage.isMain ? "main-label" : ""}`}
              >
                {stage.label}
              </div>
            )}

            <div
              className={`circle ${stage.isMain ? "main" : "sub"} ${
                isCompleted ? "completed" : ""
              } ${isCurrent ? "current" : ""}`}
            >
              {stage.isMain ? '★' : displayNumber}
            </div>

            {stage.position === "bottom" && (
              <div
                className={`label ${stage.position} ${
                  isCompleted ? "label-completed" : ""
                } ${stage.isMain ? "main-label" : ""}`}
              >
                {stage.label}
              </div>
            )}

           {index < stages.length - 1 && (
  <div
    className={`connector ${
      index < currentStage ? "connector-completed" : ""
    }`}
  />
)}
          </div>
        );
      })}
    </div>
  );
};

export default Progressbar;

import React, { useEffect, useState } from 'react';
import '../styles/dashboard.css';

const StageCompletionToast = ({ stage }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (stage > 0) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Dismiss after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [stage]);

  if (!isVisible) return null;

  return (
    <div className="stage-completion-modal-overlay">
      <div className="stage-completion-modal">
        <div className="stage-completion-content">
          <h3>🎉 Congratulations! 🎉</h3>
          <p>You reached Stage {stage}!</p>
          <div className="confetti"></div>
        </div>
      </div>
    </div>
  );
};

export default StageCompletionToast;
import React, { useEffect, useState } from 'react';
import '../styles/dashboard.css';

const LevelCompletionToast = ({ level, levelName }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (level > 0) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Dismiss after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [level]);

  if (!isVisible) return null;

  return (
    <div className="level-completion-modal-overlay">
      <div className="level-completion-modal">
        <div className="level-completion-content">
          <h3>{levelName}</h3>
          <p>
            You are in Level {level}!
          </p>
          <div className="confetti"></div>
        </div>
      </div>
    </div>
  );
};

export default LevelCompletionToast;
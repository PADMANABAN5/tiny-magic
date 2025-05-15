import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/top-right-corner.css';

function TopRightDropdown({ onPromptSelect }) {
  const prompts = [
    'Assessment Prompt',
    'Concept Prompt'
  ];

  return (
    <div className="position-absolute top-0 end-0 m-3">
      <div className="dropdown">
        <button
          className="btn btn-secondary dropdown-toggle"
          type="button"
          id="dropdownMenuButton"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          Prompts
        </button>
        <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuButton">
          {prompts.map((prompt, index) => (
            <React.Fragment key={prompt}>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => onPromptSelect(prompt)}
                >
                  {prompt}
                </button>
              </li>
              {index !== prompts.length - 1 && <li><hr className="dropdown-divider" /></li>}
            </React.Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default TopRightDropdown;

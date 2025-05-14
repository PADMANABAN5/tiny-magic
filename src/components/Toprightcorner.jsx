import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/top-right-corner.css';

function TopRightDropdown({ onModelSelect }) {
  const models = [
    'Gemini 2.0 pro',
    'llama3.2:1b',
    'mistral',
    'llama3.2:7b'
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
          Models
        </button>
        <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuButton">
          {models.map((model, index) => (
            <React.Fragment key={model}>
              <li>
                <button
                  className="dropdown-item"
                  onClick={() => onModelSelect(model)}
                >
                  {model}
                </button>
              </li>
              {index !== models.length - 1 && <li><hr className="dropdown-divider" /></li>}
            </React.Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default TopRightDropdown;

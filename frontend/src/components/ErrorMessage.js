import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const ErrorMessage = ({ message = 'Something went wrong', onRetry }) => {
  return (
    <div className="error-message-container">
      <AlertTriangle className="error-message-icon" size={40} />
      <h3 className="error-message-title">Error Loading Data</h3>
      <p className="error-message-text">{message}</p>
      {onRetry && (
        <button className="error-message-retry" onClick={onRetry}>
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;

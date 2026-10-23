import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading data...' }) => {
  return (
    <div className="loading-spinner-container">
      <Loader2 className="loading-spinner-icon" size={40} />
      <p className="loading-spinner-message">{message}</p>
    </div>
  );
};

export default LoadingSpinner;

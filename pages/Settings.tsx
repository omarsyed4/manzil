import React from 'react';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <h1 className="text-3xl font-bold text-dark-text mb-6">Settings</h1>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-dark-text">Preferences</h3>
              <p className="text-dark-text-secondary">
                Settings coming soon...
              </p>
            </div>
          </div>
          
          <div className="mt-8">
            <button onClick={() => navigate('/today')} className="btn-primary">
              Back to Today
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

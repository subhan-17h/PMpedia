import React, { useState } from 'react';
import './ProcessProposal.css';

const ProcessProposal = () => {
  const [selectedScenario, setSelectedScenario] = useState('');
  const [formData, setFormData] = useState({
    projectName: '',
    duration: '',
    teamSize: '',
    requirements: '',
    additionalContext: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const scenarios = {
    'custom-software': {
      title: 'Custom Software Development Project',
      icon: '💻',
      description: 'Well-defined requirements, <6 months, <7 team members',
      defaultDuration: '< 6 months',
      defaultTeamSize: '< 7 members',
      color: '#4285f4'
    },
    'innovative-product': {
      title: 'Innovative Product Development Project',
      icon: '🚀',
      description: 'R&D-heavy, uncertain outcomes, ~1 year duration',
      defaultDuration: '~1 year',
      defaultTeamSize: 'Variable',
      color: '#9c27b0'
    },
    'government-project': {
      title: 'Large Government Project',
      icon: '🏛️',
      description: 'Civil, electrical, and IT components, 2-year duration',
      defaultDuration: '2 years',
      defaultTeamSize: 'Large (multiple teams)',
      color: '#238636'
    }
  };

  const handleScenarioSelect = (scenario) => {
    setSelectedScenario(scenario);
    setResult(null);
    setError(null);
    
    // Pre-fill default values
    setFormData({
      projectName: '',
      duration: scenarios[scenario].defaultDuration,
      teamSize: scenarios[scenario].defaultTeamSize,
      requirements: '',
      additionalContext: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedScenario || !formData.projectName || !formData.requirements) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/process-proposal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario: selectedScenario,
          scenarioInfo: scenarios[selectedScenario],
          ...formData
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate process proposal: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);

    } catch (err) {
      setError(err.message);
      console.error('Error generating process proposal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedScenario('');
    setFormData({
      projectName: '',
      duration: '',
      teamSize: '',
      requirements: '',
      additionalContext: ''
    });
    setResult(null);
    setError(null);
  };

  const renderProcessProposal = () => {
    if (!result) return null;

    return (
      <div className="process-result">
        <div className="result-header">
          <div className="result-title-section">
            <span className="result-icon">{scenarios[selectedScenario].icon}</span>
            <div>
              <h2>{formData.projectName}</h2>
              <p className="result-scenario">{scenarios[selectedScenario].title}</p>
            </div>
          </div>
          <button className="reset-btn" onClick={handleReset}>
            🔄 New Proposal
          </button>
        </div>

        <div className="result-content">
          <div className="result-sections">
            {result.analysis && result.analysis.split(/\*\*\d+\.\s+/g).filter(Boolean).map((section, index) => {
              // Extract section title and content
              const lines = section.split('\n');
              const title = lines[0].replace(/\*\*/g, '').replace(/\*/g, '').trim();
              const content = lines.slice(1).join('\n').trim();

              if (!title || !content) return null;

              // Helper function to clean markdown formatting
              const cleanMarkdown = (text) => {
                return text
                  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // Bold
                  .replace(/\*(.+?)\*/g, '<em>$1</em>') // Italic
                  .replace(/`(.+?)`/g, '<code>$1</code>'); // Code
              };

              return (
                <div key={index} className="result-section">
                  <div className="section-header">
                    <span className="section-number">{index + 1}</span>
                    <h3>{title}</h3>
                  </div>
                  <div className="section-content">
                    {content.split('\n\n').map((paragraph, pIndex) => {
                      // Check if it's a list
                      if (paragraph.includes('\n- ') || paragraph.includes('\n* ')) {
                        const items = paragraph.split('\n').filter(line => 
                          line.trim().startsWith('-') || line.trim().startsWith('*')
                        );
                        return (
                          <ul key={pIndex} className="content-list">
                            {items.map((item, iIndex) => {
                              const cleanText = item.replace(/^[-*]\s*/, '').trim();
                              return (
                                <li 
                                  key={iIndex}
                                  dangerouslySetInnerHTML={{ __html: cleanMarkdown(cleanText) }}
                                />
                              );
                            })}
                          </ul>
                        );
                      }
                      
                      // Regular paragraph
                      if (paragraph.trim()) {
                        return (
                          <p 
                            key={pIndex}
                            dangerouslySetInnerHTML={{ __html: cleanMarkdown(paragraph.trim()) }}
                          />
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {result.citations && (
            <div className="citations-section">
              <h3>📚 Standards Referenced</h3>
              <div className="citations-content">
                <p>{result.citations}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="process-proposal-container">
      {!selectedScenario && (
        <div className="scenario-selection">
          <div className="section-header-main">
            <h1>🎯 Process Proposal & Tailoring</h1>
            <p className="section-subtitle">
              Design end-to-end project processes tailored to specific scenarios using PMBOK, PRINCE2, and ISO standards
            </p>
          </div>

          <div className="scenarios-grid">
            {Object.entries(scenarios).map(([key, scenario]) => (
              <div 
                key={key}
                className="scenario-card"
                onClick={() => handleScenarioSelect(key)}
                style={{ borderColor: scenario.color }}
              >
                <div className="scenario-icon" style={{ color: scenario.color }}>
                  {scenario.icon}
                </div>
                <h3>{scenario.title}</h3>
                <p>{scenario.description}</p>
                <div className="scenario-details">
                  <span>⏱️ {scenario.defaultDuration}</span>
                  <span>👥 {scenario.defaultTeamSize}</span>
                </div>
                <button className="select-scenario-btn" style={{ backgroundColor: scenario.color }}>
                  Select Scenario
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedScenario && !result && (
        <div className="proposal-form-container">
          <div className="form-header">
            <button className="back-btn-small" onClick={handleReset}>
              ← Back
            </button>
            <div className="selected-scenario-header">
              <span className="scenario-icon-large" style={{ color: scenarios[selectedScenario].color }}>
                {scenarios[selectedScenario].icon}
              </span>
              <div>
                <h2>{scenarios[selectedScenario].title}</h2>
                <p>{scenarios[selectedScenario].description}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="proposal-form">
            <div className="form-group">
              <label htmlFor="projectName">
                Project Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleInputChange}
                placeholder="Enter your project name"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="duration">
                  Project Duration <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="e.g., 6 months"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="teamSize">
                  Team Size <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="teamSize"
                  name="teamSize"
                  value={formData.teamSize}
                  onChange={handleInputChange}
                  placeholder="e.g., 5-7 members"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="requirements">
                Project Requirements & Objectives <span className="required">*</span>
              </label>
              <textarea
                id="requirements"
                name="requirements"
                value={formData.requirements}
                onChange={handleInputChange}
                placeholder="Describe the key requirements, objectives, and constraints of your project..."
                rows="5"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="additionalContext">
                Additional Context (Optional)
              </label>
              <textarea
                id="additionalContext"
                name="additionalContext"
                value={formData.additionalContext}
                onChange={handleInputChange}
                placeholder="Any additional information that might help in tailoring the process (e.g., industry constraints, stakeholder requirements, compliance needs)..."
                rows="4"
              />
            </div>

            {error && (
              <div className="error-banner">
                <span>⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={handleReset}>
                Cancel
              </button>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Generating Process...
                  </>
                ) : (
                  <>
                    ✨ Generate Process Proposal
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div className="loading-overlay-process">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Analyzing standards and tailoring process...</p>
            <p className="loading-subtext">This may take a moment</p>
          </div>
        </div>
      )}

      {result && renderProcessProposal()}
    </div>
  );
};

export default ProcessProposal;

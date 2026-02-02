import React from 'react';
import { Job } from '../services/api';
import './ResultSelection.css';

interface ResultSelectionProps {
  job: Job;
  onSelectionMade?: (updatedJob: Job) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

const ResultSelection: React.FC<ResultSelectionProps> = ({
  job,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) => {

  return (
    <div className="result-selection-container">
      {/* Header with Job Info */}
      <div className="result-header">
        <div className="result-info">
          <h2 className="result-title">Generation Result</h2>
          <div className="result-meta">
            <span className="result-region">{job.region}</span>
            <span className="result-separator">•</span>
            <span className="result-scenario">{job.scenario}</span>
            <span className="result-separator">•</span>
            <span className="result-view-type">{job.view_type?.toUpperCase()} VIEW</span>
            <span className="result-separator">•</span>
            <span className={`result-status status-${job.status}`}>
              {job.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Navigation for Previous/Next Jobs */}
        {(hasPrevious || hasNext) && (
          <div className="job-navigation">
            <button
              onClick={onPrevious}
              disabled={!hasPrevious}
              className="nav-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="nav-button"
            >
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="help-text">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>Compare the original and simulation side-by-side.</span>
      </div>

      {/* 2 Images in One Row */}
      <div className="images-comparison-row two-columns">
        {/* Original Image */}
        <div className="image-column original-column">
          <div className="column-header">
            <h3>ORIGINAL</h3>
          </div>
          <div className="image-container">
            {job.original_image_url ? (
              <img src={job.original_image_url} alt="Original" />
            ) : (
              <div className="no-image">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>No image</span>
              </div>
            )}
          </div>
        </div>

        {/* Simulation */}
        <div className="image-column result-column">
          <div className="column-header">
            <h3>SIMULATION ({job.view_type?.toUpperCase()})</h3>
          </div>
          <div className="image-container">
            {job.simulation_url ? (
              <img src={job.simulation_url} alt={`Simulation - ${job.view_type}`} />
            ) : (
              <div className="no-image">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>No simulation</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultSelection;

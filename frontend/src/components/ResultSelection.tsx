import React, { useState } from 'react';
import { Job, jobAPI } from '../services/api';
import './ResultSelection.css';

interface ResultSelectionProps {
  job: Job;
  onSelectionMade?: (job: Job) => void;
}

const ResultSelection: React.FC<ResultSelectionProps> = ({ job, onSelectionMade }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selecting, setSelecting] = useState(false);

  const results = [
    {
      key: 'simulation1' as const,
      url: job.simulation1_url,
      title: 'Result 1',
    },
    {
      key: 'simulation2' as const,
      url: job.simulation2_url,
      title: 'Result 2',
    },
  ];

  const handleSelectResult = async () => {
    const selection = results[currentSlide].key;

    try {
      setSelecting(true);
      const response = await jobAPI.selectResult(job.id, selection);
      if (onSelectionMade) {
        onSelectionMade(response.job);
      }
      alert(`✓ ${results[currentSlide].title} selected!`);
    } catch (error) {
      alert('Failed to save selection');
    } finally {
      setSelecting(false);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % results.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + results.length) % results.length);
  };

  return (
    <div className="result-selection-container">
      <div className="selection-header">
        <h2>Select Your Best Result</h2>
        <p>Compare both results and choose your favorite</p>
      </div>

      {/* Slider */}
      <div className="slider-container">
        <button className="nav-btn prev" onClick={prevSlide} aria-label="Previous">
          ‹
        </button>

        <div className="slider-content">
          {results.map((result, index) => (
            <div
              key={result.key}
              className={`slide ${index === currentSlide ? 'active' : ''}`}
              style={{ display: index === currentSlide ? 'block' : 'none' }}
            >
              <div className="result-image-container">
                {result.url ? (
                  <img src={result.url} alt={result.title} />
                ) : (
                  <div className="no-image">No simulation available</div>
                )}
              </div>

              <div className="result-info">
                <h3>{result.title}</h3>
                <p className="scenario">{job.scenario.replace(/-/g, ' ')}</p>
                {job.selected_simulation === result.key && (
                  <span className="selected-badge">✓ Currently Selected</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button className="nav-btn next" onClick={nextSlide} aria-label="Next">
          ›
        </button>
      </div>

      {/* Slide Indicators */}
      <div className="slide-indicators">
        {results.map((result, index) => (
          <button
            key={result.key}
            className={`indicator ${index === currentSlide ? 'active' : ''} ${
              job.selected_simulation === result.key ? 'selected' : ''
            }`}
            onClick={() => goToSlide(index)}
          >
            {result.title}
            {job.selected_simulation === result.key && ' ✓'}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          className="select-button"
          onClick={handleSelectResult}
          disabled={selecting}
        >
          {selecting ? 'Selecting...' : `Select ${results[currentSlide].title}`}
        </button>
      </div>

      {/* Side by Side Comparison View */}
      <div className="comparison-view">
        <h3>Side by Side Comparison</h3>
        <div className="comparison-grid">
          {results.map((result) => (
            <div
              key={result.key}
              className={`comparison-item ${
                job.selected_simulation === result.key ? 'selected' : ''
              }`}
            >
              <div className="comparison-image">
                {result.url ? (
                  <img src={result.url} alt={result.title} />
                ) : (
                  <div className="no-image">No image</div>
                )}
              </div>
              <div className="comparison-info">
                <h4>{result.title}</h4>
                {job.selected_simulation === result.key && (
                  <span className="badge">Selected ✓</span>
                )}
              </div>
              <button
                className={`select-btn ${
                  job.selected_simulation === result.key ? 'selected' : ''
                }`}
                onClick={async () => {
                  try {
                    setSelecting(true);
                    const response = await jobAPI.selectResult(job.id, result.key);
                    if (onSelectionMade) {
                      onSelectionMade(response.job);
                    }
                    alert(`✓ ${result.title} selected!`);
                  } catch (error) {
                    alert('Failed to save selection');
                  } finally {
                    setSelecting(false);
                  }
                }}
                disabled={selecting}
              >
                {job.selected_simulation === result.key ? 'Selected ✓' : 'Select This'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Original Image Reference */}
      <div className="original-reference">
        <h3>Original Image</h3>
        <div className="original-image-container">
          {job.original_image_url ? (
            <img src={job.original_image_url} alt="Original" />
          ) : (
            <div className="no-image">No original image</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultSelection;

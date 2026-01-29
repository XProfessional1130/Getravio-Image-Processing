import React, { useEffect, useState } from 'react';
import { jobAPI, Job, JobFilters } from '../services/api';
import './JobHistory.css';

interface JobHistoryProps {
  onViewJob?: (job: Job) => void;
}

const JobHistory: React.FC<JobHistoryProps> = ({ onViewJob }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [filters, setFilters] = useState<JobFilters>({
    status: '',
    favorites: false,
    date_from: '',
    date_to: '',
    search: '',
  });

  useEffect(() => {
    loadJobs();
  }, [filters]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const response = await jobAPI.getJobs(filters);
      setJobs(response.results);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (jobId: string) => {
    try {
      await jobAPI.toggleFavorite(jobId);
      // Reload jobs to reflect the change
      loadJobs();
    } catch (err: any) {
      alert('Failed to toggle favorite');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job?')) {
      return;
    }

    try {
      await jobAPI.deleteJob(jobId);
      // Remove from list
      setJobs(jobs.filter((j) => j.id !== jobId));
    } catch (err: any) {
      alert('Failed to delete job');
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      favorites: false,
      date_from: '',
      date_to: '',
      search: '',
    });
  };

  return (
    <div className="job-history-container">
      <div className="history-header">
        <h1>Generation History</h1>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="date_from">From Date</label>
            <input
              type="date"
              id="date_from"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="date_to">To Date</label>
            <input
              type="date"
              id="date_to"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="search">Search</label>
            <input
              type="text"
              id="search"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by region or scenario..."
            />
          </div>

          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={filters.favorites}
                onChange={(e) => setFilters({ ...filters, favorites: e.target.checked })}
              />
              <span>Favorites Only</span>
            </label>
          </div>

          <div className="filter-group">
            <button className="clear-button" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Jobs Grid */}
      {loading ? (
        <div className="loading">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <p>No jobs found</p>
          {(filters.status || filters.favorites || filters.search) && (
            <button onClick={clearFilters}>Clear filters to see all jobs</button>
          )}
        </div>
      ) : (
        <div className="jobs-grid">
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-image">
                {job.original_image_url ? (
                  <img src={job.original_image_url} alt="Original" />
                ) : (
                  <div className="image-placeholder">No Image</div>
                )}
              </div>

              <div className="job-info">
                <div className="job-header">
                  <span className={`status-badge ${job.status}`}>{job.status}</span>
                  <button
                    className={`favorite-btn ${job.is_favorite ? 'active' : ''}`}
                    onClick={() => handleToggleFavorite(job.id)}
                    title={job.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {job.is_favorite ? '★' : '☆'}
                  </button>
                </div>

                <div className="job-details">
                  <p className="job-date">{new Date(job.created_at).toLocaleDateString()}</p>
                  <p className="job-scenario">{job.scenario.replace(/-/g, ' ')}</p>
                  {job.selected_simulation && (
                    <p className="job-selection">
                      Selected: {job.selected_simulation.replace('simulation', 'Result ')}
                    </p>
                  )}
                </div>

                <div className="job-actions">
                  {onViewJob && (
                    <button className="view-btn" onClick={() => onViewJob(job)}>
                      View Results
                    </button>
                  )}
                  <button className="delete-btn" onClick={() => handleDeleteJob(job.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobHistory;

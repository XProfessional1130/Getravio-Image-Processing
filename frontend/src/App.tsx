import { useState, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import { jobAPI, adminAPI, Job } from "./services/api";
import { useJobWebSocket, ProgressData } from "./hooks/useJobWebSocket";
import Login from "./components/Login";
import Register from "./components/Register";
import ImageComparison from "./components/ImageComparison";
import JobHistory from "./components/JobHistory";
import Profile from "./components/Profile";
import ResultSelection from "./components/ResultSelection";
import ClientManagement from "./components/ClientManagement";
import "./components/JobHistory.css";

type AuthView = 'login' | 'register';
type AppPage = 'upload' | 'history' | 'profile' | 'result' | 'clients' | 'client-jobs' | 'client-job-detail';

function App() {
  const { isAuthenticated, isLoading, login, register, logout, user } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentPage, setCurrentPage] = useState<AppPage>('upload');
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [selectedClient, setSelectedClient] = useState<{ id: number; username: string } | null>(null);
  const [clientJobs, setClientJobs] = useState<Job[]>([]);
  const [selectedClientJob, setSelectedClientJob] = useState<Job | null>(null);

  // WebSocket handler for real-time job updates
  const handleJobUpdate = useCallback((updatedJob: Job) => {
    console.log('[App] Received job update via WebSocket:', updatedJob);

    // Update current job if it matches
    if (currentJob?.id === updatedJob.id) {
      setCurrentJob(updatedJob);
    }

    // Update selected job if it matches
    if (selectedJob?.id === updatedJob.id) {
      setSelectedJob(updatedJob);
    }

    // Clear progress when job is completed
    if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
      setProgress(null);
    }
  }, [currentJob?.id, selectedJob?.id]);

  // WebSocket handler for real-time progress updates
  const handleProgressUpdate = useCallback((jobId: string, progressData: ProgressData) => {
    console.log('[App] Received progress update:', jobId, progressData);

    // Only update progress for the current job
    if (currentJob?.id === jobId || selectedJob?.id === jobId) {
      setProgress(progressData);
    }
  }, [currentJob?.id, selectedJob?.id]);

  // Connect to WebSocket for real-time updates (only when authenticated)
  useJobWebSocket({
    onJobUpdate: handleJobUpdate,
    onProgressUpdate: handleProgressUpdate,
    onConnect: () => console.log('[App] WebSocket connected'),
    onDisconnect: () => console.log('[App] WebSocket disconnected'),
    onError: (error) => console.error('[App] WebSocket error:', error)
  });

  const handleLogin = async (credentials: { email: string; password: string }) => {
    await login(credentials);
  };

  const handleRegister = async (data: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    await register(data);
  };

  const handleLogout = () => {
    logout();
    setCurrentJob(null);
    setSelectedJob(null);
    setUploadedFile(null);
    setCurrentPage('upload');
  };

  const handleImageUpload = (file: File) => {
    setUploadedFile(file);

    // Create preview URL for immediate display
    const imageUrl = URL.createObjectURL(file);
    const previewJob: Job = {
      id: `preview-${Date.now()}`,
      region: 'gluteal',
      scenario: 'projection-level-1',
      view_type: 'rear',
      status: 'draft',
      message: '',
      original_image_url: imageUrl,
      is_favorite: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCurrentJob(previewJob);
  };

  const handleJobSubmit = async (jobData: { region: string; scenario: string; view_type: string; message: string }) => {
    if (!uploadedFile) {
      alert("Please upload an image first");
      return;
    }

    // Immediately set status to queued to disable button and show loading
    if (currentJob) {
      setCurrentJob({
        ...currentJob,
        status: 'queued',
        region: jobData.region,
        scenario: jobData.scenario,
        view_type: jobData.view_type as 'rear' | 'side',
        message: jobData.message
      });
    }

    try {
      // Create FormData for backend submission
      const formData = new FormData();
      formData.append('original_image', uploadedFile);
      formData.append('region', jobData.region);
      formData.append('scenario', jobData.scenario);
      formData.append('view_type', jobData.view_type);
      if (jobData.message) {
        formData.append('message', jobData.message);
      }

      // Submit to backend API
      const createdJob = await jobAPI.createJob(formData);

      // Set current job but stay on upload page to show progress
      setCurrentJob(createdJob);

      console.log('Job created successfully:', createdJob);

      // No need to poll - WebSocket will send real-time updates
    } catch (error: any) {
      console.error('Job submission error:', error);
      alert(error.response?.data?.error || 'Failed to submit job. Please try again.');

      // Reset to draft status on error
      if (currentJob) {
        setCurrentJob({
          ...currentJob,
          status: 'draft'
        });
      }
    }
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setCurrentPage('result');
  };

  const handleSelectionMade = (updatedJob: Job) => {
    setSelectedJob(updatedJob);
    setCurrentJob(updatedJob);
  };

  const handleBackToUpload = () => {
    setCurrentPage('upload');
    setUploadedFile(null);
    setCurrentJob(null);
    setSelectedJob(null);
    setProgress(null);
  };

  const handleViewClientJobs = async (userId: number, username: string) => {
    try {
      const jobs = await adminAPI.getUserJobs(userId);
      setSelectedClient({ id: userId, username });
      setClientJobs(jobs);
      setCurrentPage('client-jobs');
    } catch (error) {
      console.error('Failed to load client jobs:', error);
      alert('Failed to load client jobs');
    }
  };

  const handleBackToClients = () => {
    setCurrentPage('clients');
    setSelectedClient(null);
    setClientJobs([]);
    setSelectedClientJob(null);
  };

  const handleViewClientJobDetail = (job: Job) => {
    console.log('[App] handleViewClientJobDetail called with job:', job);
    console.log('[App] selectedClient:', selectedClient);
    setSelectedClientJob(job);
    setCurrentPage('client-job-detail');
  };

  const handleBackToClientJobs = () => {
    setCurrentPage('client-jobs');
    setSelectedClientJob(null);
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-600 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    if (authView === 'register') {
      return (
        <Register
          onRegister={handleRegister}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }

    return (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthView('register')}
      />
    );
  }

  // Main app view (authenticated)
  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80')",
          opacity: 0.8
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-white/90 via-blue-50/80 to-purple-50/70" />

      {/* Content */}
      <div className="relative z-10">
        <header className="bg-white/80 backdrop-blur-lg border-b border-blue-100/50 px-4 sm:px-6 md:px-8 py-4 sm:py-5 shadow-sm transition-all duration-200">
          <div className="max-w-[1600px] mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-bold text-lg sm:text-xl">G</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Getravio
              </h1>
            </div>

            {/* Navigation Menu */}
            <nav className="hidden md:flex items-center gap-4">
              <button
                onClick={() => setCurrentPage('upload')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'upload'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                Upload
              </button>
              {/* {!user?.is_superuser && ( */}
                <button
                  onClick={() => setCurrentPage('history')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === 'history'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  History
                </button>
              {/* )} */}
              {user?.is_superuser && (
                <button
                  onClick={() => setCurrentPage('clients')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    currentPage === 'clients'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-blue-50'
                  }`}
                >
                  Clients
                </button>
              )}
              <button
                onClick={() => setCurrentPage('profile')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'profile'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                Profile
              </button>
            </nav>

            <button
              onClick={handleLogout}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/30"
            >
              Logout
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="md:hidden flex items-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage('upload')}
              className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                currentPage === 'upload'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-blue-50'
              }`}
            >
              Upload
            </button>
            {!user?.is_superuser && (
              <button
                onClick={() => setCurrentPage('history')}
                className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  currentPage === 'history'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                History
              </button>
            )}
            <button
              onClick={() => setCurrentPage('profile')}
              className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                currentPage === 'profile'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-blue-50'
              }`}
            >
              Profile
            </button>
            {user?.is_superuser && (
              <button
                onClick={() => setCurrentPage('clients')}
                className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  currentPage === 'clients'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                Clients
              </button>
            )}
          </nav>
        </header>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
          {/* Debug info - remove later */}
          {console.log('[App] Current state:', { currentPage, selectedClient, selectedClientJob: selectedClientJob?.id, isSuperuser: user?.is_superuser })}
          {/* Page Content */}
          {currentPage === 'upload' && (
            <div>
              {currentJob && (
                <button
                  onClick={() => {
                    setCurrentJob(null);
                    setUploadedFile(null);
                  }}
                  className="mb-4 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-all duration-200"
                >
                  + New Upload
                </button>
              )}
              <ImageComparison
                job={currentJob}
                progress={progress}
                onHandleJobSubmit={handleJobSubmit}
                onImageUpload={handleImageUpload}
              />
            </div>
          )}

          {currentPage === 'history' && (
            <JobHistory onViewJob={handleViewJob} />
          )}

          {currentPage === 'profile' && (
            <Profile />
          )}

          {currentPage === 'clients' && user?.is_superuser && (
            <ClientManagement onViewUserJobs={handleViewClientJobs} />
          )}

          {currentPage === 'client-jobs' && user?.is_superuser && selectedClient && (
            <div className="job-history-container">
              <button
                onClick={handleBackToClients}
                className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-all duration-200"
              >
                &larr; Back to Clients
              </button>
              <div className="history-header">
                <h1>Job History for {selectedClient.username}</h1>
              </div>

              {clientJobs.length === 0 ? (
                <div className="empty-state">
                  <p>No jobs found for this client</p>
                </div>
              ) : (
                <div className="jobs-grid">
                  {clientJobs.map((job) => (
                    <div key={job.id} className="job-card" style={{ cursor: 'pointer' }} onClick={() => handleViewClientJobDetail(job)}>
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
                          <span className={`favorite-btn ${job.is_favorite ? 'active' : ''}`}>
                            {job.is_favorite ? '★' : '☆'}
                          </span>
                        </div>

                        <div className="job-details">
                          <p className="job-date">{new Date(job.created_at).toLocaleDateString()}</p>
                          <p className="job-scenario">{job.scenario.replace(/-/g, ' ')}</p>
                          <p className="job-view-type">
                            View: {job.view_type?.toUpperCase() || 'N/A'}
                          </p>
                        </div>

                        <div className="job-actions">
                          <button className="view-btn" onClick={(e) => { e.stopPropagation(); handleViewClientJobDetail(job); }}>
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentPage === 'client-job-detail' && user?.is_superuser && selectedClientJob && selectedClient && (
            <div>
              {console.log('[App] Rendering client-job-detail page', { selectedClientJob, selectedClient })}
              <button
                onClick={handleBackToClientJobs}
                className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-all duration-200"
              >
                &larr; Back to {selectedClient.username}'s Jobs
              </button>

              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6">
                {/* Job Info Header */}
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {selectedClientJob.scenario.replace(/-/g, ' ')}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Region: {selectedClientJob.region} | View: {selectedClientJob.view_type?.toUpperCase() || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Created: {new Date(selectedClientJob.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedClientJob.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : selectedClientJob.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : selectedClientJob.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedClientJob.status}
                      </span>
                      {selectedClientJob.is_favorite && (
                        <span className="text-yellow-500 text-xl">★</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Images Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Original Image */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-700 text-center">Original Image</h3>
                    <div className="relative bg-gray-100 rounded-xl overflow-hidden aspect-[3/4] flex items-center justify-center">
                      {selectedClientJob.original_image_url ? (
                        <img
                          src={selectedClientJob.original_image_url}
                          alt="Original"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <p className="text-gray-400">No original image</p>
                      )}
                    </div>
                  </div>

                  {/* Simulation Image */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-700 text-center">Simulation Result</h3>
                    <div className="relative bg-gray-100 rounded-xl overflow-hidden aspect-[3/4] flex items-center justify-center">
                      {selectedClientJob.simulation_url ? (
                        <img
                          src={selectedClientJob.simulation_url}
                          alt="Simulation"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-gray-400">
                          {selectedClientJob.status === 'processing' ? (
                            <div>
                              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                              <p>Processing...</p>
                            </div>
                          ) : selectedClientJob.status === 'failed' ? (
                            <p className="text-red-400">Generation failed</p>
                          ) : (
                            <p>No simulation yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message if any */}
                {selectedClientJob.message && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Message:</span> {selectedClientJob.message}
                    </p>
                  </div>
                )}

                {/* Error message if failed */}
                {selectedClientJob.status === 'failed' && selectedClientJob.error_message && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-600">
                      <span className="font-medium">Error:</span> {selectedClientJob.error_message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentPage === 'result' && selectedJob && (
            <div>
              <button
                onClick={handleBackToUpload}
                className="mb-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-all duration-200"
              >
                &larr; Back to Upload
              </button>
              <ResultSelection
                job={selectedJob}
                onSelectionMade={handleSelectionMade}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

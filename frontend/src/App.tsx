import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { jobAPI, Job } from "./services/api";
import Login from "./components/Login";
import Register from "./components/Register";
import ImageComparison from "./components/ImageComparison";
import JobHistory from "./components/JobHistory";
import Profile from "./components/Profile";
import ResultSelection from "./components/ResultSelection";

type AuthView = 'login' | 'register';
type AppPage = 'upload' | 'history' | 'profile' | 'result';

function App() {
  const { isAuthenticated, isLoading, login, register, logout } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentPage, setCurrentPage] = useState<AppPage>('upload');
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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
      status: 'draft',
      message: '',
      original_image_url: imageUrl,
      is_favorite: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCurrentJob(previewJob);
  };

  const handleJobSubmit = async (jobData: { region: string; scenario: string, message: string }) => {
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
        message: jobData.message
      });
    }

    try {
      // Create FormData for backend submission
      const formData = new FormData();
      formData.append('original_image', uploadedFile);
      formData.append('region', jobData.region);
      formData.append('scenario', jobData.scenario);
      if (jobData.message) {
        formData.append('message', jobData.message);
      }

      // Submit to backend API
      const createdJob = await jobAPI.createJob(formData);

      // Set current job and switch to result view
      setCurrentJob(createdJob);
      setSelectedJob(createdJob);
      setCurrentPage('result');

      console.log('Job created successfully:', createdJob);

      // Start polling for job status updates
      startPollingJob(createdJob.id);
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

  // Poll job status until completed or failed
  const startPollingJob = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const updatedJob = await jobAPI.getJob(jobId);

        // Update current job with latest status
        setCurrentJob(updatedJob);
        if (selectedJob?.id === jobId) {
          setSelectedJob(updatedJob);
        }

        // Stop polling if job is completed or failed
        if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
          clearInterval(pollInterval);
          console.log(`Job ${jobId} finished with status: ${updatedJob.status}`);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollInterval);
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup after 5 minutes (prevent infinite polling)
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 5 * 60 * 1000);
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
          </nav>
        </header>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
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

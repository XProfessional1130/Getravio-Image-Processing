import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { jobAPI } from "./services/api";
import Login from "./components/Login";
import Register from "./components/Register";
import ImageComparison from "./components/ImageComparison";

interface Job {
  id: string;
  timestamp: string;
  region: string;
  scenario: string;
  file: File;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  originalImage?: string;
  simulation1?: string;
  simulation2?: string;
}

type AuthView = 'login' | 'register';

function App() {
  const { isAuthenticated, isLoading, login, register, logout } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
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
    setUploadedFile(null);
    setJobs([]);
  };

  const handleImageUpload = (file: File) => {
    setUploadedFile(file);

    // Create immediate preview by creating a temporary job
    const imageUrl = URL.createObjectURL(file);
    const previewJob: Job = {
      id: `preview-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      region: 'gluteal',
      scenario: 'projection-level-1',
      file: file,
      status: 'queued',
      originalImage: imageUrl,
    };
    setCurrentJob(previewJob);
  };

  const handleJobSubmit = async (jobData: { region: string; scenario: string, message: string }) => {
    if (!uploadedFile) {
      alert("Please upload an image first");
      return;
    }

    try {
      // Create preview URL for immediate display
      const imageUrl = URL.createObjectURL(uploadedFile);

      // Create temporary job to show in UI
      const tempJob: Job = {
        id: `temp-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        region: jobData.region,
        scenario: jobData.scenario,
        file: uploadedFile,
        status: "processing",
        originalImage: imageUrl,
      };

      setCurrentJob(tempJob);
      setJobs([tempJob, ...jobs]);

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

      // Update job with backend response
      const updatedJob: Job = {
        id: createdJob.id,
        timestamp: new Date(createdJob.created_at).toLocaleString(),
        region: createdJob.region,
        scenario: createdJob.scenario,
        file: uploadedFile,
        status: createdJob.status,
        originalImage: createdJob.original_image_url || imageUrl,
        simulation1: createdJob.simulation1_url,
        simulation2: createdJob.simulation2_url,
      };

      // Replace temporary job with real job
      setCurrentJob(updatedJob);
      setJobs(prevJobs => prevJobs.map(job =>
        job.id === tempJob.id ? updatedJob : job
      ));

      console.log('Job created successfully:', createdJob);
    } catch (error: any) {
      console.error('Job submission error:', error);
      alert(error.response?.data?.error || 'Failed to submit job. Please try again.');

      // Reset to queued status on error
      if (currentJob) {
        setCurrentJob({ ...currentJob, status: 'failed' });
      }
    }
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
            <button
              onClick={handleLogout}
              className="bg-pink-500 hover:bg-pink-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-sm font-semibold shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/30"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
          <ImageComparison job={currentJob} onHandleJobSubmit={handleJobSubmit} onImageUpload={handleImageUpload} />
          {/* <JobHistory jobs={jobs} onViewJob={handleViewJob} /> */}
        </div>
      </div>
    </div>
  );
}

export default App;

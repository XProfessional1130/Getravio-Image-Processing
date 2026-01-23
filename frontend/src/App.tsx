import { useState } from "react";
import Login from "./components/Login";
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleLogin = (credentials: { email: string; password: string }) => {
    // Phase 0: Simple authentication (backend will validate)
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentJob(null);
    setUploadedFile(null);
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

  const handleJobSubmit = (jobData: { region: string; scenario: string, message: string }) => {
    if (!uploadedFile) {
      alert("Please upload an image first");
      return;
    }

    // Create preview URL for the uploaded image
    const imageUrl = URL.createObjectURL(uploadedFile);

    // Add job to history
    const newJob: Job = {
      id: `job-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      region: jobData.region,
      scenario: jobData.scenario,
      file: uploadedFile,
      status: "queued",
      originalImage: imageUrl,
    };

    setJobs([newJob, ...jobs]);
    setCurrentJob(newJob);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

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

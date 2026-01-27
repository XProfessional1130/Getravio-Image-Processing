import { useState, ChangeEvent } from 'react';
import Upload from './Upload';

interface Job {
  id: string;
  region: string;
  scenario: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  originalImage?: string;
  simulation1?: string;
  simulation2?: string;
}

interface ImageComparisonProps {
  job: Job | null;
  onHandleJobSubmit: (jobData: { region: string; scenario: string, message: string }) => void;
  onImageUpload: (file: File) => void;
}

function ImageComparison({ job, onHandleJobSubmit, onImageUpload }: ImageComparisonProps) {
  const [showLabels, setShowLabels] = useState<boolean>(true);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
  };

  // const handlePrevious = () => {
  //   // Navigate to previous image (for future implementation)
  //   console.log('Previous image');
  // };

  // const handleNext = () => {
  //   // Navigate to next image (for future implementation)
  //   console.log('Next image');
  // };

  // const handleToggleLabels = () => {
  //   setShowLabels(!showLabels);
  // };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-100/50">
      {job && (
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-100/80">
          <span className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold tracking-wide shadow-sm ${
              job.status === 'queued' ? 'bg-amber-500 text-white shadow-amber-400/30' :
              job.status === 'processing' ? 'bg-blue-600 text-white shadow-blue-500/30' :
                job.status === 'completed' ? 'bg-green-600 text-white shadow-green-500/30' :
                  'bg-red-600 text-white shadow-red-500/30'
            }`}>
            {job.status.toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8">
        {/* Images Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3">
            {showLabels && <h3 className="text-xs sm:text-sm font-bold text-blue-900/80 tracking-wide">ORIGINAL</h3>}
            <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl sm:rounded-2xl border-2 border-dashed border-blue-200/60 flex items-center justify-center overflow-hidden relative transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10">
              {job && job.originalImage ? (
                <img src={job.originalImage} alt="Original" className="w-full h-full object-cover rounded-lg sm:rounded-xl" />
              ) : (
                <label
                  className={`w-full h-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 ${job?.status === 'processing' ? 'cursor-not-allowed' : 'cursor-pointer'
                    } transition-colors px-4`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={job?.status === 'processing'}
                    className="hidden"
                  />
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-blue-600 text-xs sm:text-sm font-semibold text-center">
                    {job?.status === 'processing' ? 'Processing...' : 'Click to upload image'}
                  </span>
                  <span className="text-xs text-slate-400">PNG, JPG up to 10MB</span>
                </label>
              )}
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {showLabels && <h3 className="text-xs sm:text-sm font-bold text-blue-900/80 tracking-wide">REAR</h3>}
            <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-xl sm:rounded-2xl border border-blue-100/50 flex items-center justify-center overflow-hidden shadow-md shadow-blue-900/5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
              {job && job.simulation1 ? (
                <img src={job.simulation1} alt="Simulation 1" className="w-full h-full object-cover" />
              ) : job && (job.status === 'queued' || job.status === 'processing') ? (
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-3 sm:border-4 border-blue-200 border-t-blue-600 animate-spin" />
                  <span className="text-blue-600/70 text-xs sm:text-sm font-semibold">Awaiting...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 px-4">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-slate-400 text-xs sm:text-sm font-medium text-center">No simulation yet</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {showLabels && <h3 className="text-xs sm:text-sm font-bold text-blue-900/80 tracking-wide">SIDE</h3>}
            <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-xl sm:rounded-2xl border border-blue-100/50 flex items-center justify-center overflow-hidden shadow-md shadow-blue-900/5 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
              {job && job.simulation2 ? (
                <img src={job.simulation2} alt="Simulation 2" className="w-full h-full object-cover" />
              ) : job && (job.status === 'queued' || job.status === 'processing') ? (
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-3 sm:border-4 border-purple-200 border-t-purple-600 animate-spin" />
                  <span className="text-purple-600/70 text-xs sm:text-sm font-semibold">Awaiting...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 px-4">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-slate-400 text-xs sm:text-sm font-medium text-center">No simulation yet</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Control Panel - Right Side */}
        <div className="w-full lg:w-72 flex flex-col">
          <Upload onSubmit={onHandleJobSubmit} />

          {/* Image Navigation */}
          {/* <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Image Navigation</h3>
            <div className="flex gap-2">
              <button
                onClick={handlePrevious}
                className="flex-1 px-4 py-2 border border-indigo-500 text-indigo-500 rounded hover:bg-indigo-50 transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={handleNext}
                className="flex-1 px-4 py-2 border border-indigo-500 text-indigo-500 rounded hover:bg-indigo-50 transition-colors"
              >
                Next →
              </button>
            </div>
          </div> */}


          {/* Display Options */}
          {/* <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Display Options</h3>
            <button
              onClick={handleToggleLabels}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors font-medium"
            >
              {showLabels ? 'Hide Labels' : 'Show Labels'}
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default ImageComparison;

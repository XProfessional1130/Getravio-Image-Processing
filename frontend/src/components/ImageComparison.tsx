import { useState, ChangeEvent } from 'react';
import Upload from './Upload';
import { Job } from '../services/api';
import { ProgressData } from '../hooks/useJobWebSocket';

interface ImageComparisonProps {
  job: Job | null;
  progress: ProgressData | null;
  onHandleJobSubmit: (jobData: { region: string; scenario: string, message: string }) => void;
  onImageUpload: (file: File) => void;
}

function ImageComparison({ job, progress, onHandleJobSubmit, onImageUpload }: ImageComparisonProps) {
  const [showLabels] = useState<boolean>(true);

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

  const isProcessing = job?.status === 'queued' || job?.status === 'processing';

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg shadow-blue-900/5 border border-blue-100/50 animate-fadeIn">
      {job && job.status !== 'draft' && (
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-slate-100/80 animate-slideDown">
          <span className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold tracking-wide shadow-sm transition-all duration-300 ${
              job.status === 'queued' ? 'bg-amber-500 text-white shadow-amber-400/30 animate-pulse' :
              job.status === 'processing' ? 'bg-blue-600 text-white shadow-blue-500/30 animate-pulse' :
                job.status === 'completed' ? 'bg-green-600 text-white shadow-green-500/30 animate-bounceIn' :
                  'bg-red-600 text-white shadow-red-500/30 animate-shakeX'
            }`}>
            {job.status.toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8">
        {/* Images Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3 animate-fadeIn">
            {showLabels && <h3 className="text-xs sm:text-sm font-bold text-blue-900/80 tracking-wide">ORIGINAL</h3>}
            <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl sm:rounded-2xl border-2 border-dashed border-blue-200/60 flex items-center justify-center overflow-hidden relative transition-all duration-500 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02] group">
              {job?.original_image_url ? (
                <div className="w-full h-full relative">
                  <img src={job.original_image_url} alt="Original" className="w-full h-full object-cover rounded-lg sm:rounded-xl animate-fadeIn" />
                  <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer flex items-center justify-center backdrop-blur-sm">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isProcessing}
                      className="hidden"
                    />
                    <div className="text-white text-center transform group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="text-sm font-semibold">Change Image</span>
                    </div>
                  </label>
                </div>
              ) : (
                <label
                  className={`w-full h-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                    } transition-all duration-300 px-4`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isProcessing}
                    className="hidden"
                  />
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400/70 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-blue-600 text-xs sm:text-sm font-semibold text-center group-hover:text-blue-700 transition-colors">
                    {isProcessing ? 'Processing...' : 'Click to upload image'}
                  </span>
                  <span className="text-xs text-slate-400 group-hover:text-slate-500 transition-colors">PNG, JPG up to 10MB</span>
                </label>
              )}
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            {showLabels && <h3 className="text-xs sm:text-sm font-bold text-blue-900/80 tracking-wide">REAR</h3>}
            <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-xl sm:rounded-2xl border border-blue-100/50 flex items-center justify-center overflow-hidden shadow-md shadow-blue-900/5 transition-all duration-500 hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.02] group">
              {job && job.simulation1_url ? (
                <img src={job.simulation1_url} alt="Simulation 1" className="w-full h-full object-cover animate-fadeIn hover:scale-105 transition-transform duration-500" />
              ) : job && (job.status === 'queued' || job.status === 'processing') ? (
                <div className="flex flex-col items-center gap-3 sm:gap-4 px-4">
                  {progress && progress.view === 'rear' ? (
                    <>
                      {/* Progress Circle */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="50%"
                            cy="50%"
                            r="45%"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-blue-200"
                          />
                          <circle
                            cx="50%"
                            cy="50%"
                            r="45%"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress.percentage / 100)}`}
                            className="text-blue-600 transition-all duration-300"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl sm:text-2xl font-bold text-blue-600">{progress.percentage}%</span>
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <span className="text-blue-600 text-sm sm:text-base font-bold block">Generating REAR</span>
                        <span className="text-blue-500 text-xs block">Step {progress.step}/{progress.total_steps}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                      </div>
                      <div className="text-center space-y-1">
                        <span className="text-blue-600 text-xs sm:text-sm font-bold block animate-pulse">Waiting...</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-slate-400 text-xs sm:text-sm font-medium text-center">No simulation yet</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            {showLabels && <h3 className="text-xs sm:text-sm font-bold text-blue-900/80 tracking-wide">SIDE</h3>}
            <div className="w-full aspect-[3/4] bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-xl sm:rounded-2xl border border-blue-100/50 flex items-center justify-center overflow-hidden shadow-md shadow-blue-900/5 transition-all duration-500 hover:shadow-xl hover:shadow-purple-500/20 hover:scale-[1.02] group">
              {job && job.simulation2_url ? (
                <img src={job.simulation2_url} alt="Simulation 2" className="w-full h-full object-cover animate-fadeIn hover:scale-105 transition-transform duration-500" />
              ) : job && (job.status === 'queued' || job.status === 'processing') ? (
                <div className="flex flex-col items-center gap-3 sm:gap-4 px-4">
                  {progress && progress.view === 'side' ? (
                    <>
                      {/* Progress Circle */}
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="50%"
                            cy="50%"
                            r="45%"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-purple-200"
                          />
                          <circle
                            cx="50%"
                            cy="50%"
                            r="45%"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 45} ${2 * Math.PI * 45}`}
                            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress.percentage / 100)}`}
                            className="text-purple-600 transition-all duration-300"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl sm:text-2xl font-bold text-purple-600">{progress.percentage}%</span>
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <span className="text-purple-600 text-sm sm:text-base font-bold block">Generating SIDE</span>
                        <span className="text-purple-500 text-xs block">Step {progress.step}/{progress.total_steps}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Awaiting state - show when rear is being generated */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-dashed border-purple-300 animate-spin" style={{ animationDuration: '8s' }} />
                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-center space-y-1">
                        <span className="text-purple-500 text-sm sm:text-base font-semibold block">Awaiting</span>
                        <span className="text-purple-400 text-xs block">REAR view first...</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-slate-400 text-xs sm:text-sm font-medium text-center">No simulation yet</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Control Panel - Right Side */}
        <div className="w-full lg:w-72 flex flex-col gap-4">
          <Upload onSubmit={onHandleJobSubmit} isProcessing={isProcessing} />

          {/* Processing Status */}
          {job && isProcessing && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-blue-900 mb-1">
                    {progress ? `Generating ${progress.view.toUpperCase()} View` : 'Processing'}
                  </h4>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    {progress
                      ? `Step ${progress.step} of ${progress.total_steps} (${progress.percentage}%)`
                      : 'AI is generating your simulation images...'}
                  </p>
                  <div className="mt-3">
                    <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: progress ? `${progress.percentage}%` : '5%' }}
                      />
                    </div>
                    {progress && (
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-blue-500">{progress.view === 'rear' ? 'REAR' : 'SIDE'}</span>
                        <span className="text-xs text-blue-500 font-medium">{progress.percentage}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message Display */}
          {job && job.status === 'failed' && job.error_message && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 animate-shakeX">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-900 mb-2">Generation Failed</h4>
                  <p className="text-xs text-red-700 leading-relaxed mb-3">
                    {job.error_message}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-xs font-semibold text-red-600 hover:text-red-800 underline hover:no-underline transition-all"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {job && job.status === 'completed' && (job.simulation1_url || job.simulation2_url) && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 animate-bounceIn">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-green-900 mb-1">Success!</h4>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Your simulation has been generated successfully. View the results above.
                  </p>
                </div>
              </div>
            </div>
          )}

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

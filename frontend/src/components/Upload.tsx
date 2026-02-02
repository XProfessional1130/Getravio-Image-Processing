import { useState, FormEvent } from 'react';

interface UploadProps {
  onSubmit: (data: { region: string; scenario: string; view_type: string; message: string }) => void;
  isProcessing?: boolean;
}

function Upload({ onSubmit, isProcessing = false }: UploadProps) {
  const [message, setMessage] = useState<string>('');
  const [region, setRegion] = useState<string>('gluteal');
  const [scenario, setScenario] = useState<string>('projection-level-1');
  const [viewType, setViewType] = useState<string>('rear');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isProcessing) return;
    onSubmit({
      region,
      scenario,
      view_type: viewType,
      message,
    });
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl sm:rounded-2xl border border-blue-100/50 p-3 sm:p-4 shadow-md shadow-blue-900/5 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
        <h3 className="text-xs font-bold text-blue-900 tracking-wide mb-2 sm:mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          SIMULATION SETTINGS
        </h3>
        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-900/70 tracking-wide flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              REGION
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 bg-white border border-blue-200/60 rounded-lg text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 shadow-sm hover:border-blue-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="gluteal">Gluteal Region</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-900/70 tracking-wide flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h.01M15 10h.01M12 14a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              VIEW TYPE
            </label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 bg-white border border-blue-200/60 rounded-lg text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 shadow-sm hover:border-blue-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="rear">Rear View</option>
              <option value="side">Side View</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-900/70 tracking-wide flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              PROJECTION LEVEL
            </label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              disabled={isProcessing}
              className="w-full px-3 py-2 bg-white border border-blue-200/60 rounded-lg text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 shadow-sm hover:border-blue-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="projection-level-1">Level 1 - Subtle</option>
              <option value="projection-level-2">Level 2 - Moderate</option>
              <option value="projection-level-3">Level 3 - Maximum</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-blue-900/70 tracking-wide flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              NOTES (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add any special instructions..."
              rows={2}
              disabled={isProcessing}
              className="w-full px-3 py-2 bg-white border border-blue-200/60 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 shadow-sm resize-none hover:border-blue-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full px-4 py-2.5 rounded-lg transition-all duration-300 font-bold text-xs shadow-lg relative overflow-hidden group ${
              isProcessing
                ? 'bg-blue-400 cursor-not-allowed shadow-blue-400/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {/* Button background shimmer effect when not processing */}
            {!isProcessing && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            )}

            <span className="relative flex items-center justify-center gap-2 text-white">
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="animate-pulse">Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Generate</span>
                </>
              )}
            </span>
          </button>
        </form>
      </div>

    </div>
  );
}

export default Upload;

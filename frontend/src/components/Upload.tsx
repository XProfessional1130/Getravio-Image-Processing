import { useState, FormEvent } from 'react';

interface UploadProps {
  onSubmit: (data: { region: string; scenario: string, message: string }) => void;
}

function Upload({ onSubmit }: UploadProps) {
  const [message, setMessage] = useState<string>('');
  const [region, setRegion] = useState<string>('gluteal');
  const [scenario, setScenario] = useState<string>('projection-level-1');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      region,
      scenario,
      message,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl sm:rounded-2xl border border-blue-100/50 p-4 sm:p-6 shadow-md shadow-blue-900/5">
        <h3 className="text-xs sm:text-sm font-bold text-blue-900 tracking-wide mb-3 sm:mb-4">SIMULATION SETTINGS</h3>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs font-bold text-blue-900/70 tracking-wide">REGION</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-blue-200/60 rounded-lg sm:rounded-xl text-xs sm:text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 shadow-sm"
            >
              <option value="gluteal">Gluteal Region</option>
            </select>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs font-bold text-blue-900/70 tracking-wide">PROJECTION LEVEL</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-blue-200/60 rounded-lg sm:rounded-xl text-xs sm:text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 shadow-sm"
            >
              <option value="projection-level-1">Level 1</option>
              <option value="projection-level-2">Level 2</option>
              <option value="projection-level-3">Level 3</option>
            </select>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs font-bold text-blue-900/70 tracking-wide">NOTES</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-blue-200/60 rounded-lg sm:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition-all duration-200 shadow-sm resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-3 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
          >
            Generate Simulation
          </button>
        </form>
      </div>

    </div>
  );
}

export default Upload;

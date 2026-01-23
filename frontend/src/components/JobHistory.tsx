interface Job {
  id: string;
  region: string;
  scenario: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  timestamp: string;
}

interface JobHistoryProps {
  jobs: Job[];
  onViewJob: (job: Job) => void;
}

function JobHistory({ jobs, onViewJob }: JobHistoryProps) {
  return (
    <div className="bg-white p-8 rounded-lg shadow">
      <h2 className="text-xl font-semibold text-slate-700 mb-6">Job History</h2>

      {jobs.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">No jobs yet</p>
      ) : (
        <ul className="space-y-0 divide-y divide-gray-100">
          {jobs.map((job) => (
            <li key={job.id} className="py-4 flex justify-between items-center">
              <div className="flex-1">
                <div className="font-semibold text-slate-700">{job.id}</div>
                <div className="text-sm text-gray-500">
                  {job.region} - {job.scenario} | {job.timestamp}
                </div>
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                job.status === 'queued' ? 'bg-yellow-500 text-white' :
                job.status === 'processing' ? 'bg-blue-500 text-white' :
                job.status === 'completed' ? 'bg-green-600 text-white' :
                'bg-red-600 text-white'
              }`}>
                {job.status.toUpperCase()}
              </span>
              <button
                onClick={() => onViewJob(job)}
                className="ml-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
              >
                View
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default JobHistory;

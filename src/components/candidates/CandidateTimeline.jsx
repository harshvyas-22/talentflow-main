import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

const CandidateTimeline = ({ timeline }) => {
  const getStageIcon = (stage) => {
    switch (stage) {
      case 'hired':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'hired':
        return 'border-green-500';
      case 'rejected':
        return 'border-red-500';
      default:
        return 'border-blue-500';
    }
  };

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No timeline events yet.</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {timeline.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== timeline.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white border-2 ${getStageColor(event.stage)}`}>
                    {getStageIcon(event.stage)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      {event.notes || `Moved to ${event.stage} stage`}
                    </p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    <time dateTime={event.timestamp}>
                      {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CandidateTimeline;
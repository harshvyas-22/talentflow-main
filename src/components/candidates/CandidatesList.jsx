import React from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Building, Briefcase } from '../ui/icons';
import LoadingSpinner from '../ui/LoadingSpinner';

const CandidatesList = ({ candidates = [], isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="bg-white shadow sm:rounded-md p-6 text-center">
        <p className="text-gray-500">No candidates found. Add your first candidate to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <ul role="list" className="divide-y divide-gray-200">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <Link to={`/candidates/${candidate.id}`} className="block hover:bg-gray-50">
              <div className="px-4 py-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">{candidate.name}</p>
                      <p className="text-sm text-gray-500">{candidate.role}</p>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 ml-0 sm:ml-2 flex flex-shrink-0">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold capitalize ${getStageColor(candidate.stage)}`}>
                      {candidate.stage}
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="mr-1.5 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{candidate.email}</span>
                    </div>
                    {candidate.company && (
                      <div className="flex items-center text-sm text-gray-500 sm:ml-6">
                        <Building className="mr-1.5 h-4 w-4 flex-shrink-0" />
                        {candidate.company}
                      </div>
                    )}
                    {candidate.experience && (
                      <div className="flex items-center text-sm text-gray-500 sm:ml-6">
                        <Briefcase className="mr-1.5 h-4 w-4 flex-shrink-0" />
                        {candidate.experience} years
                      </div>
                    )}
                  </div>
                  
                  {/* Display skills */}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {candidate.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <time dateTime={candidate.createdAt}>
                      {new Date(candidate.createdAt).toLocaleDateString()}
                    </time>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

const getStageColor = (stage) => {
  const colors = {
    applied: 'bg-blue-100 text-blue-800',
    screening: 'bg-yellow-100 text-yellow-800',
    technical: 'bg-purple-100 text-purple-800',
    offer: 'bg-orange-100 text-orange-800',
    hired: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };
  return colors[stage] || 'bg-gray-100 text-gray-800';
};

export default CandidatesList;
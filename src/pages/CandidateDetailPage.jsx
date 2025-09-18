import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, User, Briefcase } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { candidatesApi, jobsApi } from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CandidateTimeline from '../components/candidates/CandidateTimeline';

const CandidateDetailPage = () => {
  const { candidateId } = useParams();

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', candidateId],
    queryFn: () => candidatesApi.getCandidate(candidateId),
  });

  const { data: job } = useQuery({
    queryKey: ['job', candidate?.jobId],
    queryFn: () => jobsApi.getJob(candidate.jobId),
    enabled: !!candidate?.jobId,
  });

  const { data: timeline } = useQuery({
    queryKey: ['candidate-timeline', candidateId],
    queryFn: () => candidatesApi.getCandidateTimeline(candidateId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Candidate not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The candidate you're looking for doesn't exist or has been removed.
        </p>
        <Link
          to="/candidates"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Candidates
        </Link>
      </div>
    );
  }

  const getStageColor = (stage) => {
    const colors = {
      applied: 'bg-blue-100 text-blue-800',
      screen: 'bg-yellow-100 text-yellow-800',
      tech: 'bg-purple-100 text-purple-800',
      offer: 'bg-orange-100 text-orange-800',
      hired: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Link
        to="/candidates"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Candidates
      </Link>

      <div className="grid grid-cols-1 gap-6">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Candidate Info */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Mail className="w-4 h-4 mr-1" />
                      {candidate.email}
                    </span>
                    {candidate.phone && (
                      <span className="flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        {candidate.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStageColor(candidate.stage)}`}>
                    {candidate.stage}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {candidate.location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{candidate.location}</span>
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span>
                    {candidate.createdAt ? 
                      `Applied ${formatDistanceToNow(new Date(candidate.createdAt), { addSuffix: false })} ago` : 
                      'Application date unknown'}
                  </span>
                </div>
                {candidate.experience && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{candidate.experience} years experience</span>
                  </div>
                )}
                {job && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">Applied for:</span>
                    <Link 
                      to={`/jobs/${job.id}`}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      {job.title}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Timeline</h2>
            </div>
            <div className="p-6">
              <CandidateTimeline timeline={timeline || []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDetailPage;
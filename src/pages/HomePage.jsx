import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Check, Calendar, Ban, Briefcase, Building } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { candidatesApi } from '../services/api';
import { STAGES } from '../data/seedData';

const HomePage = () => {
  // Fetch all candidates to get statistics
  const { data: candidatesData, isLoading } = useQuery({
    queryKey: ['candidates', { all: true }],
    queryFn: () => candidatesApi.getCandidates({ all: true }),
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!candidatesData?.candidates) return {
      total: 0,
      hired: 0,
      interview: 0,
      rejected: 0
    };

    const candidates = candidatesData.candidates;
    return {
      total: candidates.length,
      hired: candidates.filter(c => c.stage === STAGES.HIRED).length,
      interview: candidates.filter(c => [STAGES.SCREEN, STAGES.TECH, STAGES.OFFER].includes(c.stage)).length,
      rejected: candidates.filter(c => c.stage === STAGES.REJECTED).length
    };
  }, [candidatesData]);

  // Feedback data (mock data)
  const feedbacks = [
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Senior HR Manager',
      company: 'TechCorp',
      avatar: '👩‍💼',
      feedback: "TalentFlow has streamlined our entire recruitment process. We've reduced our time-to-hire by 35% in just three months!",
      rating: 5
    },
    {
      id: 2,
      name: 'Michael Chen',
      role: 'Talent Acquisition Lead',
      company: 'Innovex',
      avatar: '👨‍💼',
      feedback: "The candidate tracking features are incredibly intuitive. It's made collaboration between our HR teams seamless.",
      rating: 4
    },
    {
      id: 3,
      name: 'Jessica Williams',
      role: 'HR Director',
      company: 'Global Systems',
      avatar: '👩‍💻',
      feedback: "The assessment tools have dramatically improved our ability to find candidates with the right skills. Great platform!",
      rating: 5
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">TalentFlow</h1>
        <p className="text-xl mb-6">Streamline your hiring process with intelligent candidate tracking</p>
        <p className="text-lg opacity-90">
          The modern solution for HR professionals to manage candidates, track applications, and make better hiring decisions.
        </p>
      </div>

      {/* Dashboard Stats */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Recruitment Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Candidates */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Candidates</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>

          {/* Hired */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Hired</p>
                <p className="text-2xl font-bold">{stats.hired}</p>
              </div>
            </div>
          </div>

          {/* In Interview Process */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-amber-500">
            <div className="flex items-center">
              <div className="rounded-full bg-amber-100 p-3 mr-4">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Interview</p>
                <p className="text-2xl font-bold">{stats.interview}</p>
              </div>
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-red-500">
            <div className="flex items-center">
              <div className="rounded-full bg-red-100 p-3 mr-4">
                <Ban className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HR Feedback */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">What HR Professionals Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {feedbacks.map(feedback => (
            <FeedbackCard key={feedback.id} feedback={feedback} />
          ))}
        </div>
      </div>
    </div>
  );
};

// FeedbackCard Component
const FeedbackCard = ({ feedback }) => {
  const stars = Array(5).fill(0);

  return (
    <div className="bg-white rounded-lg shadow p-6 flex flex-col h-full">
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <span className="text-3xl mr-3">{feedback.avatar}</span>
          <div>
            <h3 className="font-semibold">{feedback.name}</h3>
            <p className="text-sm text-gray-600 flex items-center">
              <Briefcase className="h-3.5 w-3.5 mr-1" />
              {feedback.role}
            </p>
            <p className="text-sm text-gray-600 flex items-center">
              <Building className="h-3.5 w-3.5 mr-1" />
              {feedback.company}
            </p>
          </div>
        </div>
        <div className="flex mb-2">
          {stars.map((_, index) => (
            <svg 
              key={index}
              className={`w-5 h-5 ${index < feedback.rating ? 'text-yellow-400' : 'text-gray-300'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>
      <p className="text-gray-700 flex-grow">{feedback.feedback}</p>
    </div>
  );
};

export default HomePage;
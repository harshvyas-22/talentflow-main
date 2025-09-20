import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle } from 'lucide-react';
import { jobsApi } from '../services/api';
import JobsList from '../components/jobs/JobsList';
import JobModal from '../components/jobs/JobModal';
import SearchInput from '../components/ui/SearchInput';
import FilterDropdown from '../components/ui/FilterDropdown';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Pagination from '../components/ui/Pagination';
import { db } from '../services/database'; // Import the database directly
import { JOB_STATUS } from '../data/seedData'; // Import job status constants

const JOB_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: JOB_STATUS.OPEN, label: 'Open' },
  { value: JOB_STATUS.CLOSED, label: 'Closed' },
  { value: JOB_STATUS.DRAFT, label: 'Draft' },
  { value: JOB_STATUS.ARCHIVED, label: 'Archived' }
];

const JobsPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [localJobs, setLocalJobs] = useState([]); // For direct DB access fallback
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Number of jobs per page
  const queryClient = useQueryClient();

  // Try to get jobs via API first
  const { data: apiJobs, isLoading: isApiLoading, isError: isApiError } = useQuery({
    queryKey: ['jobs', statusFilter],
    queryFn: () => {
      // Only send status parameter if not 'all'
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      return jobsApi.getJobs(params);
    },
    retry: 1, // Only retry once to avoid excessive retries on failure
  });

  // Create/update job mutation
  const saveJobMutation = useMutation({
    mutationFn: (jobData) => {
      if (jobData.id) {
        return jobsApi.updateJob(jobData.id, jobData);
      } else {
        return jobsApi.createJob(jobData);
      }
    },
    onSuccess: () => {
      setShowModal(false);
      setSelectedJob(null);
      queryClient.invalidateQueries(['jobs']);
    },
    onError: (error) => {
      console.error('Failed to save job:', error);
      alert('Failed to save job. Please try again.');
    }
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: (jobId) => jobsApi.deleteJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries(['jobs']);
    }
  });

  // Fallback: If API fails, get jobs directly from the database
  useEffect(() => {
    if (isApiError) {
      const getJobsFromDb = async () => {
        try {
          const dbJobs = await db.jobs.toArray();
          
          // Filter by status if needed
          const filteredJobs = statusFilter !== 'all'
            ? dbJobs.filter(job => job.status === statusFilter)
            : dbJobs;
            
          setLocalJobs(filteredJobs);
        } catch (error) {
          console.error("Error accessing DB directly:", error);
        }
      };
      
      getJobsFromDb();
    }
  }, [isApiError, statusFilter]);

  // Use API jobs if available, otherwise use local jobs
  const jobs = apiJobs || localJobs;
  const isLoading = isApiLoading && localJobs.length === 0;

  const handleAddJob = () => {
    setSelectedJob(null);
    setShowModal(true);
  };

  const handleEditJob = (job) => {
    setSelectedJob(job);
    setShowModal(true);
  };

  const handleDeleteJob = (job) => {
    if (window.confirm(`Are you sure you want to delete "${job.title}"?`)) {
      deleteJobMutation.mutate(job.id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedJob(null);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Filter jobs based on search query only (status filtering now done on server/DB)
  const filteredJobs = React.useMemo(() => {
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) return [];
    
    // Status filtering is now handled by the API, so we only filter by search here
    return jobs.filter(job => {
      // Apply search filter
      const matchesSearch = !searchQuery || 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.description && job.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
  }, [jobs, searchQuery]);

  // Calculate pagination
  const totalItems = filteredJobs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Jobs</h1>
        <button
          onClick={handleAddJob}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Add Job
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <SearchInput
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        <div className="w-full sm:w-48">
          <FilterDropdown
            label="Status"
            options={JOB_STATUS_OPTIONS}
            value={statusFilter}
            onChange={handleStatusChange}
          />
        </div>
      </div>

      <JobsList
        jobs={paginatedJobs}
        isLoading={isLoading}
        onEdit={handleEditJob}
        onDelete={handleDeleteJob}
      />

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {showModal && (
        <JobModal
          isOpen={showModal}
          onClose={handleCloseModal}
          onSave={(jobData) => saveJobMutation.mutate(jobData)}
          job={selectedJob}
          isLoading={saveJobMutation.isPending}
        />
      )}
    </div>
  );
};

export default JobsPage;
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, LayoutGrid, List } from 'lucide-react';
import { candidatesApi } from '../services/api';
import CandidatesKanban from '../components/candidates/CandidatesKanban';
import CandidatesList from '../components/candidates/CandidatesList';
import CandidateForm from '../components/candidates/CandidateForm';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import Pagination from '../components/ui/Pagination';
import FilterDropdown from '../components/ui/FilterDropdown';
import { toast } from 'react-hot-toast';
import { STAGES, stagesList } from '../data/seedData';

const CandidatesPage = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [kanbanItemsPerPage] = useState(15); // Limit for kanban view - show 15 candidates per stage
  const queryClient = useQueryClient();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1); // Reset to first page on new search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidates', { search: searchQuery, stage: stageFilter, viewMode, page: currentPage, itemsPerPage: viewMode === 'list' ? itemsPerPage : kanbanItemsPerPage }],
    queryFn: () => candidatesApi.getCandidates({ 
      search: searchQuery,
      stage: stageFilter !== 'all' ? stageFilter : undefined,
      page: currentPage,
      pageSize: viewMode === 'list' ? itemsPerPage : (viewMode === 'kanban' ? kanbanItemsPerPage * stagesList.length : undefined),
      all: viewMode === 'kanban' // Get all candidates for kanban view
    })
  });

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0); // Scroll to top when page changes
  };

  // Group candidates by stage
  const candidatesByStage = React.useMemo(() => {
    if (!candidates?.candidates) return {};
    
    return candidates.candidates.reduce((acc, candidate) => {
      // Ensure the stage is one of the valid stages
      const stage = candidate.stage || 'applied';
      
      if (!acc[stage]) {
        acc[stage] = [];
      }
      acc[stage].push(candidate);
      return acc;
    }, {});
  }, [candidates]);

  const handleAddCandidate = async (candidateData) => {
    try {
      await candidatesApi.createCandidate(candidateData);
      await queryClient.invalidateQueries(['candidates']);
      setShowAddModal(false);
      toast.success('Candidate added successfully');
    } catch (error) {
      console.error('Failed to add candidate:', error);
      toast.error('Failed to add candidate');
    }
  };

  // Stage filter options
  const stageOptions = [
    { value: 'all', label: 'All Stages' },
    { value: STAGES.APPLIED, label: 'Applied' },
    { value: STAGES.SCREEN, label: 'Screening' },
    { value: STAGES.TECH, label: 'Technical' },
    { value: STAGES.OFFER, label: 'Offer' },
    { value: STAGES.HIRED, label: 'Hired' },
    { value: STAGES.REJECTED, label: 'Rejected' }
  ];

  // Handle stage filter change
  const handleStageFilterChange = (value) => {
    setStageFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Candidates</h1>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setViewMode('kanban');
                setCurrentPage(1); 
              }}
              className={`p-2 rounded ${
                viewMode === 'kanban' ? 'bg-white shadow' : ''
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setViewMode('list');
                setCurrentPage(1); 
              }}
              className={`p-2 rounded ${
                viewMode === 'list' ? 'bg-white shadow' : ''
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="w-full sm:w-64">
            <SearchInput
              placeholder="Search candidates..."
              value={searchInput}
              onChange={setSearchInput}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Candidate
          </button>
        </div>
      </div>

      <div className="mt-4">
        {viewMode === 'kanban' ? (
          <>
            <CandidatesKanban 
              candidatesByStage={candidatesByStage} 
              isLoading={isLoading}
            />
            {candidates?.total > 0 && (
              <div className="mt-4">
                <div className="text-center text-sm text-gray-600 mb-2">
                  Showing {candidates.candidates?.length || 0} of {candidates.total} candidates. 
                  Use pagination below to view more candidates.
                </div>
                <div className="flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.max(1, Math.ceil(candidates.total / (kanbanItemsPerPage * stagesList.length)))}
                    onPageChange={handlePageChange}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Show filter dropdown for both views */}
            <div className="mb-4 flex justify-end">
              <FilterDropdown
                label="Stage"
                value={stageFilter}
                onChange={handleStageFilterChange}
                options={stageOptions}
              />
            </div>
            <CandidatesKanban 
              candidates={candidates?.candidates || []} 
              isLoading={isLoading} 
            />
            {candidates?.total > 0 && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(candidates.total / itemsPerPage)}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && (
        <Modal 
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        >
          <CandidateForm 
            onSubmit={handleAddCandidate}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default CandidatesPage;
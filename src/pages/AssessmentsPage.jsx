import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import AssessmentBuilder from '../components/assessments/AssessmentBuilder';
import AssessmentPreview from '../components/assessments/AssessmentPreview';
import { assessmentsApi, jobsApi } from '../services/api';
import { toast } from 'react-hot-toast';

const AssessmentsPage = () => {
  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const queryClient = useQueryClient();

  const { data: assessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => assessmentsApi.getAssessments()
  });

  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsApi.getJobs()
  });

  const createAssessmentMutation = useMutation({
    mutationFn: (data) => assessmentsApi.createAssessment(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessments']);
      setIsBuilderModalOpen(false);
      setCurrentAssessment(null);
      toast.success('Assessment created successfully');
    },
    onError: (error) => {
      console.error('Failed to create assessment:', error);
      toast.error('Failed to create assessment');
    }
  });

  const updateAssessmentMutation = useMutation({
    mutationFn: (data) => assessmentsApi.updateAssessment(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessments']);
      setIsBuilderModalOpen(false);
      setCurrentAssessment(null);
      toast.success('Assessment updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update assessment:', error);
      toast.error('Failed to update assessment');
    }
  });

  const deleteAssessmentMutation = useMutation({
    mutationFn: (id) => assessmentsApi.deleteAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessments']);
      toast.success('Assessment deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete assessment:', error);
      toast.error('Failed to delete assessment');
    }
  });

  const handleCreateAssessment = () => {
    setCurrentAssessment(null);
    setIsBuilderModalOpen(true);
  };

  const handleEditAssessment = (assessment) => {
    setCurrentAssessment(assessment);
    setIsBuilderModalOpen(true);
  };

  const handlePreviewAssessment = (assessment) => {
    setCurrentAssessment(assessment);
    setIsPreviewModalOpen(true);
  };

  const handleDeleteAssessment = (id) => {
    if (window.confirm('Are you sure you want to delete this assessment?')) {
      deleteAssessmentMutation.mutate(id);
    }
  };

  const handleSaveAssessment = (data) => {
    // Add job information if creating a new assessment
    if (!currentAssessment) {
      if (!selectedJob) {
        toast.error('Please select a job for this assessment');
        return;
      }
      data.jobId = selectedJob.id;
      data.jobTitle = selectedJob.title;
    }

    if (currentAssessment?.id) {
      updateAssessmentMutation.mutate({ id: currentAssessment.id, ...data });
    } else {
      createAssessmentMutation.mutate(data);
    }
  };

  const isLoading = isLoadingAssessments || isLoadingJobs;

  if (isLoading) {
    return <div className="text-center py-12">Loading assessments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Assessments</h1>
          <p className="text-gray-600">Create and manage job-specific assessments and quizzes</p>
        </div>
        <Button onClick={handleCreateAssessment}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Assessment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assessments?.map((assessment) => (
          <Card key={assessment.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">{assessment.title}</h3>
                  {assessment.jobTitle && (
                    <span className="text-sm text-blue-600">
                      For: {assessment.jobTitle}
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePreviewAssessment(assessment)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Preview Assessment"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEditAssessment(assessment)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit Assessment"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAssessment(assessment.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                    title="Delete Assessment"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-500">
                  {assessment.sections?.reduce((total, section) => 
                    total + section.questions.length, 0
                  ) || 0} questions in {assessment.sections?.length || 0} sections
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Created {new Date(assessment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!assessments || assessments.length === 0) && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No assessments available</p>
          </div>
        )}
      </div>

      {/* Builder Modal */}
      <Modal
        isOpen={isBuilderModalOpen}
        onClose={() => setIsBuilderModalOpen(false)}
        title={currentAssessment ? 'Edit Assessment' : 'Create New Assessment'}
        size="xl"
      >
        {/* Job Selection for new assessments */}
        {!currentAssessment && (
          <div className="mb-6 p-4 border rounded-md bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Job for this Assessment
            </label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={selectedJob?.id || ''}
              onChange={(e) => {
                const jobId = parseInt(e.target.value);
                const job = jobs.find(j => j.id === jobId);
                setSelectedJob(job);
              }}
            >
              <option value="">Select a job...</option>
              {jobs?.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <AssessmentBuilder
          assessment={currentAssessment}
          onSave={handleSaveAssessment}
          isSaving={createAssessmentMutation.isLoading || updateAssessmentMutation.isLoading}
        />
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Assessment Preview"
        size="lg"
      >
        <AssessmentPreview assessment={currentAssessment} />
      </Modal>
    </div>
  );
};

export default AssessmentsPage;
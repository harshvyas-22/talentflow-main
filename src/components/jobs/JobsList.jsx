import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import JobCard from './JobCard';
import LoadingSpinner from '../ui/LoadingSpinner';
import { jobsApi } from '../../services/api';

const JobsList = ({ jobs, isLoading, onEdit, onDelete }) => {
  const queryClient = useQueryClient();
  
  const reorderJobMutation = useMutation({
    mutationFn: ({ id, fromOrder, toOrder }) => 
      jobsApi.reorderJob(id, fromOrder, toOrder),
    onSuccess: () => {
      // Force a full refetch by using exact query keys
      queryClient.invalidateQueries(['jobs']);
      queryClient.invalidateQueries(['jobs', 'all']);
      queryClient.invalidateQueries(['jobs', 'open']);
      queryClient.invalidateQueries(['jobs', 'closed']);
      queryClient.invalidateQueries(['jobs', 'draft']);
      queryClient.invalidateQueries(['jobs', 'archived']);
    },
    onError: (error) => {
      console.error('Reorder API call failed:', error);
      // Optionally, you could implement a rollback of the optimistic update here
      alert('Failed to save the new order. Please try again.');
      queryClient.invalidateQueries(['jobs']);
    }
  });

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    
    // Drop outside the list or same position
    if (!destination || destination.index === source.index) {
      return;
    }

    const jobId = parseInt(draggableId);
    const fromOrder = source.index + 1;
    const toOrder = destination.index + 1;

    // Optimistic update
    queryClient.setQueryData(['jobs'], (oldData) => {
      if (!oldData) return oldData;
      
      // Make a copy of the jobs array
      const newJobs = [...oldData];
      
      // Find the job being reordered
      const jobIndex = newJobs.findIndex(job => job.id === jobId);
      if (jobIndex === -1) return oldData;
      
      // Move the job to the new position
      const [movedJob] = newJobs.splice(jobIndex, 1);
      newJobs.splice(destination.index, 0, movedJob);
      
      // Update order property for all jobs
      const updatedJobs = newJobs.map((job, index) => ({
        ...job,
        order: index + 1
      }));
      
      return updatedJobs;
    });
    
    // Call the API to persist changes
    reorderJobMutation.mutate({ id: jobId, fromOrder, toOrder });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <p className="text-gray-500">No jobs found. Add your first job to get started.</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="jobs-list">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-4 ${snapshot.isDraggingOver ? 'bg-gray-50 rounded-lg p-4' : ''}`}
          >
            {jobs.map((job, index) => (
              <Draggable key={job.id} draggableId={job.id.toString()} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={{
                      ...provided.draggableProps.style,
                      opacity: snapshot.isDragging ? 0.8 : 1
                    }}
                    className={snapshot.isDragging ? 'rounded-lg shadow-lg' : ''}
                  >
                    <JobCard 
                      job={job} 
                      onEdit={() => onEdit && onEdit(job)} 
                      onDelete={() => onDelete && onDelete(job)} 
                      isDragging={snapshot.isDragging}
                      dragHandleProps={provided.dragHandleProps}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default JobsList;
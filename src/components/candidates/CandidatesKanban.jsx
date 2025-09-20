import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useMutation, useQueryClient, useQueries, useQuery } from '@tanstack/react-query';
import { candidatesApi } from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import CandidateCard from './CandidateCard';
import { toast } from 'react-hot-toast';
import { STAGES } from '../../data/seedData';

const KANBAN_STAGES = [
  { key: STAGES.APPLIED, label: 'Applied', color: 'bg-blue-100 border-blue-300' },
  { key: STAGES.SCREEN, label: 'Screening', color: 'bg-yellow-100 border-yellow-300' },
  { key: STAGES.TECH, label: 'Technical', color: 'bg-purple-100 border-purple-300' },
  { key: STAGES.OFFER, label: 'Offer', color: 'bg-orange-100 border-orange-300' },
  { key: STAGES.HIRED, label: 'Hired', color: 'bg-green-100 border-green-300' },
  { key: STAGES.REJECTED, label: 'Rejected', color: 'bg-red-100 border-red-300' },
];

const CandidatesKanban = ({ candidatesByStage = {}, isLoading }) => {
  const queryClient = useQueryClient();

  // Mutation for updating a candidate's stage
  const moveCandidateMutation = useMutation({
    mutationFn: ({ candidateId, newStage }) =>
      candidatesApi.updateCandidate(candidateId, { stage: newStage }),
    onMutate: async ({ candidateId, newStage }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries(['candidates']);
      
      // Save the previous state
      const previousCandidates = queryClient.getQueryData(['candidates']);
      
      // Optimistically update the candidate stage
      queryClient.setQueryData(['candidates'], (oldData) => {
        if (!oldData || !oldData.candidates) return oldData;
        
        return {
          ...oldData,
          candidates: oldData.candidates.map(candidate => 
            candidate.id === candidateId 
              ? { ...candidate, stage: newStage } 
              : candidate
          )
        };
      });
      
      // Return the context with the previous state
      return { previousCandidates };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, revert to the previous state
      if (context?.previousCandidates) {
        queryClient.setQueryData(['candidates'], context.previousCandidates);
      }
      console.error('Error updating candidate stage:', error);
      toast.error('Failed to update candidate stage');
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['candidates']);
    },
    onSuccess: () => {
      toast.success('Candidate stage updated successfully');
    }
  });

  // Mutation for adding a note to a candidate
  const addNoteMutation = useMutation({
    mutationFn: ({ candidateId, note }) =>
      candidatesApi.addCandidateNote(candidateId, { note }),
    onMutate: async ({ candidateId, note }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['candidates']);
      await queryClient.cancelQueries(['candidateTimeline', candidateId]);
      
      // Save previous data
      const previousCandidates = queryClient.getQueryData(['candidates']);
      const previousTimeline = queryClient.getQueryData(['candidateTimeline', candidateId]);
      
      // Create an optimistic timeline entry
      const newTimelineEntry = {
        id: Date.now(),
        candidateId,
        timestamp: new Date().toISOString(),
        notes: note
      };
      
      // Optimistically update the timeline
      if (previousTimeline) {
        queryClient.setQueryData(['candidateTimeline', candidateId], [
          newTimelineEntry,
          ...previousTimeline
        ]);
      }
      
      // Return the context with the previous state
      return { previousCandidates, previousTimeline };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, revert to the previous state
      if (context?.previousCandidates) {
        queryClient.setQueryData(['candidates'], context.previousCandidates);
      }
      if (context?.previousTimeline) {
        queryClient.setQueryData(['candidateTimeline', variables.candidateId], context.previousTimeline);
      }
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    },
    onSettled: (_, __, { candidateId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['candidates']);
      queryClient.invalidateQueries(['candidateTimeline', candidateId]);
    },
    onSuccess: () => {
      toast.success('Note added successfully');
    }
  });

  // Mutation for scheduling an interview
  const scheduleInterviewMutation = useMutation({
    mutationFn: ({ candidateId, scheduledTime }) =>
      candidatesApi.scheduleInterview(candidateId, { scheduledTime }),
    onMutate: async ({ candidateId, scheduledTime }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['candidates']);
      await queryClient.cancelQueries(['candidateTimeline', candidateId]);
      
      // Save previous data
      const previousCandidates = queryClient.getQueryData(['candidates']);
      const previousTimeline = queryClient.getQueryData(['candidateTimeline', candidateId]);
      
      // Create an optimistic timeline entry
      const newTimelineEntry = {
        id: Date.now(),
        candidateId,
        timestamp: new Date().toISOString(),
        notes: `Interview scheduled for ${new Date(scheduledTime).toLocaleString()}`,
        interviewTime: scheduledTime
      };
      
      // Optimistically update the timeline
      if (previousTimeline) {
        queryClient.setQueryData(['candidateTimeline', candidateId], [
          newTimelineEntry,
          ...previousTimeline
        ]);
      }
      
      // Return the context with the previous state
      return { previousCandidates, previousTimeline };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, revert to the previous state
      if (context?.previousCandidates) {
        queryClient.setQueryData(['candidates'], context.previousCandidates);
      }
      if (context?.previousTimeline) {
        queryClient.setQueryData(['candidateTimeline', variables.candidateId], context.previousTimeline);
      }
      console.error('Error scheduling interview:', error);
      toast.error('Failed to schedule interview');
    },
    onSettled: (_, __, { candidateId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['candidates']);
      queryClient.invalidateQueries(['candidateTimeline', candidateId]);
    },
    onSuccess: () => {
      toast.success('Interview scheduled successfully');
    }
  });

  // Mutation for rejecting a candidate
  const rejectCandidateMutation = useMutation({
    mutationFn: ({ candidateId, reason }) =>
      candidatesApi.updateCandidate(candidateId, { 
        stage: STAGES.REJECTED,
        rejectionReason: reason 
      }),
    onMutate: async ({ candidateId, reason }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['candidates']);
      await queryClient.cancelQueries(['candidateTimeline', candidateId]);
      
      // Save previous data
      const previousCandidates = queryClient.getQueryData(['candidates']);
      const previousTimeline = queryClient.getQueryData(['candidateTimeline', candidateId]);
      
      // Optimistically update the candidate stage
      queryClient.setQueryData(['candidates'], (oldData) => {
        if (!oldData || !oldData.candidates) return oldData;
        
        return {
          ...oldData,
          candidates: oldData.candidates.map(candidate => 
            candidate.id === candidateId 
              ? { ...candidate, stage: STAGES.REJECTED, rejectionReason: reason } 
              : candidate
          )
        };
      });
      
      // Return the context with the previous state
      return { previousCandidates, previousTimeline };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, revert to the previous state
      if (context?.previousCandidates) {
        queryClient.setQueryData(['candidates'], context.previousCandidates);
      }
      if (context?.previousTimeline) {
        queryClient.setQueryData(['candidateTimeline', variables.candidateId], context.previousTimeline);
      }
      console.error('Error rejecting candidate:', error);
      toast.error('Failed to reject candidate');
    },
    onSettled: (_, __, { candidateId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['candidates']);
      queryClient.invalidateQueries(['candidateTimeline', candidateId]);
    },
    onSuccess: () => {
      toast.success('Candidate rejected');
    }
  });

  // Mutation for deleting a note
  const deleteNoteMutation = useMutation({
    mutationFn: ({ candidateId, noteId }) =>
      candidatesApi.deleteNote(candidateId, noteId),
    onMutate: async ({ candidateId, noteId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries(['candidates']);
      await queryClient.cancelQueries(['candidateTimeline', candidateId]);
      
      // Save previous data
      const previousTimeline = queryClient.getQueryData(['candidateTimeline', candidateId]);
      
      // Optimistically update the timeline by removing the note
      queryClient.setQueryData(['candidateTimeline', candidateId], (oldTimeline) => {
        if (!oldTimeline) return oldTimeline;
        
        return oldTimeline.filter(item => item.id !== noteId);
      });
      
      // Return the context with the previous state
      return { previousTimeline };
    },
    onError: (error, variables, context) => {
      // If the mutation fails, revert to the previous state
      if (context?.previousTimeline) {
        queryClient.setQueryData(['candidateTimeline', variables.candidateId], context.previousTimeline);
      }
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    },
    onSettled: (_, __, { candidateId }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries(['candidateTimeline', candidateId]);
    },
    onSuccess: () => {
      toast.success('Note deleted successfully');
    }
  });

  // Flatten all visible candidates for easier lookup
  const visibleCandidates = Object.values(candidatesByStage || {})
    .flat();

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    // Safety checks
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    if (!draggableId) return;

    let candidateId;
    try {
      candidateId = parseInt(draggableId, 10);
      if (isNaN(candidateId)) return;
    } catch (e) {
      console.error('Invalid draggableId:', draggableId);
      return;
    }

    const newStage = destination.droppableId;

    // Optimistic update
    queryClient.setQueryData(['candidates'], (oldData) => {
      if (!oldData || !oldData.candidates || !Array.isArray(oldData.candidates)) return oldData;

      const updatedCandidates = oldData.candidates.map(candidate =>
        candidate && candidate.id === candidateId
          ? { ...candidate, stage: newStage }
          : candidate
      );

      return { ...oldData, candidates: updatedCandidates };
    });

    moveCandidateMutation.mutate({ candidateId, newStage });
  };

  // Function to move a candidate to the next stage
  const handleMoveToNextStage = (candidateId) => {
    const candidate = visibleCandidates.find(c => c.id === candidateId);
    if (!candidate) {
      console.error('Candidate not found:', candidateId);
      toast.error('Cannot find candidate');
      return;
    }
    
    const currentStageIndex = KANBAN_STAGES.findIndex(s => s.key === candidate.stage);
    if (currentStageIndex === -1 || currentStageIndex >= KANBAN_STAGES.length - 2) {
      console.error('Cannot move candidate further:', candidate.stage);
      toast.error('Cannot move candidate to next stage');
      return;
    }
    
    const nextStage = KANBAN_STAGES[currentStageIndex + 1].key;
    
    // Trigger the mutation with optimistic update
    moveCandidateMutation.mutate({ 
      candidateId, 
      newStage: nextStage 
    });
  };

  // Function to add a note to a candidate
  const handleAddNote = (candidateId, note) => {
    if (!note.trim()) {
      toast.error('Note cannot be empty');
      return;
    }
    
    // Trigger the mutation with optimistic update
    addNoteMutation.mutate({ 
      candidateId, 
      note 
    });
  };

  // Function to schedule an interview
  const handleScheduleInterview = (candidateId, scheduledTime) => {
    if (!scheduledTime) {
      toast.error('Please select a valid date and time');
      return;
    }
    
    // Trigger the mutation with optimistic update
    scheduleInterviewMutation.mutate({ 
      candidateId, 
      scheduledTime 
    });
  };

  // Function to reject a candidate
  const handleRejectCandidate = (candidateId, reason) => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    // Trigger the mutation with optimistic update
    rejectCandidateMutation.mutate({ 
      candidateId, 
      reason 
    });
  };
  
  // Function to delete a note
  const handleDeleteNote = (candidateId, noteId) => {
    if (!noteId) {
      toast.error('Invalid note');
      return;
    }
    
    // Trigger the mutation with optimistic update
    deleteNoteMutation.mutate({ 
      candidateId, 
      noteId 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-4">
        <div className="flex md:grid md:grid-cols-6 gap-2 min-w-[1000px] md:min-w-0">
          {KANBAN_STAGES.map((stage) => (
            <div key={stage.key} className="flex-shrink-0 w-[250px] md:w-auto md:col-span-1">
              <div className={`rounded-lg border-2 border-dashed ${stage.color} h-full`}>
                <div className="p-2 border-b border-gray-200 bg-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm text-gray-900">{stage.label}</h3>
                    <span className="text-xs text-gray-500">
                      {candidatesByStage[stage.key]?.length || 0}
                    </span>
                  </div>
                </div>

                <Droppable droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-2 min-h-[300px] max-h-[450px] overflow-y-auto overflow-x-hidden ${
                        snapshot.isDraggingOver ? 'bg-gray-50' : 'bg-white'
                      } rounded-b-lg`}
                    >
                      <div className="space-y-2">
                        {(candidatesByStage[stage.key] || []).map((candidate, index) => (
                          <Draggable
                            key={candidate.id}
                            draggableId={String(candidate.id)}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.8 : 1
                                }}
                              >
                                <CandidateCard 
                                  candidate={candidate} 
                                  compact={true}
                                  onAddNote={handleAddNote}
                                  onDeleteNote={handleDeleteNote}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {(!candidatesByStage[stage.key] || candidatesByStage[stage.key].length === 0) && (
                          <div className="text-center py-6 text-gray-500 text-sm">
                            No candidates in this stage
                          </div>
                        )}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 text-center text-sm text-gray-500 md:hidden">
        <p>Swipe horizontally to view all stages</p>
      </div>
    </DragDropContext>
  );
};

export default CandidatesKanban;
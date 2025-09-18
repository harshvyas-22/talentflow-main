import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, GripVertical, Eye, EyeOff } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { nanoid } from 'nanoid';
import QuestionEditor from './QuestionEditor';
import Modal from '../ui/Modal';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/Textarea';
import { Switch } from '../ui/Switch';
import { Badge } from '../ui/Badge';

const QUESTION_TYPES = [
  { value: 'single-choice', label: 'Single Choice' },
  { value: 'multi-choice', label: 'Multiple Choice' },
  { value: 'short-text', label: 'Short Text' },
  { value: 'long-text', label: 'Long Text' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'file-upload', label: 'File Upload' },
];

const AssessmentBuilder = ({ assessment, onSave, isSaving }) => {
  const [assessmentData, setAssessmentData] = useState({
    title: '',
    description: '',
    sections: [],
  });

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (assessment) {
      // Make sure the assessment has the required structure
      const validAssessment = {
        ...assessment,
        sections: assessment.sections || [],
        description: assessment.description || ''
      };
      setAssessmentData(validAssessment);
    } else {
      // Try to load from localStorage
      const savedData = localStorage.getItem('assessmentBuilderState');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          // Ensure the parsed data has the required structure
          const validData = {
            ...parsedData,
            sections: parsedData.sections || [],
            description: parsedData.description || ''
          };
          setAssessmentData(validData);
        } catch (e) {
          console.error('Error parsing saved assessment data:', e);
          setDefaultAssessment();
        }
      } else {
        setDefaultAssessment();
      }
    }
  }, [assessment]);

  // Save builder state to localStorage whenever it changes
  useEffect(() => {
    if (!assessment) {
      localStorage.setItem('assessmentBuilderState', JSON.stringify(assessmentData));
    }
  }, [assessmentData, assessment]);

  const setDefaultAssessment = () => {
    setAssessmentData({
      title: 'New Assessment',
      description: '',
      sections: [
        {
          id: nanoid(),
          title: 'Section 1',
          questions: [],
        },
      ],
    });
  };

  const handleSave = () => {
    onSave(assessmentData);
  };

  const addSection = () => {
    const newSection = {
      id: nanoid(),
      title: `Section ${(assessmentData.sections || []).length + 1}`,
      questions: [],
    };
    setAssessmentData({
      ...assessmentData,
      sections: [...(assessmentData.sections || []), newSection],
    });
  };

  const updateSection = (sectionId, updates) => {
    setAssessmentData({
      ...assessmentData,
      sections: (assessmentData.sections || []).map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
    });
  };

  const deleteSection = (sectionId) => {
    setAssessmentData({
      ...assessmentData,
      sections: (assessmentData.sections || []).filter(section => section.id !== sectionId),
    });
  };

  const addQuestion = (sectionId, type) => {
    // Find available questions for conditional logic
    // (all questions that come before this new one in the current section and previous sections)
    const availableQuestions = [];
    
    for (const section of assessmentData.sections) {
      if (section.id === sectionId) {
        // Include all questions in the current section
        availableQuestions.push(...section.questions);
        break;
      } else {
        // Include all questions from previous sections
        availableQuestions.push(...section.questions);
      }
    }
    
    setEditingQuestion({
      sectionId,
      question: {
        id: nanoid(),
        type,
        question: '',
        required: false,
        options: type.includes('choice') ? [''] : undefined,
        maxLength: type.includes('text') ? 100 : undefined,
        min: type === 'numeric' ? 0 : undefined,
        max: type === 'numeric' ? 100 : undefined,
        acceptedTypes: type === 'file-upload' ? ['.pdf', '.doc', '.docx'] : undefined,
      },
      availableQuestions
    });
    setIsQuestionModalOpen(true);
  };

  const editQuestion = (sectionId, question) => {
    // Find available questions for conditional logic
    // (questions that come before this one)
    const availableQuestions = [];
    
    let foundCurrent = false;
    for (const section of assessmentData.sections) {
      for (const q of section.questions) {
        if (q.id === question.id) {
          foundCurrent = true;
          break;
        }
        availableQuestions.push(q);
      }
      if (foundCurrent) break;
    }
    
    setEditingQuestion({ 
      sectionId, 
      question: { ...question },
      availableQuestions
    });
    setIsQuestionModalOpen(true);
  };

  const saveQuestion = (questionData) => {
    const { sectionId, question } = editingQuestion;
    
    setAssessmentData({
      ...assessmentData,
      sections: (assessmentData.sections || []).map(section => {
        if (section.id === sectionId) {
          const existingIndex = (section.questions || []).findIndex(q => q.id === question.id);
          if (existingIndex >= 0) {
            // Update existing question
            const updatedQuestions = [...(section.questions || [])];
            updatedQuestions[existingIndex] = questionData;
            return { ...section, questions: updatedQuestions };
          } else {
            // Add new question
            return { ...section, questions: [...section.questions, questionData] };
          }
        }
        return section;
      }),
    });

    setIsQuestionModalOpen(false);
    setEditingQuestion(null);
  };

  const deleteQuestion = (sectionId, questionId) => {
    setAssessmentData({
      ...assessmentData,
      sections: (assessmentData.sections || []).map(section =>
        section.id === sectionId
          ? {
              ...section,
              questions: (section.questions || []).filter(q => q.id !== questionId),
            }
          : section
      ),
    });
  };

  const handleDragEnd = (result) => {
    const { destination, source } = result;
    if (!destination) return;

    if (!assessmentData.sections || assessmentData.sections.length === 0) return;

    const sourceSectionIndex = (assessmentData.sections || []).findIndex(s => s.id === source.droppableId);
    const destSectionIndex = (assessmentData.sections || []).findIndex(s => s.id === destination.droppableId);

    if (sourceSectionIndex === -1 || destSectionIndex === -1) return;

    const sections = [...assessmentData.sections];
    const sourceSection = sections[sourceSectionIndex];
    const destSection = sections[destSectionIndex];

    if (source.droppableId === destination.droppableId) {
      // Reorder within the same section
      const reorderedQuestions = Array.from(sourceSection.questions);
      const [movedQuestion] = reorderedQuestions.splice(source.index, 1);
      reorderedQuestions.splice(destination.index, 0, movedQuestion);

      const updatedSections = [...assessmentData.sections];
      updatedSections[sourceSectionIndex] = {
        ...sourceSection,
        questions: reorderedQuestions,
      };

      setAssessmentData({
        ...assessmentData,
        sections: updatedSections,
      });
    } else {
      // Move between sections
      const sourceQuestions = Array.from(sourceSection.questions);
      const destQuestions = Array.from(destSection.questions);
      
      const [movedQuestion] = sourceQuestions.splice(source.index, 1);
      destQuestions.splice(destination.index, 0, movedQuestion);

      const updatedSections = [...assessmentData.sections];
      updatedSections[sourceSectionIndex] = {
        ...sourceSection,
        questions: sourceQuestions,
      };
      updatedSections[destSectionIndex] = {
        ...destSection,
        questions: destQuestions,
      };

      setAssessmentData({
        ...assessmentData,
        sections: updatedSections,
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="assessment-builder">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Assessment Builder</h3>
            <div className="flex space-x-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="assessment-title">Assessment Title</Label>
              <Input
                id="assessment-title"
                value={assessmentData.title}
                onChange={(e) => setAssessmentData({ ...assessmentData, title: e.target.value })}
                placeholder="Enter assessment title..."
              />
            </div>
            <div>
              <Label htmlFor="assessment-description">Description</Label>
              <Textarea
                id="assessment-description"
                value={assessmentData.description}
                onChange={(e) => setAssessmentData({ ...assessmentData, description: e.target.value })}
                placeholder="Describe this assessment..."
                rows={3}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Sections */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          {assessmentData.sections && assessmentData.sections.map((section, sectionIndex) => (
            <div key={section.id} className="bg-white rounded-lg border">
              {/* Section Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    className="text-lg font-medium text-gray-900 border-none outline-none bg-transparent hover:bg-gray-100 rounded px-2 py-1"
                    placeholder="Section Title"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {section.questions.length} questions
                    </span>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                      disabled={(assessmentData.sections || []).length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="p-6">
                <Droppable droppableId={section.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[100px] rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-200 border-dashed' : ''
                      }`}
                    >
                      {section.questions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No questions yet. Add a question to get started.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {section.questions.map((question, index) => (
                            <Draggable key={question.id} draggableId={question.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`p-4 border rounded-lg bg-white transition-shadow ${
                                    snapshot.isDragging ? 'shadow-lg' : 'hover:shadow-md'
                                  }`}
                                >
                                  <div className="flex items-start space-x-3">
                                    <div
                                      {...provided.dragHandleProps}
                                      className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <h4 className="text-sm font-medium text-gray-900">
                                            {question.question || 'Untitled Question'}
                                          </h4>
                                          <p className="text-xs text-gray-500 capitalize">
                                            {QUESTION_TYPES.find(t => t.value === question.type)?.label}
                                            {question.required && ' • Required'}
                                          </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <button
                                            onClick={() => editQuestion(section.id, question)}
                                            className="p-1 text-gray-400 hover:text-gray-600"
                                          >
                                            <Eye className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() => deleteQuestion(section.id, question.id)}
                                            className="p-1 text-red-400 hover:text-red-600"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Add Question Buttons */}
                <div className="mt-6 border-t pt-4">
                  <div className="flex flex-wrap gap-2">
                    {QUESTION_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => addQuestion(section.id, type.value)}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Section Button */}
          <button
            onClick={addSection}
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
          >
            <Plus className="w-5 h-5 mx-auto mb-2" />
            Add Section
          </button>
        </div>
      </DragDropContext>

      {/* Question Editor Modal */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => {
          setIsQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
        title={editingQuestion?.question.id ? 'Edit Question' : 'Add Question'}
        size="lg"
      >
        {editingQuestion && (
          <QuestionEditor
            question={editingQuestion.question}
            availableQuestions={editingQuestion.availableQuestions}
            onSave={saveQuestion}
            onCancel={() => {
              setIsQuestionModalOpen(false);
              setEditingQuestion(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
};

export default AssessmentBuilder;
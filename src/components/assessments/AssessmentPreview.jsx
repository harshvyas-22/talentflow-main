import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Upload } from 'lucide-react';

const AssessmentPreview = ({ assessment }) => {
  const [responses, setResponses] = useState({});
  const [errors, setErrors] = useState({});
  const [visibleQuestions, setVisibleQuestions] = useState({});

  if (!assessment || !assessment.sections) {
    return (
      <div className="bg-white rounded-lg border p-8">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">No Assessment</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create an assessment in the builder to see the preview.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Initialize visible questions
    updateVisibleQuestions();
  }, [responses]);

  // Load saved responses when assessment changes
  useEffect(() => {
    if (assessment) {
      const savedResponsesKey = `assessmentResponses_${assessment.id}`;
      const savedResponses = localStorage.getItem(savedResponsesKey);
      
      if (savedResponses) {
        try {
          setResponses(JSON.parse(savedResponses));
        } catch (e) {
          console.error('Error parsing saved responses:', e);
          setResponses({});
        }
      } else {
        setResponses({});
      }
    }
  }, [assessment]);

  // Save responses when they change
  useEffect(() => {
    if (assessment && Object.keys(responses).length > 0) {
      const savedResponsesKey = `assessmentResponses_${assessment.id}`;
      localStorage.setItem(savedResponsesKey, JSON.stringify(responses));
    }
  }, [responses, assessment]);

  // Evaluate condition to see if a question should be shown
  const evaluateCondition = (question) => {
    if (!question.conditionalLogic || !question.conditionalLogic.enabled) {
      return true; // Show questions without conditional logic
    }

    const { dependsOn, condition } = question.conditionalLogic;
    if (!dependsOn || !responses[dependsOn]) {
      return false; // If dependent question hasn't been answered, hide this question
    }

    const dependentAnswer = responses[dependsOn];
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        if (Array.isArray(dependentAnswer)) {
          return dependentAnswer.includes(value);
        }
        return dependentAnswer === value;
      case 'not_equals':
        if (Array.isArray(dependentAnswer)) {
          return !dependentAnswer.includes(value);
        }
        return dependentAnswer !== value;
      case 'contains':
        if (typeof dependentAnswer === 'string') {
          return dependentAnswer.toLowerCase().includes(value.toLowerCase());
        }
        if (Array.isArray(dependentAnswer)) {
          return dependentAnswer.some(ans => 
            ans.toLowerCase().includes(value.toLowerCase())
          );
        }
        return false;
      case 'greater_than':
        return parseFloat(dependentAnswer) > parseFloat(value);
      case 'less_than':
        return parseFloat(dependentAnswer) < parseFloat(value);
      default:
        return true;
    }
  };

  // Update which questions should be visible based on current responses
  const updateVisibleQuestions = () => {
    const newVisibleQuestions = {};
    
    assessment.sections.forEach(section => {
      section.questions.forEach(question => {
        newVisibleQuestions[question.id] = evaluateCondition(question);
      });
    });
    
    setVisibleQuestions(newVisibleQuestions);
  };

  const handleInputChange = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors(prev => ({
        ...prev,
        [questionId]: undefined,
      }));
    }
  };

  const validateResponses = () => {
    const newErrors = {};
    
    assessment.sections.forEach(section => {
      section.questions.forEach(question => {
        // Only validate visible questions
        if (visibleQuestions[question.id]) {
          if (question.required && !responses[question.id]) {
            newErrors[question.id] = 'This field is required';
          }
          
          // Validate numeric range
          if (question.type === 'numeric' && responses[question.id] !== undefined) {
            const value = parseInt(responses[question.id]);
            if (question.min !== undefined && value < question.min) {
              newErrors[question.id] = `Value must be at least ${question.min}`;
            }
            if (question.max !== undefined && value > question.max) {
              newErrors[question.id] = `Value must be at most ${question.max}`;
            }
          }
          
          // Validate text length
          if (question.type.includes('text') && responses[question.id] && question.maxLength) {
            if (responses[question.id].length > question.maxLength) {
              newErrors[question.id] = `Must be ${question.maxLength} characters or less`;
            }
          }
        }
      });
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateResponses()) {
      alert('Assessment submitted successfully! (This is just a preview)');
    }
  };

  const renderQuestion = (question) => {
    const value = responses[question.id] || '';
    const error = errors[question.id];

    switch (question.type) {
      case 'single-choice':
        return (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(question.id, e.target.value)}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'multi-choice':
        const selectedOptions = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  value={option}
                  checked={selectedOptions.includes(option)}
                  onChange={(e) => {
                    const newSelected = e.target.checked
                      ? [...selectedOptions, option]
                      : selectedOptions.filter(opt => opt !== option);
                    handleInputChange(question.id, newSelected);
                  }}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'short-text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            maxLength={question.maxLength}
            className={`block w-full rounded-md shadow-sm sm:text-sm ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="Your answer..."
          />
        );

      case 'long-text':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            maxLength={question.maxLength}
            rows={4}
            className={`block w-full rounded-md shadow-sm sm:text-sm ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="Your answer..."
          />
        );

      case 'numeric':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            min={question.min}
            max={question.max}
            className={`block w-full rounded-md shadow-sm sm:text-sm ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            }`}
            placeholder="Enter a number..."
          />
        );

      case 'file-upload':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                Click to upload or drag and drop
              </p>
              {question.acceptedTypes && (
                <p className="text-xs text-gray-500">
                  Accepted formats: {question.acceptedTypes.join(', ')}
                </p>
              )}
            </div>
            <input
              type="file"
              accept={question.acceptedTypes?.join(',')}
              onChange={(e) => handleInputChange(question.id, e.target.files[0])}
              className="sr-only"
            />
          </div>
        );

      default:
        return <p className="text-sm text-gray-500">Unknown question type</p>;
    }
  };

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
        <p className="mt-1 text-sm text-gray-600">
          This is a preview of how candidates will see the assessment
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-8">
          {assessment.sections.map((section, sectionIndex) => (
            <div key={section.id} className="space-y-6">
              {/* Section Header */}
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-lg font-medium text-gray-900">{section.title}</h2>
                {sectionIndex === 0 && (
                  <p className="mt-1 text-sm text-gray-600">
                    Please answer all questions honestly and thoroughly.
                  </p>
                )}
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {section.questions.map((question, questionIndex) => (
                  // Only render visible questions
                  visibleQuestions[question.id] && (
                    <div key={question.id} className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <span className="text-sm text-gray-500 mt-1">
                          {questionIndex + 1}.
                        </span>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-900">
                            {question.question}
                            {question.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          <div className="mt-2">
                            {renderQuestion(question)}
                          </div>
                          {errors[question.id] && (
                            <div className="mt-1 flex items-center space-x-1 text-red-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm">{errors[question.id]}</span>
                            </div>
                          )}
                          {question.type.includes('text') && question.maxLength && (
                            <p className="mt-1 text-xs text-gray-500">
                              {(responses[question.id] || '').length} / {question.maxLength} characters
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Submit Assessment
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Note: This is a preview. Submissions won't be saved.
          </p>
        </div>
      </form>
    </div>
  );
};

export default AssessmentPreview;
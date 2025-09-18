import React, { useState, useEffect } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import { Switch } from '../ui/Switch';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

const QUESTION_TYPE_LABELS = {
  'single-choice': 'Single Choice',
  'multi-choice': 'Multiple Choice',
  'short-text': 'Short Text',
  'long-text': 'Long Text',
  'numeric': 'Numeric',
  'file-upload': 'File Upload',
};

const QuestionEditor = ({ question, onSave, onCancel, availableQuestions = [] }) => {
  const [formData, setFormData] = useState({
    ...question,
    conditionalLogic: question.conditionalLogic || {
      enabled: false,
      dependsOn: null,
      condition: {
        operator: 'equals',
        value: ''
      }
    }
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData(question);
  }, [question]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.question.trim()) {
      newErrors.question = 'Question text is required';
    }

    if (formData.type.includes('choice') && formData.options.filter(opt => opt.trim()).length < 2) {
      newErrors.options = 'At least 2 options are required';
    }

    if (formData.type === 'numeric') {
      if (formData.min !== undefined && formData.max !== undefined && formData.min >= formData.max) {
        newErrors.range = 'Minimum must be less than maximum';
      }
    }

    if (formData.conditionalLogic?.enabled && !formData.conditionalLogic.dependsOn) {
      newErrors.conditionalLogic = 'Select a question to depend on';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Clean up data based on type
    const cleanData = { ...formData };
    if (!cleanData.type.includes('choice')) {
      delete cleanData.options;
    }
    if (!cleanData.type.includes('text')) {
      delete cleanData.maxLength;
    }
    if (cleanData.type !== 'numeric') {
      delete cleanData.min;
      delete cleanData.max;
    }
    if (cleanData.type !== 'file-upload') {
      delete cleanData.acceptedTypes;
    }

    // Remove conditional logic if not enabled
    if (!cleanData.conditionalLogic?.enabled) {
      cleanData.conditionalLogic = undefined;
    }

    onSave(cleanData);
  };

  const updateOption = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ''],
    });
  };

  const removeOption = (index) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const addFileType = () => {
    setFormData({
      ...formData,
      acceptedTypes: [...(formData.acceptedTypes || []), ''],
    });
  };

  const updateFileType = (index, value) => {
    const newTypes = [...(formData.acceptedTypes || [])];
    newTypes[index] = value;
    setFormData({ ...formData, acceptedTypes: newTypes });
  };

  const removeFileType = (index) => {
    setFormData({
      ...formData,
      acceptedTypes: formData.acceptedTypes.filter((_, i) => i !== index),
    });
  };

  // Update conditional logic
  const updateConditionalLogic = (field, value) => {
    setFormData({
      ...formData,
      conditionalLogic: {
        ...formData.conditionalLogic,
        [field]: value
      }
    });
  };

  // Update condition operator or value
  const updateCondition = (field, value) => {
    setFormData({
      ...formData,
      conditionalLogic: {
        ...formData.conditionalLogic,
        condition: {
          ...formData.conditionalLogic.condition,
          [field]: value
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question Type
        </label>
        <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
          {QUESTION_TYPE_LABELS[formData.type]}
        </div>
      </div>

      {/* Question Text */}
      <Textarea
        label="Question"
        value={formData.question}
        onChange={(e) => setFormData({ ...formData, question: e.target.value })}
        error={errors.question}
        required
        rows={3}
        placeholder="Enter your question..."
      />

      {/* Required Toggle */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="required"
          checked={formData.required}
          onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
        />
        <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
          Required question
        </label>
      </div>

      {/* Choice Options */}
      {formData.type.includes('choice') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Options
          </label>
          {formData.options.map((option, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <Input
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="flex-1"
              />
              {formData.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="p-2 text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Add Option
          </button>
          {errors.options && (
            <p className="mt-1 text-sm text-red-600">{errors.options}</p>
          )}
        </div>
      )}

      {/* Text Length Limit */}
      {formData.type.includes('text') && (
        <Input
          label="Maximum Length"
          type="number"
          value={formData.maxLength || ''}
          onChange={(e) => setFormData({ ...formData, maxLength: parseInt(e.target.value) || undefined })}
          placeholder="Enter maximum character limit"
          min="1"
        />
      )}

      {/* Numeric Range */}
      {formData.type === 'numeric' && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Minimum Value"
            type="number"
            value={formData.min !== undefined ? formData.min : ''}
            onChange={(e) => setFormData({ ...formData, min: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Min"
          />
          <Input
            label="Maximum Value"
            type="number"
            value={formData.max !== undefined ? formData.max : ''}
            onChange={(e) => setFormData({ ...formData, max: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Max"
          />
          {errors.range && (
            <p className="col-span-2 text-sm text-red-600">{errors.range}</p>
          )}
        </div>
      )}

      {/* File Types */}
      {formData.type === 'file-upload' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Accepted File Types
          </label>
          {(formData.acceptedTypes || []).map((type, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <Input
                value={type}
                onChange={(e) => updateFileType(index, e.target.value)}
                placeholder=".pdf, .doc, .docx, etc."
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeFileType(index)}
                className="p-2 text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addFileType}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Add File Type
          </button>
        </div>
      )}

      {/* Conditional Logic */}
      <div className="border-t pt-4 mt-6">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-conditional" className="font-medium text-gray-700">
              Conditional Logic
            </Label>
            <Switch
              id="enable-conditional"
              checked={formData.conditionalLogic?.enabled}
              onCheckedChange={(checked) => updateConditionalLogic('enabled', checked)}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Show this question only when a specific condition is met
          </p>
        </div>

        {formData.conditionalLogic?.enabled && (
          <div className="p-4 bg-gray-50 rounded-md space-y-4">
            {availableQuestions.length === 0 ? (
              <div className="text-sm text-amber-600 flex items-center space-x-2 p-3 bg-amber-50 rounded">
                <AlertCircle className="w-4 h-4" />
                <span>No previous questions available for conditional logic</span>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="depends-on" className="text-sm font-medium text-gray-700">
                    Show this question when:
                  </Label>
                  <select
                    id="depends-on"
                    value={formData.conditionalLogic.dependsOn || ''}
                    onChange={(e) => updateConditionalLogic('dependsOn', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="">Select a question...</option>
                    {availableQuestions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.question.substring(0, 50)}
                        {q.question.length > 50 ? '...' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.conditionalLogic.dependsOn && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="condition-operator" className="text-sm font-medium text-gray-700">
                        Operator
                      </Label>
                      <select
                        id="condition-operator"
                        value={formData.conditionalLogic.condition.operator}
                        onChange={(e) => updateCondition('operator', e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Does not equal</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">Greater than</option>
                        <option value="less_than">Less than</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="condition-value" className="text-sm font-medium text-gray-700">
                        Value
                      </Label>
                      <Input
                        id="condition-value"
                        value={formData.conditionalLogic.condition.value}
                        onChange={(e) => updateCondition('value', e.target.value)}
                        placeholder="Enter value..."
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            
            {errors.conditionalLogic && (
              <p className="text-sm text-red-600">{errors.conditionalLogic}</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
        >
          Save Question
        </button>
      </div>
    </form>
  );
};

export default QuestionEditor;
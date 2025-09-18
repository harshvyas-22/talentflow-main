import React, { useState } from 'react';
import TagInput from '../ui/TagInput';

const CandidateForm = ({ onSubmit, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [skills, setSkills] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.target);
      const candidateData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        role: formData.get('role'),
        company: formData.get('company'),
        experience: formData.get('experience') ? Number(formData.get('experience')) : null,
        stage: 'applied',
        createdAt: new Date().toISOString(),
        skills: skills
      };

      await onSubmit(candidateData);
    } catch (err) {
      console.error('Failed to submit candidate:', err);
      setError('Failed to add candidate. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Candidate</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name *</label>
        <input
          type="text"
          name="name"
          id="name"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
        <input
          type="email"
          name="email"
          id="email"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          type="tel"
          name="phone"
          id="phone"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role *</label>
        <input
          type="text"
          name="role"
          id="role"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700">Current Company</label>
        <input
          type="text"
          name="company"
          id="company"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="experience" className="block text-sm font-medium text-gray-700">Years of Experience</label>
        <input
          type="number"
          name="experience"
          id="experience"
          min="0"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <TagInput
          label="Skills"
          value={skills}
          onChange={setSkills}
          placeholder="Type a skill and press Enter"
          className="w-full"
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter skills one at a time and press Enter after each skill
        </p>
      </div>

      <div className="pt-4 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${isSubmitting 
              ? 'bg-blue-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {isSubmitting ? 'Adding...' : 'Add Candidate'}
        </button>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full mt-2 sm:mt-0 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default CandidateForm;
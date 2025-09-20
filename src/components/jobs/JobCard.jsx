import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { Clock, MapPin, Users, Edit, Trash, CheckCircle, XCircle, Archive, FileText, GripVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { JOB_STATUS } from '../../data/seedData';

const JobCard = ({ job, onEdit, onDelete, isDragging, dragHandleProps }) => {
  const navigate = useNavigate();
  
  const handleCardClick = (e) => {
    // Prevent navigation if clicking on the action buttons
    if (e.target.closest('.job-card-actions')) {
      return;
    }
    navigate(`/jobs/${job.id}`);
  };

  // Handle edit
  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(job);
  };

  // Handle delete
  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(job);
  };

  // Add this helper function at the top of your component
  const getTagVariant = (tag) => {
    const tagLower = tag.toLowerCase();
    
    if (tagLower.includes('react') || tagLower.includes('frontend')) {
      return 'primary'; // blue
    } else if (tagLower.includes('backend') || tagLower.includes('server')) {
      return 'success'; // green
    } else if (tagLower.includes('urgent') || tagLower.includes('senior')) {
      return 'warning'; // yellow
    } else if (tagLower.includes('remote')) {
      return 'default'; // gray
    } else {
      return 'default'; // default gray
    }
  };

  // Get status styles and icon
  const getStatusInfo = (status) => {
    switch (status) {
      case JOB_STATUS.OPEN:
        return { 
          icon: CheckCircle, 
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Open'
        };
      case JOB_STATUS.CLOSED:
        return { 
          icon: XCircle, 
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Closed'
        };
      case JOB_STATUS.ARCHIVED:
        return { 
          icon: Archive, 
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          label: 'Archived'
        };
      case JOB_STATUS.DRAFT:
        return { 
          icon: FileText, 
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          label: 'Draft'
        };
      default:
        return { 
          icon: CheckCircle, 
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          label: 'Status'
        };
    }
  };

  const statusInfo = getStatusInfo(job.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div 
      className={`bg-white border rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
          <div className="text-xs text-gray-500 mb-1">{job.jobId || `ID: ${job.id}`}</div>
          <div className="mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
              <StatusIcon size={12} className="mr-1" />
              {statusInfo.label}
            </span>
          </div>
        </div>
        <div className="job-card-actions flex space-x-2 items-center">
          <div {...dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-600">
            <GripVertical size={18} />
          </div>
          <button 
            onClick={handleEdit} 
            className="text-gray-500 hover:text-blue-600"
            aria-label="Edit job"
          >
            <Edit size={18} />
          </button>
          <button 
            onClick={handleDelete} 
            className="text-gray-500 hover:text-red-600"
            aria-label="Delete job"
          >
            <Trash size={18} />
          </button>
        </div>
      </div>
      
      <div className="mt-2 space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <MapPin size={16} className="mr-1" />
          <span>{job.location || 'Remote'}</span>
        </div>
        
        {job.ctc && (
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-4 h-4 mr-1 flex items-center justify-center">
              <span className="text-gray-600 font-semibold">$</span>
            </div>
            <span>
              {job.ctc.min && job.ctc.max
                ? `${(job.ctc.min / 1000).toFixed(0)}K - ${(job.ctc.max / 1000).toFixed(0)}K ${job.ctc.currency || 'USD'}`
                : 'Competitive salary'}
            </span>
          </div>
        )}
        
        <div className="flex items-center text-sm text-gray-600">
          <Clock size={16} className="mr-1" />
          <span>Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Users size={16} className="mr-1" />
          <span>{job.applicants || 0} applicants</span>
        </div>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2">
        {job.tags && job.tags.map((tag, index) => (
          <Badge key={index} variant={getTagVariant(tag)}>{tag}</Badge>
        ))}
      </div>
    </div>
  );
};

export default JobCard;
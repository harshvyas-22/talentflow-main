import React, { useState, useRef } from 'react';
import { 
  User, Mail, Phone, Building, Briefcase, 
  X, AtSign, MessageSquare
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi } from '../../services/api';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { toast } from 'react-hot-toast';

const CandidateCard = ({ candidate, compact, onAddNote, onDeleteNote }) => {
  const [notesText, setNotesText] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);

  // Query to get the candidate timeline (including notes)
  const { data: timeline, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['candidateTimeline', candidate.id],
    queryFn: () => candidatesApi.getCandidateTimeline(candidate.id),
    enabled: !!candidate.id // Only fetch when we have a candidate ID
  });

  // Get list of candidates for @mention suggestions
  const { data: allCandidates } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => candidatesApi.getCandidates(),
    enabled: showMentionSuggestions
  });

  // Handle textarea input to detect @ mentions
  const handleNotesChange = (e) => {
    const value = e.target.value;
    setNotesText(value);
    
    // Get cursor position
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);
    
    // Check if we're typing an @mention
    const textUpToCursor = value.substring(0, cursorPos);
    const atSymbolIndex = textUpToCursor.lastIndexOf('@');
    
    if (atSymbolIndex !== -1 && atSymbolIndex >= 0) {
      // Extract the query after @ symbol
      const query = textUpToCursor.substring(atSymbolIndex + 1);
      
      // Only show suggestions if we're actually typing something after @
      if (query.length > 0 && !query.includes(' ')) {
        setMentionQuery(query.toLowerCase());
        setShowMentionSuggestions(true);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Insert a mention at the current cursor position
  const insertMention = (mentionedCandidate) => {
    if (!textareaRef.current) return;
    
    const textBeforeCursor = notesText.substring(0, cursorPosition);
    const textAfterCursor = notesText.substring(cursorPosition);
    
    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Replace the @query with @fullname
      const textBeforeMention = notesText.substring(0, lastAtIndex);
      const newText = `${textBeforeMention}@${mentionedCandidate.name} ${textAfterCursor}`;
      
      setNotesText(newText);
      
      // Calculate new cursor position after the inserted mention
      const newCursorPosition = lastAtIndex + mentionedCandidate.name.length + 2; // +2 for @ and space
      
      // Focus and set cursor position after a brief delay to let React update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    }
    
    setShowMentionSuggestions(false);
  };

  // Submit a note
  const submitNote = () => {
    if (notesText.trim()) {
      onAddNote?.(candidate.id, notesText);
      setNotesText('');
      toast.success('Note added successfully');
    }
  };

  // Filter candidates for @mention suggestions
  const filteredCandidates = allCandidates?.candidates
    ? allCandidates.candidates
        .filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 5)  // Limit to 5 suggestions
    : [];

  // Function to render text with styled @mentions
  const renderMentions = (text) => {
    if (!text) return null;
    
    // Regular expression to find @mentions
    const mentionRegex = /@([a-zA-Z\s]+)/g;
    
    // Split the text by @mentions
    const parts = text.split(mentionRegex);
    
    if (parts.length <= 1) return text;
    
    // Rebuild the text with styled @mentions
    const result = [];
    let i = 0;
    
    text.replace(mentionRegex, (match, name, offset) => {
      // Add text before the match
      if (offset > i) {
        result.push(text.substring(i, offset));
      }
      
      // Add the styled @mention
      result.push(
        <span key={offset} className="bg-blue-100 text-blue-800 px-1 rounded">
          @{name}
        </span>
      );
      
      i = offset + match.length;
      return match;
    });
    
    // Add any remaining text
    if (i < text.length) {
      result.push(text.substring(i));
    }
    
    return result;
  };

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 w-full">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 w-full">
          <div className="w-8 h-8 flex-shrink-0 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 truncate">{candidate.name}</h3>
            <p className="text-sm text-gray-500 truncate">{candidate.role}</p>
          </div>
          {/* Dropdown menu removed as requested */}
        </div>
      </div>
      
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600 overflow-hidden">
          <Mail className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{candidate.email}</span>
        </div>
        {candidate.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 overflow-hidden">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{candidate.phone}</span>
          </div>
        )}
        {candidate.company && (
          <div className="flex items-center gap-2 text-sm text-gray-600 overflow-hidden">
            <Building className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{candidate.company}</span>
          </div>
        )}
        {candidate.experience && (
          <div className="flex items-center gap-2 text-sm text-gray-600 overflow-hidden">
            <Briefcase className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{candidate.experience} years experience</span>
          </div>
        )}
        
        {/* Candidate Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes Section - Kept as requested */}
      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          <h4 className="text-xs font-medium text-gray-700">Notes</h4>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={notesText}
              onChange={handleNotesChange}
              placeholder="Type @ to mention a candidate..."
              rows={3}
              className="w-full text-sm resize-none"
            />
            
            {/* @mentions suggestions dropdown */}
            {showMentionSuggestions && filteredCandidates.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {filteredCandidates.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => insertMention(c)}
                    className="cursor-pointer hover:bg-gray-100 px-4 py-2 flex items-center"
                  >
                    <AtSign className="w-3 h-3 mr-2 text-gray-500" />
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <Button
            size="sm"
            onClick={submitNote}
            className="w-full"
          >
            Add Note
          </Button>
          
          {/* Notes History */}
          <div className="mt-2">
            <h4 className="text-xs font-medium text-gray-500 mb-2">Recent Notes</h4>
            {isTimelineLoading ? (
              <div className="text-center py-2">
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
              </div>
            ) : timeline && timeline.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {timeline
                  .filter(item => item.notes)
                  .map(item => (
                    <div key={item.id} className="text-xs p-2 bg-gray-50 rounded-md">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                        <div className="font-medium mb-1">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                        <button 
                          onClick={() => onDeleteNote?.(candidate.id, item.id)} 
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 mt-1 sm:mt-0"
                          title="Delete note"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="whitespace-pre-wrap">
                        {/* Replace @mentions with styled spans */}
                        {renderMentions(item.notes)}
                      </div>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded-md">
                No notes yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateCard;
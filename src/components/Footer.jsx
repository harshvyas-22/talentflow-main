import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, Heart, ClipboardList } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TalentFlow</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Streamlining the hiring process with intelligent candidate tracking and assessment tools.
            </p>
            <div className="flex space-x-4">
              <a href="https://github.com/harshvyas-22" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-gray-500 hover:text-gray-800">
                <Github size={20} />
              </a>
              <a href="https://www.linkedin.com/in/harsh-vyas-22abc/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-gray-500 hover:text-gray-800">
                <Linkedin size={20} />
              </a>
              <a href="mailto:harshvyas98397916@gmail.com" aria-label="Email" className="text-gray-500 hover:text-gray-800">
                <Mail size={20} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Navigation
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-600 hover:text-blue-600">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="text-gray-600 hover:text-blue-600">
                  Jobs
                </Link>
              </li>
              <li>
                <Link to="/candidates" className="text-gray-600 hover:text-blue-600">
                  Candidates
                </Link>
              </li>
              <li>
                <Link to="/assessments" className="text-gray-600 hover:text-blue-600">
                  Assessments
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Contact Us
            </h3>
            <p className="text-gray-600 text-sm mb-2">
              Have questions? We're here to help!
            </p>
            <a href="mailto:harshvyas98397916@gmail.com" className="flex items-center text-blue-600 hover:text-blue-800">
              <Mail size={16} className="mr-2" />
              harshvyas98397916@gmail.com
            </a>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-500 text-sm">
            &copy; {currentYear} TalentFlow. All rights reserved.
          </p>
          <p className="text-center text-gray-500 text-sm mt-2 flex items-center justify-center">
            Made with <Heart size={14} className="mx-1 text-red-500" fill="currentColor" /> for HR professionals everywhere
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
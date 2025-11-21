import React, { useState, useRef } from 'react';
import { CVInput } from '../types';

interface Props {
  onFileSelect: (input: CVInput) => void;
  disabled: boolean;
}

const FileUpload: React.FC<Props> = ({ onFileSelect, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    
    // Handle PDF
    if (file.type === 'application/pdf') {
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Extract base64 part (remove "data:application/pdf;base64,")
          const base64Data = result.split(',')[1];
          onFileSelect({ mimeType: 'application/pdf', data: base64Data });
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // Handle Word Documents (Simplified check)
    if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      alert("For best results, please convert your Word document to PDF before uploading.");
      return;
    }
    
    // Handle Text
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        onFileSelect(text);
      }
    };

    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      alert("Please upload a PDF or Text file.");
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div 
        className={`relative group border-2 border-dashed rounded-2xl p-10 transition-all duration-300 text-center
          ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-indigo-400 hover:bg-slate-800/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          accept=".pdf,.txt,.md"
          onChange={handleChange}
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-medium text-slate-200">Upload CV (PDF or Text)</p>
            <p className="text-sm text-slate-400 mt-1">Drag & drop or click to browse</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
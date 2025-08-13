import React from 'react';
import { X } from 'lucide-react';
import MermaidDiagram from './MermaidDiagram';

interface DiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  chart: string;
}

const DiagramModal: React.FC<DiagramModalProps> = ({ isOpen, onClose, chart }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-[95vw] h-[95vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 right-0 p-4 z-10">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        
        {/* Diagram Container */}
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="w-full h-full flex items-center justify-center">
            <MermaidDiagram chart={chart} isFullScreen={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagramModal; 
'use client';
import React, { useState } from 'react';
import { Heart, Gift } from 'lucide-react';
import DonateModal from './DonateModal';

const DonateButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleDonateClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleDonateClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Heart className="w-4 h-4" />
          <span className="font-medium">Buy Coffee</span>
          <Gift className="w-4 h-4" />
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-10">
            <div className="flex items-center gap-2">
              <Heart className="w-3 h-3" />
              <span>Buy us a coffee ☕</span>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>

      <DonateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default DonateButton;

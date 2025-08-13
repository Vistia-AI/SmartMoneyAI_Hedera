'use client';
import React, { useState } from 'react';
import { Heart, Gift, Sparkles } from 'lucide-react';
import DonateModal from './DonateModal';

const DonationWidget: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDonateClick = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300">
        <div className="text-center">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Heart className="w-6 h-6 text-white" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Buy us a Coffee ☕
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Please donate a cup of tea or coffee to the developer team.
          </p>
          
                      <button
              onClick={handleDonateClick}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
            >
            <Gift className="w-4 h-4" />
            <span>Buy Coffee</span>
            <Sparkles className="w-4 h-4" />
          </button>
          
          <div className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-500">
            <Heart className="w-3 h-3 text-green-500" />
            <span>Every cup helps! ☕</span>
          </div>
        </div>
      </div>

      <DonateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default DonationWidget;

'use client';
import React, { useState } from 'react';
import { Heart, X, Gift, Star } from 'lucide-react';
import DonateModal from './DonateModal';

const DonationBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDonateClick = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-green-500 via-blue-500 to-green-600 text-white p-4 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-20 h-20 bg-white rounded-full -translate-x-10 -translate-y-10"></div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full translate-x-8 -translate-y-8"></div>
          <div className="absolute bottom-0 left-1/4 w-12 h-12 bg-white rounded-full translate-y-6"></div>
        </div>

        <div className="relative z-10 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 animate-pulse" />
              <Star className="w-4 h-4" />
            </div>
            <div>
              <p className="font-medium">
                Love VistiaScanAI? Buy us a coffee! ☕
              </p>
              <p className="text-sm opacity-90">
                Please donate a cup of tea or coffee to the developer team.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDonateClick}
              className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-gray-100 transition-colors shadow-lg"
            >
              <Gift className="w-4 h-4" />
              Buy Coffee
            </button>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
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

export default DonationBanner;

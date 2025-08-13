'use client';
import React, { useState, useEffect } from 'react';
import { Heart, Gift, Users, DollarSign, TrendingUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import DonateModal from '../components/DonateModal';
import DonationStats from '../components/DonationStats';
import donateService from '../services/donateService';

const DonatePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const donationStats = await donateService.getDonationStats();
      setStats(donationStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDonateClick = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Explorer</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleDonateClick}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-all duration-200 shadow-lg"
              >
                <Heart className="w-5 h-5" />
                <span>Buy Coffee</span>
                <Gift className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Buy us a Coffee ☕
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Please donate a cup of tea or coffee to the developer team. 
            Your support enables us to maintain, improve, and expand VistiaScanAI's capabilities.
          </p>
          
          <button
            onClick={handleDonateClick}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl font-semibold text-lg hover:from-green-600 hover:to-blue-600 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-105"
          >
            <Gift className="w-6 h-6" />
            <span>Buy Coffee</span>
            <Heart className="w-6 h-6" />
          </button>
        </div>

        {/* Stats Section */}
        <div className="mb-12">
          <DonationStats />
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Continuous Development
            </h3>
            <p className="text-gray-600">
              Your coffee donations help us continuously improve VistiaScanAI with new features, 
              better AI analysis, and enhanced user experience. ☕
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Community Growth
            </h3>
            <p className="text-gray-600">
              Coffee support helps us grow our community, provide better support, 
              and create more educational content for blockchain enthusiasts. ☕
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Infrastructure Costs
            </h3>
            <p className="text-gray-600">
              Coffee donations help cover server costs, API fees, and infrastructure 
              needed to keep VistiaScanAI running smoothly and reliably. ☕
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-xl p-8 shadow-lg border">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            How Your Donation Helps
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🚀 Development Priorities
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Enhanced AI analysis capabilities</li>
                <li>• Support for more blockchain networks</li>
                <li>• Improved transaction visualization</li>
                <li>• Better mobile experience</li>
                <li>• Advanced analytics features</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💡 Community Benefits
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Free access to premium features</li>
                <li>• Regular updates and improvements</li>
                <li>• Better customer support</li>
                <li>• Educational content and tutorials</li>
                <li>• Community events and workshops</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <DonateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default DonatePage;

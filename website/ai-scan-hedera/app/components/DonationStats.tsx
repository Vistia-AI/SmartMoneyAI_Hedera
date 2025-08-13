'use client';
import React, { useState, useEffect } from 'react';
import { Heart, Users, DollarSign, TrendingUp } from 'lucide-react';
import donateService, { DonationStats } from '../services/donateService';

const DonationStats: React.FC = () => {
  const [stats, setStats] = useState<DonationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const donationStats = await donateService.getDonationStats();
      setStats(donationStats);
    } catch (err) {
      setError('Failed to load donation statistics');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-2 text-gray-600">Loading stats...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={loadStats}
            className="mt-2 text-purple-600 hover:text-purple-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-semibold text-gray-900">Community Support</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Donations</p>
            <p className="font-semibold text-gray-900">
              {parseFloat(stats.totalDonations).toFixed(2)} HBAR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Supporters</p>
            <p className="font-semibold text-gray-900">{stats.donorCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Contract Balance</p>
            <p className="font-semibold text-gray-900">
              {parseFloat(stats.contractBalance).toFixed(2)} HBAR
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
        <p className="text-sm text-gray-700 text-center">
          Thank you to all our supporters! Your coffee donations fuel our development. ☕
        </p>
      </div>
    </div>
  );
};

export default DonationStats;

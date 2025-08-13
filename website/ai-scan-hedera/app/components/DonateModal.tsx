'use client';
import React, { useState } from 'react';
import { X, Heart, Gift, MessageCircle, Loader2, Wallet } from 'lucide-react';
import donateService, { DonationResult } from '../services/donateService';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState('1');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const presetAmounts = [
    { value: '1', label: '1 HBAR ☕' },
    { value: '3', label: '3 HBAR 🍵' },
    { value: '5', label: '5 HBAR ☕☕' },
    { value: '10', label: '10 HBAR 🍵☕' },
  ];

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        setError('MetaMask is not installed. Please install MetaMask to make a donation.');
        setIsLoading(false);
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        setError('Please connect your wallet to make a donation.');
        setIsLoading(false);
        return;
      }

      // Get provider and signer
      const provider = donateService.getProvider();
      const signer = await provider.getSigner();

      // Make the donation
      const result: DonationResult = await donateService.donate(amount, message, signer);
      
      if (result.success) {
        setIsSuccess(true);
                 setTimeout(() => {
           onClose();
           setIsSuccess(false);
           setAmount('1');
           setMessage('');
         }, 5000);
      } else {
        setError(result.error || 'Donation failed. Please try again.');
      }
    } catch (err) {
      console.error('Donation error:', err);
      setError('Donation failed. Please check your wallet and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Support VistiaScanAI</h2>
          <p className="text-gray-600">
            Please donate a cup of tea or coffee to the developer team.
          </p>
        </div>

        {!isSuccess ? (
          <>
            {/* Amount Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Donation Amount
              </label>
                             <div className="grid grid-cols-2 gap-3 mb-4">
                 {presetAmounts.map((preset) => (
                   <button
                     key={preset.value}
                     onClick={() => setAmount(preset.value)}
                     className={`p-3 rounded-lg border-2 transition-all ${
                       amount === preset.value
                         ? 'border-green-500 bg-green-50 text-green-700'
                         : 'border-gray-200 hover:border-green-300'
                     }`}
                   >
                     <div className="font-medium">{preset.label}</div>
                   </button>
                 ))}
               </div>
              
              {/* Custom Amount */}
                             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Custom Amount (HBAR) ☕
                 </label>
                 <input
                   type="number"
                   value={amount}
                   onChange={(e) => setAmount(e.target.value)}
                   placeholder="1"
                   step="1"
                   min="1"
                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                 />
               </div>
            </div>

            {/* Message */}
            <div className="mb-6">
                               <label className="block text-sm font-medium text-gray-700 mb-2">
                   Message (Optional) 💬
                 </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                                 placeholder="Leave a message of support... ☕"
                rows={3}
                                 className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Donate Button */}
                         <button
               onClick={handleDonate}
               disabled={isLoading}
               className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
               {isLoading ? (
                 <>
                   <Loader2 className="w-5 h-5 animate-spin" />
                   Processing...
                 </>
               ) : (
                 <>
                   <Gift className="w-5 h-5" />
                   Donate {amount} HBAR
                 </>
               )}
             </button>

            {/* Info */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Every cup of coffee fuels our development! ☕
              </p>
            </div>
          </>
        ) : (
          /* Success State */
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-green-600 fill-current" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Thank You!
            </h3>
            <p className="text-gray-600 mb-4">
              Your donation has been received. We appreciate your support!
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">
                Your donation has been processed successfully!
              </p>
              <p className="text-xs text-green-600 mt-1">
                Transaction will be confirmed on Hedera Mainnet shortly.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonateModal;

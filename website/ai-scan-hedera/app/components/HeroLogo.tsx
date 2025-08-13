import React from 'react';

interface HeroLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const HeroLogo: React.FC<HeroLogoProps> = ({ 
  size = 120, 
  className = '',
  showText = true 
}) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Main Logo */}
      <div 
        className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-2xl mb-4"
        style={{ width: size, height: size }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600/80 to-blue-600/80" />
        
        {/* Scan frame corners */}
        <div className="absolute top-2 left-2 w-4 h-4 border-l-4 border-t-4 border-white rounded-tl-lg" />
        <div className="absolute top-2 right-2 w-4 h-4 border-r-4 border-t-4 border-white rounded-tr-lg" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-l-4 border-b-4 border-white rounded-bl-lg" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-r-4 border-b-4 border-white rounded-br-lg" />
        
        {/* Document icon with V */}
        <div className="relative z-10 flex items-center justify-center">
          <div className="relative">
            {/* Document shape */}
            <div className="w-16 h-20 bg-white rounded-lg shadow-lg relative">
              {/* Folded corner */}
              <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-bl-lg" />
              {/* V letter */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-purple-600 font-bold text-4xl leading-none">V</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* AI indicator dots */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
      
      {/* Text */}
      {showText && (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">VistiaScanAI</h1>
          <p className="text-lg text-gray-600">Intelligent Blockchain Analytics Platform</p>
        </div>
      )}
    </div>
  );
};

export default HeroLogo;

import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 40, className = '' }) => {
  return (
    <div 
      className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-lg ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-600/80 to-blue-600/80" />
      
      {/* Scan frame corners */}
      <div className="absolute top-1 left-1 w-2 h-2 border-l-2 border-t-2 border-white rounded-tl-sm" />
      <div className="absolute top-1 right-1 w-2 h-2 border-r-2 border-t-2 border-white rounded-tr-sm" />
      <div className="absolute bottom-1 left-1 w-2 h-2 border-l-2 border-b-2 border-white rounded-bl-sm" />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-white rounded-br-sm" />
      
      {/* Document icon with V */}
      <div className="relative z-10 flex items-center justify-center">
        <div className="relative">
          {/* Document shape */}
          <div className="w-6 h-7 bg-white rounded-sm shadow-sm relative">
            {/* Folded corner */}
            <div className="absolute top-0 right-0 w-2 h-2 bg-gradient-to-br from-gray-200 to-gray-300 rounded-bl-sm" />
            {/* V letter */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-purple-600 font-bold text-lg leading-none">V</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI indicator dots */}
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
        <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
        <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
};

export default Logo;

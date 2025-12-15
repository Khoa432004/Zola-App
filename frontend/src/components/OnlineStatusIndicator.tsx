'use client';

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  size?: 'small' | 'medium' | 'large';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export default function OnlineStatusIndicator({
  isOnline,
  size = 'medium',
  position = 'bottom-right',
}: OnlineStatusIndicatorProps) {
  // Debug log
  console.log(`[OnlineStatusIndicator] isOnline=${isOnline}, size=${size}, position=${position}`);
  
  if (!isOnline) return null;

  const sizeMap = {
    small: 9, // Reduced by 30% from 13
    medium: 13, // Reduced by 30% from 19
    large: 18, // Reduced by 30% from 26
  };

  const positionMap = {
    'bottom-right': { bottom: 0, right: 0 },
    'bottom-left': { bottom: 0, left: 0 },
    'top-right': { top: 0, right: 0 },
    'top-left': { top: 0, left: 0 },
  };

  const dotSize = sizeMap[size];
  const positionStyle = positionMap[position];

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyle,
        width: dotSize,
        height: dotSize,
        borderRadius: '50%',
        backgroundColor: '#10b981', // Green color for online
        border: '2px solid #ffffff',
        zIndex: 1000, // Increased z-index to ensure it's visible
        pointerEvents: 'none', // Don't block pointer events
      }}
    />
  );
}


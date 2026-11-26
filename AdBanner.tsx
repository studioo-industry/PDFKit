import React from 'react';

interface AdBannerProps {
  variant?: 'horizontal' | 'sidebar' | 'compact';
  className?: string;
}

// Ads and Pro upgrade prompts disabled
export const AdBanner: React.FC<AdBannerProps> = () => {
  return null;
};

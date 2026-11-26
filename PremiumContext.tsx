import React, { createContext, useContext, useState } from 'react';
import { UserPlan } from '../types';

interface PremiumContextType {
  plan: UserPlan;
  isPremium: boolean;
  upgradeToPremium: () => void;
  downgradeToFree: () => void;
  isUpgradeModalOpen: boolean;
  openUpgradeModal: (reason?: string) => void;
  closeUpgradeModal: () => void;
  upgradeReason: string;
  checkFileLimit: (fileSize: number, fileCount: number) => { allowed: boolean; message?: string };
}

const FILE_SIZE_LIMIT_MB = 1000; // 1 GB
const BATCH_LIMIT = 100;

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // All features are 100% free and unlocked for everyone
  const [isPremium] = useState<boolean>(true);

  const plan: UserPlan = {
    isPremium: true,
    planName: 'Free',
    showAds: false,
    fileSizeLimitMB: FILE_SIZE_LIMIT_MB,
    batchLimit: BATCH_LIMIT,
  };

  const upgradeToPremium = () => {};
  const downgradeToFree = () => {};
  const openUpgradeModal = () => {};
  const closeUpgradeModal = () => {};

  const checkFileLimit = (fileSize: number, fileCount: number): { allowed: boolean; message?: string } => {
    const maxSizeBytes = FILE_SIZE_LIMIT_MB * 1024 * 1024;

    if (fileSize > maxSizeBytes) {
      return {
        allowed: false,
        message: `File size exceeds the 1GB limit.`,
      };
    }

    if (fileCount > BATCH_LIMIT) {
      return {
        allowed: false,
        message: `Batch limit of ${BATCH_LIMIT} files reached.`,
      };
    }

    return { allowed: true };
  };

  return (
    <PremiumContext.Provider
      value={{
        plan,
        isPremium,
        upgradeToPremium,
        downgradeToFree,
        isUpgradeModalOpen: false,
        openUpgradeModal,
        closeUpgradeModal,
        upgradeReason: '',
        checkFileLimit,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

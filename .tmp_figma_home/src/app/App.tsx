import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { OnboardingPage, OnboardingFormData } from './components/OnboardingPage';
import { GroupsPage, GroupsPageLoading } from './components/GroupsPage';
import { JoinGroupModal } from './components/JoinGroupModal';
import { ImpactSummary } from './components/ImpactSummary';
import { BuyingGroup, mockBuyingGroups } from './data/mockData';

type AppState = 'onboarding' | 'loading' | 'groups';

function App() {
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [userData, setUserData] = useState<OnboardingFormData | null>(null);
  const [selectedGroupForJoin, setSelectedGroupForJoin] = useState<BuyingGroup | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showImpactSummary, setShowImpactSummary] = useState(false);

  // Handle onboarding completion
  const handleOnboardingComplete = (data: OnboardingFormData) => {
    setUserData(data);
    setAppState('loading');

    // Simulate geocoding and data loading
    setTimeout(() => {
      setAppState('groups');
      toast.success('Welcome to GreenSupply!', {
        description: `Your business "${data.businessName}" has been successfully registered.`,
        duration: 4000,
      });

      // Show impact summary after a brief delay
      setTimeout(() => {
        setShowImpactSummary(true);
      }, 1000);
    }, 2000);
  };

  // Handle join group request
  const handleJoinGroupRequest = (group: BuyingGroup) => {
    setSelectedGroupForJoin(group);
  };

  // Handle join group confirmation
  const handleJoinGroupConfirm = (unitsToPurchase: number) => {
    if (!selectedGroupForJoin) return;

    setIsJoining(true);

    // Simulate API call
    setTimeout(() => {
      setIsJoining(false);
      setSelectedGroupForJoin(null);

      // Success toast with custom styling
      toast.success('Successfully Joined!', {
        description: `You've joined the ${selectedGroupForJoin.productName} buying group with ${unitsToPurchase} ${selectedGroupForJoin.unitType}.`,
        duration: 5000,
      });

      // Update impact summary visibility
      if (!showImpactSummary) {
        setTimeout(() => {
          setShowImpactSummary(true);
        }, 500);
      }
    }, 1500);
  };

  // Handle modal close
  const handleModalClose = () => {
    if (!isJoining) {
      setSelectedGroupForJoin(null);
    }
  };

  // Render based on app state
  if (appState === 'onboarding') {
    return (
      <>
        <OnboardingPage onComplete={handleOnboardingComplete} />
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  if (appState === 'loading') {
    return (
      <>
        <GroupsPageLoading />
        <Toaster position="top-right" richColors closeButton />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#f5f3ed]">
        <GroupsPage onJoinGroup={handleJoinGroupRequest} />

        {/* Impact Summary Section */}
        {showImpactSummary && (
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 pb-4 sm:pb-6">
            <ImpactSummary />
          </div>
        )}
      </div>

      {/* Join Group Modal */}
      <JoinGroupModal
        isOpen={!!selectedGroupForJoin}
        onClose={handleModalClose}
        group={selectedGroupForJoin}
        onConfirm={handleJoinGroupConfirm}
        isSubmitting={isJoining}
      />

      {/* Toast Notifications */}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'var(--font-sans)',
            border: '1px solid rgba(107, 128, 116, 0.15)',
          },
        }}
      />
    </>
  );
}

export default App;
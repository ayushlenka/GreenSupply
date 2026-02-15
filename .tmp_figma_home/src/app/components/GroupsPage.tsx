import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Leaf, Search, Filter, Loader2, Package, Map, List } from 'lucide-react';
import { MapView } from './MapView';
import { GroupCard, GroupCardSkeleton } from './GroupCard';
import { BuyingGroup, mockBuyingGroups, mockBusinesses, getBusinessesForGroup } from '../data/mockData';
import { Header } from './Header';

interface GroupsPageProps {
  onJoinGroup: (group: BuyingGroup) => void;
  isLoading?: boolean;
}

export const GroupsPage: React.FC<GroupsPageProps> = ({ onJoinGroup, isLoading = false }) => {
  const [selectedGroup, setSelectedGroup] = useState<BuyingGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'map' | 'list'>('list');

  // Filter groups based on search
  const filteredGroups = mockBuyingGroups.filter((group) =>
    group.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get businesses to display on map
  const businessesToShow = selectedGroup
    ? getBusinessesForGroup(selectedGroup)
    : mockBusinesses;

  const handleGroupClick = (group: BuyingGroup) => {
    setSelectedGroup(group.id === selectedGroup?.id ? null : group);
    // On mobile, switch to map view when group is selected
    if (window.innerWidth < 1024) {
      setMobileView('map');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ed]">
      {/* Header */}
      <Header variant="app" />

      {/* Mobile View Toggle */}
      <div className="lg:hidden sticky top-[65px] z-20 bg-[#f5f3ed] border-b border-[rgba(107,128,116,0.15)] px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={() => setMobileView('list')}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              mobileView === 'list'
                ? 'bg-[#2d4a3e] text-[#f5f3ed]'
                : 'bg-[#ffffff] text-[#6b8074] border border-[rgba(107,128,116,0.15)]'
            }`}
          >
            <List className="w-4 h-4" />
            Groups
          </button>
          <button
            onClick={() => setMobileView('map')}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              mobileView === 'map'
                ? 'bg-[#2d4a3e] text-[#f5f3ed]'
                : 'bg-[#ffffff] text-[#6b8074] border border-[rgba(107,128,116,0.15)]'
            }`}
          >
            <Map className="w-4 h-4" />
            Map
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-4 sm:p-6">
        <div className="grid lg:grid-cols-[1fr_420px] gap-4 sm:gap-6 min-h-[600px] lg:h-[calc(100vh-140px)]">
          {/* Map Section */}
          <div className={`relative bg-[#ffffff] rounded-xl border border-[rgba(107,128,116,0.15)] shadow-md overflow-hidden ${
            mobileView === 'list' ? 'hidden lg:block' : ''
          }`}>
            {selectedGroup && (
              <div className="absolute top-4 left-4 z-[400] bg-[#ffffff] px-4 py-2 rounded-lg shadow-lg border border-[rgba(107,128,116,0.15)] max-w-[calc(100%-2rem)]">
                <div className="text-xs text-[#6b8074] mb-0.5">Viewing</div>
                <div className="font-semibold text-[#1a1d1f] text-sm sm:text-base truncate">
                  {selectedGroup.productName}
                </div>
                <div className="text-xs text-[#6b8074] mt-1">
                  2-mile radius • {selectedGroup.participatingBusinesses} businesses
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroup(null);
                  }}
                  className="mt-2 text-xs text-[#2d4a3e] hover:underline lg:hidden"
                >
                  ← Back to all groups
                </button>
              </div>
            )}
            <MapView
              businesses={businessesToShow}
              selectedGroup={selectedGroup}
              className="h-full w-full"
            />
          </div>

          {/* Groups Panel */}
          <div className={`flex flex-col bg-[#ffffff] rounded-xl border border-[rgba(107,128,116,0.15)] shadow-md overflow-hidden ${
            mobileView === 'map' ? 'hidden lg:flex' : ''
          }`}>
            {/* Panel Header */}
            <div className="p-4 sm:p-5 border-b border-[rgba(107,128,116,0.15)]">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1a1d1f] mb-3 sm:mb-4">Active Buying Groups</h2>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b8074]" />
                <input
                  type="text"
                  placeholder="Search by product or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f5f3ed] border border-[rgba(107,128,116,0.15)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d4a3e]/20 transition-all"
                />
              </div>
            </div>

            {/* Groups List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <GroupCardSkeleton key={i} />
                  ))}
                </>
              ) : filteredGroups.length === 0 ? (
                <EmptyState searchQuery={searchQuery} />
              ) : (
                filteredGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isSelected={selectedGroup?.id === group.id}
                    onClick={() => handleGroupClick(group)}
                    onJoin={() => onJoinGroup(group)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-16 h-16 bg-[#ebe7db] rounded-full flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-[#6b8074]" />
      </div>
      <h3 className="text-lg font-semibold text-[#1a1d1f] mb-2">
        {searchQuery ? 'No Groups Found' : 'No Active Groups'}
      </h3>
      <p className="text-sm text-[#6b8074] max-w-xs">
        {searchQuery
          ? `No buying groups match "${searchQuery}". Try a different search term.`
          : 'There are currently no active buying groups. Check back soon!'}
      </p>
    </motion.div>
  );
};

// Loading state for entire page
export const GroupsPageLoading: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f5f3ed] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-[#2d4a3e] animate-spin" />
        <p className="text-[#6b8074]">Loading buying groups...</p>
      </div>
    </div>
  );
};
import React from 'react';
import { Progress } from './ui/progress';
import { Calendar, Users, TrendingDown, Package } from 'lucide-react';
import { BuyingGroup } from '../data/mockData';
import { StatusChip, CategoryChip } from './Chips';
import { cn } from './ui/utils';
import { motion } from 'motion/react';

interface GroupCardProps {
  group: BuyingGroup;
  isSelected?: boolean;
  onClick?: () => void;
  onJoin?: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ 
  group, 
  isSelected = false, 
  onClick,
  onJoin 
}) => {
  const progressPercentage = (group.currentUnits / group.targetUnits) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'bg-[#ffffff] rounded-lg border transition-all cursor-pointer',
        'hover:shadow-lg hover:border-[#2d4a3e]/30',
        isSelected 
          ? 'border-[#2d4a3e] shadow-md ring-2 ring-[#2d4a3e]/10' 
          : 'border-[rgba(107,128,116,0.15)]'
      )}
      onClick={onClick}
    >
      {/* Card Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#1a1d1f] mb-1.5">
              {group.productName}
            </h3>
            <CategoryChip category={group.category} />
          </div>
          <StatusChip status={group.status} />
        </div>

        {/* Progress Section */}
        <div className="mt-4 mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm text-[#6b8074]">Progress</span>
            <span className="text-sm font-medium text-[#1a1d1f]">
              {group.currentUnits} / {group.targetUnits} {group.unitType}
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2 bg-[#ebe7db]"
            indicatorClassName={cn(
              'transition-all duration-500',
              group.status === 'confirmed' && 'bg-[#1f6f5c]',
              group.status === 'near-target' && 'bg-[#b87447]',
              group.status === 'active' && 'bg-[#2d4a3e]'
            )}
          />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[#6b8074] mb-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span className="text-xs">Savings</span>
            </div>
            <span className="text-base font-semibold text-[#1f6f5c]">
              ${group.savingsPerUnit}
            </span>
            <span className="text-xs text-[#6b8074]">per {group.unitType.slice(0, -1)}</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[#6b8074] mb-1">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs">Businesses</span>
            </div>
            <span className="text-base font-semibold text-[#1a1d1f]">
              {group.participatingBusinesses}
            </span>
            <span className="text-xs text-[#6b8074]">joined</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[#6b8074] mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">Time Left</span>
            </div>
            <span className="text-base font-semibold text-[#1a1d1f]">
              {group.daysLeft}
            </span>
            <span className="text-xs text-[#6b8074]">days</span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-5 py-3 bg-[#f5f3ed] border-t border-[rgba(107,128,116,0.1)]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin?.();
          }}
          disabled={group.status === 'confirmed'}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg font-medium transition-all',
            'flex items-center justify-center gap-2',
            group.status === 'confirmed'
              ? 'bg-[#d8e8e0] text-[#6b8074] cursor-not-allowed'
              : 'bg-[#2d4a3e] text-[#f5f3ed] hover:bg-[#1f6f5c] hover:shadow-md active:scale-[0.98]'
          )}
        >
          <Package className="w-4 h-4" />
          {group.status === 'confirmed' ? 'Target Reached' : 'Join This Group'}
        </button>
      </div>
    </motion.div>
  );
};

// Loading skeleton for group cards
export const GroupCardSkeleton: React.FC = () => {
  return (
    <div className="bg-[#ffffff] rounded-lg border border-[rgba(107,128,116,0.15)] animate-pulse">
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="h-6 bg-[#ebe7db] rounded w-3/4 mb-2"></div>
            <div className="h-5 bg-[#ebe7db] rounded w-20"></div>
          </div>
          <div className="h-6 bg-[#ebe7db] rounded w-16"></div>
        </div>
        <div className="mt-4 mb-4">
          <div className="h-2 bg-[#ebe7db] rounded w-full"></div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-4 bg-[#ebe7db] rounded w-12 mb-1"></div>
              <div className="h-5 bg-[#ebe7db] rounded w-10"></div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 py-3 bg-[#f5f3ed]">
        <div className="h-10 bg-[#ebe7db] rounded"></div>
      </div>
    </div>
  );
};

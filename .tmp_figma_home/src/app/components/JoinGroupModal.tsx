import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, AlertCircle, Package, TrendingDown, Calendar, Users } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { BuyingGroup } from '../data/mockData';
import { CategoryChip } from './Chips';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: BuyingGroup | null;
  onConfirm: (unitsToPurchase: number) => void;
  isSubmitting?: boolean;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  onConfirm,
  isSubmitting = false,
}) => {
  const [unitsToPurchase, setUnitsToPurchase] = useState(1);

  if (!group) return null;

  const remainingUnits = group.targetUnits - group.currentUnits;
  const maxUnits = Math.min(remainingUnits, 50);
  const totalSavings = unitsToPurchase * group.savingsPerUnit;

  const handleConfirm = () => {
    onConfirm(unitsToPurchase);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl mx-4">
      <ModalHeader>
        <div className="pr-8">
          <CategoryChip category={group.category} className="mb-3" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#1a1d1f] mb-2">
            {group.productName}
          </h2>
          <p className="text-sm text-[#6b8074]">
            Join this buying group to unlock wholesale pricing
          </p>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4 sm:space-y-6">
        {/* Group Info Grid */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-[#f5f3ed] rounded-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[#6b8074] mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs">Your Savings</span>
            </div>
            <span className="text-lg font-semibold text-[#1f6f5c]">
              ${group.savingsPerUnit}
            </span>
            <span className="text-xs text-[#6b8074]">per {group.unitType.slice(0, -1)}</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[#6b8074] mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Members</span>
            </div>
            <span className="text-lg font-semibold text-[#1a1d1f]">
              {group.participatingBusinesses}
            </span>
            <span className="text-xs text-[#6b8074]">businesses</span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[#6b8074] mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Closes In</span>
            </div>
            <span className="text-lg font-semibold text-[#1a1d1f]">
              {group.daysLeft}
            </span>
            <span className="text-xs text-[#6b8074]">days</span>
          </div>
        </div>

        {/* Units Selector */}
        <div>
          <label className="block text-sm font-medium text-[#1a1d1f] mb-3">
            How many {group.unitType} would you like to purchase?
          </label>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setUnitsToPurchase(Math.max(1, unitsToPurchase - 1))}
              className="w-10 h-10 rounded-lg border-2 border-[#2d4a3e] text-[#2d4a3e] hover:bg-[#2d4a3e] hover:text-[#f5f3ed] transition-all flex items-center justify-center font-semibold"
            >
              −
            </button>

            <div className="flex-1">
              <input
                type="number"
                min="1"
                max={maxUnits}
                value={unitsToPurchase}
                onChange={(e) => setUnitsToPurchase(Math.max(1, Math.min(maxUnits, parseInt(e.target.value) || 1)))}
                className="w-full text-center text-2xl font-bold text-[#1a1d1f] bg-[#f5f3ed] border border-[rgba(107,128,116,0.15)] rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-[#2d4a3e]/20"
              />
              <div className="text-center text-xs text-[#6b8074] mt-1">
                Max: {maxUnits} {group.unitType}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setUnitsToPurchase(Math.min(maxUnits, unitsToPurchase + 1))}
              className="w-10 h-10 rounded-lg border-2 border-[#2d4a3e] text-[#2d4a3e] hover:bg-[#2d4a3e] hover:text-[#f5f3ed] transition-all flex items-center justify-center font-semibold"
            >
              +
            </button>
          </div>
        </div>

        {/* Savings Summary */}
        <div className="p-4 bg-gradient-to-br from-[#e8f2ef] to-[#d8e8e0] rounded-lg border border-[#1f6f5c]/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#1f6f5c] rounded-lg">
              <TrendingDown className="w-5 h-5 text-[#f5f3ed]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-[#1a1d1f] mb-1">
                Total Estimated Savings
              </div>
              <div className="text-3xl font-bold text-[#1f6f5c]">
                ${totalSavings.toFixed(2)}
              </div>
              <div className="text-xs text-[#6b8074] mt-1">
                Based on {unitsToPurchase} {group.unitType} at ${group.savingsPerUnit} savings per unit
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex gap-3 p-4 bg-[#fef3e8] border border-[#b87447]/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-[#b87447] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[#1a1d1f]">
            <span className="font-medium">Commitment Notice:</span> Joining this group commits your business to purchasing the specified units once the target is reached. Payment will be processed within 48 hours of group confirmation.
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-[rgba(107,128,116,0.3)] text-[#1a1d1f] hover:bg-[#ebe7db] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#2d4a3e] text-[#f5f3ed] hover:bg-[#1f6f5c] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {isSubmitting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Package className="w-4 h-4" />
              </motion.div>
              Joining...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Confirm & Join Group
            </>
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
};
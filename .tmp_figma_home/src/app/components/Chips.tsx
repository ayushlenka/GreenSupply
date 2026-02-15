import React from 'react';
import { cn } from '../components/ui/utils';

interface StatusChipProps {
  status: 'active' | 'near-target' | 'confirmed';
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, className }) => {
  const variants = {
    'active': {
      bg: 'bg-[#e8f2ef]',
      text: 'text-[#2d4a3e]',
      label: 'Active'
    },
    'near-target': {
      bg: 'bg-[#fef3e8]',
      text: 'text-[#b87447]',
      label: 'Near Target'
    },
    'confirmed': {
      bg: 'bg-[#d8e8e0]',
      text: 'text-[#1f6f5c]',
      label: 'Confirmed'
    }
  };

  const variant = variants[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors',
        variant.bg,
        variant.text,
        className
      )}
    >
      {variant.label}
    </span>
  );
};

interface CategoryChipProps {
  category: string;
  className?: string;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({ category, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded text-xs font-medium',
        'bg-[#ebe7db] text-[#6b8074] border border-[rgba(107,128,116,0.15)]',
        className
      )}
    >
      {category}
    </span>
  );
};

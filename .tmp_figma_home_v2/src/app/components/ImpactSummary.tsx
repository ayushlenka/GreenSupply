import React from 'react';
import { motion } from 'motion/react';
import { TrendingDown, Leaf, Package, Truck } from 'lucide-react';

interface ImpactMetric {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  subtext: string;
  color: string;
}

export const ImpactSummary: React.FC = () => {
  const metrics: ImpactMetric[] = [
    {
      icon: TrendingDown,
      label: 'Total Savings',
      value: '$12,450',
      subtext: 'vs. individual purchasing',
      color: '#1f6f5c',
    },
    {
      icon: Leaf,
      label: 'CO₂ Reduced',
      value: '2.4 tons',
      subtext: 'through consolidated shipping',
      color: '#2d4a3e',
    },
    {
      icon: Package,
      label: 'Plastic Avoided',
      value: '850 lbs',
      subtext: 'via bulk packaging',
      color: '#b87447',
    },
    {
      icon: Truck,
      label: 'Trips Reduced',
      value: '147',
      subtext: 'delivery consolidation',
      color: '#6b8074',
    },
  ];

  return (
    <div className="bg-[#ffffff] rounded-xl border border-[rgba(107,128,116,0.15)] shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#2d4a3e] to-[#1f6f5c]">
        <h3 className="text-lg sm:text-xl font-bold text-[#f5f3ed] mb-1">Community Impact</h3>
        <p className="text-sm text-[#f5f3ed]/80">Collective achievements in February 2026</p>
      </div>

      {/* Metrics Grid */}
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {metrics.map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex flex-col"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${metric.color}15` }}
              >
                <metric.icon className="w-6 h-6" style={{ color: metric.color }} />
              </div>
              <div className="text-xs text-[#6b8074] mb-1">{metric.label}</div>
              <div className="text-2xl font-bold text-[#1a1d1f] mb-0.5">{metric.value}</div>
              <div className="text-xs text-[#6b8074]">{metric.subtext}</div>
            </motion.div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-[rgba(107,128,116,0.15)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#1a1d1f]">Monthly Goal Progress</span>
            <span className="text-sm font-semibold text-[#2d4a3e]">73%</span>
          </div>
          <div className="h-3 bg-[#ebe7db] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '73%' }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-gradient-to-r from-[#2d4a3e] to-[#1f6f5c] rounded-full"
            />
          </div>
          <p className="text-xs text-[#6b8074] mt-2">
            22 of 30 buying groups completed this month
          </p>
        </div>
      </div>
    </div>
  );
};
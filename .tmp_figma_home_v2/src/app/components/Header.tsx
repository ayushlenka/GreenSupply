import React from 'react';
import { Leaf } from 'lucide-react';

interface HeaderProps {
  onGetStarted?: () => void;
  variant?: 'landing' | 'app';
}

export const Header: React.FC<HeaderProps> = ({ onGetStarted, variant = 'landing' }) => {
  if (variant === 'app') {
    // Simple app header for authenticated state
    return (
      <header className="bg-[#2d4a3e] border-b border-[rgba(245,243,237,0.1)] sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f5f3ed]/10 rounded-lg">
              <Leaf className="w-5 h-5 text-[#f5f3ed]" />
            </div>
            <span className="text-xl font-bold text-[#f5f3ed]">GreenSupply</span>
          </div>
        </div>
      </header>
    );
  }

  // Landing page header with full-width navigation
  return (
    <header className="bg-[#1a1d1f] border-b border-[rgba(107,128,116,0.2)] sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 py-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6b8074] rounded-lg">
              <Leaf className="w-6 h-6 text-[#f5f3ed]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#f5f3ed] tracking-tight">GreenSupply</div>
              <div className="text-xs text-[#6b8074]">Affordable <span className="text-[#f5f3ed]">Sustainable</span> Solutions</div>
            </div>
          </div>

          {/* Navigation - Full width menu */}
          <nav className="hidden lg:flex items-center gap-8">
            <a href="#services" className="text-[#f5f3ed] hover:text-[#6b8074] transition-colors font-semibold text-sm tracking-wider uppercase">
              Services
            </a>
            <a href="#features" className="text-[#f5f3ed] hover:text-[#6b8074] transition-colors font-semibold text-sm tracking-wider uppercase">
              Features
            </a>
            <a href="#how-it-works" className="text-[#f5f3ed] hover:text-[#6b8074] transition-colors font-semibold text-sm tracking-wider uppercase">
              How It Works
            </a>
            <a href="#about" className="text-[#f5f3ed] hover:text-[#6b8074] transition-colors font-semibold text-sm tracking-wider uppercase">
              About
            </a>
            <a href="#contact" className="text-[#f5f3ed] hover:text-[#6b8074] transition-colors font-semibold text-sm tracking-wider uppercase">
              Contact
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};
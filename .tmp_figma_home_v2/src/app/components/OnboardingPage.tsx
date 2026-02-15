import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Leaf, Users, TrendingDown, MapPin, Package, Building2, CheckCircle2 } from 'lucide-react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { AccountType } from '../data/mockData';
import { Header } from './Header';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface OnboardingPageProps {
  onComplete: (data: OnboardingFormData) => void;
}

export interface OnboardingFormData {
  accountType: AccountType;
  businessName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    accountType: 'business',
    businessName: '',
    address: '',
    city: 'San Francisco',
    state: 'CA',
    zip: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  const updateFormData = (field: keyof OnboardingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-[#ebe7db]">
        {/* Minimalist Header */}
        <header className="bg-[#ebe7db] border-b border-[rgba(107,128,116,0.1)] sticky top-0 z-40">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-6">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-[#2d4a3e]" />
                <span className="text-sm font-medium text-[#1a1d1f] tracking-wide">GreenSupply</span>
              </div>

              {/* Back Button */}
              <button
                onClick={() => setShowForm(false)}
                className="text-[#6b8074] hover:text-[#1a1d1f] transition-colors text-sm"
              >
                ← Back
              </button>
            </div>
          </div>
        </header>

        {/* Form Content */}
        <div className="max-w-[900px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Title Section */}
            <div className="mb-16">
              <h1 className="text-5xl lg:text-6xl font-light text-[#1a1d1f] mb-6 leading-tight tracking-tight">
                Join the network.
              </h1>
              <p className="text-lg text-[#6b8074] leading-relaxed max-w-2xl">
                Enter your business details to get started with sustainable bulk-buying in San Francisco.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Account Type */}
              <div>
                <Label className="text-[#1a1d1f] mb-4 block text-base font-medium">
                  Account Type
                </Label>
                <RadioGroup
                  value={formData.accountType}
                  onValueChange={(value) => updateFormData('accountType', value as AccountType)}
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="relative flex cursor-pointer">
                      <RadioGroupItem value="business" className="peer sr-only" />
                      <div className="flex-1 flex items-start gap-4 p-6 rounded-2xl bg-[#ffffff] border-2 border-[rgba(107,128,116,0.15)] peer-data-[state=checked]:border-[#2d4a3e] peer-data-[state=checked]:bg-[#f5f3ed] transition-all hover:border-[#6b8074]">
                        <div className="p-2 bg-[#2d4a3e]/10 rounded-xl">
                          <Building2 className="w-6 h-6 text-[#2d4a3e]" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#1a1d1f] text-lg mb-1">Business</div>
                          <div className="text-sm text-[#6b8074]">Join buying groups and save on sustainable products</div>
                        </div>
                      </div>
                    </label>

                    <label className="relative flex cursor-pointer">
                      <RadioGroupItem value="supplier" className="peer sr-only" />
                      <div className="flex-1 flex items-start gap-4 p-6 rounded-2xl bg-[#ffffff] border-2 border-[rgba(107,128,116,0.15)] peer-data-[state=checked]:border-[#2d4a3e] peer-data-[state=checked]:bg-[#f5f3ed] transition-all hover:border-[#6b8074]">
                        <div className="p-2 bg-[#2d4a3e]/10 rounded-xl">
                          <Package className="w-6 h-6 text-[#2d4a3e]" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#1a1d1f] text-lg mb-1">Supplier</div>
                          <div className="text-sm text-[#6b8074]">Create buying groups and reach local businesses</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Business Information Section */}
              <div className="pt-8 border-t border-[rgba(107,128,116,0.1)]">
                <h3 className="text-2xl font-light text-[#1a1d1f] mb-6">Business Information</h3>
                
                <div className="space-y-6">
                  {/* Business Name */}
                  <div>
                    <Label htmlFor="businessName" className="text-[#1a1d1f] text-base mb-3 block">
                      Business Name
                    </Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => updateFormData('businessName', e.target.value)}
                      placeholder="Your business name"
                      required
                      className="h-14 text-base bg-[#ffffff] border-[rgba(107,128,116,0.2)] focus:border-[#2d4a3e] rounded-xl"
                    />
                  </div>

                  {/* Street Address */}
                  <div>
                    <Label htmlFor="address" className="text-[#1a1d1f] text-base mb-3 block">
                      Street Address
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateFormData('address', e.target.value)}
                      placeholder="123 Main Street"
                      required
                      className="h-14 text-base bg-[#ffffff] border-[rgba(107,128,116,0.2)] focus:border-[#2d4a3e] rounded-xl"
                    />
                  </div>

                  {/* City, State, Zip */}
                  <div className="grid md:grid-cols-6 gap-4">
                    <div className="md:col-span-3">
                      <Label htmlFor="city" className="text-[#1a1d1f] text-base mb-3 block">
                        City
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => updateFormData('city', e.target.value)}
                        placeholder="San Francisco"
                        required
                        className="h-14 text-base bg-[#ffffff] border-[rgba(107,128,116,0.2)] focus:border-[#2d4a3e] rounded-xl"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Label htmlFor="state" className="text-[#1a1d1f] text-base mb-3 block">
                        State
                      </Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => updateFormData('state', e.target.value)}
                        placeholder="CA"
                        maxLength={2}
                        required
                        className="h-14 text-base bg-[#ffffff] border-[rgba(107,128,116,0.2)] focus:border-[#2d4a3e] rounded-xl uppercase"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="zip" className="text-[#1a1d1f] text-base mb-3 block">
                        ZIP Code
                      </Label>
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(e) => updateFormData('zip', e.target.value)}
                        placeholder="94102"
                        maxLength={5}
                        required
                        className="h-14 text-base bg-[#ffffff] border-[rgba(107,128,116,0.2)] focus:border-[#2d4a3e] rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-[#ffffff] rounded-2xl p-6 border border-[rgba(107,128,116,0.15)]">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#2d4a3e] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[#6b8074] leading-relaxed">
                      We'll geocode your address to match you with nearby businesses in your 2-mile zone. Your exact address remains private.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-8">
                <button
                  type="submit"
                  className="w-full bg-[#2d4a3e] hover:bg-[#1f6f5c] text-[#ebe7db] py-5 rounded-full font-medium transition-all hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 text-base"
                >
                  Complete Setup
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="bg-[#ebe7db] border-t border-[rgba(107,128,116,0.1)] py-12 mt-20">
          <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-[#2d4a3e]" />
                <span className="text-sm font-medium text-[#1a1d1f]">GreenSupply</span>
              </div>
              <div className="text-sm text-[#6b8074]">
                © 2026 GreenSupply. Sustainable bulk-buying for SF businesses.
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-[#ebe7db]">
      {/* Minimalist Header */}
      <header className="bg-[#ebe7db] border-b border-[rgba(107,128,116,0.1)] sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-[#2d4a3e]" />
              <span className="text-sm font-medium text-[#1a1d1f] tracking-wide">GreenSupply</span>
            </div>

            {/* Navigation - Minimal */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#services" className="text-[#6b8074] hover:text-[#1a1d1f] transition-colors text-sm">
                Services
              </a>
              <a href="#features" className="text-[#6b8074] hover:text-[#1a1d1f] transition-colors text-sm">
                Features
              </a>
              <a href="#about" className="text-[#6b8074] hover:text-[#1a1d1f] transition-colors text-sm">
                About
              </a>
            </nav>

            {/* CTA */}
            <button
              onClick={() => setShowForm(true)}
              className="bg-[#2d4a3e] hover:bg-[#1f6f5c] text-[#ebe7db] px-6 py-2 rounded-full text-sm font-medium transition-all"
            >
              Join now
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - "Browse everything." style */}
      <section className="bg-[#ebe7db] pt-20 pb-16">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-light text-[#1a1d1f] mb-16 leading-tight tracking-tight">
              Browse everything.
            </h1>
          </motion.div>

          {/* Hero Image with Device Frame */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            {/* Background Accent Blocks */}
            <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-32 h-48 bg-[#6b8074] rounded-2xl -z-10 hidden lg:block"></div>
            <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-32 h-48 bg-[#6b8074] rounded-2xl -z-10 hidden lg:block"></div>

            {/* Main Image Container */}
            <div className="relative bg-[#ffffff] rounded-3xl p-6 shadow-2xl border border-[rgba(107,128,116,0.1)]">
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1689917039554-6bcc2f3b3965?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYW4lMjBmcmFuY2lzY28lMjBza3lsaW5lJTIwZ29sZGVuJTIwZ2F0ZSUyMGJyaWRnZXxlbnwxfHx8fDE3NzExMDg0MTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="San Francisco skyline with Golden Gate Bridge"
                  className="w-full h-full object-cover"
                />
                {/* Overlay Stats */}
                <div className="absolute bottom-6 left-6 bg-[#1a1d1f]/90 backdrop-blur-md text-[#ebe7db] px-6 py-3 rounded-xl">
                  <div className="text-sm font-light">250+ Businesses</div>
                  <div className="text-xs text-[#6b8074] mt-1">Sustainable growth</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* "We've cracked the code" Section */}
      <section className="bg-[#ffffff] py-20 lg:py-32">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl lg:text-6xl font-light text-[#1a1d1f] mb-6 leading-tight">
                We've cracked<br />the code.
              </h2>
              <p className="text-lg text-[#6b8074] leading-relaxed mb-8">
                Small businesses lose negotiating power. We solve this by creating hyper-local buying groups within 2-mile zones, combining orders for wholesale pricing on sustainable products.
              </p>
              <div className="space-y-4">
                {[
                  'Geocoded addresses for precision matching',
                  'Real-time group progress tracking',
                  'CO2 & plastic reduction metrics',
                  '15-40% cost savings on eco products'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#2d4a3e] flex-shrink-0 mt-1" />
                    <span className="text-[#1a1d1f]">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1677207857573-cf0743756077?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYW4lMjBmcmFuY2lzY28lMjBwYWludGVkJTIwbGFkaWVzJTIwdmljdG9yaWFuJTIwaG91c2VzfGVufDF8fHx8MTc3MTEwODQxOHww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="San Francisco Painted Ladies Victorian houses"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* "Get the Big Picture" Section */}
      <section className="bg-[#ebe7db] py-20 lg:py-32">
        <div className="max-w-[900px] mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl lg:text-6xl font-light text-[#1a1d1f] mb-8 leading-tight">
              Get the Big Picture
            </h2>
            <p className="text-lg text-[#6b8074] leading-relaxed max-w-2xl mx-auto">
              GreenSupply maps your business location, finds nearby sustainable-minded companies, and creates buying groups. When your group reaches minimum order quantities, everyone unlocks wholesale pricing.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl"
          >
            <img
              src="https://images.unsplash.com/photo-1557780228-9a7cdb7bb8a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYW4lMjBmcmFuY2lzY28lMjBjaXR5JTIwYWVyaWFsJTIwZG93bnRvd258ZW58MXx8fHwxNzcxMTA4NDE5fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="San Francisco downtown aerial view"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* "Why Choose Aza?" / "Why Choose GreenSupply?" Section */}
      <section id="features" className="bg-[#ffffff] py-20 lg:py-32">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl lg:text-6xl font-light text-[#1a1d1f] mb-4 leading-tight">
              Why Choose GreenSupply?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                title: 'Hyper-Local',
                description: 'Strict 2x2 mile group zones ensure fast delivery and minimal carbon footprint.',
              },
              {
                title: 'Real Savings',
                description: 'Track progress bars showing how close your group is to unlocking wholesale rates.',
              },
              {
                title: 'Impact First',
                description: 'See your collective CO2 and plastic reduction metrics. Sustainability that counts.',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <h3 className="text-2xl font-medium text-[#1a1d1f] mb-4">{item.title}</h3>
                <p className="text-[#6b8074] leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* "Map Your Success" Section */}
      <section className="bg-[#ebe7db] py-20 lg:py-32">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-5xl lg:text-6xl font-light text-[#1a1d1f] mb-4 leading-tight">
              Map Your Success
            </h2>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-12">
            {[
              {
                number: '01',
                title: 'Join',
                description: 'Sign up and enter your San Francisco business address. We geocode it instantly and show you nearby buying groups.',
              },
              {
                number: '02',
                title: 'Connect',
                description: 'View an interactive map with available groups. See progress bars, current members, and estimated savings.',
              },
              {
                number: '03',
                title: 'Save',
                description: 'Once your group hits the minimum order, everyone unlocks wholesale pricing. Track your impact dashboard.',
              },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                viewport={{ once: true }}
              >
                <div className="text-7xl font-light text-[#6b8074]/20 mb-4">{step.number}</div>
                <h3 className="text-2xl font-medium text-[#1a1d1f] mb-4">{step.title}</h3>
                <p className="text-[#6b8074] leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Large Image Below */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 relative aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl"
          >
            <img
              src="https://images.unsplash.com/photo-1721170628059-2585e657c113?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGdhcmRlbiUyMHJvb2Z0b3AlMjBjaXR5JTIwc3VzdGFpbmFibGV8ZW58MXx8fHwxNzcxMTA4NDE5fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Urban sustainability and green spaces"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* "Connect with us" Section */}
      <section id="contact" className="bg-[#ffffff] py-20 lg:py-32">
        <div className="max-w-[900px] mx-auto px-6 lg:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl lg:text-6xl font-light text-[#1a1d1f] mb-8 leading-tight">
              Connect with us
            </h2>
            <p className="text-lg text-[#6b8074] mb-12 max-w-2xl mx-auto">
              Ready to unlock wholesale pricing and reduce your environmental impact? Join San Francisco's sustainable procurement network.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-[#2d4a3e] hover:bg-[#1f6f5c] text-[#ebe7db] px-12 py-4 rounded-full text-base font-medium transition-all hover:shadow-xl active:scale-[0.98]"
            >
              Get started today
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#ebe7db] border-t border-[rgba(107,128,116,0.1)] py-12">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-[#2d4a3e]" />
              <span className="text-sm font-medium text-[#1a1d1f]">GreenSupply</span>
            </div>
            <div className="text-sm text-[#6b8074]">
              © 2026 GreenSupply. Sustainable bulk-buying for SF businesses.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
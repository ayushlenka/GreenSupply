import { useState } from 'react';

import { createBusiness } from '../api';
import { getGoogleLoginUrl } from '../auth';
import Navbar from '../components/Navbar';

const BUSINESS_TYPE_OPTIONS = [
  'cafe',
  'restaurant',
  'bakery',
  'boba shop',
  'food truck',
  'grocery market',
  'caterer',
  'campus dining'
];

const INITIAL_FORM = {
  name: '',
  account_type: 'business',
  business_type: 'cafe',
  address: '',
  city: 'San Francisco',
  state: 'CA',
  zip: ''
};

const FEATURE_COLUMNS = [
  {
    title: 'Hyper-Local',
    description: 'Strict 2x2 mile group zones keep logistics efficient and delivery emissions low.'
  },
  {
    title: 'Real Savings',
    description: 'Track group progress to unlock wholesale pricing and reduce monthly packaging costs.'
  },
  {
    title: 'Impact First',
    description: 'Measure CO2, plastic avoidance, and consolidated delivery impact in one dashboard.'
  }
];

const HOW_IT_WORKS = [
  {
    number: '01',
    title: 'Join',
    description: 'Sign in and add your business address. GreenSupply places you in a local participation zone.'
  },
  {
    number: '02',
    title: 'Connect',
    description: 'Browse nearby buying groups, compare progress, and commit units to the products you need.'
  },
  {
    number: '03',
    title: 'Save',
    description: 'When the group reaches threshold, wholesale pricing activates and delivery is consolidated.'
  }
];

export default function HomePage({ auth }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = () => {
    try {
      window.location.href = getGoogleLoginUrl();
    } catch (err) {
      alert('Set REACT_APP_SUPABASE_URL in frontend env to enable Google login.');
    }
  };

  const onChange = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'account_type') {
        if (value === 'supplier') {
          next.business_type = 'supplier';
        } else if (prev.business_type === 'supplier') {
          next.business_type = 'cafe';
          next.city = 'San Francisco';
          next.state = 'CA';
        }
      }
      return next;
    });
  };

  const submitOnboarding = async (e) => {
    e.preventDefault();
    if (!auth?.user?.email) return;

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        email: auth.user.email,
      };
      const business = await createBusiness(payload);
      auth.onProfileCreated?.(business);
    } catch (err) {
      setError(String(err?.message || 'Failed to create account profile'));
    } finally {
      setSubmitting(false);
    }
  };

  const isBusiness = form.account_type === 'business';

  return (
    <div className="min-h-screen bg-[#ebe7db] text-[#1a1d1f]">
      <Navbar
        solid
        auth={auth}
        isAuthenticated={auth?.isAuthenticated}
        onLogout={auth?.onLogout}
        onGoogleLogin={!auth?.isAuthenticated ? handleGoogleLogin : undefined}
        showLinks={Boolean(auth?.profile)}
        accountType={auth?.profile?.account_type}
        tone="tan"
      />

      <main className="pt-24">
        <section className="reveal-up px-6 pb-16 pt-12 sm:px-10 lg:px-12">
          <div className="mx-auto max-w-[1200px]">
            <h1 className="text-5xl font-light leading-none tracking-tight text-[#1a1d1f] sm:text-7xl lg:text-8xl">
              Lower costs.
              <br />
              Build greener supply.
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-7 text-[#5b6c63] sm:text-lg">
              GreenSupply helps San Francisco businesses pool sustainable packaging demand, unlock wholesale pricing,
              and reduce delivery emissions through neighborhood buying groups.
            </p>

            {!auth?.isAuthenticated ? (
              <button
                onClick={handleGoogleLogin}
                className="mt-9 rounded-full bg-[#2d4a3e] px-8 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#ebe7db] transition hover:bg-[#1f6f5c]"
              >
                Get Started
              </button>
            ) : null}

            <div className="mt-12 rounded-3xl border border-[rgba(107,128,116,0.14)] bg-white p-4 shadow-xl sm:p-6">
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src="https://images.unsplash.com/photo-1689917039554-6bcc2f3b3965?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYW4lMjBmcmFuY2lzY28lMjBza3lsaW5lJTIwZ29sZGVuJTIwZ2F0ZSUyMGJyaWRnZXxlbnwxfHx8fDE3NzExMDg0MTh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="San Francisco skyline with Golden Gate Bridge"
                  className="h-[260px] w-full object-cover sm:h-[340px]"
                />
                <div className="absolute bottom-4 left-4 rounded-xl bg-[#1a1d1f]/88 px-4 py-3 text-[#ebe7db] backdrop-blur">
                  <p className="text-sm">250+ businesses participating</p>
                  <p className="mt-1 text-xs text-[#9cb0a5]">Growing monthly in SF neighborhoods</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="reveal-up bg-white px-6 py-20 sm:px-10 lg:px-12">
          <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-4xl font-light leading-tight sm:text-6xl">We solved the small-order problem.</h2>
              <p className="mt-6 text-base leading-7 text-[#5b6c63] sm:text-lg">
                Small businesses often cannot hit supplier minimums alone. GreenSupply matches nearby businesses with
                similar product needs so they can buy together, save together, and measure shared environmental impact.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-[#2a3a32] sm:text-base">
                {[
                  'Neighborhood matching with location-aware grouping',
                  'Progress tracking toward minimum order thresholds',
                  'Environmental and delivery impact reporting',
                  'Supplier and business role-based workflows'
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[#8ea397] bg-[#f0f5f1] text-[11px] font-bold text-[#2d4a3e]">
                      {String.fromCharCode(10003)}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-3xl shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1677207857573-cf0743756077?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYW4lMjBmcmFuY2lzY28lMjBwYWludGVkJTIwbGFkaWVzJTIwdmljdG9yaWFuJTIwaG91c2VzfGVufDF8fHx8MTc3MTEwODQxOHww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="San Francisco Painted Ladies Victorian houses"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section id="features" className="reveal-up px-6 py-20 sm:px-10 lg:px-12">
          <div className="mx-auto max-w-[1200px]">
            <h2 className="text-center text-4xl font-light leading-tight sm:text-6xl">Why GreenSupply</h2>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              {FEATURE_COLUMNS.map((item, idx) => (
                <article
                  key={item.title}
                  className="reveal-up rounded-2xl border border-[rgba(107,128,116,0.18)] bg-white p-6"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <h3 className="text-2xl font-medium">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5b6c63] sm:text-base">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="reveal-up bg-white px-6 py-20 sm:px-10 lg:px-12">
          <div className="mx-auto max-w-[1200px]">
            <h2 className="text-4xl font-light leading-tight sm:text-6xl">Map your procurement path</h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, idx) => (
                <article
                  key={step.number}
                  className="reveal-up rounded-2xl border border-[rgba(107,128,116,0.16)] bg-[#f7f5ef] p-6"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <p className="text-5xl font-light text-[#9caf9f]/50">{step.number}</p>
                  <h3 className="mt-3 text-2xl font-medium">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5b6c63] sm:text-base">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="reveal-up bg-[#78A555] px-6 py-20 sm:px-10 lg:px-12">
          <div className="mx-auto max-w-[900px] text-center">
            <h2 className="text-4xl font-light leading-tight text-white sm:text-6xl">Ready to join your local buying network?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">
              Start with your business profile, join active groups, and turn routine packaging purchases into
              measurable cost and impact gains.
            </p>
            {!auth?.isAuthenticated ? (
              <button
                onClick={handleGoogleLogin}
                className="mt-10 rounded-full border border-white/80 bg-white px-10 py-4 text-sm font-semibold uppercase tracking-[0.08em] text-[#3a5f2d] transition hover:bg-[#f3f9ed]"
              >
                Get Started
              </button>
            ) : null}
          </div>
        </section>

        {auth?.isAuthenticated && !auth?.profile ? (
          <section className="mx-auto mb-14 mt-2 w-full max-w-3xl rounded-2xl border border-[rgba(107,128,116,0.2)] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-[#1a1d1f]">Complete Account Setup</h2>
            <p className="mt-2 text-sm text-[#5b6c63]">
              Business accounts must be in San Francisco. Supplier accounts can be anywhere in the United States.
            </p>

            <form className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submitOnboarding}>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">Account Type</span>
                <select
                  value={form.account_type}
                  onChange={onChange('account_type')}
                  className="w-full rounded border border-black/15 bg-white px-3 py-2 text-[#1a1d1f]"
                >
                  <option value="business">Business</option>
                  <option value="supplier">Supplier</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">Business Name</span>
                <input value={form.name} onChange={onChange('name')} className="w-full rounded border border-black/15 px-3 py-2" />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">Business Type</span>
                {isBusiness ? (
                  <select
                    value={form.business_type}
                    onChange={onChange('business_type')}
                    className="w-full rounded border border-black/15 bg-white px-3 py-2"
                  >
                    {BUSINESS_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value="supplier"
                    disabled
                    className="w-full rounded border border-black/15 bg-black/5 px-3 py-2 text-ink/65"
                  />
                )}
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">Street Address</span>
                <input
                  value={form.address}
                  onChange={onChange('address')}
                  placeholder={isBusiness ? 'SF street address' : 'US street address'}
                  className="w-full rounded border border-black/15 px-3 py-2"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">City</span>
                <input value={form.city} onChange={onChange('city')} className="w-full rounded border border-black/15 px-3 py-2" />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">State</span>
                <input value={form.state} onChange={onChange('state')} className="w-full rounded border border-black/15 px-3 py-2" />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">ZIP</span>
                <input value={form.zip} onChange={onChange('zip')} className="w-full rounded border border-black/15 px-3 py-2" />
              </label>

              {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}

              <button
                  type="submit"
                  disabled={submitting}
                className="sm:col-span-2 rounded bg-[#2d4a3e] px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#1f6f5c] disabled:opacity-60"
              >
                {submitting ? 'Saving...' : 'Create Account Profile'}
              </button>
            </form>
          </section>
        ) : null}

      </main>
    </div>
  );
}




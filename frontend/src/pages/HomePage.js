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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-emerald-100/30 text-ink">
      <Navbar
        solid
        auth={auth}
        isAuthenticated={auth?.isAuthenticated}
        onLogout={auth?.onLogout}
        showLinks={Boolean(auth?.profile)}
        accountType={auth?.profile?.account_type}
      />

      <div className="pointer-events-none absolute -left-24 top-28 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-40 h-96 w-96 rounded-full bg-green-200/40 blur-3xl" />

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-14 pt-28 sm:px-10">
        <section className="text-center">
          <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
            Lower Packaging Costs.
            <br />
            <span className="text-moss">Cut Emissions Together.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-ink/70 sm:text-lg">
            GreenSupply helps small businesses buy sustainable packaging as a cooperative. By pooling demand, teams
            unlock bulk pricing, reduce fragmented deliveries, and make smarter environmental choices with measurable
            impact.
          </p>

          {!auth?.isAuthenticated ? (
            <button
              onClick={handleGoogleLogin}
              className="mt-10 rounded-full bg-moss px-8 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-sage"
            >
              Continue With Google
            </button>
          ) : null}
        </section>

        {auth?.isAuthenticated && !auth?.profile ? (
          <section className="mx-auto mt-12 w-full max-w-3xl rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold">Complete Account Setup</h2>
            <p className="mt-2 text-sm text-ink/65">
              Business accounts must be in San Francisco. Supplier accounts can be anywhere in the United States.
            </p>

            <form className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submitOnboarding}>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink/65">Account Type</span>
                <select
                  value={form.account_type}
                  onChange={onChange('account_type')}
                  className="w-full rounded border border-black/15 bg-white px-3 py-2"
                >
                  <option value="business">Business</option>
                  <option value="supplier">Supplier</option>
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink/65">Business Name</span>
                <input value={form.name} onChange={onChange('name')} className="w-full rounded border border-black/15 px-3 py-2" />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink/65">Business Type</span>
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
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink/65">Street Address</span>
                <input
                  value={form.address}
                  onChange={onChange('address')}
                  placeholder={isBusiness ? 'SF street address' : 'US street address'}
                  className="w-full rounded border border-black/15 px-3 py-2"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink/65">City</span>
                <input value={form.city} onChange={onChange('city')} className="w-full rounded border border-black/15 px-3 py-2" />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink/65">State</span>
                <input value={form.state} onChange={onChange('state')} className="w-full rounded border border-black/15 px-3 py-2" />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-ink/65">ZIP</span>
                <input value={form.zip} onChange={onChange('zip')} className="w-full rounded border border-black/15 px-3 py-2" />
              </label>

              {error ? <p className="sm:col-span-2 text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="sm:col-span-2 rounded bg-moss px-5 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
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

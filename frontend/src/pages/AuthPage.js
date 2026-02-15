import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

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

export default function AuthPage({ auth }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = () => {
    try {
      window.location.href = getGoogleLoginUrl('/');
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
      const business = await createBusiness({
        ...form,
        email: auth.user.email,
      });
      auth.onProfileCreated?.(business);
    } catch (err) {
      setError(String(err?.message || 'Failed to create account profile'));
    } finally {
      setSubmitting(false);
    }
  };

  if (auth?.isAuthenticated && auth?.profile) {
    if (auth.profile.account_type === 'supplier') {
      return <Navigate to="/supplier" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const isBusiness = form.account_type === 'business';
  const isLoading = Boolean(auth?.isLoading);

  return (
    <div className="min-h-screen bg-[#ebe7db] text-[#1a1d1f]">
      <Navbar
        solid
        isAuthenticated={auth?.isAuthenticated}
        onLogout={auth?.onLogout}
        onGoogleLogin={!auth?.isAuthenticated && !isLoading ? handleGoogleLogin : undefined}
        showLinks={false}
        tone="tan"
      />

      <main className="mx-auto w-full max-w-3xl px-6 pb-14 pt-28 sm:px-8">
        {isLoading ? (
          <section className="rounded-3xl border border-[rgba(107,128,116,0.16)] bg-white p-8 shadow-lg sm:p-10">
            <p className="text-xs uppercase tracking-[0.12em] text-[#6b8074]">Loading</p>
            <h1 className="mt-3 text-3xl font-light leading-tight sm:text-4xl">Signing you in...</h1>
          </section>
        ) : !auth?.isAuthenticated ? (
          <section className="rounded-3xl border border-[rgba(107,128,116,0.16)] bg-white p-8 shadow-lg sm:p-10">
            <p className="text-xs uppercase tracking-[0.12em] text-[#6b8074]">Sign In Required</p>
            <h1 className="mt-3 text-3xl font-light leading-tight sm:text-4xl">Continue with Google to create your account</h1>
            <p className="mt-4 text-sm text-[#5b6c63] sm:text-base">
              Once sign-in completes, you will select Business or Supplier and confirm your account profile.
            </p>
            <button
              onClick={handleGoogleLogin}
              className="mt-8 inline-flex items-center gap-3 rounded-xl border border-[#DADCE0] bg-white px-6 py-3 text-[20px] font-medium text-[#3c4043] shadow-sm transition hover:bg-[#F8F9FA]"
            >
              <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.208 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.955 3.045l5.657-5.657C34.05 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.955 3.045l5.657-5.657C34.05 6.053 29.277 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.176 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.146 35.091 26.715 36 24 36c-5.188 0-9.617-3.317-11.283-7.946l-6.522 5.025C9.507 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
              Sign in with Google
            </button>
          </section>
        ) : (
          <section className="rounded-3xl border border-[rgba(107,128,116,0.16)] bg-white p-8 shadow-lg sm:p-10">
            <p className="text-xs uppercase tracking-[0.12em] text-[#6b8074]">Account Setup</p>
            <h1 className="mt-3 text-3xl font-light leading-tight sm:text-4xl">Complete your profile</h1>
            <p className="mt-4 text-sm text-[#5b6c63] sm:text-base">
              Business accounts must be in San Francisco. Supplier accounts can be anywhere in the United States.
            </p>

            <form className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submitOnboarding}>
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
                <input value={form.name} onChange={onChange('name')} className="w-full rounded border border-black/15 px-3 py-2" required />
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
                  <input value="supplier" disabled className="w-full rounded border border-black/15 bg-black/5 px-3 py-2 text-ink/65" />
                )}
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">Street Address</span>
                <input
                  value={form.address}
                  onChange={onChange('address')}
                  placeholder={isBusiness ? 'SF street address' : 'US street address'}
                  className="w-full rounded border border-black/15 px-3 py-2"
                  required
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">City</span>
                <input value={form.city} onChange={onChange('city')} className="w-full rounded border border-black/15 px-3 py-2" required />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">State</span>
                <input value={form.state} onChange={onChange('state')} className="w-full rounded border border-black/15 px-3 py-2" required />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b6c63]">ZIP</span>
                <input value={form.zip} onChange={onChange('zip')} className="w-full rounded border border-black/15 px-3 py-2" required />
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
        )}

        <div className="mt-6 text-center text-sm text-[#5b6c63]">
          <Link to="/" className="underline decoration-[#6b8074]/40 underline-offset-4 hover:text-[#1a1d1f]">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}

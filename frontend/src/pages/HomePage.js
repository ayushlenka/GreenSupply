import { useNavigate } from 'react-router-dom';

import { getGoogleLoginUrl } from '../auth';
import greensupplyLogo from '../assets/greensupply-logo.svg';
import Navbar from '../components/Navbar';

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
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    try {
      window.location.href = getGoogleLoginUrl('/');
    } catch (err) {
      alert('Set REACT_APP_SUPABASE_URL in frontend env to enable Google login.');
    }
  };
  const goToSetup = () => navigate('/auth');

  return (
    <div className="min-h-screen bg-[#ebe7db] text-[#1a1d1f]">
      <Navbar
        solid
        auth={auth}
        isAuthenticated={auth?.isAuthenticated}
        onLogout={auth?.onLogout}
        onGoogleLogin={!auth?.isAuthenticated && !auth?.isLoading ? handleGoogleLogin : undefined}
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

            {!auth?.isAuthenticated && !auth?.isLoading ? (
              <button
                onClick={handleGoogleLogin}
                className="mt-9 rounded-full bg-[#2d4a3e] px-8 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#ebe7db] transition hover:bg-[#1f6f5c]"
              >
                Get Started
              </button>
            ) : auth?.isAuthenticated && !auth?.profile && !auth?.isLoading ? (
              <button
                onClick={goToSetup}
                className="mt-9 rounded-full bg-[#2d4a3e] px-8 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-[#ebe7db] transition hover:bg-[#1f6f5c]"
              >
                Complete Setup
              </button>
            ) : null}

          </div>
        </section>

        <section id="about" className="reveal-up bg-[#ebe7db] px-6 py-20 sm:px-10 lg:px-12">
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

        <section id="services" className="reveal-up bg-[#ebe7db] px-6 py-20 sm:px-10 lg:px-12">
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

        <section id="contact" className="reveal-up bg-[#ebe7db] px-6 py-20 sm:px-10 lg:px-12">
          <div className="mx-auto max-w-[900px] text-center">
            <h2 className="text-4xl font-light leading-tight text-[#1a1d1f] sm:text-6xl">Ready to join your local buying network?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-[#5b6c63] sm:text-lg">
              Start with your business profile, join active groups, and turn routine packaging purchases into
              measurable cost and impact gains.
            </p>
            {!auth?.isAuthenticated && !auth?.isLoading ? (
              <button
                onClick={handleGoogleLogin}
                className="mt-10 rounded-full border border-white/80 bg-white px-10 py-4 text-sm font-semibold uppercase tracking-[0.08em] text-[#3a5f2d] transition hover:bg-[#f3f9ed]"
              >
                Get Started
              </button>
            ) : auth?.isAuthenticated && !auth?.profile && !auth?.isLoading ? (
              <button
                onClick={goToSetup}
                className="mt-10 rounded-full border border-white/80 bg-white px-10 py-4 text-sm font-semibold uppercase tracking-[0.08em] text-[#3a5f2d] transition hover:bg-[#f3f9ed]"
              >
                Complete Setup
              </button>
            ) : null}
          </div>
        </section>

        <footer className="bg-[#2d4a3e] px-6 py-8 sm:px-10 lg:px-12">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-2 text-sm text-[#ebe7db] sm:flex-row">
            <p className="inline-flex items-center gap-2">
              <img src={greensupplyLogo} alt="GreenSupply logo" className="h-5 w-5 object-contain" />
              <span>GreenSupply</span>
            </p>
            <p>Cooperative procurement for sustainable packaging</p>
          </div>
        </footer>

      </main>
    </div>
  );
}




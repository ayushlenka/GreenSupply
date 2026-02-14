import { Link } from 'react-router-dom';

import { getGoogleLoginUrl } from '../auth';
import Navbar from '../components/Navbar';

export default function HomePage({ auth }) {
  const handleGoogleLogin = () => {
    try {
      window.location.href = getGoogleLoginUrl();
    } catch (err) {
      alert('Set REACT_APP_SUPABASE_URL in frontend env to enable Google login.');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-emerald-100/30 text-ink">
      <Navbar solid auth={auth} isAuthenticated={auth?.isAuthenticated} onLogout={auth?.onLogout} showLinks={false} />

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

        <section className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-emerald-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.1em] text-sage">Small Business Savings</p>
            <p className="mt-2 text-3xl font-semibold text-moss">10-30%</p>
            <p className="mt-1 text-sm text-ink/65">
              Lower unit prices through shared purchasing power instead of solo ordering.
            </p>
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.1em] text-sage">Climate Impact</p>
            <p className="mt-2 text-3xl font-semibold text-moss">CO2 Down</p>
            <p className="mt-1 text-sm text-ink/65">
              Consolidated routes reduce delivery miles and associated greenhouse emissions.
            </p>
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <p className="text-xs uppercase tracking-[0.1em] text-sage">Better Choices</p>
            <p className="mt-2 text-3xl font-semibold text-moss">Cleaner Materials</p>
            <p className="mt-1 text-sm text-ink/65">
              Compare compostable options with certifications and tradeoff insights.
            </p>
          </article>
        </section>

        <section className="mt-12 rounded-2xl border border-emerald-100 bg-white/95 p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-semibold text-ink">How It Works</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-sage">Step 1</p>
              <p className="mt-1 text-lg font-semibold">Share Monthly Demand</p>
              <p className="mt-1 text-sm text-ink/65">
                Capture your packaging needs by product type and neighborhood.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-sage">Step 2</p>
              <p className="mt-1 text-lg font-semibold">Join a Buying Group</p>
              <p className="mt-1 text-sm text-ink/65">
                Commit units with nearby businesses to hit supplier minimums.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-sage">Step 3</p>
              <p className="mt-1 text-lg font-semibold">Track Real Impact</p>
              <p className="mt-1 text-sm text-ink/65">
                Monitor savings, CO2 reduced, plastic avoided, and delivery trips reduced.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50 p-6 sm:p-8">
          <h3 className="text-xl font-semibold">Built for local operators</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70 sm:text-base">
            From cafes and bakeries to food trucks and small restaurants, GreenSupply turns sustainability into an
            operational advantage: lower costs, easier procurement decisions, and a clearer path to climate goals.
          </p>
          {auth?.isAuthenticated ? (
            <div className="mt-5">
              <Link
                to="/groups"
                className="inline-flex rounded-full border border-moss bg-white px-5 py-2.5 text-sm font-semibold text-moss transition hover:bg-moss hover:text-white"
              >
                Go to Groups
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

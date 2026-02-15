import { useEffect, useState } from 'react';

import { fetchBusinessDashboardSummary, fetchDashboardRecommendation } from '../api';
import Navbar from '../components/Navbar';

function MetricCard({ label, value, unit }) {
  return (
    <article className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-moss">{value}</p>
      {unit ? <p className="mt-1 text-xs text-ink/60">{unit}</p> : null}
    </article>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-ink/60">{description}</p> : null}
    </div>
  );
}

export default function DashboardPage({ auth }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const businessId = auth?.profile?.id;

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchBusinessDashboardSummary(businessId)
      .then(setSummary)
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [businessId]);

  const generateAiSummary = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const result = await fetchDashboardRecommendation({
        business_name: auth?.profile?.name || null,
      });
      setAiSummary(result);
    } catch (err) {
      setAiError(String(err?.message || 'Failed to generate AI summary.'));
    } finally {
      setAiLoading(false);
    }
  };

  const fmt = (n) => (n != null ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Navbar solid isAuthenticated={auth?.isAuthenticated} onLogout={auth?.onLogout} tone="tan" />

      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-7">
        <h1 className="text-3xl font-semibold">Your Impact Dashboard</h1>
        <p className="mt-2 text-sm text-ink/65">
          Personal metrics for {auth?.profile?.name || 'your business'}
        </p>

        {loading ? (
          <div className="mt-12 text-sm text-ink/60">Loading dashboard...</div>
        ) : error ? (
          <div className="mt-12 text-sm text-red-600">{error}</div>
        ) : !summary ? (
          <div className="mt-12 text-sm text-ink/60">No data available yet. Join a buying group to see your metrics.</div>
        ) : (
          <>
            {/* ROI Block */}
            <section className="mt-8">
              <SectionHeader title="Return on Investment" description="How much you've saved through bulk purchasing" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricCard
                  label="Total Savings"
                  value={`$${fmt(summary.your_total_savings_usd)}`}
                  unit="saved through bulk pricing"
                />
                <MetricCard
                  label="Weighted Savings Rate"
                  value={`${fmt(summary.your_weighted_savings_pct)}%`}
                  unit="average discount vs retail"
                />
              </div>
            </section>

            {/* Participation Block */}
            <section className="mt-8">
              <SectionHeader title="Participation" description="Your buying group activity" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Groups Joined"
                  value={summary.your_groups_joined}
                />
                <MetricCard
                  label="Conversion Rate"
                  value={`${fmt(summary.your_group_conversion_rate)}%`}
                  unit="groups confirmed or completed"
                />
                <MetricCard
                  label="Median Time to Confirm"
                  value={summary.your_median_time_to_confirmation_hours != null
                    ? `${fmt(summary.your_median_time_to_confirmation_hours)}h`
                    : '—'}
                  unit="from your commitment to group confirmation"
                />
                <MetricCard
                  label="Units Committed"
                  value={summary.your_units_committed.toLocaleString()}
                  unit="total units across all groups"
                />
              </div>
            </section>

            {/* Environmental Impact Block */}
            <section className="mt-8">
              <SectionHeader title="Environmental Impact" description="Your contribution to sustainability" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricCard
                  label="CO₂ Avoided"
                  value={fmt(summary.your_co2_saved_kg)}
                  unit="kg of CO₂ reduced"
                />
                <MetricCard
                  label="Plastic Avoided"
                  value={fmt(summary.your_plastic_avoided_kg)}
                  unit="kg of plastic avoided"
                />
              </div>
            </section>

            {/* AI Insights */}
            <section className="mt-8 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">AI Sustainability Insights</h2>
                  <p className="text-sm text-ink/65">Generate operational recommendations from your impact data.</p>
                </div>
                <button
                  onClick={generateAiSummary}
                  disabled={aiLoading}
                  className="rounded bg-moss px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-sage disabled:opacity-60"
                >
                  {aiLoading ? 'Generating...' : 'Generate Insights'}
                </button>
              </div>

              {aiError ? <p className="mt-4 text-sm text-red-600">{aiError}</p> : null}

              {aiSummary ? (
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <article className="rounded border border-black/10 bg-emerald-50/40 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage">Executive Summary</p>
                    <p className="mt-2 text-sm text-ink/80">{aiSummary.executive_summary}</p>
                  </article>
                  <article className="rounded border border-black/10 bg-emerald-50/40 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage">Key Insight</p>
                    <p className="mt-2 text-sm text-ink/80">{aiSummary.key_insight}</p>
                  </article>
                  <article className="rounded border border-black/10 bg-emerald-50/40 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage">Action Plan</p>
                    <p className="mt-2 text-sm text-ink/80">{aiSummary.action_plan}</p>
                  </article>
                  <article className="rounded border border-black/10 bg-emerald-50/40 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage">City-Scale Projection</p>
                    <p className="mt-2 text-sm text-ink/80">{aiSummary.city_scale_projection}</p>
                  </article>
                  <p className="text-xs uppercase tracking-[0.08em] text-ink/55 md:col-span-2">
                    Powered by: {aiSummary.source}
                  </p>
                </div>
              ) : null}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

import { useEffect, useState } from 'react';

import { fetchGroups } from '../api';
import Navbar from '../components/Navbar';

export default function DashboardPage({ auth }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups()
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  const totalBusinesses = groups.reduce((s, g) => s + (g.business_count || 0), 0);
  const totalSavings = groups.reduce((s, g) => s + (g.estimated_savings_usd || 0), 0);
  const totalCO2 = groups.reduce((s, g) => s + (g.estimated_co2_saved_kg || 0), 0);
  const totalPlastic = groups.reduce((s, g) => s + (g.estimated_plastic_avoided_kg || 0), 0);
  const totalTrips = groups.reduce((s, g) => s + (g.delivery_trips_reduced || 0), 0);
  const totalMiles = groups.reduce((s, g) => s + (g.delivery_miles_saved || 0), 0);

  const cards = [
    { label: 'Active Groups', value: groups.length, unit: null },
    { label: 'Businesses Participating', value: totalBusinesses, unit: null },
    { label: 'Total Savings', value: `$${totalSavings.toFixed(2)}`, unit: 'USD saved through bulk pricing' },
    { label: 'CO2 Reduced', value: totalCO2.toFixed(2), unit: 'kg of CO2 avoided' },
    { label: 'Plastic Avoided', value: totalPlastic.toFixed(2), unit: 'kg of plastic avoided' },
    { label: 'Delivery Trips Saved', value: totalTrips, unit: `${totalMiles.toFixed(1)} miles reduced` }
  ];

  return (
    <div className="min-h-screen bg-cream text-ink">
      <Navbar solid isAuthenticated={auth?.isAuthenticated} onLogout={auth?.onLogout} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-7">
        <h1 className="text-3xl font-semibold">Impact Dashboard</h1>
        <p className="mt-2 text-sm text-ink/65">Aggregate environmental and financial impact across active groups</p>

        {loading ? (
          <div className="mt-12 text-sm text-ink/60">Loading dashboard...</div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <article key={card.label} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold text-moss">{card.value}</p>
                {card.unit ? <p className="mt-1 text-xs text-ink/60">{card.unit}</p> : null}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

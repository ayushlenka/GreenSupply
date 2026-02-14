import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { fetchGroups } from '../api';

export default function DashboardPage() {
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

  return (
    <>
      <Navbar solid />
      <div className="dashboard-page">
        <h1>Impact Dashboard</h1>
        <p className="subtitle">Aggregate environmental and financial impact across all active groups</p>

        {loading ? (
          <div className="loading-container" style={{ height: 200 }}>
            <div className="loading-spinner" />
            Loading dashboard...
          </div>
        ) : (
          <div className="dashboard-grid">
            <div className="dash-card">
              <div className="dash-label">Active Groups</div>
              <div className="dash-value">{groups.length}</div>
            </div>
            <div className="dash-card">
              <div className="dash-label">Businesses Participating</div>
              <div className="dash-value">{totalBusinesses}</div>
            </div>
            <div className="dash-card">
              <div className="dash-label">Total Savings</div>
              <div className="dash-value">${totalSavings.toFixed(2)}</div>
              <div className="dash-unit">USD saved through bulk pricing</div>
            </div>
            <div className="dash-card">
              <div className="dash-label">CO₂ Reduced</div>
              <div className="dash-value">{totalCO2.toFixed(2)}</div>
              <div className="dash-unit">kg of CO₂ avoided</div>
            </div>
            <div className="dash-card">
              <div className="dash-label">Plastic Avoided</div>
              <div className="dash-value">{totalPlastic.toFixed(2)}</div>
              <div className="dash-unit">kg of plastic saved</div>
            </div>
            <div className="dash-card">
              <div className="dash-label">Delivery Trips Saved</div>
              <div className="dash-value">{totalTrips}</div>
              <div className="dash-unit">{totalMiles.toFixed(1)} miles reduced</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

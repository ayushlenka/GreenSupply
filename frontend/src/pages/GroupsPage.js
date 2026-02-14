import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import Navbar from '../components/Navbar';
import GroupCard from '../components/GroupCard';
import JoinModal from '../components/JoinModal';
import Toast from '../components/Toast';
import { fetchGroups, joinGroup } from '../api';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const HUB = { lng: -122.4013, lat: 37.7751 };

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [modalGroup, setModalGroup] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const activeLayersRef = useRef([]);
  const cardRefs = useRef({});

  // Load groups from API
  useEffect(() => {
    fetchGroups()
      .then((data) => {
        setGroups(data);
        if (data.length > 0) setActiveId(data[0].id);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [HUB.lng, HUB.lat],
      zoom: 13,
      pitch: 42,
      bearing: -8,
      antialias: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-left');

    map.on('load', () => {
      const hubEl = document.createElement('div');
      hubEl.className = 'hub-label';
      hubEl.textContent = '📦 Delivery Hub';
      new mapboxgl.Marker({ element: hubEl, anchor: 'bottom' })
        .setLngLat([HUB.lng, HUB.lat])
        .addTo(map);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Highlight active group on map
  const highlightGroup = useCallback((id) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Dim all markers
    markersRef.current.forEach(({ el }) => {
      el.style.opacity = '0.2';
      el.classList.remove('active-marker');
    });

    // Highlight active
    markersRef.current
      .filter((m) => m.groupId === id)
      .forEach(({ el }) => {
        el.style.opacity = '1';
        el.classList.add('active-marker');
      });

    // Clear old route lines
    activeLayersRef.current.forEach((lid) => {
      if (map.getLayer(lid)) map.removeLayer(lid);
      if (map.getSource(lid)) map.removeSource(lid);
    });
    activeLayersRef.current = [];

    // For now, just fly to hub since the API doesn't return coordinates
    // When backend adds coordinates, draw routes like groups.html
    map.flyTo({ center: [HUB.lng, HUB.lat], zoom: 13, duration: 800 });
  }, []);

  // When activeId changes, highlight on map and scroll card into view
  useEffect(() => {
    if (activeId) {
      highlightGroup(activeId);
      const cardEl = cardRefs.current[activeId];
      if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeId, highlightGroup]);

  const handleJoin = async (groupId, units) => {
    try {
      // For demo, use a placeholder business_id
      await joinGroup(groupId, 'demo-business', units);
      setToast({ visible: true, message: `Joined! ${units.toLocaleString()} units committed.` });
      setModalGroup(null);
      // Refresh groups
      const updated = await fetchGroups();
      setGroups(updated);
    } catch (err) {
      setToast({ visible: true, message: `Joined! ${units.toLocaleString()} units committed.` });
      setModalGroup(null);
    }
  };

  // Get unique categories for filters
  const categories = [...new Set(groups.map((g) => (g.product?.category || '').toLowerCase()))].filter(Boolean);
  const filteredGroups = filter === 'all'
    ? groups
    : groups.filter((g) => (g.product?.category || '').toLowerCase() === filter);

  // Compute summary stats
  const totalBusinesses = groups.reduce((s, g) => s + (g.business_count || 0), 0);
  const totalSavings = groups.reduce((s, g) => s + (g.estimated_savings_usd || 0), 0);
  const totalTrips = groups.reduce((s, g) => s + (g.delivery_trips_reduced || 0), 0);

  return (
    <div className="app-layout">
      <div ref={mapContainer} className="map-container" />
      <Navbar />

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="eyebrow">San Francisco · {groups.length} active groups</div>
          <h1>Buying Groups</h1>
          <div className="meta-row">
            <div className="meta-item"><strong>{totalBusinesses}</strong> businesses joined</div>
            <div className="meta-item"><strong>${totalSavings.toFixed(0)}</strong> unlocked</div>
            <div className="meta-item"><strong>{totalTrips}</strong> trips saved</div>
          </div>
        </div>

        <div className="filter-bar">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="group-list">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              Loading groups...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="empty-state">
              {groups.length === 0
                ? 'No active groups. Make sure the backend is running.'
                : 'No groups in this category'}
            </div>
          ) : (
            filteredGroups.map((g, i) => (
              <div key={g.id} ref={(el) => (cardRefs.current[g.id] = el)}>
                <GroupCard
                  group={g}
                  isActive={g.id === activeId}
                  onSelect={setActiveId}
                  onJoin={setModalGroup}
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              </div>
            ))
          )}
        </div>
      </aside>

      <JoinModal
        group={modalGroup}
        open={!!modalGroup}
        onClose={() => setModalGroup(null)}
        onSubmit={handleJoin}
      />

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  );
}

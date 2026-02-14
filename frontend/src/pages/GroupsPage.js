import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

import { fetchGroups, joinGroup } from '../api';
import GroupCard from '../components/GroupCard';
import JoinModal from '../components/JoinModal';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const HUB = { lng: -122.4013, lat: 37.7751 };

export default function GroupsPage({ auth }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [modalGroup, setModalGroup] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const cardRefs = useRef({});

  useEffect(() => {
    fetchGroups()
      .then((data) => {
        setGroups(data);
        if (data.length > 0) setActiveId(data[0].id);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;
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
      antialias: true
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-left');

    map.on('load', () => {
      const hubEl = document.createElement('div');
      hubEl.className = 'hub-label';
      hubEl.textContent = 'Delivery Hub';
      new mapboxgl.Marker({ element: hubEl, anchor: 'bottom' }).setLngLat([HUB.lng, HUB.lat]).addTo(map);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const highlightGroup = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.flyTo({ center: [HUB.lng, HUB.lat], zoom: 13, duration: 600 });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    highlightGroup(activeId);
    const cardEl = cardRefs.current[activeId];
    if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeId, highlightGroup]);

  const handleJoin = async (groupId, units) => {
    try {
      await joinGroup(groupId, 'demo-business', units);
      setToast({ visible: true, message: `Joined! ${units.toLocaleString()} units committed.` });
      setModalGroup(null);
      const updated = await fetchGroups();
      setGroups(updated);
    } catch {
      setToast({ visible: true, message: 'Unable to join right now. Try again.' });
      setModalGroup(null);
    }
  };

  const categories = [...new Set(groups.map((g) => (g.product?.category || '').toLowerCase()))].filter(Boolean);
  const filteredGroups =
    filter === 'all' ? groups : groups.filter((g) => (g.product?.category || '').toLowerCase() === filter);

  const totalBusinesses = groups.reduce((s, g) => s + (g.business_count || 0), 0);
  const totalSavings = groups.reduce((s, g) => s + (g.estimated_savings_usd || 0), 0);
  const totalTrips = groups.reduce((s, g) => s + (g.delivery_trips_reduced || 0), 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      <div ref={mapContainer} className="absolute inset-0" />
      <Navbar solid={false} isAuthenticated={auth?.isAuthenticated} onLogout={auth?.onLogout} />

      <aside className="relative z-30 ml-auto flex h-screen w-full max-w-xl flex-col bg-cream shadow-2xl">
        <div className="border-b border-black/10 px-5 pb-5 pt-20 sm:px-7">
          <p className="text-xs uppercase tracking-[0.12em] text-sage">San Francisco · {groups.length} active groups</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Buying Groups</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink/70">
            <span>
              <strong className="text-moss">{totalBusinesses}</strong> businesses joined
            </span>
            <span>
              <strong className="text-moss">${totalSavings.toFixed(0)}</strong> unlocked
            </span>
            <span>
              <strong className="text-moss">{totalTrips}</strong> trips saved
            </span>
          </div>
        </div>

        <div className="border-b border-black/10 px-5 py-3 sm:px-7">
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-full border px-3 py-1 text-xs ${filter === 'all' ? 'border-moss bg-moss text-parchment' : 'border-black/20 text-ink/70'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`rounded-full border px-3 py-1 text-xs capitalize ${
                  filter === cat ? 'border-moss bg-moss text-parchment' : 'border-black/20 text-ink/70'
                }`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-ink/60">Loading groups...</div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink/60">
              {groups.length === 0 ? 'No active groups. Make sure backend is running.' : 'No groups in this category.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((g, i) => (
                <div key={g.id} ref={(el) => (cardRefs.current[g.id] = el)}>
                  <GroupCard
                    group={g}
                    isActive={g.id === activeId}
                    onSelect={setActiveId}
                    onJoin={setModalGroup}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <JoinModal group={modalGroup} open={!!modalGroup} onClose={() => setModalGroup(null)} onSubmit={handleJoin} />
      <Toast message={toast.message} visible={toast.visible} onHide={() => setToast((t) => ({ ...t, visible: false }))} />
    </div>
  );
}

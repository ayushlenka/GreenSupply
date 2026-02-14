import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

import { fetchGroups, fetchRegions, joinGroup } from '../api';
import GroupCard from '../components/GroupCard';
import JoinModal from '../components/JoinModal';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const DEFAULT_CENTER = { lng: -122.4013, lat: 37.7751 };
const HALF_SIDE_MILES = 1;
const MILES_PER_LAT_DEGREE = 69;

function twoMileBounds(centerLng, centerLat) {
  const latDelta = HALF_SIDE_MILES / MILES_PER_LAT_DEGREE;
  const lngDelta = HALF_SIDE_MILES / (MILES_PER_LAT_DEGREE * Math.cos((centerLat * Math.PI) / 180));
  return [
    [centerLng - lngDelta, centerLat - latDelta],
    [centerLng + lngDelta, centerLat + latDelta]
  ];
}

export default function GroupsPage({ auth }) {
  const [groups, setGroups] = useState([]);
  const [regionsById, setRegionsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [modalGroup, setModalGroup] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [mapReady, setMapReady] = useState(false);

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const cardRefs = useRef({});

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([fetchGroups(), fetchRegions()])
      .then(([groupResult, regionResult]) => {
        if (cancelled) return;

        const groupData = groupResult.status === 'fulfilled' ? groupResult.value : [];
        const regionData = regionResult.status === 'fulfilled' ? regionResult.value : [];

        setGroups(groupData);
        setRegionsById(Object.fromEntries(regionData.map((region) => [region.id, region])));
        if (groupData.length > 0) {
          setActiveId((currentActiveId) =>
            currentActiveId && groupData.some((group) => group.id === currentActiveId) ? currentActiveId : groupData[0].id
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeGroup = groups.find((group) => group.id === activeId) || null;

  const applyBoundsForGroup = useCallback(
    (group) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;

      const region = group?.region_id ? regionsById[group.region_id] : null;
      const centerLat = region?.bounds
        ? (region.bounds.min_lat + region.bounds.max_lat) / 2
        : DEFAULT_CENTER.lat;
      const centerLng = region?.bounds
        ? (region.bounds.min_lng + region.bounds.max_lng) / 2
        : DEFAULT_CENTER.lng;
      const bounds = twoMileBounds(centerLng, centerLat);

      map.setMaxBounds(bounds);
      map.fitBounds(bounds, { padding: 0, duration: 0 });
      map.setMinZoom(map.getZoom());
      if (markerRef.current) {
        markerRef.current.setLngLat([centerLng, centerLat]);
      }
    },
    [regionsById]
  );

  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const defaultBounds = twoMileBounds(DEFAULT_CENTER.lng, DEFAULT_CENTER.lat);
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: 13,
      pitch: 42,
      bearing: -8,
      antialias: true,
      maxBounds: defaultBounds,
      maxZoom: 18,
      renderWorldCopies: false
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-left');

    map.on('load', () => {
      map.fitBounds(defaultBounds, { padding: 0, duration: 0 });
      map.setMinZoom(map.getZoom());

      const hubEl = document.createElement('div');
      hubEl.className = 'hub-label';
      hubEl.textContent = 'Group Area';
      markerRef.current = new mapboxgl.Marker({ element: hubEl, anchor: 'bottom' })
        .setLngLat([DEFAULT_CENTER.lng, DEFAULT_CENTER.lat])
        .addTo(map);
      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    applyBoundsForGroup(activeGroup);
  }, [mapReady, activeGroup, applyBoundsForGroup]);

  useEffect(() => {
    if (!activeId) return;
    const cardEl = cardRefs.current[activeId];
    if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeId]);

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
          <p className="text-xs uppercase tracking-[0.12em] text-sage">San Francisco - {groups.length} active groups</p>
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

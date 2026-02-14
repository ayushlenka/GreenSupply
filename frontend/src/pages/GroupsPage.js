import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

import { fetchBusinessById, fetchGroupDetail, fetchGroups, fetchRegions, joinGroup } from '../api';
import GroupCard from '../components/GroupCard';
import JoinModal from '../components/JoinModal';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const DEFAULT_CENTER = { lng: -122.4013, lat: 37.7751 };
const HALF_SIDE_MILES = 1;
const MILES_PER_LAT_DEGREE = 69;
const ROUTE_SOURCE_ID = 'delivery-route-source';
const ROUTE_LAYER_ID = 'delivery-route-layer';
const ROUTE_GLOW_LAYER_ID = 'delivery-route-glow';

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
  const [activeGroupDetail, setActiveGroupDetail] = useState(null);
  const [supplierBusiness, setSupplierBusiness] = useState(null);
  const [routeClock, setRouteClock] = useState(Date.now());

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const cardRefs = useRef({});
  const participantMarkersRef = useRef([]);
  const supplierMarkerRef = useRef(null);
  const truckMarkerRef = useRef(null);

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
  const commitments = activeGroupDetail?.commitments || [];
  const confirmedOrder = activeGroupDetail?.confirmed_order || null;

  const routeProgress = useMemo(() => {
    if (!confirmedOrder?.scheduled_start_at || !confirmedOrder?.estimated_end_at) return 0;
    const startMs = new Date(confirmedOrder.scheduled_start_at).getTime();
    const endMs = new Date(confirmedOrder.estimated_end_at).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
    if (routeClock <= startMs) return 0;
    if (routeClock >= endMs) return 1;
    return (routeClock - startMs) / (endMs - startMs);
  }, [confirmedOrder, routeClock]);

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
    if (!activeId) {
      setActiveGroupDetail(null);
      setSupplierBusiness(null);
      return;
    }

    let cancelled = false;
    fetchGroupDetail(activeId)
      .then(async (detail) => {
        if (cancelled) return;
        setActiveGroupDetail(detail);
        if (detail?.supplier_business_id) {
          try {
            const supplier = await fetchBusinessById(detail.supplier_business_id);
            if (!cancelled) setSupplierBusiness(supplier);
          } catch {
            if (!cancelled) setSupplierBusiness(null);
          }
        } else {
          setSupplierBusiness(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setActiveGroupDetail(null);
          setSupplierBusiness(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    const interval = window.setInterval(() => setRouteClock(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const cardEl = cardRefs.current[activeId];
    if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeId]);

  const handleJoin = async (groupId, units) => {
    const businessId = auth?.profile?.id;
    if (!businessId) {
      return { ok: false, message: 'Business profile not found. Sign in again and retry.' };
    }

    try {
      await joinGroup(groupId, businessId, units);
      setToast({ visible: true, message: `Joined! ${units.toLocaleString()} units committed.` });
      setModalGroup(null);
      const updated = await fetchGroups();
      setGroups(updated);
      if (groupId === activeId) {
        try {
          const detail = await fetchGroupDetail(groupId);
          setActiveGroupDetail(detail);
        } catch {
          setActiveGroupDetail(null);
        }
      }
      return { ok: true };
    } catch (err) {
      const message = String(err?.message || 'Unable to join right now. Try again.');
      setToast({ visible: true, message });
      return { ok: false, message };
    }
  };

  const categories = [...new Set(groups.map((g) => (g.product?.category || '').toLowerCase()))].filter(Boolean);
  const filteredGroups =
    filter === 'all' ? groups : groups.filter((g) => (g.product?.category || '').toLowerCase() === filter);

  const totalBusinesses = groups.reduce((s, g) => s + (g.business_count || 0), 0);
  const totalSavings = groups.reduce((s, g) => s + (g.estimated_savings_usd || 0), 0);
  const totalTrips = groups.reduce((s, g) => s + (g.delivery_trips_reduced || 0), 0);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    participantMarkersRef.current.forEach((marker) => marker.remove());
    participantMarkersRef.current = [];
    if (supplierMarkerRef.current) {
      supplierMarkerRef.current.remove();
      supplierMarkerRef.current = null;
    }
    if (truckMarkerRef.current) {
      truckMarkerRef.current.remove();
      truckMarkerRef.current = null;
    }

    const participants = commitments.filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
    participants.forEach((commitment) => {
      const el = document.createElement('button');
      el.className = 'participant-dot';
      el.title = commitment.business_name || 'Participating business';

      const popupNode = document.createElement('div');
      popupNode.className = 'map-popup-card';
      const title = document.createElement('p');
      title.className = 'map-popup-title';
      title.textContent = commitment.business_name || 'Participating Business';
      popupNode.appendChild(title);
      if (commitment.business_address) {
        const addr = document.createElement('p');
        addr.className = 'map-popup-sub';
        addr.textContent = commitment.business_address;
        popupNode.appendChild(addr);
      }
      const units = document.createElement('p');
      units.className = 'map-popup-sub';
      units.textContent = `Committed: ${Number(commitment.units || 0).toLocaleString()} units`;
      popupNode.appendChild(units);

      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: true, offset: 14 }).setDOMContent(popupNode);
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([Number(commitment.longitude), Number(commitment.latitude)])
        .setPopup(popup)
        .addTo(map);
      participantMarkersRef.current.push(marker);
    });

    if (supplierBusiness && Number.isFinite(supplierBusiness.latitude) && Number.isFinite(supplierBusiness.longitude)) {
      const supplierEl = document.createElement('div');
      supplierEl.className = 'supplier-dot';
      supplierEl.title = supplierBusiness.name || 'Supplier';

      const supplierPopupNode = document.createElement('div');
      supplierPopupNode.className = 'map-popup-card';
      const supplierTitle = document.createElement('p');
      supplierTitle.className = 'map-popup-title';
      supplierTitle.textContent = supplierBusiness.name || 'Supplier';
      supplierPopupNode.appendChild(supplierTitle);
      if (supplierBusiness.address) {
        const supplierAddr = document.createElement('p');
        supplierAddr.className = 'map-popup-sub';
        supplierAddr.textContent = supplierBusiness.address;
        supplierPopupNode.appendChild(supplierAddr);
      }
      const supplierPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: true, offset: 14 }).setDOMContent(
        supplierPopupNode
      );

      supplierMarkerRef.current = new mapboxgl.Marker({ element: supplierEl, anchor: 'center' })
        .setLngLat([Number(supplierBusiness.longitude), Number(supplierBusiness.latitude)])
        .setPopup(supplierPopup)
        .addTo(map);
    }

    const allPoints = [
      ...(supplierBusiness && Number.isFinite(supplierBusiness.latitude) && Number.isFinite(supplierBusiness.longitude)
        ? [[Number(supplierBusiness.longitude), Number(supplierBusiness.latitude)]]
        : []),
      ...participants.map((c) => [Number(c.longitude), Number(c.latitude)]),
    ];
    if (allPoints.length > 0) {
      const bounds = allPoints.reduce(
        (b, point) => b.extend(point),
        new mapboxgl.LngLatBounds(allPoints[0], allPoints[0])
      );
      map.fitBounds(bounds, { padding: 70, duration: 600, maxZoom: 14.5 });
    }

    const rawRoute = confirmedOrder?.route_points || [];
    const routePoints = rawRoute.filter(
      (pt) => Array.isArray(pt) && pt.length === 2 && Number.isFinite(pt[0]) && Number.isFinite(pt[1])
    );

    const clearRoute = () => {
      if (map.getLayer(ROUTE_GLOW_LAYER_ID)) map.removeLayer(ROUTE_GLOW_LAYER_ID);
      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
    };

    if (routePoints.length < 2 || activeGroupDetail?.status !== 'confirmed') {
      clearRoute();
      return;
    }

    const consumedIndex = Math.floor(routeProgress * (routePoints.length - 1));
    const remainingRoute =
      consumedIndex >= routePoints.length - 1
        ? routePoints.slice(routePoints.length - 2)
        : routePoints.slice(Math.max(0, consumedIndex));
    const activeTruckPoint = routePoints[Math.min(consumedIndex, routePoints.length - 1)];

    const sourcePayload = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: remainingRoute,
      },
      properties: {},
    };

    if (map.getSource(ROUTE_SOURCE_ID)) {
      map.getSource(ROUTE_SOURCE_ID).setData(sourcePayload);
    } else {
      map.addSource(ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: sourcePayload,
      });
      map.addLayer({
        id: ROUTE_GLOW_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        paint: {
          'line-color': '#7ef2c5',
          'line-width': 9,
          'line-opacity': 0.28,
        },
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: 'line',
        source: ROUTE_SOURCE_ID,
        paint: {
          'line-color': '#2ad58b',
          'line-width': 4.5,
          'line-opacity': 0.95,
        },
      });
    }

    const truckEl = document.createElement('div');
    truckEl.className = 'truck-dot';
    truckEl.title = 'Delivery in progress';

    truckMarkerRef.current = new mapboxgl.Marker({ element: truckEl, anchor: 'center' })
      .setLngLat(activeTruckPoint)
      .addTo(map);
  }, [mapReady, commitments, supplierBusiness, confirmedOrder, routeProgress, activeGroupDetail?.status]);

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
          {activeGroupDetail?.status === 'confirmed' && confirmedOrder ? (
            <p className="mt-3 text-xs text-ink/65">
              Delivery scheduled: {confirmedOrder.scheduled_start_at ? new Date(confirmedOrder.scheduled_start_at).toLocaleString() : 'TBD'}
              {confirmedOrder.route_total_minutes ? ` | ETA ${Math.round(confirmedOrder.route_total_minutes)} min` : ''}
            </p>
          ) : null}
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

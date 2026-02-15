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

function twoMileBounds(centerLng, centerLat) {
  const latDelta = HALF_SIDE_MILES / MILES_PER_LAT_DEGREE;
  const lngDelta = HALF_SIDE_MILES / (MILES_PER_LAT_DEGREE * Math.cos((centerLat * Math.PI) / 180));
  return [
    [centerLng - lngDelta, centerLat - latDelta],
    [centerLng + lngDelta, centerLat + latDelta]
  ];
}

export default function GroupsPage({ auth }) {
  const regionId = auth?.profile?.region_id;
  const [groups, setGroups] = useState([]);
  const [regionsById, setRegionsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('in_progress');
  const [modalGroup, setModalGroup] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [mapReady, setMapReady] = useState(false);
  const [activeGroupDetail, setActiveGroupDetail] = useState(null);
  const [supplierBusiness, setSupplierBusiness] = useState(null);

  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const cardRefs = useRef({});
  const participantMarkersRef = useRef([]);
  const supplierMarkerRef = useRef(null);

  useEffect(() => {
    if (!Number.isFinite(regionId)) {
      setGroups([]);
      setRegionsById({});
      setActiveId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let cancelled = false;

    Promise.allSettled([fetchGroups(regionId), fetchRegions()])
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
        } else {
          setActiveId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [regionId]);

  const activeGroup = groups.find((group) => group.id === activeId) || null;
  const commitments = useMemo(() => activeGroupDetail?.commitments || [], [activeGroupDetail]);

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
    const map = mapRef.current;
    if (!map || !mapContainer.current) return;

    const resize = () => map.resize();
    resize();
    window.addEventListener('resize', resize);

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(resize);
      observer.observe(mapContainer.current);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (observer) observer.disconnect();
    };
  }, [mapReady]);

  useEffect(() => {
    if (!activeId) {
      setActiveGroupDetail(null);
      setSupplierBusiness(null);
      return;
    }

    let cancelled = false;
    const group = groups.find((g) => g.id === activeId);
    const supplierId = group?.supplier_business_id;

    const detailPromise = fetchGroupDetail(activeId);
    const supplierPromise = supplierId ? fetchBusinessById(supplierId).catch(() => null) : Promise.resolve(null);

    Promise.all([detailPromise, supplierPromise])
      .then(([detail, supplier]) => {
        if (cancelled) return;
        setActiveGroupDetail(detail);
        setSupplierBusiness(supplier);
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
  }, [activeId, groups]);

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
      const updated = await fetchGroups(regionId);
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

  const filteredGroups = useMemo(() => {
    const currentBusinessId = auth?.profile?.id;
    if (statusFilter === 'confirmed') {
      return groups.filter((g) => g.status === 'confirmed');
    }
    return groups.filter(
      (g) =>
        g.status === 'active' ||
        ((g.status === 'capacity_reached' || g.status === 'pending') && g.created_by_business_id === currentBusinessId)
    );
  }, [groups, statusFilter, auth?.profile?.id]);

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
    const participants = commitments
      .map((c) => ({
        ...c,
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
      }))
      .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
    participants.forEach((commitment) => {
      const el = document.createElement('button');
      el.className = 'participant-dot';

      const hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'hover-popup' })
        .setText(commitment.business_name || 'Participating business');

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

      const clickPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: true, offset: 14 }).setDOMContent(popupNode);

      const lngLat = [Number(commitment.longitude), Number(commitment.latitude)];
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(lngLat)
        .setPopup(clickPopup)
        .addTo(map);

      el.addEventListener('mouseenter', () => { if (!clickPopup.isOpen()) hoverPopup.setLngLat(lngLat).addTo(map); });
      el.addEventListener('mouseleave', () => { hoverPopup.remove(); });
      el.addEventListener('click', () => { hoverPopup.remove(); });

      participantMarkersRef.current.push(marker);
    });

    const supplierLat = Number(supplierBusiness?.latitude);
    const supplierLng = Number(supplierBusiness?.longitude);
    if (supplierBusiness && Number.isFinite(supplierLat) && Number.isFinite(supplierLng)) {
      const supplierEl = document.createElement('div');
      supplierEl.className = 'supplier-dot';

      const supplierHoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'hover-popup' })
        .setText(supplierBusiness.name || 'Supplier');

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
      const supplierClickPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: true, offset: 14 }).setDOMContent(
        supplierPopupNode
      );

      const supplierLngLat = [supplierLng, supplierLat];
      supplierMarkerRef.current = new mapboxgl.Marker({ element: supplierEl, anchor: 'center' })
        .setLngLat(supplierLngLat)
        .setPopup(supplierClickPopup)
        .addTo(map);

      supplierEl.addEventListener('mouseenter', () => { if (!supplierClickPopup.isOpen()) supplierHoverPopup.setLngLat(supplierLngLat).addTo(map); });
      supplierEl.addEventListener('mouseleave', () => { supplierHoverPopup.remove(); });
      supplierEl.addEventListener('click', () => { supplierHoverPopup.remove(); });
    }

    const allPoints = [
      ...(supplierBusiness && Number.isFinite(supplierLat) && Number.isFinite(supplierLng)
        ? [[supplierLng, supplierLat]]
        : []),
      ...participants.map((c) => [Number(c.longitude), Number(c.latitude)]),
    ];
    if (allPoints.length > 0) {
      const bounds = allPoints.reduce(
        (b, point) => b.extend(point),
        new mapboxgl.LngLatBounds(allPoints[0], allPoints[0])
      );
      const desktopPanelPadding = window.innerWidth >= 1024 ? 460 : 70;
      map.fitBounds(bounds, {
        padding: { top: 70, bottom: 70, left: 70, right: desktopPanelPadding },
        duration: 600,
        maxZoom: 14.5,
      });
    } else {
      applyBoundsForGroup(activeGroup);
    }
  }, [mapReady, commitments, supplierBusiness, applyBoundsForGroup, activeGroup]);

  return (
    <div className="h-[100dvh] min-h-0 overflow-hidden bg-cream pt-16">
      <Navbar
        solid
        isAuthenticated={auth?.isAuthenticated}
        onLogout={auth?.onLogout}
        accountType={auth?.profile?.account_type}
        tone="tan"
      />

      <div className="relative h-full bg-cream xl:overflow-hidden">
        <div className="h-[42%] md:h-[50%] xl:absolute xl:inset-0 xl:h-full">
          <div ref={mapContainer} className="h-full w-full" />
        </div>

        <aside className="relative z-30 flex h-[58%] w-full flex-col rounded-t-2xl bg-cream shadow-2xl md:mx-auto md:h-[50%] md:max-w-3xl xl:ml-auto xl:mr-0 xl:h-full xl:max-w-xl xl:rounded-none">
          <div className="border-b border-black/10 px-5 pb-5 pt-5 sm:px-7">
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
              className={`rounded-full border px-3 py-1 text-xs ${
                statusFilter === 'in_progress' ? 'border-moss bg-moss text-parchment' : 'border-black/20 text-ink/70'
              }`}
              onClick={() => setStatusFilter('in_progress')}
            >
              In Progress
            </button>
            <button
              className={`rounded-full border px-3 py-1 text-xs ${
                statusFilter === 'confirmed' ? 'border-ink bg-ink text-parchment' : 'border-black/20 text-ink/70'
              }`}
              onClick={() => setStatusFilter('confirmed')}
            >
              Confirmed
            </button>
          </div>
        </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-ink/60">Loading groups...</div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink/60">
              {groups.length === 0 ? 'No active groups. Make sure backend is running.' : 'No groups in this status.'}
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
                    currentBusinessId={auth?.profile?.id}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  />
                </div>
              ))}
            </div>
          )}
          </div>
        </aside>
      </div>

      <JoinModal group={modalGroup} open={!!modalGroup} onClose={() => setModalGroup(null)} onSubmit={handleJoin} />
      <Toast message={toast.message} visible={toast.visible} onHide={() => setToast((t) => ({ ...t, visible: false }))} />
    </div>
  );
}

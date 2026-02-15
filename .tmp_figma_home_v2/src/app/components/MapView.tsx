import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Business, BuyingGroup, calculateGroupBounds } from '../data/mockData';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCustomIcon = (color: string, isGroupCenter = false) => {
  const svgIcon = isGroupCenter
    ? `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="3"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>`
    : `<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16C0 24 16 42 16 42C16 42 32 24 32 16C32 7.163 24.837 0 16 0Z" fill="${color}"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>`;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: isGroupCenter ? [32, 32] : [32, 42],
    iconAnchor: isGroupCenter ? [16, 16] : [16, 42],
    popupAnchor: [0, isGroupCenter ? -16 : -42],
  });
};

const businessIcon = createCustomIcon('#2d4a3e');
const groupCenterIcon = createCustomIcon('#1f6f5c', true);

interface MapControllerProps {
  selectedGroup: BuyingGroup | null;
}

// Component to handle map view updates
function MapController({ selectedGroup }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (selectedGroup) {
      const bounds = calculateGroupBounds(selectedGroup.regionCenter);
      const leafletBounds = L.latLngBounds(
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
      );

      map.fitBounds(leafletBounds, {
        padding: [50, 50],
        maxZoom: 13,
        animate: true,
        duration: 0.6,
      });

      const paddedBounds = leafletBounds.pad(0.3);
      map.setMaxBounds(paddedBounds);
      
      const currentZoom = map.getZoom();
      map.setMinZoom(Math.max(11, currentZoom - 2));
    } else {
      map.setView([37.7749, -122.4194], 12);
      map.setMaxBounds(null as any);
      map.setMinZoom(0);
    }
  }, [selectedGroup, map]);

  return null;
}

interface MapViewProps {
  businesses: Business[];
  selectedGroup: BuyingGroup | null;
  className?: string;
}

export const MapView: React.FC<MapViewProps> = ({ 
  businesses, 
  selectedGroup,
  className 
}) => {
  const center: [number, number] = [37.7749, -122.4194];

  return (
    <div className={className} style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapController selectedGroup={selectedGroup} />
        {selectedGroup ? (
          <React.Fragment>
            <Circle
              center={[selectedGroup.regionCenter.lat, selectedGroup.regionCenter.lng]}
              radius={1609.34 * 2}
              pathOptions={{
                color: '#1f6f5c',
                fillColor: '#1f6f5c',
                fillOpacity: 0.08,
                weight: 2,
                opacity: 0.3,
                dashArray: '5, 5',
              }}
            />
            <Marker
              position={[selectedGroup.regionCenter.lat, selectedGroup.regionCenter.lng]}
              icon={groupCenterIcon}
            >
              <Popup>
                <div className="p-2">
                  <div className="font-semibold text-sm text-[#1a1d1f] mb-1">Group Area Center</div>
                  <div className="text-xs text-[#6b8074]">{selectedGroup.productName}</div>
                  <div className="text-xs text-[#6b8074] mt-1">
                    2-mile radius coverage area
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ) : null}
        {businesses.map((business) => (
          <Marker
            key={business.id}
            position={[business.lat, business.lng]}
            icon={businessIcon}
          >
            <Popup>
              <div className="p-2">
                <div className="font-semibold text-sm text-[#1a1d1f] mb-1">
                  {business.name}
                </div>
                <div className="text-xs text-[#6b8074]">
                  {business.address}
                </div>
                <div className="text-xs text-[#6b8074]">
                  {business.city}, {business.state} {business.zip}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div 
        className="absolute inset-0 pointer-events-none rounded-lg"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(245, 243, 237, 0.3) 100%)',
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
};

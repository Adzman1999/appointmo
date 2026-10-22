import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, MapPin, Loader2, Navigation, Crosshair } from 'lucide-react';

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (loc: { lat: number; lng: number; address?: string; city?: string }) => void;
}

// Custom Leaflet Pin Icon with Tailwind amber theme
const customPinIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 32px; height: 32px; background-color: #f59e0b; border: 3px solid #1c1917; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.35);"></div>
      <div style="position: absolute; width: 12px; height: 12px; background-color: #1c1917; border-radius: 50%; z-index: 10;"></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLat = 14.5547,
  initialLng = 121.0244,
  onLocationSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');

  // Reverse geocode lat/lng to human address and city
  const reverseGeocode = async (lat: number, lng: number) => {
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Appointmo-Store-Locator',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || '';
        const city = addr.city || addr.town || addr.municipality || addr.state_district || 'Metro Manila';
        const fullAddr = data.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        
        setCurrentAddress(fullAddr);
        onLocationSelect({
          lat,
          lng,
          address: fullAddr,
          city,
        });
      }
    } catch (_) {
      onLocationSelect({ lat, lng });
    } finally {
      setReverseLoading(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map);

    // Click on map to place pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setCoords({ lat, lng });
      reverseGeocode(lat, lng);
    });

    // Drag pin to exact position
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      setCoords({ lat: pos.lat, lng: pos.lng });
      reverseGeocode(pos.lat, pos.lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Trigger initial reverse geocode
    reverseGeocode(coords.lat, coords.lng);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Search places via Nominatim API
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=5`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Appointmo-Store-Locator',
          },
        }
      );
      if (res.ok) {
        const results = await res.json();
        setSearchResults(results);
      }
    } catch (_) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Select place from search dropdown
  const handleSelectPlace = (place: any) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCoords({ lat, lng });
      setSearchResults([]);
      setSearchQuery('');
      setCurrentAddress(place.display_name.split(',').slice(0, 3).join(', '));

      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([lat, lng], 16);
        markerRef.current.setLatLng([lat, lng]);
      }

      reverseGeocode(lat, lng);
    }
  };

  // Locate current user device position
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
        reverseGeocode(lat, lng);
      },
      () => {}
    );
  };

  return (
    <div className="space-y-2">
      {/* Search Input Bar */}
      <div className="relative">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search address, mall, landmark (e.g. BGC High Street, SM Mall of Asia)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-3" />
          </div>

          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={searching || !searchQuery.trim()}
            className="px-3 py-2 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-300 transition shrink-0 disabled:opacity-50 flex items-center space-x-1"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Search</span>}
          </button>

          <button
            type="button"
            onClick={handleLocateMe}
            title="Locate my position"
            className="p-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
          >
            <Navigation className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl z-[1000] overflow-hidden max-h-48 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
            {searchResults.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectPlace(item)}
                className="p-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/70 cursor-pointer transition flex items-start space-x-2 text-xs"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span className="text-stone-800 dark:text-stone-200 truncate">{item.display_name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-stone-300 dark:border-stone-700 h-52 bg-stone-100 dark:bg-stone-800">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        <div className="absolute bottom-2 left-2 right-2 z-[400] bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm p-2 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between text-[11px] text-stone-700 dark:text-stone-300">
          <div className="flex items-center space-x-1.5 truncate">
            <Crosshair className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate font-medium">
              {reverseLoading ? 'Resolving pinned address...' : currentAddress || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
            </span>
          </div>
          <span className="text-[10px] text-stone-500 dark:text-stone-400 shrink-0 ml-2 font-mono">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-stone-500 dark:text-stone-400 italic">
        💡 Tip: Search any landmark or drag the pin directly on the map to mark your exact entrance or storefront.
      </p>
    </div>
  );
};

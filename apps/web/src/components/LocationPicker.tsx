import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Search, MapPin, Loader2, Navigation, Crosshair, Maximize2, Check, Plus, Minus, Layers, ExternalLink } from 'lucide-react';

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (loc: { 
    lat: number; 
    lng: number; 
    address?: string; 
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  }) => void;
}

// Reliable, high-performance map styles
type MapLayerStyle = 'google-roadmap' | 'google-hybrid' | 'osm';

export const LocationPicker: React.FC<LocationPickerProps> = ({
  initialLat = 14.5547,
  initialLng = 121.0244,
  onLocationSelect,
}) => {
  const normalMapRef = useRef<HTMLDivElement>(null);
  const fullMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const debounceTimerRef = useRef<any>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [currentZoom, setCurrentZoom] = useState(16);
  const [mapStyle, setMapStyle] = useState<MapLayerStyle>('google-roadmap');
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Reverse geocode lat/lng to human address and city
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setReverseLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Appointmo-Store-Locator-App',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.municipality || addr.state_district || addr.suburb || 'Metro Manila';
        const state = addr.state || addr.region || addr.province || '';
        const country = addr.country || 'Philippines';
        const postalCode = addr.postcode || '';
        const fullAddr = data.display_name?.split(',').slice(0, 3).join(', ') || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        
        setCurrentAddress(fullAddr);
        onLocationSelect({
          lat,
          lng,
          address: fullAddr,
          city,
          state,
          country,
          postalCode,
        });
      }
    } catch (_) {
      onLocationSelect({ lat, lng });
    } finally {
      setReverseLoading(false);
    }
  }, [onLocationSelect]);

  // Map Tile configuration
  const getTileConfig = (style: MapLayerStyle) => {
    switch (style) {
      case 'google-hybrid':
        return {
          url: 'https://mt{s}.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}',
          subdomains: ['0', '1', '2', '3'],
          attribution: '© Google Maps',
          maxZoom: 20,
        };
      case 'osm':
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: ['a', 'b', 'c'],
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        };
      case 'google-roadmap':
      default:
        return {
          url: 'https://mt{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
          subdomains: ['0', '1', '2', '3'],
          attribution: '© Google Maps',
          maxZoom: 20,
        };
    }
  };

  // Mount Leaflet map in the active container (fullscreen or normal)
  useEffect(() => {
    const activeContainer = isFullScreen ? fullMapRef.current : normalMapRef.current;
    if (!activeContainer) return;

    // Destroy existing instance cleanly before creating new one
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    }

    const map = L.map(activeContainer, {
      center: [coords.lat, coords.lng],
      zoom: currentZoom,
      minZoom: 3,
      maxZoom: 20,
      zoomControl: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      tapHold: true,
      bounceAtZoomLimits: false,
    });

    const tileConf = getTileConfig(mapStyle);
    const tileLayer = L.tileLayer(tileConf.url, {
      subdomains: tileConf.subdomains,
      attribution: tileConf.attribution,
      maxZoom: tileConf.maxZoom,
      maxNativeZoom: tileConf.maxZoom,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Google Maps style: Track center point smoothly on drag / swipe
    map.on('movestart', () => {
      setIsMapMoving(true);
    });

    map.on('move', () => {
      const center = map.getCenter();
      setCoords({ lat: center.lat, lng: center.lng });
    });

    map.on('moveend', () => {
      setIsMapMoving(false);
      const center = map.getCenter();
      setCoords({ lat: center.lat, lng: center.lng });
      setCurrentZoom(map.getZoom());

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        reverseGeocode(center.lat, center.lng);
      }, 300);
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    // Clicking anywhere smoothly animates the map center directly to that spot
    map.on('click', (e: L.LeafletMouseEvent) => {
      map.panTo(e.latlng, { animate: true, duration: 0.3 });
    });

    mapInstanceRef.current = map;

    // Initial size calculation
    const t1 = setTimeout(() => map.invalidateSize(), 60);
    const t2 = setTimeout(() => map.invalidateSize(), 250);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, [isFullScreen]);

  // Update tile layer when style changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tileConf = getTileConfig(mapStyle);
    const newTileLayer = L.tileLayer(tileConf.url, {
      subdomains: tileConf.subdomains,
      attribution: tileConf.attribution,
      maxZoom: tileConf.maxZoom,
      maxNativeZoom: tileConf.maxZoom,
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [mapStyle]);

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
            'User-Agent': 'Appointmo-Store-Locator-App',
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

      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 18, { duration: 1.0 });
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
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 18, { duration: 1.0 });
        }
        reverseGeocode(lat, lng);
      },
      () => {}
    );
  };

  // Direct Zoom Controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  // Cycle through Google Roadmap, Google Satellite Hybrid, and OSM
  const cycleMapStyle = () => {
    if (mapStyle === 'google-roadmap') setMapStyle('google-hybrid');
    else if (mapStyle === 'google-hybrid') setMapStyle('osm');
    else setMapStyle('google-roadmap');
  };

  const mapStyleLabel = {
    'google-roadmap': 'Google Map',
    'google-hybrid': 'Satellite',
    'osm': 'Standard OSM',
  }[mapStyle];

  // Open location in native Google Maps in a new tab
  const openExternalGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`, '_blank');
  };

  return (
    <div className="space-y-2">
      {/* Normal View or Fullscreen Overlay */}
      {isFullScreen ? (
        <div className="fixed inset-0 z-[100] bg-stone-900/85 backdrop-blur-md flex flex-col p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl flex-1 flex flex-col overflow-hidden">
            {/* Fullscreen Header Controls */}
            <div className="p-3.5 sm:p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 bg-stone-50 dark:bg-stone-800/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold">
                  <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">Pin Store Location</h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block">
                    Swipe or drag the map. The pin stays fixed right in the center target.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={openExternalGoogleMaps}
                  title="View on Google Maps"
                  className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-medium text-xs hover:bg-stone-50 dark:hover:bg-stone-700 transition flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Google Maps</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullScreen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 font-semibold text-xs hover:bg-stone-800 dark:hover:bg-amber-300 transition shadow flex items-center space-x-1.5 shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply Location &amp; Return</span>
                </button>
              </div>
            </div>

            {/* Search & Style Controls in Fullscreen */}
            <div className="p-3 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 relative z-20">
              <div className="flex flex-wrap items-center gap-2 max-w-2xl">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search address, mall, building or landmark..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-amber-400"
                  />
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                </div>

                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={searching || !searchQuery.trim()}
                  className="px-3.5 py-2 rounded-xl bg-stone-900 dark:bg-amber-400 text-white dark:text-stone-950 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-amber-300 transition shrink-0 flex items-center space-x-1"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Search</span>}
                </button>

                <button
                  type="button"
                  onClick={handleLocateMe}
                  title="Locate my position"
                  className="p-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
                >
                  <Navigation className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={cycleMapStyle}
                  className="px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-750 transition flex items-center space-x-1.5"
                  title="Switch Map Style"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>{mapStyleLabel}</span>
                </button>
              </div>

              {/* Fullscreen Search Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-3 right-3 sm:right-auto sm:w-[32rem] top-full mt-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl z-[1000] overflow-hidden max-h-56 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectPlace(item)}
                      className="p-3 hover:bg-stone-50 dark:hover:bg-stone-800/80 cursor-pointer transition flex items-start space-x-2 text-xs"
                    >
                      <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-stone-800 dark:text-stone-200">{item.display_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Map Canvas */}
            <div className="flex-1 relative bg-stone-100 dark:bg-stone-800 overflow-hidden cursor-grab active:cursor-grabbing">
              <div 
                ref={fullMapRef} 
                className="w-full h-full z-10 select-none" 
                style={{ minHeight: '100%', height: '100%' }}
              />

              {/* Center Pin Overlay (Google Maps Pin Marker Style) */}
              <div 
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[450] pointer-events-none transition-transform duration-150 ease-out flex flex-col items-center ${
                  isMapMoving ? '-translate-y-[115%] scale-110 drop-shadow-2xl' : 'drop-shadow-lg'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-10 h-10 bg-amber-500 border-2 border-stone-900 rounded-full rounded-br-none -rotate-45 flex items-center justify-center shadow-lg">
                    <div className="w-4 h-4 bg-stone-950 rounded-full rotate-45" />
                  </div>
                </div>
                {/* Pin Shadow on Ground */}
                <div 
                  className={`w-3.5 h-1.5 bg-stone-950/40 rounded-full blur-[1px] mt-0.5 transition-all duration-150 ${
                    isMapMoving ? 'scale-75 opacity-30 translate-y-2' : 'scale-100 opacity-70'
                  }`} 
                />
              </div>

              {/* Quick Floating Zoom In/Out Overlay Controls */}
              <div className="absolute top-4 right-4 z-[400] flex flex-col space-y-1.5">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-9 h-9 rounded-xl bg-white/95 dark:bg-stone-900/95 border border-stone-200 dark:border-stone-700 shadow-md text-stone-900 dark:text-stone-100 flex items-center justify-center font-bold text-lg hover:bg-amber-50 dark:hover:bg-stone-800 transition"
                  title="Zoom in"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-9 h-9 rounded-xl bg-white/95 dark:bg-stone-900/95 border border-stone-200 dark:border-stone-700 shadow-md text-stone-900 dark:text-stone-100 flex items-center justify-center font-bold text-lg hover:bg-amber-50 dark:hover:bg-stone-800 transition"
                  title="Zoom out"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom Address Info Bar */}
              <div className="absolute bottom-4 left-4 right-4 z-[400] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl flex items-center justify-between text-xs text-stone-800 dark:text-stone-200">
                <div className="flex items-center space-x-2 truncate">
                  <Crosshair className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate font-semibold">
                    {reverseLoading || isMapMoving ? 'Locating address...' : currentAddress || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`}
                  </span>
                </div>
                <div className="flex items-center space-x-3 shrink-0 ml-3">
                  <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400 hidden sm:inline">
                    z{currentZoom} • {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFullScreen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition shadow"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Normal View Search Input Bar */}
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

              <button
                type="button"
                onClick={cycleMapStyle}
                title="Switch Map Style"
                className="p-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition shrink-0"
              >
                <Layers className="w-4 h-4 text-amber-500" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                title="Open interactive fullscreen map to pan and zoom"
                className="px-2.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900 transition shrink-0 flex items-center space-x-1 text-xs font-bold"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span className="hidden sm:inline">Focus Map</span>
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

          {/* Normal View Map Canvas */}
          <div 
            className="relative rounded-2xl overflow-hidden border border-stone-300 dark:border-stone-700 h-64 bg-stone-100 dark:bg-stone-800 cursor-grab active:cursor-grabbing"
          >
            <div 
              ref={normalMapRef} 
              className="w-full h-full z-10 select-none" 
            />

            {/* Center Pin Overlay (Google Maps Pin Marker Style) */}
            <div 
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[450] pointer-events-none transition-transform duration-150 ease-out flex flex-col items-center ${
                isMapMoving ? '-translate-y-[115%] scale-110 drop-shadow-2xl' : 'drop-shadow-lg'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <div className="w-9 h-9 bg-amber-500 border-2 border-stone-900 rounded-full rounded-br-none -rotate-45 flex items-center justify-center shadow-lg">
                  <div className="w-3.5 h-3.5 bg-stone-950 rounded-full rotate-45" />
                </div>
              </div>
              <div 
                className={`w-3 h-1 bg-stone-950/40 rounded-full blur-[1px] mt-0.5 transition-all duration-150 ${
                  isMapMoving ? 'scale-75 opacity-30 translate-y-1.5' : 'scale-100 opacity-70'
                }`} 
              />
            </div>

            {/* Floating Style, Zoom & Fullscreen Controls */}
            <div className="absolute top-2 right-2 z-[400] flex flex-col space-y-1.5">
              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 shadow hover:bg-amber-50 dark:hover:bg-stone-800 transition flex items-center space-x-1 text-[11px] font-semibold"
                title="Expand map to full screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </button>

              <div className="flex flex-col bg-white/95 dark:bg-stone-900/95 rounded-xl border border-stone-200 dark:border-stone-700 shadow overflow-hidden">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-8 h-7 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center border-b border-stone-100 dark:border-stone-800"
                  title="Zoom in"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-8 h-7 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center"
                  title="Zoom out"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={cycleMapStyle}
                className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 shadow hover:bg-amber-50 dark:hover:bg-stone-800 transition flex items-center justify-center"
                title={`Current layer: ${mapStyleLabel}. Click to switch.`}
              >
                <Layers className="w-4 h-4 text-amber-500" />
              </button>
            </div>

            {/* Bottom Current Location Coordinates Badge */}
            <div className="absolute bottom-2 left-2 right-2 z-[400] bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm p-2 rounded-xl border border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between text-[11px] text-stone-700 dark:text-stone-300">
              <div className="flex items-center space-x-1.5 truncate">
                <Crosshair className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate font-medium">
                  {reverseLoading || isMapMoving ? 'Locating address...' : currentAddress || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
                </span>
              </div>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 shrink-0 ml-2 font-mono">
                {mapStyleLabel} • z{currentZoom}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-stone-500 dark:text-stone-400 italic">
            💡 Swipe or drag anywhere to position the pin directly on your store entrance.
          </p>
        </>
      )}
    </div>
  );
};

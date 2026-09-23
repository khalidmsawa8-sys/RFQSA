'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Search, Navigation, Check, X } from 'lucide-react';
// Safe Leaflet loading guarded against SSR ReferenceError: window is not defined
let L: any = null;
if (typeof window !== 'undefined') {
  try {
    L = require('leaflet');
    require('leaflet/dist/leaflet.css');
    if (L && L.Icon && L.Icon.Default) {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }
  } catch (e) {
    console.warn('Failed to load Leaflet:', e);
  }
}

interface LocationPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
    street?: string;
    district?: string;
    city?: string;
  }) => void;
}

const SAUDI_CITIES = [
  { name: 'الرياض', lat: 24.7136, lng: 46.6753 },
  { name: 'جدة', lat: 21.5433, lng: 39.1728 },
  { name: 'الدمام', lat: 26.4207, lng: 50.0888 },
  { name: 'مكة المكرمة', lat: 21.3891, lng: 39.8579 },
  { name: 'المدينة المنورة', lat: 24.5247, lng: 39.5692 },
  { name: 'الخبر', lat: 26.2172, lng: 50.1971 },
];

// Instant fallback dictionary for common Saudi districts
const KNOWN_DISTRICTS: Record<string, { lat: number; lng: number; address: string }> = {
  'العليا': { lat: 24.6934, lng: 46.6854, address: 'حي العليا – طريق الملك فهد، الرياض' },
  'الملز': { lat: 24.6644, lng: 46.7289, address: 'حي الملز – الرياض' },
  'الياسمين': { lat: 24.8211, lng: 46.6433, address: 'حي الياسمين – الرياض' },
  'الروضة': { lat: 24.7355, lng: 46.7722, address: 'حي الروضة – الرياض' },
  'الصحافة': { lat: 24.8055, lng: 46.6211, address: 'حي الصحافة – الرياض' },
  'السليمانية': { lat: 24.7088, lng: 46.7022, address: 'حي السليمانية – الرياض' },
  'الروضة جدة': { lat: 21.5644, lng: 39.1622, address: 'حي الروضة – طريق المدينة، جدة' },
  'الشاطئ': { lat: 21.6022, lng: 39.1155, address: 'حي الشاطئ – جدة' },
  'الكورنيش': { lat: 26.4411, lng: 50.1122, address: 'حي الكورنيش – الدمام' },
};

export function LocationPickerDialog({
  open,
  onClose,
  onLocationSelect,
}: LocationPickerDialogProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: 24.7136,
    lng: 46.6753,
  });
  const [selectedAddress, setSelectedAddress] = useState<string>('فرع الرياض – طريق الملك فهد');

  // Initialize fresh map instance on every modal open & safely destroy on close
  useEffect(() => {
    if (!open) {
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {
          // Ignore Leaflet cleanup edge cases
        }
        mapInstance.current = null;
        markerRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      // Clean up any residual instance before mounting new one
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {
          // ignore
        }
        mapInstance.current = null;
        markerRef.current = null;
      }

      const defaultCenter: [number, number] = [selectedCoords.lat, selectedCoords.lng];

      const map = L.map(mapRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom pin marker icon
      const pinIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="background-color: #2563eb; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 4px 12px rgba(37,99,235,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const initialMarker = L.marker(defaultCenter, { icon: pinIcon }).addTo(map);
      markerRef.current = initialMarker;

      // Map Click Handler
      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        updateMarkerAndCoords(lat, lng, map);
      });

      mapInstance.current = map;

      // Invalidate size twice to guarantee tile loading in Dialog
      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 100);

      setIsLoading(false);
    }, 120);

    return () => {
      clearTimeout(timer);
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {
          // ignore
        }
        mapInstance.current = null;
        markerRef.current = null;
      }
    };
  }, [open]);

  // Update marker position and fetch reverse geocode address
  const updateMarkerAndCoords = async (lat: number, lng: number, map: L.Map, knownAddress?: string) => {
    setSelectedCoords({ lat, lng });

    // Move or add marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const pinIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="background-color: #2563eb; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 4px 12px rgba(37,99,235,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    }

    if (knownAddress) {
      setSelectedAddress(knownAddress);
      return;
    }

    // Reverse Geocode via server route /api/geocode
    setIsGeocoding(true);
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      if (response.ok) {
        const data = await response.json();
        const displayAddr = data.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setSelectedAddress(displayAddr);
      } else {
        setSelectedAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (err) {
      setSelectedAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle Search input using Server API route /api/geocode with local fallback
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q || !mapInstance.current) return;

    setIsSearching(true);
    setError(null);

    // 1. Instant check against local dictionary
    const localMatchKey = Object.keys(KNOWN_DISTRICTS).find((key) =>
      q.includes(key) || key.includes(q)
    );
    if (localMatchKey && KNOWN_DISTRICTS[localMatchKey]) {
      const dist = KNOWN_DISTRICTS[localMatchKey];
      mapInstance.current.setView([dist.lat, dist.lng], 15);
      await updateMarkerAndCoords(dist.lat, dist.lng, mapInstance.current, dist.address);
      setIsSearching(false);
      return;
    }

    // 2. Server API Route Geocoding
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      if (res.ok && data.latitude && data.longitude) {
        mapInstance.current.setView([data.latitude, data.longitude], 15);
        await updateMarkerAndCoords(
          data.latitude,
          data.longitude,
          mapInstance.current,
          data.address
        );
      } else {
        setError('لم نتمكن من إيجاد العنوان المحدد، يرجى اختيار مكان قريب بالنقر على الخريطة مباشرة');
      }
    } catch (err) {
      setError('حدث خطأ الاتصال أثناء البحث، يرجى التحديد مباشرة على الخريطة');
    } finally {
      setIsSearching(false);
    }
  };

  // Quick City Selection
  const handleCitySelect = (city: typeof SAUDI_CITIES[0]) => {
    if (!mapInstance.current) return;
    mapInstance.current.setView([city.lat, city.lng], 13);
    updateMarkerAndCoords(city.lat, city.lng, mapInstance.current, `مدينة ${city.name}`);
  };

  // Handle GPS location detection
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد موقع الـ GPS');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapInstance.current) {
          mapInstance.current.setView([latitude, longitude], 16);
          updateMarkerAndCoords(latitude, longitude, mapInstance.current);
        }
        setIsLoading(false);
      },
      () => {
        setError('فشل الوصول لموقع الـ GPS الخاص بك، يرجى التحديد على الخريطة');
        setIsLoading(false);
      }
    );
  };

  // Confirm selected location
  const handleConfirmLocation = () => {
    onLocationSelect({
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      address: selectedAddress,
      city: 'الرياض',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent overlayClassName="z-[100000]" className="max-w-3xl w-[95vw] h-[640px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-3xl border-0 shadow-2xl flex flex-col font-sans z-[100001]" dir="rtl">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-white">
                اختر موقع التسليم من الخريطة التفاعلية
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                انقر على الخريطة لتحديد عنوان التسليم أو ابحث بالاسم
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & City Chips Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200/80 space-y-2.5">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث باسم الحي، الشارع، أو المدينة (مثال: العليا، الياسمين، الملز)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pr-9 pl-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <Button
              type="submit"
              disabled={isSearching}
              className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'بحث'}
            </Button>
          </form>

          {/* Preset City Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] text-slate-400 font-bold shrink-0 ml-1">مدن سريعة:</span>
            {SAUDI_CITIES.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleCitySelect(c)}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-[11px] font-bold text-slate-700 hover:text-blue-700 shrink-0 transition-all shadow-2xs"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-xs font-bold border-b border-red-200">
            {error}
          </div>
        )}

        {/* Map Container */}
        <div className="flex-1 relative bg-slate-100 min-h-[300px]">
          <div ref={mapRef} className="w-full h-full" />

          {/* Floating Current Location GPS Button on Map */}
          <button
            type="button"
            onClick={handleCurrentLocation}
            disabled={isLoading}
            className="absolute bottom-4 right-4 z-[400] bg-white hover:bg-slate-50 border-2 border-slate-200 shadow-lg px-3 py-2 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2 transition-all active:scale-95"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Navigation className="w-4 h-4 text-blue-600" />}
            <span>موقعي الحالي (GPS)</span>
          </button>
        </div>

        {/* Bottom Address Confirmation Bar */}
        <div className="p-4 bg-white border-t border-slate-200/90 space-y-3">
          <div className="flex items-center gap-2.5 bg-blue-50/70 border border-blue-200/80 p-3 rounded-2xl">
            <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-blue-700 font-extrabold block">العنوان المحدد حالياً:</span>
              <p className="text-xs font-extrabold text-slate-900 truncate">
                {isGeocoding ? (
                  <span className="text-slate-400 font-normal flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    جاري استخراج تفاصيل العنوان...
                  </span>
                ) : (
                  selectedAddress
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 px-5 rounded-xl text-xs font-bold border-slate-200"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleConfirmLocation}
              className="h-11 px-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2"
            >
              <Check className="w-4 h-4" strokeWidth={3} />
              <span>تأكيد واعتماد هذا الموقع</span>
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

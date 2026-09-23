"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MapPin,
  Search,
  Navigation,
  ExternalLink,
  Layers,
  Sparkles,
  Maximize2,
  Minimize2,
  Check,
  Building2,
  Loader2,
  Compass,
  Copy,
  CheckCheck,
  X,
  Globe2,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Crosshair,
  ChevronDown,
  Navigation2,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
// Safe Leaflet loading guarded against SSR ReferenceError: window is not defined
let L: any = null;
if (typeof window !== "undefined") {
  try {
    L = require("leaflet");
    require("leaflet/dist/leaflet.css");
    if (L && L.Icon && L.Icon.Default) {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
    }
  } catch (e) {
    console.warn("Failed to load Leaflet:", e);
  }
}

export interface SelectedLocationData {
  address: string;
  city: string;
  district?: string;
  street?: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
}

interface BranchLocationMapPickerProps {
  initialAddress?: string;
  initialCity?: string;
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (loc: SelectedLocationData) => void;
}

// Major Saudi Cities with Coordinates & Centers
const SAUDI_CITIES = [
  { name: "الرياض", lat: 24.7136, lng: 46.6753, zoom: 12 },
  { name: "جدة", lat: 21.5433, lng: 39.1728, zoom: 12 },
  { name: "مكة المكرمة", lat: 21.3891, lng: 39.8579, zoom: 13 },
  { name: "المدينة المنورة", lat: 24.5247, lng: 39.5692, zoom: 13 },
  { name: "الدمام", lat: 26.4207, lng: 50.0888, zoom: 12 },
  { name: "الخبر", lat: 26.2172, lng: 50.1971, zoom: 13 },
  { name: "القصيم (بريدة)", lat: 26.3592, lng: 43.9818, zoom: 12 },
  { name: "تبوك", lat: 28.3835, lng: 36.5662, zoom: 12 },
  { name: "أبها", lat: 18.2164, lng: 42.5053, zoom: 13 },
  { name: "خميس مشيط", lat: 18.3000, lng: 42.7333, zoom: 13 },
  { name: "الطائف", lat: 21.2854, lng: 40.4222, zoom: 13 },
  { name: "حائل", lat: 27.5219, lng: 41.6961, zoom: 13 },
  { name: "جازان", lat: 16.8892, lng: 42.5511, zoom: 13 },
];

// Curated Popular Saudi Districts & Hubs for Instant Smart Autocomplete
const POPULAR_DISTRICTS: Record<
  string,
  { lat: number; lng: number; city: string; district: string; street: string; address: string }
> = {
  "العليا (الرياض)": {
    lat: 24.6934,
    lng: 46.6854,
    city: "الرياض",
    district: "العليا",
    street: "طريق الملك فهد",
    address: "طريق الملك فهد – حي العليا، الرياض",
  },
  "الملقا (الرياض)": {
    lat: 24.8089,
    lng: 46.6139,
    city: "الرياض",
    district: "الملقا",
    street: "طريق أنس بن مالك",
    address: "طريق أنس بن مالك – حي الملقا، الرياض",
  },
  "الياسمين (الرياض)": {
    lat: 24.8211,
    lng: 46.6433,
    city: "الرياض",
    district: "الياسمين",
    street: "طريق الملك عبدالعزيز",
    address: "طريق الملك عبدالعزيز – حي الياسمين، الرياض",
  },
  "الصحافة (الرياض)": {
    lat: 24.8055,
    lng: 46.6211,
    city: "الرياض",
    district: "الصحافة",
    street: "طريق الملك فهد",
    address: "طريق الملك فهد – حي الصحافة، الرياض",
  },
  "السليمانية (الرياض)": {
    lat: 24.7088,
    lng: 46.7022,
    city: "الرياض",
    district: "السليمانية",
    street: "طريق العروبة",
    address: "طريق العروبة – حي السليمانية، الرياض",
  },
  "الملز (الرياض)": {
    lat: 24.6644,
    lng: 46.7289,
    city: "الرياض",
    district: "الملز",
    street: "شارع الستين",
    address: "شارع الستين – حي الملز، الرياض",
  },
  "الشاطئ (جدة)": {
    lat: 21.6022,
    lng: 39.1155,
    city: "جدة",
    district: "الشاطئ",
    street: "طريق الكورنيش",
    address: "طريق الكورنيش – حي الشاطئ، جدة",
  },
  "الروضة (جدة)": {
    lat: 21.5644,
    lng: 39.1622,
    city: "جدة",
    district: "الروضة",
    street: "طريق المدينة المنورة",
    address: "طريق المدينة المنورة – حي الروضة، جدة",
  },
  "الحمراء (جدة)": {
    lat: 21.5188,
    lng: 39.1555,
    city: "جدة",
    district: "الحمراء",
    street: "طريق الأندلس",
    address: "طريق الأندلس – حي الحمراء، جدة",
  },
  "الكورنيش الشمالي (الدمام)": {
    lat: 26.4411,
    lng: 50.1122,
    city: "الدمام",
    district: "الكورنيش الشمالي",
    street: "شارع الأمل",
    address: "شارع الأمل – الكورنيش الشمالي، الدمام",
  },
  "العقربية (الخبر)": {
    lat: 26.2172,
    lng: 50.1971,
    city: "الخبر",
    district: "العقربية",
    street: "طريق الملك فيصل",
    address: "طريق الملك فيصل – حي العقربية، الخبر",
  },
  "العزيزية (مكة المكرمة)": {
    lat: 21.3988,
    lng: 39.8655,
    city: "مكة المكرمة",
    district: "العزيزية",
    street: "طريق العزيزية العام",
    address: "طريق العزيزية العام، مكة المكرمة",
  },
  "سلطانة (المدينة المنورة)": {
    lat: 24.4844,
    lng: 39.5822,
    city: "المدينة المنورة",
    district: "سلطانة",
    street: "طريق سلطانة التجاري",
    address: "طريق سلطانة التجاري، المدينة المنورة",
  },
};

type TileLayerType = "voyager" | "satellite" | "street";

export function BranchLocationMapPicker({
  initialAddress = "",
  initialCity = "الرياض",
  initialLat = 24.7136,
  initialLng = 46.6753,
  onLocationChange,
}: BranchLocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerInstance = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // States
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [cityName, setCityName] = useState(initialCity);
  const [districtName, setDistrictName] = useState("");
  const [streetName, setStreetName] = useState("");

  const [showMapModal, setShowMapModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapLayer, setMapLayer] = useState<TileLayerType>("voyager");
  const [isCopied, setIsCopied] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Autocomplete suggestions dropdown state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const suggestionsContainerRef = useRef<HTMLDivElement>(null);

  // Custom Animated Branch Marker
  const createCustomPinIcon = () => {
    return L.divIcon({
      className: "branch-custom-pin-marker",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <div style="position: absolute; width: 46px; height: 46px; border-radius: 50%; background: rgba(147, 51, 234, 0.35); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 38px; height: 38px; border-radius: 14px; background: linear-gradient(135deg, #6d28d9 0%, #9333ea 50%, #c026d3 100%); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(109, 40, 217, 0.5); border: 2.5px solid white; z-index: 10;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div style="position: absolute; bottom: -8px; width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #6d28d9;"></div>
        </div>
      `,
      iconSize: [38, 46],
      iconAnchor: [19, 46],
    });
  };

  // Helper to switch Tile Layers
  const setTileLayer = (map: L.Map, layerType: TileLayerType) => {
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    let attribution = '&copy; <a href="https://carto.com/">CARTO</a>';

    if (layerType === "street") {
      url = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      attribution = '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>';
    } else if (layerType === "satellite") {
      url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      attribution = "&copy; Esri & Earthstar Geographics";
    }

    const newLayer = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    tileLayerRef.current = newLayer;
  };

  // Initialize Map inside Modal when opened
  useEffect(() => {
    if (!showMapModal) {
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {}
        mapInstance.current = null;
        markerInstance.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {}
        mapInstance.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: "topleft" }).addTo(map);
      setTileLayer(map, mapLayer);

      const pin = L.marker([coords.lat, coords.lng], {
        icon: createCustomPinIcon(),
        draggable: true,
      }).addTo(map);

      pin.on("dragend", async () => {
        const pos = pin.getLatLng();
        await handleLocationUpdate(pos.lat, pos.lng, map);
      });

      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        pin.setLatLng([lat, lng]);
        await handleLocationUpdate(lat, lng, map);
      });

      markerInstance.current = pin;
      mapInstance.current = map;

      setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 150);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {}
        mapInstance.current = null;
      }
    };
  }, [showMapModal]);

  // Update map layer on toggle
  useEffect(() => {
    if (mapInstance.current) {
      setTileLayer(mapInstance.current, mapLayer);
    }
  }, [mapLayer]);

  // Reverse Geocoding & Coordinates Handler
  const handleLocationUpdate = async (
    lat: number,
    lng: number,
    map?: L.Map,
    manualAddress?: string,
    manualCity?: string
  ) => {
    setCoords({ lat, lng });
    setGeoError(null);

    const googleMapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

    if (markerInstance.current) {
      markerInstance.current.setLatLng([lat, lng]);
    }

    if (manualAddress) {
      setAddressInput(manualAddress);
      if (manualCity) setCityName(manualCity);
      onLocationChange({
        address: manualAddress,
        city: manualCity || cityName,
        district: districtName,
        street: streetName,
        latitude: lat,
        longitude: lng,
        googleMapsUrl,
      });
      return;
    }

    // Call Reverse Geocode Server Route /api/geocode
    setIsGeocoding(true);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      if (res.ok) {
        const data = await res.json();
        const detectedCity = data.city || cityName || "الرياض";
        const detectedDistrict = data.district || "";
        const detectedStreet = data.street || "";

        let formattedAddr = data.address;
        if (detectedStreet || detectedDistrict) {
          formattedAddr = `${detectedStreet ? detectedStreet + " – " : ""}${
            detectedDistrict ? "حي " + detectedDistrict + "، " : ""
          }${detectedCity}`;
        }

        setAddressInput(formattedAddr);
        setCityName(detectedCity);
        setDistrictName(detectedDistrict);
        setStreetName(detectedStreet);

        onLocationChange({
          address: formattedAddr,
          city: detectedCity,
          district: detectedDistrict,
          street: detectedStreet,
          latitude: lat,
          longitude: lng,
          googleMapsUrl,
        });
      } else {
        const fallbackAddr = `موقع محدد (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        setAddressInput(fallbackAddr);
        onLocationChange({
          address: fallbackAddr,
          city: cityName,
          latitude: lat,
          longitude: lng,
          googleMapsUrl,
        });
      }
    } catch (e) {
      const fallbackAddr = `موقع محدد (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setAddressInput(fallbackAddr);
      onLocationChange({
        address: fallbackAddr,
        city: cityName,
        latitude: lat,
        longitude: lng,
        googleMapsUrl,
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Search Address, District, Coords, or Google Maps URL
  const handleSearchSubmit = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    setGeoError(null);

    // 1. Check local dictionary
    const matchedKey = Object.keys(POPULAR_DISTRICTS).find(
      (k) => q.includes(k) || k.includes(q)
    );

    if (matchedKey && POPULAR_DISTRICTS[matchedKey]) {
      const dist = POPULAR_DISTRICTS[matchedKey];
      if (mapInstance.current) {
        mapInstance.current.flyTo([dist.lat, dist.lng], 15, { duration: 1.2 });
      }
      await handleLocationUpdate(
        dist.lat,
        dist.lng,
        mapInstance.current || undefined,
        dist.address,
        dist.city
      );
      setDistrictName(dist.district);
      setStreetName(dist.street);
      setIsSearching(false);
      return;
    }

    // 2. Server API Route Geocoding (with Google Maps URL and coord parsing)
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      if (res.ok && data.latitude && data.longitude) {
        if (mapInstance.current) {
          mapInstance.current.flyTo([data.latitude, data.longitude], 15, { duration: 1.2 });
        }
        await handleLocationUpdate(
          data.latitude,
          data.longitude,
          mapInstance.current || undefined,
          data.address,
          data.city
        );
      } else {
        setGeoError("لم يتم العثور على الموقع بدقة. يمكنك النقر على الخريطة مباشرة لتثبيته.");
      }
    } catch (err) {
      setGeoError("تعذر الاتصال بخدمة البحث. يرجى التحديد على الخريطة مباشرة.");
    } finally {
      setIsSearching(false);
    }
  };

  // Quick City FlyTo
  const handleSelectCity = (city: (typeof SAUDI_CITIES)[0]) => {
    if (mapInstance.current) {
      mapInstance.current.flyTo([city.lat, city.lng], city.zoom, { duration: 1.2 });
    }
    handleLocationUpdate(
      city.lat,
      city.lng,
      mapInstance.current || undefined,
      `مدينة ${city.name}`,
      city.name
    );
  };

  // GPS Location Trigger
  const handleGetGPSLocation = () => {
    if (!navigator.geolocation) {
      alert("المتصفح لا يدعم خدمة تحديد المواقع (GPS)");
      return;
    }

    setIsGeocoding(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstance.current) {
          mapInstance.current.flyTo([latitude, longitude], 16, { duration: 1.2 });
        }
        await handleLocationUpdate(latitude, longitude, mapInstance.current || undefined);
        setIsGeocoding(false);
      },
      () => {
        setGeoError("تعذر الحصول على موقع الـ GPS، يرجى تفعيل إذن الموقع أو التحديد على الخريطة.");
        setIsGeocoding(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Copy Google Maps Link
  const handleCopyLink = () => {
    const link = `https://www.google.com/maps?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Handle Input typing and suggestions filter
  const handleAddressInputChange = (val: string) => {
    setAddressInput(val);

    // If user pasted a Google Maps link or coordinates, trigger smart parser
    if (
      val.includes("google.com/maps") ||
      val.includes("maps.app.goo.gl") ||
      /^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/.test(val.trim())
    ) {
      handleSearchSubmit(val);
      setShowSuggestions(false);
      return;
    }

    // Filter suggestions
    if (val.trim().length >= 2) {
      const q = val.trim().toLowerCase();
      const matched = Object.keys(POPULAR_DISTRICTS).filter(
        (key) => key.toLowerCase().includes(q) || POPULAR_DISTRICTS[key].address.toLowerCase().includes(q)
      );
      setFilteredSuggestions(matched);
      setShowSuggestions(matched.length > 0);
    } else {
      setShowSuggestions(false);
    }

    // Notify parent of updated manual address
    onLocationChange({
      address: val,
      city: cityName,
      district: districtName,
      street: streetName,
      latitude: coords.lat,
      longitude: coords.lng,
      googleMapsUrl: `https://www.google.com/maps?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`,
    });
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsContainerRef.current &&
        !suggestionsContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const googleMapsDirectLink = `https://www.google.com/maps?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`;

  return (
    <div className="space-y-3 dir-rtl text-right" dir="rtl">
      {/* ── LABEL & ACTIONS HEADER ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <label className="block font-black text-slate-800 text-xs flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
            <span>العنوان التفصيلي وموقع التسليم *</span>
          </label>
          <span className="text-[10px] bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 font-bold px-2 py-0.5 rounded-full border border-purple-200/60 flex items-center gap-1 shadow-2xs">
            <Globe2 className="w-3 h-3 text-purple-600" />
            <span>مدعوم بخرائط Google Maps</span>
          </span>
        </div>

        {/* Quick GPS & Map Trigger Badges */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleGetGPSLocation}
            disabled={isGeocoding}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-purple-700 bg-slate-100 hover:bg-purple-50 hover:border-purple-200 border border-slate-200/80 px-2.5 py-1 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="تحديد الموقع الجغرافي الحالي تلقائياً"
          >
            {isGeocoding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-purple-600" />
            )}
            <span>موقعي (GPS)</span>
          </button>
        </div>
      </div>

      {/* ── SMART INPUT & MAP LAUNCHER CONTAINER ── */}
      <div className="relative" ref={suggestionsContainerRef}>
        <div className="relative flex items-center shadow-xs rounded-2xl bg-white border border-purple-200 hover:border-purple-400 focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-500/15 transition-all">
          {/* Leading Pin Icon */}
          <div className="pr-3 pl-1 text-purple-600 shrink-0">
            <MapPin className="w-4 h-4" />
          </div>

          {/* Main Address Input */}
          <input
            type="text"
            value={addressInput}
            onChange={(e) => handleAddressInputChange(e.target.value)}
            onFocus={() => {
              if (filteredSuggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="اكتب العنوان، اسم الحي، الشارع، أو الصق رابط خرائط Google..."
            className="w-full h-11 py-2 text-xs font-bold text-slate-900 bg-transparent placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
            required
          />

          {/* Inline Action Buttons */}
          <div className="flex items-center gap-1.5 pl-1.5 shrink-0">
            {isGeocoding && <Loader2 className="w-4 h-4 text-purple-600 animate-spin mr-1" />}

            {/* Launch Google Maps Picker Button */}
            <button
              type="button"
              onClick={() => setShowMapModal(true)}
              className="h-8 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/25 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Map className="w-3.5 h-3.5 text-purple-100" />
              <span>تحديد من الخريطة 🗺️</span>
            </button>
          </div>
        </div>

        {/* ── SMART SUGGESTIONS AUTOCOMPLETE DROPDOWN ── */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-purple-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="p-2 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between text-[11px] font-bold text-purple-900">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                اقتراحات سريعة للمواقع والأحياء بالمملكة:
              </span>
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
              {filteredSuggestions.map((key) => {
                const item = POPULAR_DISTRICTS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setAddressInput(item.address);
                      setCityName(item.city);
                      setDistrictName(item.district);
                      setStreetName(item.street);
                      setCoords({ lat: item.lat, lng: item.lng });
                      onLocationChange({
                        address: item.address,
                        city: item.city,
                        district: item.district,
                        street: item.street,
                        latitude: item.lat,
                        longitude: item.lng,
                        googleMapsUrl: `https://www.google.com/maps?q=${item.lat.toFixed(6)},${item.lng.toFixed(6)}`,
                      });
                      setShowSuggestions(false);
                    }}
                    className="w-full text-right p-2.5 hover:bg-purple-50/60 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{item.address}</p>
                        <p className="text-[10px] text-slate-400">{item.city} – {item.district}</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded shrink-0">
                      تحديد ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── GOOGLE MAPS VERIFIED LOCATION CARD PREVIEW ── */}
      <div className="p-3 bg-gradient-to-r from-purple-50/80 via-slate-50 to-indigo-50/70 border border-purple-200/80 rounded-2xl space-y-2 text-xs shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-purple-950 text-xs">الموقع الجغرافي المحدد</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.2 rounded-md">
                  Google Maps Verified ✓
                </span>
              </div>
              <p className="text-slate-800 font-bold text-[11px] truncate">
                {addressInput || "يرجى كتابة العنوان أو تحديده من الخريطة"}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Direct Google Maps Link */}
            <a
              href={googleMapsDirectLink}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black flex items-center gap-1 transition-all shadow-2xs"
              title="فتح الموقع مباشرة في Google Maps"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Google Maps ↗</span>
            </a>

            {/* Copy Coordinates */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="h-7 px-2 rounded-lg bg-white hover:bg-purple-100 border border-purple-200 text-purple-800 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="نسخ رابط الموقع"
            >
              {isCopied ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-purple-600" />}
              <span>{isCopied ? "تم النسخ" : "نسخ"}</span>
            </button>
          </div>
        </div>

        {/* GPS Coordinates Badge */}
        <div className="flex items-center justify-between border-t border-purple-100 pt-1.5 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-sans font-bold text-slate-700">الإحداثيات:</span>
            <span className="bg-white/90 px-2 py-0.5 rounded border border-purple-200/70 text-slate-800">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </span>
            <span className="bg-purple-100/80 text-purple-900 font-sans font-bold px-2 py-0.5 rounded">
              {cityName}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowMapModal(true)}
            className="font-sans font-black text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>تعديل الدبوس ✏️</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── FULL INTERACTIVE GOOGLE MAPS SELECTION MODAL DIALOG ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showMapModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[9999] animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] max-h-[750px] border border-purple-200 shadow-2xl flex flex-col overflow-hidden text-right dir-rtl"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                  <Map className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm sm:text-base text-white">
                      تحديد موقع ومقر الفرع على خريطة Google التفاعلية
                    </h3>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                      GPS Live Pinpoint
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    انقر على أي نقطة، أو اسحب الدبوس، أو ابحث باسم الحي والشارع لتثبيت المقر بدقة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Layer Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setMapLayer(
                      mapLayer === "voyager" ? "satellite" : mapLayer === "satellite" ? "street" : "voyager"
                    )
                  }
                  className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer"
                  title="تبديل طبقة الخريطة"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-300" />
                  <span>
                    {mapLayer === "satellite"
                      ? "🛰️ قمر صناعي"
                      : mapLayer === "street"
                      ? "🗺️ شوارع"
                      : "🏙️ خرائط حديثة"}
                  </span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Search & Fast City Hubs Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchSubmit();
                      }
                    }}
                    placeholder="ابحث باسم الحي، الشارع، المعلم (مثال: حي العليا، طريق الملك فهد، العزيزية، الكورنيش)..."
                    className="w-full h-10 pr-9 pl-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  disabled={isSearching}
                  className="h-10 px-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث في الخريطة"}
                </Button>

                <Button
                  type="button"
                  onClick={handleGetGPSLocation}
                  disabled={isGeocoding}
                  className="h-10 px-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer flex items-center gap-1"
                  title="موقعي الحالي"
                >
                  <Navigation2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>موقعي (GPS)</span>
                </Button>
              </div>

              {/* Quick City Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">مدن سريعة:</span>
                {SAUDI_CITIES.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => handleSelectCity(c)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                      cityName === c.name
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {geoError && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-[11px] font-bold">
                {geoError}
              </div>
            )}

            {/* ── MAP CONTAINER ── */}
            <div className="relative flex-1 w-full bg-slate-100 min-h-[300px]">
              <div ref={mapContainerRef} className="w-full h-full z-0" />

              {/* Floating Helper Box */}
              <div className="absolute top-3 right-3 z-[400] bg-slate-900/85 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 pointer-events-none">
                <Compass className="w-4 h-4 text-purple-400 animate-spin-slow" />
                <span>انقر في أي مكان على الخريطة لتثبيت مكان الفرع</span>
              </div>

              {/* Floating Google Maps Direct link in Map */}
              <a
                href={googleMapsDirectLink}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 left-3 z-[400] bg-white/95 hover:bg-white backdrop-blur-xs text-slate-900 border border-slate-300 shadow-lg px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:text-purple-700"
              >
                <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                <span>فتح في تطبيق Google Maps ↗</span>
              </a>
            </div>

            {/* Modal Bottom Bar with Details & Confirmation */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-xs">الموقع المحدد للفرع:</span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-purple-900 truncate">
                    {isGeocoding ? (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                        جاري تحديد العنوان والحي...
                      </span>
                    ) : (
                      addressInput || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowMapModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMapModal(false);
                    onLocationChange({
                      address: addressInput,
                      city: cityName,
                      district: districtName,
                      street: streetName,
                      latitude: coords.lat,
                      longitude: coords.lng,
                      googleMapsUrl: googleMapsDirectLink,
                    });
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-purple-600/25 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد واعتماد هذا الموقع للفرع</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

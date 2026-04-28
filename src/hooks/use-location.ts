import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface UserLocation {
  lat: number;
  lng: number;
  label: string | null;
}

const STORAGE_KEY = "lendleaf:location";

function readCached(): UserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") {
      return { lat: parsed.lat, lng: parsed.lng, label: parsed.label ?? null };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeCached(loc: UserLocation | null) {
  if (typeof window === "undefined") return;
  if (loc) localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  else localStorage.removeItem(STORAGE_KEY);
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.suburb ?? a.county;
    const region = a.state ?? a.country;
    return [city, region].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}

export function useUserLocation() {
  const { user } = useAuth();
  const [location, setLocation] = useState<UserLocation | null>(() => readCached());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from profile on sign-in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("location_lat, location_lng, location_label")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      if (
        typeof data.location_lat === "number" &&
        typeof data.location_lng === "number"
      ) {
        const loc = {
          lat: data.location_lat,
          lng: data.location_lng,
          label: data.location_label ?? null,
        };
        setLocation(loc);
        writeCached(loc);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const detect = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation isn't supported on this device");
      return null;
    }
    setLoading(true);
    setError(null);
    return new Promise<UserLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const label = await reverseGeocode(lat, lng);
          const loc: UserLocation = { lat, lng, label };
          setLocation(loc);
          writeCached(loc);
          if (user) {
            await supabase
              .from("profiles")
              .update({
                location_lat: lat,
                location_lng: lng,
                location_label: label,
              })
              .eq("id", user.id);
          }
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          setError(err.message || "Couldn't read your location");
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
      );
    });
  }, [user]);

  const clear = useCallback(async () => {
    setLocation(null);
    writeCached(null);
    if (user) {
      await supabase
        .from("profiles")
        .update({
          location_lat: null,
          location_lng: null,
          location_label: null,
        })
        .eq("id", user.id);
    }
  }, [user]);

  return { location, loading, error, detect, clear };
}

// Haversine distance in kilometers
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

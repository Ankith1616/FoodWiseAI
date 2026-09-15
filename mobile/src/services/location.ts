/**
 * FoodWiseAI — Location Service
 *
 * Requests user location permissions and detects current city/suburb address.
 * Standard Web Geolocation API on web, Expo Location on native mobile.
 */

import { Platform } from 'react-native';

export interface LocationResult {
  mainAddress: string;
  subAddress: string;
  latitude: number | null;
  longitude: number | null;
  error?: string;
}

export async function getCurrentUserLocation(): Promise<LocationResult> {
  // ── Web Platform ──────────────────────────────────────────
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      return new Promise<LocationResult>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
              );
              const data = await res.json();
              if (data && data.address) {
                const addr = data.address;
                const main = addr.suburb || addr.neighbourhood || addr.road || addr.city || 'Current Location';
                const sub = [addr.city || addr.town, addr.state, addr.country].filter(Boolean).join(', ');
                resolve({
                  mainAddress: main,
                  subAddress: sub || 'Detected Location',
                  latitude,
                  longitude,
                });
                return;
              }
            } catch {
              // Ignore reverse geocode fetch errors
            }

            resolve({
              mainAddress: `Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`,
              subAddress: 'Browser Geolocation',
              latitude,
              longitude,
            });
          },
          (err) => {
            resolve({
              mainAddress: 'Location Access Denied',
              subAddress: 'Tap to retry in browser',
              latitude: null,
              longitude: null,
              error: err.message || 'Browser location permission denied',
            });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    }

    return {
      mainAddress: 'Geolocation Unsupported',
      subAddress: 'Browser does not support geolocation',
      latitude: null,
      longitude: null,
    };
  }

  // ── Native Mobile Platform (iOS / Android) ────────────────
  try {
    const Location = require('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      return {
        mainAddress: 'Permission Denied',
        subAddress: 'Tap to enable location in settings',
        latitude: null,
        longitude: null,
        error: 'Location permission denied by user',
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = location.coords;

    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const main = place.name || place.street || place.district || place.subregion || place.city || 'Current Location';
        const sub = [place.city, place.region, place.country].filter(Boolean).join(', ') || 'Detected Location';
        return {
          mainAddress: main,
          subAddress: sub,
          latitude,
          longitude,
        };
      }
    } catch {}

    return {
      mainAddress: `Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}`,
      subAddress: 'GPS Location Detected',
      latitude,
      longitude,
    };
  } catch (err: any) {
    return {
      mainAddress: 'Location Error',
      subAddress: 'Tap to retry location',
      latitude: null,
      longitude: null,
      error: err?.message || 'Failed to detect location',
    };
  }
}

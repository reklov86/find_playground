"use client";

/**
 * OpenRouteService integration for multi-modal routing.
 */

const API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;
const BASE_URL = 'https://api.openrouteservice.org/v2/directions';

export type RoutingProfile = 'foot-walking' | 'cycling-regular' | 'driving-car';

export interface RouteStep {
  distance: number;
  duration: number;
  type: number;
  instruction: string;
  name: string;
  way_points: [number, number];
}

export interface RouteData {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
    properties: {
      summary: {
        distance: number;
        duration: number;
      };
      segments: Array<{
        distance: number;
        duration: number;
        steps: RouteStep[];
      }>;
    };
  }>;
}

/**
 * Fetches a route between two points using OpenRouteService.
 * @param start [longitude, latitude]
 * @param end [longitude, latitude]
 * @param profile Routing profile (walking, cycling, or driving)
 */
export async function getRoute(
  start: [number, number],
  end: [number, number],
  profile: RoutingProfile = 'foot-walking'
): Promise<RouteData | null> {
  if (!API_KEY) {
    console.error('OpenRouteService API key is missing. Check NEXT_PUBLIC_ORS_API_KEY environment variable.');
    return null;
  }

  const queryParams = new URLSearchParams({ api_key: API_KEY });
  const url = `${BASE_URL}/${profile}/geojson?${queryParams.toString()}`;

  try {
    const body = {
      coordinates: [start, end],
      instructions: true,
      language: 'de',
      units: 'm',
      preference: 'recommended'
    };

    console.log(`Fetching route from ORS: ${profile}`, { start, end });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY, // Try both header and query param for maximum compatibility
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = errorText;
      }
      console.error('ORS Routing Error Details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        url: url.replace(API_KEY, 'REDACTED')
      });
      return null;
    }

    const data = await response.json();
    
    // Robust verification
    if (data && data.type === 'FeatureCollection' && data.features?.length > 0) {
      const feature = data.features[0];
      if (feature.geometry?.coordinates?.length > 0 && feature.properties?.segments?.[0]?.steps) {
        console.log('Successfully fetched route with instructions');
        return data as RouteData;
      }
    }
    
    console.error('ORS response missing expected data (geometry or steps):', data);
    return null;
  } catch (error) {
    console.error('Failed to fetch route (network or parsing error):', error);
    return null;
  }
}

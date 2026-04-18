"use client";

/**
 * OpenRouteService integration for multi-modal routing.
 */

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
): Promise<{ data: RouteData | null, error?: string }> {
  const currentKey = process.env.NEXT_PUBLIC_ORS_API_KEY;

  if (!currentKey) {
    console.error('OpenRouteService API key is missing (NEXT_PUBLIC_ORS_API_KEY).');
    return { data: null, error: 'API_KEY_MISSING' };
  }

  const queryParams = new URLSearchParams({ api_key: currentKey });
  const url = `${BASE_URL}/${profile}/geojson?${queryParams.toString()}`;

  try {
    const body = {
      coordinates: [start, end],
      instructions: true,
      language: 'de',
      units: 'm'
    };

    console.log(`Fetching route from ORS: ${profile}`, { start, end });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Removed Authorization header to prefer api_key query param
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ORS Routing Error (${response.status}):`, errorText);
      return { data: null, error: `API_ERROR_${response.status}` };
    }

    const data = await response.json();
    
    if (data && data.type === 'FeatureCollection' && data.features?.length > 0) {
      const feature = data.features[0];
      if (feature.geometry?.coordinates?.length > 0) {
        return { data: data as RouteData };
      }
    }
    
    console.error('ORS response missing geometry:', data);
    return { data: null, error: 'INVALID_RESPONSE' };
  } catch (error: any) {
    console.error('Failed to fetch route:', error);
    return { data: null, error: 'NETWORK_ERROR' };
  }
}

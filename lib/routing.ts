"use client";

/**
 * OpenRouteService integration for multi-modal routing.
 */

const API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY;
const BASE_URL = 'https://api.openrouteservice.org/v2/directions';

export type RoutingProfile = 'foot-walking' | 'cycling-regular' | 'driving-car';

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
    console.error('OpenRouteService API key is missing.');
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/${profile}/geojson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY, // ORS uses Authorization header for API Key in some versions, or api_key param
      },
      body: JSON.stringify({
        coordinates: [start, end],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ORS Routing Error:', errorData);
      
      // Fallback: If Authorization header fails, try api_key query param (some ORS plans differ)
      if (response.status === 401 || response.status === 403) {
        const fallbackUrl = `${BASE_URL}/${profile}/geojson?api_key=${API_KEY}`;
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coordinates: [start, end] }),
        });
        
        if (fallbackResponse.ok) {
          return await fallbackResponse.json();
        }
      }
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch route:', error);
    return null;
  }
}

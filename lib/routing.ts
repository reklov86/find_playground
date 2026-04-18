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
    console.error('OpenRouteService API key is missing.');
    return null;
  }

  try {
    const body = {
      coordinates: [start, end],
      instructions: true,
      language: 'de', // Request instructions in German
      units: 'm'
    };

    const response = await fetch(`${BASE_URL}/${profile}/geojson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ORS Routing Error:', errorData);
      
      if (response.status === 401 || response.status === 403) {
        const fallbackUrl = `${BASE_URL}/${profile}/geojson?api_key=${API_KEY}`;
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        
        if (fallbackResponse.ok) {
          return await fallbackResponse.json();
        }
      }
      return null;
    }

    const data = await response.json();
    
    // Strict verification of the ORS response structure
    if (data && data.type === 'FeatureCollection' && data.features?.[0]?.geometry?.type === 'LineString') {
      return data as RouteData;
    }
    
    console.error('Invalid ORS route format:', data);
    return null;
  } catch (error) {
    console.error('Failed to fetch route:', error);
    return null;
  }
}

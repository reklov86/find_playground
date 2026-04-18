/**
 * Overpass API Utility for fetching OpenStreetMap (OSM) playground data.
 */

export interface OSMElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface GeoJSONFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: Record<string, string | number | boolean | null>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter'
];

/**
 * Fetches playgrounds from Overpass API within a bounding box.
 * @param bbox [south, west, north, east]
 */
export async function fetchPlaygrounds(bbox: [number, number, number, number]): Promise<GeoJSONFeatureCollection> {
  const [south, west, north, east] = bbox;
  
  const query = `
    [out:json][timeout:60];
    nwr["leisure"="playground"](${south},${west},${north},${east});
    out center;
  `.trim();

  let lastError: Error | null = null;

  // Try different endpoints in case of timeouts or rate limits
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: query,
        // Short timeout for the fetch itself to switch mirrors quickly if one is hanging
        signal: AbortSignal.timeout(30000) 
      });

      if (response.status === 429) {
        console.warn(`Overpass Endpoint ${endpoint} rate limited, trying next...`);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`);
      }

      const data = await response.json();
      const elements: OSMElement[] = data.elements || [];

      const features: GeoJSONFeature[] = elements
        .filter(el => (el.type === 'node' && el.lat && el.lon) || (el.center))
        .map((el: OSMElement) => {
          const coords: [number, number] = el.type === 'node' 
            ? [el.lon!, el.lat!] 
            : [el.center!.lon, el.center!.lat];

          return {
            type: 'Feature',
            id: el.id,
            geometry: {
              type: 'Point',
              coordinates: coords,
            },
            properties: {
              ...el.tags,
              osm_id: el.id,
              name: el.tags?.name || 'Unbekannter Spielplatz',
              equipment: el.tags?.playground || 'Spielplatz',
            },
          };
        });

      return {
        type: 'FeatureCollection',
        features,
      };
    } catch (error) {
      console.error(`Error with Overpass endpoint ${endpoint}:`, error);
      lastError = error as Error;
      continue; // Try next endpoint
    }
  }

  console.error('All Overpass endpoints failed:', lastError);
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

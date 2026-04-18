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

export interface PlaygroundProperties extends Record<string, string | number | boolean | null | undefined> {
  name: string;
  osm_id: number;
  equipment?: string;
}

export interface GeoJSONFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: PlaygroundProperties;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.n.ro.lt/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://main.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.be/api/interpreter'
];

const QUERY_TIMEOUT = 90; // Seconds

/**
 * Generic fetcher for Overpass data with retries.
 */
async function executeOverpassQuery(query: string): Promise<GeoJSONFeatureCollection> {
  let lastError: Error | null = null;
  let attempt = 0;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    attempt++;
    try {
      console.log(`Overpass Attempt ${attempt}: Querying ${endpoint}...`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: query,
        // Short timeout per endpoint to fail-fast and try the next one
        signal: AbortSignal.timeout(15000) 
      });

      if (response.status === 429) {
        console.warn(`Overpass endpoint ${endpoint} rate limited (429).`);
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const elements: OSMElement[] = data.elements || [];

      if (elements.length === 0) {
        console.log(`Overpass endpoint ${endpoint} returned 0 elements.`);
      } else {
        console.log(`Overpass Success: Found ${elements.length} elements from ${endpoint}`);
      }

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

      return { type: 'FeatureCollection', features };
    } catch (error: any) {
      const errorMsg = error?.name === 'TimeoutError' ? 'Timeout' : error?.message || 'Unknown error';
      console.error(`Error with Overpass endpoint ${endpoint}: ${errorMsg}`);
      lastError = error as Error;
      continue;
    }
  }

  console.error('All Overpass endpoints failed or were exhausted:', lastError);
  return { type: 'FeatureCollection', features: [] };
}

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
  return executeOverpassQuery(query);
}

/**
 * Fetches playgrounds around a specific coordinate within a radius (in meters).
 */
export async function fetchPlaygroundsAround(lat: number, lon: number, radiusMeters: number = 5000): Promise<GeoJSONFeatureCollection> {
  const query = `
    [out:json][timeout:60];
    nwr["leisure"="playground"](around:${radiusMeters},${lat},${lon});
    out center;
  `.trim();
  return executeOverpassQuery(query);
}

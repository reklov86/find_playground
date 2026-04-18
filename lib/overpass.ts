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

/**
 * Fetches playgrounds from Overpass API within a bounding box.
 * @param bbox [south, west, north, east]
 */
export async function fetchPlaygrounds(bbox: [number, number, number, number]): Promise<GeoJSONFeatureCollection> {
  const [south, west, north, east] = bbox;
  
  const query = `
    [out:json][timeout:30];
    nwr["leisure"="playground"](${south},${west},${north},${east});
    out center;
  `.trim();

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });

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
    console.error('Error fetching playgrounds from Overpass:', error);
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }
}

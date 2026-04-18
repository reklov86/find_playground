"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPlaygrounds, GeoJSONFeatureCollection } from "@/lib/overpass";

/**
 * Hook to fetch playground data from Overpass API based on bounding box and zoom level.
 * @param bbox [south, west, north, east]
 * @param zoom Current map zoom level
 */
export function usePlaygrounds(bbox: [number, number, number, number] | null, zoom: number) {
  return useQuery<GeoJSONFeatureCollection>({
    queryKey: ['playgrounds', bbox],
    queryFn: async () => {
      if (!bbox) return { type: 'FeatureCollection', features: [] };
      return fetchPlaygrounds(bbox);
    },
    enabled: !!bbox && zoom >= 14, // Minimum zoom level to prevent massive API calls
    staleTime: 1000 * 60 * 5, // Cache results for 5 minutes
    placeholderData: (previousData) => previousData, // Keep old data while fetching new to prevent flickering
  });
}

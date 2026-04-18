"use client";

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import Map, { NavigationControl, ScaleControl, GeolocateControl, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

export interface MapViewHandle {
  flyTo: (longitude: number, latitude: number, zoom?: number) => void;
}

interface MapViewProps {
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(({ initialViewState }, ref) => {
  const mapRef = useRef<MapRef>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (longitude: number, latitude: number, zoom: number = 14) => {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [longitude, latitude],
          zoom,
          duration: 3000,
          essential: true,
          pitch: 45
        });
      }
    }
  }));

  const defaultViewState = {
    longitude: 10.4515, // Center of Germany
    latitude: 51.1657,
    zoom: 6,
    pitch: 45,
    bearing: 0,
    ...initialViewState
  };

  const onMapLoad = () => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    if (!map.getLayer('3d-buildings')) {
      map.addLayer({
        'id': '3d-buildings',
        'source': 'openmaptiles',
        'source-layer': 'building',
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'render_height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'render_min_height']
          ],
          'fill-extrusion-opacity': 0.6
        }
      });
    }
  };

  return (
    <div className="relative w-full h-[60vh] md:h-[80vh] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
      <Map
        ref={mapRef}
        initialViewState={defaultViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        onLoad={onMapLoad}
      >
        <GeolocateControl position="top-right" trackUserLocation={true} />
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />
      </Map>
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;

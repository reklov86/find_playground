"use client";

import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import Map, { NavigationControl, ScaleControl, GeolocateControl, MapRef, Source, Layer, Popup, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { usePlaygrounds } from '@/hooks/usePlaygrounds';
import { Navigation, Info } from 'lucide-react';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

// Custom playful slide icon SVG as a Data URI
const SLIDE_ICON_SVG = `data:image/svg+xml;base64,${btoa(`
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="18" fill="#FACC15" stroke="white" stroke-width="3"/>
  <path d="M12 12C12 12 14 16 18 16C22 16 28 28 28 28" stroke="#854D0E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M12 28V12" stroke="#854D0E" stroke-width="3" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="2" fill="#854D0E"/>
</svg>
`)}`;

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

interface PlaygroundProperties {
  name: string;
  equipment?: string;
  osm_id: number;
  [key: string]: string | number | boolean | null | undefined;
}

interface PlaygroundFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: PlaygroundProperties;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(({ initialViewState }, ref) => {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    longitude: 10.4515, // Center of Germany
    latitude: 51.1657,
    zoom: 6,
    pitch: 45,
    bearing: 0,
    ...initialViewState
  });

  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null);
  const [selectedPlayground, setSelectedPlayground] = useState<PlaygroundFeature | null>(null);

  const { data: playgrounds } = usePlaygrounds(bbox, viewState.zoom);

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

  const updateBbox = () => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      setBbox([
        bounds.getSouth(),
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast()
      ]);
    }
  };

  useEffect(() => {
    updateBbox();
  }, []);

  const onMapLoad = () => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    // Add 3D buildings layer
    if (!map.getLayer('3d-buildings')) {
      map.addLayer({
        'id': '3d-buildings',
        'source': 'openmaptiles',
        'source-layer': 'building',
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': ['get', 'render_height'],
          'fill-extrusion-base': ['get', 'render_min_height'],
          'fill-extrusion-opacity': 0.6
        }
      });
    }

    // Add slide icon image
    map.loadImage(SLIDE_ICON_SVG).then(({ data }) => {
      if (data && !map.hasImage('slide-icon')) {
        map.addImage('slide-icon', data);
      }
    }).catch(error => {
      console.error('Error loading slide icon:', error);
    });

    updateBbox();
  };

  const onMapClick = (event: MapLayerMouseEvent) => {
    const feature = event.features && event.features[0];
    if (feature) {
      setSelectedPlayground(feature as unknown as PlaygroundFeature);
    } else {
      setSelectedPlayground(null);
    }
  };

  return (
    <div className="relative w-full h-[60vh] md:h-[80vh] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onMoveEnd={updateBbox}
        onClick={onMapClick}
        interactiveLayerIds={['playground-layer']}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        onLoad={onMapLoad}
      >
        <GeolocateControl position="top-right" trackUserLocation={true} />
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {playgrounds && (
          <Source type="geojson" data={playgrounds}>
            <Layer
              id="playground-layer"
              type="symbol"
              layout={{
                'icon-image': 'slide-icon',
                'icon-size': 0.8,
                'icon-allow-overlap': true,
                'text-field': ['get', 'name'],
                'text-size': 11,
                'text-offset': [0, 1.5],
                'text-anchor': 'top',
                'text-font': ['Noto Sans Regular']
              }}
              paint={{
                'text-color': '#475569',
                'text-halo-color': '#fff',
                'text-halo-width': 2
              }}
            />
          </Source>
        )}

        {selectedPlayground && (
          <Popup
            longitude={selectedPlayground.geometry.coordinates[0]}
            latitude={selectedPlayground.geometry.coordinates[1]}
            anchor="bottom"
            onClose={() => setSelectedPlayground(null)}
            closeButton={false}
            className="z-50"
          >
            <div className="p-4 min-w-[240px] bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-yellow-100 p-2 rounded-xl">
                  <Navigation className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="font-extrabold text-slate-900 leading-snug">
                  {selectedPlayground.properties.name}
                </h3>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <Info className="w-3.5 h-3.5" />
                  <span>Ausstattung</span>
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  {selectedPlayground.properties.equipment || 'Standard-Spielplatz'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all">
                  Details
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-yellow-400 text-yellow-900 text-xs font-bold hover:bg-yellow-300 transition-all">
                  Route
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Floating Zoom Alert */}
      {viewState.zoom < 13 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-bold shadow-2xl flex items-center gap-3 border border-slate-700 backdrop-blur-md opacity-90">
          <Info className="w-5 h-5 text-yellow-400" />
          Zoome näher heran, um Spielplätze zu entdecken
        </div>
      )}
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;

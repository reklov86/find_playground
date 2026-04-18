"use client";

import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import Map, { NavigationControl, ScaleControl, GeolocateControl, MapRef, Source, Layer, Popup, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { usePlaygrounds } from '@/hooks/usePlaygrounds';
import { Navigation, Info, Bike, Car, Footprints, X, Clock, MapPin } from 'lucide-react';
import { getRoute, RoutingProfile, RouteData } from '@/lib/routing';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

// High-visibility teardrop pin with slide icon
// Use a clean, one-line base64 SVG to ensure maximum browser compatibility
const PIN_SVG_CONTENT = `
<svg width="48" height="60" viewBox="0 0 48 60" xmlns="http://www.w3.org/2000/svg">
  <path d="M24 0C10.7 0 0 10.7 0 24C0 37.3 24 60 24 60C24 60 48 37.3 48 24C48 10.7 37.3 0 24 0Z" fill="#FACC15" stroke="white" stroke-width="3"/>
  <circle cx="24" cy="24" r="16" fill="white"/>
  <path d="M16 18C16 18 18 22 22 22C26 22 32 34 32 34" stroke="#854D0E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16 34V18" stroke="#854D0E" stroke-width="3" stroke-linecap="round"/>
</svg>`.replace(/\n/g, '').trim();

const PLAYGROUND_PIN_SVG = `data:image/svg+xml;base64,${btoa(PIN_SVG_CONTENT)}`;

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
  const [route, setRoute] = useState<RouteData | null>(null);
  const [activeMode, setActiveMode] = useState<RoutingProfile>('foot-walking');
  const [isRouting, setIsRouting] = useState(false);

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

    // Add playground pin image using a Blob URL for better reliability
    try {
      const blob = new Blob([PIN_SVG_CONTENT], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      map.loadImage(url).then(({ data }) => {
        if (data && !map.hasImage('playground-pin')) {
          map.addImage('playground-pin', data, { sdf: false });
        }
        // Revoke URL after loading to free memory
        URL.revokeObjectURL(url);
      }).catch(error => {
        console.error('Error loading playground pin:', error);
        URL.revokeObjectURL(url);
      });
    } catch (e) {
      console.error('Failed to create pin blob:', e);
    }

    updateBbox();
  };

  const onMapClick = (event: MapLayerMouseEvent) => {
    const feature = event.features && event.features[0];
    if (feature) {
      setSelectedPlayground(feature as unknown as PlaygroundFeature);
    } else {
      setSelectedPlayground(null);
      // Only clear route if we click on empty map and not on routing controls
      if (!isRouting) setRoute(null);
    }
  };

  const handleFetchRoute = async (profile: RoutingProfile = activeMode) => {
    if (!selectedPlayground) return;
    
    setIsRouting(true);
    setActiveMode(profile);

    // Get current location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const start: [number, number] = [position.coords.longitude, position.coords.latitude];
        const end: [number, number] = selectedPlayground.geometry.coordinates;
        
        const routeData = await getRoute(start, end, profile);
        if (routeData) {
          setRoute(routeData);
          
          // Fly to overview of the route
          if (mapRef.current) {
            const coordinates = routeData.features[0].geometry.coordinates;
            const bounds = coordinates.reduce((acc, coord) => {
              return [
                [Math.min(acc[0][0], coord[0]), Math.min(acc[0][1], coord[1])],
                [Math.max(acc[1][0], coord[0]), Math.max(acc[1][1], coord[1])]
              ];
            }, [[coordinates[0][0], coordinates[0][1]], [coordinates[0][0], coordinates[0][1]]]);

            mapRef.current.fitBounds(bounds as [[number, number], [number, number]], {
              padding: 100,
              duration: 2000
            });
          }
        }
        setIsRouting(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsRouting(false);
        alert('Standortzugriff erforderlich für Navigation.');
      }
    );
  };

  const clearRoute = () => {
    setRoute(null);
    setSelectedPlayground(null);
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
                'icon-image': 'playground-pin',
                'icon-size': 0.6,
                'icon-anchor': 'bottom',
                'icon-allow-overlap': true,
                'text-field': ['get', 'name'],
                'text-size': 11,
                'text-offset': [0, 0.5],
                'text-anchor': 'top',
                'text-font': ['Noto Sans Regular']
              }}
              paint={{
                'text-color': '#1e293b',
                'text-halo-color': '#fff',
                'text-halo-width': 2
              }}
            />
          </Source>
        )}

        {route && (
          <Source type="geojson" data={route}>
            <Layer
              id="route-layer-glow"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#FACC15',
                'line-width': 8,
                'line-opacity': 0.4
              }}
            />
            <Layer
              id="route-layer"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#3b82f6',
                'line-width': 4
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
              
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Info className="w-3 h-3" />
                  <span>Ausstattung</span>
                </div>
                <p className="text-xs text-slate-600 font-medium bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {selectedPlayground.properties.equipment || 'Standard-Spielplatz'}
                </p>
                
                {route && (
                  <div className="flex items-center gap-4 py-2 px-3 bg-blue-50 rounded-2xl border border-blue-100 text-blue-700">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">
                        {Math.round(route.features[0].properties.summary.duration / 60)} min
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">
                        {(route.features[0].properties.summary.distance / 1000).toFixed(1)} km
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {[
                    { mode: 'foot-walking' as const, icon: Footprints },
                    { mode: 'cycling-regular' as const, icon: Bike },
                    { mode: 'driving-car' as const, icon: Car },
                  ].map(({ mode, icon: Icon }) => (
                    <button
                      key={mode}
                      onClick={() => handleFetchRoute(mode)}
                      className={`flex-1 flex items-center justify-center py-2 rounded-xl transition-all ${
                        activeMode === mode && route
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={clearRoute}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 text-[11px] font-bold hover:bg-slate-50 transition-all"
                  >
                    Schließen
                  </button>
                  <button 
                    onClick={() => !route && handleFetchRoute()}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[11px] font-bold transition-all ${
                      route 
                        ? 'bg-green-500 text-white cursor-default' 
                        : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300'
                    }`}
                  >
                    {isRouting ? (
                      <div className="w-4 h-4 border-2 border-yellow-900/20 border-t-yellow-900 rounded-full animate-spin" />
                    ) : route ? (
                      'Bereit!'
                    ) : (
                      'Route planen'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Floating Zoom Alert */}
      {viewState.zoom < 14 && (
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

"use client";

import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import Map, { NavigationControl, ScaleControl, GeolocateControl, MapRef, Source, Layer, Popup, MapLayerMouseEvent, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { usePlaygrounds } from '@/hooks/usePlaygrounds';
import { Navigation, Info, Bike, Car, Footprints, X, Clock, MapPin, ChevronRight, List, Map as MapIcon } from 'lucide-react';
import { getRoute, RoutingProfile, RouteData } from '@/lib/routing';
import { GeoJSONFeature } from '@/lib/overpass';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';

// High-visibility teardrop pin with slide icon
const PIN_SVG = `<svg width="48" height="60" viewBox="0 0 48 60" xmlns="http://www.w3.org/2000/svg"><path d="M24 0C10.7 0 0 10.7 0 24C0 37.3 24 60 24 60C24 60 48 37.3 48 24C48 10.7 37.3 0 24 0Z" fill="#FACC15" stroke="white" stroke-width="3"/><circle cx="24" cy="24" r="16" fill="white"/><path d="M16 18C16 18 18 22 22 22C26 22 32 34 32 34" stroke="#854D0E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 34V18" stroke="#854D0E" stroke-width="3" stroke-linecap="round"/></svg>`;

export interface MapViewHandle {
  flyTo: (longitude: number, latitude: number, zoom?: number) => void;
  calculateRoute: (playground: GeoJSONFeature, profile?: RoutingProfile) => void;
}

interface MapViewProps {
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  };
  playgrounds?: GeoJSONFeature[];
  onBboxChange?: (bbox: [number, number, number, number]) => void;
  onViewStateChange?: (viewState: any) => void;
  userLocation?: { lat: number; lon: number } | null;
}

const MapView = forwardRef<MapViewHandle, MapViewProps>(({ initialViewState, playgrounds: externalPlaygrounds, onBboxChange, onViewStateChange, userLocation }, ref) => {
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
  const [selectedPlayground, setSelectedPlayground] = useState<GeoJSONFeature | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [activeMode, setActiveMode] = useState<RoutingProfile>('foot-walking');
  const [isRouting, setIsRouting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // If no external data is provided, use own query (fallback)
  const { data: internalPlaygrounds } = usePlaygrounds(bbox, viewState.zoom);
  const playgrounds = externalPlaygrounds || internalPlaygrounds?.features || [];

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
    },
    calculateRoute: (playground: GeoJSONFeature, profile?: RoutingProfile) => {
      setSelectedPlayground(playground);
      // Wait for state to be ready to fetch
      setTimeout(() => {
        handleFetchRoute(profile || activeMode, playground);
      }, 0);
    }
  }));

  const updateBbox = () => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      const newBbox: [number, number, number, number] = [
        bounds.getSouth(),
        bounds.getWest(),
        bounds.getNorth(),
        bounds.getEast()
      ];
      setBbox(newBbox);
      if (onBboxChange) onBboxChange(newBbox);
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

    // Add playground pin image using direct Image loading (more robust than loadImage for SVGs)
    if (!map.hasImage('playground-pin')) {
      const img = new Image();
      img.onload = () => {
        if (!map.hasImage('playground-pin')) {
          map.addImage('playground-pin', img, { sdf: false });
        }
      };
      img.onerror = (err) => {
        console.error('Error rendering playground pin:', err);
      };
      // Use clean base64 to avoid any server/URL resolution issues
      img.src = 'data:image/svg+xml;base64,' + btoa(PIN_SVG);
    }

    updateBbox();
  };

  const onMapClick = (event: MapLayerMouseEvent) => {
    const feature = event.features && event.features[0];
    if (feature) {
      setSelectedPlayground(feature as unknown as GeoJSONFeature);
    } else {
      setSelectedPlayground(null);
      // Only clear route if we click on empty map and not on routing controls
      if (!isRouting) setRoute(null);
    }
  };

  const handleFetchRoute = async (profile: RoutingProfile = activeMode, targetPlayground?: GeoJSONFeature) => {
    const playground = targetPlayground || selectedPlayground;
    if (!playground) return;
    
    setIsRouting(true);
    setActiveMode(profile);

    // Get current location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const start: [number, number] = [position.coords.longitude, position.coords.latitude];
        const end: [number, number] = playground.geometry.coordinates;
        
        const routeData = await getRoute(start, end, profile);
        if (routeData) {
          setRoute(routeData);
          setShowInstructions(true);
          
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
          setRoutingError(null);
        } else {
          setRoutingError('Route konnte nicht berechnet werden.');
        }
        setIsRouting(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setRoutingError('Standortzugriff erforderlich.');
        setIsRouting(false);
      }
    );
  };

  const clearRoute = () => {
    setRoute(null);
    setSelectedPlayground(null);
    setShowInstructions(false);
    setRoutingError(null);
  };

  return (
    <div className="relative w-full h-[60vh] md:h-[80vh] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => {
          setViewState(evt.viewState);
          if (onViewStateChange) onViewStateChange(evt.viewState);
        }}
        onMoveEnd={updateBbox}
        onClick={onMapClick}
        interactiveLayerIds={['playground-layer']}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        onLoad={onMapLoad}
      >
        <GeolocateControl 
          position="top-right" 
          trackUserLocation={true} 
          fitBoundsOptions={{ zoom: viewState.zoom }} 
        />
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />
        
        {/* User Location Blue Pulse Dot */}
        {userLocation && (
          <Marker 
            longitude={userLocation.lon} 
            latitude={userLocation.lat} 
            anchor="center"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping" />
              <div className="relative w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg shadow-blue-200" />
            </div>
          </Marker>
        )}

        {playgrounds && playgrounds.length > 0 && (
          <Source type="geojson" data={{ type: 'FeatureCollection', features: playgrounds }}>
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

        {/* Improved Route Layer handling */}
        {route && route.features?.length > 0 && route.features[0].geometry && (
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
                      className={`flex-1 flex items-center justify-center py-2.5 rounded-xl transition-all ${
                        activeMode === mode
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
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
      
      {/* Route Instructions Sidebar */}
      {route && showInstructions && (
        <div className="absolute top-4 left-4 z-20 w-80 max-h-[calc(100%-2rem)] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 overflow-hidden flex flex-col pointer-events-auto">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Wegbeschreibung</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-tight">
                  {(route.features[0].properties.summary.distance / 1000).toFixed(1)} km
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  {Math.round(route.features[0].properties.summary.duration / 60)} min
                </span>
              </div>
            </div>
            <button 
              onClick={() => setShowInstructions(false)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {route?.features?.[0]?.properties?.segments?.[0]?.steps ? (
              route.features[0].properties.segments[0].steps.map((step, idx) => (
                <div 
                  key={idx} 
                  className="group flex gap-3 p-3 rounded-2xl hover:bg-yellow-50/50 transition-colors border border-transparent hover:border-yellow-100"
                >
                  <div className="mt-0.5 w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-yellow-100 group-hover:text-yellow-600 transition-colors">
                    <span className="text-[10px] font-black">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-700 leading-snug mb-1">
                      {step.instruction}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <span>{step.distance >= 1000 ? `${(step.distance/1000).toFixed(1)} km` : `${Math.round(step.distance)} m`}</span>
                      {step.name && step.name !== '-' && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-200" />
                          <span className="text-slate-500">{step.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-xs font-bold text-slate-400">Keine detaillierten Anweisungen verfügbar.</p>
              </div>
            )}
            
            <div className="pt-4 flex items-center justify-center gap-2">
              <div className="w-10 h-1 rounded-full bg-slate-100" />
              <MapPin className="w-4 h-4 text-yellow-500" />
              <div className="w-10 h-1 rounded-full bg-slate-100" />
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100">
            <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest">
              Ziel: {selectedPlayground?.properties.name}
            </p>
          </div>
        </div>
      )}

      {/* Show Instructions Toggle (when hidden but route active) */}
      {route && !showInstructions && (
        <button
          onClick={() => setShowInstructions(true)}
          className="absolute top-4 left-4 z-20 px-4 py-2.5 bg-yellow-400 text-yellow-900 rounded-2xl shadow-xl border-2 border-white hover:bg-yellow-300 transition-all flex items-center gap-2 font-bold text-xs"
        >
          <List className="w-4 h-4" />
          Liste anzeigen
        </button>
      )}

      {/* Floating Zoom Alert */}
      {viewState.zoom < 14 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-bold shadow-2xl flex items-center gap-3 border border-slate-700 backdrop-blur-md opacity-90">
          <Info className="w-5 h-5 text-yellow-400" />
          Zoome näher heran, um Spielplätze zu entdecken
        </div>
      )}

      {/* Routing Error Toast */}
      {routingError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-3xl bg-red-500 text-white text-sm font-bold shadow-2xl flex items-center gap-3 border-2 border-white animate-bounce">
          <Info className="w-5 h-5 text-white" />
          {routingError}
          <button onClick={() => setRoutingError(null)} className="ml-2 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
});

MapView.displayName = 'MapView';

export default MapView;

import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [selectedPlayground, setSelectedPlayground] = useState(null);
    const [loading, setLoading] = useState(false);
    const [userLocation, setUserLocation] = useState(null);

    useEffect(() => {
        // Initialize Map
        if (!mapInstance.current) {
            mapInstance.current = new maplibregl.Map({
                container: 'map',
                style: 'https://demotiles.maplibre.org/style.json', // Basic style
                center: [10.4515, 51.1657], // Center of Germany
                zoom: 6
            });

            mapInstance.current.on('load', () => {
                console.log('Map Loaded');
                // Try to get user location
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const { longitude, latitude } = pos.coords;
                        setUserLocation([longitude, latitude]);
                        mapInstance.current.flyTo({
                            center: [longitude, latitude],
                            zoom: 14,
                            essential: true
                        });

                        // Add marker for user
                        new maplibregl.Marker({ color: '#4A90E2' })
                            .setLngLat([longitude, latitude])
                            .addTo(mapInstance.current);

                        // Fetch playgrounds near user
                        fetchPlaygrounds(latitude, longitude);
                    },
                    (err) => console.error('Location Error', err)
                );
            });
        }

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, []);

    const [directions, setDirections] = useState(null);
    const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6Ijk5MGYwYTYyYjY2MjRiNzJhOTE1ZjM4ZDkwODA4NmJjIiwiaCI6Im11cm11cjY0In0=';

    const fetchPlaygrounds = async (lat, lng) => {
        setLoading(true);
        // Clean existing markers if needed
        const radius = 5000;
        const query = `[out:json];(node["leisure"="playground"](around:${radius},${lat},${lng}););out center;`;

        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query
            });
            const data = await response.json();

            data.elements.forEach(element => {
                const lngLat = element.center ? [element.center.lon, element.center.lat] : [element.lon, element.lat];
                const el = document.createElement('div');
                el.className = 'marker-container';
                el.innerHTML = '<div class="marker-icon"><i data-lucide="map-pin"></i></div>';

                new maplibregl.Marker({ element: el })
                    .setLngLat(lngLat)
                    .addTo(mapInstance.current);

                el.addEventListener('click', () => {
                    setSelectedPlayground({
                        ...element.tags,
                        id: element.id,
                        lat: lngLat[1],
                        lng: lngLat[0]
                    });
                    setDirections(null); // Reset directions when new one selected
                });
            });
            if (window.lucide) window.lucide.createIcons();
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const getDirections = async (mode) => {
        if (!selectedPlayground || !userLocation) return;
        setLoading(true);

        const profile = mode === 'walk' ? 'foot-walking' : mode === 'bike' ? 'cycling-regular' : 'driving-car';
        const start = `${userLocation[0]},${userLocation[1]}`;
        const end = `${selectedPlayground.lng},${selectedPlayground.lat}`;

        try {
            const response = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}?api_key=${ORS_API_KEY}&start=${start}&end=${end}`);
            if (!response.ok) throw new Error('ORS API Error - Key might be missing');
            const data = await response.json();

            const coords = data.features[0].geometry.coordinates;
            const steps = data.features[0].properties.segments[0].steps;

            setDirections(steps);

            // Draw on map
            if (mapInstance.current.getSource('route')) {
                mapInstance.current.getSource('route').setData(data.features[0].geometry);
            } else {
                mapInstance.current.addSource('route', {
                    'type': 'geojson',
                    'data': data.features[0].geometry
                });
                mapInstance.current.addLayer({
                    'id': 'route',
                    'type': 'line',
                    'source': 'route',
                    'layout': { 'line-join': 'round', 'line-cap': 'round' },
                    'paint': { 'line-color': '#4A90E2', 'line-width': 6, 'line-opacity': 0.8 }
                });
            }

            // Fit bounds
            const bounds = coords.reduce((acc, coord) => acc.extend(coord), new maplibregl.LngLatBounds(coords[0], coords[0]));
            mapInstance.current.fitBounds(bounds, { padding: 50 });

        } catch (err) {
            console.error('Directions Error:', err);
            alert('To enable turn-by-turn directions, please add your OpenRouteService API key to app.js. Falling back to Google Maps.');
            const googleMode = mode === 'car' ? 'driving' : mode === 'bike' ? 'bicycling' : 'walking';
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedPlayground.lat},${selectedPlayground.lng}&travelmode=${googleMode}`, '_blank');
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (mode) => {
        if (mode === 'pt') {
            const dest = `${selectedPlayground.lat},${selectedPlayground.lng}`;
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=transit`, '_blank');
        } else {
            getDirections(mode);
        }
    };

    return (
        <div className="app-container">
            <header className="header">
                <div className="logo">Spielplatz <span>Entdecker</span></div>
                <div className="user-menu"><i data-lucide="user"></i></div>
            </header>

            <div id="map"></div>

            <div className="fab-container">
                <button className="fab secondary" onClick={() => userLocation && mapInstance.current.flyTo({ center: userLocation, zoom: 16 })}>
                    <i data-lucide="crosshair"></i>
                </button>
                <button className="fab" onClick={() => userLocation && fetchPlaygrounds(userLocation[1], userLocation[0])}>
                    <i data-lucide="refresh-cw"></i>
                </button>
            </div>

            <div className={`playground-drawer ${selectedPlayground ? 'open' : ''}`}>
                <div className="drawer-handle" onClick={() => setSelectedPlayground(null)}></div>
                {selectedPlayground && (
                    <div className="drawer-content">
                        <h2 className="playground-title">{selectedPlayground.name || 'Spielplatz'}</h2>
                        <div className="playground-tags">
                            {selectedPlayground.surface && <span className="tag">{selectedPlayground.surface}</span>}
                            <span className="tag">Public</span>
                        </div>

                        {directions ? (
                            <div className="directions-list mt-4">
                                <h3 className="mb-2">Directions</h3>
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {directions.map((step, i) => (
                                        <div key={i} className="direction-step mb-2" style={{ borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                                            {i + 1}. {step.instruction} ({Math.round(step.distance)}m)
                                        </div>
                                    ))}
                                </div>
                                <button className="btn btn-secondary mt-2" style={{ width: '100%' }} onClick={() => setDirections(null)}>Clear Route</button>
                            </div>
                        ) : (
                            <>
                                <div className="playground-info">
                                    <p className="mb-2"><strong>Equipment:</strong> {selectedPlayground.playground || 'Swings, Slide, Sandbox'}</p>
                                    <p className="text-light">Perfect spot for a family break!</p>
                                </div>

                                <div className="btn-group">
                                    <button className="btn btn-secondary" onClick={() => handleNavigate('walk')}><i data-lucide="footprints"></i> Walk</button>
                                    <button className="btn btn-secondary" onClick={() => handleNavigate('bike')}><i data-lucide="bike"></i> Bike</button>
                                    <button className="btn btn-secondary" onClick={() => handleNavigate('car')}><i data-lucide="car"></i> Car</button>
                                    <button className="btn btn-primary" onClick={() => handleNavigate('pt')}><i data-lucide="bus"></i> Transit</button>
                                </div>
                                <div className="mt-4">
                                    <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => alert('Supabase Photo Upload Integration - Coming Soon!')}>
                                        <i data-lucide="camera"></i> Upload Photo
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

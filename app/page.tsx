"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import MapView, { MapViewHandle } from "@/components/MapView";
import AuthModal from "@/components/AuthModal";
import { Search, MapPin, Navigation, Camera, LogIn, LogOut, User as UserIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import ListView from "@/components/ListView";
import { usePlaygrounds } from "@/hooks/usePlaygrounds";

export default function Home() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(6);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  
  const mapRef = useRef<MapViewHandle>(null);

  const { data: playgroundsData } = usePlaygrounds(bbox, zoom);
  const playgrounds = playgroundsData?.features || [];

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Detect user location for sorting and initial map focus
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserLocation({ lat, lon });
          
          // Automatically focus map on actual location with ~400m zoom (15.5)
          // Use a small delay to ensure MapView is initialized
          setTimeout(() => {
            mapRef.current?.flyTo(lon, lat, 15.5);
          }, 500);
        },
        (error) => console.warn('Geolocation error:', error),
        { enableHighAccuracy: true }
      );
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&countrycodes=de`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lon, lat } = data[0];
        const longitude = parseFloat(lon);
        const latitude = parseFloat(lat);
        
        // Ensure we switch to map view to show the result
        setViewMode('map');
        
        // Wait a small bit for the map to mount if we were in list mode
        setTimeout(() => {
          mapRef.current?.flyTo(longitude, latitude, 15);
        }, 100);
      } else {
        alert("Ort nicht gefunden. Bitte versuche es mit einer genaueren Angabe.");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("Suche fehlgeschlagen. Bitte versuche es später erneut.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlayground = (playground: any) => {
    setViewMode('map');
    setTimeout(() => {
      mapRef.current?.flyTo(
        playground.geometry.coordinates[0],
        playground.geometry.coordinates[1],
        16
      );
    }, 100);
  };

  const handleRoutePlayground = (playground: any) => {
    setViewMode('map');
    // Wait for map to mount and calculate route
    setTimeout(() => {
      mapRef.current?.calculateRoute(playground);
    }, 100);
  };

  const handleSwitchToMap = () => {
    setZoom(14);
    setViewMode('map');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-white/70 backdrop-blur-xl border-b border-white/20">
        <div className="flex items-center gap-2">
          <div className="bg-yellow-400 p-2 rounded-2xl shadow-lg shadow-yellow-200">
            <MapPin className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-800">
            Spielplatz <span className="text-yellow-500">Entdecker</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-900 leading-none mb-1">
                  {user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Entdecker Profil
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 border-2 border-white shadow-md">
                <UserIcon className="w-5 h-5" />
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all border border-red-100"
                title="Abmelden"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <LogIn className="w-5 h-5" />
              Anmelden
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 pt-24 pb-12 px-6 max-w-7xl mx-auto w-full tracking-tight">
        {/* Hero Section */}
        <section className="grid lg:grid-cols-2 gap-12 items-center mb-20 mt-8">
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-[1.1] text-slate-900">
              Finde den <span className="text-yellow-500">nächsten</span> Abenteuerplatz.
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-lg leading-relaxed font-medium">
              Entdecke die besten Spielplätze in ganz Deutschland mit 3D-Karten, 
              Wegbeschreibungen und Community-Fotos.
            </p>
            
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-yellow-500 transition-colors" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ort oder Straße suchen..." 
                  className="w-full pl-12 pr-6 py-5 rounded-3xl bg-white border-4 border-slate-50 focus:border-yellow-200 outline-none shadow-xl transition-all text-lg font-semibold"
                />
              </div>
              <button 
                type="submit"
                disabled={isSearching}
                className="px-8 py-5 rounded-3xl bg-yellow-400 text-yellow-900 font-extrabold text-lg hover:bg-yellow-300 transition-all shadow-xl shadow-yellow-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-6 h-6 animate-spin text-yellow-900" /> : <Navigation className="w-6 h-6" />}
                Los geht&apos;s
              </button>
            </form>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative h-[400px] md:h-[500px] w-full rounded-[3.5rem] overflow-hidden shadow-2xl border-[12px] border-white">
              <Image 
                src="/find_playground/playground-hero.png" 
                alt="Playground Hero" 
                fill 
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            
            {/* Floating Stats */}
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl border border-slate-50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-800 leading-none">12k+</div>
                <div className="text-xs text-slate-400 font-bold tracking-widest mt-1">FOTOS</div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Map Section */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-1">Entdecke in deiner Nähe</h2>
              <p className="text-slate-500 font-bold tracking-wide uppercase">Interaktive 3D Karte & Liste</p>
            </div>
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
              <button 
                onClick={() => setViewMode('list')}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
                }`}
              >
                Liste
              </button>
              <button 
                onClick={handleSwitchToMap}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                  viewMode === 'map' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
                }`}
              >
                Karte
              </button>
            </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            key={viewMode}
            transition={{ duration: 0.5 }}
          >
            {viewMode === 'map' ? (
              <MapView 
                ref={mapRef} 
                playgrounds={playgrounds}
                onBboxChange={setBbox}
                onViewStateChange={(vs) => setZoom(vs.zoom)}
              />
            ) : (
              <ListView 
                playgrounds={playgrounds}
                userLocation={userLocation}
                onSelect={handleSelectPlayground}
                onRoute={handleRoutePlayground}
              />
            )}
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-6 mt-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-yellow-400 p-1.5 rounded-xl">
                <MapPin className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold text-white">Spielplatz Entdecker</span>
            </div>
            <p className="text-slate-500 leading-relaxed max-w-xs font-medium">
              Deutschlands größtes Portal für Familien-Abenteuer. Finden, bewerten und teilen.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest">App</h4>
              <ul className="space-y-2 text-sm font-semibold">
                <li><a href="#" className="hover:text-yellow-500 transition-colors">Karten</a></li>
                <li><a href="#" className="hover:text-yellow-500 transition-colors">Suche</a></li>
                <li><a href="#" className="hover:text-yellow-500 transition-colors">Favoriten</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest">Rechtliches</h4>
              <ul className="space-y-2 text-sm font-semibold">
                <li><a href="#" className="hover:text-yellow-500 transition-colors">Impressum</a></li>
                <li><a href="#" className="hover:text-yellow-500 transition-colors">Datenschutz</a></li>
              </ul>
            </div>
          </div>
          <div className="text-sm">
            <h4 className="text-white font-bold mb-6 uppercase text-xs tracking-widest">Vernetzen</h4>
            <p className="text-slate-500 font-medium">Folge uns für die neuesten Entdeckungen.</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-slate-800 mt-12 pt-8 text-center text-xs font-bold tracking-widest uppercase">
          © 2026 reklov86. Made for kids and families.
        </div>
      </footer>
    </div>
  );
}

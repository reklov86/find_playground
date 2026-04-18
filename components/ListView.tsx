"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Info, Clock, ChevronRight } from 'lucide-react';
import { getHaversineDistance, formatDistance } from '@/lib/geo';
import { GeoJSONFeature } from '@/lib/overpass';

interface ListViewProps {
  playgrounds: GeoJSONFeature[];
  userLocation: { lat: number; lon: number } | null;
  onSelect: (playground: GeoJSONFeature) => void;
  onRoute: (playground: GeoJSONFeature) => void;
}

const ListView: React.FC<ListViewProps> = ({ playgrounds, userLocation, onSelect, onRoute }) => {
  const closestPlaygrounds = useMemo(() => {
    if (!userLocation) return playgrounds.slice(0, 10);

    const withDistance = playgrounds.map(p => {
      const distance = getHaversineDistance(
        userLocation.lat,
        userLocation.lon,
        p.geometry.coordinates[1],
        p.geometry.coordinates[0]
      );
      return { ...p, distance };
    });

    return withDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);
  }, [playgrounds, userLocation]);

  if (playgrounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <MapPin className="w-12 h-12 mb-4 opacity-20" />
        <p className="font-bold">Keine Spielplätze in der Nähe gefunden</p>
        <p className="text-sm">Zoome heraus oder suche an einem anderen Ort</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">
          Die 10 nächsten Abenteuer
        </h3>
        {userLocation && (
          <span className="text-[10px] font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200 uppercase tracking-tighter">
            Sortiert nach Distanz
          </span>
        )}
      </div>

      <div className="grid gap-4">
        {closestPlaygrounds.map((playground, index) => {
          const distance = 'distance' in playground ? (playground as any).distance : null;
          
          return (
            <motion.div
              key={playground.properties.osm_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-white rounded-[2rem] p-5 shadow-xl shadow-slate-200/50 border border-slate-50 hover:border-yellow-200 transition-all cursor-pointer relative overflow-hidden"
              onClick={() => onSelect(playground)}
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center text-yellow-900 shadow-lg shadow-yellow-100">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-extrabold text-slate-900 leading-tight mb-1 group-hover:text-yellow-600 transition-colors">
                      {playground.properties.name}
                    </h4>
                    <p className="text-sm text-slate-500 font-medium">
                      {playground.properties.equipment || 'Standard-Spielplatz'}
                    </p>
                  </div>
                </div>
                
                {distance !== null && (
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      {formatDistance(distance)}
                    </span>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Distanz
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRoute(playground);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  <Navigation className="w-4 h-4" />
                  Route planen
                </button>
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-yellow-50 group-hover:text-yellow-600 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>

              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ListView;

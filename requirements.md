# Project Requirements: Playground Finder (Germany)

## 1. Vision & Purpose
A vibrant, mobile-first web application designed to help families in Germany find the nearest playgrounds and navigate to them using various transport modes.

## 2. Core Functional Requirements
*   **Data Source**: Use OpenStreetMap (OSM) via the Overpass API for real-time playground data.
*   **Geographic Scope**: Optimized for use within Germany.
*   **Location Discovery**:
    *   **Automatic Detection**: Real-time high-accuracy GPS detection with a robust fallback for coarse locations.
    *   **Manual Search**: Integrated search bar for finding locations by city name, street, or landmark (via Nominatim API).
*   **Navigation & Routing**:
    *   Support **Walking**, **Cycling**, and **Driving** with visual turn-by-turn directions directly on the map.
    *   Support **Public Transport (PT)** via deep-linking to Google Maps (to leverage accurate German transit data).
*   **Playground Details**: Display equipment types, age suitability, and community-uploaded photos in a horizontal gallery.

## 3. User Interaction & Community
*   **Accounts**: User authentication via Supabase (Login/Signup).
*   **User Contributions**: Allow authenticated users to upload photos of playgrounds directly from their device.
*   **Privacy**: Maximize user privacy; ONLY access location data when the application is active and in use.

## 4. Design & User Experience
*   **Platform**: Standard "No-Build" Multi-file Web Architecture (HTML, CSS, and separate JS).
*   **Aesthetic**: "Premium and Playful" – Vibrant colors, glassmorphism, and rounded bubbly UI elements.
*   **Map Experience**: 
    *   3D building extrusions for immersive navigation (zoom 15+).
    *   Detailed street names and labels in German.
    *   45-degree tilted camera for a dynamic perspective.
*   **Mobile-First**: Optimized for small screens and touch interactions.

## 5. Technology Stack
*   **Frontend**: React (18.x) + Vanilla CSS.
*   **Core Logic**: Separate `app.js` loaded via Babel Standalone.
*   **Map Engine**: MapLibre GL JS (Vector-based) using OpenFreeMap tiles.
*   **Backend/Storage**: Supabase (Auth, Storage & Database).
*   **APIs**: OpenRouteService (Routing), Overpass (Discovery), Nominatim (Search).

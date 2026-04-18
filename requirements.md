# Project Requirements: Playground Finder (Germany)

## 1. Vision & Purpose
A vibrant, mobile-first web application designed to help families in Germany find the nearest playgrounds and navigate to them using various transport modes.

## 2. Core Functional Requirements
*   **Data Source**: Use OpenStreetMap (OSM) via the Overpass API for real-time playground data.
*   **Geographic Scope**: Optimized for use within Germany.
*   **Navigation & Routing**:
    *   Support **Walking**, **Cycling**, and **Driving** with visual turn-by-turn directions directly on the map.
    *   Support **Public Transport (PT)** via deep-linking to Google Maps (to leverage accurate German transit data).
    *   Implement **Automatic Rerouting** based on the user's real-time GPS position.
*   **Playground Details**: Display the following information for each spot:
    *   Equipment types (Swings, slides, etc.)
    *   Age suitability and amenities (extracted from OSM tags).
*   **Community Gallery**: Display community-uploaded photos in a horizontal gallery for each playground.

## 3. User Interaction & Community
*   **Accounts**: User authentication via Supabase (Login/Signup).
*   **User Contributions**: Allow authenticated users to upload photos of playgrounds directly from their device.
*   **Privacy**: Maximize user privacy; ONLY access location data when the application is active and in use.

## 4. Design & User Experience
*   **Platform**: Standard "No-Build" Web Page (single HTML file + CSS).
*   **Aesthetic**: "Premium and Playful" – Vibrant colors, rounded bubbly UI elements, and a high-quality interactive map experience.
*   **Map Experience**: 
    *   3D building extrusions for immersive navigation.
    *   Detailed street names and landmarks in German.
    *   45-degree tilted camera for a dynamic perspective.
*   **Mobile-First**: Optimized for small screens and touch interactions.

## 5. Technology Stack
*   **Frontend**: React (18.x) + Vanilla CSS.
*   **Transpiler**: Babel Standalone (runtime JSX compilation).
*   **Map Engine**: MapLibre GL JS (Vector-based) using OpenFreeMap tiles.
*   **Backend/Storage**: Supabase (Auth, Storage & Database).
*   **Routing**: OpenRouteService (Walk/Bike/Car).

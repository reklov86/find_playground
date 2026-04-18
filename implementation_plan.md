# Implementation Plan: Playground Finder (Germany)

This document outlines the final technical architecture and implementation strategy for the "Spielplatz Entdecker" application.

## 1. Architectural Strategy
To ensure maximum portability and ease of testing without a local development environment (Node/NPM), the project uses a **"No-Build" runtime architecture**. 

### Key Characteristics:
*   **Runtime Transpilation**: Babel Standalone evaluates and compiles JSX code directly in the user's browser at runtime.
*   **External Dependencies**: All libraries (React, MapLibre, Supabase, Lucide) are loaded via high-availability CDNs.
*   **Self-Contained Logic**: To bypass browser security restrictions on the `file://` protocol, all application logic is inlined into `index.html`.

## 2. Technology Stack
*   **React (18.x)**: UI logic and state management.
*   **MapLibre GL JS**: Map rendering utilizing OpenMapTiles schema.
*   **Supabase JS SDK**: Integration with Auth, Storage, and PostgreSQL database.
*   **OpenRouteService API**: Multimodal routing (Walking, Cycling, Driving).

## 3. Implementation Details

### Map & Visualization
*   **Provider**: OpenFreeMap (Bright Style).
*   **3D Layer**: Implemented using `fill-extrusion` layers triggered at zoom level 15+.
*   **Orientation**: Default 45-degree pitch for a modern perspective view.

### Navigation Layer
*   **Visual Routing**: The app queries OpenRouteService and projects a GeoJSON LineString onto the map.
*   **Direction Steps**: Instructions are parsed and displayed in a scrollable list within the playground drawer.
*   **Transit Fallback**: Deep-linking to Google Maps ensures users receive accurate real-time transit data which is notoriously difficult to consolidate from static OSM data.

### Community & Data Persistence
*   **Authentication**: Implemented via Supabase GoTrue (Email/Password).
*   **Object Storage**: Playground photos are stored in a public bucket named `playground-photos`.
*   **Relational Data**: A `playground_photos` table maps OSM IDs to Supabase Storage URLs.

## 4. Final Setup & Deployment Config
*   **CORS authorized domains**: When deploying to GitHub Pages or Netlify, the domain must be added to the Supabase and OpenRouteService dashboard allow-lists.
*   **API Resilience**: The code includes a "fallback to Google Maps" logic if the custom routing key is missing or fails.

## 5. Deployment Guide
1. Create a GitHub Repository.
2. Commit all files (`index.html`, `style.css`, `requirements.md`, `implementation_plan.md`, `README.md`).
3. Enable **GitHub Pages** in project settings.

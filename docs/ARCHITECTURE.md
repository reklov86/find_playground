# Architecture Overview: Spielplatz Entdecker

This document outlines the technical architecture and deployment strategy for the Playground Finder application.

## 1. Frontend Architecture

The application is built using **Next.js 15** with the **App Router**, ensuring high performance through optimized rendering and static generation.

### Key Components:
- **`app/`**: Contains the page layouts and the main application logic using React Server/Client Components.
- **`components/`**: Modular, reusable UI components (Map view, search results, etc.).
- **`lib/`**: Shared utilities, including the Supabase client and formatting helpers.
- **`Providers.tsx`**: Client-side context providers (React Query for data fetching).

## 2. Geospatial Stack

The core of the application is a high-performance vector-based map engine.

- **Map Engine**: [MapLibre GL JS](https://maplibre.org/) handles the rendering of vector tiles and 3D layers.
- **Map Styles**: Hosted by **OpenFreeMap** (Bright Style), optimized for legibility and speed.
- **Data Layers**: 
    - **Overpass API**: Real-time querying of OSM playground data.
    - **OpenRouteService**: Computes multimodal routing as GeoJSON LineStrings.
    - **Nominatim**: Provides forward geocoding for the global search bar.

## 3. Backend & Data Management

The application utilizes a Serverless approach with **Supabase**.

- **Authentication**: Managed via Supabase GoTrue (supporting future extensions like OAuth).
- **Database**: PostgreSQL with PostGIS for potential spatial data persistence.
- **Storage**: Object storage for community-uploaded playground photos.
- **State Management**: **TanStack Query** handles the caching and synchronization of remote geospatial data, significantly reducing API latency.

## 4. Deployment Pipeline

The application is hosted on **GitHub Pages** using a modern CI/CD approach.

1. **Static Export**: Next.js is configured in `next.config.ts` to generate an `/out` directory with the full static build (`output: 'export'`).
2. **GitHub Actions**: An automated workflow (`deploy.yml`) handles:
    - Node environment setup.
    - dependency installation.
    - Production build.
    - Deployment of the `/out` directory to the `gh-pages` internal branch.
3. **Asset Handling**: All assets and links are correctly resolved using the `basePath` configuration (`/find_playground`).

## 5. Security Note

- All API keys intended for client-side use are prefixed with `NEXT_PUBLIC_`.
- Sensitive local configurations are stored in `.env.local`, which is excluded from version control via `.gitignore`.

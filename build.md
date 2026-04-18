# Build and Deployment Guide

This document describes how to build the "Spielplatz Entdecker" application and its configuration for deployment on GitHub Pages.

## Prerequisites

-   **Node.js**: Version 18.x or higher.
-   **npm**: Version 9.x or higher.

## Installation

```bash
npm install
```

## Local Development

To run the application locally with a hot-reloading development server:

```bash
npm run dev
```
The app will be available at `http://localhost:3000/find_playground` (due to the `basePath` configuration).

## Environment Variables

For the application to function correctly, ensure the following environment variables are set in your deployment environment or a `.env.local` file:

-   `NEXT_PUBLIC_ORS_API_KEY`: API Key for OpenRouteService (Navigation).
-   `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (Authentication).
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key (Authentication).

## Production Build

The project is configured for **Static Site Generation (SSG)**, allowing it to be hosted on services like GitHub Pages.

```bash
npm run build
```

This command generates a static version of the site in the `out/` directory.

### Build Configuration (`next.config.ts`)

-   **`output: "export"`**: Enables static export mode.
-   **`basePath: "/find_playground"`**: Configures the application to run under a subpath, which is required for GitHub Pages project repositories (`https://<user>.github.io/find_playground/`).
-   **`images.unoptimized: true`**: Next.js Image Optimization is disabled as it requires a server-side runtime not available on standard static hosts like GitHub Pages.

## GitHub Pages Deployment

### 1. Manual Deployment (via `gh-pages`)

You can use the `gh-pages` package to deploy the contents of the `out/` folder:

1.  Install the package: `npm install --save-dev gh-pages`.
2.  Add a script to `package.json`: `"deploy": "gh-pages -d out"`.
3.  Run: `npm run build && npm run deploy`.

### 2. Automated Deployment (GitHub Actions)

We recommend using GitHub Actions to automatically build and deploy the app when changes are pushed to `main`. Any standard Next.js static export workflow will work, provided it respects the `out/` directory.

## Troubleshooting

### Bounding Box / Overpass Issues
If data is not loading, we use a multi-endpoint retry mechanism (Kumi, OpenStreetMap.de, OSM.fr). If all fail, check your network or Overpass API status.

### SVG Decoding Error
If pins are not visible (InvalidStateError), ensure the SVG string in `components/MapView.tsx` is properly decoded across different browsers via the `Blob` URL mechanism.

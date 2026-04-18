# 🎡 Spielplatz Entdecker (Playground Finder)

[![Deploy to GitHub Pages](https://github.com/reklov86/find_playground/actions/workflows/deploy.yml/badge.svg)](https://github.com/reklov86/find_playground/actions/workflows/deploy.yml)

A high-performance, mobile-first web application designed to help families in Germany find and navigate to the best playgrounds. Built with modern web technologies for a smooth, premium experience.

## ✨ Features

- 🗺️ **Interactive 3D Maps**: Explore real playgrounds with 3D building extrusions and a dynamic 45-degree tilted view. [✅ LIVE]
- 📍 **Functional Search**: Real-time high-accuracy search for cities, streets, and landmarks via Nominatim API. [✅ LIVE]
- 🔐 **Secure Authentication**: Full user signup and login flow powered by Supabase Auth. [✅ LIVE]
- 🛝 **Real-time Data**: Playgrounds fetched dynamically from OpenStreetMap via Overpass API. [✅ LIVE]
- 🚶 **Multimodal Routing**: [🕒 COMING SOON] Integrated walking, cycling, and driving directions.
- 🚌 **Public Transport**: [🕒 COMING SOON] Deep-links to Google Maps.
- 📸 **Community Photos**: Authenticated users can view details (Upload coming soon). [✅ PARTIAL]
- 🎨 **Premium UI**: Vibrant colors, glassmorphism, and smooth Framer Motion animations.

## 🚀 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Mapping**: [MapLibre GL JS](https://maplibre.org/) & [React Map GL](https://visgl.github.io/react-map-gl/)
- **Backend/Auth**: [Supabase](https://supabase.com/)
- **APIs**: Overpass (Playground Data), OpenRouteService (Routing), Nominatim (Geocoding)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)

## 🛠️ Local Setup

### 1. Prerequisites
- **Node.js 18+** installed on your system.
- Git.

### 2. Installation
```bash
git clone https://github.com/reklov86/find_playground.git
cd find_playground
npm install
```

### 3. Environment Variables
Create a `.env.local` file based on `.env.example`:
```bash
cp .env.example .env.local
```
Then fill in your:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_ORS_API_KEY`

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000/find_playground](http://localhost:3000/find_playground) to see the app.

## 🌍 Deployment

The project is configured for **GitHub Pages** using a static export strategy.

1. Push your changes to the `main` branch.
2. The GitHub Action will automatically build and deploy to:
   `https://reklov86.github.io/find_playground/`

## 📄 Documentation

- [Detailed Requirements](docs/REQUIREMENTS.md)
- [Architecture Overview](docs/ARCHITECTURE.md)

---
© 2026 reklov86. Built for adventures.

# find_playground: Spielplatz Entdecker

A vibrant, premium web application to find playgrounds in Germany with real-time navigation and community photo sharing.

## 🌟 Features
- **Smart Discovery**: Automatically finds all playgrounds within 5km using OpenStreetMap (Overpass API).
*   **3D Visual Experience**: Interactive 3D map with streets, building extrusions, and landmarks.
*   **Multi-Mode Routing**: Turn-by-turn directions for **Walking**, **Cycling**, and **Driving**.
*   **Public Transport**: Integrated deep-linking to Google Maps for precise German transit schedules.
*   **Community Gallery**: Upload and view photos of playgrounds via Supabase.
*   **Premium Design**: Mobile-first, playful aesthetic with glassmorphism and vibrant HSL colors.

## 🛠 Tech Stack
- **Frontend**: React (18.x) + Vanilla CSS.
- **Transpilation**: Babel Standalone (enables JSX directly in the browser).
- **Map Engine**: MapLibre GL JS (Vector-based).
- **Database & Auth**: Supabase (Auth + Storage + Database).
- **Navigation**: OpenRouteService API.
- **Data Source**: OpenStreetMap (OSM).

## 🚀 Deployment & Local Setup

### Local Run
Since this is a **no-build** project, you can simply open `index.html` in your browser.
*Note: Some browser security policies (CORS) may require you to run a simple HTTP server (like VS Code's "Live Server" extension) for the app to function perfectly.*

### GitHub Deployment
This project is set up for **GitHub Pages**.
1. Go to **Settings > Pages**.
2. Select the `main` branch and `/ (root)` folder.
3. Your app will be live at `https://reklov86.github.io/find_playground/`.

### Final Config
To activate all features, ensure you have set:
- `ORS_API_KEY` in `index.html`
- **Supabase Credentials** in `index.html`
- **Supabase SQL**: Run the script found in `documentation/supabase_setup.sql`.

---

## 📂 Project Structure
- `index.html`: The core application (Logic + UI).
- `style.css`: The "Premium Playful" design system.
- `requirements.md`: Detailed functional and non-functional requirements.
- `implementation_plan.md`: Technical breakdown and architecture.
- `documentation/supabase_setup.sql`: SQL script for backend setup.

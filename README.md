# USK Social

USK Social is a social network designed to connect Urban Sketchers and allow them to upload their artwork, share their sketches, and interact with fellow artists around their city and the world.

## Features

- ✨ User authentication and profile management
- 📸 Upload sketches with location data
- 🗺️ Interactive map showing all sketches
- 🎨 Event-based clustering on the map
- 👤 User profiles with sketch galleries
- 📱 Responsive design for mobile and desktop

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Maps**: Leaflet with React-Leaflet
- **Database & Auth**: Supabase (PostgreSQL + PostGIS)
- **Hosting**: GitHub Pages

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase project with the database schema set up (see `AI_AGENT_PROMPT.md`)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd USKSocial
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
/src
  /components
    /auth       - Login, Signup, ProfileSetup components
    /common     - Navbar, Footer
    /map        - Map components (InteractiveMap, SketchMarker, EventCluster)
    /profile    - Profile page components
    /sketch     - Sketch upload, card, and modal components
  /hooks        - Custom React hooks (useAuth, useSketches, useEvents)
  /lib          - Supabase client and TypeScript types
  /pages        - Main page components (Home, Map, Profile)
  App.tsx       - Main app component with routing
  main.tsx      - Entry point
```

## Database Schema

The app requires a Supabase database with the following tables:

- **profiles** - User profiles extending auth.users
- **sketches** - Uploaded artwork with location data
- **events** - Sketch meetups/events

See `AI_AGENT_PROMPT.md` for detailed schema information.

## Deployment to GitHub Pages

1. Update `vite.config.ts` base path if needed (already configured for `/usk-social/`)

2. Update the `homepage` field in `package.json` with your GitHub username/repo

3. Build and deploy:
```bash
npm run build
npm run deploy
```

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to GitHub Pages

## Features in Detail

### Authentication
- Email/password signup and login
- Profile creation after signup
- Protected routes for authenticated users

### Sketch Upload
- Upload images with title, description, and location
- Automatic geolocation detection
- Optional event association
- Form validation for coordinates and file types

### Interactive Map
- Display all sketches as markers
- Cluster sketches by event
- Expand/collapse event clusters
- Click markers to view sketch details

### Profile Page
- View and edit your profile
- Browse your sketch gallery
- View other users' public profiles

## Environment Variables

Required environment variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## License

This project is open source and available under the MIT License.
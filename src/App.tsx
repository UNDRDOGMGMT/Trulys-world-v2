import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { UnlockProvider } from "@/contexts/UnlockContext";
import { MemberProvider } from "@/contexts/MemberContext";
import { TravelProvider } from "@/contexts/TravelContext";
import { LAUNCHED } from "@/lib/gate";
import Starfield from "@/components/Starfield";

// Code-split pages — each loads as its own chunk
const Index = React.lazy(() => import("./pages/Index"));
const MapHub = React.lazy(() => import("./pages/MapHub"));
const World = React.lazy(() => import("./pages/World"));
const LocationPage = React.lazy(() => import("./pages/LocationPage"));
const DearJoshua = React.lazy(() => import("./pages/DearJoshua"));
const VistaTheater = React.lazy(() => import("./pages/VistaTheater"));
const Rsvp = React.lazy(() => import("./pages/Rsvp"));
const Tickets = React.lazy(() => import("./pages/Tickets"));
const CruiseNight = React.lazy(() => import("./pages/CruiseNight"));
const DoNotDisturb = React.lazy(() => import("./pages/DoNotDisturb"));
const DearJoshuaGame = React.lazy(() => import("./pages/DearJoshuaGame"));
const FearTheReaper = React.lazy(() => import("./pages/FearTheReaper"));
const ForeverGame = React.lazy(() => import("./pages/ForeverGame"));
const SaveTruly = React.lazy(() => import("./pages/SaveTruly"));
const BoyGame = React.lazy(() => import("./pages/BoyGame"));
const BoyfriendIsland = React.lazy(() => import("./pages/BoyfriendIsland"));
const TrulysPinball = React.lazy(() => import("./pages/TrulysPinball"));
const TrulysMapPinball = React.lazy(() => import("./pages/TrulysMapPinball"));
const Sing = React.lazy(() => import("./pages/Sing"));
const Shadows = React.lazy(() => import("./pages/Shadows"));
const Boutique = React.lazy(() => import("./pages/Boutique"));
const Selects = React.lazy(() => import("./pages/Selects"));
const CorbinBowl = React.lazy(() => import("./pages/CorbinBowl"));
const CorbinInside = React.lazy(() => import("./pages/CorbinInside"));
const CorbinArcade = React.lazy(() => import("./pages/CorbinArcade"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Gate = React.lazy(() => import("./pages/Gate"));
const Account = React.lazy(() => import("./pages/Account"));
import GlobeGate from "./pages/GlobeGate";

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <span className="font-whimsy text-lg text-pink-light tracking-wider animate-pulse glitter-glow">
      ✦ Opening the map ✦
    </span>
  </div>
);

// Catches a render throw in any lazy page (e.g. a WebGL-context failure on
// /world for a low-end device) and shows a reload card instead of a white screen.
class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-background text-center px-6">
          <span className="font-whimsy text-xl text-pink-light glitter-glow">
            ✦ something glitched in the map ✦
          </span>
          <button
            onClick={() => window.location.assign("/")}
            className="btn-retro px-8 py-3 text-sm"
          >
            ✧ reload the world ✧
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Full-bleed routes (the Cruise Night game) opt out of the site chrome so the
// canvas owns the viewport — no starfield, sparkle overlays, or persistent player.
import { useMember } from '@/contexts/MemberContext';

const BARE_PATHS = ["/cruise-night", "/do-not-disturb", "/dear-joshua-game", "/fear-the-reaper", "/forever-game", "/save-truly", "/boy-game", "/boyfriend-island", "/trulys-pinball", "/trulys-map-pinball", "/karaoke", "/boutique", "/corbin-bowl", "/corbin-bowl/inside", "/corbin-bowl/arcade", "/world", "/shadows", "/selects", "/join", "/vista", "/rsvp", "/tickets"];

// Login wall for member-only routes (waypoints, games, EP, account). Public
// pages (map, landing, Shadows, Store) don't use this. Sends logged-out visitors
// to /join and remembers where they were headed.
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ready, unlocked } = useMember();
  const location = useLocation();
  if (!ready) return <div className="min-h-screen bg-[#05010a]" />;
  if (!unlocked) return <Navigate to="/join" state={{ from: location.pathname + location.search }} replace />;
  return <>{children}</>;
};

// The /join page — signup / login. Once the account exists (or staff bypass),
// always drop the user on the flat map so they land in the world and pick where
// to go (rather than back on whatever waypoint they tapped to trigger login).
const JoinRoute: React.FC = () => {
  const { ready, unlocked } = useMember();
  const navigate = useNavigate();
  React.useEffect(() => {
    if (ready && unlocked) navigate("/map", { replace: true });
  }, [ready, unlocked, navigate]);
  if (!ready || unlocked) return <div className="min-h-screen bg-[#05010a]" />;
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05010a]" />}>
      <Gate />
    </Suspense>
  );
};

const SiteShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  if (BARE_PATHS.includes(location.pathname)) {
    return <>{children}</>;
  }
  return (
    <div className="scanlines vignette crt-flicker">
      <Starfield />
      <div className="sparkle-overlay" />
      <div className="sparkle-overlay-2" />
      <div className="sparkle-overlay-3" />
      {children}
    </div>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <RouteErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* ── Public (no account): map, landing, Shadows single, the Store ── */}
          <Route path="/" element={<Index />} />
          <Route path="/map" element={<MapHub />} />
          <Route path="/shadows" element={<Shadows />} />
          <Route path="/boutique" element={<Boutique />} />
          <Route path="/world" element={<GlobeGate><World /></GlobeGate>} />
          <Route path="/join" element={<JoinRoute />} />
          <Route path="/rsvp" element={<Rsvp />} />
          <Route path="/tickets" element={<Tickets />} />

          {/* ── Member-only (login required): waypoints, games, EP, account ── */}
          <Route path="/location/:id" element={<RequireAuth><LocationPage /></RequireAuth>} />
          <Route path="/dear-joshua" element={<RequireAuth><DearJoshua /></RequireAuth>} />
          <Route path="/vista" element={<RequireAuth><VistaTheater /></RequireAuth>} />
          <Route path="/cruise-night" element={<RequireAuth><CruiseNight /></RequireAuth>} />
          <Route path="/do-not-disturb" element={<RequireAuth><DoNotDisturb /></RequireAuth>} />
          <Route path="/dear-joshua-game" element={<RequireAuth><DearJoshuaGame /></RequireAuth>} />
          <Route path="/fear-the-reaper" element={<RequireAuth><FearTheReaper /></RequireAuth>} />
          <Route path="/forever-game" element={<RequireAuth><ForeverGame /></RequireAuth>} />
          <Route path="/save-truly" element={<RequireAuth><SaveTruly /></RequireAuth>} />
          <Route path="/boy-game" element={<RequireAuth><BoyGame /></RequireAuth>} />
          <Route path="/boyfriend-island" element={<RequireAuth><BoyfriendIsland /></RequireAuth>} />
          <Route path="/trulys-pinball" element={<RequireAuth><TrulysPinball /></RequireAuth>} />
          <Route path="/trulys-map-pinball" element={<RequireAuth><TrulysMapPinball /></RequireAuth>} />
          <Route path="/karaoke" element={<RequireAuth><Sing /></RequireAuth>} />
          <Route path="/selects" element={<RequireAuth><Selects /></RequireAuth>} />
          <Route path="/corbin-bowl" element={<RequireAuth><CorbinBowl /></RequireAuth>} />
          <Route path="/corbin-bowl/inside" element={<RequireAuth><CorbinInside /></RequireAuth>} />
          <Route path="/corbin-bowl/arcade" element={<RequireAuth><CorbinArcade /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
    </RouteErrorBoundary>
  );
};

// Two modes, switched by LAUNCHED in src/lib/gate.ts:
//   PRE-LAUNCH  (LAUNCHED=false): the ENTIRE site sits behind the staff code —
//     only a server-validated bypass gets in. Sign-ups are captured but can't
//     enter. (Flip LAUNCHED to true at go-live.)
//   LAUNCHED    (LAUNCHED=true): public model — map, landing, Shadows + the Store
//     are open to everyone; waypoints/games/EP/account require a login (RequireAuth
//     bounces logged-out visitors to /join). Staff bypass still grants full access.
const Gated = () => {
  const { ready, unlocked } = useMember();
  if (!ready) {
    return <div className="min-h-screen bg-[#05010a]" />;
  }
  // Pre-launch curtain: whole site behind the staff code until we flip LAUNCHED.
  if (!LAUNCHED && !unlocked) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#05010a]" />}>
        <Gate />
      </Suspense>
    );
  }
  return (
    <UnlockProvider>
      <BrowserRouter>
        <TravelProvider>
          <SiteShell>
            <AnimatedRoutes />
          </SiteShell>
        </TravelProvider>
      </BrowserRouter>
    </UnlockProvider>
  );
};

const App = () => (
  <MemberProvider>
    <Gated />
    <Analytics />
    <SpeedInsights />
  </MemberProvider>
);

export default App;

import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { UnlockProvider } from "@/contexts/UnlockContext";
import { MemberProvider } from "@/contexts/MemberContext";
import { TravelProvider } from "@/contexts/TravelContext";
import Starfield from "@/components/Starfield";
import PersistentPlayer from "@/components/PersistentPlayer";

// Code-split pages — each loads as its own chunk
const Index = React.lazy(() => import("./pages/Index"));
const MapHub = React.lazy(() => import("./pages/MapHub"));
const World = React.lazy(() => import("./pages/World"));
const LocationPage = React.lazy(() => import("./pages/LocationPage"));
const DearJoshua = React.lazy(() => import("./pages/DearJoshua"));
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

const BARE_PATHS = ["/cruise-night", "/do-not-disturb", "/dear-joshua-game", "/fear-the-reaper", "/forever-game", "/save-truly", "/boy-game", "/boyfriend-island", "/trulys-pinball", "/trulys-map-pinball", "/sing", "/boutique", "/corbin-bowl", "/corbin-bowl/inside", "/corbin-bowl/arcade", "/world", "/shadows", "/selects"];

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
      <PersistentPlayer />
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
          <Route path="/" element={<Index />} />
          <Route path="/map" element={<MapHub />} />
          <Route path="/world" element={<World />} />
          <Route path="/location/:id" element={<LocationPage />} />
          <Route path="/dear-joshua" element={<DearJoshua />} />
          <Route path="/cruise-night" element={<CruiseNight />} />
          <Route path="/do-not-disturb" element={<DoNotDisturb />} />
          <Route path="/dear-joshua-game" element={<DearJoshuaGame />} />
          <Route path="/fear-the-reaper" element={<FearTheReaper />} />
          <Route path="/forever-game" element={<ForeverGame />} />
          <Route path="/save-truly" element={<SaveTruly />} />
          <Route path="/boy-game" element={<BoyGame />} />
          <Route path="/boyfriend-island" element={<BoyfriendIsland />} />
          <Route path="/trulys-pinball" element={<TrulysPinball />} />
          <Route path="/trulys-map-pinball" element={<TrulysMapPinball />} />
          <Route path="/sing" element={<Sing />} />
          <Route path="/shadows" element={<Shadows />} />
          <Route path="/boutique" element={<Boutique />} />
          <Route path="/selects" element={<Selects />} />
          <Route path="/corbin-bowl" element={<CorbinBowl />} />
          <Route path="/corbin-bowl/inside" element={<CorbinInside />} />
          <Route path="/corbin-bowl/arcade" element={<CorbinArcade />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
    </RouteErrorBoundary>
  );
};

// Account-gated: Supabase session + member profile (or server-validated bypass).
// MemberProvider wraps BOTH the gate and the site so the gate can create accounts.
const Gated = () => {
  const { ready, unlocked } = useMember();
  if (!ready) {
    return <div className="min-h-screen bg-[#05010a]" />;
  }
  if (!unlocked) {
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

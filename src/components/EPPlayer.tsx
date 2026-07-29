import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle } from "lucide-react";
import vinylImg from "@/assets/ty-vinyl.png";
import playerShape from "@/assets/player-shape.png";
import HandDrawnFrame from "@/components/HandDrawnFrame";

interface Track {
  id: number;
  title: string;
  subtitle: string;
  src: string;
  /** Base hue that themes the whole player while this track is active */
  hue: number;
}

const TRACKS: Track[] = [
  { id: 1, title: "Dear Joshua", subtitle: "The Letter", src: "/audio/01-dear-joshua.mp3", hue: 330 },
  { id: 2, title: "Fear the Reaper", subtitle: "The Warning", src: "/audio/02-fear-the-reaper.m4a", hue: 280 },
  { id: 3, title: "Forever", subtitle: "The Promise", src: "/audio/03-forever.mp3", hue: 210 },
  { id: 4, title: "Shadows", subtitle: "The Single", src: "/audio/04-shadows.mp3", hue: 350 },
  { id: 5, title: "Boy", subtitle: "The Mirror", src: "/audio/05-boy.mp3", hue: 35 },
  { id: 6, title: "You Two Deserve Each Other", subtitle: "The Exit", src: "/audio/06-you-two-deserve-each-other.m4a", hue: 160 },
];

const formatTime = (seconds: number) => {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const EPPlayer: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const discRef = useRef<HTMLDivElement | null>(null);
  const haloRef = useRef<HTMLDivElement | null>(null);

  // Web Audio graph — created once, on the first user-initiated play
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number>(0);
  const spinRef = useRef<number>(0);

  const track = TRACKS[currentIndex];
  const hue = track.hue;

  // ── Web Audio setup (must run after a user gesture) ──────────────────────
  const ensureAudioGraph = useCallback(() => {
    if (audioCtxRef.current || !audioRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      setAudioReady(true);
    } catch {
      // Web Audio unavailable — audio still plays, visualizer stays idle
    }
  }, []);

  // ── The render loop: spectrum ring + amplitude-reactive disc/halo ─────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const size = canvas.clientWidth;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);

      const analyser = analyserRef.current;
      const data = dataRef.current;
      let energy = 0;

      const BARS = 72; // half-ring, mirrored → full circle
      const baseR = (Math.min(w, h) / 2) * 0.52;
      const maxLen = (Math.min(w, h) / 2) * 0.42;

      if (analyser && data && isPlaying) {
        analyser.getByteFrequencyData(data);
        // Bass-weighted energy for the reactive glow/scale
        let sum = 0;
        const usable = Math.floor(data.length * 0.7);
        for (let i = 0; i < usable; i++) sum += data[i];
        energy = sum / (usable * 255);
      }

      // Spectrum ring — symmetric, radiating bars
      for (let i = 0; i < BARS; i++) {
        const bin = Math.floor((i / BARS) * (data ? data.length * 0.7 : 0));
        const v = data && isPlaying ? data[bin] / 255 : 0.04 + 0.02 * Math.sin(i * 0.6 + spinRef.current);
        const len = maxLen * (0.08 + v * 0.92);
        const barHue = hue + v * 40;
        // draw both the bar and its mirror across the vertical axis
        for (const dir of [1, -1]) {
          const ang = -Math.PI / 2 + dir * (i / BARS) * Math.PI;
          const x1 = cx + Math.cos(ang) * baseR;
          const y1 = cy + Math.sin(ang) * baseR;
          const x2 = cx + Math.cos(ang) * (baseR + len);
          const y2 = cy + Math.sin(ang) * (baseR + len);
          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, `hsla(${hue}, 90%, 72%, 0.15)`);
          grad.addColorStop(1, `hsla(${barHue}, 95%, ${60 + v * 20}%, ${0.55 + v * 0.45})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = Math.max(1.5, (w / BARS) * 0.32);
          ctx.lineCap = "round";
          ctx.shadowBlur = 8 + v * 22;
          ctx.shadowColor = `hsla(${barHue}, 95%, 65%, ${0.5 + v * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // Drive the disc spin + amplitude reactions directly (no React re-render)
      spinRef.current += 0.35 + energy * 1.6;
      if (discRef.current) {
        const scale = 1 + energy * 0.07;
        discRef.current.style.transform = `rotate(${spinRef.current}deg) scale(${scale})`;
      }
      if (haloRef.current) {
        haloRef.current.style.opacity = String(0.25 + energy * 0.7);
        haloRef.current.style.transform = `scale(${1 + energy * 0.25})`;
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isPlaying, hue]);

  // ── Playback controls ─────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureAudioGraph();
    audioCtxRef.current?.resume();
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
  }, [isPlaying, ensureAudioGraph]);

  const goTo = useCallback((i: number, autoplay = true) => {
    setCurrentIndex(((i % TRACKS.length) + TRACKS.length) % TRACKS.length);
    setProgress(0);
    setCurrentTime(0);
    if (autoplay) {
      setTimeout(() => {
        audioCtxRef.current?.resume();
        audioRef.current?.play().catch(() => {});
      }, 60);
    }
  }, []);

  const nextTrack = useCallback(() => {
    if (shuffle) {
      let n = currentIndex;
      while (n === currentIndex && TRACKS.length > 1) n = Math.floor(Math.random() * TRACKS.length);
      goTo(n);
    } else {
      goTo(currentIndex + 1);
    }
  }, [currentIndex, shuffle, goTo]);

  const prevTrack = useCallback(() => {
    // Restart current track if we're more than 3s in, else previous
    if ((audioRef.current?.currentTime ?? 0) > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  // Audio element event wiring
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      if (loop) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        nextTrack();
      }
    };
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      const dur = audio.duration || 0;
      setDuration(dur);
      setProgress(dur ? (audio.currentTime / dur) * 100 : 0);
    };
    const onMeta = () => setDuration(audio.duration || 0);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
    };
  }, [loop, nextTrack]);

  // Reload element when the track src changes
  useEffect(() => {
    audioRef.current?.load();
  }, [currentIndex]);

  // Close the AudioContext on unmount. Chrome caps ~6 live contexts per
  // document, so without this a fan who re-enters /dear-joshua enough times
  // exhausts the pool and the audio graph silently dies for the session.
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, []);

  // Volume / mute
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.code === "ArrowRight") nextTrack();
      else if (e.code === "ArrowLeft") prevTrack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, nextTrack, prevTrack]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
  };

  const accent = `hsl(${hue}, 88%, 62%)`;
  const accentSoft = `hsla(${hue}, 88%, 62%, 0.4)`;

  return (
    <div
      className="w-full max-w-xl mx-auto transition-colors duration-700"
      style={{ ["--tk" as string]: accent }}
    >
      <audio ref={audioRef} src={track.src} preload="metadata" crossOrigin="anonymous" />

      <div className="relative py-6 flex flex-col items-center text-center">
        {/* Now Playing banner */}
        <div className="relative z-10 mb-6">
          <div className="relative w-[min(320px,86vw)] aspect-[6/1]">
            <img
              src={playerShape}
              alt=""
              className="absolute inset-0 w-full h-full object-fill pointer-events-none"
              style={{ filter: "drop-shadow(0 0 6px rgba(255,204,224,0.7)) drop-shadow(0 0 14px rgba(255,105,180,0.3))" }}
            />
            <div className="absolute inset-0 flex items-center justify-center gap-2">
              <span className="font-whimsy text-[13px] md:text-sm tracking-wider glitter-glow" style={{ color: "#ffcce0" }}>
                Now Playing
              </span>
              {isPlaying && (
                <span className="flex items-end gap-[2px] h-3" aria-hidden>
                  {[0, 1, 2].map((b) => (
                    <motion.span
                      key={b}
                      className="w-[2px] rounded-full"
                      style={{ background: "#ffcce0" }}
                      animate={{ height: ["30%", "100%", "45%"] }}
                      transition={{ duration: 0.5 + b * 0.12, repeat: Infinity, repeatType: "mirror" }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reactive vinyl + spectrum ring */}
        <div className="relative w-[min(300px,80vw)] h-[min(300px,80vw)] md:w-[360px] md:h-[360px] mb-6 flex items-center justify-center">
          {/* Amplitude halo */}
          <div
            ref={haloRef}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${accentSoft} 0%, transparent 62%)`,
              opacity: 0.25,
              transition: "background 0.7s ease",
            }}
          />
          {/* Live spectrum canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden
          />
          {/* Vinyl (swappable PNG layer) */}
          <div
            ref={discRef}
            className="relative w-[150px] h-[150px] md:w-[184px] md:h-[184px]"
            style={{
              filter: `drop-shadow(0 0 16px ${accentSoft}) drop-shadow(0 6px 14px rgba(0,0,0,0.6))`,
              willChange: "transform",
            }}
          >
            <img src={vinylImg} alt="Dear Joshua vinyl" className="w-full h-full object-contain" />
            {/* Center label pulse */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
            />
          </div>
        </div>

        {/* Track title */}
        <div className="relative z-10 mb-1 min-h-[44px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={track.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="font-whimsy text-2xl md:text-3xl chrome-text-pink leading-tight"
            >
              {track.title}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
          {track.subtitle}
        </p>

        {/* Progress bar */}
        <div className="relative z-10 mb-5 w-full max-w-md">
          <div
            className="relative h-2 bg-black/50 rounded-full overflow-hidden cursor-pointer border border-pink/20 group"
            onClick={seek}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(to right, ${accent}, hsl(330,85%,72%))`,
                boxShadow: `0 0 8px ${accent}, 0 0 16px ${accentSoft}`,
              }}
            />
            {progress > 1 && (
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${progress}%`, color: "#fff" }}
                animate={{ scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <span className="text-xs -translate-x-1/2 inline-block" style={{ textShadow: "0 0 6px #fff" }}>✦</span>
              </motion.div>
            )}
          </div>
          <div className="flex justify-between mt-1.5 font-mono text-[10px] text-foreground/60 tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span className="text-pink-light/70">♥ teaser ♥</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-5 md:gap-7 relative z-10 mt-1">
          <button
            onClick={() => setShuffle((s) => !s)}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${shuffle ? "text-accent" : "text-foreground/40 hover:text-foreground/70"}`}
            aria-label="Shuffle"
            aria-pressed={shuffle}
          >
            <Shuffle size={15} />
          </button>

          <motion.button
            onClick={prevTrack}
            className="relative w-14 h-14 flex items-center justify-center text-pink-light"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Previous track"
          >
            <HandDrawnFrame strokeWidth={1.8} wobble={5} hearts={false} color="#ffcce0" shape="oval" />
            <SkipBack size={18} fill="currentColor" className="relative z-10" style={{ filter: "drop-shadow(0 0 6px rgba(255,105,180,0.5))" }} />
          </motion.button>

          <motion.button
            onClick={togglePlay}
            className="relative w-20 h-20 md:w-[92px] md:h-[92px] flex items-center justify-center"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            <HandDrawnFrame strokeWidth={2.6} wobble={6} hearts color="#ffb6d5" shape="oval" animated={isPlaying} />
            <span
              className="absolute inset-2 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle at center, ${accentSoft} 0%, transparent 70%)`, transition: "background 0.6s ease" }}
            />
            {isPlaying ? (
              <Pause size={30} fill="currentColor" className="relative z-10 text-pink-light" style={{ filter: "drop-shadow(0 0 10px rgba(255,105,180,0.7))" }} />
            ) : (
              <Play size={32} fill="currentColor" className="relative z-10 text-pink-light ml-1" style={{ filter: "drop-shadow(0 0 10px rgba(255,105,180,0.7))" }} />
            )}
          </motion.button>

          <motion.button
            onClick={nextTrack}
            className="relative w-14 h-14 flex items-center justify-center text-pink-light"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Next track"
          >
            <HandDrawnFrame strokeWidth={1.8} wobble={5} hearts={false} color="#ffcce0" shape="oval" />
            <SkipForward size={18} fill="currentColor" className="relative z-10" style={{ filter: "drop-shadow(0 0 6px rgba(255,105,180,0.5))" }} />
          </motion.button>

          <button
            onClick={() => setLoop((l) => !l)}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${loop ? "text-accent" : "text-foreground/40 hover:text-foreground/70"}`}
            aria-label="Loop"
            aria-pressed={loop}
          >
            <Repeat size={15} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 mt-6 w-40">
          <button onClick={() => setMuted((m) => !m)} className="text-foreground/50 hover:text-pink-light transition-colors" aria-label={muted ? "Unmute" : "Mute"}>
            {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
            className="flex-1 h-1 appearance-none rounded-full cursor-pointer accent-pink"
            style={{ background: `linear-gradient(to right, ${accent} ${(muted ? 0 : volume) * 100}%, hsl(0 0% 25%) ${(muted ? 0 : volume) * 100}%)` }}
            aria-label="Volume"
          />
        </div>

        {!audioReady && (
          <p className="mt-3 font-display text-[9px] uppercase tracking-widest text-muted-foreground/60">
            ▶ press play to start the visualizer
          </p>
        )}
      </div>

      {/* Tracklist */}
      <div className="mt-10 relative flex flex-col items-center">
        <div className="relative z-10 mb-6">
          <div className="relative w-[min(280px,80vw)] aspect-[6/1]">
            <img
              src={playerShape}
              alt=""
              className="absolute inset-0 w-full h-full object-fill pointer-events-none"
              style={{ filter: "drop-shadow(0 0 5px rgba(255,204,224,0.6)) drop-shadow(0 0 12px rgba(255,105,180,0.25))" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-whimsy text-[12px] tracking-wider glitter-glow" style={{ color: "#ffcce0" }}>Tracklist</span>
            </div>
          </div>
        </div>
        <ul className="space-y-4 relative z-10 w-full flex flex-col items-center">
          {TRACKS.map((t, i) => {
            const active = i === currentIndex;
            return (
              <li key={t.id} className="w-full flex justify-center">
                <motion.button
                  onClick={() => goTo(i)}
                  className="relative px-10 md:px-14 py-3 inline-flex flex-col items-center justify-center text-center group mx-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {active && (
                    <HandDrawnFrame strokeWidth={2.2} wobble={5} hearts={false} color={`hsl(${t.hue},85%,72%)`} animated={isPlaying} shape="oval" />
                  )}
                  <span className={`relative z-10 font-whimsy text-xl md:text-2xl leading-tight whitespace-nowrap transition-all duration-300 ${active ? "chrome-text-pink" : "text-foreground/80 group-hover:text-foreground"}`}>
                    {t.title}
                  </span>
                  <span className={`relative z-10 font-display text-[9px] uppercase tracking-[0.2em] mt-0.5 transition-opacity ${active ? "text-pink-light/80" : "text-muted-foreground/50"}`}>
                    {t.subtitle}
                  </span>
                </motion.button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default EPPlayer;

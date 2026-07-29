import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import { useUnlock } from '@/contexts/UnlockContext';
import { trackEvent } from '@/lib/analytics';

export interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
}

// 30-second teaser clips — same masters served on the Dear Joshua page (public/audio/)
const PLAYLIST: Track[] = [
  { id: 't1', title: 'Shadows (Teaser)', artist: 'Truly Young', src: '/audio/04-shadows.mp3' },
  { id: 't2', title: 'Dear Joshua (Teaser)', artist: 'Truly Young', src: '/audio/01-dear-joshua.mp3' },
];

const PersistentPlayer: React.FC = () => {
  const { soundOn } = useUnlock();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<number>();
  // Per-track set of progress markers already reported, so each fires at most once.
  // Reset when the track changes.
  const reportedMarkersRef = useRef<Set<string>>(new Set());

  const track = PLAYLIST[currentIndex];
  const hasAudio = track?.src !== '';

  const togglePlay = useCallback(() => {
    if (!hasAudio || !audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Don't flip state optimistically — the audio element's play/pause
      // events (wired below) are the source of truth, so the UI can never
      // show "playing" while nothing is actually audible.
      audioRef.current.play()
        .then(() => trackEvent('audio_play', { track_id: track.id, title: track.title }))
        .catch(() => { /* autoplay/interrupt rejection — stay paused */ });
    }
  }, [isPlaying, hasAudio, track?.id, track?.title]);

  const nextTrack = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % PLAYLIST.length);
    setProgress(0);
    setIsPlaying(false);
    reportedMarkersRef.current = new Set();
  }, []);

  const prevTrack = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
    setProgress(0);
    setIsPlaying(false);
    reportedMarkersRef.current = new Set();
  }, []);

  useEffect(() => {
    if (!hasAudio) return;
    if (isPlaying && audioRef.current) {
      progressInterval.current = window.setInterval(() => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          const dur = audioRef.current.duration || 0;
          const pct = (current / dur) * 100;
          setProgress(isNaN(pct) ? 0 : pct);

          // Fire each progress marker once per track. The 90% marker is treated as
          // "near-complete" since most users skip the last few seconds of fade-outs.
          const seen = reportedMarkersRef.current;
          const fire = (key: string, condition: boolean) => {
            if (condition && !seen.has(key)) {
              seen.add(key);
              trackEvent('audio_progress', { track_id: track.id, marker: key });
            }
          };
          fire('10s', current >= 10);
          fire('30s', current >= 30);
          fire('60s', current >= 60);
          fire('90pct', dur > 0 && current / dur >= 0.9);
        }
      }, 250);
    }
    return () => clearInterval(progressInterval.current);
  }, [isPlaying, hasAudio, track?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted || !soundOn;
    }
  }, [muted, soundOn]);

  // Drive isPlaying off the real audio element so the play/pause icon and the
  // EQ bars always reflect actual playback (never a stuck optimistic state).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [hasAudio, currentIndex]);

  // Don't render if no tracks
  if (PLAYLIST.length === 0) return null;

  return (
    <>
      {hasAudio && <audio ref={audioRef} src={track.src} onEnded={nextTrack} preload="metadata" />}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[100] bg-dark-surface/95 backdrop-blur-sm border-t-2 border-pink/20 glitter-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ delay: 1, duration: 0.4 }}
      >
        {/* Progress bar */}
        <div className="h-[3px] bg-border w-full">
          <motion.div
            className="h-full bg-accent shadow-[0_0_8px_rgba(255,105,180,0.5)]"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-2">
          {/* Track info */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
            aria-label={expanded ? 'Collapse player' : 'Expand player'}
          >
            {isPlaying && (
              <span className="flex items-end gap-[2.5px] h-3 shrink-0" aria-hidden>
                <span className="eq-bar" />
                <span className="eq-bar" />
                <span className="eq-bar" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-[13px] text-cream truncate">
                {track.title}
              </p>
              <p className="font-whimsy text-[11px] text-pink-light truncate">
                {track.artist}
              </p>
            </div>
            {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronUp size={14} className="text-muted-foreground shrink-0" />}
          </button>

          {/* Controls */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={prevTrack}
              className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-cream/60 hover:text-cream transition-colors"
              aria-label="Previous track"
            >
              <SkipBack size={15} />
            </button>
            <button
              onClick={togglePlay}
              className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border-2 transition-all duration-200 ${
                hasAudio ? 'text-cream border-pink/30 hover:bg-accent/20 hover:border-pink hover:shadow-[0_0_12px_rgba(255,105,180,0.3)]' : 'text-cream/30 border-border cursor-not-allowed'
              }`}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              disabled={!hasAudio}
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <button
              onClick={nextTrack}
              className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-cream/60 hover:text-cream transition-colors"
              aria-label="Next track"
            >
              <SkipForward size={15} />
            </button>
            <button
              onClick={() => setMuted(!muted)}
              className="p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center text-cream/60 hover:text-cream transition-colors"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>

        {/* Expanded playlist */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              className="border-t border-border"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-2">
                <span className="case-label text-[10px]">♥ Tracklist</span>
              </div>
              {PLAYLIST.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => { setCurrentIndex(i); setProgress(0); setIsPlaying(false); }}
                  className={`w-full text-left px-4 py-2 flex items-center justify-between hover:bg-accent/10 transition-colors ${
                    i === currentIndex ? 'bg-accent/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                    <div>
                      <span className={`font-display text-[13px] ${i === currentIndex ? 'text-accent' : 'text-cream'}`}>
                        {t.title}
                      </span>
                    </div>
                  </div>
                  {!t.src && (
                    <span className="font-display text-[10px] text-muted-foreground uppercase">✧ Soon</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default PersistentPlayer;

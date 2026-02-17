'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  PictureInPicture,
  Scaling,
  Repeat,
  Captions,
  HelpCircle,
  AlertTriangle,
  X,
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  mimeType: string;
  poster?: string;
  autoPlay?: boolean;
}

export function VideoPlayer({ src, mimeType, poster, autoPlay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Storage key for persistence
  // We use a simple hash of the src to identify the video safely
  const storageKey = `video-progress-${src.split('?')[0]}`; // simple cache bust ignore query params if signed url

  // Load saved progress
  useEffect(() => {
    const savedTime = localStorage.getItem(storageKey);
    if (savedTime && videoRef.current) {
      const time = parseFloat(savedTime);
      if (!isNaN(time) && time > 0) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    }
  }, [storageKey]);

  // Save progress (throttled)
  const saveProgress = useCallback(
    (time: number) => {
      localStorage.setItem(storageKey, time.toString());
    },
    [storageKey],
  );

  // Format time (mm:ss)
  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toggle Play/Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch((e) => {
        console.error('Play failed:', e);
        // Autoplay policy might block unmuted play
      });
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, []);

  // Handle Play/Pause Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showControls && !playing) return; // Prevent accidental input if not focused? Actually global shortcuts are better.

      // If help is open, close it on any key (or specifically Esc/?)
      if (showHelp) {
        if (e.key === 'Escape' || e.key === '?') {
          setShowHelp(false);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'j':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'l':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'arrowleft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'arrowup':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case '?':
        case '/':
          e.preventDefault();
          setShowHelp((prev) => !prev);
          break;
      }

      // Number keys 0-9 for percentage seek
      if (!isNaN(parseInt(e.key)) && showControls) {
        // Only if controls are visible/active to overlap less
        const percent = parseInt(e.key) * 10;
        if (videoRef.current && duration) {
          videoRef.current.currentTime = (percent / 100) * duration;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, playing, showControls, duration, showHelp]);

  // Handle Video Events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!video) return;
      setCurrentTime(video.currentTime);
      saveProgress(video.currentTime); // This runs every ~250ms, acceptable for localStorage
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const onDurationChange = () => setDuration(video.duration);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onEnded = () => {
      setPlaying(false);
      // Clear progress on end? Maybe keeps it for replay.
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      setLoading(false);
      setError('Failed to load video.');
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', onError);

    if (autoPlay) {
      video.play().catch(() => {
        // Autoplay prevented
        setPlaying(false);
      });
    }

    return () => {
      if (video) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('durationchange', onDurationChange);
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('error', onError);
      }
    };
  }, [autoPlay, saveProgress]);

  // Controls Visibility
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const handleMouseLeave = () => {
    if (playing) setShowControls(false);
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const seekRelative = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setMuted(vol === 0);
    }
  };

  const adjustVolume = (delta: number) => {
    setVolume((prev) => {
      const newVol = Math.max(0, Math.min(1, prev + delta));
      if (videoRef.current) {
        videoRef.current.volume = newVol;
        videoRef.current.muted = newVol === 0;
        setMuted(newVol === 0);
      }
      return newVol;
    });
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !muted;
      videoRef.current.muted = newMuted;
      setMuted(newMuted);
      if (newMuted) setVolume(0);
      else setVolume(1); // Restore to 1 or previous? keeping simple
    }
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setFullscreen(true))
        .catch((err) => console.error(err));
    } else {
      document.exitFullscreen().then(() => setFullscreen(false));
    }
  };

  // Listen for fullscreen change (ESC key)
  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Aspect Ratio
  const [objectFit, setObjectFit] = useState<'contain' | 'cover' | 'fill'>('contain');

  const cycleObjectFit = () => {
    setObjectFit((prev) => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'fill';
      return 'contain';
    });
  };

  // Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Failed to toggle PiP:', error);
    }
  };

  // Loop
  const [loop, setLoop] = useState(false);
  const toggleLoop = () => setLoop(!loop);

  // Subtitles
  const [subtitleSrc, setSubtitleSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (subtitleSrc) URL.revokeObjectURL(subtitleSrc);
      const url = URL.createObjectURL(file);
      setSubtitleSrc(url);
      // Ensure the track is enabled
      if (videoRef.current) {
        // Force reload the text tracks or toggle them
        // Wait for track to load?
      }
    }
  };

  const triggerSubtitleUpload = () => {
    fileInputRef.current?.click();
  };

  // Cleanup subtitle URL
  useEffect(() => {
    return () => {
      if (subtitleSrc) URL.revokeObjectURL(subtitleSrc);
    };
  }, [subtitleSrc]);

  // Playback Speed
  const changeSpeed = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
    }
  };

  if (error) {
    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center text-white p-6 rounded-lg">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <p className="text-lg font-medium mb-2">Failed to load video</p>
        <p className="text-sm text-white/60 mb-6 text-center">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            if (videoRef.current) {
              videoRef.current.load();
            }
          }}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black rounded-lg overflow-hidden shadow-2xl ${
        fullscreen ? 'w-full h-full' : 'max-w-full max-h-[85vh]'
      } ${!showControls && playing ? 'cursor-none' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        style={{ objectFit }}
        onClick={togglePlay}
        loop={loop}
        crossOrigin="anonymous"
      >
        <source src={src} type={mimeType} />
        {subtitleSrc && (
          <track kind="subtitles" src={subtitleSrc} srcLang="en" label="English" default />
        )}
        Your browser does not support the video tag.
      </video>

      {/* Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Loader2 className="w-16 h-16 text-white/80 animate-spin" />
        </div>
      )}

      {/* Play/Pause Overlay Animation (Optional - keeping simple for now) */}
      {!playing && !loading && !showHelp && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 hover:bg-black/30 transition-colors z-20 pointer-events-none" // pointer-events-none so clicks pass through to video/overlays
        >
          <div
            className="bg-black/50 p-6 rounded-full backdrop-blur-sm border border-white/10 pointer-events-auto hover:scale-110 transition-transform"
            onClick={togglePlay}
          >
            <Play className="w-12 h-12 text-white fill-white translate-x-1" />
          </div>
        </div>
      )}

      {/* Help Dialog */}
      {showHelp && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 p-6 rounded-xl max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center">
                <HelpCircle className="w-5 h-5 mr-2 text-primary-400" />
                Keyboard Shortcuts
              </h3>
              <button onClick={() => setShowHelp(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Play / Pause</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded">Space</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Fullscreen</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded">F</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Mute / Unmute</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded">M</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Seek -/+ 10s</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded">J / L</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Seek -/+ 5s</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded">← / →</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Volume -/+</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded">↓ / ↑</span>
              </div>
              <div className="flex justify-between">
                <span>Seek to %</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded">0 - 9</span>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Double Tap Zones */}
      <div
        className="absolute inset-y-0 left-0 w-1/4 z-10 cursor-pointer"
        onDoubleClick={(e) => {
          e.stopPropagation();
          seekRelative(-10);
          // Add visual feedback later
        }}
        onClick={(e) => {
          // Handle single click to toggle play if needed, but video onClick handles it usually.
          // We propagate click so video handles play/pause on single click
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/4 z-10 cursor-pointer"
        onDoubleClick={(e) => {
          e.stopPropagation();
          seekRelative(10);
        }}
      />

      {/* Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 z-40 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-4 relative group/progress">
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-white/30 rounded-full overflow-hidden">
            {/* Buffered */}
            <div
              className="absolute top-0 left-0 h-full bg-white/20"
              style={{ width: `${(buffered / duration) * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-transparent appearance-none cursor-pointer relative z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-primary-500 rounded-full pointer-events-none"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <button onClick={togglePlay} className="hover:text-primary-400 transition-colors">
              {playing ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current" />
              )}
            </button>

            <div className="group/vol flex items-center space-x-2">
              <button onClick={toggleMute} className="hover:text-primary-400 transition-colors">
                {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>
            </div>

            <span className="text-xs font-mono opacity-80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-xs font-bold hover:text-primary-400 transition-colors w-8"
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg p-1 min-w-[60px] flex flex-col items-center">
                  {[0.5, 1, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changeSpeed(rate)}
                      className={`px-2 py-1 text-xs w-full hover:bg-white/10 rounded ${
                        playbackRate === rate ? 'text-primary-400' : 'text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={toggleLoop}
              className={`hover:text-primary-400 transition-colors ${
                loop ? 'text-primary-400' : 'text-white'
              }`}
              title="Loop"
            >
              <Repeat className="w-5 h-5" />
            </button>

            <button
              onClick={triggerSubtitleUpload}
              className={`hover:text-primary-400 transition-colors ${
                subtitleSrc ? 'text-primary-400' : 'text-white'
              }`}
              title="Upload Subtitles (.vtt, .srt)"
            >
              <Captions className="w-5 h-5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleSubtitleUpload}
              accept=".vtt,.srt"
              className="hidden"
            />

            <button
              onClick={() => setShowHelp(true)}
              className="hover:text-primary-400 transition-colors"
              title="Shortcuts"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button
              onClick={cycleObjectFit}
              className="hover:text-primary-400 transition-colors"
              title={`Aspect Ratio: ${objectFit}`}
            >
              <Scaling className="w-5 h-5" />
            </button>

            <button
              onClick={togglePiP}
              className="hover:text-primary-400 transition-colors"
              title="Picture-in-Picture"
            >
              <PictureInPicture className="w-5 h-5" />
            </button>

            <button
              onClick={toggleFullscreen}
              className="hover:text-primary-400 transition-colors"
              title="Fullscreen"
            >
              {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

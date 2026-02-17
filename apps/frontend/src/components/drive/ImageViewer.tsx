'use client';

import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Expand,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Scan,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

type FitMode = 'contain' | 'width' | 'actual';

interface ImageViewerProps {
  src: string;
  alt: string;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.2;
const PAN_STEP = 40;
const ZOOM_PRESETS = [25, 50, 100, 200, 400] as const;

function clampZoom(value: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

export function ImageViewer({
  src,
  alt,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const resetView = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setFitMode('contain');
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
    setNaturalSize({ width: 0, height: 0 });
  }, [resetView, src]);

  const applyFitMode = useCallback((mode: FitMode) => {
    setFitMode(mode);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomTo = useCallback(
    (nextZoom: number, anchor?: { clientX: number; clientY: number }) => {
      const boundedZoom = clampZoom(nextZoom);
      const shouldAnchor = fitMode === 'actual';
      setFitMode('actual');
      setZoom((prevZoom) => {
        if (!containerRef.current || !shouldAnchor || boundedZoom === prevZoom) {
          return boundedZoom;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const anchorX = anchor?.clientX ?? centerX;
        const anchorY = anchor?.clientY ?? centerY;

        setPan((prevPan) => {
          const relativeX = anchorX - centerX;
          const relativeY = anchorY - centerY;
          return {
            x: relativeX - ((relativeX - prevPan.x) / prevZoom) * boundedZoom,
            y: relativeY - ((relativeY - prevPan.y) / prevZoom) * boundedZoom,
          };
        });
        return boundedZoom;
      });
    },
    [fitMode],
  );

  const zoomIn = useCallback(
    (anchor?: { clientX: number; clientY: number }) => {
      zoomTo(zoom + ZOOM_STEP, anchor);
    },
    [zoom, zoomTo],
  );

  const zoomOut = useCallback(
    (anchor?: { clientX: number; clientY: number }) => {
      zoomTo(zoom - ZOOM_STEP, anchor);
    },
    [zoom, zoomTo],
  );

  const applyZoomPreset = useCallback(
    (preset: (typeof ZOOM_PRESETS)[number]) => {
      zoomTo(preset / 100);
    },
    [zoomTo],
  );

  const nudgePan = useCallback((dx: number, dy: number) => {
    setFitMode('actual');
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const rotateLeft = useCallback(() => {
    setRotation((prev) => prev - 90);
  }, []);

  const rotateRight = useCallback(() => {
    setRotation((prev) => prev + 90);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      if (event.deltaY < 0) {
        zoomIn({ clientX: event.clientX, clientY: event.clientY });
        return;
      }
      zoomOut({ clientX: event.clientX, clientY: event.clientY });
    },
    [zoomIn, zoomOut],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      setDragging(true);
    },
    [pan.x, pan.y],
  );

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    setFitMode('actual');
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + deltaX,
      y: dragStartRef.current.panY + deltaY,
    });
  }, []);

  const clearDragState = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
          event.preventDefault();
          resetView();
          break;
        case 'f':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 'r':
          event.preventDefault();
          rotateRight();
          break;
        case 'l':
          event.preventDefault();
          rotateLeft();
          break;
        case 'h':
          event.preventDefault();
          setFlipHorizontal((prev) => !prev);
          break;
        case 'v':
          event.preventDefault();
          setFlipVertical((prev) => !prev);
          break;
        case 'arrowleft':
          if (hasPrev && onPrev) {
            event.preventDefault();
            onPrev();
          } else {
            event.preventDefault();
            nudgePan(PAN_STEP, 0);
          }
          break;
        case 'arrowright':
          if (hasNext && onNext) {
            event.preventDefault();
            onNext();
          } else {
            event.preventDefault();
            nudgePan(-PAN_STEP, 0);
          }
          break;
        case 'arrowup':
          event.preventDefault();
          nudgePan(0, PAN_STEP);
          break;
        case 'arrowdown':
          event.preventDefault();
          nudgePan(0, -PAN_STEP);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    hasNext,
    hasPrev,
    nudgePan,
    onNext,
    onPrev,
    resetView,
    rotateLeft,
    rotateRight,
    toggleFullscreen,
    zoomIn,
    zoomOut,
  ]);

  const fitModeClass = useMemo(() => {
    if (fitMode === 'width') return 'w-full max-h-none';
    if (fitMode === 'actual') return 'max-w-none max-h-none w-auto h-auto';
    return 'max-w-full max-h-full';
  }, [fitMode]);

  const cursorClass = dragging ? 'cursor-grabbing' : 'cursor-grab';

  return (
    <div
      ref={containerRef}
      data-testid="image-viewer"
      data-zoom={Math.round(zoom * 100)}
      data-rotation={rotation}
      data-flip-horizontal={String(flipHorizontal)}
      data-flip-vertical={String(flipVertical)}
      data-pan-x={Math.round(pan.x)}
      data-pan-y={Math.round(pan.y)}
      className="relative w-full h-full bg-black/40 rounded-xl overflow-hidden border border-white/10"
    >
      <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full bg-black/55 text-white text-xs">
        {Math.round(zoom * 100)}%
        {naturalSize.width > 0 ? ` • ${naturalSize.width}×${naturalSize.height}` : ''}
      </div>

      {(hasPrev || hasNext) && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          {hasPrev && onPrev && (
            <button
              type="button"
              onClick={onPrev}
              data-testid="image-prev"
              className="p-2 rounded-full bg-black/55 hover:bg-black/70 text-white transition-colors"
              title="Previous image"
              aria-label="Previous image"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          {hasNext && onNext && (
            <button
              type="button"
              onClick={onNext}
              data-testid="image-next"
              className="p-2 rounded-full bg-black/55 hover:bg-black/70 text-white transition-colors"
              title="Next image"
              aria-label="Next image"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div
        data-testid="image-canvas"
        className={`w-full h-full flex items-center justify-center p-6 sm:p-8 select-none ${cursorClass}`}
        style={{ touchAction: 'none' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={clearDragState}
        onPointerCancel={clearDragState}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={(event) =>
            setNaturalSize({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }
          className={`${fitModeClass} rounded-sm shadow-2xl pointer-events-none`}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) rotate(${rotation}deg) scale(${
              zoom * (flipHorizontal ? -1 : 1)
            }, ${zoom * (flipVertical ? -1 : 1)})`,
            transformOrigin: 'center center',
            transition: dragging ? 'none' : 'transform 120ms ease-out',
          }}
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center flex-wrap justify-center gap-1 p-2 rounded-xl bg-black/60 text-white border border-white/15 backdrop-blur">
          <button
            type="button"
            data-testid="image-zoom-out"
            onClick={zoomOut}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Zoom out (-)"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="image-zoom-in"
            onClick={zoomIn}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 px-1">
            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                data-testid={`image-zoom-preset-${preset}`}
                onClick={() => applyZoomPreset(preset)}
                className={`px-2 py-1 text-[11px] rounded-md transition-colors ${
                  Math.round(zoom * 100) === preset ? 'bg-white/30' : 'hover:bg-white/15'
                }`}
                title={`Set zoom to ${preset}%`}
                aria-label={`Set zoom to ${preset}%`}
              >
                {preset}%
              </button>
            ))}
          </div>
          <span className="w-px h-6 bg-white/20 mx-1" />
          <button
            type="button"
            data-testid="image-fit-contain"
            onClick={() => applyFitMode('contain')}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Fit to screen"
            aria-label="Fit to screen"
          >
            <Scan className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="image-fit-width"
            onClick={() => applyFitMode('width')}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Fit width"
            aria-label="Fit width"
          >
            <Expand className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="image-actual-size"
            onClick={() => applyFitMode('actual')}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Actual size"
            aria-label="Actual size"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <span className="w-px h-6 bg-white/20 mx-1" />
          <button
            type="button"
            data-testid="image-rotate-left"
            onClick={rotateLeft}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Rotate left (L)"
            aria-label="Rotate left"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="image-rotate-right"
            onClick={rotateRight}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Rotate right (R)"
            aria-label="Rotate right"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="image-flip-horizontal"
            onClick={() => setFlipHorizontal((prev) => !prev)}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Flip horizontal (H)"
            aria-label="Flip horizontal"
          >
            <FlipHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="image-flip-vertical"
            onClick={() => setFlipVertical((prev) => !prev)}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Flip vertical (V)"
            aria-label="Flip vertical"
          >
            <FlipVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="image-reset"
            onClick={resetView}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Reset view (0)"
            aria-label="Reset view"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="image-fullscreen"
            onClick={toggleFullscreen}
            className="p-2 rounded-md hover:bg-white/15 transition-colors"
            title="Toggle fullscreen (F)"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

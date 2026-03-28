import { useRef, useCallback, useMemo, useState } from 'react';
import type { ContentSchemaSlot, Item } from '../../types';
import ImageSlot from './ImageSlot';
import VideoSlot from './VideoSlot';
import TextSlot from './TextSlot';
import { VideoSyncContext, type VideoSyncController } from './VideoSyncContext';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg']);

function inferType(path: string): 'image' | 'video' | 'text' {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  return 'text';
}

function mediaUrl(jobId: string, path: string): string {
  return `/api/media/${jobId}/${path}`;
}

/**
 * Adaptive column count for the media grid.
 *
 * n=1 → 1   n=2 → 2   n=3 → 3
 * n=4 → 2 (2×2)   n=5,6 → 3   n≥7 → min(6, n)
 */
function mediaCols(n: number): number {
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 2;
  if (n <= 6) return 3;
  return Math.min(6, n);
}

interface ContentGridProps {
  jobId: string;
  item: Item;
  contentSchema: ContentSchemaSlot[];
}

export default function ContentGrid({ jobId, item, contentSchema }: ContentGridProps) {
  // ── Slot classification ────────────────────────────────────────────
  const slots = contentSchema.map((schemaSlot, idx) => {
    const path = item.content_paths[idx] ?? '';
    return {
      key: schemaSlot.slot,
      path,
      type: path ? inferType(path) : ('text' as const),
      url: path ? mediaUrl(jobId, path) : '',
      label: schemaSlot.slot.replace(/_/g, ' '),
    };
  });

  const textSlots = slots.filter(s => s.type === 'text' && s.path);
  const mediaSlots = slots.filter(s => s.type !== 'text' && s.path);

  const hasText = textSlots.length > 0;
  const hasMedia = mediaSlots.length > 0;

  // ── Video sync controller ──────────────────────────────────────────
  const videoRefsRef = useRef<Set<HTMLVideoElement>>(new Set());
  const [isPlaying, setIsPlaying] = useState(false);

  const register = useCallback((el: HTMLVideoElement) => {
    videoRefsRef.current.add(el);
    const onEnded = () => {
      // If all videos finished, flip button back to "Play All"
      const allDone = [...videoRefsRef.current].every(v => v.ended || v.paused);
      if (allDone) setIsPlaying(false);
    };
    el.addEventListener('ended', onEnded);
    // Store cleanup on the element so unregister can remove it
    (el as HTMLVideoElement & { _onEnded?: () => void })._onEnded = onEnded;
  }, []);

  const unregister = useCallback((el: HTMLVideoElement) => {
    const typed = el as HTMLVideoElement & { _onEnded?: () => void };
    if (typed._onEnded) el.removeEventListener('ended', typed._onEnded);
    videoRefsRef.current.delete(el);
  }, []);

  const onSeek = useCallback((time: number, source: HTMLVideoElement) => {
    videoRefsRef.current.forEach(v => {
      if (v !== source && Math.abs(v.currentTime - time) > 0.05) {
        v.currentTime = time;
      }
    });
  }, []);

  const syncController: VideoSyncController = useMemo(
    () => ({ register, unregister, onSeek }),
    [register, unregister, onSeek],
  );

  const handleTogglePlay = () => {
    if (isPlaying) {
      videoRefsRef.current.forEach(v => v.pause());
      setIsPlaying(false);
    } else {
      videoRefsRef.current.forEach(v => v.play().catch(() => {}));
      setIsPlaying(true);
    }
  };

  const isMultiVideo = mediaSlots.filter(s => s.type === 'video').length >= 2;
  const cols = mediaCols(mediaSlots.length);

  // ── Sub-renders ────────────────────────────────────────────────────
  const textZone = hasText && (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(textSlots.length, 6)}, 1fr)`,
        gap: 12,
        flexShrink: 0,
        height: 160,
      }}
    >
      {textSlots.map(s => (
        <TextSlot key={s.key} src={s.url} label={s.label} />
      ))}
    </div>
  );

  const syncBar = isMultiVideo && (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        borderRadius: 8,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-text-muted)',
        }}
      >
        Sync
      </span>
      <button
        onClick={handleTogglePlay}
        style={{
          padding: '4px 16px',
          borderRadius: 6,
          border: '1px solid var(--color-border)',
          background: isPlaying ? 'var(--color-surface)' : 'var(--color-accent)',
          color: isPlaying ? 'var(--color-text)' : '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
          minWidth: 100,
        }}
      >
        {isPlaying ? '⏸ Pause All' : '▶ Play All'}
      </button>
      <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
        Scrubbing one video seeks all others.
      </span>
    </div>
  );

  const mediaGrid = hasMedia && (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 12,
        overflowY: mediaSlots.length > 6 ? 'auto' : undefined,
        minHeight: 0,
        flex: 1,
      }}
    >
      {mediaSlots.map(s => {
        if (s.type === 'image') return <ImageSlot key={s.key} src={s.url} label={s.label} />;
        return <VideoSlot key={s.key} src={s.url} label={s.label} />;
      })}
    </div>
  );

  const mediaZone = hasMedia && (
    <VideoSyncContext.Provider value={syncController}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {syncBar}
        {mediaGrid}
      </div>
    </VideoSyncContext.Provider>
  );

  // ── Root layout ────────────────────────────────────────────────────
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {textZone}
      {mediaZone}
    </div>
  );
}

import { useRef, useCallback, useMemo } from 'react';
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

interface ContentGridProps {
  jobId: string;
  item: Item;
  contentSchema: ContentSchemaSlot[];
}

export default function ContentGrid({ jobId, item, contentSchema }: ContentGridProps) {
  const cols = Math.max(1, contentSchema.length);

  // Determine if we have multiple videos for sync
  const slots = contentSchema.map((schemaSlot, idx) => ({
    schemaSlot,
    path: item.content_paths[idx] ?? '',
    type: item.content_paths[idx] ? inferType(item.content_paths[idx]) : ('text' as const),
    url: item.content_paths[idx] ? mediaUrl(jobId, item.content_paths[idx]) : '',
    label: schemaSlot.slot.replace(/_/g, ' '),
  }));

  const videoCount = slots.filter(s => s.type === 'video').length;
  const isMultiVideo = videoCount >= 2;

  // Video sync controller
  const videoRefsRef = useRef<Set<HTMLVideoElement>>(new Set());

  const register = useCallback((el: HTMLVideoElement) => {
    videoRefsRef.current.add(el);
  }, []);

  const unregister = useCallback((el: HTMLVideoElement) => {
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

  const handlePlayAll = () => {
    videoRefsRef.current.forEach(v => v.play().catch(() => {}));
  };

  const handlePauseAll = () => {
    videoRefsRef.current.forEach(v => v.pause());
  };

  const grid = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(240px, 1fr))`,
        gap: 12,
        height: isMultiVideo ? 'calc(100% - 44px)' : '100%',
      }}
    >
      {slots.map(({ schemaSlot, path, type, url, label }) => {
        if (!path) return <div key={schemaSlot.slot} />;
        if (type === 'image') return <ImageSlot key={schemaSlot.slot} src={url} label={label} />;
        if (type === 'video') return <VideoSlot key={schemaSlot.slot} src={url} label={label} />;
        return <TextSlot key={schemaSlot.slot} src={url} label={label} />;
      })}
    </div>
  );

  if (!isMultiVideo) {
    return grid;
  }

  return (
    <VideoSyncContext.Provider value={syncController}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
        {/* Sync bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
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
              marginRight: 4,
            }}
          >
            Sync
          </span>
          <button
            onClick={handlePlayAll}
            title="Play all videos simultaneously"
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ▶ Play All
          </button>
          <button
            onClick={handlePauseAll}
            title="Pause all videos"
            style={{
              padding: '4px 14px',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⏸ Pause All
          </button>
          <span style={{ fontSize: 11, color: 'var(--color-text-faint)', marginLeft: 4 }}>
            Scrubbing one video seeks all others to the same position.
          </span>
        </div>
        {grid}
      </div>
    </VideoSyncContext.Provider>
  );
}

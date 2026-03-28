import type { ContentSchemaSlot, Item } from '../../types';
import ImageSlot from './ImageSlot';
import VideoSlot from './VideoSlot';
import TextSlot from './TextSlot';

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

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(240px, 1fr))`,
        gap: 12,
        height: '100%',
      }}
    >
      {contentSchema.map((schemaSlot, idx) => {
        const path = item.content_paths[idx] ?? '';
        if (!path) return <div key={schemaSlot.slot} />;

        const type = inferType(path);
        const url = mediaUrl(jobId, path);
        const label = schemaSlot.slot.replace(/_/g, ' ');

        if (type === 'image') return <ImageSlot key={schemaSlot.slot} src={url} label={label} />;
        if (type === 'video') return <VideoSlot key={schemaSlot.slot} src={url} label={label} />;
        return <TextSlot key={schemaSlot.slot} src={url} label={label} />;
      })}
    </div>
  );
}

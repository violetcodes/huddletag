import { Link } from 'react-router-dom';
import type { Item } from '../../types';

interface ItemListProps {
  jobId: string;
  items: Item[];
  currentItemId: string | undefined;
}

export default function ItemList({ jobId, items, currentItemId }: ItemListProps) {
  return (
    <div>
      {items.map((item, idx) => {
        const isActive = item.item_id === currentItemId;
        return (
          <Link
            key={item.item_id}
            to={`/jobs/${jobId}/items/${item.item_id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              backgroundColor: isActive ? 'rgba(79,70,229,0.18)' : 'transparent',
              borderRight: `3px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
              color: isActive ? 'var(--color-border)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              fontSize: 13,
              transition: 'background-color 0.1s',
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: `2px solid ${item.is_annotated ? 'var(--color-success)' : 'var(--color-sidebar-dim)'}`,
                backgroundColor: item.is_annotated ? 'var(--color-success)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 10,
                color: 'var(--color-surface)',
                fontWeight: 700,
              }}
            >
              {item.is_annotated ? '✓' : ''}
            </span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              <span style={{ color: 'var(--color-sidebar-dim)', marginRight: 4, fontSize: 11 }}>
                {idx + 1}.
              </span>
              {item.item_id}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

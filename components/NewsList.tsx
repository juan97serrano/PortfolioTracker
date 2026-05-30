import { ExternalLink } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { NewsItem } from '@/lib/types';

interface Props {
  items: NewsItem[];
}

export function NewsList({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        No hay noticias recientes disponibles para este activo.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {items.map(item => (
        <li key={item.id} className="py-3 first:pt-0 last:pb-0">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex gap-3 items-start"
          >
            {item.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnail}
                alt=""
                className="h-14 w-14 flex-shrink-0 rounded-lg object-cover bg-gray-100"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {item.title}
                <ExternalLink className="inline-block h-3 w-3 ml-1 text-gray-400 align-text-top" />
              </div>
              <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                {item.publisher && <span className="truncate">{item.publisher}</span>}
                {item.publisher && <span className="text-gray-300">·</span>}
                <span className="whitespace-nowrap">{formatRelativeTime(item.publishedAt)}</span>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

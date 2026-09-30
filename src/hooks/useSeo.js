import { useEffect } from 'react';

export function useSeo(title, description) {
  useEffect(() => {
    document.title = title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
      let og = document.querySelector('meta[property="og:title"]');
      if (og) og.content = title;
    }
  }, [title, description]);
}

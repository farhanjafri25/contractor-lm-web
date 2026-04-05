'use client';

import { useEffect, useState } from 'react';

const HOVER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';

export function useCanHoverPopover() {
  const [canHoverPopover, setCanHoverPopover] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(HOVER_MEDIA_QUERY);
    const updateMatch = () => setCanHoverPopover(mediaQueryList.matches);

    updateMatch();

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', updateMatch);
      return () => mediaQueryList.removeEventListener('change', updateMatch);
    }

    mediaQueryList.addListener(updateMatch);
    return () => mediaQueryList.removeListener(updateMatch);
  }, []);

  return canHoverPopover;
}

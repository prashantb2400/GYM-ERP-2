'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  React.useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    ) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((err) => console.error('SW: Service worker registration failed:', err));
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

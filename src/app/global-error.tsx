'use client';

// import * as Sentry from '@sentry/nextjs'; // Uncomment after: npm install @sentry/nextjs
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Sentry.captureException(error); // Uncomment after installing @sentry/nextjs
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html>
      <body className="bg-zinc-950 text-zinc-50 flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-6">Our team has been notified. Please try again.</p>
          <button
            onClick={reset}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}

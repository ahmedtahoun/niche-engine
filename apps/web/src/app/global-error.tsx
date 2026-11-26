'use client';

// Last-resort error page: reports React rendering errors to Sentry, then shows Next.js's default error screen.
import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* The App Router has no status codes here, so 0 shows the generic error message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}

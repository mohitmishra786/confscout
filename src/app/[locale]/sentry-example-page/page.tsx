'use client';

// Title is provided by this route's layout.tsx metadata export —
// `next/head` is ignored in the App Router.

export default function SentryExamplePage() {
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      lineHeight: '1.6',
      maxWidth: '600px',
      margin: '40px auto',
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px',
    }}>
      <h1>Sentry Next.js Example Page</h1>

      <p>
        This page demonstrates how to use Sentry with Next.js.
      </p>

      <section style={{ marginBottom: '20px' }}>
        <h2>Client-side Error</h2>
        <button
          type="button"
          onClick={() => {
            throw new Error('Sentry Client-side Test Error');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#e02929',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Throw Error
        </button>
      </section>

      <section>
        <h2>Server-side Error</h2>
        <p>
          Clicking the button below will trigger a request to <code>/api/sentry-example-api</code>,
          which will throw an error on the server.
        </p>
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/sentry-example-api');
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#e02929',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Call API
        </button>
      </section>
    </div>
  );
}
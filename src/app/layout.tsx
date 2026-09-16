import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Narra",
  description: "Application de création et gestion d'œuvres narratives",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen">
        <Script id="narra-disable-realtime" strategy="beforeInteractive">{`
          (() => {
            // Temporary stability guard: disable WebSocket entirely.
            class DisabledWebSocket {
              static CONNECTING = 0;
              static OPEN = 1;
              static CLOSING = 2;
              static CLOSED = 3;
              CONNECTING = 0;
              OPEN = 1;
              CLOSING = 2;
              CLOSED = 3;
              readyState = 3;
              bufferedAmount = 0;
              extensions = "";
              protocol = "";
              binaryType = "blob";
              url = "";
              onopen = null;
              onmessage = null;
              onerror = null;
              onclose = null;
              constructor(url) { this.url = String(url || ""); }
              close() {}
              send() {}
              addEventListener() {}
              removeEventListener() {}
              dispatchEvent() { return true; }
            }
            window.WebSocket = DisabledWebSocket;

            // Temporary stability guard: completely disable reader progress API.
            // The visual progress bar remains local and does not generate network traffic.
            const nativeFetch = window.fetch.bind(window);
            window.fetch = (input, init) => {
              const rawUrl = typeof input === "string"
                ? input
                : input instanceof URL
                  ? input.href
                  : input?.url || "";
              const url = new URL(rawUrl, window.location.origin);

              if (/^\\/api\\/projects\\/[^/]+\\/progress$/.test(url.pathname)) {
                const method = (init?.method || (typeof input !== "string" && !(input instanceof URL) ? input?.method : "GET") || "GET").toUpperCase();

                if (method === "GET") {
                  return Promise.resolve(new Response(JSON.stringify({ blockId: null, sceneId: null, percentage: 0 }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                  }));
                }

                return Promise.resolve(new Response(null, { status: 204 }));
              }

              return nativeFetch(input, init);
            };
          })();
        `}</Script>
        {children}
      </body>
    </html>
  );
}

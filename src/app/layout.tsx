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
        <Script id="narra-disable-websocket" strategy="beforeInteractive">{`
          (() => {
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
          })();
        `}</Script>
        {children}
      </body>
    </html>
  );
}

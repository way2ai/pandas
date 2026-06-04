import type { ReactNode } from "react";

import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <a href="/app">App</a>
            <a href="/tenant">Tenant</a>
            <a href="/admin">Admin</a>
            <a href="/login">Login</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

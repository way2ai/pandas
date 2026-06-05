import type { ReactNode } from "react";

import "./globals.css";
import { SessionShell } from "./session-shell";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionShell>{children}</SessionShell>
      </body>
    </html>
  );
}

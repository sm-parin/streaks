import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Streaks",
  description: "Build consistent daily habits with visual streak tracking",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Streaks",
  },
};

export const viewport: Viewport = {
  themeColor: "#F07F13",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Inline script injected into <head> to read the stored theme preference
 * and apply it synchronously, preventing a flash of the wrong theme on load.
 * Must execute before the browser paints, hence dangerouslySetInnerHTML.
 */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('streaks-theme') || 'system';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
`;

/**
 * Root layout ΓÇô wraps every page with theme and toast providers.
 * suppressHydrationWarning on <html> prevents React from warning about
 * the data-theme attribute set by the inline script before hydration.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

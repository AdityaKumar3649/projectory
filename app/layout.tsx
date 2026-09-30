import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { AuthProvider } from "@/components/auth/providers";
import { ThemeScript } from "@/components/ui/theme-toggle";
import { clerkEnabled } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Projectory — showcase what you build",
    template: "%s · Projectory",
  },
  description:
    "Projectory is where developers, students and indie makers publish the projects they have built and get them in front of people who care.",
};

export const viewport: Viewport = {
  // Both palettes are authored, so opt out of the automatic canvas flip rather
  // than letting the browser force its own colour scheme.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <head>
        {/* Must run before first paint, or dark-mode visitors see a white flash. */}
        <ThemeScript />
      </head>
      <body className="min-h-full bg-base text-ink antialiased">
        <AuthProvider enabled={clerkEnabled}>{children}</AuthProvider>
      </body>
    </html>
  );
}

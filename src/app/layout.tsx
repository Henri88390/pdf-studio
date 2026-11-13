import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paperwork — PDF editor",
  description: "A private, browser-based PDF workspace.",
  icons: { icon: { url: "/file.svg", type: "image/svg+xml" } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

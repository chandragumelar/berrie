import type { Metadata } from "next";
import "./globals.css";
import "./cashier-ui.css";

export const metadata: Metadata = {
  title: "Berrie · Prototipe Kasir",
  description: "Prototipe interaktif Berrie untuk evaluasi visual dan alur kasir. Data contoh.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}

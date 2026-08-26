import type { Metadata } from "next";
import { CursorMagic } from "@/components/site/cursor-magic";
import { ScrollReveal } from "@/components/site/scroll-reveal";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkazKIDS",
  description: "Персональные вечерние сериалы для детей, которые продолжаются одной кнопкой.",
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-theme="dark">
      <body>
        <CursorMagic />
        <ScrollReveal />
        <div className="min-h-screen">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

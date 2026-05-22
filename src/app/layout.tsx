import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/shared/BottomNav";

export const metadata: Metadata = {
  title: "hangout buddy 🎉",
  description: "find your people for anything",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-full bg-gray-50 antialiased">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}

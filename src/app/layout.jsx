import "./globals.css";
import { BottomNav } from "@/components/shared/BottomNav";

export const metadata = {
  title: "hangout buddy",
  description: "find your people for anything",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full bg-gray-50 antialiased">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}

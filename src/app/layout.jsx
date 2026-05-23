import "./globals.css";
import { BottomNav } from "@/components/shared/BottomNav";
import { Outfit } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata = {
  title: "hangout buddy",
  description: "find your people for anything",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`min-h-full bg-gray-50 antialiased ${outfit.className}`}>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}

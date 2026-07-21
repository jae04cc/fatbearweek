import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { AuthGuard } from "@/components/AuthGuard";
import { NavBar } from "@/components/ui/NavBar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fat Bear Week",
  description: "Bracket pool for Fat Bear Week",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d1410",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen text-neutral-100 antialiased">
        <SessionProvider>
          <AuthGuard>
            <NavBar />
            <div className="mx-auto max-w-2xl min-h-screen flex flex-col">
              <div className="flex-1 pb-20 sm:pb-0">{children}</div>
            </div>
          </AuthGuard>
        </SessionProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopHeader from "@/components/TopHeader";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MPLADS AI Risk Intelligence · Team Vanguard",
  description: "AI-powered risk intelligence platform for MPLADS monitoring by Team Vanguard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TopHeader />
        <div className="flex flex-1 min-h-[calc(100vh-68px)]">
          <Sidebar />
          <main id="main-content" className="flex-1 flex flex-col p-6 md:p-8 overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

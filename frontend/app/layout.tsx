import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat, Kalam, Architects_Daughter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });
const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});
const architectsDaughter = Architects_Daughter({
  variable: "--font-architects",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "StudyMind AI | Academic Intelligence Platform",
  description:
    "AI-powered personalized academic intelligence for university students. Upload materials, generate notes, quizzes, roadmaps, and ace your exams.",
  keywords: ["AI education", "study assistant", "exam preparation", "university"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${kalam.variable} ${architectsDaughter.variable} min-h-screen font-sans antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}


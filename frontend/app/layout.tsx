import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Process Creation and State Transition Visualizer",
  description: "Next.js frontend for OS process management simulation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">{children}</body>
    </html>
  );
}
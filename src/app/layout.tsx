import type { Metadata } from "next";
import QueryProvider from "@/components/providers/QueryProvider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoGuard AI | GitHub Security Auditor",
  description:
    "AI-powered GitHub and ZIP security auditing for modern development teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light h-full antialiased">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500&family=Hanken+Grotesk:wght@600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body-md text-body-md overflow-x-hidden selection:bg-secondary/20 min-h-full flex flex-col">
        <QueryProvider>
          {children}
          <Toaster position="bottom-right" />
        </QueryProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Character Reference Builder",
  description:
    "Collect AI-drafted character references with electronic signatures.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 min-h-screen font-sans antialiased">
        <div className="mx-auto max-w-2xl px-4 py-10">{children}</div>
      </body>
    </html>
  );
}

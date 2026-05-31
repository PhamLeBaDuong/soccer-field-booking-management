import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth/context";
import { BookingsProvider } from "@/lib/bookings/context";
import { I18nProvider } from "@/lib/i18n/context";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PitchBook",
  description: "Soccer field booking management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} antialiased`}>
        <I18nProvider>
          <AuthProvider>
            <BookingsProvider>
              <ToastProvider>
                <AppShell>{children}</AppShell>
              </ToastProvider>
            </BookingsProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

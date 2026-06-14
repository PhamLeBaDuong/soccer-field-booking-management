import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth/context";
import { BookingsProvider } from "@/lib/bookings/context";
import { I18nProvider } from "@/lib/i18n/context";
import "./globals.css";

// Be Vietnam Pro renders Vietnamese diacritics cleanly and looks good in Latin too.
const appFont = Be_Vietnam_Pro({
  variable: "--font-dm-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
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
      <body className={`${appFont.variable} antialiased`}>
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

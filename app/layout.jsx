import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Retirement Readiness Quiz · Example Quiz Funnel",
  description: "Find out how close you are to retirement in 12 quick questions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <header className="site-header">
          <span className="site-header-mark" aria-hidden="true" />
          <span className="site-header-name">Example Quiz Funnel</span>
        </header>
        {children}
        <footer className="site-footer">
          <p className="test-notice">
            This is an example quiz funnel for demonstration purposes only.{" "}
            <strong>No live traffic is currently being run to this page.</strong>
          </p>
        </footer>
      </body>
    </html>
  );
}

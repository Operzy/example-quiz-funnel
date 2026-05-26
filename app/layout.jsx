import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Retirement Readiness Quiz · Strategy Retirement & Insurance",
  description: "Find out how close you are to retirement in 12 quick questions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <header className="site-header">
          <img
            src="/sri-logo.png"
            alt="Strategy Retirement & Insurance"
            className="site-header-logo"
          />
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

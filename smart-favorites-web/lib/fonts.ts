import { Fraunces, Inter } from "next/font/google";
import localFont from "next/font/local";

export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const fontSerif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const fontSansCjk = localFont({
  src: [
    {
      path: "../public/fonts/noto-sans-sc-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/noto-sans-sc-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/noto-sans-sc-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/noto-sans-sc-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans-cjk",
  display: "swap",
});

export const fontSerifCjk = localFont({
  src: [
    {
      path: "../public/fonts/noto-serif-sc-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/noto-serif-sc-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/noto-serif-sc-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/noto-serif-sc-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-serif-cjk",
  display: "swap",
});

export const fontVariables = [
  fontSans.variable,
  fontSerif.variable,
  fontSansCjk.variable,
  fontSerifCjk.variable,
].join(" ");

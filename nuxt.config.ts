import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

const ogDescription = "It's 2009 and you just got back home from school.";
const metaDescription =
  "Live Andes hantavirus outbreak tracker. Real-time case counts, deaths, and spread across countries, styled after the classic Pandemic 2 flash game.";
const siteUrl = "https://hantavirus.xetera.dev";
const ogImage = `${siteUrl}/pandemic_screenshot.jpg`;

export default defineNuxtConfig({
  ssr: true,
  css: ["~/assets/style.css"],
  runtimeConfig: {
    identityHeaders: {
      "User-Agent": "hantavirus.xetera.dev/1.0",
      From: "contact+hantavirus@xetera.dev",
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      visualizer({
        open: false,
        filename: "/tmp/bundle-stats.html",
        gzipSize: true,
      }),
    ],
  },
  app: {
    head: {
      title: "Hantavirus Tracker",
      htmlAttrs: { lang: "en" },
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        { name: "description", content: metaDescription },
        { property: "og:title", content: "Hantavirus Tracker" },
        { property: "og:description", content: ogDescription },
        { property: "og:url", content: siteUrl },
        { name: "theme-color", content: "#e12d2d" },
        { property: "og:type", content: "website" },
        { property: "og:image", content: ogImage },
        { property: "og:image:width", content: "1923" },
        { property: "og:image:height", content: "1356" },
        { name: "twitter:title", content: "Hantavirus Tracker" },
        { name: "twitter:description", content: ogDescription },
        { name: "twitter:image", content: ogImage },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      script: [
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Hantavirus Tracker",
            url: siteUrl,
            description: metaDescription,
            applicationCategory: "HealthApplication",
            operatingSystem: "All",
            image: ogImage,
          }),
        },
        {
          defer: true,
          src: "https://overtime-contingency.xetera.dev/selfhosted-umami",
          "data-website-id": "9361a4b1-99f6-4046-81c8-aac18ae7df4b",
          "data-performance": "true",
          "data-disclaimer":
            "I selfhost privacy-respecting analytics using umami on my own server. Unlike Google analytics the data isn't shared with anyone else. Feel free to block this subdomain if you're not comfortable with that",
        },
      ],
      link: [
        { rel: "canonical", href: siteUrl },
        { rel: "icon", type: "image/png", href: "/two.png" },
        { rel: "preload", href: "/regions.json", as: "fetch", crossorigin: "" },
        {
          rel: "preload",
          href: "/fonts/nwpStKy2OAdR1K-IwhWudF-R3w8aZejf5Hc.woff2",
          as: "font",
          type: "font/woff2",
          crossorigin: "",
        },
      ],
    },
  },
  routeRules: {
    "/fonts/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
    "/minimap.svg": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
    "/borders.svg": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
    "/regions.json": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
    "/music.opus": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },
  },
  compatibilityDate: "2025-05-09",
});

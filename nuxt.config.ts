import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

const description =
  "Track hantavirus like it's 2009 and you just got back home from school.";

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
      meta: [
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        {
          name: "description",
          content: description,
        },
        {
          property: "og:description",
          content: description,
        },
        { property: "og:image", content: "/pandemic_screenshot.jpg" },
        { name: "twitter:image", content: "/pandemic_screenshot.jpg" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      script: [
        {
          defer: true,
          src: "https://overtime-contingency.xetera.dev/selfhosted-umami",
          "data-website-id": "9361a4b1-99f6-4046-81c8-aac18ae7df4b",
          "data-disclaimer":
            "I selfhost analytics using umami on my own server. Unlike Google analytics the data isn't shared with anyone else. Feel free to block this subdomain if you're not comfortable with that",
        },
      ],
      link: [
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

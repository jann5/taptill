import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TAPTILL",
    short_name: "TAPTILL",
    description: "Tabletowa aplikacja do szybkiej obsługi zamówień gotówkowych.",
    start_url: "/",
    scope: "/",
    display: "fullscreen",
    display_override: ["fullscreen", "standalone"],
    orientation: "any",
    background_color: "#f3f6fd",
    theme_color: "#f3f6fd",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

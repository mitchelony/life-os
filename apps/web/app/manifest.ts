import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life OS",
    short_name: "Life OS",
    description: "A personal operating system for finances, tasks, and life admin.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3ede4",
    theme_color: "#f3ede4",
    icons: [],
  };
}

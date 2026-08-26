import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Salle des Fêtes Louay — Gestion des Réservations",
    short_name: "Salle Louay",
    description: "Gestion interne sécurisée des réservations de la Salle des Fêtes Louay.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ed",
    theme_color: "#123f33",
    orientation: "any",
    icons: [
      { src: "/icons/louay-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/louay-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/louay-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

import { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabase";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ticketmint.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL,               lastModified: new Date(), priority: 1.0, changeFrequency: "daily" },
    { url: `${APP_URL}/guarantee`, lastModified: new Date(), priority: 0.7, changeFrequency: "monthly" },
  ];

  const { data: tickets } = await supabaseServer
    .from("tickets")
    .select("id, updated_at")
    .eq("listing_status", "listed");

  const ticketPages: MetadataRoute.Sitemap = (tickets ?? []).map((t) => ({
    url:             `${APP_URL}/marketplace/${t.id}`,
    lastModified:    new Date(t.updated_at),
    priority:        0.8,
    changeFrequency: "hourly" as const,
  }));

  return [...staticPages, ...ticketPages];
}

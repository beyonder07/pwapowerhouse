import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup/client"],
        disallow: [
          "/owner/",
          "/trainer/",
          "/client/",
          "/api/",
          "/setup/",
          "/signup/trainer",
          "/forgot-password",
          "/offline",
        ],
      },
    ],
    sitemap: "https://pwapowerhouse.vercel.app/sitemap.xml",
  }
}

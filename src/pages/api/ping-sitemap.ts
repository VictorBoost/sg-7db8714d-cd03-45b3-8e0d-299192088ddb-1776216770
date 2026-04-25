import type { NextApiRequest, NextApiResponse } from "next";

/**
 * API endpoint to ping search engines about sitemap updates
 * Call this after creating/updating projects to notify search engines
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sitemapUrl = encodeURIComponent("https://bluetika.co.nz/api/sitemap.xml");
    
    // Ping Google
    const googlePingUrl = `https://www.google.com/ping?sitemap=${sitemapUrl}`;
    const googleResponse = await fetch(googlePingUrl);
    
    // Ping Bing
    const bingPingUrl = `https://www.bing.com/ping?sitemap=${sitemapUrl}`;
    const bingResponse = await fetch(bingPingUrl);

    console.log("Sitemap ping results:", {
      google: googleResponse.ok ? "success" : "failed",
      bing: bingResponse.ok ? "success" : "failed"
    });

    res.status(200).json({ 
      success: true,
      message: "Sitemap ping sent to search engines",
      results: {
        google: googleResponse.ok,
        bing: bingResponse.ok
      }
    });
  } catch (error) {
    console.error("Error pinging sitemap:", error);
    res.status(500).json({ error: "Failed to ping sitemap" });
  }
}
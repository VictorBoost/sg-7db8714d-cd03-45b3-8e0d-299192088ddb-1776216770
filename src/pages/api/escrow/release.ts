import type { NextApiRequest, NextApiResponse } from "next";
import {
  releaseCapturedEscrowToProvider,
  type EscrowReleaseMethod,
} from "@/lib/serverEscrowRelease";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contractId, releaseMethod } = req.body;

  if (!contractId || !releaseMethod) {
    return res.status(400).json({ error: "Contract ID and release method required" });
  }

  if (!["client_approval", "auto_release", "admin_release"].includes(releaseMethod)) {
    return res.status(400).json({ error: "Invalid release method" });
  }

  try {
    const result = await releaseCapturedEscrowToProvider(
      contractId,
      releaseMethod as EscrowReleaseMethod
    );

    if (!result.ok) {
      const status = result.error?.includes("not found") ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      transferId: result.transferId,
    });
  } catch (error) {
    console.error("Payment release error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to release payment",
    });
  }
}
import { withDriverSession } from "../../../lib/session";
import { serverError, badRequest } from "../../../lib/api";

const ANPR_URL = "https://api.anpr.software/v1/detect";

export default withDriverSession(async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image } = req.body || {};
    if (!image) return badRequest(res, "image (base64) is required");

    const apiKey = process.env.ANPR_API_KEY;
    if (!apiKey) return badRequest(res, "ANPR service not configured");

    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const buffer = Buffer.from(base64Data, "base64");

    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: "image/jpeg" }), "plate.jpg");

    const anprRes = await fetch(ANPR_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    const data = await anprRes.json();

    if (!data.success || !data.plates?.length) {
      return res.status(200).json({ plate: null, make: null, model: null, color: null });
    }

    const plate = data.plates[0];
    const plateNumber = plate.text?.plate_number_en || null;
    const make = data.body?.brand?.label || null;
    const rawModel = data.body?.model?.label || null;
    const model = rawModel ? rawModel.split("|").pop()?.replace(/-/g, " ") || rawModel : null;
    const color = data.body?.color?.name || plate.attributes?.color || null;

    return res.status(200).json({ plate: plateNumber, make, model, color });
  } catch (err) {
    return serverError(res, err);
  }
});

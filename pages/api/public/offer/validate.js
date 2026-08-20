import { query } from "../../../../lib/db";
import { badRequest, notFound, serverError, methodNotAllowed } from "../../../../lib/api";
import { rateLimit } from "../../../../lib/rateLimit";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return methodNotAllowed(res);
    if (!rateLimit(req, { max: 10, windowMs: 60000 })) {
      return res.status(429).json({ error: "Too many requests — try again in a minute" });
    }

    const offerId = Number(req.body?.offerId);
    const code = String(req.body?.code || "").trim();
    const cardUid = String(req.body?.cardUid || "").trim();
    if (!offerId || !code) return badRequest(res, "Offer and staff code are required");

    const { rows } = await query(
      "SELECT id, staff_code FROM offers WHERE id = $1 AND live = true AND draft = false",
      [offerId]
    );
    const offer = rows[0];
    if (!offer) return notFound(res, "Offer not found");
    if (!offer.staff_code) return badRequest(res, "This offer has no validation code");

    if (String(offer.staff_code) !== code) {
      return res.status(403).json({ ok: false, validated: false, error: "Incorrect staff code" });
    }

    let orderId = null;
    if (cardUid) {
      const { rows: cards } = await query("SELECT id FROM nfc_cards WHERE uid = $1", [cardUid]);
      if (cards.length) {
        const { rows: orders } = await query(
          "SELECT id FROM orders WHERE card_id = $1 AND status IN ('active','parked','returning') ORDER BY created_at DESC LIMIT 1",
          [cards[0].id]
        );
        orderId = orders[0]?.id || null;
      }
    }

    if (orderId) {
      const { rows: existing } = await query(
        "SELECT id FROM validations WHERE order_id = $1 AND offer_id = $2",
        [orderId, offerId]
      );
      if (!existing.length) {
        await query(
          "INSERT INTO validations (order_id, offer_id, qty, amount) VALUES ($1, $2, 1, 0)",
          [orderId, offerId]
        );
      }
    }

    return res.status(200).json({ ok: true, validated: true });
  } catch (err) {
    return serverError(res, err);
  }
}

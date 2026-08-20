import { query } from "../../../lib/db";
import { withSession } from "../../../lib/session";
import { serverError, badRequest, methodNotAllowed } from "../../../lib/api";
import { broadcast } from "../../../lib/events";

export default withSession(async function handler(req, res) {
  try {
    const id = Number(req.query.id);
    if (!id) return badRequest(res, "Card ID is required");

    if (req.method === "PATCH") {
      const { action } = req.body || {};
      if (action === "block") {
        await query("UPDATE nfc_cards SET status = 'blocked' WHERE id = $1", [id]);
        const { rows: c } = await query("SELECT uid, property_id FROM nfc_cards WHERE id=$1", [id]);
        broadcast("nfc.card.blocked", { propertyId: c[0]?.property_id, cardUid: c[0]?.uid, timestamp: new Date().toISOString() });
        return res.status(200).json({ ok: true, status: "blocked" });
      }
      if (action === "unblock") {
        await query("UPDATE nfc_cards SET status = 'ready' WHERE id = $1", [id]);
        const { rows: c } = await query("SELECT uid, property_id FROM nfc_cards WHERE id=$1", [id]);
        broadcast("nfc.card.unblocked", { propertyId: c[0]?.property_id, cardUid: c[0]?.uid, timestamp: new Date().toISOString() });
        return res.status(200).json({ ok: true, status: "ready" });
      }
      return badRequest(res, "action must be 'block' or 'unblock'");
    }

    return methodNotAllowed(res);
  } catch (err) {
    return serverError(res, err);
  }
});

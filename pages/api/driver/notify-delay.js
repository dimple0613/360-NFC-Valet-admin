import { query } from "../../../lib/db";
import { withDriverSession } from "../../../lib/session";
import { serverError, badRequest, notFound } from "../../../lib/api";
import { broadcast } from "../../../lib/events";

export default withDriverSession(async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { orderId } = req.body || {};
      if (!orderId) return badRequest(res, "orderId is required");

      const { rows } = await query(
        "SELECT id, property_id, card_id FROM orders WHERE id = $1 AND status = 'returning'",
        [orderId]
      );
      if (!rows[0]) return notFound(res, "No active return request found");

      broadcast("valet.delay.notified", {
        propertyId: rows[0].property_id,
        orderId,
        driverId: req.session.driverId,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return serverError(res, err);
  }
});

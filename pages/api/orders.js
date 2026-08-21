import { query } from "../../lib/db";
import { withSession } from "../../lib/session";
import { serverError, startOfDay } from "../../lib/api";

export default withSession(async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 1));
    const propertyId =
      req.query.property && req.query.property !== "all"
        ? Number(req.query.property)
        : null;

    const start = new Date(startOfDay(new Date()).getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const end = new Date(startOfDay(new Date()).getTime() + 24 * 60 * 60 * 1000);

    const propClause = propertyId ? "AND o.property_id = $3" : "";
    const params = [start, end, ...(propertyId ? [propertyId] : [])];

    const { rows } = await query(
      `SELECT o.id, o.plate, o.car_make, o.car_model, o.car_color, o.zone, o.slot,
              o.status, o.created_at, o.dropped_at, o.returned_at, o.guest_eta,
              p.name AS property,
              d.full_name AS driver,
              c.uid AS card_uid,
              (SELECT COUNT(*)::int FROM validations v WHERE v.order_id = o.id) AS validations
       FROM orders o
       JOIN properties p ON p.id = o.property_id
       LEFT JOIN drivers d ON d.id = o.driver_id
       LEFT JOIN nfc_cards c ON c.id = o.card_id
       WHERE o.created_at >= $1 AND o.created_at < $2 ${propClause}
       ORDER BY o.created_at DESC
       LIMIT 500`,
      params
    );

    const orders = rows.map((o) => ({
      id: o.id,
      plate: o.plate,
      car: [o.car_color, o.car_make, o.car_model].filter(Boolean).join(" "),
      zone: o.zone,
      slot: o.slot,
      status: o.status,
      createdAt: o.created_at,
      droppedAt: o.dropped_at,
      returnedAt: o.returned_at,
      guestEta: o.guest_eta,
      property: o.property,
      driver: o.driver || "—",
      cardUid: o.card_uid,
      validations: o.validations,
    }));

    return res.status(200).json({ orders });
  } catch (err) {
    return serverError(res, err);
  }
});

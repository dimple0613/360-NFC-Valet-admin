import { query } from "../../../lib/db";
import { withDriverSession } from "../../../lib/session";
import { serverError, startOfDay } from "../../../lib/api";

export default withDriverSession(async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const driverId = req.session.driverId;
    const propertyId = req.session.propertyId;
    const today = startOfDay(new Date());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const { rows: statsRows } = await query(
      `SELECT
        COUNT(*)::int AS parked_today,
        COUNT(*) FILTER (WHERE o.status = 'returning' OR o.status = 'retrieving')::int AS returns_pending,
        ROUND(AVG(EXTRACT(EPOCH FROM (o.returned_at - o.dropped_at)) / 60))::int AS avg_min
       FROM orders o
       WHERE o.driver_id = $1 AND o.created_at >= $2 AND o.created_at < $3`,
      [driverId, today, tomorrow]
    );

    const stats = statsRows[0] || { parked_today: 0, returns_pending: 0, avg_min: 0 };

    const { rows: queueRows } = await query(
      `SELECT o.id, o.plate, o.car_make, o.car_model, o.car_color, o.zone, o.slot,
              o.status, o.guest_eta, o.created_at,
              c.uid AS card_uid
       FROM orders o
       LEFT JOIN nfc_cards c ON c.id = o.card_id
       WHERE o.property_id = $1
         AND o.status IN ('active','parked','returning','retrieving')
         AND o.created_at >= $2
       ORDER BY
         CASE o.status WHEN 'returning' THEN 0 WHEN 'retrieving' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,
         o.guest_eta NULLS LAST, o.created_at
       LIMIT 20`,
      [propertyId, today]
    );

    const queue = queueRows.map((o) => ({
      id: o.id,
      plate: o.plate,
      car: [o.car_color, o.car_make, o.car_model].filter(Boolean).join(" "),
      zone: o.zone,
      slot: o.slot,
      status: o.status,
      guestEta: o.guest_eta,
      createdAt: o.created_at,
      cardUid: o.card_uid,
    }));

    return res.status(200).json({
      stats: {
        parkedToday: stats.parked_today,
        returnsPending: stats.returns_pending,
        avgReturnMin: stats.avg_min || 0,
      },
      queue,
    });
  } catch (err) {
    return serverError(res, err);
  }
});

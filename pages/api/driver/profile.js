import { query } from "../../../lib/db";
import { withDriverSession } from "../../../lib/session";
import { serverError, startOfDay } from "../../../lib/api";

export default withDriverSession(async function handler(req, res) {
  try {
    const driverId = req.session.driverId;

    if (req.method === "GET") {
      const today = startOfDay(new Date());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const { rows } = await query(
        `SELECT d.id, d.valet_id, d.full_name, d.initials, d.avatar_color,
                d.email, d.phone, d.status, d.shift_started_at, d.property_id,
                p.name AS property_name,
                (SELECT COUNT(*)::int FROM orders o
                   WHERE o.driver_id = d.id AND o.created_at >= $1 AND o.created_at < $2) AS today_orders,
                (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (o.returned_at - o.dropped_at)) / 60))::int FROM orders o
                   WHERE o.driver_id = d.id AND o.returned_at >= $1 AND o.returned_at < $2
                     AND o.dropped_at IS NOT NULL) AS avg_min
         FROM drivers d
         JOIN properties p ON p.id = d.property_id
         WHERE d.id = $3`,
        [today, tomorrow, driverId]
      );
      const driver = rows[0];
      if (!driver) return res.status(404).json({ error: "Driver not found" });

      return res.status(200).json({
        driver: {
          id: driver.id,
          valetId: driver.valet_id,
          fullName: driver.full_name,
          initials: driver.initials,
          avatarColor: driver.avatar_color,
          email: driver.email,
          phone: driver.phone,
          status: driver.status,
          shiftStartedAt: driver.shift_started_at,
          propertyId: driver.property_id,
          propertyName: driver.property_name,
          todayOrders: driver.today_orders,
          avgReturnMin: driver.avg_min || 0,
        },
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return serverError(res, err);
  }
});

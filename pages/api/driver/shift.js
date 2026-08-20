import { query } from "../../../lib/db";
import { withDriverSession, setDriverSessionCookie } from "../../../lib/session";
import { serverError, badRequest } from "../../../lib/api";
import { broadcast } from "../../../lib/events";

export default withDriverSession(async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const driverId = req.session.driverId;
    const { onShift, propertyId } = req.body || {};

    if (typeof onShift !== "boolean") {
      return badRequest(res, "onShift boolean is required");
    }

    if (onShift) {
      if (propertyId) {
        await query(
          "UPDATE drivers SET status = 'on_shift', shift_started_at = NOW(), property_id = $1 WHERE id = $2",
          [propertyId, driverId]
        );
      } else {
        await query(
          "UPDATE drivers SET status = 'on_shift', shift_started_at = NOW() WHERE id = $1",
          [driverId]
        );
      }
    } else {
      const { rows: activeOrders } = await query(
        "SELECT COUNT(*)::int AS cnt FROM orders WHERE driver_id = $1 AND status IN ('active','parked','returning','retrieving')",
        [driverId]
      );
      if (activeOrders[0]?.cnt > 0) {
        return badRequest(res, `Cannot end shift — ${activeOrders[0].cnt} order(s) still active. Complete or transfer them first.`);
      }
      await query(
        "UPDATE drivers SET status = 'off_duty', shift_started_at = NULL WHERE id = $1",
        [driverId]
      );
    }

    const { rows } = await query(
      "SELECT status, shift_started_at FROM drivers WHERE id = $1",
      [driverId]
    );

    if (onShift && propertyId) {
      setDriverSessionCookie(res, {
        driverId: req.session.driverId,
        valetId: req.session.valetId,
        propertyId,
      });
    }

    const { rows: driverRows } = await query(
      "SELECT full_name FROM drivers WHERE id = $1",
      [driverId]
    );

    broadcast(onShift ? "driver.shift.started" : "driver.shift.ended", {
      propertyId: onShift ? (propertyId || req.session.propertyId) : req.session.propertyId,
      driverId,
      driverName: driverRows[0]?.full_name || "",
      valetId: req.session.valetId,
      status: rows[0].status,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      status: rows[0].status,
      shiftStartedAt: rows[0].shift_started_at,
    });
  } catch (err) {
    return serverError(res, err);
  }
});

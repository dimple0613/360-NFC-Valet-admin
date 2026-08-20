import { query } from "../../../../lib/db";
import { withDriverSession } from "../../../../lib/session";
import { serverError, badRequest, notFound } from "../../../../lib/api";
import { broadcast } from "../../../../lib/events";

export default withDriverSession(async function handler(req, res) {
  try {
    const driverId = req.session.driverId;
    const orderId = Number(req.query.id);
    if (!orderId) return badRequest(res, "Order ID is required");

    const { rows: orderRows } = await query(
      "SELECT id, driver_id, status FROM orders WHERE id = $1",
      [orderId]
    );
    const order = orderRows[0];
    if (!order) return notFound(res, "Order not found");

    if (req.method === "PATCH") {
      const { status, zone, slot } = req.body || {};

      if (status === "parked") {
        if (order.driver_id !== driverId && order.driver_id !== null) {
          return res.status(403).json({ error: "Not your order" });
        }
        await query(
          `UPDATE orders SET status = 'parked', driver_id = $1, zone = COALESCE($2, zone), slot = COALESCE($3, slot), dropped_at = NOW()
           WHERE id = $4`,
          [driverId, zone || null, slot || null, orderId]
        );
      } else if (status === "retrieving") {
        if (order.driver_id !== driverId) {
          await query("UPDATE orders SET driver_id = $1 WHERE id = $2", [driverId, orderId]);
        }
        await query("UPDATE orders SET status = 'retrieving' WHERE id = $1", [orderId]);
      } else if (status === "returning") {
        if (order.driver_id !== driverId) {
          await query("UPDATE orders SET driver_id = $1 WHERE id = $2", [driverId, orderId]);
        }
        const etaMinutes = Number(req.body?.guestEta) || null;
        if (etaMinutes) {
          await query(
            `UPDATE orders SET status = 'returning', guest_eta = NOW() + ($1 || ' minutes')::interval WHERE id = $2`,
            [String(etaMinutes), orderId]
          );
        } else {
          await query(
            `UPDATE orders SET status = 'returning' WHERE id = $1`,
            [orderId]
          );
        }
      } else if (status === "returned") {
        if (order.driver_id !== driverId) {
          await query("UPDATE orders SET driver_id = $1 WHERE id = $2", [driverId, orderId]);
        }
        await query(
          `UPDATE orders SET status = 'returned', returned_at = NOW() WHERE id = $1`,
          [orderId]
        );
        const { rows: cardRows } = await query(
          "SELECT card_id FROM orders WHERE id = $1",
          [orderId]
        );
        if (cardRows[0]?.card_id) {
          await query(
            "UPDATE nfc_cards SET status = 'ready' WHERE id = $1",
            [cardRows[0].card_id]
          );
        }
      } else {
        return badRequest(res, "Invalid status. Use: parked, returning, retrieving, or returned");
      }

      const { rows: orderInfo } = await query(
        "SELECT property_id FROM orders WHERE id = $1",
        [orderId]
      );
      const propId = orderInfo[0]?.property_id;

      const eventMap = {
        parked: "valet.order.parked",
        returning: "valet.order.return.requested",
        retrieving: "valet.order.retrieving",
        returned: "valet.order.completed",
      };

      broadcast(eventMap[status] || "valet.order.updated", {
        propertyId: propId,
        orderId,
        driverId,
        status,
        zone: zone || null,
        slot: slot || null,
        guestEta: status === "returning" ? (req.body?.guestEta || null) : undefined,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return serverError(res, err);
  }
});

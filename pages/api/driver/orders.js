import { query } from "../../../lib/db";
import { withDriverSession } from "../../../lib/session";
import { serverError, badRequest } from "../../../lib/api";
import { broadcast } from "../../../lib/events";

export default withDriverSession(async function handler(req, res) {
  try {
    const driverId = req.session.driverId;
    const propertyId = req.session.propertyId;

    if (req.method === "POST") {
      const { cardUid, cardNumber, plate, carMake, carModel, carColor, zone, slot } = req.body || {};
      if (!plate) return badRequest(res, "plate is required");
      if (!cardUid && !cardNumber) return badRequest(res, "cardUid or cardNumber is required");

      if (!propertyId) return badRequest(res, "No property selected — start shift first");

      let card = null;

      if (cardUid) {
        const { rows } = await query(
          "SELECT id, status FROM nfc_cards WHERE uid = $1 AND property_id = $2",
          [cardUid, propertyId]
        );
        card = rows[0] || null;
      }

      if (!card && cardUid) {
        const { rows } = await query(
          "SELECT id, status FROM nfc_cards WHERE physical_uid = $1 AND property_id = $2",
          [cardUid, propertyId]
        );
        card = rows[0] || null;
      }

      if (!card && cardNumber) {
        const { rows } = await query(
          "SELECT id, status FROM nfc_cards WHERE card_number = $1 AND property_id = $2",
          [cardNumber, propertyId]
        );
        card = rows[0] || null;
      }

      if (!card && cardUid) {
        const { rows } = await query("SELECT id, property_id, status, card_number FROM nfc_cards WHERE uid = $1", [cardUid]);
        if (rows.length) {
          return badRequest(res, `Card NFC UID ${cardUid} exists at property ${rows[0].property_id} (card #${rows[0].card_number}, status: ${rows[0].status}), but session property is ${propertyId}`);
        }
        const { rows: physRows } = await query("SELECT id, property_id, status, card_number FROM nfc_cards WHERE physical_uid = $1", [cardUid]);
        if (physRows.length) {
          return badRequest(res, `Card physical UID ${cardUid} exists at property ${physRows[0].property_id} (card #${physRows[0].card_number}, status: ${physRows[0].status}), but session property is ${propertyId}`);
        }
      }

      if (!card && cardNumber) {
        const { rows } = await query("SELECT id, property_id, status FROM nfc_cards WHERE card_number = $1", [cardNumber]);
        if (rows.length) {
          return badRequest(res, `Card #${cardNumber} exists at property ${rows[0].property_id} (status: ${rows[0].status}), but session property is ${propertyId}`);
        }
      }

      if (!card) {
        return badRequest(res, "Card not found. Enter the 4-digit card number printed on the card.");
      }
      if (card.status === "blocked") return badRequest(res, "This card is blocked");
      if (card.status === "with_guest") return badRequest(res, "This card is already assigned to an active vehicle");

      const { rows: orderRows } = await query(
        `INSERT INTO orders (property_id, card_id, driver_id, plate, car_make, car_model, car_color, zone, slot, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')
         RETURNING id, created_at`,
        [propertyId, card.id, driverId, plate, carMake || null, carModel || null, carColor || null, zone || null, slot || null]
      );

      await query(
        "UPDATE nfc_cards SET status = 'with_guest', uses_count = uses_count + 1 WHERE id = $1",
        [card.id]
      );

      const order = orderRows[0];

      broadcast("nfc.card.activated", {
        propertyId,
        cardUid: cardUid || "",
        orderId: order.id,
        driverId,
        plate,
        carMake: carMake || null,
        carModel: carModel || null,
        carColor: carColor || null,
        timestamp: new Date().toISOString(),
      });

      broadcast("valet.order.created", {
        propertyId,
        orderId: order.id,
        cardUid: cardUid || "",
        driverId,
        plate,
        status: "active",
        timestamp: new Date().toISOString(),
      });

      return res.status(201).json({
        orderId: order.id,
        createdAt: order.created_at,
      });
    }

    if (req.method === "PATCH") {
      const { orderId, zone, slot } = req.body || {};
      if (!orderId) return badRequest(res, "orderId is required");

      await query(
        `UPDATE orders SET zone = COALESCE($1, zone), slot = COALESCE($2, slot), dropped_at = NOW()
         WHERE id = $3 AND driver_id = $4 AND status = 'active'`,
        [zone || null, slot || null, orderId, driverId]
      );

      broadcast("valet.order.parked", {
        propertyId,
        orderId,
        driverId,
        zone: zone || null,
        slot: slot || null,
        status: "parked",
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return serverError(res, err);
  }
});

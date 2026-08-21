import { query } from "../../../../lib/db";
import { badRequest, notFound, serverError, methodNotAllowed } from "../../../../lib/api";
import { rateLimit } from "../../../../lib/rateLimit";

export default async function handler(req, res) {
  try {
    if (!rateLimit(req, { max: 30, windowMs: 60000 })) {
      return res.status(429).json({ error: "Too many requests — try again in a minute" });
    }

    const uid = String(req.query.uid || "").trim();
    if (!uid) return badRequest(res, "Card UID is required");

    const { rows: cards } = await query(
      `SELECT c.id AS card_id, c.uid, c.status AS card_status, c.uses_count,
              p.id AS property_id, p.name AS property_name, p.area, p.slug, p.city, p.phone
       FROM nfc_cards c
       JOIN properties p ON p.id = c.property_id
       WHERE c.uid = $1 OR UPPER(c.physical_uid) = UPPER($2)`,
      [uid, uid]
    );
    const card = cards[0];
    if (!card) return notFound(res, "Card not found");

    if (req.method === "GET") {
      const { rows: offers } = await query(
        `SELECT id, title, category, price, was_price, description, featured, validates_valet,
                rating, reviews, level, opens_at, closes_at, deal_tag
         FROM offers
         WHERE property_id = $1 AND live = true AND draft = false
         ORDER BY (featured IS NULL), featured, id`,
        [card.property_id]
      );
      const { rows: orderRows } = await query(
        `SELECT o.plate, o.car_make, o.car_model, o.car_color, o.zone, o.slot, o.status, o.guest_eta,
                d.full_name AS driver_name, d.initials AS driver_initials, d.avatar_color AS driver_color
         FROM orders o
         LEFT JOIN drivers d ON d.id = o.driver_id
         WHERE o.card_id = $1 AND o.status IN ('active','parked','retrieving','returning','returned')
         ORDER BY o.created_at DESC LIMIT 1`,
        [card.card_id]
      );
      const order = orderRows[0] || null;
      return res.status(200).json({
        card: { uid: card.uid, status: card.card_status, usesCount: card.uses_count },
        property: {
          id: card.property_id,
          name: card.property_name,
          area: card.area,
          slug: card.slug,
          city: card.city,
          phone: card.phone,
        },
        order: order
          ? {
              id: order.id,
              plate: order.plate,
              carMake: order.car_make,
              carModel: order.car_model,
              carColor: order.car_color,
              zone: order.zone,
              slot: order.slot,
              status: order.status,
              guestEta: order.guest_eta,
              driver: order.driver_name
                ? { name: order.driver_name, initials: order.driver_initials, color: order.driver_color }
                : null,
            }
          : null,
        offers: offers.map((o) => ({
          id: o.id,
          title: o.title,
          category: o.category,
          price: Number(o.price),
          wasPrice: o.was_price == null ? null : Number(o.was_price),
          desc: o.description,
          featured: o.featured,
          validatesValet: o.validates_valet,
          rating: Number(o.rating),
          reviews: Number(o.reviews),
          level: o.level,
          opensAt: o.opens_at,
          closesAt: o.closes_at,
          dealTag: o.deal_tag,
        })),
      });
    }

    if (req.method === "POST") {
      const minutes = Number(req.body?.minutes);
      if (!Number.isInteger(minutes) || minutes < 5 || minutes > 30) {
        return badRequest(res, "ETA must be between 5 and 30 minutes");
      }
      const { rows: orders } = await query(
        `SELECT id, status FROM orders
         WHERE card_id = $1 AND status IN ('active','parked','retrieving','returning')
         ORDER BY created_at DESC LIMIT 1`,
        [card.card_id]
      );
      const order = orders[0];
      if (!order) {
        return badRequest(res, "No parked car found for this card");
      }
      if (order.status === "returning") {
        return badRequest(res, "Your car is already on the way");
      }
      await query(
        `UPDATE orders SET status='returning', guest_eta = now() + make_interval(mins => $1)
         WHERE id = $2`,
        [minutes, order.id]
      );
      const { rows: etaRows } = await query(
        "SELECT guest_eta FROM orders WHERE id = $1",
        [order.id]
      );
      return res.status(200).json({
        ok: true,
        orderId: order.id,
        minutes,
        eta: etaRows[0].guest_eta,
      });
    }

    return methodNotAllowed(res);
  } catch (err) {
    return serverError(res, err);
  }
}

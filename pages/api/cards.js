import { query } from "../../lib/db";
import { withSession } from "../../lib/session";
import { serverError, badRequest } from "../../lib/api";
import { maxCardUid } from "../../lib/uid";

export default withSession(async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const q = String(req.query.q || "").trim();
      const property = Number(req.query.property) || null;

      const { rows: props } = await query(
        `SELECT p.id, p.name, p.card_pool,
                COUNT(c.id) AS total,
                COUNT(c.id) FILTER (WHERE c.status = 'with_guest') AS in_valet,
                COUNT(c.id) FILTER (WHERE c.status = 'ready') AS ready,
                COUNT(c.id) FILTER (WHERE c.status = 'blocked') AS blocked
         FROM properties p
         LEFT JOIN nfc_cards c ON c.property_id = p.id
         GROUP BY p.id ORDER BY p.id`,
        []
      );
      const cardsByProp = Object.fromEntries(props.map((p) => [p.id, {
        total: Number(p.total),
        inValet: Number(p.in_valet),
        ready: Number(p.ready),
        blocked: Number(p.blocked),
        cardPool: p.card_pool,
      }]));
      const total = props.reduce((s, p) => s + Number(p.total), 0);

      const params = [];
      let where = "";
      if (q) {
        params.push(`%${q}%`);
        where += ` AND c.uid ILIKE $${params.length}`;
      }
      if (property) {
        params.push(property);
        where += ` AND c.property_id = $${params.length}`;
      }
      const { rows: cards } = await query(
        `SELECT c.id, c.uid, c.status, c.uses_count, c.property_id, p.name AS property,
                last.plate, last.car_make, last.car_model, last.zone, last.slot,
                last.order_status, last.by_name, last.last_at
         FROM nfc_cards c
         JOIN properties p ON p.id = c.property_id
         LEFT JOIN LATERAL (
           SELECT o.plate, o.car_make, o.car_model, o.zone, o.slot, o.status AS order_status,
                  d.full_name AS by_name, o.created_at AS last_at
           FROM orders o
           LEFT JOIN drivers d ON d.id = o.driver_id
           WHERE o.card_id = c.id
           ORDER BY o.id DESC LIMIT 1
         ) last ON true
         WHERE 1=1${where}
         ORDER BY c.uid LIMIT 500`,
        params
      );

      return res.status(200).json({
        stats: {
          total,
          inValet: props.reduce((s, p) => s + Number(p.in_valet), 0),
          ready: props.reduce((s, p) => s + Number(p.ready), 0),
          blocked: props.reduce((s, p) => s + Number(p.blocked), 0),
          perProperty: cardsByProp,
        },
        properties: props.map((p) => ({ id: p.id, name: p.name })),
        cards: cards.map((c) => {
          let order = "—";
          let orderMuted = true;
          if (c.plate) {
            order = `${c.plate} · ${c.car_make} ${c.car_model}${c.zone ? ` · Zone ${c.zone}-${c.slot}` : ""}`;
            orderMuted = c.order_status !== "active";
          }
          return {
            id: c.id,
            uid: c.uid,
            status: c.status,
            statusLabel:
              c.status === "with_guest"
                ? "● WITH GUEST"
                : c.status === "ready"
                ? "READY"
                : "LOST · BLOCKED",
            statusTone:
              c.status === "with_guest" ? "orange" : c.status === "ready" ? "green" : "red",
            uses: c.uses_count,
            property: c.property,
            propertyId: c.property_id,
            order,
            orderMuted,
            by: c.by_name
              ? `${c.by_name}${c.last_at ? " · " + new Date(c.last_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}`
              : "—",
          };
        }),
      });
    }

    if (req.method === "POST") {
      const { propertyId, count } = req.body || {};
      const n = Math.min(500, Math.max(1, Number(count) || 1));
      if (!propertyId) return badRequest(res, "Property is required");

      const { rows: propRow } = await query(
        "SELECT card_pool, uid_start FROM properties WHERE id=$1",
        [propertyId]
      );
      if (!propRow[0]) return badRequest(res, "Property not found");
      const base = propRow[0].uid_start ? BigInt(propRow[0].uid_start) : 1n;
      const maxUid = await maxCardUid(propertyId);
      const uidStart = maxUid >= base ? maxUid + 1n : base;

      const created = [];
      for (let i = 0; i < n; i++) {
        const uid = String(uidStart + BigInt(i));
        await query("INSERT INTO nfc_cards (uid, property_id, status) VALUES ($1,$2,'ready')", [
          uid,
          propertyId,
        ]);
        created.push(uid);
      }
      return res.status(201).json({ created: created.length, from: created[0], to: created[created.length - 1] });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return serverError(res, err);
  }
});

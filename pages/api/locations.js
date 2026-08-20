import { query } from "../../lib/db";
import { withSession } from "../../lib/session";
import { serverError, badRequest, startOfDay } from "../../lib/api";
import { nextUidStart } from "../../lib/uid";

export default withSession(async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const start = startOfDay(new Date());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const { rows: props } = await query(
        `SELECT p.id, p.name, p.area, p.slots_count, p.zones_count, p.card_pool, p.slug, p.uid_start,
                (SELECT COUNT(*)::int FROM drivers d WHERE d.property_id = p.id) AS drivers,
                (SELECT COUNT(*)::int FROM orders o
                   WHERE o.property_id = p.id
                     AND o.status IN ('parked','retrieving')
                     AND o.created_at < NOW() - interval '2 hours') AS overdue,
                COUNT(o.id) FILTER (
                  WHERE o.created_at >= $1 AND o.created_at < $2
                    AND o.status IN ('active','parked','retrieving')
                ) AS occupied
         FROM properties p
         LEFT JOIN orders o ON o.property_id = p.id
         GROUP BY p.id ORDER BY p.id`,
        [start, end]
      );
      const { rows: zones } = await query(
        "SELECT id, property_id, code, slot_count FROM zones ORDER BY property_id, id",
        []
      );
      const nextUid = await nextUidStart();
      const zonesByProp = {};
      for (const z of zones) {
        (zonesByProp[z.property_id] = zonesByProp[z.property_id] || []).push(z);
      }
      const properties = props.map((p) => ({
        id: p.id,
        name: p.name,
        area: p.area,
        slug: p.slug,
        uidStart: p.uid_start,
        drivers: p.drivers,
        slots: p.slots_count,
        zonesCount: p.zones_count,
        cardPool: p.card_pool,
        occupied: Number(p.occupied),
        overdue: p.overdue,
        zones: (zonesByProp[p.id] || []).map((z) => ({
          id: z.id,
          code: z.code,
          slots: z.slot_count,
          occupied: Math.min(z.slot_count, Math.round(Number(p.occupied) / p.zones_count)),
        })),
      }));
      return res.status(200).json({ properties, nextUid: nextUid.toString() });
    }

    if (req.method === "POST") {
      const { name, area, zones, slots, cards } = req.body || {};
      if (!name || !slots) return badRequest(res, "Name and slot count are required");
      const zoneCount = Math.max(1, Number(zones) || 1);
      const slotCount = Math.max(1, Number(slots) || 1);
      const pool = Math.max(1, Number(cards) || slotCount * 2);

      const uidStart = await nextUidStart();

      const [{ id: propId }] = (
        await query(
          `INSERT INTO properties (name, area, zones_count, slots_count, slug, card_pool, uid_start)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [
            name,
            area || "—",
            zoneCount,
            slotCount,
            name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            pool,
            uidStart.toString(),
          ]
        )
      ).rows;

      const perZone = Math.ceil(slotCount / zoneCount);
      for (let z = 0; z < zoneCount; z++) {
        await query(
          "INSERT INTO zones (property_id, code, slot_count) VALUES ($1,$2,$3)",
          [propId, String.fromCharCode(65 + z), perZone]
        );
      }
      for (let i = 0; i < pool; i++) {
        await query(
          "INSERT INTO nfc_cards (uid, property_id, status) VALUES ($1,$2,'ready')",
          [String(uidStart + BigInt(i)), propId]
        );
      }

      return res.status(201).json({ id: propId, name, area, zonesCount: zoneCount, slots: slotCount, cards: pool });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    if (err.code === "23505") {
      return badRequest(res, "A location with this name already exists");
    }
    return serverError(res, err);
  }
});

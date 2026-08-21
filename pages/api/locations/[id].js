import { query } from "../../../lib/db";
import { withSession } from "../../../lib/session";
import { serverError, badRequest } from "../../../lib/api";
import { nextUidStart } from "../../../lib/uid";

export default withSession(async function handler(req, res) {
  try {
    const id = Number(req.query.id);
    if (!id) return badRequest(res, "Invalid location id");

    if (req.method === "PATCH") {
      const { name, area, zones, slots, cards } = req.body || {};
      if (!name) return badRequest(res, "Name is required");
      const zoneCount = Math.max(1, Number(zones) || 1);
      const slotCount = Math.max(1, Number(slots) || 1);
      const pool = Math.max(1, Number(cards) || slotCount * 2);

      await query(
        `UPDATE properties
         SET name=$1, area=$2, zones_count=$3, slots_count=$4, slug=$5, card_pool=$6
         WHERE id=$7`,
        [
          name,
          area || "—",
          zoneCount,
          slotCount,
          name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          pool,
          id,
        ]
      );

      await query("DELETE FROM zones WHERE property_id=$1", [id]);
      const perZone = Math.ceil(slotCount / zoneCount);
      for (let z = 0; z < zoneCount; z++) {
        await query(
          "INSERT INTO zones (property_id, code, slot_count) VALUES ($1,$2,$3)",
          [id, String.fromCharCode(65 + z), perZone]
        );
      }

      const { rows: cardRows } = await query(
        "SELECT COUNT(*)::int AS n FROM nfc_cards WHERE property_id=$1",
        [id]
      );
      const existing = cardRows[0].n;
      if (existing < pool) {
        const uidStart = await nextUidStart();
        for (let i = 0; i < pool - existing; i++) {
          await query(
            "INSERT INTO nfc_cards (uid, property_id, status) VALUES ($1,$2,'ready')",
            [String(uidStart + BigInt(i)), id]
          );
        }
      }

      return res.status(200).json({ id, name, zonesCount: zoneCount, slots: slotCount, cards: pool });
    }

    if (req.method === "DELETE") {
      await query("DELETE FROM validations WHERE order_id IN (SELECT id FROM orders WHERE property_id = $1)", [id]);
      await query("DELETE FROM orders WHERE property_id=$1", [id]);
      await query("DELETE FROM nfc_cards WHERE property_id=$1", [id]);
      await query("DELETE FROM zones WHERE property_id=$1", [id]);
      await query("UPDATE drivers SET property_id=NULL WHERE property_id=$1", [id]);
      await query("DELETE FROM properties WHERE id=$1", [id]);
      return res.status(200).json({ id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    if (err.code === "23505") {
      return badRequest(res, "A location with this name already exists");
    }
    return serverError(res, err);
  }
});

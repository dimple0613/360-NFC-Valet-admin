import { query } from "../../../lib/db";
import { withSession } from "../../../lib/session";
import { serverError, badRequest, notFound } from "../../../lib/api";
import { broadcast } from "../../../lib/events";

export default withSession(async function handler(req, res) {
  try {
    const id = Number(req.query.id);
    if (!id) return badRequest(res, "Offer id is required");

    if (req.method === "PATCH") {
      const { live, featured, draft } = req.body || {};
      const { rows } = await query(
        "SELECT live, featured, draft FROM offers WHERE id=$1",
        [id]
      );
      if (!rows[0]) return notFound(res, "Offer not found");
      const o = rows[0];
      let nextFeatured = o.featured;
      if (featured !== undefined) {
        if (featured === null || featured === 0 || featured === false) nextFeatured = null;
        else if (typeof featured === "boolean") nextFeatured = 1;
        else nextFeatured = Number(featured) || 1;
      }
      if (nextFeatured !== null) {
        await query("UPDATE offers SET featured = NULL WHERE featured = $1 AND id <> $2", [
          nextFeatured,
          id,
        ]);
      }
      const next = {
        live: typeof live === "boolean" ? live : o.live,
        featured: nextFeatured,
        draft: typeof draft === "boolean" ? draft : o.draft,
      };
      await query(
        "UPDATE offers SET live=$2, featured=$3, draft=$4 WHERE id=$1",
        [id, next.live, next.featured, next.draft]
      );

      broadcast("offer.updated", {
        offerId: id,
        live: next.live,
        draft: next.draft,
        featured: next.featured,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({ id, ...next });
    }

    if (req.method === "DELETE") {
      const { rowCount } = await query("DELETE FROM offers WHERE id=$1", [id]);
      if (!rowCount) return notFound(res, "Offer not found");
      return res.status(200).json({ id, deleted: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return serverError(res, err);
  }
});

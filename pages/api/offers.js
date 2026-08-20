import { query } from "../../lib/db";
import { withSession } from "../../lib/session";
import { serverError, badRequest } from "../../lib/api";

export default withSession(async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const propertyId =
        req.query.property && req.query.property !== "all"
          ? Number(req.query.property)
          : null;
      const propClause = propertyId ? " WHERE o.property_id = $1" : "";
      const { rows } = await query(
        `SELECT o.id, o.title, o.category, o.price, o.description, o.featured, o.live, o.draft,
                o.validates_valet, o.ends_on, o.views_7d, p.name AS property
         FROM offers o
         LEFT JOIN properties p ON p.id = o.property_id
         ${propClause}
         ORDER BY o.id`,
        propertyId ? [propertyId] : []
      );
      const offers = rows.map((o) => ({
        id: o.id,
        title: o.title,
        category: o.category,
        price: Number(o.price),
        desc: o.description,
        featured: o.featured,
        live: o.live,
        draft: o.draft,
        validatesValet: o.validates_valet,
        endsOn: o.ends_on,
        views7d: o.views_7d,
        property: o.property,
        statusLabel: o.draft
          ? "Draft"
          : o.live
          ? o.featured
            ? "Featured"
            : "Live"
          : "Hidden",
        statusTone: o.draft ? "draft" : o.live ? (o.featured ? "featured" : "live") : "hidden",
      }));
      return res.status(200).json({ offers });
    }

    if (req.method === "POST") {
      const { title, category, price, desc, propertyId } = req.body || {};
      if (!title || !price) return badRequest(res, "Title and price are required");
      const { rows } = await query(
        `INSERT INTO offers (property_id, title, category, price, description, live, validates_valet, views_7d)
         VALUES ($1,$2,$3,$4,$5,true,true,0) RETURNING id`,
        [propertyId || null, title, category || "Dining", price, desc || null]
      );
      return res.status(201).json({ id: rows[0].id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return serverError(res, err);
  }
});

import { query } from "../../../lib/db";
import { withDriverSession } from "../../../lib/session";
import { serverError } from "../../../lib/api";

export default withDriverSession(async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const driverId = req.session.driverId;

    const { rows } = await query(
      `SELECT p.id, p.name, p.area, p.city, p.slug,
              (SELECT COUNT(*)::int FROM drivers d2 WHERE d2.property_id = p.id AND d2.status = 'on_shift') AS drivers_on_shift
       FROM properties p
       ORDER BY p.name`,
      []
    );

    const properties = rows.map((r) => ({
      id: r.id,
      name: r.name,
      area: r.area,
      city: r.city,
      slug: r.slug,
      driversOnShift: r.drivers_on_shift,
    }));

    return res.status(200).json({ properties });
  } catch (err) {
    return serverError(res, err);
  }
});

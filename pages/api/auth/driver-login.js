import { query } from "../../../lib/db";
import { verifyPassword } from "../../../lib/auth";
import { setDriverSessionCookie } from "../../../lib/session";
import { badRequest, serverError } from "../../../lib/api";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { valetId, password } = req.body || {};
  if (!valetId || !password) return badRequest(res, "Driver ID and password are required");

  try {
    const { rows } = await query(
      `SELECT d.id, d.valet_id, d.full_name, d.initials, d.avatar_color, d.email, d.phone,
              d.status, d.property_id, p.name AS property_name, d.password_hash
       FROM drivers d
       LEFT JOIN properties p ON p.id = d.property_id
       WHERE LOWER(d.valet_id) = LOWER($1)
       LIMIT 1`,
      [String(valetId).trim()]
    );
    const driver = rows[0];
    if (!driver || !verifyPassword(String(password), driver.password_hash)) {
      return res.status(401).json({ error: "Invalid Driver ID or password" });
    }
    const token = setDriverSessionCookie(res, {
      driverId: driver.id,
      valetId: driver.valet_id,
      propertyId: driver.property_id,
    });
    return res.status(200).json({
      token,
      driver: {
        id: driver.id,
        valetId: driver.valet_id,
        fullName: driver.full_name,
        initials: driver.initials,
        avatarColor: driver.avatar_color,
        email: driver.email,
        phone: driver.phone,
        status: driver.status,
        propertyId: driver.property_id,
        propertyName: driver.property_name,
      },
    });
  } catch (err) {
    return serverError(res, err);
  }
}

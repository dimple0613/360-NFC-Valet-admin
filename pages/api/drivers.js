import { query } from "../../lib/db";
import { withSession } from "../../lib/session";
import { serverError, badRequest, startOfDay } from "../../lib/api";
import { makeValetId, makePin, hashPassword } from "../../lib/auth";
import { broadcast } from "../../lib/events";

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const STATUS_LABEL = {
  on_shift: "On Shift",
  on_break: "On Break",
  off_duty: "Off Duty",
  removed: "Removed",
};

export default withSession(async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const id = req.query.id;
      if (id) {
        const start = startOfDay(new Date());
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const { rows } = await query(
          `SELECT d.id, d.valet_id, d.full_name, d.initials, d.avatar_color, d.email, d.phone,
                  d.emirates_id, d.license_number, d.nationality, d.emergency_contact,
                  d.status, d.shift_started_at, d.created_at, p.name AS property,
                  (SELECT COUNT(*)::int FROM orders o
                     WHERE o.driver_id = d.id AND o.created_at >= $1 AND o.created_at < $2) AS today,
                  (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (o.returned_at - o.dropped_at)) / 60))::int FROM orders o
                     WHERE o.driver_id = d.id AND o.returned_at >= $1 AND o.returned_at < $2
                       AND o.dropped_at IS NOT NULL) AS avg_min
           FROM drivers d
           LEFT JOIN properties p ON p.id = d.property_id
           WHERE d.id = $3`,
          [start, end, id]
        );
        const driver = rows[0];
        if (!driver) return res.status(404).json({ error: "Driver not found" });

        const { rows: activeOrders } = await query(
          `SELECT o.id, o.plate, o.car_make, o.car_model, o.car_color, o.zone, o.slot,
                  o.status, o.created_at, o.dropped_at, o.guest_eta,
                  c.uid AS card_uid
           FROM orders o
           LEFT JOIN nfc_cards c ON c.id = o.card_id
           WHERE o.driver_id = $1 AND o.status IN ('active','parked','retrieving','returning')
           ORDER BY o.created_at DESC`,
          [id]
        );

        const { rows: recentReturned } = await query(
          `SELECT o.id, o.plate, o.car_make, o.car_model, o.car_color, o.status,
                  o.dropped_at, o.returned_at,
                  ROUND(EXTRACT(EPOCH FROM (o.returned_at - o.dropped_at)) / 60)::int AS return_min
           FROM orders o
           WHERE o.driver_id = $1 AND o.status = 'returned' AND o.returned_at >= $2
           ORDER BY o.returned_at DESC LIMIT 5`,
          [id, start]
        );

        return res.status(200).json({
          driver: {
            id: driver.id,
            valetId: driver.valet_id,
            name: driver.full_name,
            initials: driver.initials,
            color: driver.avatar_color,
            email: driver.email,
            phone: driver.phone,
            emiratesId: driver.emirates_id,
            licenseNumber: driver.license_number,
            nationality: driver.nationality,
            emergencyContact: driver.emergency_contact,
            status: driver.status,
            statusLabel: STATUS_LABEL[driver.status] || driver.status,
            property: driver.property,
            shiftStarted: driver.shift_started_at,
            createdAt: driver.created_at,
            today: driver.today,
            avgMin: driver.avg_min || 0,
          },
          activeOrders: activeOrders.map((o) => ({
            id: o.id,
            plate: o.plate,
            car: [o.car_make, o.car_model, o.car_color].filter(Boolean).join(" "),
            zone: o.zone,
            slot: o.slot,
            status: o.status,
            createdAt: o.created_at,
            droppedAt: o.dropped_at,
            guestEta: o.guest_eta,
            cardUid: o.card_uid,
          })),
          recentReturned: recentReturned.map((o) => ({
            id: o.id,
            plate: o.plate,
            car: [o.car_make, o.car_model, o.car_color].filter(Boolean).join(" "),
            returnedAt: o.returned_at,
            returnMin: o.return_min,
          })),
        });
      }

      const start = startOfDay(new Date());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const propertyId =
        req.query.property && req.query.property !== "all"
          ? Number(req.query.property)
          : null;
      const propClause = propertyId ? " AND d.property_id = $3" : "";
      const { rows } = await query(
        `SELECT d.id, d.valet_id, d.full_name, d.initials, d.avatar_color, d.email, d.phone, d.pin,
                d.status, d.shift_started_at, p.name AS property,
                (SELECT COUNT(*)::int FROM orders o
                   WHERE o.driver_id = d.id AND o.created_at >= $1 AND o.created_at < $2) AS today,
                (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (o.returned_at - o.dropped_at)) / 60))::int FROM orders o
                   WHERE o.driver_id = d.id AND o.returned_at >= $1 AND o.returned_at < $2
                     AND o.dropped_at IS NOT NULL) AS avg_min
         FROM drivers d
         LEFT JOIN properties p ON p.id = d.property_id
         WHERE d.status != 'removed'${propClause}
         ORDER BY d.id`,
        propertyId ? [start, end, propertyId] : [start, end]
      );
      const drivers = rows.map((d) => ({
        id: d.id,
        valetId: d.valet_id,
        name: d.full_name,
        initials: d.initials,
        color: d.avatar_color,
        email: d.email,
        phone: d.phone,
        pin: d.pin,
        status: d.status,
        statusLabel: STATUS_LABEL[d.status] || d.status,
        availability: d.status === "on_shift" ? "Available" : "Off duty",
        property: d.property,
        shiftStarted: d.shift_started_at,
        today: d.today,
        avgMin: d.avg_min || 0,
      }));
      return res.status(200).json({ drivers });
    }

    if (req.method === "POST") {
      const { name, email, phone, emiratesId, licenseNumber, nationality, emergencyContact, password, propertyId } = req.body || {};
      if (!name) return badRequest(res, "Name is required");
      if (!password || String(password).length < 6) return badRequest(res, "Password must be at least 6 characters");
      const { count } = (await query("SELECT COUNT(*)::int AS count FROM drivers WHERE status != 'removed'")).rows[0];
      const valetId = makeValetId(count + 1);
      const customPassword = String(password);
      const colors = ["#1C2B46", "#4A5FC9", "#0C9D61", "#9AA6BC", "#2A3C61", "#B97B17"];
      const color = colors[count % colors.length];
      const { rows } = await query(
        `INSERT INTO drivers (valet_id, full_name, initials, avatar_color, property_id, email, phone,
           emirates_id, license_number, nationality, emergency_contact,
           pin, password_hash, status, shift_started_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'off_duty',NULL)
         RETURNING id, valet_id, pin`,
        [
          valetId,
          name,
          initials(name),
          color,
          Number(propertyId) || null,
          email || null,
          phone || null,
          emiratesId || null,
          licenseNumber || null,
          nationality || null,
          emergencyContact || null,
          makePin(),
          hashPassword(customPassword),
        ]
      );
      const d = rows[0];

      broadcast("driver.created", {
        driverId: d.id,
        valetId: d.valet_id,
        name,
        timestamp: new Date().toISOString(),
      });

      return res.status(201).json({ id: d.id, valetId: d.valet_id, pin: d.pin, password: customPassword, name });
    }

    if (req.method === "PATCH") {
      const { id, shift, newPassword, name, email, phone, emiratesId, licenseNumber, nationality, emergencyContact, remove } = req.body || {};
      if (!id) return badRequest(res, "Driver id is required");

      if (remove) {
        await query("UPDATE drivers SET status = 'off_duty', shift_started_at = NULL WHERE id = $1", [id]);
        return res.status(200).json({ id, removed: true });
      }

      if (newPassword) {
        if (String(newPassword).length < 6) return badRequest(res, "Password must be at least 6 characters");
        await query("UPDATE drivers SET password_hash = $2 WHERE id = $1", [id, hashPassword(String(newPassword))]);
        return res.status(200).json({ id, passwordReset: true });
      }

      if (name !== undefined) {
        const sets = [];
        const vals = [id];
        sets.push(`full_name = $${vals.length + 1}`); vals.push(name);
        sets.push(`initials = $${vals.length + 1}`); vals.push(initials(name));
        if (email !== undefined) { sets.push(`email = $${vals.length + 1}`); vals.push(email || null); }
        if (phone !== undefined) { sets.push(`phone = $${vals.length + 1}`); vals.push(phone || null); }
        if (emiratesId !== undefined) { sets.push(`emirates_id = $${vals.length + 1}`); vals.push(emiratesId || null); }
        if (licenseNumber !== undefined) { sets.push(`license_number = $${vals.length + 1}`); vals.push(licenseNumber || null); }
        if (nationality !== undefined) { sets.push(`nationality = $${vals.length + 1}`); vals.push(nationality || null); }
        if (emergencyContact !== undefined) { sets.push(`emergency_contact = $${vals.length + 1}`); vals.push(emergencyContact || null); }
        await query(`UPDATE drivers SET ${sets.join(', ')} WHERE id = $1`, vals);
        return res.status(200).json({ id, updated: true });
      }

      if (shift !== undefined) {
        if (shift) {
          await query("UPDATE drivers SET status='on_shift', shift_started_at=NOW() WHERE id=$1", [id]);
        } else {
          await query("UPDATE drivers SET status='off_duty', shift_started_at=NULL WHERE id=$1", [id]);
        }

        const { rows: dRows } = await query("SELECT full_name, property_id FROM drivers WHERE id=$1", [id]);
        broadcast(shift ? "driver.shift.started" : "driver.shift.ended", {
          propertyId: dRows[0]?.property_id,
          driverId: id,
          driverName: dRows[0]?.full_name || "",
          status: shift ? "on_shift" : "off_duty",
          timestamp: new Date().toISOString(),
        });

        return res.status(200).json({ id, shift: !!shift });
      }

      return badRequest(res, "Nothing to update");
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return serverError(res, err);
  }
});

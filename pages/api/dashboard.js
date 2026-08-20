import { query } from "../../lib/db";
import { withSession } from "../../lib/session";
import { serverError, startOfDay } from "../../lib/api";

const PROPERTY_COLORS = ["#F4531F", "#FF8A50", "#1C2B46", "#4A5FC9", "#0C9D61"];

export default withSession(async function handler(req, res) {
  try {
    const days = Math.min(30, Math.max(1, Number(req.query.days) || 1));
    const propertyId =
      req.query.property && req.query.property !== "all"
        ? Number(req.query.property)
        : null;

    const now = new Date();
    const today = startOfDay(now);
    const start = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

    const propClause = propertyId ? " AND property_id = $3" : "";
    const valClause = propertyId
      ? " AND v.order_id IN (SELECT id FROM orders WHERE property_id = $3)"
      : "";
    const params = [start, end, ...(propertyId ? [propertyId] : [])];

    const [
      { rows: statsRows },
      { rows: byProp },
      { rows: dropRows },
      { rows: retRows },
      { rows: liveRows },
      { rows: properties },
    ] = await Promise.all([
      query(
        `SELECT
           (SELECT COUNT(*)::int FROM orders WHERE created_at >= $1 AND created_at < $2${propClause}) AS cars_parked,
           (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (returned_at - dropped_at)) / 60))::int FROM orders
              WHERE returned_at >= $1 AND returned_at < $2 AND dropped_at IS NOT NULL${propClause}) AS avg_return_min,
           (SELECT COUNT(*)::int FROM validations v WHERE v.created_at >= $1 AND v.created_at < $2${valClause}) AS offers_validated,
           (SELECT COALESCE(SUM(amount),0)::int FROM validations v WHERE v.created_at >= $1 AND v.created_at < $2${valClause}) AS outlet_spend,
           (SELECT COUNT(*)::int FROM drivers WHERE status = 'on_shift'${propertyId ? " AND property_id = $3" : ""}) AS drivers_on_shift,
           (SELECT COUNT(*)::int FROM drivers${propertyId ? " WHERE property_id = $3" : ""}) AS drivers_total,
           (SELECT COUNT(*)::int FROM orders
              WHERE status IN ('parked','retrieving')
                AND created_at >= $1 AND created_at < $2
                AND created_at < NOW() - interval '2 hours'${propClause}) AS overdue`,
        params
      ),
      query(
        `SELECT p.id, p.name, p.area, p.slots_count, p.zones_count,
                COUNT(o.id) FILTER (WHERE o.created_at >= $1 AND o.created_at < $2) AS cars_today
         FROM properties p
         LEFT JOIN orders o ON o.property_id = p.id
         GROUP BY p.id ORDER BY p.id`,
        [start, end]
      ),
      query(
        `SELECT EXTRACT(HOUR FROM created_at)::int AS h, COUNT(*)::int AS c
         FROM orders WHERE created_at >= $1 AND created_at < $2${propClause} GROUP BY h`,
        params
      ),
      query(
        `SELECT EXTRACT(HOUR FROM returned_at)::int AS h, COUNT(*)::int AS c
         FROM orders WHERE returned_at >= $1 AND returned_at < $2${propClause} GROUP BY h`,
        params
      ),
      query(
        `SELECT o.id, o.plate, o.car_make, o.car_model, o.status, o.created_at, o.returned_at,
                d.full_name AS driver, p.name AS property
         FROM orders o
         JOIN drivers d ON d.id = o.driver_id
         JOIN properties p ON p.id = o.property_id
         ${propertyId ? "WHERE o.property_id = $1" : ""}
         ORDER BY COALESCE(o.returned_at, o.created_at) DESC LIMIT 6`,
        propertyId ? [propertyId] : []
      ),
      query("SELECT id, name, area FROM properties ORDER BY id", []),
    ]);

    const stats = statsRows[0];
    const maxCars = Math.max(...byProp.map((p) => Number(p.cars_today)), 1);

    const byProperty = byProp.map((p, i) => ({
      id: p.id,
      name: p.name,
      area: p.area,
      carsToday: Number(p.cars_today),
      width: Math.round((Number(p.cars_today) / maxCars) * 100),
      color: PROPERTY_COLORS[i % PROPERTY_COLORS.length],
      zones: p.zones_count,
      status: "Active",
    }));

    const dropMap = Object.fromEntries(dropRows.map((r) => [Number(r.h), r.c]));
    const retMap = Object.fromEntries(retRows.map((r) => [Number(r.h), r.c]));
    const chart = [];
    for (let h = 8; h <= 20; h++) {
      chart.push({
        label: `${h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`}`,
        drop: dropMap[h] || 0,
        ret: retMap[h] || 0,
      });
    }

    const live = liveRows.map((r) => {
      const action =
        r.returned_at != null
          ? { text: "Car returned", kind: "returned" }
          : r.status === "active"
          ? { text: "Car parked", kind: "parked" }
          : { text: "Valet retrieval", kind: "retrieval" };
      return {
        id: r.id,
        name: r.driver,
        time: action.kind === "returned" ? r.returned_at : r.created_at,
        plate: r.plate,
        action: action.text,
        kind: action.kind,
        property: r.property,
        car: `${r.car_make} ${r.car_model}`,
      };
    });

    return res.status(200).json({
      date: start,
      stats: {
        carsParked: stats.cars_parked,
        avgReturnTime: stats.avg_return_min || 0,
        offersValidated: stats.offers_validated,
        outletSpend: stats.outlet_spend,
        driversOnShift: stats.drivers_on_shift,
        driversTotal: stats.drivers_total,
        overdue: stats.overdue,
      },
      byProperty,
      chart,
      live,
      properties: properties.map((p) => ({ id: p.id, name: p.name, area: p.area })),
    });
  } catch (err) {
    return serverError(res, err);
  }
});

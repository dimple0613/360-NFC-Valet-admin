import { query } from "../../lib/db";
import { withSession } from "../../lib/session";
import { serverError, startOfDay } from "../../lib/api";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export default withSession(async function handler(req, res) {
  try {
    const days = Math.min(60, Math.max(2, Number(req.query.days) || 7));
    const propertyId =
      req.query.property && req.query.property !== "all"
        ? Number(req.query.property)
        : null;
    const today = startOfDay(new Date());
    const to = req.query.to ? parseDate(req.query.to) : today;
    const end = to > today ? today : to;
    const from = req.query.from ? parseDate(req.query.from) : new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    const start = from > end ? end : from;

    const propClause = propertyId ? "AND o.property_id = $3" : "";
    const valPropClause = propertyId ? "AND v.order_id IN (SELECT id FROM orders WHERE property_id = $3)" : "";
    const params = [start, new Date(end.getTime() + 24 * 60 * 60 * 1000), ...(propertyId ? [propertyId] : [])];

    const result = await query(
      `WITH days AS (
         SELECT d::date AS day
         FROM generate_series($1::date, ($2::date - interval '1 day'), '1 day') AS d
       )
       SELECT
         days.day,
         COALESCE((SELECT COUNT(*)::int FROM orders o WHERE o.created_at >= days.day AND o.created_at < days.day + interval '1 day' ${propClause}), 0) AS drop_offs,
         COALESCE((SELECT COUNT(*)::int FROM orders o WHERE o.returned_at >= days.day AND o.returned_at < days.day + interval '1 day' ${propClause}), 0) AS returns,
         COALESCE((SELECT ROUND(AVG(EXTRACT(EPOCH FROM (o.returned_at - o.dropped_at)) / 60))::int FROM orders o WHERE o.returned_at >= days.day AND o.returned_at < days.day + interval '1 day' AND o.dropped_at IS NOT NULL ${propClause}), 0) AS avg_min,
         COALESCE((SELECT COUNT(*)::int FROM orders o WHERE o.created_at < days.day + interval '1 day' AND o.status IN ('parked','retrieving') AND o.returned_at IS NULL ${propClause}), 0) AS overdue,
         COALESCE((SELECT COUNT(*)::int FROM validations v WHERE v.created_at >= days.day AND v.created_at < days.day + interval '1 day' ${valPropClause}), 0) AS validations,
         COALESCE((SELECT COALESCE(SUM(v.amount),0)::int FROM validations v WHERE v.created_at >= days.day AND v.created_at < days.day + interval '1 day' ${valPropClause}), 0) AS spend
       FROM days
       ORDER BY days.day ASC`,
      params
    );
    const { rows } = result;

    const rows2 = rows.map((r) => ({
      day: DAY_LABELS[new Date(r.day).getDay()],
      date: iso(new Date(r.day)),
      dropOffs: r.drop_offs,
      returns: r.returns,
      avgMin: r.avg_min || 0,
      overdue: r.overdue,
      validations: r.validations,
      spend: r.spend,
      isToday: iso(new Date(r.day)) === iso(today),
    }));

    return res.status(200).json({ rows: rows2 });
  } catch (err) {
    return serverError(res, err);
  }
});

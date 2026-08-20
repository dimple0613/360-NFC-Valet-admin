import { query } from "../../../lib/db";
import { withDriverSession } from "../../../lib/session";
import { serverError, badRequest } from "../../../lib/api";

export default withDriverSession(async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { pushToken } = req.body || {};
      if (!pushToken || typeof pushToken !== "string") {
        return badRequest(res, "pushToken is required");
      }
      await query(
        `UPDATE drivers SET push_token = $1 WHERE id = $2`,
        [pushToken, req.session.driverId]
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return serverError(res, err);
  }
});

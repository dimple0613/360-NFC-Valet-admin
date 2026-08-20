const { query } = require("./db");

async function maxCardUid(propertyId) {
  const { rows } = await query(
    propertyId
      ? `SELECT MAX(NULLIF(regexp_replace(uid, '[^0-9]', '', 'g'), '')::bigint) AS max_uid
         FROM nfc_cards WHERE property_id=$1`
      : `SELECT MAX(NULLIF(regexp_replace(uid, '[^0-9]', '', 'g'), '')::bigint) AS max_uid
         FROM nfc_cards`,
    propertyId ? [propertyId] : []
  );
  return rows[0].max_uid ? BigInt(rows[0].max_uid) : 0n;
}

async function nextUidStart(propertyId) {
  return (await maxCardUid(propertyId)) + 1n;
}

module.exports = { maxCardUid, nextUidStart };

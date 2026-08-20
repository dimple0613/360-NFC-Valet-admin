const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { pool, query } = require("../lib/db");
const { hashPassword, makeValetId, makePin } = require("../lib/auth");

const SCHEMA_PATH = path.join(__dirname, "schema.sql");
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

const now = () => new Date();
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function pickWeighted(pairs) {
  const total = pairs.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * total;
  for (const p of pairs) {
    r -= p.w;
    if (r <= 0) return p.h;
  }
  return pairs[pairs.length - 1].h;
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

async function seed() {
  await query(fs.readFileSync(SCHEMA_PATH, "utf8"));

  try {
    await query("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password_hash TEXT");
    await query("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS emirates_id TEXT");
    await query("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_number TEXT");
    await query("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS nationality TEXT");
    await query("ALTER TABLE drivers ADD COLUMN IF NOT EXISTS emergency_contact TEXT");
  } catch {
    // columns already exist
  }
  try {
    await query("ALTER TABLE nfc_cards ADD COLUMN IF NOT EXISTS physical_uid TEXT");
    await query("ALTER TABLE nfc_cards ADD COLUMN IF NOT EXISTS card_number TEXT");
    await query("CREATE INDEX IF NOT EXISTS idx_cards_physical_uid ON nfc_cards(physical_uid)");
  } catch {
    // columns already exist
  }
  try {
    await query("ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS driver_id INT REFERENCES drivers(id) ON DELETE CASCADE");
    await query("ALTER TABLE password_resets ALTER COLUMN admin_id DROP NOT NULL");
  } catch {
    // columns already exist or constraint already changed
  }

  const [{ count: adminCount }] = (await query("SELECT COUNT(*)::int AS count FROM admins")).rows;
  if (adminCount === 0) {
    await query(
      `INSERT INTO admins (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)`,
      [process.env.ADMIN_EMAIL || "admin@wewant360.com",
        hashPassword(process.env.ADMIN_PASSWORD || "admin123"),
        process.env.ADMIN_NAME || "Sara Al Amiri", "super_admin"]
    );
    console.log("seeded: admin");
  }

  const [{ count: propCount }] = (await query("SELECT COUNT(*)::int AS count FROM properties")).rows;
  if (propCount === 0) {
    const props = [
      { name: "JW Marriott Marquis", area: "Business Bay", zones: 4, slots: 180, slug: "jw-marriott-marquis", pool: 200, uidStart: 7001, phone: "+971 4 414 0000" },
      { name: "Atlantis The Royal", area: "Palm Jumeirah", zones: 5, slots: 260, slug: "atlantis-the-royal", pool: 260, uidStart: 8001, phone: "+971 4 426 2000" },
      { name: "Address Downtown", area: "Downtown Dubai", zones: 3, slots: 120, slug: "address-downtown", pool: 120, uidStart: 9001, phone: "+971 4 436 8888" },
    ];
    for (const p of props) {
      const [{ id }] = (
        await query(
          `INSERT INTO properties (name, area, zones_count, slots_count, slug, card_pool, uid_start, phone)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [p.name, p.area, p.zones, p.slots, p.slug, p.pool, p.uidStart, p.phone]
        )
      ).rows;
      for (let z = 0; z < p.zones; z++) {
        const code = String.fromCharCode(65 + z);
        await query(
          "INSERT INTO zones (property_id, code, slot_count) VALUES ($1,$2,$3)",
          [id, code, Math.ceil(p.slots / p.zones)]
        );
      }
      for (let i = 0; i < p.pool; i++) {
        const uid = String(p.uidStart + i);
        await query(
          "INSERT INTO nfc_cards (uid, property_id, status) VALUES ($1,$2,'ready')",
          [uid, id]
        );
      }
      console.log(`seeded: property ${p.name} (+${p.pool} cards)`);
    }
  }

  const [{ count: driverCount }] = (await query("SELECT COUNT(*)::int AS count FROM drivers")).rows;
  if (driverCount === 0) {
    const props = (await query("SELECT * FROM properties ORDER BY id")).rows;
    const jw = props[0], at = props[1], ad = props[2];
    const colors = ["#1C2B46", "#4A5FC9", "#0C9D61", "#9AA6BC", "#2A3C61", "#B97B17"];
    const named = [
      { name: "Ramesh Kumar", prop: jw, status: "on_shift", shift: true, color: "#1C2B46" },
      { name: "Omar Hassan", prop: at, status: "on_shift", shift: true, color: "#4A5FC9" },
      { name: "Joel Pinto", prop: ad, status: "on_break", shift: true, color: "#0C9D61" },
      { name: "Arjun Nair", prop: jw, status: "off_duty", shift: false, color: "#9AA6BC" },
    ];
    const firstNames = ["Ahmed","Imran","Ravi","Sunil","Karan","Faisal","Youssef","Dinesh","Suresh","Priya","Nadia","Khalid","Anil","Tariq","Meera","Vikram","Rashid","Zara"];
    const lastNames = ["Shaikh","Reddy","Pillai","Khan","Malik","Bose","Sheikh","Menon","Rao","Hassan","Kaur","Ali","Das","Iqbal","Nair","Sharma","Faruq","Chowdhury"];
    const extra = firstNames.map((f, i) => ({
      name: `${f} ${lastNames[i % lastNames.length]}`,
      prop: [jw, at, ad][i % 3],
      status: i < 14 ? "on_shift" : i % 2 ? "on_break" : "off_duty",
      shift: i < 14,
      color: colors[i % colors.length],
    }));
    const all = [...named, ...extra];
    const defaultPassword = process.env.DRIVER_PASSWORD || "driver123";
    for (let i = 0; i < all.length; i++) {
      const d = all[i];
      const email = `${d.name.toLowerCase().replace(/\s+/g, ".")}@360valet.com`;
      await query(
        `INSERT INTO drivers (valet_id, full_name, initials, avatar_color, email, phone, pin, password_hash, property_id, status, shift_started_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [makeValetId(i + 1), d.name, initials(d.name), d.color, email,
          `+971 5${randInt(1000000, 9999999)}`, makePin(), hashPassword(defaultPassword), d.prop.id, d.status,
          d.shift ? new Date(startOfDay(now()).getTime() + randInt(8, 12) * 60 * MINUTES) : null]
      );
    }
    console.log("seeded: drivers (22)");
  }

  const [{ count: offerCount }] = (await query("SELECT COUNT(*)::int AS count FROM offers")).rows;
  if (offerCount === 0) {
    const props = (await query("SELECT * FROM properties ORDER BY id")).rows;
    const jw = props[0];
    const base = [
      { title: "Friday Brunch at Kitchen6", category: "Dining", price: 395, was: 565, featured: 1, live: true, views: 1204, desc: "International buffet", ends: "2026-09-30", rating: 4.7, reviews: 1240, level: "Level 1", opens: "12:30", closes: "16:00", tag: "FRIDAY ONLY" },
      { title: "Saray Spa — 2-for-1 ritual", category: "Spa", price: 420, was: null, featured: 2, live: true, views: 862, desc: "Weekdays only", ends: null, rating: 4.8, reviews: 642, level: "Level 3", opens: "10:00", closes: "22:00", tag: "2-FOR-1" },
      { title: "Pool Day Pass", category: "Deals", price: 180, was: null, featured: null, live: false, draft: true, views: 0, desc: "Draft — not visible to guests", ends: null, rating: 0, reviews: 0, level: null, opens: null, closes: null, tag: null },
      { title: "Skyline Dinner at Vault", category: "Dining", price: 550, was: 690, featured: null, live: true, views: 640, desc: "7-course tasting menu", ends: "2026-12-31", rating: 4.9, reviews: 518, level: "Level 68", opens: "18:00", closes: "23:00", tag: "SKYLINE" },
      { title: "Ayurvedic Deep Tissue", category: "Spa", price: 480, was: null, featured: null, live: true, views: 512, desc: "60 minutes", ends: null, rating: 4.6, reviews: 389, level: "Level 3", opens: "09:00", closes: "21:00", tag: null },
      { title: "Family Stay Package", category: "Stay", price: 1200, was: 1600, featured: null, live: true, views: 388, desc: "Overnight + breakfast", ends: "2026-08-31", rating: 4.5, reviews: 275, level: "Tower A", opens: null, closes: null, tag: "SAVE 25%" },
      { title: "Gym + Sauna Day", category: "Gym", price: 220, was: null, featured: null, live: true, views: 275, desc: "Full access", ends: null, rating: 4.4, reviews: 166, level: "Level 2", opens: "05:30", closes: "23:00", tag: null },
      { title: "Aqua Adventure", category: "Entertainment", price: 310, was: null, featured: null, live: true, views: 466, desc: "Waterpark access", ends: null, rating: 4.6, reviews: 433, level: "Palm pool", opens: "10:00", closes: "19:00", tag: null },
      { title: "Afternoon Tea", category: "Dining", price: 260, was: 320, featured: null, live: true, views: 354, desc: "Lobby lounge", ends: null, rating: 4.5, reviews: 290, level: "Lobby", opens: "14:00", closes: "18:00", tag: "AFTERNOON" },
      { title: "Romantic Candlelit Set", category: "Deals", price: 690, was: null, featured: null, live: false, views: 122, desc: "Suite + dinner", ends: null, rating: 0, reviews: 0, level: null, opens: null, closes: null, tag: null },
      { title: "Kids Club Pass", category: "Entertainment", price: 150, was: null, featured: null, live: true, views: 208, desc: "Half day", ends: null, rating: 4.3, reviews: 120, level: "Level 1", opens: "08:00", closes: "20:00", tag: null },
      { title: "Weekend Golf Simulator", category: "Stay", price: 340, was: null, featured: null, live: true, views: 180, desc: "Palm course", ends: null, rating: 4.4, reviews: 98, level: "Level 2", opens: "09:00", closes: "23:00", tag: null },
      { title: "Signature Facial", category: "Spa", price: 520, was: null, featured: null, live: true, views: 244, desc: "90 minutes", ends: null, rating: 4.7, reviews: 214, level: "Level 3", opens: "10:00", closes: "21:00", tag: null },
      { title: "Valet + Brunch Combo", category: "Deals", price: 460, was: null, featured: null, live: true, views: 197, desc: "Includes validated valet", ends: "2026-09-30", rating: 4.6, reviews: 177, level: "Level 1", opens: "12:30", closes: "16:00", tag: "COMBO" },
    ];
    for (const o of base) {
      await query(
        `INSERT INTO offers (property_id, title, category, price, was_price, description, featured, live, draft, validates_valet, ends_on, views_7d, rating, reviews, level, opens_at, closes_at, staff_code, deal_tag)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [jw.id, o.title, o.category, o.price, o.was, o.desc, o.featured, o.live, o.draft || false, true, o.ends, o.views, o.rating, o.reviews, o.level, o.opens, o.closes, o.tag ? String(1000 + o.reviews % 9000) : null, o.tag]
      );
    }
    for (let i = 0; i < 8; i++) {
      const prop = props[(i + 1) % props.length];
      await query(
        `INSERT INTO offers (property_id, title, category, price, description, live, validates_valet, views_7d, rating, reviews, level, opens_at, closes_at)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10,$11,$12)`,
        [prop.id, `Property Offer ${i + 1}`, ["Dining", "Spa", "Deals", "Stay"][i % 4], randInt(100, 600), "Seeded offer", true, randInt(50, 500), Number((3.5 + (i % 15) / 10).toFixed(1)), randInt(20, 400), "Level 1", "10:00", "22:00"]
      );
    }
    console.log("seeded: offers");
  }

  const [{ count: orderCount }] = (await query("SELECT COUNT(*)::int AS count FROM orders")).rows;
  if (orderCount === 0) {
    const props = (await query("SELECT * FROM properties ORDER BY id")).rows;
    const drivers = (await query("SELECT * FROM drivers ORDER BY id")).rows;
    const offers = (await query("SELECT id, title FROM offers ORDER BY id")).rows;
    const today = startOfDay(now());
    const todayMs = today.getTime();

    const HOUR_WEIGHTS = [
      { h: 8, w: 5 }, { h: 9, w: 7 }, { h: 10, w: 9 }, { h: 11, w: 10 },
      { h: 12, w: 11 }, { h: 13, w: 9 }, { h: 14, w: 8 }, { h: 15, w: 7 },
      { h: 16, w: 7 }, { h: 17, w: 8 }, { h: 18, w: 10 }, { h: 19, w: 7 }, { h: 20, w: 3 },
    ];

    // (day, drop, returned, overdue, validations, outlet spend) — oldest first
    const dayConfigs = [
      { daysAgo: 6, drop: 164, ret: 164, overdue: 2, val: 41, spend: 21800 },
      { daysAgo: 5, drop: 187, ret: 187, overdue: 5, val: 52, spend: 28900 },
      { daysAgo: 4, drop: 204, ret: 204, overdue: 3, val: 58, spend: 30150 },
      { daysAgo: 3, drop: 188, ret: 188, overdue: 11, val: 49, spend: 26300 },
      { daysAgo: 2, drop: 296, ret: 296, overdue: 9, val: 104, spend: 58900 },
      { daysAgo: 1, drop: 271, ret: 262, overdue: 4, val: 86, spend: 46500 },
      { daysAgo: 0, drop: 248, ret: 231, overdue: 2, val: 77, spend: 41200 },
    ];

    for (const dayCfg of dayConfigs) {
      const dayStart = todayMs - dayCfg.daysAgo * 24 * 3600 * SECONDS;
      const nextDay = dayStart + 24 * 3600 * SECONDS;
      const returnedIds = [];

      for (const prop of props) {
        const cards = (await query("SELECT id, uid FROM nfc_cards WHERE property_id=$1 ORDER BY id", [prop.id])).rows;
        const drop =
          dayCfg.daysAgo === 0
            ? [112, 86, 50][props.indexOf(prop)]
            : Math.max(10, Math.round((dayCfg.drop * prop.slots_count) / props.reduce((s, p) => s + p.slots_count, 0)));
        let ret =
          dayCfg.daysAgo === 0
            ? [104, 79, 48][props.indexOf(prop)]
            : Math.max(10, Math.round((dayCfg.ret * prop.slots_count) / props.reduce((s, p) => s + p.slots_count, 0)));
        if (dayCfg.daysAgo > 0 && dayCfg.overdue > 0) {
          ret = Math.max(0, drop - Math.round((dayCfg.overdue * drop) / dayCfg.drop));
        }

        const orders = [];
        for (let i = 0; i < drop; i++) {
          const hour = pickWeighted(HOUR_WEIGHTS);
          const created = new Date(dayStart + hour * 3600 * SECONDS + randInt(0, 55) * 60 * SECONDS);
          const isReturn = i < ret;
          const durMin = randInt(300, 500);
          const dropped = new Date(created.getTime() + randInt(6, 20) * MINUTES);
          const rawReturn = new Date(dropped.getTime() + durMin * MINUTES);
          const returnCap = new Date(dayStart + 22 * 3600 * SECONDS + 30 * 60 * SECONDS);
          const returned =
            isReturn && rawReturn.getTime() > returnCap.getTime()
              ? returnCap
              : isReturn
              ? rawReturn
              : null;
          let status;
          if (returned) status = "returned";
          else if (dayCfg.daysAgo > 0) status = "parked";
          else if (hour >= 15) status = "active";
          else status = Math.random() < 0.5 ? "parked" : "retrieving";
          const driver = drivers[randInt(0, drivers.length - 1)];
          const card = cards[i % cards.length];
          const car = CARS[randInt(0, CARS.length - 1)];
          const zone = String.fromCharCode(65 + randInt(0, prop.zones_count - 1));
          const slot = randInt(1, Math.ceil(prop.slots_count / prop.zones_count));
          orders.push({
            property_id: prop.id, card_id: card.id, driver_id: driver.id,
            plate: PLATES[randInt(0, PLATES.length - 1)], ...car, zone, slot,
            status, created,
            dropped: status === "active" ? null : dropped,
            returned,
          });
          if (returned) returnedIds.push(orders[orders.length - 1]);
        }
        for (const o of orders) {
          const [{ id: insertedId }] = (
            await query(
              `INSERT INTO orders (property_id, card_id, driver_id, plate, car_make, car_model, car_color, zone, slot, status, created_at, dropped_at, returned_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
              [o.property_id, o.card_id, o.driver_id, o.plate, o.car_make, o.car_model, o.car_color,
               o.zone, o.slot, o.status, o.created, o.dropped, o.returned]
            )
          ).rows;
          o.id = insertedId;
          if (o.returned) {
            await query("UPDATE nfc_cards SET uses_count = uses_count + 1 WHERE id=$1", [o.card_id]);
          }
          if (o.status === "active") {
            await query("UPDATE nfc_cards SET status='with_guest' WHERE id=$1", [o.card_id]);
          }
        }
      }
      console.log(`seeded: orders for day ${dayCfg.daysAgo}d ago (drop=${dayCfg.drop}, ret=${dayCfg.ret})`);

      const picked = returnedIds.slice(0, dayCfg.val);
      let allocated = 0;
      for (let i = 0; i < picked.length; i++) {
        const amount = i === picked.length - 1 ? dayCfg.spend - allocated : randInt(350, 900);
        allocated += amount;
        const offer = offers[i % offers.length];
        await query(
          `INSERT INTO validations (order_id, offer_id, outlet, qty, amount, created_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [picked[i].id, offer ? offer.id : null,
           OUTLETS[randInt(0, OUTLETS.length - 1)], randInt(1, 4), amount,
           picked[i].returned]
        );
      }
      console.log(`seeded: validations for day ${dayCfg.daysAgo}d ago (${dayCfg.val}, AED ${dayCfg.spend})`);
    }
  }

  console.log("Seeding complete.");
}

function initials(name) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function pickStatus(createdMs, todayMs) {
  const hour = (createdMs - todayMs) / 3600 / SECONDS;
  if (hour >= 15) return "active";
  if (Math.random() < 0.4) return "parked";
  return "retrieving";
}

const PLATES = ["DXB J 5580", "DXB A 74126", "DXB Q 3345", "DXB B 12345", "DXB C 99887", "DXB D 55667", "DXB E 66789", "DXB F 44556", "DXB G 11223", "DXB H 99012"];
const CARS = [
  { car_make: "Mercedes", car_model: "G63", car_color: "Black" },
  { car_make: "Lexus", car_model: "LX", car_color: "White" },
  { car_make: "BMW", car_model: "7 Series", car_color: "Silver" },
  { car_make: "Ferrari", car_model: "F8", car_color: "Red" },
  { car_make: "Mercedes", car_model: "S-Class", car_color: "White" },
  { car_make: "Porsche", car_model: "Cayenne", car_color: "Grey" },
  { car_make: "Range Rover", car_model: "Sport", car_color: "Black" },
  { car_make: "Audi", car_model: "Q8", car_color: "Blue" },
  { car_make: "Bentley", car_model: "Continental", car_color: "Green" },
  { car_make: "Toyota", car_model: "Land Cruiser", car_color: "White" },
];
const OUTLETS = ["Kitchen6", "Vault", "Saray Spa", "Aquaventure", "Lobby Lounge", "Gym + Sauna"];

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

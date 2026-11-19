const express = require("express");
const path = require("path");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// GET /api/places?search=pizza&category=cafe&maxPrice=700&sort=cheap
app.get("/api/places", asyncRoute(async (req, res) => {
  const { search = "", category = "", maxPrice = "", sort = "popular" } = req.query;
  const values = [];
  const conditions = ["p.is_active = TRUE"];

  if (String(search).trim()) {
    const term = String(search).trim();
    values.push(`%${term}%`);
    const textParam = `$${values.length}`;
    const normalized = term.toLocaleLowerCase("ru-RU").replace(/ё/g, "е");
    const aliases = {
      cafe: ["кафе", "cafe"],
      pizza: ["пицца", "пиццерия", "пиццерии", "pizza"],
      sushi: ["суши", "роллы", "sushi"],
      fastfood: ["фастфуд", "бургер", "бургеры", "бургерная", "fastfood"],
      coffee: ["кофе", "кофейня", "кофейни", "coffee", "латте", "капучино", "матча"],
      dessert: ["десерт", "десерты", "кондитерская", "торт", "пирожное", "сладости", "dessert"]
    };
    const matchingSlugs = Object.entries(aliases)
      .filter(([, words]) => words.some(word => word.includes(normalized) || normalized.includes(word)))
      .map(([slug]) => slug);
    values.push(matchingSlugs);
    const categoryParam = `$${values.length}`;
    conditions.push(`(p.name ILIKE ${textParam} OR p.description ILIKE ${textParam} OR p.address ILIKE ${textParam} OR c.name ILIKE ${textParam} OR c.slug ILIKE ${textParam} OR c.slug = ANY(${categoryParam}::text[]))`);
  }
  if (category.trim() && category !== "all") {
    values.push(category.trim());
    conditions.push(`c.slug = $${values.length}`);
  }
  if (maxPrice && Number.isFinite(Number(maxPrice))) {
    values.push(Number(maxPrice));
    conditions.push(`p.average_check <= $${values.length}`);
  }

  const orderBy = sort === "cheap"
    ? "p.average_check ASC"
    : sort === "rating"
      ? "p.rating DESC"
      : "p.rating DESC, p.review_count DESC";

  const query = `
    SELECT p.id, p.name, p.slug, p.description, p.address, p.average_check,
           p.rating, p.review_count, p.image_url, p.opening_hours,
           c.name AS category, c.slug AS category_slug
    FROM places p
    JOIN categories c ON c.id = p.category_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY ${orderBy}
  `;
  const result = await pool.query(query, values);
  res.json(result.rows);
}));

app.get("/api/places/:id", asyncRoute(async (req, res) => {
  const result = await pool.query(`
    SELECT p.*, c.name AS category, c.slug AS category_slug
    FROM places p JOIN categories c ON c.id = p.category_id
    WHERE p.id = $1 AND p.is_active = TRUE
  `, [req.params.id]);

  if (!result.rowCount) return res.status(404).json({ error: "Заведение не найдено" });

  const reviews = await pool.query(`
    SELECT author_name, rating, body, created_at
    FROM reviews WHERE place_id = $1
    ORDER BY created_at DESC LIMIT 10
  `, [req.params.id]);

  res.json({ ...result.rows[0], reviews: reviews.rows });
}));

// Demo profile uses user_id=1. Add authentication before public production use.
app.get("/api/favorites", asyncRoute(async (req, res) => {
  const userId = Number(req.query.user_id || 1);
  const result = await pool.query(`
    SELECT p.id, p.name, p.average_check, p.rating, p.review_count, p.image_url,
           c.name AS category
    FROM favorites f
    JOIN places p ON p.id = f.place_id
    JOIN categories c ON c.id = p.category_id
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC
  `, [userId]);
  res.json(result.rows);
}));

app.post("/api/favorites", asyncRoute(async (req, res) => {
  const userId = Number(req.body.user_id || 1);
  const placeId = Number(req.body.place_id);
  if (!Number.isInteger(placeId) || placeId <= 0) {
    return res.status(400).json({ error: "Некорректный идентификатор заведения" });
  }
  await pool.query(
    "INSERT INTO favorites (user_id, place_id) VALUES ($1, $2) ON CONFLICT (user_id, place_id) DO NOTHING",
    [userId, placeId]
  );
  res.status(201).json({ ok: true });
}));

app.delete("/api/favorites/:placeId", asyncRoute(async (req, res) => {
  const userId = Number(req.query.user_id || 1);
  await pool.query("DELETE FROM favorites WHERE user_id = $1 AND place_id = $2", [userId, req.params.placeId]);
  res.json({ ok: true });
}));

app.get("/api/health", asyncRoute(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, database: "connected" });
}));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Ошибка сервера. Проверь подключение к базе данных." });
});

app.listen(PORT, () => {
  console.log(`Foodie☆ is running at http://localhost:${PORT}`);
});

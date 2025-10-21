import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import multer from "multer";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: true, // Разрешить все домены
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/warehouses";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `warehouse-${req.params.id}-${uniqueSuffix}${path.extname(
        file.originalname
      )}`
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Настройка multer для загрузки Excel файлов
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/temp";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const excelUpload = multer({
  storage: excelStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls|csv/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype =
      file.mimetype.includes("spreadsheet") ||
      file.mimetype.includes("excel") ||
      file.mimetype.includes("vnd.ms-excel") ||
      file.mimetype.includes(
        "vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) ||
      file.mimetype.includes("text/csv");

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls) or CSV files are allowed!"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for Excel files
  },
});

// Статическая папка для загруженных файлов
app.use("/uploads", express.static("uploads"));

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "app",
  password: process.env.DB_PASSWORD || "app",
  database: process.env.DB_NAME || "appdb",
});

// JWT секрет
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);

    // Создаем таблицу для хранения позиций
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouse_positions (
        id SERIAL PRIMARY KEY,
        warehouse_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        positions JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(warehouse_id, product_id)
      );
    `);

    // Создаем таблицу для хранения информации о складах
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        image_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Создаем таблицу пользователей
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'worker',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Добавляем начальные данные о складах
    const { rows: warehouseCount } = await client.query(
      "SELECT COUNT(*)::int AS count FROM warehouses;"
    );
    if (warehouseCount[0].count === 0) {
      const warehouses = [
        { name: "Главный склад", image_path: "/warehouse-scheme.svg" },
        { name: "Резервный склад", image_path: "/warehouse-scheme.svg" },
        { name: "Региональный склад", image_path: "/warehouse-scheme.svg" },
      ];
      for (const warehouse of warehouses) {
        await client.query(
          "INSERT INTO warehouses (name, image_path) VALUES ($1, $2);",
          [warehouse.name, warehouse.image_path]
        );
      }
    }

    // Добавляем админа по умолчанию
    const { rows: userCount } = await client.query(
      "SELECT COUNT(*)::int AS count FROM users;"
    );
    if (userCount[0].count === 0) {
      const adminPassword = await bcrypt.hash("admin123", 10);
      await client.query(
        "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3);",
        ["admin", adminPassword, "admin"]
      );
    }

    const { rows } = await client.query(
      "SELECT COUNT(*)::int AS count FROM products;"
    );
    if (rows[0].count === 0) {
      const seedProducts = [
        "iPhone 15",
        "MacBook Air",
        "AirPods Pro",
        "Apple Watch",
        "iPad Pro",
        "Magic Keyboard",
      ];
      for (const name of seedProducts) {
        await client.query("INSERT INTO products (name) VALUES ($1);", [name]);
      }
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("DB init error:", e);
  } finally {
    client.release();
  }
}

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Токен доступа отсутствует" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Недействительный токен" });
    }
    req.user = user;
    next();
  });
};

// Middleware для проверки роли админа
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Требуются права администратора" });
  }
  next();
};

app.get("/api/products", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "30", 10), 1),
      200
    );
    const offset = (page - 1) * limit;
    const positionsFilter = (req.query.positions || "all").toString(); // all | with | without

    const whereParts = [];
    const params = [];
    let fromClause = "FROM products";
    let extraJoin = "";
    let distinct = "";
    if (q) {
      whereParts.push("LOWER(name) LIKE $1");
      params.push(`%${q.toLowerCase()}%`);
    }
    if (positionsFilter === "with") {
      // select only products having at least one position
      extraJoin =
        " INNER JOIN warehouse_positions wp ON wp.product_id = products.id";
      distinct = "DISTINCT";
    } else if (positionsFilter === "without") {
      // select only products having no positions
      extraJoin =
        " LEFT JOIN warehouse_positions wp ON wp.product_id = products.id";
      whereParts.push("wp.product_id IS NULL");
    }
    const baseWhere =
      whereParts.length > 0 ? ` WHERE ${whereParts.join(" AND ")}` : "";

    // get total count
    const countSql =
      positionsFilter === "with"
        ? `SELECT COUNT(*)::int AS count FROM (SELECT DISTINCT products.id ${fromClause}${extraJoin}${baseWhere}) AS t`
        : `SELECT COUNT(*)::int AS count ${fromClause}${extraJoin}${baseWhere}`;
    const { rows: countRows } = await pool.query(countSql, params);
    const total = countRows[0]?.count || 0;

    // get page rows
    const rowsSql = `SELECT ${distinct} products.id, products.name ${fromClause}${extraJoin}${baseWhere} ORDER BY products.id ASC LIMIT $${
      params.length + 1
    } OFFSET $${params.length + 2}`;
    const { rows } = await pool.query(rowsSql, [...params, limit, offset]);

    res.json({
      items: rows,
      page,
      limit,
      total,
      hasMore: offset + rows.length < total,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Debug: positions summary
app.get("/api/debug/positions-summary", async (_req, res) => {
  try {
    const { rows: withRows } = await pool.query(
      `SELECT COUNT(DISTINCT p.id)::int AS count
       FROM products p
       INNER JOIN warehouse_positions wp ON wp.product_id = p.id`
    );
    const withCount = withRows[0]?.count || 0;
    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM products`
    );
    const totalCount = totalRows[0]?.count || 0;
    const withoutCount = Math.max(totalCount - withCount, 0);
    res.json({
      total: totalCount,
      withPositions: withCount,
      withoutPositions: withoutCount,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Debug error" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (!Number.isFinite(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }
    const { rows } = await pool.query(
      "SELECT id, name FROM products WHERE id = $1;",
      [productId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/products", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Invalid name" });
    }
    const { rows } = await pool.query(
      "INSERT INTO products (name) VALUES ($1) RETURNING id, name;",
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get warehouses for product (only those where product has positions)
app.get("/api/products/:id/warehouses", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (!Number.isFinite(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    // Get warehouses where this product has positions
    const result = await pool.query(
      `
      SELECT w.id, w.name, wp.positions
      FROM warehouses w
      INNER JOIN warehouse_positions wp ON w.id = wp.warehouse_id
      WHERE wp.product_id = $1
      ORDER BY w.id
    `,
      [productId]
    );

    const warehouses = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      positions: row.positions,
    }));

    res.json({ productId, warehouses });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Save positions for product in warehouse
app.put(
  "/api/warehouses/:id/positions",
  authenticateToken,
  async (req, res) => {
    console.log(
      "PUT /api/warehouses/:id/positions called with:",
      req.params,
      req.body
    );
    try {
      const warehouseId = Number(req.params.id);
      const { productId, positions } = req.body;

      if (!Number.isFinite(warehouseId)) {
        return res.status(400).json({ error: "Invalid warehouse id" });
      }

      if (!productId || !Array.isArray(positions)) {
        return res
          .status(400)
          .json({ error: "Invalid productId or positions" });
      }

      console.log(
        `Saving positions for product ${productId} in warehouse ${warehouseId}:`,
        positions
      );

      // Сохраняем позиции в базу данных
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Используем UPSERT для обновления или создания записи
        await client.query(
          `
        INSERT INTO warehouse_positions (warehouse_id, product_id, positions, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (warehouse_id, product_id)
        DO UPDATE SET 
          positions = EXCLUDED.positions,
          updated_at = CURRENT_TIMESTAMP
      `,
          [warehouseId, productId, JSON.stringify(positions)]
        );

        await client.query("COMMIT");
        console.log("Positions saved to database successfully");
      } catch (dbError) {
        await client.query("ROLLBACK");
        console.error("Database error:", dbError);
        throw dbError;
      } finally {
        client.release();
      }

      res.json({
        success: true,
        message: "Positions saved successfully",
        warehouseId,
        productId,
        positions,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get warehouse info
app.get("/api/warehouses/:id", async (req, res) => {
  try {
    const warehouseId = Number(req.params.id);
    if (!Number.isFinite(warehouseId)) {
      return res.status(400).json({ error: "Invalid warehouse id" });
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        "SELECT id, name, image_path FROM warehouses WHERE id = $1",
        [warehouseId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Warehouse not found" });
      }

      res.json(rows[0]);
    } catch (dbError) {
      console.error("Database error:", dbError);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Upload warehouse image
app.post(
  "/api/warehouses/:id/image",
  upload.single("image"),
  async (req, res) => {
    try {
      const warehouseId = Number(req.params.id);
      if (!Number.isFinite(warehouseId)) {
        return res.status(400).json({ error: "Invalid warehouse id" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imagePath = `/uploads/warehouses/${req.file.filename}`;
      console.log("Uploaded file:", req.file.filename);
      console.log("Image path:", imagePath);

      // Обновляем путь к изображению в базе данных
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Удаляем старое изображение, если оно существует
        const { rows: oldWarehouse } = await client.query(
          "SELECT image_path FROM warehouses WHERE id = $1",
          [warehouseId]
        );

        if (
          oldWarehouse.length > 0 &&
          oldWarehouse[0].image_path &&
          !oldWarehouse[0].image_path.startsWith("/warehouse-scheme.svg")
        ) {
          const oldImagePath = oldWarehouse[0].image_path.replace(
            "/uploads/",
            "uploads/"
          );
          if (fs.existsSync(oldImagePath)) {
            try {
              fs.unlinkSync(oldImagePath);
              console.log("Old image deleted:", oldImagePath);
            } catch (deleteError) {
              console.error("Error deleting old image:", deleteError);
            }
          }
        }

        // Обновляем путь к новому изображению
        await client.query(
          "UPDATE warehouses SET image_path = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [imagePath, warehouseId]
        );

        await client.query("COMMIT");

        res.json({
          success: true,
          message: "Image uploaded successfully",
          imagePath: imagePath,
        });
      } catch (dbError) {
        await client.query("ROLLBACK");
        console.error("Database error:", dbError);
        res.status(500).json({ error: "Internal Server Error" });
      } finally {
        client.release();
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Update warehouse image path
app.put(
  "/api/warehouses/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const warehouseId = Number(req.params.id);
      const { image_path } = req.body;

      if (!Number.isFinite(warehouseId)) {
        return res.status(400).json({ error: "Invalid warehouse id" });
      }

      if (!image_path || typeof image_path !== "string") {
        return res.status(400).json({ error: "Invalid image_path" });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        await client.query(
          "UPDATE warehouses SET image_path = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [image_path, warehouseId]
        );

        await client.query("COMMIT");

        res.json({
          success: true,
          message: "Warehouse updated successfully",
          warehouseId,
          image_path,
        });
      } catch (dbError) {
        await client.query("ROLLBACK");
        console.error("Database error:", dbError);
        res.status(500).json({ error: "Internal Server Error" });
      } finally {
        client.release();
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get warehouse map for specific product
app.get("/api/warehouses/:id/map", async (req, res) => {
  try {
    const warehouseId = Number(req.params.id);
    const productId = req.query.productId ? Number(req.query.productId) : null;

    if (!Number.isFinite(warehouseId)) {
      return res.status(400).json({ error: "Invalid warehouse id" });
    }

    let positions = [];

    // Если указан productId, пытаемся загрузить позиции из базы данных
    if (productId) {
      const client = await pool.connect();
      try {
        const { rows } = await client.query(
          "SELECT positions FROM warehouse_positions WHERE warehouse_id = $1 AND product_id = $2",
          [warehouseId, productId]
        );

        if (rows.length > 0) {
          positions = rows[0].positions;
          console.log(
            `Loaded positions from database for warehouse ${warehouseId}, product ${productId}:`,
            positions
          );
        }
      } catch (dbError) {
        console.error("Database error loading positions:", dbError);
      } finally {
        client.release();
      }
    }

    // Если позиции не найдены в базе данных, возвращаем пустой массив
    // (никаких моковых данных)

    res.json({ warehouseId, productId, positions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Получить все склады
app.get("/api/warehouses", async (req, res) => {
  try {
    const productId = req.query.productId ? Number(req.query.productId) : null;

    if (productId && !Number.isFinite(productId)) {
      return res.status(400).json({ error: "Invalid productId" });
    }

    if (productId) {
      // Возвращаем склады с количеством точек по указанному товару
      const { rows } = await pool.query(
        `SELECT w.id, w.name, w.image_path,
                COALESCE(jsonb_array_length(wp.positions), 0) AS points_count
         FROM warehouses w
         LEFT JOIN warehouse_positions wp
           ON wp.warehouse_id = w.id AND wp.product_id = $1
         ORDER BY w.id`,
        [productId]
      );
      return res.json(rows);
    }

    // Без productId просто отдаем склады без вычисления точек
    const result = await pool.query(
      "SELECT id, name, image_path FROM warehouses ORDER BY id"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    res.status(500).json({ error: "Ошибка при получении списка складов" });
  }
});

// Создать новый склад
app.post(
  "/api/warehouses",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Название склада обязательно" });
      }

      const result = await pool.query(
        "INSERT INTO warehouses (name) VALUES ($1) RETURNING *",
        [name.trim()]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error creating warehouse:", error);
      res.status(500).json({ error: "Ошибка при создании склада" });
    }
  }
);

// Обновить название склада
app.put(
  "/api/warehouses/:id/name",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Название склада обязательно" });
      }

      const result = await pool.query(
        "UPDATE warehouses SET name = $1 WHERE id = $2 RETURNING *",
        [name.trim(), id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Склад не найден" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating warehouse:", error);
      res.status(500).json({ error: "Ошибка при обновлении склада" });
    }
  }
);

// Delete warehouse
app.delete(
  "/api/warehouses/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Сначала проверим, существует ли склад
      const checkResult = await pool.query(
        "SELECT * FROM warehouses WHERE id = $1",
        [id]
      );
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: "Склад не найден" });
      }

      // Удаляем все позиции товаров на этом складе
      await pool.query(
        "DELETE FROM warehouse_positions WHERE warehouse_id = $1",
        [id]
      );

      // Удаляем сам склад
      await pool.query("DELETE FROM warehouses WHERE id = $1", [id]);

      res.json({ message: "Склад успешно удален" });
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      res.status(500).json({ error: "Ошибка при удалении склада" });
    }
  }
);

// Delete multiple products
app.delete(
  "/api/products/batch",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { productIds } = req.body;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: "Список ID товаров обязателен" });
      }

      // Проверяем, что все ID являются числами
      const invalidIds = productIds.filter(
        (id) => !Number.isInteger(id) || id <= 0
      );
      if (invalidIds.length > 0) {
        return res.status(400).json({ error: "Некорректные ID товаров" });
      }

      // Удаляем позиции товаров на всех складах
      await pool.query(
        "DELETE FROM warehouse_positions WHERE product_id = ANY($1)",
        [productIds]
      );

      // Удаляем сами товары
      const result = await pool.query(
        "DELETE FROM products WHERE id = ANY($1) RETURNING id, name",
        [productIds]
      );

      res.json({
        message: `Удалено товаров: ${result.rows.length}`,
        deletedProducts: result.rows,
      });
    } catch (error) {
      console.error("Error deleting products:", error);
      res.status(500).json({ error: "Ошибка при удалении товаров" });
    }
  }
);

// Import products from Excel file
app.post(
  "/api/products/import",
  authenticateToken,
  requireAdmin,
  excelUpload.single("excelFile"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Excel файл не найден" });
      }

      // Читаем файл (Excel или CSV)
      let jsonData;
      if (req.file.originalname.toLowerCase().endsWith(".csv")) {
        // Для CSV файлов читаем как текст и парсим
        const csvContent = fs.readFileSync(req.file.path, "utf8");
        const lines = csvContent.split("\n").filter((line) => line.trim());
        jsonData = lines.map((line) =>
          line.split(",").map((cell) => cell.trim())
        );
      } else {
        // Для Excel файлов используем XLSX
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      }

      // Извлекаем названия товаров из первого столбца (пропускаем заголовок если есть)
      const productNames = [];
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row[0] && typeof row[0] === "string" && row[0].trim()) {
          productNames.push(row[0].trim());
        }
      }

      if (productNames.length === 0) {
        return res
          .status(400)
          .json({ error: "В Excel файле не найдено названий товаров" });
      }

      // Получаем все существующие товары
      const existingProducts = await pool.query(
        "SELECT id, name FROM products"
      );
      const existingProductNames = new Set(
        existingProducts.rows.map((p) => p.name)
      );

      // Находим товары для создания (есть в Excel, нет в БД)
      const productsToCreate = productNames.filter(
        (name) => !existingProductNames.has(name)
      );

      // Находим товары для удаления (есть в БД, нет в Excel)
      const productsToDelete = existingProducts.rows.filter(
        (p) => !productNames.includes(p.name)
      );

      const createdProducts = [];
      const deletedProducts = [];
      const errors = [];

      // Создаем новые товары
      for (const productName of productsToCreate) {
        try {
          const result = await pool.query(
            "INSERT INTO products (name) VALUES ($1) RETURNING id, name",
            [productName]
          );
          createdProducts.push(result.rows[0]);
        } catch (error) {
          console.error(`Ошибка при создании товара "${productName}":`, error);
          errors.push(
            `Ошибка при создании товара "${productName}": ${error.message}`
          );
        }
      }

      // Удаляем товары, которых нет в Excel
      for (const product of productsToDelete) {
        try {
          // Сначала удаляем связанные позиции на складах
          await pool.query(
            "DELETE FROM warehouse_positions WHERE product_id = $1",
            [product.id]
          );

          // Затем удаляем сам товар
          await pool.query("DELETE FROM products WHERE id = $1", [product.id]);

          deletedProducts.push(product);
        } catch (error) {
          console.error(`Ошибка при удалении товара "${product.name}":`, error);
          errors.push(
            `Ошибка при удалении товара "${product.name}": ${error.message}`
          );
        }
      }

      // Удаляем временный файл
      fs.unlinkSync(req.file.path);

      res.json({
        message: `Импорт завершен. Создано товаров: ${createdProducts.length}, удалено товаров: ${deletedProducts.length}`,
        createdProducts,
        deletedProducts,
        errors: errors.length > 0 ? errors : undefined,
        totalProcessed: productNames.length,
        totalInExcel: productNames.length,
        totalInDatabase: existingProducts.rows.length,
      });
    } catch (error) {
      console.error("Error importing products:", error);

      // Удаляем временный файл в случае ошибки
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting temp file:", unlinkError);
        }
      }

      res.status(500).json({ error: "Ошибка при импорте товаров" });
    }
  }
);

const port = parseInt(process.env.PORT || "5000", 10);

// Start server immediately
app.listen(port, () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
});

// Endpoints для авторизации
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Имя пользователя и пароль обязательны" });
    }

    const { rows } = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE username = $1",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Неверные учетные данные" });
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Неверные учетные данные" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Получить информацию о текущем пользователе
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
    },
  });
});

// Получить всех пользователей (только для админа)
app.get("/api/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, username, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Ошибка при получении пользователей" });
  }
});

// Создать нового пользователя (только для админа)
app.post("/api/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, role = "worker" } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    if (role !== "admin" && role !== "worker") {
      return res.status(400).json({ error: "Неверная роль" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at",
      [username, passwordHash, role]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      return res.status(400).json({
        error: "Пользователь с таким именем уже существует",
      });
    }
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Ошибка при создании пользователя" });
  }
});

// Удалить пользователя (только для админа)
app.delete(
  "/api/users/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (userId === req.user.id) {
        return res.status(400).json({ error: "Нельзя удалить самого себя" });
      }

      const { rows } = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING username",
        [userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      res.json({ message: `Пользователь ${rows[0].username} удален` });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Ошибка при удалении пользователя" });
    }
  }
);

// Initialize DB in background
initDb().catch(console.error);

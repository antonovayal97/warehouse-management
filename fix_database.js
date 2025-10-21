import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "app",
  password: process.env.DB_PASSWORD || "app",
  database: process.env.DB_NAME || "appdb",
});

async function fixWarehouseImages() {
  const client = await pool.connect();
  try {
    console.log("Подключение к базе данных...");

    // Получаем все склады с неправильными путями
    const { rows } = await client.query(
      "SELECT id, name, image_path FROM warehouses WHERE image_path LIKE '/uploads/warehouse-%' AND image_path NOT LIKE '/uploads/warehouses/%'"
    );

    console.log(`Найдено ${rows.length} складов с неправильными путями:`);
    rows.forEach((row) => {
      console.log(`- Склад ${row.id}: ${row.name} -> ${row.image_path}`);
    });

    // Исправляем пути
    for (const row of rows) {
      const correctPath = row.image_path.replace(
        "/uploads/",
        "/uploads/warehouses/"
      );
      console.log(
        `Исправляем склад ${row.id}: ${row.image_path} -> ${correctPath}`
      );

      await client.query(
        "UPDATE warehouses SET image_path = $1 WHERE id = $2",
        [correctPath, row.id]
      );
    }

    console.log("Исправление завершено!");

    // Проверяем результат
    const { rows: updatedRows } = await client.query(
      "SELECT id, name, image_path FROM warehouses"
    );

    console.log("\nТекущее состояние складов:");
    updatedRows.forEach((row) => {
      console.log(`- Склад ${row.id}: ${row.name} -> ${row.image_path}`);
    });
  } catch (error) {
    console.error("Ошибка:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixWarehouseImages();

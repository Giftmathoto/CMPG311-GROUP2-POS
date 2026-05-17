const express = require('express');
const router = express.Router();
const pool = require('../db');

function generateBarcode(name) {
  const cleanName = String(name || 'PRD')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 3);

  const prefix = cleanName || 'PRD';
  const timePart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return `${prefix}-${timePart}-${randomPart}`;
}

// GET all products with inventory
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.product_id AS id,
        p.product_name AS name,
        p.description,
        p.price,
        p.barcode AS sku,
        pc.category_name,
        s.supplier_name,
        COALESCE(i.stock_quantity, 0) AS stock
      FROM product p
      LEFT JOIN product_category pc ON p.category_id = pc.category_id
      LEFT JOIN supplier s ON p.supplier_id = s.supplier_id
      LEFT JOIN inventory i ON p.product_id = i.product_id
      ORDER BY p.product_id DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('GET PRODUCTS ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET low stock products
router.get('/low-stock', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.product_id AS id,
        p.product_name AS name,
        p.price,
        p.barcode AS sku,
        COALESCE(i.stock_quantity, 0) AS stock,
        CASE
          WHEN COALESCE(i.stock_quantity, 0) = 0 THEN 'OUT OF STOCK'
          WHEN COALESCE(i.stock_quantity, 0) < 20 THEN 'LOW STOCK'
          ELSE 'OK'
        END AS stock_status
      FROM product p
      LEFT JOIN inventory i ON p.product_id = i.product_id
      WHERE COALESCE(i.stock_quantity, 0) < 20
      ORDER BY COALESCE(i.stock_quantity, 0) ASC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('LOW STOCK ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST product
// Rule: same product name + same price increases stock only.
// Different name OR same name with different price creates a new product row.
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { name, price, stock } = req.body;

    if (!name || price === undefined || price === null || price === '') {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    const productPrice = Number(price);
    const qtyToAdd = Number(stock || 0);

    if (!Number.isFinite(productPrice) || productPrice < 0) {
      return res.status(400).json({ error: 'Product price must be a valid non-negative number' });
    }

    if (!Number.isFinite(qtyToAdd) || qtyToAdd < 0) {
      return res.status(400).json({ error: 'Stock quantity must be a valid non-negative number' });
    }

    await client.query('BEGIN');

    const existingProduct = await client.query(`
      SELECT
        product_id AS id,
        product_name AS name,
        price,
        barcode AS sku
      FROM product
      WHERE LOWER(TRIM(product_name)) = LOWER(TRIM($1))
        AND price = $2
      LIMIT 1;
    `, [name, productPrice]);

    if (existingProduct.rows.length > 0) {
      const product = existingProduct.rows[0];

      let inventoryResult = await client.query(`
        UPDATE inventory
        SET stock_quantity = stock_quantity + $1
        WHERE product_id = $2
        RETURNING stock_quantity AS stock;
      `, [qtyToAdd, product.id]);

      if (inventoryResult.rows.length === 0) {
        inventoryResult = await client.query(`
          INSERT INTO inventory (product_id, stock_quantity)
          VALUES ($1, $2)
          RETURNING stock_quantity AS stock;
        `, [product.id, qtyToAdd]);
      }

      await client.query('COMMIT');

      return res.json({
        ...product,
        stock: inventoryResult.rows[0].stock,
        message: 'Existing product quantity increased'
      });
    }

    const productResult = await client.query(`
      INSERT INTO product
      (product_name, description, price, barcode, category_id, supplier_id)
      VALUES ($1, $2, $3, $4, 1, 1)
      RETURNING
        product_id AS id,
        product_name AS name,
        price,
        barcode AS sku;
    `, [
      name,
      'New product',
      productPrice,
      generateBarcode(name)
    ]);

    const product = productResult.rows[0];

    const inventoryResult = await client.query(`
      INSERT INTO inventory
      (product_id, stock_quantity)
      VALUES ($1, $2)
      RETURNING stock_quantity AS stock;
    `, [product.id, qtyToAdd]);

    await client.query('COMMIT');

    res.status(201).json({
      ...product,
      stock: inventoryResult.rows[0].stock,
      message: 'New product added'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ADD PRODUCT ERROR:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE product and its inventory row
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    await client.query('DELETE FROM inventory WHERE product_id = $1;', [id]);

    const result = await client.query(`
      DELETE FROM product
      WHERE product_id = $1
      RETURNING product_id;
    `, [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    await client.query('COMMIT');

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DELETE PRODUCT ERROR:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// UPDATE product
router.put('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { name, price, stock } = req.body;

    await client.query('BEGIN');

    const updateProduct = await client.query(`
      UPDATE product
      SET product_name = $1,
          price = $2
      WHERE product_id = $3
      RETURNING product_id AS id, product_name AS name, price, barcode AS sku;
    `, [name, Number(price), id]);

    if (!updateProduct.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found.' });
    }

    let updateInventory = await client.query(`
      UPDATE inventory
      SET stock_quantity = $1
      WHERE product_id = $2
      RETURNING stock_quantity AS stock;
    `, [Number(stock || 0), id]);

    if (!updateInventory.rows.length) {
      updateInventory = await client.query(`
        INSERT INTO inventory (product_id, stock_quantity)
        VALUES ($1, $2)
        RETURNING stock_quantity AS stock;
      `, [id, Number(stock || 0)]);
    }

    await client.query('COMMIT');

    res.json({
      ...updateProduct.rows[0],
      stock: updateInventory.rows[0].stock
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('UPDATE PRODUCT ERROR:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;

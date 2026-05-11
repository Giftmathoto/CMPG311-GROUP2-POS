const express = require('express');
const router = express.Router();
const pool = require('../db'); 

router.get('/', async (req, res) => {
    console.log("THE SERVER IS READING THE NEW CODE!"); 

    try {
        const result = await pool.query(`
            SELECT p.product_id AS id, p.name, p.price, p.stock, c.category_name, s.supplier_name 
            FROM PRODUCT p
            JOIN PRODUCT_CATEGORY c ON p.category_id = c.category_id
            JOIN SUPPLIER s ON p.supplier_id = s.supplier_id;
        `);
        res.json(result.rows); 
    } catch (err) {
        console.error("DATABASE ERROR:", err.message); 
        res.status(500).json({ error: err.message });
    }
});
// POST create product
router.post('/', async (req, res) => {
  const { name, price, stock } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, stock) VALUES ($1, $2, $3) RETURNING *',
      [name, price, stock]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// PUT update product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stock } = req.body;

        const updateProduct = await pool.query(
            `UPDATE PRODUCT 
             SET name = $1, price = $2, stock = $3 
             WHERE product_id = $4 
             RETURNING product_id AS id, name, price, stock;`,
            [name, price, stock, id]
        );

        if (updateProduct.rows.length === 0) {
            return res.status(404).json({ error: "Product not found in database" });
        }

        res.json(updateProduct.rows[0]);

    } catch (err) {
        console.error("UPDATE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});


// DELETE product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deleteProduct = await pool.query(
            `DELETE FROM PRODUCT 
             WHERE product_id = $1 
             RETURNING *;`,
            [id]
        );

        if (deleteProduct.rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json({ message: "Product deleted successfully" });

    } catch (err) {
        console.error("DELETE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});


router.post('/', async (req, res) => {
    try {
        const { name, price, stock } = req.body; 
        
        const category_id = 1; 
        const supplier_id = 1;

        const newProduct = await pool.query(
            `INSERT INTO PRODUCT (name, price, stock, category_id, supplier_id) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING product_id AS id, name, price, stock;`,
            [name, price, stock, category_id, supplier_id]
        );

        res.json(newProduct.rows[0]);

    } catch (err) {
        console.error("POST ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
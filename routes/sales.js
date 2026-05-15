const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all sales
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.sale_id AS id, s.customer_id, s.employee_id, s.sale_date, s.total_amount, 
             c.first_name AS customer_name, e.first_name AS employee_name
      FROM SALE s
      LEFT JOIN CUSTOMER c ON s.customer_id = c.customer_id
      LEFT JOIN EMPLOYEE e ON s.employee_id = e.employee_id
      ORDER BY s.sale_date DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET single sale
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM SALE WHERE sale_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create sale
router.post('/', async (req, res) => {
  const { customer_id, employee_id, total_amount } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO SALE (customer_id, employee_id, sale_date, total_amount) 
       VALUES ($1, $2, NOW(), $3) 
       RETURNING sale_id AS id, customer_id, employee_id, sale_date, total_amount`,
      [customer_id, employee_id, total_amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update sale
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { customer_id, employee_id, total_amount } = req.body;
  try {
    const result = await pool.query(
      `UPDATE SALE 
       SET customer_id = $1, employee_id = $2, total_amount = $3
       WHERE sale_id = $4 
       RETURNING sale_id AS id, customer_id, employee_id, sale_date, total_amount`,
      [customer_id, employee_id, total_amount, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE sale
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM SALE WHERE sale_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json({ message: 'Sale deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

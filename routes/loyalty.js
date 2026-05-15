const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all loyalty records
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.loyalty_id AS id, l.customer_id, l.points_balance, l.last_updated,
             c.first_name AS customer_name, c.email
      FROM LOYALTY_PROGRAM l
      JOIN CUSTOMER c ON l.customer_id = c.customer_id
      ORDER BY l.points_balance DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET single loyalty record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM LOYALTY_PROGRAM WHERE loyalty_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loyalty record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create loyalty record
router.post('/', async (req, res) => {
  const { customer_id, points_balance } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO LOYALTY_PROGRAM (customer_id, points_balance, last_updated) 
       VALUES ($1, $2, NOW()) 
       RETURNING loyalty_id AS id, customer_id, points_balance, last_updated`,
      [customer_id, points_balance || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update loyalty record
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { points_balance } = req.body;
  try {
    const result = await pool.query(
      `UPDATE LOYALTY_PROGRAM 
       SET points_balance = $1, last_updated = NOW()
       WHERE loyalty_id = $2 
       RETURNING loyalty_id AS id, customer_id, points_balance, last_updated`,
      [points_balance, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loyalty record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE loyalty record
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM LOYALTY_PROGRAM WHERE loyalty_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loyalty record not found' });
    }
    res.json({ message: 'Loyalty record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

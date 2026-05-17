const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET feedback records
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        f.feedback_id,
        f.customer_id,
        f.product_id,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        p.product_name,
        f.rating,
        f.comment,
        f.feedback_date
      FROM feedback f
      LEFT JOIN customer c ON f.customer_id = c.customer_id
      LEFT JOIN product p ON f.product_id = p.product_id
      ORDER BY f.feedback_id DESC;
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('GET FEEDBACK ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST feedback
router.post('/', async (req, res) => {
  try {
    const { customer_id, product_id, rating, comment } = req.body;

    if (!customer_id || !product_id || !rating) {
      return res.status(400).json({
        error: 'customer_id, product_id and rating are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO feedback
      (customer_id, product_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [
      customer_id,
      product_id,
      rating,
      comment || null
    ]);

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('POST FEEDBACK ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
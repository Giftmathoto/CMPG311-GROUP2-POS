const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET loyalty data from customers. Loyalty ID is generated from customer_id.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        customer_id AS id,
        CONCAT(first_name, ' ', last_name) AS customer,
        'LOY-' || LPAD(customer_id::text, 5, '0') AS loyalty_id,
        0 AS loyalty_points,
        'Bronze Tier 🥉' AS status
      FROM customer
      ORDER BY customer_id DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('GET LOYALTY ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

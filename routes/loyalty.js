const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET loyalty data from customers. Loyalty ID is generated from customer_id.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.customer_id AS id,
        c.first_name,
        c.last_name,
        CONCAT(c.first_name, ' ', c.last_name) AS name,
        c.email,
        c.phone,
        'LOY-' || LPAD(c.customer_id::text, 5, '0') AS loyalty_id,

        COALESCE(SUM(ti.quantity), 0) AS loyalty_points,

        CASE
          WHEN COALESCE(SUM(ti.quantity), 0) BETWEEN 1 AND 5 THEN 'Bronze'
          WHEN COALESCE(SUM(ti.quantity), 0) BETWEEN 6 AND 10 THEN 'Silver'
          WHEN COALESCE(SUM(ti.quantity), 0) >= 11 THEN 'Gold'
          ELSE 'No Tier'
        END AS loyalty_tier

      FROM customer c

      LEFT JOIN sales_transaction st
        ON c.customer_id = st.customer_id

      LEFT JOIN transaction_item ti
        ON st.transaction_id = ti.transaction_id

      GROUP BY c.customer_id
      ORDER BY c.customer_id DESC;
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('GET LOYALTY ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const pool = require('../db');

function buildLoyaltyId(customerId) {
  return `LOY-${String(customerId).padStart(5, '0')}`;
}

// GET all customers from the database
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        customer_id AS id,
        first_name,
        last_name,
        CONCAT(first_name, ' ', last_name) AS name,
        email,
        phone,
        address,
        city,
        'LOY-' || LPAD(customer_id::text, 5, '0') AS loyalty_id,
        0 AS loyalty_points
      FROM customer
      ORDER BY customer_id DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('GET CUSTOMERS ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST add customer to the database
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, address, city } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'first_name and last_name are required' });
    }

    const result = await pool.query(`
      INSERT INTO customer (first_name, last_name, email, phone, address, city)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        customer_id AS id,
        first_name,
        last_name,
        CONCAT(first_name, ' ', last_name) AS name,
        email,
        phone,
        address,
        city;
    `, [
      first_name,
      last_name,
      email || null,
      phone || null,
      address || null,
      city || null
    ]);

    const customer = result.rows[0];
    customer.loyalty_id = buildLoyaltyId(customer.id);
    customer.loyalty_points = 0;

    res.status(201).json(customer);
  } catch (err) {
    console.error('ADD CUSTOMER ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT update customer in the database
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, address, city } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'first_name and last_name are required' });
    }

    const result = await pool.query(`
      UPDATE customer
      SET first_name = $1,
          last_name  = $2,
          email      = $3,
          phone      = $4,
          address    = $5,
          city       = $6
      WHERE customer_id = $7
      RETURNING
        customer_id AS id,
        first_name,
        last_name,
        CONCAT(first_name, ' ', last_name) AS name,
        email,
        phone,
        address,
        city;
    `, [
      first_name,
      last_name,
      email || null,
      phone || null,
      address || null,
      city || null,
      id
    ]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = result.rows[0];
    customer.loyalty_id = buildLoyaltyId(customer.id);
    customer.loyalty_points = 0;

    res.json(customer);
  } catch (err) {
    console.error('UPDATE CUSTOMER ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE customer from the database while preserving sales records
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    await client.query(
      'UPDATE sales_transaction SET customer_id = NULL WHERE customer_id = $1;',
      [id]
    );

    const result = await client.query(
      'DELETE FROM customer WHERE customer_id = $1 RETURNING customer_id AS id;',
      [id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Customer deleted successfully', id: result.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DELETE CUSTOMER ERROR:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;

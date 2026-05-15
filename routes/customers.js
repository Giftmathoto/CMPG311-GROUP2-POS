const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all customers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.customer_id AS id, c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.registration_date
      FROM CUSTOMER c
      ORDER BY c.registration_date DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET single customer
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM CUSTOMER WHERE customer_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create customer
router.post('/', async (req, res) => {
  const { first_name, last_name, email, phone, address, city } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO CUSTOMER (first_name, last_name, email, phone, address, city, registration_date) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING customer_id AS id, first_name, last_name, email, phone, address, city, registration_date`,
      [first_name, last_name, email, phone, address, city]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, phone, address, city } = req.body;
  try {
    const result = await pool.query(
      `UPDATE CUSTOMER 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, address = $5, city = $6
       WHERE customer_id = $7 
       RETURNING customer_id AS id, first_name, last_name, email, phone, address, city`,
      [first_name, last_name, email, phone, address, city, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM CUSTOMER WHERE customer_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

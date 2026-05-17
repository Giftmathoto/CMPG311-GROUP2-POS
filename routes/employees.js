const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        employee_id AS id,
        employee_name AS name,
        employee_name,
        email,
        phone,
        salary
      FROM employee
      ORDER BY employee_id DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('GET EMPLOYEES ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, employee_name, email, phone, salary } = req.body;
    const finalName = employee_name || name;

    if (!finalName) {
      return res.status(400).json({ error: 'employee_name is required' });
    }

    const result = await pool.query(`
      INSERT INTO employee (employee_name, email, phone, salary)
      VALUES ($1, $2, $3, $4)
      RETURNING employee_id AS id, employee_name AS name, employee_name, email, phone, salary;
    `, [finalName, email || null, phone || null, salary || null]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST EMPLOYEE ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

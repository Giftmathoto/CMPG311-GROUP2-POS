const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all employees
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.employee_id AS id, e.first_name, e.last_name, e.email, e.phone, e.position, e.hire_date, e.salary
      FROM EMPLOYEE e
      ORDER BY e.hire_date DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET single employee
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM EMPLOYEE WHERE employee_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create employee
router.post('/', async (req, res) => {
  const { first_name, last_name, email, phone, position, salary } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO EMPLOYEE (first_name, last_name, email, phone, position, salary, hire_date) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING employee_id AS id, first_name, last_name, email, phone, position, salary, hire_date`,
      [first_name, last_name, email, phone, position, salary]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update employee
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name, email, phone, position, salary } = req.body;
  try {
    const result = await pool.query(
      `UPDATE EMPLOYEE 
       SET first_name = $1, last_name = $2, email = $3, phone = $4, position = $5, salary = $6
       WHERE employee_id = $7 
       RETURNING employee_id AS id, first_name, last_name, email, phone, position, salary`,
      [first_name, last_name, email, phone, position, salary, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE employee
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM EMPLOYEE WHERE employee_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

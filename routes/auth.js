const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/login', async (req, res) => {
  try {

    const {
      username,
      password
    } = req.body;

    const result = await pool.query(`
      SELECT
        employee_id AS id,
        employee_name,
        username,
        email,
        role
      FROM employee
      WHERE LOWER(username) = LOWER($1)
      AND password = $2
      LIMIT 1;
    `, [username, password]);

    if (!result.rows.length) {
      return res.status(401).json({
        error: 'Invalid employee credentials'
      });
    }

    res.json({
      message: 'Login successful',
      employee: result.rows[0]
    });

  } catch (err) {

    console.error('LOGIN ERROR:', err.message);

    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
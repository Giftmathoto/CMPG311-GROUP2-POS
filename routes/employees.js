const express = require('express');
const router = express.Router();
const pool = require('../db'); // Adjust this path if your db.js is located somewhere else!

// GET all employees for the frontend dashboard
router.get('/', async (req, res) => {
    try {
        const allEmployees = await pool.query(`
            SELECT id, employee_name AS name, role, status 
            FROM employee 
            ORDER BY id ASC;
        `);
        
        res.json(allEmployees.rows);
    } catch (err) {
        console.error("GET EMPLOYEES ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST a new employee to the database
router.post('/', async (req, res) => {
    try {
        const { name, role, status } = req.body;

        const newEmployee = await pool.query(
            `INSERT INTO employee (employee_name, role, status) 
             VALUES ($1, $2, $3) 
             RETURNING *;`,
            [name, role, status || 'Active']
        );

        res.json(newEmployee.rows[0]);
    } catch (err) {
        console.error("POST EMPLOYEE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
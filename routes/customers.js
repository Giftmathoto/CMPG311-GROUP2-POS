const express = require('express');
const router = express.Router();
const pool = require('../db'); 

// GET all customers for the frontend dashboard
router.get('/', async (req, res) => {
    try {
        const allCustomers = await pool.query(`
            SELECT id, name, email, loyalty_points 
            FROM customer 
            ORDER BY id ASC;
        `);
        
        res.json(allCustomers.rows);
    } catch (err) {
        console.error("GET CUSTOMERS ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST a new customer
router.post('/', async (req, res) => {
    try {
        const { name, email } = req.body;

        const newCustomer = await pool.query(
            `INSERT INTO customer (name, email) 
             VALUES ($1, $2) 
             RETURNING *;`,
            [name, email]
        );

        res.json(newCustomer.rows[0]);
    } catch (err) {
        console.error("POST CUSTOMER ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
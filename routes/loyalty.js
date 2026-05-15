const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET loyalty data and calculate tiers dynamically
router.get('/', async (req, res) => {
    try {
        const loyaltyData = await pool.query(`
            SELECT 
                id, 
                name AS customer, 
                loyalty_points,
                CASE 
                    WHEN loyalty_points >= 100 THEN 'Gold Tier 🏆'
                    WHEN loyalty_points >= 50 THEN 'Silver Tier 🥈'
                    ELSE 'Bronze Tier 🥉'
                END AS status
            FROM customer
            ORDER BY loyalty_points DESC;
        `);
        
        res.json(loyaltyData.rows);
    } catch (err) {
        console.error("GET LOYALTY ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
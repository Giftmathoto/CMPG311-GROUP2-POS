const express = require('express');
const router = express.Router();
const pool = require('../db');

// 1. GET all past sales (Sales History)
router.get('/', async (req, res) => {
    try {
        const sales = await pool.query(`
            SELECT 
                id AS receipt_number, 
                transaction_date, 
                total,
                'Default Cashier' AS cashier,
                'Walk-in Customer' AS customer
            FROM sales_transaction
            ORDER BY transaction_date DESC;
        `);
        res.json(sales.rows);
    } catch (err) {
        console.error("GET SALES ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// 2. THE MASTER CHECKOUT ROUTE (Receives data from register.html)
router.post('/', async (req, res) => {
    console.log("🛒 CHECKOUT TRIGGERED! Cart data:", req.body);

    try {
        // Grab the exact variables sent from register.html
        const { customer_id, total_amount, payment_method, items } = req.body;
        const employee_id = 1; // Default Cashier for now

        // A. Create the main receipt in sales_transaction
        const newSale = await pool.query(
            `INSERT INTO sales_transaction (customer_id, employee_id, total) 
             VALUES ($1, $2, $3) 
             RETURNING id;`,
            [customer_id, employee_id, total_amount]
        );
        const transaction_id = newSale.rows[0].id;

        // B. Award Loyalty Points! (1 point per 10 Rand)
        if (customer_id) {
            const pointsEarned = Math.floor(total_amount / 10);
            await pool.query(
                `UPDATE customer 
                 SET loyalty_points = COALESCE(loyalty_points, 0) + $1 
                 WHERE id = $2;`,
                [pointsEarned, customer_id]
            );
            console.log(`🏆 Awarded ${pointsEarned} points to customer #${customer_id}`);
        }

        // C. Loop through the cart items
        for (let item of items) {
            // Save line item to receipt
            await pool.query(
                `INSERT INTO transaction_item (transaction_id, product_id, quantity, unit_price, subtotal) 
                 VALUES ($1, $2, $3, $4, $5);`,
                [transaction_id, item.id, item.qty, item.price, (item.price * item.qty)]
            );

            // Deduct the bought quantity from the inventory table
            await pool.query(
                `UPDATE inventory 
                 SET quantity = quantity - $1 
                 WHERE product_id = $2;`,
                [item.qty, item.id]
            );
        }

        // D. Send Success back to the UI!
        res.json({ 
            message: "Sale completed successfully!", 
            receipt_number: transaction_id 
        });

    } catch (err) {
        console.error("CHECKOUT ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. DELETE (Void) a sale and return items to stock
router.delete('/:id', async (req, res) => {
    const receipt_id = req.params.id;
    console.log(`VOID TRIGGERED for Receipt #${receipt_id}`);

    try {
        const itemsToReturn = await pool.query(
            `SELECT product_id, quantity FROM transaction_item WHERE transaction_id = $1;`,
            [receipt_id]
        );

        if (itemsToReturn.rows.length === 0) {
            return res.status(404).json({ error: "Receipt not found." });
        }

        for (let item of itemsToReturn.rows) {
            await pool.query(
                `UPDATE inventory SET quantity = quantity + $1 WHERE product_id = $2;`,
                [item.quantity, item.product_id]
            );
        }

        await pool.query(`DELETE FROM transaction_item WHERE transaction_id = $1;`, [receipt_id]);
        await pool.query(`DELETE FROM sales_transaction WHERE id = $1;`, [receipt_id]);

        res.json({ message: `Receipt #${receipt_id} successfully voided.` });
    } catch (err) {
        console.error("VOID ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

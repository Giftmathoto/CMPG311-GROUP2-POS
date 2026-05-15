const express = require('express');
const router = express.Router();
const pool = require('../db'); 

router.get('/', async (req, res) => {
    console.log("All good.", req.body);

    try {
        const result = await pool.query(`
            SELECT 
                p.id, 
                p.product_name AS name, 
                p.price, 
                COALESCE(i.quantity, 0) AS stock, 
                c.category_name, 
                s.supplier_name 
            FROM product p
            LEFT JOIN product_category c ON p.category_id = c.id
            LEFT JOIN supplier s ON p.supplier_id = s.id
            LEFT JOIN inventory i ON p.id = i.product_id;
        `);
        res.json(result.rows); 
    } catch (err) {
        console.error("DATABASE ERROR:", err.message); 
        res.status(500).json({ error: err.message });
    }
});
// POST a new product
router.post('/', async (req, res) => {
    console.log("Incoming POST data:", req.body);

    try {
        const { name, price, stock } = req.body; 
        const category_id = 1; 
        const supplier_id = 1;

        const newProduct = await pool.query(
            `INSERT INTO product (product_name, description, price, category_id, supplier_id) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, product_name AS name, price;`,
            [name, "New product", price, category_id, supplier_id]
        );

        const newProductId = newProduct.rows[0].id;

        const newInventory = await pool.query(
            `INSERT INTO inventory (product_id, quantity) 
             VALUES ($1, $2) 
             RETURNING quantity AS stock;`,
            [newProductId, stock || 0]
        );

        const responseData = {
            id: newProductId,
            name: newProduct.rows[0].name,
            price: newProduct.rows[0].price,
            stock: newInventory.rows[0].stock,
            category_name: "Default Category",
            supplier_name: "Default Supplier"
        };

        res.json(responseData);

    } catch (err) {
        console.error("POST ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE a product from the system
router.delete('/:id', async (req, res) => {
    const product_id = req.params.id;
    console.log(`DELETE TRIGGERED for Product #${product_id}`);

    try {
        await pool.query('DELETE FROM inventory WHERE product_id = $1;', [product_id]);

        const deleteResult = await pool.query('DELETE FROM product WHERE id = $1 RETURNING *;', [product_id]);

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ error: "Product not found." });
        }

        res.json({ message: `Product #${product_id} successfully deleted.` });

    } catch (err) {
        console.error("DELETE PRODUCT ERROR:", err.message);
        
        if (err.message.includes('transaction_item_product_id_fkey')) {
            return res.status(400).json({ 
                error: "Cannot delete this product! It exists on a past sales receipt. You must void the sale first to protect your financial records." 
            });
        }

        res.status(500).json({ error: err.message });
    }
});

// PUT update product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stock } = req.body;

        const updateProduct = await pool.query(
            `UPDATE product SET product_name = $1, price = $2 WHERE id = $3 RETURNING id, product_name AS name, price;`,
            [name, price, id]
        );

        if (updateProduct.rows.length === 0) {
            return res.status(404).json({ error: "Product not found in database" });
        }

        let updateInventory = await pool.query(
            `UPDATE inventory SET quantity = $1 WHERE product_id = $2 RETURNING quantity AS stock;`,
            [stock, id]
        );

        if (updateInventory.rows.length === 0) {
            console.log(`🔧 Healing missing inventory record for Product #${id}`);
            updateInventory = await pool.query(
                `INSERT INTO inventory (product_id, quantity) VALUES ($1, $2) RETURNING quantity AS stock;`,
                [id, stock]
            );
        }

        res.json({
            id: updateProduct.rows[0].id,
            name: updateProduct.rows[0].name,
            price: updateProduct.rows[0].price,
            stock: updateInventory.rows[0].stock
        });

    } catch (err) {
        console.error("UPDATE ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
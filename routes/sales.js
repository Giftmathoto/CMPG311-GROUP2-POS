const express = require('express');
const router = express.Router();
const pool = require('../db');

async function getOrCreateEmployee(client) {
  const existing = await client.query('SELECT employee_id FROM employee ORDER BY employee_id LIMIT 1;');
  if (existing.rows.length) return existing.rows[0].employee_id;

  const created = await client.query(`
    INSERT INTO employee (employee_name, email, phone, salary)
    VALUES ('Admin User', 'admin@pos.com', '0123456789', 10000)
    RETURNING employee_id;
  `);

  return created.rows[0].employee_id;
}

// GET all sales for dashboard and sales list
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        st.transaction_id AS id,
        st.customer_id,
        COALESCE(CONCAT(c.first_name, ' ', c.last_name), 'Deleted / Unknown Customer') AS customer_name,
        st.employee_id,
        e.employee_name,
        st.transaction_date,
        COALESCE(st.total_amount, 0) AS total_amount
      FROM sales_transaction st
      LEFT JOIN customer c ON st.customer_id = c.customer_id
      LEFT JOIN employee e ON st.employee_id = e.employee_id
      ORDER BY st.transaction_id DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('GET SALES ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST complete sale and deduct stock
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { customer_id, total_amount, payment_method, items } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'A registered customer must be selected.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    await client.query('BEGIN');

    const customerCheck = await client.query(
      'SELECT customer_id FROM customer WHERE customer_id = $1;',
      [customer_id]
    );

    if (!customerCheck.rows.length) {
      throw new Error('Selected customer does not exist. Register the customer first.');
    }

    const employee_id = await getOrCreateEmployee(client);

    for (const item of items) {
      const stockCheck = await client.query(`
        SELECT
          p.product_id,
          p.product_name,
          COALESCE(i.stock_quantity, 0) AS stock_quantity
        FROM product p
        JOIN inventory i ON p.product_id = i.product_id
        WHERE p.product_id = $1
        FOR UPDATE;
      `, [item.id]);

      if (!stockCheck.rows.length) {
        throw new Error(`Product ID ${item.id} does not exist in inventory.`);
      }

      const availableStock = Number(stockCheck.rows[0].stock_quantity);
      const requestedQty = Number(item.qty);

      if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
        throw new Error(`Invalid quantity for ${stockCheck.rows[0].product_name}.`);
      }

      if (availableStock < requestedQty) {
        throw new Error(
          `Not enough stock for ${stockCheck.rows[0].product_name}. Available: ${availableStock}, requested: ${requestedQty}`
        );
      }
    }

    const sale = await client.query(`
      INSERT INTO sales_transaction (customer_id, employee_id, transaction_date, total_amount)
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
      RETURNING transaction_id AS id;
    `, [customer_id, employee_id, Number(total_amount || 0)]);

    const transaction_id = sale.rows[0].id;

    for (const item of items) {
      const qty = Number(item.qty);
      const price = Number(item.price);
      const subtotal = qty * price;

      await client.query(`
        INSERT INTO transaction_item (transaction_id, product_id, quantity, unit_price, subtotal)
        VALUES ($1, $2, $3, $4, $5);
      `, [transaction_id, item.id, qty, price, subtotal]);

      await client.query(`
        UPDATE inventory
        SET stock_quantity = stock_quantity - $1
        WHERE product_id = $2;
      `, [qty, item.id]);
    }

    await client.query(`
      INSERT INTO payment (transaction_id, customer_id, amount, payment_method, payment_date)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (transaction_id) DO NOTHING;
    `, [transaction_id, customer_id, Number(total_amount || 0), payment_method || 'Cash']);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Sale completed successfully',
      receipt_number: transaction_id
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('CHECKOUT ERROR:', err.message);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE void sale and return stock
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const items = await client.query(
      'SELECT product_id, quantity FROM transaction_item WHERE transaction_id = $1;',
      [id]
    );

    if (!items.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Receipt not found.' });
    }

    for (const item of items.rows) {
      await client.query(
        'UPDATE inventory SET stock_quantity = stock_quantity + $1 WHERE product_id = $2;',
        [item.quantity, item.product_id]
      );
    }

    await client.query('DELETE FROM payment WHERE transaction_id = $1;', [id]);
    await client.query('DELETE FROM transaction_item WHERE transaction_id = $1;', [id]);
    await client.query('DELETE FROM sales_transaction WHERE transaction_id = $1;', [id]);

    await client.query('COMMIT');

    res.json({ message: `Receipt #${id} successfully voided.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('VOID ERROR:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;

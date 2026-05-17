const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET all sales transactions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        st.transaction_id AS id,
        st.customer_name,
        st.cashier_name,
        st.transaction_date,
        st.total_amount,
        st.payment_method,

        COALESCE(
          json_agg(
            json_build_object(
              'product_name', ti.product_name,
              'quantity', ti.quantity,
              'unit_price', ti.unit_price,
              'subtotal', ti.subtotal
            )
          ) FILTER (WHERE ti.item_id IS NOT NULL),
          '[]'
        ) AS items

      FROM sales_transaction st

      LEFT JOIN transaction_item ti
      ON st.transaction_id = ti.transaction_id

      GROUP BY st.transaction_id

      ORDER BY st.transaction_id DESC;
    `);

    res.json(result.rows);

  } catch (err) {
    console.error('GET SALES ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// CREATE sale transaction
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {

    const {
      customer_id,
      employee_id,
      payment_method,
      items
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({
        error: 'No sale items provided'
      });
    }

    await client.query('BEGIN');

    // Customer
    let customerName = 'Walk-in Customer';

    if (customer_id) {
      const customer = await client.query(`
        SELECT
          first_name,
          last_name
        FROM customer
        WHERE customer_id = $1
      `, [customer_id]);

      if (customer.rows.length) {
        customerName =
          `${customer.rows[0].first_name} ${customer.rows[0].last_name}`;
      }
    }

    // Employee
    let cashierName = 'System';

    if (employee_id) {
      const employee = await client.query(`
        SELECT employee_name
        FROM employee
        WHERE employee_id = $1
      `, [employee_id]);

      if (employee.rows.length) {
        cashierName = employee.rows[0].employee_name;
      }
    }

    // Total
    let totalAmount = 0;

    for (const item of items) {
      totalAmount += Number(item.quantity) * Number(item.unit_price);
    }

    // Create sale
    const saleResult = await client.query(`
      INSERT INTO sales_transaction
      (
        customer_id,
        employee_id,
        customer_name,
        cashier_name,
        total_amount,
        payment_method
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING transaction_id;
    `, [
      customer_id || null,
      employee_id || null,
      customerName,
      cashierName,
      totalAmount,
      payment_method || 'Cash'
    ]);

    const transactionId =
      saleResult.rows[0].transaction_id;

    // Add items
    for (const item of items) {

      const subtotal =
        Number(item.quantity) *
        Number(item.unit_price);

      await client.query(`
        INSERT INTO transaction_item
        (
          transaction_id,
          product_id,
          product_name,
          quantity,
          unit_price,
          subtotal
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        transactionId,
        item.product_id || null,
        item.product_name,
        item.quantity,
        item.unit_price,
        subtotal
      ]);

      // Reduce inventory
      if (item.product_id) {
        await client.query(`
          UPDATE inventory
          SET stock_quantity =
              stock_quantity - $1
          WHERE product_id = $2
        `, [
          item.quantity,
          item.product_id
        ]);
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'Sale completed successfully',
      transaction_id: transactionId
    });

  } catch (err) {

    await client.query('ROLLBACK');

    console.error('CREATE SALE ERROR:', err.message);

    res.status(500).json({
      error: err.message
    });

  } finally {

    client.release();
  }
});

// DELETE sale
router.delete('/:id', async (req, res) => {
  try {

    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM sales_transaction
      WHERE transaction_id = $1
      RETURNING transaction_id;
    `, [id]);

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Sale not found'
      });
    }

    res.json({
      message: 'Sale deleted successfully'
    });

  } catch (err) {

    console.error('DELETE SALE ERROR:', err.message);

    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;
const express = require('express');
const app = express();
const employeeRoutes = require('./routes/employees');
const customerRoutes = require('./routes/customers');
const loyaltyRoutes = require('./routes/loyalty');
app.use(express.static('public'));
app.use(express.json());
app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
require('dotenv').config();

app.use(express.json());
app.use(express.static('public'));
// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/employees', employeeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// Health check
app.get('/', (req, res) => res.send('POS API is running'));

const PORT = process.env.PORT || 3000;
const pool = require('./db');

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed! Error:', err.stack);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
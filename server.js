const express = require('express');
const app = express();

require('dotenv').config();

app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/loyalty', require('./routes/loyalty'));

// Health check
app.get('/', (req, res) => res.json({ message: 'POS API is running', status: 'active' }));

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
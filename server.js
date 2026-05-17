const express = require('express');
const cors = require('cors');
const path = require('path');

const customersRoutes = require('./routes/customers');
const productsRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const employeesRoutes = require('./routes/employees');
const loyaltyRoutes = require('./routes/loyalty');

const app = express();
const PORT = process.env.PORT || 3000;
const authRoutes = require('./routes/auth');

app.use('/api/auth', authRoutes);
app.use(cors());
app.use(express.json());

// serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/customers', customersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// dashboard default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
const express = require('express');
const cors = require('cors');
const path = require('path');

const customersRoutes = require('./routes/customers');
const productsRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const employeesRoutes = require('./routes/employees');
const loyaltyRoutes = require('./routes/loyalty');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// frontend
app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// default page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
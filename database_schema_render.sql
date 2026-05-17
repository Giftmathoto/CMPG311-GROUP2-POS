-- POS Render PostgreSQL schema aligned with the ERD
-- Run this inside the Render PostgreSQL database if the tables do not exist.

CREATE TABLE IF NOT EXISTS customer (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(30),
    address TEXT,
    city VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS employee (
    employee_id SERIAL PRIMARY KEY,
    employee_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(30),
    salary NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS product_category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE
);

CREATE TABLE IF NOT EXISTS supplier (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS product (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    barcode VARCHAR(100) UNIQUE,
    category_id INT REFERENCES product_category(category_id),
    supplier_id INT REFERENCES supplier(supplier_id)
);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT UNIQUE REFERENCES product(product_id) ON DELETE CASCADE,
    stock_quantity INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sales_transaction (
    transaction_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customer(customer_id) ON DELETE SET NULL,
    employee_id INT REFERENCES employee(employee_id),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transaction_item (
    item_id SERIAL PRIMARY KEY,
    transaction_id INT REFERENCES sales_transaction(transaction_id) ON DELETE CASCADE,
    product_id INT REFERENCES product(product_id),
    quantity INT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payment (
    payment_id SERIAL PRIMARY KEY,
    transaction_id INT UNIQUE REFERENCES sales_transaction(transaction_id) ON DELETE CASCADE,
    customer_id INT REFERENCES customer(customer_id),
    amount NUMERIC(10,2),
    payment_method VARCHAR(50),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
    feedback_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customer(customer_id),
    product_id INT REFERENCES product(product_id),
    rating INT,
    comment TEXT,
    feedback_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restocking (
    restocking_id SERIAL PRIMARY KEY,
    supplier_id INT REFERENCES supplier(supplier_id),
    product_id INT REFERENCES product(product_id),
    quantity INT,
    restocking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Required default rows used by routes/products.js when creating products.
-- The app inserts products with category_id = 1 and supplier_id = 1.
INSERT INTO product_category (category_id, category_name)
VALUES (1, 'General')
ON CONFLICT (category_id) DO UPDATE SET category_name = EXCLUDED.category_name;

INSERT INTO supplier (supplier_id, supplier_name, email, phone)
VALUES (1, 'Default Supplier', 'supplier@example.com', '0123456789')
ON CONFLICT (supplier_id) DO UPDATE SET
  supplier_name = EXCLUDED.supplier_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone;

INSERT INTO employee (employee_id, employee_name, email, phone, salary)
VALUES (1, 'Admin User', 'admin@pos.com', '0123456789', 10000)
ON CONFLICT (employee_id) DO UPDATE SET
  employee_name = EXCLUDED.employee_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  salary = EXCLUDED.salary;

SELECT setval(pg_get_serial_sequence('product_category', 'category_id'), COALESCE((SELECT MAX(category_id) FROM product_category), 1));
SELECT setval(pg_get_serial_sequence('supplier', 'supplier_id'), COALESCE((SELECT MAX(supplier_id) FROM supplier), 1));
SELECT setval(pg_get_serial_sequence('employee', 'employee_id'), COALESCE((SELECT MAX(employee_id) FROM employee), 1));

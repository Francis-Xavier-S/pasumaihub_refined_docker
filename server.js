const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 9999;
const JWT_SECRET = process.env.JWT_SECRET || 'pasumaihub-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('pasumaihub.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'farmer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    unit TEXT DEFAULT 'kg',
    category TEXT,
    image_url TEXT,
    available INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    db.prepare('INSERT INTO users (id, username, password, email, role) VALUES (?, ?, ?, ?, ?)')
      .run(id, username, hashedPassword, email || '', role || 'farmer');

    const token = jwt.sign({ id, username, role: role || 'farmer' }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ token, user: { id, username, email, role: role || 'farmer' } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

app.get('/api/products', (req, res) => {
  const { category, search } = req.query;
  let query = 'SELECT p.*, u.username as seller_name FROM products p JOIN users u ON p.user_id = u.id WHERE p.available = 1';
  const params = [];

  if (category) {
    query += ' AND p.category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY p.created_at DESC';
  const products = db.prepare(query).all(...params);
  res.json(products);
});

app.get('/api/products/my', authenticateToken, (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(products);
});

app.post('/api/products', authenticateToken, (req, res) => {
  try {
    const { name, description, price, unit, category, image_url } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price required' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO products (id, user_id, name, description, price, unit, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, name, description || '', price, unit || 'kg', category || 'vegetables', image_url || '');

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', authenticateToken, (req, res) => {
  const { name, description, price, unit, category, image_url, available } = req.body;
  
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.prepare(`UPDATE products SET name = ?, description = ?, price = ?, unit = ?, category = ?, image_url = ?, available = ? WHERE id = ?`)
    .run(name, description, price, unit, category, image_url, available, req.params.id);

  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product deleted' });
});

app.post('/api/transactions', authenticateToken, (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND available = 1').get(product_id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.user_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot buy your own product' });
    }

    const id = uuidv4();
    const total_price = product.price * quantity;

    db.prepare('INSERT INTO transactions (id, buyer_id, seller_id, product_id, quantity, total_price) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, product.user_id, product_id, quantity, total_price);

    res.json({ id, product, quantity, total_price, message: 'Transaction created' });
  } catch (error) {
    res.status(500).json({ error: 'Transaction failed' });
  }
});

app.get('/api/transactions', authenticateToken, (req, res) => {
  const transactions = db.prepare(`
    SELECT t.*, 
           p.name as product_name, p.image_url as product_image,
           buyer.username as buyer_name,
           seller.username as seller_name
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    JOIN users buyer ON t.buyer_id = buyer.id
    JOIN users seller ON t.seller_id = seller.id
    WHERE t.buyer_id = ? OR t.seller_id = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id, req.user.id);
  res.json(transactions);
});

app.get('/api/stats', authenticateToken, (req, res) => {
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE user_id = ?').get(req.user.id).count;
  const totalSales = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total_price), 0) as total FROM transactions WHERE seller_id = ?').get(req.user.id);
  const totalPurchases = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total_price), 0) as total FROM transactions WHERE buyer_id = ?').get(req.user.id);

  res.json({
    totalProducts,
    totalSales: totalSales.count,
    totalRevenue: totalSales.total,
    totalPurchases: totalPurchases.count,
    totalSpent: totalPurchases.total
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PasumaiHub running on http://localhost:${PORT}`);
});

const express = require('express');
const router = express.Router();
const getDatabase = require('../db/connection');

// Get all orders (for admin)
router.get('/', async (req, res) => {
  const { companyId } = req.query;
  const db = await getDatabase();

  let query = `
    SELECT 
      o.id as order_id,
      o.created_at,
      o.status,
      u.name as user_name,
      u.email as user_email,
      oi.quantity,
      s.id as snack_id,
      s.name as snack_name,
      s.price
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN snacks s ON oi.snack_id = s.id
  `;

  const params = [];
  if (companyId) {
    query += ' WHERE u.company_id = ?';
    params.push(companyId);
  }
  
  query += ' ORDER BY o.created_at DESC';

  db.all(query, params, (err, orders) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    // Group order items by order
    const groupedOrders = orders.reduce((acc, curr) => {
      const order = acc.find(o => o.order_id === curr.order_id);
      if (order) {
        order.items.push({
          snack_id: curr.snack_id,
          snack_name: curr.snack_name,
          quantity: curr.quantity,
          price: curr.price
        });
      } else {
        acc.push({
          order_id: curr.order_id,
          created_at: curr.created_at,
          status: curr.status,
          user_name: curr.user_name,
          user_email: curr.user_email,
          items: [{
            snack_id: curr.snack_id,
            snack_name: curr.snack_name,
            quantity: curr.quantity,
            price: curr.price
          }]
        });
      }
      return acc;
    }, []);

    res.json(groupedOrders);
  });
});

// Get orders for a specific user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const db = await getDatabase();

  // First, get the user's company ID
  db.get('SELECT company_id FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get both personal orders and company bulk orders
    db.all(
      `SELECT 
        o.id as order_id,
        o.created_at,
        o.status,
        oi.quantity,
        s.id as snack_id,
        s.name as snack_name,
        s.price,
        u.name as ordered_by
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN snacks s ON oi.snack_id = s.id
       JOIN users u ON o.user_id = u.id
       WHERE o.user_id = ? OR (o.company_id = ? AND u.is_admin = 1)
       ORDER BY o.created_at DESC`,
      [userId, user.company_id],
      (err, orders) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch orders' });
        }

        // Group order items by order
        const groupedOrders = orders.reduce((acc, curr) => {
          const order = acc.find(o => o.order_id === curr.order_id);
          if (order) {
            order.items.push({
              snack_id: curr.snack_id,
              snack_name: curr.snack_name,
              quantity: curr.quantity,
              price: curr.price
            });
          } else {
            acc.push({
              order_id: curr.order_id,
              created_at: curr.created_at,
              status: curr.status,
              ordered_by: curr.ordered_by,
              items: [{
                snack_id: curr.snack_id,
                snack_name: curr.snack_name,
                quantity: curr.quantity,
                price: curr.price
              }]
            });
          }
          return acc;
        }, []);

        res.json(groupedOrders);
      }
    );
  });
});

// Get orders for a specific company
router.get('/company/:companyId', async (req, res) => {
  const { companyId } = req.params;
  const db = await getDatabase();

  db.all(
    `SELECT 
      o.id as order_id,
      o.created_at,
      o.status,
      u.name as user_name,
      u.email as user_email,
      oi.quantity,
      s.id as snack_id,
      s.name as snack_name,
      s.price
     FROM orders o
     JOIN users u ON o.user_id = u.id
     JOIN order_items oi ON o.id = oi.order_id
     JOIN snacks s ON oi.snack_id = s.id
     WHERE u.company_id = ?
     ORDER BY o.created_at DESC`,
    [companyId],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch company orders' });
      }

      // Group order items by order
      const groupedOrders = orders.reduce((acc, curr) => {
        const order = acc.find(o => o.order_id === curr.order_id);
        if (order) {
          order.items.push({
            snack_id: curr.snack_id,
            snack_name: curr.snack_name,
            quantity: curr.quantity,
            price: curr.price
          });
        } else {
          acc.push({
            order_id: curr.order_id,
            created_at: curr.created_at,
            status: curr.status,
            user_name: curr.user_name,
            user_email: curr.user_email,
            items: [{
              snack_id: curr.snack_id,
              snack_name: curr.snack_name,
              quantity: curr.quantity,
              price: curr.price
            }]
          });
        }
        return acc;
      }, []);

      res.json(groupedOrders);
    }
  );
});

// Create a new order
router.post('/', async (req, res) => {
  const { userId, items } = req.body;
  const db = await getDatabase();

  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    // Get user's company_id
    const userResult = await new Promise((resolve, reject) => {
      db.get('SELECT company_id FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!userResult) {
      throw new Error('User not found');
    }

    // Get snack prices and calculate total cost
    const snackIds = items.map(item => item.snackId);
    const snackPrices = await new Promise((resolve, reject) => {
      const placeholders = snackIds.map(() => '?').join(',');
      db.all(
        `SELECT id, price FROM snacks WHERE id IN (${placeholders})`,
        snackIds,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const totalCost = items.reduce((sum, item) => {
      const snack = snackPrices.find(s => s.id === item.snackId);
      return sum + (snack ? snack.price * item.quantity : 0);
    }, 0);

    // Start a transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create the order
    const orderResult = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO orders (user_id, company_id, total_cost, status, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [userId, userResult.company_id, totalCost, 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Insert order items
    for (const item of items) {
      const snack = snackPrices.find(s => s.id === item.snackId);
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO order_items (order_id, snack_id, quantity, price_per_unit) VALUES (?, ?, ?, ?)',
          [orderResult, item.snackId, item.quantity, snack.price],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Commit the transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(201).json({ 
      message: 'Order created successfully',
      orderId: orderResult
    });
  } catch (err) {
    // Rollback on error
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve());
    });
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
router.put('/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const db = await getDatabase();

  const validStatuses = ['pending', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.run(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, orderId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update order status' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ message: 'Order status updated successfully' });
    }
  );
});

module.exports = router; 
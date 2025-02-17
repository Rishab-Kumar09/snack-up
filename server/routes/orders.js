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

  db.all(
    `SELECT 
      o.id as order_id,
      o.created_at,
      o.status,
      oi.quantity,
      s.id as snack_id,
      s.name as snack_name,
      s.price
     FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     JOIN snacks s ON oi.snack_id = s.id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [userId],
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
        'INSERT INTO orders (user_id, status, created_at) VALUES (?, ?, datetime("now"))',
        [userId, 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Insert order items
    for (const item of items) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO order_items (order_id, snack_id, quantity) VALUES (?, ?, ?)',
          [orderResult, item.snackId, item.quantity],
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

  if (!status || !['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
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
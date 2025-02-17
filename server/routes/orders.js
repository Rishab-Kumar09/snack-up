const express = require('express');
const router = express.Router();
const getDatabase = require('../db/connection');

// Get database connection
const db = getDatabase();

// Get all orders (for admin)
router.get('/', (req, res) => {
  const { companyId } = req.query;

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
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;

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
        u.name as ordered_by,
        u.is_admin as is_admin_order
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
              is_admin_order: curr.is_admin_order === 1,
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
router.post('/', (req, res) => {
  const { userId, items } = req.body;

  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Get user's company_id
  db.get('SELECT company_id FROM users WHERE id = ?', [userId], (err, userResult) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!userResult) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get snack prices and calculate total cost
    const snackIds = items.map(item => item.snackId);
    const placeholders = snackIds.map(() => '?').join(',');
    
    db.all(
      `SELECT id, price FROM snacks WHERE id IN (${placeholders})`,
      snackIds,
      (err, snackPrices) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch snack prices' });
        }

        const totalCost = items.reduce((sum, item) => {
          const snack = snackPrices.find(s => s.id === item.snackId);
          return sum + (snack ? snack.price * item.quantity : 0);
        }, 0);

        // Start transaction
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to start transaction' });
          }

          // Create the order
          db.run(
            'INSERT INTO orders (user_id, company_id, total_cost, status, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
            [userId, userResult.company_id, totalCost, 'pending'],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to create order' });
              }

              const orderId = this.lastID;
              let itemsProcessed = 0;

              // Insert order items
              items.forEach((item) => {
                const snack = snackPrices.find(s => s.id === item.snackId);
                db.run(
                  'INSERT INTO order_items (order_id, snack_id, quantity, price_per_unit) VALUES (?, ?, ?, ?)',
                  [orderId, item.snackId, item.quantity, snack.price],
                  (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Failed to create order items' });
                    }

                    itemsProcessed++;
                    if (itemsProcessed === items.length) {
                      // Commit transaction when all items are processed
                      db.run('COMMIT', (err) => {
                        if (err) {
                          db.run('ROLLBACK');
                          return res.status(500).json({ error: 'Failed to commit transaction' });
                        }

                        res.status(201).json({
                          message: 'Order created successfully',
                          orderId: orderId
                        });
                      });
                    }
                  }
                );
              });
            }
          );
        });
      }
    );
  });
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

  try {
    // Start transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get current order status
    const currentOrder = await new Promise((resolve, reject) => {
      db.get(
        'SELECT status FROM orders WHERE id = ?',
        [orderId],
        (err, order) => {
          if (err) reject(err);
          else resolve(order);
        }
      );
    });

    if (!currentOrder) {
      throw new Error('Order not found');
    }

    // Update order status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, orderId],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) reject(new Error('Order not found'));
          else resolve();
        }
      );
    });

    // Only update inventory if:
    // 1. New status is 'delivered'
    // 2. Previous status was not 'delivered'
    if (status === 'delivered' && currentOrder.status !== 'delivered') {
      // Get order items
      const orderItems = await new Promise((resolve, reject) => {
        db.all(
          'SELECT snack_id, quantity FROM order_items WHERE order_id = ?',
          [orderId],
          (err, items) => {
            if (err) reject(err);
            else resolve(items);
          }
        );
      });

      // Get current week's start date
      const week_start_date = new Date().toISOString().split('T')[0];

      // For each item in the order
      for (const item of orderItems) {
        // Check if tracking record exists for this week
        const existingRecord = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id, initial_quantity FROM snack_inventory_tracking WHERE snack_id = ? AND week_start_date = ?',
            [item.snack_id, week_start_date],
            (err, record) => {
              if (err) reject(err);
              else resolve(record);
            }
          );
        });

        if (existingRecord) {
          // Update existing record
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE snack_inventory_tracking SET initial_quantity = initial_quantity + ?, notes = ? WHERE id = ?',
              [item.quantity, 'Updated quantity from delivered order', existingRecord.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        } else {
          // Create new record
          await new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO snack_inventory_tracking 
               (snack_id, week_start_date, initial_quantity, wasted_quantity, shortage_quantity, notes)
               VALUES (?, ?, ?, 0, 0, ?)`,
              [item.snack_id, week_start_date, item.quantity, 'Initial quantity from delivered order'],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
      }
    }

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ 
      message: 'Order status updated successfully',
      inventoryUpdated: status === 'delivered' && currentOrder.status !== 'delivered'
    });
  } catch (err) {
    // Rollback on error
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve());
    });
    console.error('Error updating order status:', err);
    res.status(500).json({ error: err.message || 'Failed to update order status' });
  }
});

module.exports = router; 
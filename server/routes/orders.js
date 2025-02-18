const express = require('express');
const router = express.Router();
const getDatabase = require('../db/connection');

// Get database connection
const db = getDatabase();

// Get all orders (for admin)
router.get('/', (req, res) => {
  const { companyId } = req.query;

  // First, verify if the user is an admin
  db.get('SELECT is_admin FROM users WHERE company_id = ? AND is_admin = 1', [companyId], (err, adminUser) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to verify admin status' });
    }

    if (!adminUser) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

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
        s.price,
        o.total_cost
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN snacks s ON oi.snack_id = s.id
      WHERE u.company_id = ?
      ORDER BY o.created_at DESC
    `;

    db.all(query, [companyId], (err, orders) => {
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
            total_cost: curr.total_cost,
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
});

// Get orders for a specific user
router.get('/user/:userId', (req, res) => {
  const { userId } = req.params;

  // First, get the user's company ID and admin status
  db.get('SELECT company_id, is_admin FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For regular employees, only get their personal orders
    // For admins, get both personal orders and company bulk orders
    const query = user.is_admin ? 
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
       ORDER BY o.created_at DESC` :
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
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`;

    const params = user.is_admin ? [userId, user.company_id] : [userId];

    db.all(query, params, (err, orders) => {
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
    });
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

  // Start transaction
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to start transaction' });
    }

    // Get current order status
    db.get(
      'SELECT status FROM orders WHERE id = ?',
      [orderId],
      (err, currentOrder) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to get current order status' });
        }

        if (!currentOrder) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Order not found' });
        }

        // Update order status
        db.run(
          'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [status, orderId],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to update order status' });
            }

            if (this.changes === 0) {
              db.run('ROLLBACK');
              return res.status(404).json({ error: 'Order not found' });
            }

            // Only update inventory if:
            // 1. New status is 'delivered'
            // 2. Previous status was not 'delivered'
            if (status === 'delivered' && currentOrder.status !== 'delivered') {
              // Get order items
              db.all(
                'SELECT snack_id, quantity FROM order_items WHERE order_id = ?',
                [orderId],
                (err, orderItems) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to get order items' });
                  }

                  // Get current week's start date
                  const currentDate = new Date();
                  const week_start_date = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay())).toISOString().split('T')[0];
                  let itemsProcessed = 0;

                  console.log('Processing order delivery:', {
                    orderId,
                    week_start_date,
                    items: orderItems
                  });

                  // For each item in the order
                  orderItems.forEach(item => {
                    // Check if tracking record exists for this week
                    db.get(
                      'SELECT id, initial_quantity FROM snack_inventory_tracking WHERE snack_id = ? AND week_start_date = ?',
                      [item.snack_id, week_start_date],
                      (err, existingRecord) => {
                        if (err) {
                          console.error('Error checking existing inventory record:', err);
                          db.run('ROLLBACK');
                          return res.status(500).json({ error: 'Failed to check existing inventory record' });
                        }

                        console.log('Existing inventory record:', {
                          snackId: item.snack_id,
                          weekStartDate: week_start_date,
                          existingRecord
                        });

                        const updateOrInsert = () => {
                          if (existingRecord) {
                            // Update existing record
                            console.log('Updating existing record:', existingRecord.id);
                            db.run(
                              'UPDATE snack_inventory_tracking SET initial_quantity = initial_quantity + ?, notes = ? WHERE id = ?',
                              [item.quantity, 'Updated quantity from delivered order', existingRecord.id],
                              handleInventoryUpdate
                            );
                          } else {
                            // Create new record
                            console.log('Creating new inventory record for:', {
                              snackId: item.snack_id,
                              weekStartDate: week_start_date,
                              quantity: item.quantity
                            });
                            db.run(
                              `INSERT INTO snack_inventory_tracking 
                               (snack_id, week_start_date, initial_quantity, wasted_quantity, shortage_quantity, notes)
                               VALUES (?, ?, ?, 0, 0, ?)`,
                              [item.snack_id, week_start_date, item.quantity, 'Initial quantity from delivered order'],
                              handleInventoryUpdate
                            );
                          }
                        };

                        function handleInventoryUpdate(err) {
                          if (err) {
                            console.error('Error updating inventory:', err);
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Failed to update inventory' });
                          }
                          console.log('Successfully updated inventory');
                          checkComplete();
                        }

                        function checkComplete() {
                          itemsProcessed++;
                          if (itemsProcessed === orderItems.length) {
                            // All items processed, commit transaction
                            db.run('COMMIT', (err) => {
                              if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Failed to commit transaction' });
                              }

                              res.json({ 
                                message: 'Order status updated successfully',
                                inventoryUpdated: true
                              });
                            });
                          }
                        }

                        updateOrInsert();
                      }
                    );
                  });
                }
              );
            } else {
              // No inventory update needed, commit transaction
              db.run('COMMIT', (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to commit transaction' });
                }

                res.json({ 
                  message: 'Order status updated successfully',
                  inventoryUpdated: false
                });
              });
            }
          }
        );
      }
    );
  });
});

// Delete an order
router.delete('/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const db = getDatabase();

  // Start transaction
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to start transaction' });
    }

    // First delete order items
    db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Failed to delete order items' });
      }

      // Then delete the order
      db.run('DELETE FROM orders WHERE id = ?', [orderId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Failed to delete order' });
        }

        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Order not found' });
        }

        // Commit transaction
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to commit transaction' });
          }

          res.json({ message: 'Order deleted successfully' });
        });
      });
    });
  });
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const getDatabase = require('../db/connection');

// Get database connection
const db = getDatabase();

// Middleware to ensure database is initialized
const ensureDbConnection = (req, res, next) => {
  if (!db) {
    return res.status(500).json({ error: 'Database connection failed' });
  }
  next();
};

// Apply middleware to all routes
router.use(ensureDbConnection);

// Get inventory tracking data for all snacks
router.get('/tracking', (req, res) => {
  const query = `
    SELECT 
      sit.*,
      s.name as snack_name
    FROM snack_inventory_tracking sit
    JOIN snacks s ON sit.snack_id = s.id
    ORDER BY sit.week_start_date DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add new inventory tracking record
router.post('/tracking', (req, res) => {
  const { snack_id, wasted_quantity, shortage_quantity, notes } = req.body;
  
  // First, get the most recent record for this snack
  db.get(
    'SELECT id, initial_quantity, week_start_date FROM snack_inventory_tracking WHERE snack_id = ? ORDER BY week_start_date DESC LIMIT 1',
    [snack_id],
    (err, currentWeekData) => {
      if (err) {
        console.error('Error checking current week data:', err);
        return res.status(500).json({ error: err.message });
      }

      console.log('Most recent record found:', currentWeekData);

      if (!currentWeekData) {
        return res.status(400).json({ 
          error: 'No initial quantity found. Please wait for orders to be delivered.' 
        });
      }

      // Update the tracking record with waste and shortage
      const query = `
        UPDATE snack_inventory_tracking
        SET wasted_quantity = ?,
            shortage_quantity = ?,
            notes = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE notes END
        WHERE id = ?
      `;

      db.run(
        query, 
        [
          wasted_quantity || 0,
          shortage_quantity || 0,
          notes,
          notes,
          notes,
          currentWeekData.id
        ],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          res.json({
            message: "Inventory tracking record updated successfully",
            id: currentWeekData.id
          });
        }
      );
    }
  );
});

// Update inventory tracking record
router.put('/tracking/:id', async (req, res) => {
  const { wasted_quantity, shortage_quantity, notes } = req.body;
  
  const query = `
    UPDATE snack_inventory_tracking
    SET wasted_quantity = ?,
        shortage_quantity = ?,
        notes = ?
    WHERE id = ?
  `;

  db.run(query, [wasted_quantity, shortage_quantity, notes, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: "Inventory tracking record updated successfully"
    });
  });
});

// Get inventory statistics
router.get('/statistics', async (req, res) => {
  const query = `
    SELECT 
      s.name as snack_name,
      SUM(sit.wasted_quantity) as total_wasted,
      SUM(sit.shortage_quantity) as total_shortage,
      AVG(sit.wasted_quantity) as avg_weekly_waste,
      AVG(sit.shortage_quantity) as avg_weekly_shortage
    FROM snack_inventory_tracking sit
    JOIN snacks s ON sit.snack_id = s.id
    GROUP BY s.id, s.name
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Delete all inventory tracking records
router.delete('/tracking/all', async (req, res) => {
  const query = `DELETE FROM snack_inventory_tracking`;
  
  db.run(query, [], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: "All inventory tracking records deleted successfully",
      recordsDeleted: this.changes
    });
  });
});

// Get week-over-week comparison
router.get('/tracking/comparison', async (req, res) => {
  const query = `
    WITH CurrentWeek AS (
      SELECT 
        sit.*,
        s.name as snack_name,
        date('now', 'weekday 0', '-7 days') as week_start,
        date('now', 'weekday 0') as week_end
      FROM snack_inventory_tracking sit
      JOIN snacks s ON sit.snack_id = s.id
      WHERE sit.week_start_date >= date('now', 'weekday 0', '-7 days')
        AND sit.week_start_date < date('now', 'weekday 0')
    ),
    PreviousWeek AS (
      SELECT 
        sit.*,
        s.name as snack_name,
        date('now', 'weekday 0', '-14 days') as week_start,
        date('now', 'weekday 0', '-7 days') as week_end
      FROM snack_inventory_tracking sit
      JOIN snacks s ON sit.snack_id = s.id
      WHERE sit.week_start_date >= date('now', 'weekday 0', '-14 days')
        AND sit.week_start_date < date('now', 'weekday 0', '-7 days')
    )
    SELECT 
      COALESCE(c.snack_id, p.snack_id) as snack_id,
      COALESCE(c.snack_name, p.snack_name) as snack_name,
      c.initial_quantity as current_initial_quantity,
      c.wasted_quantity as current_wasted_quantity,
      c.shortage_quantity as current_shortage_quantity,
      p.initial_quantity as previous_initial_quantity,
      p.wasted_quantity as previous_wasted_quantity,
      p.shortage_quantity as previous_shortage_quantity,
      CASE 
        WHEN p.initial_quantity > 0 
        THEN ROUND(((c.initial_quantity - p.initial_quantity) * 100.0 / p.initial_quantity), 2)
        ELSE NULL 
      END as initial_quantity_change_percentage,
      CASE 
        WHEN p.wasted_quantity > 0 
        THEN ROUND(((c.wasted_quantity - p.wasted_quantity) * 100.0 / p.wasted_quantity), 2)
        ELSE NULL 
      END as waste_change_percentage,
      CASE 
        WHEN p.shortage_quantity > 0 
        THEN ROUND(((c.shortage_quantity - p.shortage_quantity) * 100.0 / p.shortage_quantity), 2)
        ELSE NULL 
      END as shortage_change_percentage
    FROM CurrentWeek c
    FULL OUTER JOIN PreviousWeek p ON c.snack_id = p.snack_id
    ORDER BY snack_name
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Calculate week dates
    const currentWeekStart = new Date();
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    
    res.json({
      currentWeekStart: currentWeekStart.toISOString().split('T')[0],
      previousWeekStart: previousWeekStart.toISOString().split('T')[0],
      comparisons: rows
    });
  });
});

// Get current week's tracking summary
router.get('/tracking/current-week', async (req, res) => {
  const query = `
    SELECT 
      sit.*,
      s.name as snack_name,
      date('now', 'weekday 0', '-7 days') as week_start,
      date('now', 'weekday 0') as week_end
    FROM snack_inventory_tracking sit
    JOIN snacks s ON sit.snack_id = s.id
    WHERE sit.week_start_date >= date('now', 'weekday 0', '-7 days')
      AND sit.week_start_date < date('now', 'weekday 0')
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    res.json({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tracking: rows
    });
  });
});

// Update order status
router.put('/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

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
          'UPDATE orders SET status = ? WHERE id = ?',
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
                  const week_start_date = new Date().toISOString().split('T')[0];
                  let itemsProcessed = 0;

                  // For each item in the order
                  orderItems.forEach(item => {
                    // Check if tracking record exists for this week
                    db.get(
                      'SELECT id, initial_quantity FROM snack_inventory_tracking WHERE snack_id = ? AND week_start_date = ?',
                      [item.snack_id, week_start_date],
                      (err, existingRecord) => {
                        if (err) {
                          db.run('ROLLBACK');
                          return res.status(500).json({ error: 'Failed to check existing inventory record' });
                        }

                        const updateOrInsert = () => {
                          if (existingRecord) {
                            // Update existing record
                            db.run(
                              'UPDATE snack_inventory_tracking SET initial_quantity = initial_quantity + ?, notes = ? WHERE id = ?',
                              [item.quantity, 'Updated quantity from delivered order', existingRecord.id],
                              handleInventoryUpdate
                            );
                          } else {
                            // Create new record
                            db.run(
                              `INSERT INTO snack_inventory_tracking 
                               (snack_id, week_start_date, initial_quantity, wasted_quantity, shortage_quantity, notes)
                               VALUES (?, ?, ?, 0, 0, ?)`,
                              [item.snack_id, week_start_date, item.quantity, 'Initial quantity from delivered order'],
                              handleInventoryUpdate
                            );
                          }
                        };

                        const handleInventoryUpdate = (err) => {
                          if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Failed to update inventory' });
                          }

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
                        };

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

// Delete a specific tracking record
router.delete('/tracking/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM snack_inventory_tracking WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete tracking record' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Tracking record not found' });
    }
    
    res.json({ message: 'Tracking record deleted successfully' });
  });
});

module.exports = router; 
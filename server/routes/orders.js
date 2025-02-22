const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Get all orders (for admin)
router.get('/company/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    // First, get the user from the session/token
    const { user } = req;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify if the user is an admin for this company
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('is_admin, company_id')
      .eq('id', user.id)
      .single();

    if (adminError) {
      console.error('Error checking admin status:', adminError);
      return res.status(500).json({ error: 'Failed to verify admin status' });
    }

    if (!adminUser || !adminUser.is_admin || adminUser.company_id !== companyId) {
      return res.status(403).json({ error: 'Unauthorized: Admin access required' });
    }

    // Fetch orders for the company
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        users (
          name,
          email
        ),
        order_items (
          quantity,
          price_per_unit,
          snacks (
            name
          )
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    // Format orders for response
    const formattedOrders = orders.map(order => ({
      order_id: order.id,
      user_name: order.users.name,
      user_email: order.users.email,
      status: order.status,
      total_cost: order.total_cost,
      created_at: order.created_at,
      items: order.order_items.map(item => ({
        quantity: item.quantity,
        price_per_unit: item.price_per_unit,
        snack_name: item.snacks.name
      }))
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get orders for a specific user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    console.log('Fetching orders for user:', userId);
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price_per_unit,
          snacks (
            name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }

    console.log('Raw orders data:', orders);

    // Format orders for response
    const formattedOrders = orders.map(order => ({
      order_id: order.id,
      status: order.status,
      total_cost: order.total_cost,
      created_at: order.created_at,
      items: order.order_items.map(item => ({
        quantity: item.quantity,
        price_per_unit: item.price_per_unit,
        snack_name: item.snacks.name
      }))
    }));

    console.log('Formatted orders:', formattedOrders);
    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

// Create new order
router.post('/', async (req, res) => {
  const { userId, companyId, items } = req.body;

  if (!userId || !companyId || !items || !items.length) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  try {
    // Calculate total cost
    const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        company_id: companyId,
        total_cost: totalCost,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      snack_id: item.snackId,
      quantity: item.quantity,
      price_per_unit: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      throw itemsError;
    }

    res.status(201).json({
      orderId: order.id,
      totalCost,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
router.put('/:orderId/status', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'processing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    // First get the current order status
    const { data: currentOrder, error: currentOrderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (currentOrderError) {
      throw currentOrderError;
    }

    // Start a transaction
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({ 
        status,
        has_been_delivered: status === 'delivered'
      })
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single();

    if (orderError) {
      throw orderError;
    }

    // If the order is being marked as delivered, update inventory tracking
    if (status === 'delivered' && !currentOrder.has_been_delivered) {
      // Get the current week's start date
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);

      // Group items by snack_id and sum quantities
      const snackQuantities = order.order_items.reduce((acc, item) => {
        if (!acc[item.snack_id]) {
          acc[item.snack_id] = 0;
        }
        acc[item.snack_id] += item.quantity;
        return acc;
      }, {});

      // For each snack in the order
      for (const [snackId, quantity] of Object.entries(snackQuantities)) {
        // Check if a tracking record exists for this week
        const { data: existingRecord, error: trackingError } = await supabase
          .from('snack_inventory_tracking')
          .select('*')
          .eq('snack_id', snackId)
          .eq('week_start_date', weekStart.toISOString().split('T')[0])
          .single();

        if (trackingError && trackingError.code !== 'PGRST116') { // PGRST116 means no rows returned
          throw trackingError;
        }

        if (existingRecord) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('snack_inventory_tracking')
            .update({
              initial_quantity: existingRecord.initial_quantity + quantity
            })
            .eq('id', existingRecord.id);

          if (updateError) {
            throw updateError;
          }
        } else {
          // Create new record
          const { error: insertError } = await supabase
            .from('snack_inventory_tracking')
            .insert({
              snack_id: snackId,
              week_start_date: weekStart.toISOString().split('T')[0],
              initial_quantity: quantity,
              wasted_quantity: 0,
              shortage_quantity: 0
            });

          if (insertError) {
            throw insertError;
          }
        }
      }
    }

    // Send success response with updated order data
    res.json({
      order_id: order.id,
      status: order.status,
      has_been_delivered: order.has_been_delivered
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Delete order
router.delete('/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    // First get the order details and check if it was delivered
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError) {
      throw orderError;
    }

    // If the order was delivered, we need to update inventory tracking
    if (order.has_been_delivered) {
      // Get the current week's start date
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);

      // Group items by snack_id and sum quantities
      const snackQuantities = order.order_items.reduce((acc, item) => {
        if (!acc[item.snack_id]) {
          acc[item.snack_id] = 0;
        }
        acc[item.snack_id] += item.quantity;
        return acc;
      }, {});

      // For each snack in the order
      for (const [snackId, quantity] of Object.entries(snackQuantities)) {
        // Get the tracking record for this week
        const { data: trackingRecord, error: trackingError } = await supabase
          .from('snack_inventory_tracking')
          .select('*')
          .eq('snack_id', snackId)
          .eq('week_start_date', weekStart.toISOString().split('T')[0])
          .single();

        if (trackingError && trackingError.code !== 'PGRST116') {
          throw trackingError;
        }

        if (trackingRecord) {
          // Subtract the quantity from the tracking record
          const { error: updateError } = await supabase
            .from('snack_inventory_tracking')
            .update({
              initial_quantity: Math.max(0, trackingRecord.initial_quantity - quantity) // Ensure we don't go below 0
            })
            .eq('id', trackingRecord.id);

          if (updateError) {
            throw updateError;
          }
        }
      }
    }

    // Delete the order items first (due to foreign key constraint)
    const { error: itemsDeleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsDeleteError) {
      throw itemsDeleteError;
    }

    // Then delete the order
    const { error: orderDeleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderDeleteError) {
      throw orderDeleteError;
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router; 
const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Get all orders (for admin)
router.get('/company/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    // First, verify if the user is an admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('company_id', companyId)
      .eq('is_admin', true)
      .single();

    if (adminError || !adminUser) {
      return res.status(403).json({ error: 'Unauthorized access' });
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
      throw error;
    }

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
    const { error } = await supabase
      .from('orders')
      .update({ 
        status,
        has_been_delivered: status === 'delivered'
      })
      .eq('id', orderId);

    if (error) {
      throw error;
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Delete order
router.delete('/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    // Delete order items first (cascade should handle this, but being explicit)
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsError) {
      throw itemsError;
    }

    // Delete order
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderError) {
      throw orderError;
    }

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router; 
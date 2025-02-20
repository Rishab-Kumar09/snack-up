const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Get inventory tracking data for all snacks
router.get('/tracking', async (req, res) => {
  try {
    const { data: tracking, error } = await supabase
      .from('snack_inventory_tracking')
      .select(`
        *,
        snacks (
          name
        )
      `)
      .order('week_start_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Format response
    const formattedTracking = tracking.map(record => ({
      ...record,
      snack_name: record.snacks.name
    }));

    res.json(formattedTracking);
  } catch (error) {
    console.error('Error fetching inventory tracking:', error);
    res.status(500).json({ error: 'Failed to fetch inventory tracking' });
  }
});

// Add new inventory tracking record
router.post('/tracking', async (req, res) => {
  const { snack_id, wasted_quantity, shortage_quantity, notes } = req.body;
  
  // Validate that we don't have both wastage and shortage
  if (wasted_quantity > 0 && shortage_quantity > 0) {
    return res.status(400).json({ 
      error: 'A snack cannot have both wastage and shortage at the same time. Please set either wastage or shortage, not both.' 
    });
  }

  try {
    // Get the most recent record for this snack
    const { data: currentWeekData, error: fetchError } = await supabase
      .from('snack_inventory_tracking')
      .select('*')
      .eq('snack_id', snack_id)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (!currentWeekData) {
      return res.status(400).json({ 
        error: 'No initial quantity found. Please wait for orders to be delivered.' 
      });
    }

    // Update the tracking record
    const { error: updateError } = await supabase
      .from('snack_inventory_tracking')
      .update({
        wasted_quantity: wasted_quantity || 0,
        shortage_quantity: shortage_quantity || 0,
        notes: notes || currentWeekData.notes
      })
      .eq('id', currentWeekData.id);

    if (updateError) {
      throw updateError;
    }

    res.json({
      message: "Inventory tracking record updated successfully",
      id: currentWeekData.id
    });
  } catch (error) {
    console.error('Error updating inventory tracking:', error);
    res.status(500).json({ error: 'Failed to update inventory tracking' });
  }
});

// Update inventory tracking record
router.put('/tracking/:id', async (req, res) => {
  const { id } = req.params;
  const { wasted_quantity, shortage_quantity, notes } = req.body;
  
  try {
    const { error } = await supabase
      .from('snack_inventory_tracking')
      .update({
        wasted_quantity,
        shortage_quantity,
        notes
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({
      message: "Inventory tracking record updated successfully"
    });
  } catch (error) {
    console.error('Error updating inventory tracking:', error);
    res.status(500).json({ error: 'Failed to update inventory tracking' });
  }
});

// Get inventory statistics
router.get('/statistics', async (req, res) => {
  try {
    const { data: tracking, error } = await supabase
      .from('snack_inventory_tracking')
      .select(`
        *,
        snacks (
          id,
          name
        )
      `);

    if (error) {
      throw error;
    }

    // Calculate statistics
    const statistics = tracking.reduce((acc, record) => {
      const snackId = record.snacks.id;
      if (!acc[snackId]) {
        acc[snackId] = {
          snack_name: record.snacks.name,
          total_wasted: 0,
          total_shortage: 0,
          records_count: 0
        };
      }
      
      acc[snackId].total_wasted += record.wasted_quantity || 0;
      acc[snackId].total_shortage += record.shortage_quantity || 0;
      acc[snackId].records_count++;
      return acc;
    }, {});

    // Format response
    const formattedStats = Object.values(statistics).map(stat => ({
      snack_name: stat.snack_name,
      total_wasted: stat.total_wasted,
      total_shortage: stat.total_shortage,
      avg_weekly_waste: stat.records_count ? +(stat.total_wasted / stat.records_count).toFixed(2) : 0,
      avg_weekly_shortage: stat.records_count ? +(stat.total_shortage / stat.records_count).toFixed(2) : 0
    }));

    res.json(formattedStats);
  } catch (error) {
    console.error('Error fetching inventory statistics:', error);
    res.status(500).json({ error: 'Failed to fetch inventory statistics' });
  }
});

// Delete all inventory tracking records
router.delete('/tracking/all', async (req, res) => {
  try {
    const { error } = await supabase
      .from('snack_inventory_tracking')
      .delete()
      .neq('id', 0); // Delete all records

    if (error) {
      throw error;
    }

    res.json({
      message: "All inventory tracking records deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting inventory tracking records:', error);
    res.status(500).json({ error: 'Failed to delete inventory tracking records' });
  }
});

// Get week-over-week comparison
router.get('/tracking/comparison', async (req, res) => {
  try {
    // Calculate date ranges
    const now = new Date();
    const currentWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    // Get all records for the last two weeks
    const { data: tracking, error } = await supabase
      .from('snack_inventory_tracking')
      .select(`
        *,
        snacks (
          id,
          name
        )
      `)
      .gte('week_start_date', previousWeekStart.toISOString().split('T')[0])
      .lt('week_start_date', new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) {
      throw error;
    }

    // Separate current and previous week data
    const currentWeekData = tracking.filter(record => 
      new Date(record.week_start_date) >= currentWeekStart &&
      new Date(record.week_start_date) < new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    );

    const previousWeekData = tracking.filter(record => 
      new Date(record.week_start_date) >= previousWeekStart &&
      new Date(record.week_start_date) < currentWeekStart
    );

    // Create comparison data
    const comparisons = tracking.reduce((acc, record) => {
      const snackId = record.snacks.id;
      if (!acc[snackId]) {
        acc[snackId] = {
          snack_id: snackId,
          snack_name: record.snacks.name,
          current_initial_quantity: 0,
          current_wasted_quantity: 0,
          current_shortage_quantity: 0,
          previous_initial_quantity: 0,
          previous_wasted_quantity: 0,
          previous_shortage_quantity: 0
        };
      }

      const isCurrentWeek = currentWeekData.includes(record);
      if (isCurrentWeek) {
        acc[snackId].current_initial_quantity = record.initial_quantity;
        acc[snackId].current_wasted_quantity = record.wasted_quantity;
        acc[snackId].current_shortage_quantity = record.shortage_quantity;
      } else {
        acc[snackId].previous_initial_quantity = record.initial_quantity;
        acc[snackId].previous_wasted_quantity = record.wasted_quantity;
        acc[snackId].previous_shortage_quantity = record.shortage_quantity;
      }

      return acc;
    }, {});

    // Calculate percentages and format response
    const formattedComparisons = Object.values(comparisons).map(comp => ({
      ...comp,
      initial_quantity_change_percentage: comp.previous_initial_quantity > 0 
        ? +((comp.current_initial_quantity - comp.previous_initial_quantity) * 100 / comp.previous_initial_quantity).toFixed(2)
        : null,
      waste_change_percentage: comp.previous_wasted_quantity > 0
        ? +((comp.current_wasted_quantity - comp.previous_wasted_quantity) * 100 / comp.previous_wasted_quantity).toFixed(2)
        : null,
      shortage_change_percentage: comp.previous_shortage_quantity > 0
        ? +((comp.current_shortage_quantity - comp.previous_shortage_quantity) * 100 / comp.previous_shortage_quantity).toFixed(2)
        : null
    }));

    res.json({
      currentWeekStart: currentWeekStart.toISOString().split('T')[0],
      previousWeekStart: previousWeekStart.toISOString().split('T')[0],
      comparisons: formattedComparisons
    });
  } catch (error) {
    console.error('Error fetching inventory comparison:', error);
    res.status(500).json({ error: 'Failed to fetch inventory comparison' });
  }
});

// Get current week's tracking summary
router.get('/tracking/current-week', async (req, res) => {
  try {
    // Calculate current week date range
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: tracking, error } = await supabase
      .from('snack_inventory_tracking')
      .select(`
        *,
        snacks (
          name
        )
      `)
      .gte('week_start_date', weekStart.toISOString().split('T')[0])
      .lt('week_start_date', weekEnd.toISOString().split('T')[0]);

    if (error) {
      throw error;
    }

    // Format response
    const formattedTracking = tracking.map(record => ({
      ...record,
      snack_name: record.snacks.name,
      week_start: weekStart.toISOString().split('T')[0],
      week_end: weekEnd.toISOString().split('T')[0]
    }));

    res.json(formattedTracking);
  } catch (error) {
    console.error('Error fetching current week tracking:', error);
    res.status(500).json({ error: 'Failed to fetch current week tracking' });
  }
});

module.exports = router; 
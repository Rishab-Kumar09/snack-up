import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from 'chart.js';
import config from '../config';
import './InventoryTracking.css';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const InventoryTracking = () => {
  const [trackingData, setTrackingData] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [selectedSnack, setSelectedSnack] = useState(null);
  const [snacks, setSnacks] = useState([]);
  const [newTracking, setNewTracking] = useState({
    snack_id: '',
    wasted_quantity: '0',
    shortage_quantity: '0',
    notes: ''
  });
  const [currentWeekData, setCurrentWeekData] = useState({});

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const [trackingRes, statsRes, snacksRes, currentWeekRes] = await Promise.all([
        fetch(`${config.apiBaseUrl}/inventory/tracking`),
        fetch(`${config.apiBaseUrl}/inventory/statistics`),
        fetch(`${config.apiBaseUrl}/snacks`),
        fetch(`${config.apiBaseUrl}/inventory/tracking/current-week`)
      ]);

      const [trackingData, statsData, snacksData, currentWeekData] = await Promise.all([
        trackingRes.json(),
        statsRes.json(),
        snacksRes.json(),
        currentWeekRes.json()
      ]);

      setTrackingData(trackingData);
      setStatistics(statsData);
      setSnacks(snacksData);
      setCurrentWeekData(currentWeekData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSnackChange = (e) => {
    const snackId = e.target.value;
    setNewTracking(prev => ({
      ...prev,
      snack_id: snackId
    }));
    
    // Find current week's data for selected snack
    const snackData = currentWeekData.tracking?.find(t => t.snack_id === parseInt(snackId));
    if (snackData) {
      setSelectedSnack(snackData);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${config.apiBaseUrl}/inventory/tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTracking),
      });

      if (!response.ok) throw new Error('Failed to add tracking record');
      
      fetchData();
      setNewTracking({
        snack_id: '',
        wasted_quantity: '0',
        shortage_quantity: '0',
        notes: ''
      });
      setSelectedSnack(null);
    } catch (error) {
      console.error('Error adding tracking record:', error);
    }
  };

  const pieChartData = {
    labels: statistics.map(stat => stat.snack_name),
    datasets: [
      {
        data: statistics.map(stat => stat.total_wasted),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40'
        ]
      }
    ]
  };

  const getRecommendations = () => {
    const recommendations = [];
    
    statistics.forEach(stat => {
      if (stat.avg_weekly_waste > stat.avg_weekly_shortage) {
        recommendations.push(`Consider ordering less of ${stat.snack_name} as it has high wastage.`);
      }
      if (stat.avg_weekly_shortage > stat.avg_weekly_waste) {
        recommendations.push(`Consider ordering more of ${stat.snack_name} as it often runs short.`);
      }
    });

    return recommendations;
  };

  return (
    <div className="inventory-tracking">
      <h2>Inventory Tracking</h2>
      
      <div className="tracking-grid">
        <div className="tracking-form-section">
          <h3>Add New Tracking Record</h3>
          <form onSubmit={handleSubmit} className="tracking-form">
            <div className="form-group">
              <label>Snack</label>
              <select
                value={newTracking.snack_id}
                onChange={handleSnackChange}
                required
              >
                <option value="">Select a snack</option>
                {snacks.map(snack => (
                  <option key={snack.id} value={snack.id}>{snack.name}</option>
                ))}
              </select>
            </div>

            {selectedSnack && (
              <div className="form-group">
                <label>Initial Quantity</label>
                <div className="quantity-display">
                  <div>
                    <strong>{selectedSnack.initial_quantity || 0}</strong>
                    <span className="quantity-note">
                      {selectedSnack.initial_quantity ? ' (Total from all delivered orders this week)' : ' (No deliveries this week yet)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Wasted Quantity</label>
              <input
                type="number"
                min="0"
                value={newTracking.wasted_quantity}
                onChange={(e) => setNewTracking(prev => ({ ...prev, wasted_quantity: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Shortage Quantity</label>
              <input
                type="number"
                min="0"
                value={newTracking.shortage_quantity}
                onChange={(e) => setNewTracking(prev => ({ ...prev, shortage_quantity: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={newTracking.notes}
                onChange={(e) => setNewTracking(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <button type="submit" className="btn btn-primary">Add Record</button>
          </form>
        </div>

        <div className="tracking-stats-section">
          <h3>Wastage Statistics</h3>
          <div className="chart-container">
            <Pie data={pieChartData} options={{ responsive: true }} />
          </div>
          
          <div className="stats-table">
            <h4>Detailed Statistics</h4>
            <table>
              <thead>
                <tr>
                  <th>Snack</th>
                  <th>Total Wasted</th>
                  <th>Total Shortage</th>
                  <th>Avg Weekly Waste</th>
                  <th>Avg Weekly Shortage</th>
                </tr>
              </thead>
              <tbody>
                {statistics.map((stat, index) => (
                  <tr key={index}>
                    <td>{stat.snack_name}</td>
                    <td>{stat.total_wasted}</td>
                    <td>{stat.total_shortage}</td>
                    <td>{Number(stat.avg_weekly_waste).toFixed(2)}</td>
                    <td>{Number(stat.avg_weekly_shortage).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="recommendations-section">
        <h3>AI Recommendations</h3>
        <ul className="recommendations-list">
          {getRecommendations().map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </div>

      <div className="tracking-history">
        <h3>Tracking History</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Snack</th>
              <th>Initial Quantity</th>
              <th>Wasted</th>
              <th>Shortage</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {trackingData.map((record) => (
              <tr key={record.id}>
                <td>{new Date(record.week_start_date).toLocaleDateString()}</td>
                <td>{record.snack_name}</td>
                <td>{record.initial_quantity}</td>
                <td>{record.wasted_quantity}</td>
                <td>{record.shortage_quantity}</td>
                <td>{record.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTracking; 
import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <section className="hero-section">
        <h1>Welcome to SnackUp</h1>
        <p className="hero-subtitle">Your favorite snacks, delivered to your desk</p>
        <div className="cta-buttons">
          <Link to="/login" className="btn btn-primary">Get Started</Link>
        </div>
      </section>

      <section className="features-section">
        <h2>Why Choose SnackUp?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Wide Selection</h3>
            <p>Choose from a variety of healthy and delicious snacks</p>
          </div>
          <div className="feature-card">
            <h3>Quick Delivery</h3>
            <p>Get your snacks delivered right to your desk</p>
          </div>
          <div className="feature-card">
            <h3>Smart Recommendations</h3>
            <p>Discover new snacks based on your preferences</p>
          </div>
        </div>
      </section>

      <section className="popular-snacks">
        <h2>Popular Snacks</h2>
        <div className="snacks-preview">
          <div className="snack-preview-card">
            <h3>Mixed Nuts</h3>
            <p>A healthy mix of almonds, cashews, and walnuts</p>
          </div>
          <div className="snack-preview-card">
            <h3>Dark Chocolate</h3>
            <p>72% cocoa dark chocolate bar</p>
          </div>
          <div className="snack-preview-card">
            <h3>Trail Mix</h3>
            <p>Energy-packed mix of nuts, dried fruits, and chocolate</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home; 
import React from 'react';
import { motion } from 'framer-motion';
import './StatsPanel.css';

const StatsPanel = ({ stats }) => {
  if (!stats || stats.length === 0) return null;

  return (
    <div className="stats-panel-grid">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div 
            key={index} 
            className={`stat-card stat-card-${stat.color || 'blue'}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <div className="stat-card-content">
              <div className="stat-card-info">
                <span className="stat-card-label">{stat.label}</span>
                <h4 className="stat-card-value">{stat.value}</h4>
              </div>
              <div className="stat-card-icon-wrapper">
                {Icon && <Icon size={24} />}
              </div>
            </div>
            {stat.trend && (
              <div className="stat-card-trend">
                <span style={{ color: stat.trend.direction === 'up' ? '#10b981' : (stat.trend.direction === 'down' ? '#ef4444' : '#64748b'), fontWeight: 600, marginRight: '4px' }}>
                  {stat.trend.value}
                </span>
                <span className="stat-card-trend-label">{stat.trend.label}</span>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default StatsPanel;

import React from 'react';

/**
 * Reusable Status Badge Component
 */
export const StatusBadge = ({ status, variant: _variant = 'status' }) => {
  const getBadgeClass = () => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'badge-success';
      case 'in progress':
        return 'badge-info';
      case 'pending':
      case 'not started':
        return 'badge-warning';
      case 'high':
        return 'badge-danger';
      case 'medium':
        return 'badge-warning';
      case 'low':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <span className={`status-badge ${getBadgeClass()}`}>
      <span className="badge-dot" />
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;

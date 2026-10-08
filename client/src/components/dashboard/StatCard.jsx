import './DashboardComponents.css';

const StatCard = ({ title, value, icon: Icon, color = '#3b82f6', subtitle }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <h3 className="stat-card-title">{title}</h3>
        <div className="stat-card-icon" style={{ backgroundColor: `${color}20`, color: color }}>
          {Icon && <Icon size={20} />}
        </div>
      </div>
      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
};

export default StatCard;

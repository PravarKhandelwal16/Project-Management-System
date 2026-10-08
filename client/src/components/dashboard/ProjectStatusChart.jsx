import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import './DashboardComponents.css';

const COLORS = ['#6b7280', '#3b82f6', '#10b981']; // Not Started, In Progress, Completed

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{`${payload[0].name}`}</p>
        <p className="chart-tooltip-value">{`Count: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const ProjectStatusChart = ({ data }) => {
  if (!data || data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <div className="chart-container empty-chart">
        <p>No project data available</p>
      </div>
    );
  }

  // filter out 0 values if you prefer, or let them show in legend
  const chartData = data.map(d => ({ name: d.status, value: d.count }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">Project Status</h3>
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProjectStatusChart;

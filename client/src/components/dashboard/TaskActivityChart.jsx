import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import './DashboardComponents.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{payload[0]?.payload?.date ? format(parseISO(payload[0].payload.date), 'MMM d, yyyy') : label}</p>
        <p className="chart-tooltip-value" style={{ color: '#3b82f6' }}>{`Created: ${payload[0].value}`}</p>
        <p className="chart-tooltip-value" style={{ color: '#10b981' }}>{`Completed: ${payload[1].value}`}</p>
      </div>
    );
  }
  return null;
};

const TaskActivityChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container empty-chart">
        <p>No activity data available</p>
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    displayDate: format(parseISO(d.date), 'MMM d')
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">Task Activity (Last 7 Days)</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis dataKey="displayDate" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36}/>
            <Area type="monotone" dataKey="created" name="Tasks Created" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCreated)" />
            <Area type="monotone" dataKey="completed" name="Tasks Completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TaskActivityChart;

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
export default function ActivityChart({data}) {
  const rows=(data||[]).map(item=>({...item,label:format(parseISO(item.date),'MMM d')}));
  return <div className="planning-chart" role="img" aria-label={'Daily activity: '+rows.reduce((sum,item)=>sum+item.created,0)+' tasks created and '+rows.reduce((sum,item)=>sum+item.completed,0)+' task completions across the displayed days.'}>
    <ResponsiveContainer width="100%" height="100%"><AreaChart data={rows} margin={{top:5,right:12,left:-25,bottom:0}}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} minTickGap={25}/><YAxis fontSize={10} allowDecimals={false} axisLine={false} tickLine={false}/>
      <Tooltip labelFormatter={(_,payload)=>payload?.[0]?.payload.date||''}/><Legend iconType="circle" wrapperStyle={{fontSize:11}}/>
      <Area type="monotone" dataKey="created" name="Created" stroke="#2563eb" fill="#dbeafe" fillOpacity={0.5}/><Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" fill="#d1fae5" fillOpacity={0.4}/>
    </AreaChart></ResponsiveContainer>
  </div>;
}

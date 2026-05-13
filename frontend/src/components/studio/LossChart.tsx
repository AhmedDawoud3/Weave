import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { LossDataPoint, AccuracyDataPoint } from '../../store/trainingStore';

interface LossChartProps {
  lossHistory: LossDataPoint[];
  accuracyHistory: AccuracyDataPoint[];
  showAccuracy?: boolean;
}

function LossChart({ lossHistory, accuracyHistory, showAccuracy = false }: LossChartProps) {
  const hasData = lossHistory.length > 0;
  
  // Merge loss and accuracy data by epoch
  const chartData = lossHistory.map((lossPoint) => {
    const accPoint = accuracyHistory.find((a) => a.epoch === lossPoint.epoch);
    return {
      epoch: lossPoint.epoch,
      trainLoss: lossPoint.trainLoss,
      valLoss: lossPoint.valLoss,
      trainAcc: accPoint?.trainAcc,
      valAcc: accPoint?.valAcc,
    };
  });

  if (!hasData) {
    return (
      <div className="h-48 flex items-center justify-center bg-slate-700/30 rounded-lg border border-slate-600/50">
        <p className="text-sm text-slate-500">No training data yet</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-700/30 rounded-lg border border-slate-600/50 p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3">
        {showAccuracy ? 'Training Progress' : 'Loss Over Time'}
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="epoch"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#475569' }}
              label={{ value: 'Epoch', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              yAxisId="loss"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#475569' }}
              domain={['auto', 'auto']}
              label={{ value: 'Loss', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
            />
            {showAccuracy && (
              <YAxis
                yAxisId="accuracy"
                orientation="right"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={{ stroke: '#475569' }}
                domain={[0, 100]}
                label={{ value: 'Accuracy %', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 11 }}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#94a3b8' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            />
            <Line
              yAxisId="loss"
              type="monotone"
              dataKey="trainLoss"
              name="Train Loss"
              stroke="#f87171"
              strokeWidth={2}
              dot={{ fill: '#f87171', r: 3 }}
              activeDot={{ r: 5 }}
            />
            {chartData.some((d) => d.valLoss !== undefined) && (
              <Line
                yAxisId="loss"
                type="monotone"
                dataKey="valLoss"
                name="Val Loss"
                stroke="#fb923c"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#fb923c', r: 3 }}
                activeDot={{ r: 5 }}
              />
            )}
            {showAccuracy && (
              <>
                <Line
                  yAxisId="accuracy"
                  type="monotone"
                  dataKey="trainAcc"
                  name="Train Acc"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ fill: '#34d399', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                {chartData.some((d) => d.valAcc !== undefined) && (
                  <Line
                    yAxisId="accuracy"
                    type="monotone"
                    dataKey="valAcc"
                    name="Val Acc"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#22d3ee', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default LossChart;

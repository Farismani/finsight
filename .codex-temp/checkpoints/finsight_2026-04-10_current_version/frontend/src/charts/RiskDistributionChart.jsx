import { Doughnut } from 'react-chartjs-2'

import { chartOptions } from './chartTheme'

export default function RiskDistributionChart({ data }) {
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        data: data.map((item) => item.value),
        backgroundColor: ['#22C55E', '#FACC15', '#F97316', '#A855F7'],
        borderWidth: 0,
      },
    ],
  }

  return (
    <div className="glass-panel p-5">
      <div className="mb-4">
        <p className="text-sm text-slate-400">Risk distribution</p>
        <h3 className="font-display text-xl font-semibold text-white">Portfolio risk mix</h3>
      </div>
      <div className="h-72">
        <Doughnut
          data={chartData}
          options={{
            ...chartOptions,
            cutout: '72%',
            scales: undefined,
          }}
        />
      </div>
    </div>
  )
}

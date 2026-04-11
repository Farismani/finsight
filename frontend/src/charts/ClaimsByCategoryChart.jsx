import { Bar } from 'react-chartjs-2'

import { chartOptions } from './chartTheme'

export default function ClaimsByCategoryChart({ data }) {
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        label: 'Claims',
        data: data.map((item) => item.value),
        borderRadius: 2,
        backgroundColor: '#1B365D',
      },
    ],
  }

  return (
    <div className="glass-panel p-5">
      <div className="mb-4">
        <p className="text-sm text-slate-400">Claims by category</p>
        <h3 className="font-display text-2xl font-bold uppercase text-white">Expense categories</h3>
      </div>
      <div className="h-72">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  )
}


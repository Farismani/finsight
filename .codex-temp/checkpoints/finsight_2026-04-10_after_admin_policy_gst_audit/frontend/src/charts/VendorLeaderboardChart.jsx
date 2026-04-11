import { Bar } from 'react-chartjs-2'

import { chartOptions } from './chartTheme'

export default function VendorLeaderboardChart({ data }) {
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        label: 'Vendor risk',
        data: data.map((item) => item.value),
        borderRadius: 12,
        backgroundColor: ['#A855F7', '#F97316', '#FACC15', '#38BDF8', '#22C55E'],
      },
    ],
  }

  return (
    <div className="glass-panel p-5">
      <div className="mb-4">
        <p className="text-sm text-slate-400">Vendor risk leaderboard</p>
        <h3 className="font-display text-xl font-semibold text-white">Highest vendor risk concentration</h3>
      </div>
      <div className="h-72">
        <Bar
          data={chartData}
          options={{
            ...chartOptions,
            indexAxis: 'y',
          }}
        />
      </div>
    </div>
  )
}

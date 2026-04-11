import { Bar } from 'react-chartjs-2'

import { chartOptions } from './chartTheme'

export default function VendorLeaderboardChart({ data }) {
  const chartData = {
    labels: data.map((item) => item.label),
    datasets: [
      {
        label: 'Vendor risk',
        data: data.map((item) => item.value),
        borderRadius: 2,
        backgroundColor: ['#1B2D37', '#DA291C', '#D7DF23', '#1B365D', '#008755'],
      },
    ],
  }

  return (
    <div className="glass-panel p-5">
      <div className="mb-4">
        <p className="text-sm text-slate-400">Vendor risk leaderboard</p>
        <h3 className="font-display text-2xl font-bold uppercase text-white">Highest vendor risk concentration</h3>
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



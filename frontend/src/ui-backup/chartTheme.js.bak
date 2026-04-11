import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export const chartOptions = {
  plugins: {
    legend: {
      labels: {
        color: '#CBD5E1',
        usePointStyle: true,
        boxWidth: 10,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#F8FAFC',
      bodyColor: '#CBD5E1',
      borderColor: 'rgba(148, 163, 184, 0.12)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#94A3B8' },
      grid: { color: 'rgba(148, 163, 184, 0.08)' },
    },
    y: {
      ticks: { color: '#94A3B8' },
      grid: { color: 'rgba(148, 163, 184, 0.08)' },
    },
  },
  maintainAspectRatio: false,
}

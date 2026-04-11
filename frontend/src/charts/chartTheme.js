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
        color: '#1A1A2E',
        font: { weight: '500' },
        usePointStyle: true,
        boxWidth: 10,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(26, 26, 46, 0.95)',
      titleColor: '#FFFFFF',
      bodyColor: '#E2E8F0',
      borderColor: 'rgba(27, 54, 93, 0.3)',
      borderWidth: 1,
      titleFont: { weight: '600' },
      bodyFont: { weight: '400' },
    },
  },
  scales: {
    x: {
      ticks: { color: '#475569', font: { weight: '500' } },
      grid: { color: 'rgba(27, 54, 93, 0.12)' },
    },
    y: {
      ticks: { color: '#475569', font: { weight: '500' } },
      grid: { color: 'rgba(27, 54, 93, 0.12)' },
    },
  },
  maintainAspectRatio: false,
}


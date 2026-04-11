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
        color: '#393339',
        usePointStyle: true,
        boxWidth: 10,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(27, 45, 55, 0.97)',
      titleColor: '#FFFFFF',
      bodyColor: '#F2F2F2',
      borderColor: 'rgba(255, 255, 255, 0.18)',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#53565A' },
      grid: { color: 'rgba(27, 54, 93, 0.1)' },
    },
    y: {
      ticks: { color: '#53565A' },
      grid: { color: 'rgba(27, 54, 93, 0.1)' },
    },
  },
  maintainAspectRatio: false,
}



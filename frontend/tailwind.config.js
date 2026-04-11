/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#F1F5F9',
        panel: '#FFFFFF',
        line: '#E2E8F0',
        soft: '#475569',
        brand: '#1B365D',
        brand2: '#DA291C',
        riskLow: '#059669',
        riskMedium: '#D97706',
        riskHigh: '#DC2626',
        riskCritical: '#1E293B',
      },
      fontFamily: {
        sans: ['Libre Franklin', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Barlow Condensed', 'Libre Franklin', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 18px 45px rgba(27, 45, 55, 0.12)',
      },
      backgroundImage: {
        ambient:
          'linear-gradient(135deg, rgba(27, 54, 93, 0.08), transparent 38%), linear-gradient(90deg, rgba(218, 41, 28, 0.08) 0 4px, transparent 4px 100%)',
      },
    },
  },
  plugins: [],
}


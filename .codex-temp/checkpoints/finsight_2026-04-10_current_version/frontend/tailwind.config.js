/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#060816',
        panel: 'rgba(15, 23, 42, 0.68)',
        line: 'rgba(148, 163, 184, 0.16)',
        soft: '#9CA3AF',
        brand: '#5EEAD4',
        brand2: '#38BDF8',
        riskLow: '#22C55E',
        riskMedium: '#FACC15',
        riskHigh: '#F97316',
        riskCritical: '#A855F7',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 24px 60px rgba(2, 8, 23, 0.38)',
      },
      backgroundImage: {
        ambient:
          'radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(94, 234, 212, 0.12), transparent 24%)',
      },
    },
  },
  plugins: [],
}

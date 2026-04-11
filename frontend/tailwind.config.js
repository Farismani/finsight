/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#F2F2F2',
        panel: '#FFFFFF',
        line: '#E5E5E5',
        soft: '#53565A',
        brand: '#1B365D',
        brand2: '#DA291C',
        riskLow: '#008755',
        riskMedium: '#D7DF23',
        riskHigh: '#DA291C',
        riskCritical: '#1B2D37',
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




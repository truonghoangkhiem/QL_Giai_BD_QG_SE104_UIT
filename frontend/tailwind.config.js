/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "../index.html", // Đường dẫn này nên là "./index.html" nếu index.html cùng cấp với thư mục frontend, hoặc đúng đường dẫn tới file index.html của bạn
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        beige: '#e4d5c7',
        'theme-red': '#DC2626', // Màu nhấn chính
        'primary-action': '#DC2626', // Ví dụ: bg-red-600
        'primary-action-hover': '#C53030', // Ví dụ: bg-red-700 (màu tối hơn chút)
        'secondary-action': '#718096', // Ví dụ: bg-gray-500
        'secondary-action-hover': '#4A5568', // Ví dụ: bg-gray-600
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'sans-serif'],
        heading: ['"Montserrat"', 'sans-serif'], // Font cho tiêu đề nếu muốn khác biệt
      },
    }
  },
  plugins: [],
}
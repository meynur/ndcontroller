/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["SF Pro Display", "SF Pro Text", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#dbe3ee",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      boxShadow: {
        glow: "0 24px 80px rgba(15, 23, 42, 0.18)",
        glass: "0 18px 60px rgba(15, 23, 42, 0.16)",
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at top left, rgba(56, 189, 248, 0.24), transparent 32%), radial-gradient(circle at top right, rgba(196, 181, 253, 0.18), transparent 28%), radial-gradient(circle at 50% 120%, rgba(250, 204, 21, 0.14), transparent 28%), linear-gradient(135deg, #eff6ff 0%, #e0f2fe 18%, #eef2ff 42%, #f8fafc 100%)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

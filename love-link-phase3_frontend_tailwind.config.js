/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"','serif'],
        body:    ['"Plus Jakarta Sans"','sans-serif'],
      },
      colors: {
        rose: { 50:'#fff1f2',100:'#ffe4e6',200:'#fecdd3',300:'#fda4af',400:'#fb7185',500:'#f43f5e',600:'#e11d48',700:'#be123c',800:'#9f1239',900:'#881337' },
        blush:'#fdf2f4', champagne:'#fdf6ec', petal:'#fce7ea',
        dark: { bg:'#0f0a0b', surface:'#1a1015', card:'#231319', border:'#3d2028', text:'#f9e8eb', muted:'#9b6470' }
      },
      animation: {
        'float':'float 3s ease-in-out infinite',
        'heartbeat':'heartbeat 1.4s ease-in-out infinite',
        'slide-up':'slideUp 0.35s cubic-bezier(.16,1,.3,1)',
        'slide-in':'slideIn 0.3s cubic-bezier(.16,1,.3,1)',
        'fade-in':'fadeIn 0.25s ease-out',
        'pop':'pop 0.4s cubic-bezier(.175,.885,.32,1.275)',
        'bounce-in':'bounceIn 0.5s cubic-bezier(.175,.885,.32,1.275)',
        'glow':'glow 2s ease-in-out infinite',
      },
      keyframes: {
        float:     { '0%,100%':{ transform:'translateY(0)' }, '50%':{ transform:'translateY(-10px)' } },
        heartbeat: { '0%,100%':{ transform:'scale(1)' }, '14%':{ transform:'scale(1.35)' }, '28%':{ transform:'scale(1)' }, '42%':{ transform:'scale(1.2)' }, '70%':{ transform:'scale(1)' } },
        slideUp:   { from:{ transform:'translateY(24px)',opacity:0 }, to:{ transform:'translateY(0)',opacity:1 } },
        slideIn:   { from:{ transform:'translateX(24px)',opacity:0 }, to:{ transform:'translateX(0)',opacity:1 } },
        fadeIn:    { from:{ opacity:0 }, to:{ opacity:1 } },
        pop:       { '0%':{ transform:'scale(0)',opacity:0 }, '100%':{ transform:'scale(1)',opacity:1 } },
        bounceIn:  { '0%':{ transform:'scale(0.3)',opacity:0 }, '50%':{ transform:'scale(1.05)' }, '70%':{ transform:'scale(0.9)' }, '100%':{ transform:'scale(1)',opacity:1 } },
        glow:      { '0%,100%':{ boxShadow:'0 0 8px rgba(244,63,94,.3)' }, '50%':{ boxShadow:'0 0 24px rgba(244,63,94,.6)' } },
      },
    },
  },
  plugins: [],
}

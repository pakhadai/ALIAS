import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './admin.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        serif: ["'Playfair Display'", 'serif'],
      },
      colors: {
        'premium-dark-bg': '#1A1A1A',
        'card-dark-bg': '#121212',
        'champagne-gold': '#F3E5AB',
        'champagne-dark': '#E6D690',
        'dark-btn-grey': '#333333',
        'dark-btn-hover': '#444444',
        'premium-white': '#FFFFFF',
        'burgundy-deep': '#2A1515',
        'burgundy-text': '#DFAFAF',
        'forest-green-deep': '#1F2929',
        'forest-green-text': '#AFDEDC',
        'text-main-dark': '#FFFFFF',
        'text-sub-dark': '#9CA3AF',
        'silver-bg': '#F8F9FA',
        'premium-black': '#111111',
        'soft-grey': '#F3F4F6',
        'forest-accent': '#4DB6AC',
        'forest-btn': '#2E7D6A',
        'matte-black': '#050505',
        'dark-indigo': '#312E81',
        'dark-grey': '#1F1F1F',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 4s ease-in-out infinite',
        'pop-in': 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'pop-out': 'popOut 0.3s ease-in forwards',
        'slide-up': 'slideUp 0.5s ease-out forwards',
        'page-in': 'pageIn 0.18s ease-out forwards',
        'countdown-hit': 'countdownHit 1s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-out': 'fadeOut 0.3s ease-in forwards',
        fall: 'fall 3s linear forwards',
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'float-up': 'floatUp 1s ease-out forwards',
        'vs-from-left': 'vsFromLeft 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'vs-from-right': 'vsFromRight 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'vs-scale-in': 'vsScaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'reveal-in': 'revealIn 0.35s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        popOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.8)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pageIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        countdownHit: {
          '0%': { opacity: '0', transform: 'scale(1.5)' },
          '25%': { opacity: '1', transform: 'scale(1.05)' },
          '85%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.9)' },
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeOut: { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        fall: {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(360deg)', opacity: '0' },
        },
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(0)' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'translateY(-100px)' },
        },
        vsFromLeft: {
          '0%': { opacity: '0', transform: 'translateX(-100vw)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        vsFromRight: {
          '0%': { opacity: '0', transform: 'translateX(100vw)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        vsScaleIn: {
          '0%': { opacity: '0', transform: 'scale(0) rotate(-20deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        revealIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.98)',
            filter: 'blur(2px)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
            filter: 'blur(0px)',
          },
        },
      },
      boxShadow: {
        'premium-card': '0 20px 40px -10px rgba(0, 0, 0, 0.6)',
        'inner-glow': 'inset 0 0 20px rgba(255, 255, 255, 0.03)',
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        card: '0 2px 10px rgba(0, 0, 0, 0.03)',
      },
    },
  },
} satisfies Config;

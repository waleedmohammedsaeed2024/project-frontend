@echo off
echo Installing dependencies...
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install "@tanstack/react-router" "@tanstack/react-query" "@tanstack/react-table" zod react-hook-form @hookform/resolvers zustand "@supabase/supabase-js" lucide-react clsx tailwind-merge
echo Installation complete.

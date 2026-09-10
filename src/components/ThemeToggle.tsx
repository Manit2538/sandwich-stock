'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.theme = next ? 'dark' : 'light';
  };
  return (
    <button onClick={toggle} aria-label="สลับโหมดมืด/สว่าง" className="rounded-full p-2 text-xl">
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
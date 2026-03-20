'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Sparkles, Moon, Sun } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useTheme } from '@/lib/hooks/use-theme';
import { useState } from 'react';
import { SettingsDialog } from '@/components/settings';

export function Header() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sembunyikan header global di halaman utama (karena sudah pakai floating toolbar custom)
  if (pathname === '/') return null;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#060b19]/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all text-foreground">
        <div className="flex h-14 items-center px-4 md:px-6 max-w-[1920px] mx-auto">
          {/* ── Logo Area (Miyasensei Branding) ── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-transform hover:scale-[1.02] group"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all">
              <Sparkles className="size-4 text-white group-hover:animate-pulse" />
            </div>
            <span className="bg-gradient-to-br from-blue-400 via-purple-400 to-cyan-300 bg-clip-text text-xl font-extrabold tracking-tight text-transparent drop-shadow-sm">
              Miyasensei
            </span>
          </Link>

          {/* ── Right Actions ── */}
          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-4">
            <nav className="flex items-center gap-2">
              {/* Language Toggle */}
              <button
                onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}
                className="flex h-8 items-center justify-center rounded-full px-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors border border-white/5 bg-white/5"
              >
                {locale === 'zh-CN' ? 'EN' : 'CN'}
              </button>

              {/* Theme Toggle (Optional, defaulted to match aesthetic) */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors bg-white/5 border border-white/5"
                title={t('settings.themeOptions.system')}
              >
                {theme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
              </button>

              <div className="w-[1px] h-4 bg-white/10 mx-1" />

              {/* Settings Button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors hover:rotate-90 duration-300"
              >
                <Settings className="size-4" />
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Dialog Pengaturan tetap di-render dari header */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

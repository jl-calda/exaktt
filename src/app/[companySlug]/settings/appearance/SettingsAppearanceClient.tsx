'use client'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import { THEME_PRESETS } from '@/lib/theme'

export default function SettingsAppearanceClient() {
  const { theme, isDark, setTheme, setDark } = useTheme()

  return (
    <div className="space-y-5">

      {/* Light / Dark */}
      <div className="card p-5">
        <h2 className="font-semibold text-[13px] text-ink mb-4">Mode</h2>
        <div className="grid grid-cols-2 gap-3">
          {([
            { label: 'Light', icon: <Sun  className="w-4 h-4" />, value: false },
            { label: 'Dark',  icon: <Moon className="w-4 h-4" />, value: true  },
          ] as const).map(opt => (
            <button
              key={opt.label}
              onClick={() => setDark(opt.value)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                isDark === opt.value
                  ? 'bg-surface-50 border-primary shadow-sm ring-1 ring-primary/20 text-primary'
                  : 'bg-surface-100/60 border-surface-200 text-ink-muted hover:bg-surface-100'
              }`}>
              {opt.icon}
              <span className="font-medium text-[13px]">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color preset */}
      <div className="card p-5">
        <h2 className="font-semibold text-[13px] text-ink mb-1">Color Preset</h2>
        <p className="text-xs text-ink-faint mb-4">Changes the accent color and surface tones across the app.</p>
        <div className="grid grid-cols-2 gap-3">
          {THEME_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => setTheme(preset.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left ${
                theme === preset.id
                  ? 'bg-surface-50 border-primary shadow-sm ring-1 ring-primary/20'
                  : 'bg-surface-100/60 border-surface-200 hover:bg-surface-100'
              }`}>
              {/* Swatch */}
              <div className="flex gap-1 shrink-0">
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.accent }} />
                <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.surface }} />
              </div>
              <div className="min-w-0">
                <div className={`font-semibold text-[13px] ${theme === preset.id ? 'text-primary' : 'text-ink'}`}>
                  {preset.name}
                </div>
                <div className="text-[11px] text-ink-faint truncate">{preset.description}</div>
              </div>
              {theme === preset.id && (
                <div className="ml-auto w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--color-primary)' }} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

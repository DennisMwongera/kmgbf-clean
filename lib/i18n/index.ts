import en from './en'
import fr from './fr'
import pt from './pt'
import type { Translations } from './types'

export type LangCode = 'en' | 'fr' | 'pt' 

export const LANGUAGES: { code: LangCode; label: string; flag: string }[] = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'pt', label: 'Português',  flag: '🇵🇹' },
]

export const TRANSLATIONS: Record<LangCode, Translations> = { en, fr, pt }

export function getT(lang: LangCode): Translations {
  return TRANSLATIONS[lang] ?? en
}

export type { Translations }
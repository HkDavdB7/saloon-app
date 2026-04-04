import { useState } from 'react'
import { ar, en } from '@/lib/i18n'

type Lang = 'ar' | 'en'
type Translations = typeof ar

const translations = { ar, en }

export const useLanguage = () => {
  const [lang, setLang] = useState<Lang>('ar')

  const t = (path: string): string => {
    const keys = path.split('.')
    let result: any = translations[lang]
    for (const key of keys) {
      result = result?.[key]
    }
    return result ?? path
  }

  const isRTL = lang === 'ar'
  const dir = isRTL ? 'rtl' : 'ltr'

  return { lang, setLang, t, isRTL, dir }
}

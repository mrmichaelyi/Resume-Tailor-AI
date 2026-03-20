import { GeneratedResume } from './types'

export interface Application {
  id: string
  date: string
  company: string
  role: string
  resume: GeneratedResume | null
  jdText: string | null
}

const KEY = 'resume_builder_applications'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitize(a: any): Application {
  return {
    id: a?.id || Math.random().toString(36).slice(2),
    date: a?.date || new Date().toISOString(),
    company: a?.company || '—',
    role: a?.role || '—',
    resume: a?.resume || null,
    jdText: a?.jdText || null,
  }
}

export function loadApplications(): Application[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(sanitize)
  } catch {
    return []
  }
}

export function saveApplication(app: Omit<Application, 'id' | 'date'>): void {
  const apps = loadApplications()
  apps.unshift({
    ...app,
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    date: new Date().toISOString(),
  })
  localStorage.setItem(KEY, JSON.stringify(apps))
}

export function deleteApplication(id: string): void {
  const apps = loadApplications().filter(a => a.id !== id)
  localStorage.setItem(KEY, JSON.stringify(apps))
}

export function exportApplications(apps: Application[]): void {
  const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `applications-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importApplications(file: File): Promise<Application[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (!Array.isArray(parsed)) throw new Error('Invalid format')
        resolve(parsed.map(sanitize))
      } catch {
        reject(new Error('Invalid JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

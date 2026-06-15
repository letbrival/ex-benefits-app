import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  txSig?: string
}

interface ToastCtx {
  toast: (type: ToastType, title: string, message?: string, txSig?: string) => void
}

const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: ToastType, title: string, message?: string, txSig?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, type, title, message, txSig }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000)
  }, [])

  const remove = (id: string) => setToasts(t => t.filter(x => x.id !== id))

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border bg-white animate-in slide-in-from-right-4 ${
            t.type === 'success' ? 'border-green-200' : t.type === 'error' ? 'border-red-200' : 'border-blue-200'
          }`}>
            {t.type === 'success' && <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />}
            {t.type === 'error' && <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />}
            {t.type === 'info' && <AlertCircle size={18} className="text-blue-500 mt-0.5 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{t.title}</p>
              {t.message && <p className="text-xs text-gray-500 mt-0.5">{t.message}</p>}
              {t.txSig && (
                <a
                  href={`https://explorer.solana.com/tx/${t.txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-violet-600 hover:underline mt-1 block truncate"
                >
                  View on Explorer ↗
                </a>
              )}
            </div>
            <button onClick={() => remove(t.id)} className="shrink-0 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Enterprise } from '../types'

export function useEnterprise() {
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('ex_enterprise_id')
    if (saved) {
      supabase.from('enterprises').select('*').eq('id', saved).single().then(({ data }) => {
        setEnterprise(data ?? null)
        setLoading(false)
      })
    } else {
      supabase.from('enterprises').select('*').limit(1).single().then(({ data }) => {
        if (data) {
          localStorage.setItem('ex_enterprise_id', data.id)
          setEnterprise(data)
        }
        setLoading(false)
      })
    }
  }, [])

  const selectEnterprise = useCallback((e: Enterprise) => {
    localStorage.setItem('ex_enterprise_id', e.id)
    setEnterprise(e)
  }, [])

  const refresh = useCallback(async () => {
    if (!enterprise) return
    const { data } = await supabase.from('enterprises').select('*').eq('id', enterprise.id).single()
    if (data) setEnterprise(data)
  }, [enterprise])

  return { enterprise, loading, selectEnterprise, refresh }
}

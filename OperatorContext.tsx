import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface Operator {
  name: string
  role: string
  company: string
  crea: string
}

interface OperatorContextValue {
  operator: Operator | null
  loading: boolean
  saveOperator: (op: Operator) => void
  clearOperator: () => void
}

const OperatorContext = createContext<OperatorContextValue>({
  operator: null, loading: true,
  saveOperator: () => {}, clearOperator: () => {},
})

export function OperatorProvider({ children }: { children: React.ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem('@fertigeotech/operator')
    if (raw) { try { setOperator(JSON.parse(raw)) } catch {} }
    setLoading(false)
  }, [])

  const saveOperator = useCallback((op: Operator) => {
    localStorage.setItem('@fertigeotech/operator', JSON.stringify(op))
    setOperator(op)
  }, [])

  const clearOperator = useCallback(() => {
    localStorage.removeItem('@fertigeotech/operator')
    setOperator(null)
  }, [])

  return (
    <OperatorContext.Provider value={{ operator, loading, saveOperator, clearOperator }}>
      {children}
    </OperatorContext.Provider>
  )
}

export function useOperator() { return useContext(OperatorContext) }

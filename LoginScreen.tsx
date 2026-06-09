import React, { useState } from 'react'
import { useOperator } from '../context/OperatorContext'

const ROLES = ['Engenheiro Agrônomo', 'Técnico Agrícola', 'Operador Agrícola', 'Operador de Máquinas']

export default function LoginScreen() {
  const { saveOperator } = useOperator()
  const [name, setName]     = useState('')
  const [role, setRole]     = useState('')
  const [company, setCompany] = useState('')
  const [crea, setCrea]     = useState('')
  const [error, setError]   = useState('')

  const handleLogin = () => {
    if (!name.trim()) { setError('Informe seu nome'); return }
    if (!role) { setError('Selecione sua função'); return }
    saveOperator({ name: name.trim(), role, company: company.trim(), crea: crea.trim() })
  }

  return (
    <div className="flex flex-col min-h-screen bg-primary">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-4xl font-black text-white tracking-tight">FertigeoTech</div>
          <div className="text-accent text-sm font-semibold mt-1 tracking-widest uppercase">Qualidade de Calda</div>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
          <div className="text-primary font-bold text-lg mb-5">Identificação</div>

          {/* Nome */}
          <div className="mb-4">
            <label className="block text-xs font-700 text-gray-500 mb-1 uppercase tracking-wide">Nome *</label>
            <input
              className="field-input"
              placeholder="Seu nome completo"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Função */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Função *</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-2 rounded-full text-xs font-semibold border transition-all ${
                    role === r
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-secondary'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Empresa */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Empresa</label>
            <input
              className="field-input"
              placeholder="Nome da empresa (opcional)"
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </div>

          {/* CREA */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">CREA / CFTA</label>
            <input
              className="field-input"
              placeholder="Número do registro (opcional)"
              value={crea}
              onChange={e => setCrea(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm font-semibold rounded-lg px-3 py-2 mb-4">⚠️ {error}</div>
          )}

          <button className="btn-primary" onClick={handleLogin}>
            Entrar no FertigeoTech →
          </button>
        </div>
      </div>
    </div>
  )
}

import { createClient } from '@supabase/supabase-js'

function ValidarVariable(variables, nombreVariable) {
  const valor = variables[nombreVariable]

  if (typeof valor !== 'string' || valor === '') {
    throw new Error(`Falta la variable ${nombreVariable}`)
  }

  return valor
}

export function ObtenerConfiguracionSupabase(variables) {
  return {
    url: ValidarVariable(variables, 'VITE_SUPABASE_URL'),
    claveAnonima: ValidarVariable(variables, 'VITE_SUPABASE_ANON_KEY'),
  }
}

const { url, claveAnonima } = ObtenerConfiguracionSupabase(import.meta.env)

export const clienteSupabase = createClient(url, claveAnonima)

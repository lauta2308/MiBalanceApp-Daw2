import { createClient } from '@supabase/supabase-js'

const VARIABLES_REQUERIDAS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

export function CrearAlmacenamientoEnMemoria() {
  const datos = new Map()

  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => {
      datos.set(clave, valor)
    },
    removeItem: (clave) => {
      datos.delete(clave)
    },
  }
}

export function ObtenerVariablesFaltantesPruebas() {
  return VARIABLES_REQUERIDAS.filter((nombreVariable) => !import.meta.env[nombreVariable])
}

export function ObtenerConfiguracionPruebas() {
  if (ObtenerVariablesFaltantesPruebas().length > 0) {
    return null
  }

  return {
    url: import.meta.env.VITE_SUPABASE_URL,
    claveAnonima: import.meta.env.VITE_SUPABASE_ANON_KEY,
  }
}

export function CrearClientePrueba() {
  const { url, claveAnonima } = ObtenerConfiguracionPruebas()

  return createClient(url, claveAnonima, {
    auth: {
      storage: CrearAlmacenamientoEnMemoria(),
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export async function CrearUsuarioPrueba() {
  const cliente = CrearClientePrueba()
  const { data, error } = await cliente.auth.signInAnonymously({
    options: { data: { es_prueba: true } },
  })

  if (error) {
    throw new Error(`No se pudo crear el usuario de prueba: ${error.message}`)
  }

  return { cliente, usuario: data.user }
}

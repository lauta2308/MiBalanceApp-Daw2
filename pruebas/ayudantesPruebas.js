import { createClient } from '@supabase/supabase-js'

const VARIABLES_REQUERIDAS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

export const FECHA_MOVIMIENTO_PRUEBA = '2026-11-11'

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

function CompletarDosDigitos(numero) {
  return String(numero).padStart(2, '0')
}

// Solo para pruebas: "hoy UTC + N días" como AAAA-MM-DD. Es la excepción de AGENTS.md a la fecha local,
// porque lo que se busca es el día UTC con el que el servidor valida la fecha (RF-107).
export function ObtenerFechaUtcMasDias(dias) {
  const ahora = new Date()
  const fecha = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() + dias))

  return `${fecha.getUTCFullYear()}-${CompletarDosDigitos(fecha.getUTCMonth() + 1)}-${CompletarDosDigitos(fecha.getUTCDate())}`
}

// Única llamada a basp_agregar_movimiento de las pruebas: si cambia la firma, cambia solo acá.
export function AgregarMovimiento(cliente, { tipo, monto, fecha = FECHA_MOVIMIENTO_PRUEBA, idCategoria }) {
  return cliente.rpc('basp_agregar_movimiento', {
    p_tipo: tipo,
    p_monto: monto,
    p_fecha: fecha,
    p_id_categoria: idCategoria,
  })
}

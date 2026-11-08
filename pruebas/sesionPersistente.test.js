import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import {
  CrearAlmacenamientoEnMemoria,
  ObtenerConfiguracionPruebas,
  ObtenerVariablesFaltantesPruebas,
} from './ayudantesPruebas.js'

const TIEMPO_MAXIMO_RED_MS = 30000
const RUTA_CLIENTE_SUPABASE = '../src/servicios/clienteSupabase.js'

const configuracion = ObtenerConfiguracionPruebas()

if (!configuracion) {
  console.warn(
    `Pruebas de integración salteadas: falta .env.local (variables sin definir: ${ObtenerVariablesFaltantesPruebas().join(', ')}).`,
  )
}

// El alta pasa por el código real de la aplicación; solo se le agrega la marca es_prueba
// para que limpiar_usuarios_prueba.sql pueda borrar el usuario.
function CrearClienteConAlmacenamiento(almacenamiento) {
  const cliente = createClient(configuracion.url, configuracion.claveAnonima, {
    auth: {
      storage: almacenamiento,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const IniciarAnonimoOriginal = cliente.auth.signInAnonymously.bind(cliente.auth)
  const IniciarAnonimoEspia = vi
    .spyOn(cliente.auth, 'signInAnonymously')
    .mockImplementation(() => IniciarAnonimoOriginal({ options: { data: { es_prueba: true } } }))

  return { cliente, IniciarAnonimoEspia }
}

// Cada apertura carga de nuevo los módulos de la sesión, como un navegador que se volvió a abrir.
async function AbrirAplicacion(almacenamiento) {
  const { cliente, IniciarAnonimoEspia } = CrearClienteConAlmacenamiento(almacenamiento)

  vi.resetModules()
  vi.doMock(RUTA_CLIENTE_SUPABASE, () => ({ clienteSupabase: cliente }))
  const { AsegurarSesion } = await import('../src/autenticacion/sesion.js')

  return { cliente, IniciarAnonimoEspia, AsegurarSesion }
}

async function LeerCuentas(cliente) {
  const { data, error } = await cliente.from('bat_cuentas').select('id, nombre, moneda, saldo::text')
  expect(error).toBeNull()
  return data
}

async function LeerCategorias(cliente) {
  const { data, error } = await cliente
    .from('bat_categorias')
    .select('id, nombre, tipo, es_defecto')
    .order('nombre')
  expect(error).toBeNull()
  return data
}

describe.skipIf(!configuracion)('Sesión persistente contra Supabase real', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock(RUTA_CLIENTE_SUPABASE)
  })

  it(
    'AC-03: al volver a abrir con el mismo almacenamiento sigue el mismo usuario, con la misma cuenta y sin categorías duplicadas',
    async () => {
      const almacenamiento = CrearAlmacenamientoEnMemoria()

      const primeraApertura = await AbrirAplicacion(almacenamiento)
      const sesionInicial = await primeraApertura.AsegurarSesion()

      expect(sesionInicial?.user?.id).toEqual(expect.any(String))
      expect(primeraApertura.IniciarAnonimoEspia).toHaveBeenCalledTimes(1)

      const cuentasIniciales = await LeerCuentas(primeraApertura.cliente)
      const categoriasIniciales = await LeerCategorias(primeraApertura.cliente)
      expect(cuentasIniciales).toHaveLength(1)
      expect(categoriasIniciales).toHaveLength(2)

      const segundaApertura = await AbrirAplicacion(almacenamiento)
      const sesionRecuperada = await segundaApertura.AsegurarSesion()
      const { data, error } = await segundaApertura.cliente.auth.getSession()

      expect(error).toBeNull()
      expect(data.session.user.id).toBe(sesionInicial.user.id)
      expect(sesionRecuperada.user.id).toBe(sesionInicial.user.id)
      expect(segundaApertura.IniciarAnonimoEspia).not.toHaveBeenCalled()
      expect(await LeerCuentas(segundaApertura.cliente)).toEqual(cuentasIniciales)
      expect(await LeerCategorias(segundaApertura.cliente)).toEqual(categoriasIniciales)
    },
    TIEMPO_MAXIMO_RED_MS,
  )
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const urlPrueba = 'https://proyecto-prueba.supabase.co'
const claveAnonimaPrueba = 'clave-anonima-prueba'

vi.mock('@supabase/supabase-js', async (importarOriginal) => {
  const moduloOriginal = await importarOriginal()
  return { ...moduloOriginal, createClient: vi.fn(moduloOriginal.createClient) }
})

function EstablecerVariablesEntorno(url, claveAnonima) {
  vi.stubEnv('VITE_SUPABASE_URL', url)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', claveAnonima)
}

// El módulo valida la configuración al importarse, por eso cada prueba lo importa
// de nuevo después de fijar las variables de entorno.
function ImportarClienteSupabase() {
  return import('./clienteSupabase.js')
}

beforeEach(() => {
  vi.resetModules()
  vi.mocked(createClient).mockClear()
  EstablecerVariablesEntorno(urlPrueba, claveAnonimaPrueba)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('ObtenerConfiguracionSupabase', () => {
  it('lanza el error que nombra VITE_SUPABASE_URL si no hay variables', async () => {
    const { ObtenerConfiguracionSupabase } = await ImportarClienteSupabase()

    expect(() => ObtenerConfiguracionSupabase({})).toThrow(
      'Falta la variable VITE_SUPABASE_URL',
    )
  })

  it('lanza el error que nombra VITE_SUPABASE_ANON_KEY si solo falta la clave', async () => {
    const { ObtenerConfiguracionSupabase } = await ImportarClienteSupabase()

    expect(() =>
      ObtenerConfiguracionSupabase({ VITE_SUPABASE_URL: urlPrueba }),
    ).toThrow('Falta la variable VITE_SUPABASE_ANON_KEY')
  })

  it('rechaza una variable vacía', async () => {
    const { ObtenerConfiguracionSupabase } = await ImportarClienteSupabase()

    expect(() =>
      ObtenerConfiguracionSupabase({
        VITE_SUPABASE_URL: '',
        VITE_SUPABASE_ANON_KEY: claveAnonimaPrueba,
      }),
    ).toThrow('Falta la variable VITE_SUPABASE_URL')
  })

  it('devuelve la url y la clave anónima si ambas están presentes', async () => {
    const { ObtenerConfiguracionSupabase } = await ImportarClienteSupabase()

    expect(
      ObtenerConfiguracionSupabase({
        VITE_SUPABASE_URL: urlPrueba,
        VITE_SUPABASE_ANON_KEY: claveAnonimaPrueba,
      }),
    ).toEqual({ url: urlPrueba, claveAnonima: claveAnonimaPrueba })
  })
})

describe('clienteSupabase', () => {
  it('se crea con las variables VITE_*', async () => {
    const { clienteSupabase } = await ImportarClienteSupabase()

    expect(createClient).toHaveBeenCalledExactlyOnceWith(urlPrueba, claveAnonimaPrueba)
    expect(clienteSupabase.auth).toBeDefined()
  })

  it('no se crea si falta una variable de entorno', async () => {
    EstablecerVariablesEntorno('', claveAnonimaPrueba)

    await expect(ImportarClienteSupabase()).rejects.toThrow(
      'Falta la variable VITE_SUPABASE_URL',
    )
    expect(createClient).not.toHaveBeenCalled()
  })
})

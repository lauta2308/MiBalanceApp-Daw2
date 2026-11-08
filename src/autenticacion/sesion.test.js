import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SESION_EXISTENTE = { access_token: 'token-existente', user: { id: 'usuario-existente' } }
const SESION_NUEVA = { access_token: 'token-nuevo', user: { id: 'usuario-nuevo' } }

// sesion.js guarda la promesa a nivel de módulo: cada prueba importa una copia nueva.
function ImportarSesion() {
  return import('./sesion.js')
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.doUnmock('./sesionProvisoria.js')
  vi.doUnmock('../servicios/clienteSupabase.js')
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('AsegurarSesion', () => {
  const ObtenerSesionActualSimulado = vi.fn()
  const IniciarSesionProvisoriaSimulado = vi.fn()

  beforeEach(() => {
    ObtenerSesionActualSimulado.mockReset()
    IniciarSesionProvisoriaSimulado.mockReset()

    vi.doMock('../servicios/clienteSupabase.js', () => ({ clienteSupabase: {} }))
    vi.doMock('./sesionProvisoria.js', async (importarOriginal) => ({
      ...(await importarOriginal()),
      ObtenerSesionActual: ObtenerSesionActualSimulado,
      IniciarSesionProvisoria: IniciarSesionProvisoriaSimulado,
    }))
  })

  it('AC-03: con sesión existente la devuelve y no inicia otra', async () => {
    ObtenerSesionActualSimulado.mockResolvedValue(SESION_EXISTENTE)
    const { AsegurarSesion } = await ImportarSesion()

    await expect(AsegurarSesion()).resolves.toBe(SESION_EXISTENTE)

    expect(ObtenerSesionActualSimulado).toHaveBeenCalledTimes(1)
    expect(IniciarSesionProvisoriaSimulado).not.toHaveBeenCalled()
  })

  it('sin sesión inicia una y la devuelve', async () => {
    ObtenerSesionActualSimulado.mockResolvedValue(null)
    IniciarSesionProvisoriaSimulado.mockResolvedValue(SESION_NUEVA)
    const { AsegurarSesion } = await ImportarSesion()

    await expect(AsegurarSesion()).resolves.toBe(SESION_NUEVA)

    expect(IniciarSesionProvisoriaSimulado).toHaveBeenCalledTimes(1)
  })

  it('dos llamadas simultáneas sin sesión inician una sola y comparten el resultado', async () => {
    ObtenerSesionActualSimulado.mockResolvedValue(null)
    IniciarSesionProvisoriaSimulado.mockResolvedValue(SESION_NUEVA)
    const { AsegurarSesion } = await ImportarSesion()

    const [primera, segunda] = await Promise.all([AsegurarSesion(), AsegurarSesion()])

    expect(IniciarSesionProvisoriaSimulado).toHaveBeenCalledTimes(1)
    expect(primera).toBe(SESION_NUEVA)
    expect(segunda).toBe(SESION_NUEVA)
  })

  it('si el inicio falla descarta la promesa y la llamada siguiente reintenta', async () => {
    ObtenerSesionActualSimulado.mockResolvedValue(null)
    IniciarSesionProvisoriaSimulado.mockRejectedValueOnce(new Error('fallo de red'))
    IniciarSesionProvisoriaSimulado.mockResolvedValueOnce(SESION_NUEVA)
    const { AsegurarSesion } = await ImportarSesion()

    await expect(AsegurarSesion()).rejects.toThrow('fallo de red')
    await expect(AsegurarSesion()).resolves.toBe(SESION_NUEVA)

    expect(IniciarSesionProvisoriaSimulado).toHaveBeenCalledTimes(2)
  })

  it('después de resolver, una segunda llamada vuelve a consultar la sesión y no crea otro usuario', async () => {
    ObtenerSesionActualSimulado.mockResolvedValueOnce(null)
    ObtenerSesionActualSimulado.mockResolvedValueOnce(SESION_NUEVA)
    IniciarSesionProvisoriaSimulado.mockResolvedValue(SESION_NUEVA)
    const { AsegurarSesion } = await ImportarSesion()

    await expect(AsegurarSesion()).resolves.toBe(SESION_NUEVA)
    await expect(AsegurarSesion()).resolves.toBe(SESION_NUEVA)

    expect(ObtenerSesionActualSimulado).toHaveBeenCalledTimes(2)
    expect(IniciarSesionProvisoriaSimulado).toHaveBeenCalledTimes(1)
  })

  it('no inicia una sesión si falló la lectura de la sesión actual', async () => {
    ObtenerSesionActualSimulado.mockRejectedValue(new Error('fallo de lectura'))
    const { AsegurarSesion } = await ImportarSesion()

    await expect(AsegurarSesion()).rejects.toThrow('fallo de lectura')

    expect(IniciarSesionProvisoriaSimulado).not.toHaveBeenCalled()
  })

  it('expone el mensaje de error fijo', async () => {
    const { MENSAJE_ERROR_SESION } = await ImportarSesion()

    expect(MENSAJE_ERROR_SESION).toBe('No se pudo iniciar la sesión. Vuelva a intentarlo.')
  })
})

describe('Sesión provisoria con el cliente real de Supabase', () => {
  function CrearRespuestaJson(cuerpo, estado) {
    return new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://proyecto-prueba.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'clave-anonima-prueba')
  })

  it('crea un solo usuario anónimo y devuelve su sesión', async () => {
    const fetchSimulado = vi.fn(async () =>
      CrearRespuestaJson(
        {
          access_token: 'token-real',
          refresh_token: 'renovacion-real',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: { id: 'usuario-real', aud: 'authenticated', is_anonymous: true },
        },
        200,
      ),
    )
    vi.stubGlobal('fetch', fetchSimulado)
    const { AsegurarSesion } = await ImportarSesion()

    const sesion = await AsegurarSesion()

    expect(sesion.access_token).toBe('token-real')
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
    expect(String(fetchSimulado.mock.calls[0][0])).toContain('/auth/v1/signup')
  })

  it('rechaza con el error que devuelve el servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        CrearRespuestaJson({ code: 422, msg: 'Anonymous sign-ins are disabled' }, 422),
      ),
    )
    const { AsegurarSesion } = await ImportarSesion()

    await expect(AsegurarSesion()).rejects.toThrow('Anonymous sign-ins are disabled')
  })

  it('rechaza si la respuesta del alta no trae sesión ni error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        CrearRespuestaJson({ id: 'usuario-sin-sesion', aud: 'authenticated', is_anonymous: true }, 200),
      ),
    )
    const { AsegurarSesion } = await ImportarSesion()

    await expect(AsegurarSesion()).rejects.toThrow('La respuesta no trae una sesión')
  })

  it('rechaza si la lectura de la sesión devuelve un error', async () => {
    vi.doMock('../servicios/clienteSupabase.js', () => ({
      clienteSupabase: {
        auth: {
          getSession: vi.fn(async () => ({
            data: { session: null },
            error: new Error('sesión ilegible'),
          })),
        },
      },
    }))
    const { ObtenerSesionActual } = await import('./sesionProvisoria.js')

    await expect(ObtenerSesionActual()).rejects.toThrow('sesión ilegible')
  })
})

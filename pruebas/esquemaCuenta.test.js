import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  CrearUsuarioPrueba,
  ObtenerConfiguracionPruebas,
  ObtenerVariablesFaltantesPruebas,
} from './ayudantesPruebas.js'

const NOMBRE_SUITE_SUPABASE = 'Esquema de cuenta contra Supabase real'
const CODIGO_SIN_PRIVILEGIOS = '42501'
const TIEMPO_MAXIMO_RED_MS = 30000

const configuracion = ObtenerConfiguracionPruebas()

if (!configuracion) {
  console.warn(
    `Pruebas de integración salteadas: falta .env.local (variables sin definir: ${ObtenerVariablesFaltantesPruebas().join(', ')}).`,
  )
}

describe('Configuración de las pruebas de integración', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it.each([
    { descripcion: 'las dos variables', url: '', clave: '', faltantes: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] },
    { descripcion: 'la URL', url: '', clave: 'clave-publica', faltantes: ['VITE_SUPABASE_URL'] },
    { descripcion: 'la clave', url: 'https://ejemplo.supabase.co', clave: '', faltantes: ['VITE_SUPABASE_ANON_KEY'] },
  ])('devuelve null e informa qué falta sin $descripcion', ({ url, clave, faltantes }) => {
    vi.stubEnv('VITE_SUPABASE_URL', url)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', clave)

    expect(ObtenerConfiguracionPruebas()).toBeNull()
    expect(ObtenerVariablesFaltantesPruebas()).toEqual(faltantes)
  })

  it('devuelve la URL y la clave cuando están las dos variables', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://ejemplo.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'clave-publica')

    expect(ObtenerConfiguracionPruebas()).toEqual({
      url: 'https://ejemplo.supabase.co',
      claveAnonima: 'clave-publica',
    })
    expect(ObtenerVariablesFaltantesPruebas()).toEqual([])
  })

  it('deja marcadas como salteadas las pruebas contra Supabase si falta la configuración', ({ task }) => {
    const entornoCompleto = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
    const suiteSupabase = task.file.tasks.find((tarea) => tarea.name === NOMBRE_SUITE_SUPABASE)

    expect(suiteSupabase).toBeDefined()
    expect(suiteSupabase.mode).toBe(entornoCompleto ? 'run' : 'skip')
  })

  it('crea cada usuario con es_prueba y con un almacenamiento de sesión propio', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://ejemplo.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'clave-publica')

    let cantidadAltas = 0
    const fetchSimulado = vi.fn(async () => {
      cantidadAltas += 1
      return new Response(
        JSON.stringify({
          access_token: `token-${cantidadAltas}`,
          refresh_token: `renovacion-${cantidadAltas}`,
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: { id: `usuario-${cantidadAltas}`, aud: 'authenticated', is_anonymous: true },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    vi.stubGlobal('fetch', fetchSimulado)

    const primero = await CrearUsuarioPrueba()
    const segundo = await CrearUsuarioPrueba()

    expect(fetchSimulado).toHaveBeenCalledTimes(2)
    for (const [direccion, opciones] of fetchSimulado.mock.calls) {
      expect(String(direccion)).toContain('/auth/v1/signup')
      expect(JSON.parse(opciones.body).data).toEqual({ es_prueba: true })
    }

    expect(primero.usuario.id).toBe('usuario-1')
    expect(segundo.usuario.id).toBe('usuario-2')

    const sesionPrimero = await primero.cliente.auth.getSession()
    const sesionSegundo = await segundo.cliente.auth.getSession()
    expect(sesionPrimero.data.session.access_token).toBe('token-1')
    expect(sesionSegundo.data.session.access_token).toBe('token-2')
  })
})

describe.skipIf(!configuracion)(NOMBRE_SUITE_SUPABASE, () => {
  let usuarioA
  let usuarioB
  let cuentaA
  let cuentaB
  let categoriasA
  let categoriasB

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

  beforeAll(async () => {
    usuarioA = await CrearUsuarioPrueba()
    usuarioB = await CrearUsuarioPrueba()

    const cuentasA = await LeerCuentas(usuarioA.cliente)
    const cuentasB = await LeerCuentas(usuarioB.cliente)
    expect(cuentasA).toHaveLength(1)
    expect(cuentasB).toHaveLength(1)
    cuentaA = cuentasA[0]
    cuentaB = cuentasB[0]

    categoriasA = await LeerCategorias(usuarioA.cliente)
    categoriasB = await LeerCategorias(usuarioB.cliente)
  }, TIEMPO_MAXIMO_RED_MS)

  it('AC-01: un usuario nuevo tiene una cuenta "Mi Cuenta", en USD y con saldo "0" leído como texto', () => {
    expect(cuentaA).toMatchObject({ nombre: 'Mi Cuenta', moneda: 'USD', saldo: '0' })
  })

  it('AC-02: un usuario nuevo tiene exactamente sus dos categorías por defecto', () => {
    expect(categoriasA.map(({ nombre, tipo, es_defecto }) => ({ nombre, tipo, es_defecto }))).toEqual([
      { nombre: 'Pago Ingresado', tipo: 'INGRESO', es_defecto: true },
      { nombre: 'Pago Realizado', tipo: 'GASTO', es_defecto: true },
    ])
  })

  it('AC-27: A recibe 0 filas al consultar por sus ids la cuenta, las categorías y los movimientos de B', async () => {
    const clienteA = usuarioA.cliente
    const idsCategoriasB = categoriasB.map(({ id }) => id)

    expect(idsCategoriasB).toHaveLength(2)

    const consultaCuenta = await clienteA.from('bat_cuentas').select('id').eq('id', cuentaB.id)
    const consultaCategorias = await clienteA.from('bat_categorias').select('id').in('id', idsCategoriasB)
    const consultaMovimientos = await clienteA.from('bat_movimientos').select('id').eq('id_cuenta', cuentaB.id)

    for (const consulta of [consultaCuenta, consultaCategorias, consultaMovimientos]) {
      expect(consulta.error).toBeNull()
      expect(consulta.data).toEqual([])
    }
  })

  it('rechaza las escrituras directas de A y los datos no cambian', async () => {
    const clienteA = usuarioA.cliente
    const categoriaIngresado = categoriasA.find(({ nombre }) => nombre === 'Pago Ingresado')

    const alta = await clienteA.from('bat_cuentas').insert({
      id_usuario: usuarioA.usuario.id,
      nombre: 'Cuenta Intrusa',
      moneda: 'USD',
      saldo: 1000,
    })
    const modificacion = await clienteA.from('bat_cuentas').update({ saldo: 1000 }).eq('id', cuentaA.id)
    const borrado = await clienteA.from('bat_categorias').delete().eq('id', categoriaIngresado.id)

    expect(alta.error?.code).toBe(CODIGO_SIN_PRIVILEGIOS)
    expect(modificacion.error?.code).toBe(CODIGO_SIN_PRIVILEGIOS)
    expect(borrado.error?.code).toBe(CODIGO_SIN_PRIVILEGIOS)

    expect(await LeerCuentas(clienteA)).toEqual([cuentaA])
    expect(await LeerCategorias(clienteA)).toEqual(categoriasA)
  })
})

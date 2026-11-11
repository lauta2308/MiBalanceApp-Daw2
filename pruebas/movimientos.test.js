import { beforeAll, describe, expect, it } from 'vitest'
import {
  AgregarMovimiento,
  CrearClientePrueba,
  CrearUsuarioPrueba,
  FECHA_MOVIMIENTO_PRUEBA,
  ObtenerConfiguracionPruebas,
  ObtenerVariablesFaltantesPruebas,
} from './ayudantesPruebas.js'

const CODIGO_SIN_PRIVILEGIOS = '42501'
const CODIGO_DATOS_INVALIDOS = '22023'
const MENSAJE_NO_PERMITIDO = 'Operación no permitida.'
const MENSAJE_DATOS_INVALIDOS = 'Datos del movimiento inválidos.'
const TIEMPO_MAXIMO_RED_MS = 30000

const configuracion = ObtenerConfiguracionPruebas()

if (!configuracion) {
  console.warn(
    `Pruebas de integración salteadas: falta .env.local (variables sin definir: ${ObtenerVariablesFaltantesPruebas().join(', ')}).`,
  )
}

describe.skipIf(!configuracion)('Alta de movimientos contra Supabase real', () => {
  let usuarioA
  let usuarioB
  let cuentaB
  let categoriasA
  let categoriasB

  async function LeerCuenta(cliente) {
    const { data, error } = await cliente.from('bat_cuentas').select('id, saldo::text')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    return data[0]
  }

  async function LeerSaldo(cliente) {
    const cuenta = await LeerCuenta(cliente)
    return cuenta.saldo
  }

  async function LeerCategorias(cliente) {
    const { data, error } = await cliente.from('bat_categorias').select('id, nombre, tipo, es_defecto')
    expect(error).toBeNull()
    return data
  }

  async function LeerMovimientos(cliente) {
    const { data, error } = await cliente.from('bat_movimientos').select('id')
    expect(error).toBeNull()
    return data
  }

  function BuscarCategoria(categorias, nombre) {
    const categoria = categorias.find((categoriaActual) => categoriaActual.nombre === nombre)
    expect(categoria).toBeDefined()
    return categoria
  }

  beforeAll(async () => {
    usuarioA = await CrearUsuarioPrueba()
    usuarioB = await CrearUsuarioPrueba()

    cuentaB = await LeerCuenta(usuarioB.cliente)
    categoriasA = await LeerCategorias(usuarioA.cliente)
    categoriasB = await LeerCategorias(usuarioB.cliente)
  }, TIEMPO_MAXIMO_RED_MS)

  it('test_alta_ingreso_sube_saldo: A con saldo 0 registra 500 con "Pago Ingresado" y su saldo pasa a "500"', async () => {
    const clienteA = usuarioA.cliente
    const pagoIngresado = BuscarCategoria(categoriasA, 'Pago Ingresado')

    expect(await LeerSaldo(clienteA)).toBe('0')

    const { data: idMovimiento, error } = await AgregarMovimiento(clienteA, {
      tipo: 'INGRESO',
      monto: '500',
      idCategoria: pagoIngresado.id,
    })

    expect(error).toBeNull()
    expect(typeof idMovimiento).toBe('string')

    const consulta = await clienteA
      .from('bat_movimientos')
      .select('id, id_categoria, tipo, monto::text, fecha')
      .eq('id', idMovimiento)

    expect(consulta.error).toBeNull()
    expect(consulta.data).toEqual([
      {
        id: idMovimiento,
        id_categoria: pagoIngresado.id,
        tipo: 'INGRESO',
        monto: '500.00',
        fecha: FECHA_MOVIMIENTO_PRUEBA,
      },
    ])
    expect(await LeerSaldo(clienteA)).toBe('500')
  })

  it('test_categoria_ajena_rechazada: A no puede registrar un ingreso con la categoría "Pago Ingresado" de B', async () => {
    const saldoAAntes = await LeerSaldo(usuarioA.cliente)
    const saldoBAntes = await LeerSaldo(usuarioB.cliente)
    const movimientosBAntes = await LeerMovimientos(usuarioB.cliente)
    const pagoIngresadoB = BuscarCategoria(categoriasB, 'Pago Ingresado')

    const { data, error } = await AgregarMovimiento(usuarioA.cliente, {
      tipo: 'INGRESO',
      monto: '1000',
      idCategoria: pagoIngresadoB.id,
    })

    expect(data).toBeNull()
    expect(error?.code).toBe(CODIGO_SIN_PRIVILEGIOS)
    expect(error?.message).toBe(MENSAJE_NO_PERMITIDO)
    expect(await LeerSaldo(usuarioA.cliente)).toBe(saldoAAntes)
    expect(await LeerSaldo(usuarioB.cliente)).toBe(saldoBAntes)
    expect(await LeerMovimientos(usuarioB.cliente)).toEqual(movimientosBAntes)
  })

  it('test_cuenta_ajena_rechazada: A no puede insertar directamente un movimiento en la cuenta de B', async () => {
    const saldoBAntes = await LeerSaldo(usuarioB.cliente)
    const movimientosBAntes = await LeerMovimientos(usuarioB.cliente)
    const pagoIngresadoB = BuscarCategoria(categoriasB, 'Pago Ingresado')

    const alta = await usuarioA.cliente.from('bat_movimientos').insert({
      id_cuenta: cuentaB.id,
      id_categoria: pagoIngresadoB.id,
      tipo: 'INGRESO',
      monto: '1000',
      fecha: FECHA_MOVIMIENTO_PRUEBA,
    })

    expect(alta.error?.code).toBe(CODIGO_SIN_PRIVILEGIOS)
    expect(await LeerSaldo(usuarioB.cliente)).toBe(saldoBAntes)
    expect(await LeerMovimientos(usuarioB.cliente)).toEqual(movimientosBAntes)
  })

  it('test_categoria_de_otro_tipo_rechazada: A no puede registrar un ingreso con su categoría "Pago Realizado"', async () => {
    const saldoAntes = await LeerSaldo(usuarioA.cliente)
    const movimientosAntes = await LeerMovimientos(usuarioA.cliente)
    const pagoRealizado = BuscarCategoria(categoriasA, 'Pago Realizado')

    const { data, error } = await AgregarMovimiento(usuarioA.cliente, {
      tipo: 'INGRESO',
      monto: '1000',
      idCategoria: pagoRealizado.id,
    })

    expect(data).toBeNull()
    expect(error?.code).toBe(CODIGO_SIN_PRIVILEGIOS)
    expect(error?.message).toBe(MENSAJE_NO_PERMITIDO)
    expect(await LeerSaldo(usuarioA.cliente)).toBe(saldoAntes)
    expect(await LeerMovimientos(usuarioA.cliente)).toEqual(movimientosAntes)
  })

  it('test_monto_invalido_rechazado_api: la función rechaza los montos "0", "-5" y "1.234"', async () => {
    const saldoAntes = await LeerSaldo(usuarioA.cliente)
    const movimientosAntes = await LeerMovimientos(usuarioA.cliente)
    const pagoIngresado = BuscarCategoria(categoriasA, 'Pago Ingresado')

    for (const monto of ['0', '-5', '1.234']) {
      const { data, error } = await AgregarMovimiento(usuarioA.cliente, {
        tipo: 'INGRESO',
        monto,
        idCategoria: pagoIngresado.id,
      })

      expect(data, `monto ${monto}`).toBeNull()
      expect(error?.code, `monto ${monto}`).toBe(CODIGO_DATOS_INVALIDOS)
      expect(error?.message, `monto ${monto}`).toBe(MENSAJE_DATOS_INVALIDOS)
    }

    expect(await LeerSaldo(usuarioA.cliente)).toBe(saldoAntes)
    expect(await LeerMovimientos(usuarioA.cliente)).toEqual(movimientosAntes)
  })

  it('test_tipo_gasto_rechazado_api: la función rechaza un movimiento de tipo GASTO', async () => {
    const saldoAntes = await LeerSaldo(usuarioA.cliente)
    const movimientosAntes = await LeerMovimientos(usuarioA.cliente)
    const pagoRealizado = BuscarCategoria(categoriasA, 'Pago Realizado')

    const { data, error } = await AgregarMovimiento(usuarioA.cliente, {
      tipo: 'GASTO',
      monto: '100',
      idCategoria: pagoRealizado.id,
    })

    expect(data).toBeNull()
    expect(error?.code).toBe(CODIGO_DATOS_INVALIDOS)
    expect(error?.message).toBe(MENSAJE_DATOS_INVALIDOS)
    expect(await LeerSaldo(usuarioA.cliente)).toBe(saldoAntes)
    expect(await LeerMovimientos(usuarioA.cliente)).toEqual(movimientosAntes)
  })

  it('test_sin_sesion_rechazado_api: un cliente sin sesión no puede llamar a la función', async () => {
    const clienteSinSesion = CrearClientePrueba()
    const pagoIngresado = BuscarCategoria(categoriasA, 'Pago Ingresado')
    const saldoAntes = await LeerSaldo(usuarioA.cliente)

    const { data, error } = await AgregarMovimiento(clienteSinSesion, {
      tipo: 'INGRESO',
      monto: '100',
      idCategoria: pagoIngresado.id,
    })

    expect(data).toBeNull()
    expect(error?.code).toBe(CODIGO_SIN_PRIVILEGIOS)
    expect(await LeerSaldo(usuarioA.cliente)).toBe(saldoAntes)
  })
})

// Suite aparte con su propio usuario: correrla sola (-t) crea un único usuario anónimo.
describe.skipIf(!configuracion)('Alta de movimientos con fecha elegida contra Supabase real', () => {
  it('test_alta_fecha_antigua_api: un ingreso de 100 con fecha "1990-03-15" se guarda con esa fecha y el saldo sube en 100', async () => {
    const { cliente } = await CrearUsuarioPrueba()

    const consultaCategorias = await cliente
      .from('bat_categorias')
      .select('id')
      .eq('tipo', 'INGRESO')
      .eq('es_defecto', true)
    expect(consultaCategorias.error).toBeNull()
    expect(consultaCategorias.data).toHaveLength(1)
    const idPagoIngresado = consultaCategorias.data[0].id

    const cuentaAntes = await cliente.from('bat_cuentas').select('saldo::text')
    expect(cuentaAntes.error).toBeNull()
    expect(cuentaAntes.data).toEqual([{ saldo: '0' }])

    const { data: idMovimiento, error } = await AgregarMovimiento(cliente, {
      tipo: 'INGRESO',
      monto: '100',
      fecha: '1990-03-15',
      idCategoria: idPagoIngresado,
    })

    expect(error).toBeNull()
    expect(typeof idMovimiento).toBe('string')

    const consultaMovimiento = await cliente
      .from('bat_movimientos')
      .select('monto::text, fecha')
      .eq('id', idMovimiento)

    expect(consultaMovimiento.error).toBeNull()
    expect(consultaMovimiento.data).toEqual([{ monto: '100.00', fecha: '1990-03-15' }])

    const cuentaDespues = await cliente.from('bat_cuentas').select('saldo::text')
    expect(cuentaDespues.error).toBeNull()
    expect(cuentaDespues.data).toEqual([{ saldo: '100' }])
  }, TIEMPO_MAXIMO_RED_MS)
})

import { beforeAll, describe, expect, it } from 'vitest'
import {
  AgregarMovimiento,
  CrearClientePrueba,
  CrearUsuarioPrueba,
  FECHA_MOVIMIENTO_PRUEBA,
  ObtenerConfiguracionPruebas,
  ObtenerFechaUtcMasDias,
  ObtenerVariablesFaltantesPruebas,
} from './ayudantesPruebas.js'

const CODIGO_SIN_PRIVILEGIOS = '42501'
const CODIGO_DATOS_INVALIDOS = '22023'
const MENSAJE_NO_PERMITIDO = 'Operación no permitida.'
const MENSAJE_DATOS_INVALIDOS = 'Datos del movimiento inválidos.'
const TIEMPO_MAXIMO_RED_MS = 30000
const MONTO_MAXIMO = '999999999999.99'
const MONTO_SOBRE_MAXIMO = '1000000000000.00'

// Llama con "hoy UTC + dias". Si la corrida cruzó las 00:00 UTC durante la llamada, la repite una vez
// con la fecha recalculada, para que el resultado corresponda al día UTC que ve el servidor.
// La primera llamada pudo haber quedado registrada (D+2 evaluado ya en el día siguiente es D+1):
// antesDeReintentar permite volver a leer el estado de referencia antes de la segunda llamada.
async function EjecutarConFechaUtc(dias, llamada, antesDeReintentar = async () => {}) {
  const diaUtcAntes = ObtenerFechaUtcMasDias(0)
  const fecha = ObtenerFechaUtcMasDias(dias)
  const resultado = await llamada(fecha)

  if (ObtenerFechaUtcMasDias(0) === diaUtcAntes) {
    return { fecha, resultado, diaCambio: false }
  }

  await antesDeReintentar()
  const fechaRecalculada = ObtenerFechaUtcMasDias(dias)
  return { fecha: fechaRecalculada, resultado: await llamada(fechaRecalculada), diaCambio: true }
}

// Usuario nuevo con saldo 0 y el id de su "Pago Ingresado".
async function CrearUsuarioConPagoIngresado() {
  const { cliente } = await CrearUsuarioPrueba()

  const consultaCategorias = await cliente
    .from('bat_categorias')
    .select('id')
    .eq('tipo', 'INGRESO')
    .eq('es_defecto', true)
  expect(consultaCategorias.error).toBeNull()
  expect(consultaCategorias.data).toHaveLength(1)

  return { cliente, idPagoIngresado: consultaCategorias.data[0].id }
}

async function LeerSaldoTexto(cliente) {
  const { data, error } = await cliente.from('bat_cuentas').select('saldo::text')
  expect(error).toBeNull()
  expect(data).toHaveLength(1)
  return data[0].saldo
}

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

  it('test_monto_maximo_superado_rechazado_api: la función rechaza el monto inválido "1000000000000.00" con 22023 sin dejar movimiento', async () => {
    const saldoAntes = await LeerSaldo(usuarioA.cliente)
    const movimientosAntes = await LeerMovimientos(usuarioA.cliente)
    const pagoIngresado = BuscarCategoria(categoriasA, 'Pago Ingresado')

    const { data, error } = await AgregarMovimiento(usuarioA.cliente, {
      tipo: 'INGRESO',
      monto: MONTO_SOBRE_MAXIMO,
      idCategoria: pagoIngresado.id,
    })

    expect(data).toBeNull()
    expect(error?.code).toBe(CODIGO_DATOS_INVALIDOS)
    expect(error?.message).toBe(MENSAJE_DATOS_INVALIDOS)
    expect(await LeerSaldo(usuarioA.cliente)).toBe(saldoAntes)
    expect(await LeerMovimientos(usuarioA.cliente)).toEqual(movimientosAntes)
  })

  it('test_monto_tres_decimales_rechazado_api: la función rechaza el monto inválido "10.555" con 22023', async () => {
    const saldoAntes = await LeerSaldo(usuarioA.cliente)
    const movimientosAntes = await LeerMovimientos(usuarioA.cliente)
    const pagoIngresado = BuscarCategoria(categoriasA, 'Pago Ingresado')

    const { data, error } = await AgregarMovimiento(usuarioA.cliente, {
      tipo: 'INGRESO',
      monto: '10.555',
      idCategoria: pagoIngresado.id,
    })

    expect(data).toBeNull()
    expect(error?.code).toBe(CODIGO_DATOS_INVALIDOS)
    expect(error?.message).toBe(MENSAJE_DATOS_INVALIDOS)
    expect(await LeerSaldo(usuarioA.cliente)).toBe(saldoAntes)
    expect(await LeerMovimientos(usuarioA.cliente)).toEqual(movimientosAntes)
  })

  it('test_fecha_pasado_manana_utc_rechazada_api: la función rechaza con 22023 una fecha de hoy UTC + 2 días', async () => {
    let saldoAntes = await LeerSaldo(usuarioA.cliente)
    let movimientosAntes = await LeerMovimientos(usuarioA.cliente)
    const pagoIngresado = BuscarCategoria(categoriasA, 'Pago Ingresado')

    // Si el día UTC cambió, la primera llamada pudo registrarse: se compara contra el estado posterior a ella.
    const { fecha, resultado } = await EjecutarConFechaUtc(
      2,
      (fechaLlamada) =>
        AgregarMovimiento(usuarioA.cliente, {
          tipo: 'INGRESO',
          monto: '100',
          fecha: fechaLlamada,
          idCategoria: pagoIngresado.id,
        }),
      async () => {
        saldoAntes = await LeerSaldo(usuarioA.cliente)
        movimientosAntes = await LeerMovimientos(usuarioA.cliente)
      },
    )

    expect(resultado.data, `fecha ${fecha}`).toBeNull()
    expect(resultado.error?.code, `fecha ${fecha}`).toBe(CODIGO_DATOS_INVALIDOS)
    expect(resultado.error?.message, `fecha ${fecha}`).toBe(MENSAJE_DATOS_INVALIDOS)
    expect(await LeerSaldo(usuarioA.cliente)).toBe(saldoAntes)
    expect(await LeerMovimientos(usuarioA.cliente)).toEqual(movimientosAntes)
  }, TIEMPO_MAXIMO_RED_MS)

  it('test_fecha_manana_utc_aceptada_api: un ingreso con fecha de hoy UTC + 1 día se registra con esa fecha', async () => {
    const pagoIngresado = BuscarCategoria(categoriasA, 'Pago Ingresado')

    const { fecha, resultado } = await EjecutarConFechaUtc(1, (fechaLlamada) =>
      AgregarMovimiento(usuarioA.cliente, {
        tipo: 'INGRESO',
        monto: '100',
        fecha: fechaLlamada,
        idCategoria: pagoIngresado.id,
      }),
    )

    expect(resultado.error, `fecha ${fecha}`).toBeNull()
    expect(typeof resultado.data).toBe('string')

    const consulta = await usuarioA.cliente.from('bat_movimientos').select('fecha').eq('id', resultado.data)
    expect(consulta.error).toBeNull()
    expect(consulta.data).toEqual([{ fecha }])
  }, TIEMPO_MAXIMO_RED_MS)

  it('test_rechazos_api_saldo_sin_cambios: A con saldo 10000.00 no puede registrar montos 0, -50, 1000000000000.00 ni 10.555, ni con su "Pago Realizado", ni con el "Pago Ingresado" de B, ni con fecha de hoy UTC + 2 días; no quedan movimientos nuevos y el saldo sigue en "10000.00"', async () => {
    const { cliente, idPagoIngresado } = await CrearUsuarioConPagoIngresado()
    const categoriasPropias = await LeerCategorias(cliente)
    const pagoRealizado = BuscarCategoria(categoriasPropias, 'Pago Realizado')
    const pagoIngresadoB = BuscarCategoria(categoriasB, 'Pago Ingresado')

    const fondeo = await AgregarMovimiento(cliente, {
      tipo: 'INGRESO',
      monto: '10000.00',
      idCategoria: idPagoIngresado,
    })
    expect(fondeo.error).toBeNull()
    expect(await LeerSaldo(cliente)).toBe('10000.00')
    const movimientosAntes = await LeerMovimientos(cliente)

    const intentos = [
      { descripcion: 'monto 0', monto: '0', idCategoria: idPagoIngresado, codigo: CODIGO_DATOS_INVALIDOS },
      { descripcion: 'monto -50', monto: '-50', idCategoria: idPagoIngresado, codigo: CODIGO_DATOS_INVALIDOS },
      {
        descripcion: `monto ${MONTO_SOBRE_MAXIMO}`,
        monto: MONTO_SOBRE_MAXIMO,
        idCategoria: idPagoIngresado,
        codigo: CODIGO_DATOS_INVALIDOS,
      },
      { descripcion: 'monto 10.555', monto: '10.555', idCategoria: idPagoIngresado, codigo: CODIGO_DATOS_INVALIDOS },
      {
        descripcion: 'categoría de gasto propia',
        monto: '100',
        idCategoria: pagoRealizado.id,
        codigo: CODIGO_SIN_PRIVILEGIOS,
      },
      {
        descripcion: 'categoría de ingreso de B',
        monto: '100',
        idCategoria: pagoIngresadoB.id,
        codigo: CODIGO_SIN_PRIVILEGIOS,
      },
    ]

    for (const { descripcion, monto, idCategoria, codigo } of intentos) {
      const { data, error } = await AgregarMovimiento(cliente, { tipo: 'INGRESO', monto, idCategoria })

      expect(data, descripcion).toBeNull()
      expect(error?.code, descripcion).toBe(codigo)
    }

    // Hasta acá ningún intento escribió: el estado de referencia sigue siendo saldo "10000.00".
    expect(await LeerMovimientos(cliente)).toEqual(movimientosAntes)
    expect(await LeerSaldo(cliente)).toBe('10000.00')

    // Si el día UTC cambió, la primera llamada pudo registrarse: se compara contra el estado posterior a ella.
    let saldoReferencia = '10000.00'
    let movimientosReferencia = movimientosAntes
    const { fecha, resultado } = await EjecutarConFechaUtc(
      2,
      (fechaLlamada) =>
        AgregarMovimiento(cliente, {
          tipo: 'INGRESO',
          monto: '100',
          fecha: fechaLlamada,
          idCategoria: idPagoIngresado,
        }),
      async () => {
        saldoReferencia = await LeerSaldo(cliente)
        movimientosReferencia = await LeerMovimientos(cliente)
      },
    )
    expect(resultado.data, `fecha ${fecha}`).toBeNull()
    expect(resultado.error?.code, `fecha ${fecha}`).toBe(CODIGO_DATOS_INVALIDOS)

    expect(await LeerMovimientos(cliente)).toEqual(movimientosReferencia)
    expect(await LeerSaldo(cliente)).toBe(saldoReferencia)
  }, TIEMPO_MAXIMO_RED_MS)

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

// Suite aparte con su propio usuario: correrla sola (-t) crea un único usuario anónimo.
describe.skipIf(!configuracion)('Orden de los movimientos contra Supabase real', () => {
  it('test_movimientos_ordenados_api: tras tres altas con "Pago Ingresado" (2026-09-17, 2026-10-01 y otra 2026-10-01) la lectura con el orden de ObtenerMovimientos devuelve la última de 2026-10-01, la primera de 2026-10-01 y la de 2026-09-17', async () => {
    const { cliente } = await CrearUsuarioPrueba()

    const consultaCategorias = await cliente
      .from('bat_categorias')
      .select('id')
      .eq('tipo', 'INGRESO')
      .eq('es_defecto', true)
    expect(consultaCategorias.error).toBeNull()
    expect(consultaCategorias.data).toHaveLength(1)
    const idPagoIngresado = consultaCategorias.data[0].id

    // Las altas van una después de otra: cada llamada es su propia transacción y su propio fecha_alta.
    const idsMovimientos = []
    for (const fecha of ['2026-09-17', '2026-10-01', '2026-10-01']) {
      const { data: idMovimiento, error } = await AgregarMovimiento(cliente, {
        tipo: 'INGRESO',
        monto: '100',
        fecha,
        idCategoria: idPagoIngresado,
      })

      expect(error, `alta del ${fecha}`).toBeNull()
      expect(typeof idMovimiento).toBe('string')
      idsMovimientos.push(idMovimiento)
    }

    const [idSeptiembre, idPrimeroOctubre, idSegundoOctubre] = idsMovimientos

    // El mismo orden que la consulta de ObtenerMovimientos.
    const consulta = await cliente
      .from('bat_movimientos')
      .select('id, fecha')
      .order('fecha', { ascending: false })
      .order('fecha_alta', { ascending: false })

    expect(consulta.error).toBeNull()
    expect(consulta.data).toEqual([
      { id: idSegundoOctubre, fecha: '2026-10-01' },
      { id: idPrimeroOctubre, fecha: '2026-10-01' },
      { id: idSeptiembre, fecha: '2026-09-17' },
    ])
  }, TIEMPO_MAXIMO_RED_MS)
})

// Cada prueba crea su propio usuario con saldo 0: correr una sola (-t) crea un único usuario anónimo.
describe.skipIf(!configuracion)('Precisión de montos y saldo contra Supabase real', () => {
  async function RegistrarMontos(cliente, idPagoIngresado, montos) {
    for (const monto of montos) {
      const { data, error } = await AgregarMovimiento(cliente, {
        tipo: 'INGRESO',
        monto,
        idCategoria: idPagoIngresado,
      })

      expect(error, `monto ${monto}`).toBeNull()
      expect(typeof data).toBe('string')
    }
  }

  it('test_monto_maximo_exacto_api: A con saldo 0 registra "999999999999.99" y su saldo es exactamente "999999999999.99"', async () => {
    const { cliente, idPagoIngresado } = await CrearUsuarioConPagoIngresado()
    expect(await LeerSaldoTexto(cliente)).toBe('0')

    await RegistrarMontos(cliente, idPagoIngresado, [MONTO_MAXIMO])

    expect(await LeerSaldoTexto(cliente)).toBe('999999999999.99')
  }, TIEMPO_MAXIMO_RED_MS)

  it('test_suma_decimales_exacta_api: A con saldo 0 registra "0.10" y "0.20" y su saldo es exactamente "0.30"', async () => {
    const { cliente, idPagoIngresado } = await CrearUsuarioConPagoIngresado()
    expect(await LeerSaldoTexto(cliente)).toBe('0')

    await RegistrarMontos(cliente, idPagoIngresado, ['0.10', '0.20'])

    expect(await LeerSaldoTexto(cliente)).toBe('0.30')
  }, TIEMPO_MAXIMO_RED_MS)

  it('test_dos_montos_maximos_api: A con saldo 0 registra dos veces "999999999999.99" y su saldo es exactamente "1999999999999.98"', async () => {
    const { cliente, idPagoIngresado } = await CrearUsuarioConPagoIngresado()
    expect(await LeerSaldoTexto(cliente)).toBe('0')

    await RegistrarMontos(cliente, idPagoIngresado, [MONTO_MAXIMO, MONTO_MAXIMO])

    expect(await LeerSaldoTexto(cliente)).toBe('1999999999999.98')
  }, TIEMPO_MAXIMO_RED_MS)
})

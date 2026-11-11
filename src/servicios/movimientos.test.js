import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpcSimulado, fromSimulado, selectSimulado, orderSimulado } = vi.hoisted(() => ({
  rpcSimulado: vi.fn(),
  fromSimulado: vi.fn(),
  selectSimulado: vi.fn(),
  orderSimulado: vi.fn(),
}))

vi.mock('./clienteSupabase.js', () => ({
  clienteSupabase: { rpc: rpcSimulado, from: fromSimulado },
}))

import { AgregarIngreso, ObtenerMovimientos } from './movimientos.js'

const ERROR_SERVIDOR = { code: '500', message: 'Error interno' }
const ID_CATEGORIA = 'id-categoria'

beforeEach(() => {
  rpcSimulado.mockReset()
  fromSimulado.mockReset()
  selectSimulado.mockReset()
  orderSimulado.mockReset()
  fromSimulado.mockReturnValue({ select: selectSimulado })
  selectSimulado.mockReturnValue({ order: orderSimulado })
})

describe('AgregarIngreso', () => {
  it('test_agregar_ingreso_envia_texto: llama a basp_agregar_movimiento con tipo INGRESO y el monto como texto', async () => {
    rpcSimulado.mockResolvedValue({ data: 'id-movimiento', error: null })

    await AgregarIngreso({ montoTexto: '1500.5', fecha: '2026-11-11', idCategoria: ID_CATEGORIA })

    expect(rpcSimulado).toHaveBeenCalledTimes(1)
    expect(rpcSimulado).toHaveBeenCalledWith('basp_agregar_movimiento', {
      p_tipo: 'INGRESO',
      p_monto: '1500.5',
      p_fecha: '2026-11-11',
      p_id_categoria: ID_CATEGORIA,
    })
    expect(typeof rpcSimulado.mock.calls[0][1].p_monto).toBe('string')
  })

  it('test_error_supabase_propagado: AgregarIngreso lanza el error de Supabase', async () => {
    rpcSimulado.mockResolvedValue({ data: null, error: ERROR_SERVIDOR })

    await expect(
      AgregarIngreso({ montoTexto: '500', fecha: '2026-11-11', idCategoria: ID_CATEGORIA }),
    ).rejects.toBe(ERROR_SERVIDOR)
  })
})

describe('ObtenerMovimientos', () => {
  it('test_obtener_movimientos_ordenados: pide monto::text, ordena por fecha y fecha_alta descendentes y devuelve nombreCategoria', async () => {
    const ordenFechaAlta = vi.fn().mockResolvedValue({
      data: [
        { id: 'm2', tipo: 'INGRESO', monto: '10000', fecha: '2026-11-11', bat_categorias: { nombre: 'Pago Ingresado' } },
        { id: 'm1', tipo: 'INGRESO', monto: '1500.5', fecha: '2026-11-10', bat_categorias: { nombre: 'Sueldo' } },
      ],
      error: null,
    })
    orderSimulado.mockReturnValue({ order: ordenFechaAlta })

    const movimientos = await ObtenerMovimientos()

    expect(fromSimulado).toHaveBeenCalledWith('bat_movimientos')
    expect(selectSimulado).toHaveBeenCalledWith('id, tipo, monto::text, fecha, bat_categorias(nombre)')
    expect(orderSimulado).toHaveBeenCalledWith('fecha', { ascending: false })
    expect(ordenFechaAlta).toHaveBeenCalledWith('fecha_alta', { ascending: false })
    expect(movimientos).toEqual([
      { id: 'm2', tipo: 'INGRESO', monto: '10000', fecha: '2026-11-11', nombreCategoria: 'Pago Ingresado' },
      { id: 'm1', tipo: 'INGRESO', monto: '1500.5', fecha: '2026-11-10', nombreCategoria: 'Sueldo' },
    ])
  })

  it('test_movimientos_lista_vacia: devuelve una lista vacía si no hay movimientos', async () => {
    orderSimulado.mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })

    await expect(ObtenerMovimientos()).resolves.toEqual([])
  })

  it('test_error_supabase_propagado: ObtenerMovimientos lanza el error de Supabase', async () => {
    orderSimulado.mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: null, error: ERROR_SERVIDOR }),
    })

    await expect(ObtenerMovimientos()).rejects.toBe(ERROR_SERVIDOR)
  })
})

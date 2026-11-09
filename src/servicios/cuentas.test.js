import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromSimulado, selectSimulado, singleSimulado } = vi.hoisted(() => ({
  fromSimulado: vi.fn(),
  selectSimulado: vi.fn(),
  singleSimulado: vi.fn(),
}))

vi.mock('./clienteSupabase.js', () => ({ clienteSupabase: { from: fromSimulado } }))

import { ContarMovimientos, ObtenerCuenta } from './cuentas.js'

const CUENTA = { id: 'id-cuenta', nombre: 'Mi Cuenta', moneda: 'USD', saldo: '0' }
const ERROR_SIN_FILAS = { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
const ERROR_SERVIDOR = { code: '500', message: 'Error interno' }

beforeEach(() => {
  fromSimulado.mockReset()
  selectSimulado.mockReset()
  singleSimulado.mockReset()
  fromSimulado.mockReturnValue({ select: selectSimulado })
})

describe('ObtenerCuenta', () => {
  beforeEach(() => {
    selectSimulado.mockReturnValue({ single: singleSimulado })
  })

  it('pide la cuenta con saldo::text y una sola fila, sin filtrar por usuario', async () => {
    singleSimulado.mockResolvedValue({ data: CUENTA, error: null })

    await ObtenerCuenta()

    expect(fromSimulado).toHaveBeenCalledWith('bat_cuentas')
    expect(selectSimulado).toHaveBeenCalledWith('id, nombre, moneda, saldo::text')
    expect(singleSimulado).toHaveBeenCalledTimes(1)
  })

  it('devuelve la cuenta con el saldo como texto', async () => {
    singleSimulado.mockResolvedValue({ data: CUENTA, error: null })

    await expect(ObtenerCuenta()).resolves.toEqual(CUENTA)
  })

  it('lanza el error que devuelve supabase-js cuando no hay filas', async () => {
    singleSimulado.mockResolvedValue({ data: null, error: ERROR_SIN_FILAS })

    await expect(ObtenerCuenta()).rejects.toBe(ERROR_SIN_FILAS)
  })

  it('propaga el rechazo de la consulta', async () => {
    const errorRed = new Error('Failed to fetch')
    singleSimulado.mockRejectedValue(errorRed)

    await expect(ObtenerCuenta()).rejects.toBe(errorRed)
  })
})

describe('ContarMovimientos', () => {
  it('cuenta con head: true y count exact, sin traer filas', async () => {
    selectSimulado.mockResolvedValue({ count: 0, data: null, error: null })

    await ContarMovimientos()

    expect(fromSimulado).toHaveBeenCalledWith('bat_movimientos')
    expect(selectSimulado).toHaveBeenCalledWith('id', { count: 'exact', head: true })
  })

  it.each([0, 3])('devuelve el conteo %i', async (cantidad) => {
    selectSimulado.mockResolvedValue({ count: cantidad, data: null, error: null })

    await expect(ContarMovimientos()).resolves.toBe(cantidad)
  })

  it('lanza el error que devuelve supabase-js', async () => {
    selectSimulado.mockResolvedValue({ count: null, data: null, error: ERROR_SERVIDOR })

    await expect(ContarMovimientos()).rejects.toBe(ERROR_SERVIDOR)
  })

  it('lanza un error si la respuesta no trae conteo', async () => {
    selectSimulado.mockResolvedValue({ count: null, data: null, error: null })

    await expect(ContarMovimientos()).rejects.toThrow('No se obtuvo el conteo de movimientos')
  })

  it('propaga el rechazo de la consulta', async () => {
    const errorRed = new Error('Failed to fetch')
    selectSimulado.mockRejectedValue(errorRed)

    await expect(ContarMovimientos()).rejects.toBe(errorRed)
  })
})

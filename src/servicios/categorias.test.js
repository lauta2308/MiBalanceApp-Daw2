import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromSimulado, selectSimulado, eqSimulado, orderSimulado } = vi.hoisted(() => ({
  fromSimulado: vi.fn(),
  selectSimulado: vi.fn(),
  eqSimulado: vi.fn(),
  orderSimulado: vi.fn(),
}))

vi.mock('./clienteSupabase.js', () => ({ clienteSupabase: { from: fromSimulado } }))

import { ObtenerCategoriasIngreso } from './categorias.js'

const ERROR_SERVIDOR = { code: '500', message: 'Error interno' }
// Desordenadas a propósito: el orden lo pone el servicio, no la API (ADR-004).
const CATEGORIAS_API = [
  { id: 'c1', nombre: 'Ventas', es_defecto: false },
  { id: 'c2', nombre: 'alquiler', es_defecto: false },
  { id: 'c3', nombre: 'Ómnibus', es_defecto: false },
  { id: 'c4', nombre: 'Pago Ingresado', es_defecto: true },
]

// Resultado de eq: se puede esperar como la consulta de supabase-js y, si alguien
// encadenara order, queda registrado en orderSimulado.
function CrearResultadoConsulta(respuesta) {
  const promesa = Promise.resolve(respuesta)
  return {
    order: orderSimulado,
    then: (alResolver, alRechazar) => promesa.then(alResolver, alRechazar),
  }
}

beforeEach(() => {
  fromSimulado.mockReset()
  selectSimulado.mockReset()
  eqSimulado.mockReset()
  orderSimulado.mockReset()
  fromSimulado.mockReturnValue({ select: selectSimulado })
  selectSimulado.mockReturnValue({ eq: eqSimulado })
  orderSimulado.mockImplementation(() => CrearResultadoConsulta({ data: CATEGORIAS_API, error: null }))
})

describe('ObtenerCategoriasIngreso', () => {
  it('test_categorias_ingreso_por_defecto_primero: filtra tipo INGRESO, no llama a order y devuelve la lista de la API ya ordenada', async () => {
    eqSimulado.mockReturnValue(CrearResultadoConsulta({ data: CATEGORIAS_API, error: null }))

    const categorias = await ObtenerCategoriasIngreso()

    expect(fromSimulado).toHaveBeenCalledWith('bat_categorias')
    expect(selectSimulado).toHaveBeenCalledWith('id, nombre, es_defecto')
    expect(eqSimulado).toHaveBeenCalledWith('tipo', 'INGRESO')
    expect(orderSimulado).not.toHaveBeenCalled()
    expect(categorias.map((categoria) => categoria.nombre)).toEqual([
      'Pago Ingresado',
      'alquiler',
      'Ómnibus',
      'Ventas',
    ])
  })

  it('test_error_supabase_propagado: ObtenerCategoriasIngreso lanza el error de Supabase sin ordenar nada', async () => {
    eqSimulado.mockReturnValue(CrearResultadoConsulta({ data: null, error: ERROR_SERVIDOR }))

    await expect(ObtenerCategoriasIngreso()).rejects.toBe(ERROR_SERVIDOR)
    expect(eqSimulado).toHaveBeenCalledWith('tipo', 'INGRESO')
    expect(orderSimulado).not.toHaveBeenCalled()
  })
})

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
const CATEGORIAS = [
  { id: 'c1', nombre: 'Pago Ingresado', es_defecto: true },
  { id: 'c2', nombre: 'Sueldo', es_defecto: false },
]

beforeEach(() => {
  fromSimulado.mockReset()
  selectSimulado.mockReset()
  eqSimulado.mockReset()
  orderSimulado.mockReset()
  fromSimulado.mockReturnValue({ select: selectSimulado })
  selectSimulado.mockReturnValue({ eq: eqSimulado })
  eqSimulado.mockReturnValue({ order: orderSimulado })
})

describe('ObtenerCategoriasIngreso', () => {
  it('test_categorias_ingreso_por_defecto_primero: filtra tipo INGRESO y ordena por es_defecto descendente y luego por nombre', async () => {
    const ordenNombre = vi.fn().mockResolvedValue({ data: CATEGORIAS, error: null })
    orderSimulado.mockReturnValue({ order: ordenNombre })

    const categorias = await ObtenerCategoriasIngreso()

    expect(fromSimulado).toHaveBeenCalledWith('bat_categorias')
    expect(selectSimulado).toHaveBeenCalledWith('id, nombre, es_defecto')
    expect(eqSimulado).toHaveBeenCalledWith('tipo', 'INGRESO')
    expect(orderSimulado).toHaveBeenCalledWith('es_defecto', { ascending: false })
    expect(ordenNombre).toHaveBeenCalledWith('nombre')
    expect(categorias).toEqual(CATEGORIAS)
  })

  it('test_error_supabase_propagado: ObtenerCategoriasIngreso lanza el error de Supabase', async () => {
    orderSimulado.mockReturnValue({
      order: vi.fn().mockResolvedValue({ data: null, error: ERROR_SERVIDOR }),
    })

    await expect(ObtenerCategoriasIngreso()).rejects.toBe(ERROR_SERVIDOR)
  })
})

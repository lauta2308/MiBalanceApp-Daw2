import { describe, expect, it } from 'vitest'
import { OrdenarCategorias } from './ordenCategorias.js'

function ObtenerNombres(categorias) {
  return categorias.map((categoria) => categoria.nombre)
}

describe('OrdenarCategorias', () => {
  it('test_ordenar_categorias_por_defecto_primero: "Pago Ingresado" queda primera aunque llegue última', () => {
    const categorias = [
      { id: 'c1', nombre: 'Alquiler', es_defecto: false },
      { id: 'c2', nombre: 'Sueldo', es_defecto: false },
      { id: 'c3', nombre: 'Pago Ingresado', es_defecto: true },
    ]

    const ordenadas = OrdenarCategorias(categorias)

    expect(ObtenerNombres(ordenadas)).toEqual(['Pago Ingresado', 'Alquiler', 'Sueldo'])
    expect(ordenadas[0]).toBe(categorias[2])
  })

  it('test_ordenar_categorias_sin_mayusculas_ni_tildes: ordena "Ventas", "alquiler" y "Ómnibus" sin distinguir mayúsculas ni tildes', () => {
    const categorias = [
      { id: 'c1', nombre: 'Ventas', es_defecto: false },
      { id: 'c2', nombre: 'alquiler', es_defecto: false },
      { id: 'c3', nombre: 'Ómnibus', es_defecto: false },
      { id: 'c4', nombre: 'Pago Ingresado', es_defecto: true },
    ]

    expect(ObtenerNombres(OrdenarCategorias(categorias))).toEqual([
      'Pago Ingresado',
      'alquiler',
      'Ómnibus',
      'Ventas',
    ])
  })

  it('test_ordenar_categorias_no_modifica_original: la lista recibida conserva su orden y se devuelve un arreglo nuevo', () => {
    const categorias = [
      { id: 'c1', nombre: 'Ventas', es_defecto: false },
      { id: 'c2', nombre: 'Pago Ingresado', es_defecto: true },
      { id: 'c3', nombre: 'alquiler', es_defecto: false },
    ]
    const copiaOriginal = [...categorias]

    const ordenadas = OrdenarCategorias(categorias)

    expect(ordenadas).not.toBe(categorias)
    expect(categorias).toEqual(copiaOriginal)
    categorias.forEach((categoria, indice) => {
      expect(categoria).toBe(copiaOriginal[indice])
    })
    expect(ObtenerNombres(ordenadas)).toEqual(['Pago Ingresado', 'alquiler', 'Ventas'])
  })
})

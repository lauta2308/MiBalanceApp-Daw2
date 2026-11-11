import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import ListaMovimientos from './ListaMovimientos.jsx'

// Movimientos ya preparados por SeccionCuenta: fecha en "DD/MM/AAAA" y monto con signo.
const MOVIMIENTOS = [
  { id: 'id-1', tipo: 'INGRESO', fecha: '11/11/2026', nombreCategoria: 'Sueldo', monto: '+1.500,00' },
  { id: 'id-2', tipo: 'INGRESO', fecha: '11/11/2026', nombreCategoria: 'Pago Ingresado', monto: '+500,00' },
  { id: 'id-3', tipo: 'INGRESO', fecha: '09/11/2026', nombreCategoria: 'Pago Ingresado', monto: '+20,50' },
]

afterEach(() => {
  cleanup()
})

function ObtenerTextosItem(item) {
  return item.textContent
}

describe('ListaMovimientos', () => {
  it('test_lista_agrupada_por_fecha: muestra cada fecha como encabezado "DD/MM/AAAA" con sus movimientos, en el orden recibido, con categoría y monto con signo', () => {
    render(<ListaMovimientos movimientos={MOVIMIENTOS} />)

    const encabezados = screen.getAllByRole('heading', { level: 2 })
    expect(encabezados.map((encabezado) => encabezado.textContent)).toEqual(['11/11/2026', '09/11/2026'])

    const listas = screen.getAllByRole('list')
    expect(listas).toHaveLength(2)

    const itemsPrimerGrupo = within(listas[0]).getAllByRole('listitem')
    expect(itemsPrimerGrupo).toHaveLength(2)
    expect(within(itemsPrimerGrupo[0]).getByText('Sueldo')).toBeInTheDocument()
    expect(within(itemsPrimerGrupo[0]).getByText('+1.500,00')).toBeInTheDocument()
    expect(within(itemsPrimerGrupo[1]).getByText('Pago Ingresado')).toBeInTheDocument()
    expect(within(itemsPrimerGrupo[1]).getByText('+500,00')).toBeInTheDocument()

    const itemsSegundoGrupo = within(listas[1]).getAllByRole('listitem')
    expect(itemsSegundoGrupo.map(ObtenerTextosItem)).toEqual(['Pago Ingresado+20,50'])
  })

  it('test_lista_cada_grupo_es_seccion: cada grupo es una section que contiene su h2 y su lista', () => {
    const { container } = render(<ListaMovimientos movimientos={MOVIMIENTOS} />)

    const secciones = container.querySelectorAll('section')
    expect(secciones).toHaveLength(2)
    expect(within(secciones[1]).getByRole('heading', { level: 2 })).toHaveTextContent('09/11/2026')
    expect(within(secciones[1]).getAllByRole('listitem')).toHaveLength(1)
  })

  it('test_lista_textos_sin_html: muestra el nombre de la categoría como texto, sin interpretar HTML', () => {
    const nombreCategoria = '<img src=x onerror=alert(1)>'
    const { container } = render(
      <ListaMovimientos movimientos={[{ ...MOVIMIENTOS[0], nombreCategoria }]} />,
    )

    expect(screen.getByText(nombreCategoria)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})

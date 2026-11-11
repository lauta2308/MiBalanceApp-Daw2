import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import SelectorFecha from './SelectorFecha.jsx'

const ID_CAMPO = 'campo-fecha'
const ID_ETIQUETA = 'etiqueta-fecha'
const HOY = '2026-11-06'

// Hace de formulario: guarda la fecha elegida y avisa a la prueba de cada cambio.
function Envoltorio({ fechaInicial = HOY, alCambiar }) {
  const [fecha, EstablecerFecha] = useState(fechaInicial)

  function ManejarCambio(fechaNueva) {
    alCambiar(fechaNueva)
    EstablecerFecha(fechaNueva)
  }

  return (
    <div>
      <label htmlFor={ID_CAMPO} id={ID_ETIQUETA}>
        Fecha
      </label>
      <SelectorFecha
        fecha={fecha}
        alCambiar={ManejarCambio}
        idCampo={ID_CAMPO}
        idEtiqueta={ID_ETIQUETA}
      />
    </div>
  )
}

function Renderizar(propiedades = {}) {
  const alCambiar = vi.fn()
  render(<Envoltorio alCambiar={alCambiar} {...propiedades} />)
  return { alCambiar }
}

function ObtenerBotonFecha(fechaVisible = '06/11/2026') {
  return screen.getByRole('button', { name: `Fecha ${fechaVisible}` })
}

// "\b" evita que el 3 encuentre también el 13 o el 23.
function ObtenerDia(numero, mesAnio = 'noviembre de 2026') {
  return screen.getByRole('button', { name: new RegExp(`\\b${numero} de ${mesAnio}`) })
}

// Solo se falsea Date: userEvent sigue usando los setTimeout reales y no se cuelga.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 10, 6, 12, 0))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('SelectorFecha', () => {
  it('test_selector_fecha_nombre_accesible: el botón se anuncia como "Fecha DD/MM/AAAA" y el mes va con mayúscula inicial', async () => {
    const usuario = userEvent.setup()
    Renderizar()

    const boton = ObtenerBotonFecha()
    expect(boton).toHaveTextContent('06/11/2026')
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()

    await usuario.click(boton)

    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('status')).toHaveTextContent(/^Noviembre 2026$/)
    const selectorMes = screen.getByRole('combobox', { name: 'Elegir el mes' })
    expect(within(selectorMes).getByRole('option', { selected: true })).toHaveTextContent(/^Noviembre$/)
    expect(within(selectorMes).getByRole('option', { name: 'Marzo' })).toBeInTheDocument()
    // La semana empieza el lunes en el locale es; el encabezado de la tabla también es un título.
    // La librería oculta el thead al lector (cada día se anuncia con su nombre completo): hidden: true.
    const encabezadosDias = screen.getAllByRole('columnheader', { hidden: true })
    expect(encabezadosDias).toHaveLength(7)
    expect(encabezadosDias[0]).toHaveTextContent(/^Lu$/)
    expect(encabezadosDias[6]).toHaveTextContent(/^Do$/)
  })

  it('test_selector_fecha_hoy_preseleccionado: hoy está seleccionado, no se puede vaciar y elegirlo de nuevo no lo deselecciona', async () => {
    const usuario = userEvent.setup()
    const { alCambiar } = Renderizar()

    await usuario.click(ObtenerBotonFecha())

    const seleccionados = screen.getAllByRole('gridcell', { selected: true })
    expect(seleccionados).toHaveLength(1)
    expect(seleccionados[0]).toHaveTextContent(/^6$/)
    expect(
      screen.queryByRole('button', { name: /borrar|limpiar|vaciar|quitar|sin fecha/i }),
    ).not.toBeInTheDocument()

    await usuario.click(ObtenerDia(6))

    expect(alCambiar).toHaveBeenCalledTimes(1)
    expect(alCambiar).toHaveBeenCalledWith(HOY)
    const boton = ObtenerBotonFecha()
    expect(boton).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(boton)

    const seleccionadosDespues = screen.getAllByRole('gridcell', { selected: true })
    expect(seleccionadosDespues).toHaveLength(1)
    expect(seleccionadosDespues[0]).toHaveTextContent(/^6$/)
  })

  it('test_dia_futuro_rechazado: mañana está deshabilitado y su clic no llama a alCambiar', async () => {
    const usuario = userEvent.setup()
    const { alCambiar } = Renderizar()

    await usuario.click(ObtenerBotonFecha())

    const manana = ObtenerDia(7)
    expect(manana).toBeDisabled()
    expect(ObtenerDia(6)).toBeEnabled()

    await usuario.click(manana)

    expect(alCambiar).not.toHaveBeenCalled()
    expect(ObtenerBotonFecha()).toHaveAttribute('aria-expanded', 'true')
  })

  it('test_selector_fecha_elige_dia_y_cierra: elegir otro día pasado avisa su AAAA-MM-DD y cierra el calendario', async () => {
    const usuario = userEvent.setup()
    const { alCambiar } = Renderizar()

    await usuario.click(ObtenerBotonFecha())
    await usuario.click(ObtenerDia(3))

    expect(alCambiar).toHaveBeenCalledTimes(1)
    expect(alCambiar).toHaveBeenCalledWith('2026-11-03')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(ObtenerBotonFecha('03/11/2026')).toHaveAttribute('aria-expanded', 'false')
  })

  it('test_selector_fecha_navega_hasta_1900: el selector de años va de 1900 al año actual', async () => {
    const usuario = userEvent.setup()
    Renderizar()

    await usuario.click(ObtenerBotonFecha())

    const selectorAnio = screen.getByRole('combobox', { name: 'Elegir el año' })
    const anios = within(selectorAnio)
      .getAllByRole('option')
      .map((opcion) => Number(opcion.value))

    expect(anios).toContain(1900)
    expect(anios).toContain(1990)
    expect(Math.min(...anios)).toBe(1900)
    expect(Math.max(...anios)).toBe(2026)

    await usuario.selectOptions(selectorAnio, '1990')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Elegir el mes' }), 'Marzo')
    await usuario.click(ObtenerDia(15, 'marzo de 1990'))

    expect(ObtenerBotonFecha('15/03/1990')).toBeInTheDocument()
  })

  it('test_selector_fecha_teclado: Tab llega al botón, Enter lo abre y las flechas recorren los días', async () => {
    const usuario = userEvent.setup()
    const { alCambiar } = Renderizar()

    await usuario.tab()
    expect(ObtenerBotonFecha()).toHaveFocus()

    await usuario.keyboard('{Enter}')
    expect(ObtenerBotonFecha()).toHaveAttribute('aria-expanded', 'true')
    expect(ObtenerDia(6)).toHaveFocus()

    await usuario.keyboard('{ArrowLeft}')
    expect(ObtenerDia(5)).toHaveFocus()
    await usuario.keyboard('{ArrowUp}')
    expect(ObtenerDia(29, 'octubre de 2026')).toHaveFocus()

    await usuario.keyboard('{Enter}')
    expect(alCambiar).toHaveBeenCalledWith('2026-10-29')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    // Al cerrarse, el foco vuelve al botón y no se pierde en el body.
    expect(ObtenerBotonFecha('29/10/2026')).toHaveFocus()

    await usuario.keyboard('{Enter}')
    expect(ObtenerDia(29, 'octubre de 2026')).toHaveFocus()
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(ObtenerBotonFecha('29/10/2026')).toHaveFocus()
  })

  it('test_selector_fecha_escape_cierra: Escape dentro del calendario lo cierra sin cambiar la fecha', async () => {
    const usuario = userEvent.setup()
    const { alCambiar } = Renderizar()

    await usuario.click(ObtenerBotonFecha())
    await usuario.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(ObtenerDia(4)).toHaveFocus()

    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(alCambiar).not.toHaveBeenCalled()
    const boton = ObtenerBotonFecha()
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(boton).toHaveFocus()
  })
})

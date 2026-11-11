import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'

const { AgregarIngresoSimulado, ObtenerCategoriasIngresoSimulado, fromSupabaseSimulado } = vi.hoisted(() => ({
  AgregarIngresoSimulado: vi.fn(),
  ObtenerCategoriasIngresoSimulado: vi.fn(),
  fromSupabaseSimulado: vi.fn(),
}))

// Solo lo usa el servicio real de categorías en test_selector_solo_categorias_ingreso.
vi.mock('../servicios/clienteSupabase.js', () => ({
  clienteSupabase: { from: fromSupabaseSimulado },
}))
vi.mock('../servicios/movimientos.js', () => ({
  AgregarIngreso: AgregarIngresoSimulado,
  ObtenerMovimientos: vi.fn(),
}))
vi.mock('../servicios/categorias.js', () => ({
  ObtenerCategoriasIngreso: ObtenerCategoriasIngresoSimulado,
}))

import FormularioMovimiento from './FormularioMovimiento.jsx'

// "Sueldo" va primero a propósito: la preselección sale de es_defecto, no del orden recibido.
const CATEGORIAS = [
  { id: 'id-sueldo', nombre: 'Sueldo', es_defecto: false },
  { id: 'id-pago-ingresado', nombre: 'Pago Ingresado', es_defecto: true },
]
const MENSAJE_MONTO_INVALIDO = 'El monto debe ser mayor a 0.'
const MENSAJE_ERROR_ALTA = 'No se pudo registrar el ingreso. Vuelva a intentarlo.'
const MENSAJE_ERROR_CARGA = 'No se pudo cargar el formulario. Vuelva a intentarlo.'
const MENSAJE_EXITO = 'Ingreso registrado con éxito.'
const ERROR_TECNICO = 'P0001: violates check constraint bat_movimientos'

// Muestra dónde terminó la navegación y con qué state, para comprobarlo desde la prueba.
function SondaCuenta() {
  const ubicacion = useLocation()
  return (
    <p data-testid="sonda-cuenta">
      {`Cuenta|${ubicacion.pathname}|${ubicacion.state?.mensajeExito ?? 'sin-mensaje'}`}
    </p>
  )
}

function RenderizarFormulario() {
  return render(
    <MemoryRouter initialEntries={['/', '/ingresos/nuevo']} initialIndex={1}>
      <Routes>
        <Route path="/" element={<SondaCuenta />} />
        <Route path="/ingresos/nuevo" element={<FormularioMovimiento />} />
      </Routes>
    </MemoryRouter>,
  )
}

function ObtenerTitulo() {
  return screen.findByRole('heading', { level: 1, name: 'Añadir Ingreso' })
}

function ObtenerCampoMonto() {
  return screen.getByLabelText('Monto')
}

function ObtenerDialogo() {
  return screen.getByRole('alertdialog')
}

beforeEach(() => {
  AgregarIngresoSimulado.mockReset()
  ObtenerCategoriasIngresoSimulado.mockReset()
  fromSupabaseSimulado.mockReset()
  ObtenerCategoriasIngresoSimulado.mockResolvedValue(CATEGORIAS)
  AgregarIngresoSimulado.mockResolvedValue(undefined)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('FormularioMovimiento', () => {
  it('test_formulario_muestra_cargando: muestra "Cargando…" mientras pide las categorías', async () => {
    let resolver
    ObtenerCategoriasIngresoSimulado.mockReturnValue(
      new Promise((alResolver) => {
        resolver = alResolver
      }),
    )

    RenderizarFormulario()

    expect(screen.getByText('Cargando…')).toBeInTheDocument()
    expect(ObtenerCategoriasIngresoSimulado).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolver(CATEGORIAS)
    })

    expect(await ObtenerTitulo()).toBeInTheDocument()
    expect(screen.queryByText('Cargando…')).not.toBeInTheDocument()
  })

  it('test_formulario_preselecciona_pago_ingresado: muestra "Añadir Ingreso" con "Pago Ingresado" seleccionada y sin opción vacía', async () => {
    RenderizarFormulario()

    expect(await ObtenerTitulo()).toBeInTheDocument()
    const campoCategoria = screen.getByLabelText('Categoría')
    const opciones = within(campoCategoria).getAllByRole('option')

    expect(campoCategoria).toHaveValue('id-pago-ingresado')
    expect(screen.getByRole('option', { name: 'Pago Ingresado' }).selected).toBe(true)
    expect(opciones.map((opcion) => opcion.textContent)).toEqual(['Sueldo', 'Pago Ingresado'])
    expect(opciones.every((opcion) => opcion.value !== '')).toBe(true)
    expect(screen.queryByRole('option', { name: /sin categoría/i })).not.toBeInTheDocument()
    expect(ObtenerCampoMonto()).toHaveValue('')
    expect(ObtenerCampoMonto()).toHaveAttribute('inputmode', 'decimal')
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveAttribute('type', 'submit')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
  })

  it('test_selector_solo_categorias_ingreso: con "Pago Ingresado" y "Sueldo" el select muestra exactamente esas dos opciones, sin categorías de gasto ni opción vacía', async () => {
    // Tabla simulada de la cuenta, con categorías de gasto y sin ordenar: el filtro
    // y el orden los pone el servicio real, como contra la API.
    const tablaCategorias = [
      { id: 'id-sueldo', nombre: 'Sueldo', tipo: 'INGRESO', es_defecto: false },
      { id: 'id-mercado', nombre: 'Mercado', tipo: 'GASTO', es_defecto: false },
      { id: 'id-pago-realizado', nombre: 'Pago Realizado', tipo: 'GASTO', es_defecto: true },
      { id: 'id-pago-ingresado', nombre: 'Pago Ingresado', tipo: 'INGRESO', es_defecto: true },
    ]
    fromSupabaseSimulado.mockImplementation(() => ({
      select: () => ({
        eq: (columna, valor) =>
          Promise.resolve({
            data: tablaCategorias
              .filter((categoria) => categoria[columna] === valor)
              .map(({ id, nombre, es_defecto }) => ({ id, nombre, es_defecto })),
            error: null,
          }),
      }),
    }))
    const serviciosReales = await vi.importActual('../servicios/categorias.js')
    ObtenerCategoriasIngresoSimulado.mockImplementation(serviciosReales.ObtenerCategoriasIngreso)

    RenderizarFormulario()
    await ObtenerTitulo()

    const campoCategoria = screen.getByLabelText('Categoría')
    const opciones = within(campoCategoria).getAllByRole('option')

    expect(opciones.map((opcion) => opcion.textContent)).toEqual(['Pago Ingresado', 'Sueldo'])
    expect(opciones.every((opcion) => opcion.value !== '')).toBe(true)
    expect(campoCategoria).toHaveValue('id-pago-ingresado')
    expect(screen.queryByRole('option', { name: 'Pago Realizado' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Mercado' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /sin categoría/i })).not.toBeInTheDocument()
  })

  it('test_formulario_fecha_de_hoy: muestra la fecha local de hoy en "DD/MM/AAAA" y la envía como "AAAA-MM-DD"', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 11, 23, 30))
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    const campoFecha = screen.getByLabelText('Fecha')
    expect(campoFecha).toHaveValue('11/11/2026')
    expect(campoFecha).toHaveAttribute('readonly')

    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1))
    expect(AgregarIngresoSimulado.mock.calls[0][0].fecha).toBe('2026-11-11')
  })

  it('test_formulario_guarda_y_navega: con monto 500 envía el texto, la categoría por defecto y la fecha de hoy, y navega a "/" con el mensaje de éxito', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 5, 10, 0))
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByTestId('sonda-cuenta')).toHaveTextContent(`Cuenta|/|${MENSAJE_EXITO}`)
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
    expect(AgregarIngresoSimulado).toHaveBeenCalledWith({
      montoTexto: '500',
      fecha: '2026-01-05',
      idCategoria: 'id-pago-ingresado',
    })
  })

  it('test_formulario_envia_categoria_elegida: envía la categoría que el usuario eligió y el monto normalizado', async () => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '1500,5')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'id-sueldo')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await screen.findByTestId('sonda-cuenta')
    expect(AgregarIngresoSimulado).toHaveBeenCalledWith(
      expect.objectContaining({ montoTexto: '1500.5', idCategoria: 'id-sueldo' }),
    )
  })

  it.each([
    ['vacío', ''],
    ['0', '0'],
  ])('test_monto_vacio_o_cero_rechazado: con monto %s muestra exactamente el mensaje con "Aceptar" y no llama a AgregarIngreso', async (_caso, monto) => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    if (monto) {
      await usuario.type(ObtenerCampoMonto(), monto)
    }
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    const dialogo = ObtenerDialogo()
    expect(dialogo.textContent).toBe(`${MENSAJE_MONTO_INVALIDO}Aceptar`)
    expect(within(dialogo).getByRole('button', { name: 'Aceptar' })).toBeEnabled()
    expect(AgregarIngresoSimulado).not.toHaveBeenCalled()
    expect(screen.queryByTestId('sonda-cuenta')).not.toBeInTheDocument()
  })

  it('test_mensaje_error_validacion_hasta_aceptar: el mensaje sigue visible a los 10 s y solo se cierra con "Aceptar", sin perder los datos', async () => {
    RenderizarFormulario()
    await ObtenerTitulo()

    vi.useFakeTimers()
    fireEvent.change(ObtenerCampoMonto(), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(ObtenerDialogo()).toHaveTextContent(MENSAJE_MONTO_INVALIDO)

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(ObtenerCampoMonto()).toHaveValue('abc')
    expect(AgregarIngresoSimulado).not.toHaveBeenCalled()
  })

  it('test_falla_alta_muestra_error_rechazado: si AgregarIngreso es rechazado muestra el mensaje fijo, sin el error técnico, y no navega', async () => {
    const usuario = userEvent.setup()
    AgregarIngresoSimulado.mockRejectedValue(new Error(ERROR_TECNICO))

    const { container } = RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo.textContent).toBe(`${MENSAJE_ERROR_ALTA}Aceptar`)
    expect(container.textContent).not.toContain(ERROR_TECNICO)
    expect(screen.queryByTestId('sonda-cuenta')).not.toBeInTheDocument()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Aceptar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Añadir Ingreso' })).toBeInTheDocument()
    expect(ObtenerCampoMonto()).toHaveValue('500')
  })

  it('test_falla_alta_detalle_solo_en_desarrollo: el error técnico va a console.error solo en desarrollo', async () => {
    const errorTecnico = new Error(ERROR_TECNICO)
    AgregarIngresoSimulado.mockRejectedValue(errorTecnico)
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()
    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await screen.findByRole('alertdialog')

    expect(console.error).toHaveBeenCalledWith(errorTecnico)

    cleanup()
    console.error.mockClear()
    vi.stubEnv('DEV', false)

    RenderizarFormulario()
    await ObtenerTitulo()
    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    await screen.findByRole('alertdialog')

    expect(console.error).not.toHaveBeenCalledWith(errorTecnico)
  })

  it('test_error_carga_categorias: si ObtenerCategoriasIngreso falla muestra el error de carga y "Aceptar" reintenta', async () => {
    const usuario = userEvent.setup()
    ObtenerCategoriasIngresoSimulado.mockRejectedValueOnce(new Error(ERROR_TECNICO))

    const { container } = RenderizarFormulario()

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo.textContent).toBe(`${MENSAJE_ERROR_CARGA}Aceptar`)
    expect(container.textContent).not.toContain(ERROR_TECNICO)

    await usuario.click(within(dialogo).getByRole('button', { name: 'Aceptar' }))

    expect(await ObtenerTitulo()).toBeInTheDocument()
    expect(ObtenerCategoriasIngresoSimulado).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Categoría')).toHaveValue('id-pago-ingresado')
  })

  it.each([
    ['sin ninguna categoría con es_defecto', [{ id: 'id-sueldo', nombre: 'Sueldo', es_defecto: false }]],
    ['con la lista vacía', []],
  ])('test_sin_categoria_por_defecto_error: %s muestra el mismo error de carga', async (_caso, categorias) => {
    ObtenerCategoriasIngresoSimulado.mockResolvedValue(categorias)

    RenderizarFormulario()

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo.textContent).toBe(`${MENSAJE_ERROR_CARGA}Aceptar`)
    expect(screen.queryByRole('heading', { name: 'Añadir Ingreso' })).not.toBeInTheDocument()
  })

  it.each([
    ['Cancelar'],
    ['Volver'],
  ])('test_cancelar_y_flecha_no_guardan: "%s" navega a "/" sin llamar a AgregarIngreso', async (nombreBoton) => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(screen.getByRole('button', { name: nombreBoton }))

    expect(await screen.findByTestId('sonda-cuenta')).toHaveTextContent('Cuenta|/|sin-mensaje')
    expect(AgregarIngresoSimulado).not.toHaveBeenCalled()
  })

  it('test_formulario_textos_sin_html: muestra los nombres de categoría como texto, sin interpretar HTML', async () => {
    ObtenerCategoriasIngresoSimulado.mockResolvedValue([
      { id: 'id-pago-ingresado', nombre: 'Pago Ingresado', es_defecto: true },
      { id: 'id-html', nombre: '<img src=x onerror=alert(1)>', es_defecto: false },
    ])

    const { container } = RenderizarFormulario()
    await ObtenerTitulo()

    expect(screen.getByRole('option', { name: '<img src=x onerror=alert(1)>' })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})

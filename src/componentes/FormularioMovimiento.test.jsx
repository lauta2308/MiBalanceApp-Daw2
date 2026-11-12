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
const MENSAJE_MONTO_MAXIMO = 'El monto máximo es 999.999.999.999,99.'
const MENSAJE_ERROR_ALTA = 'No se pudo registrar el ingreso. Vuelva a intentarlo.'
const MENSAJE_ERROR_CARGA = 'No se pudo cargar el formulario. Vuelva a intentarlo.'
const MENSAJE_EXITO = 'Ingreso registrado con éxito.'
const ERROR_TECNICO = 'P0001: violates check constraint bat_movimientos'

// Copia de la de SeccionCuenta.test.jsx: deja el alta pendiente hasta que la prueba la resuelva.
function CrearPromesaControlada() {
  let resolver
  let rechazar
  const promesa = new Promise((alResolver, alRechazar) => {
    resolver = alResolver
    rechazar = alRechazar
  })
  return { promesa, resolver, rechazar }
}

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

// El botón de la fecha se anuncia con la etiqueta y la fecha visible: "Fecha 06/11/2026".
function ObtenerBotonFecha(fechaVisible) {
  return screen.getByRole('button', { name: `Fecha ${fechaVisible}` })
}

// "\b" evita que el 5 encuentre también el 15 o el 25.
function ObtenerDia(numero, mesAnio) {
  return screen.getByRole('button', { name: new RegExp(`\\b${numero} de ${mesAnio}`) })
}

// Abre el calendario desde el 06/11/2026 y llega al 15/03/1990 con los selectores de año y mes.
async function ElegirFecha15DeMarzoDe1990(usuario) {
  await usuario.click(ObtenerBotonFecha('06/11/2026'))
  await usuario.selectOptions(screen.getByRole('combobox', { name: 'Elegir el año' }), '1990')
  await usuario.selectOptions(screen.getByRole('combobox', { name: 'Elegir el mes' }), 'Marzo')
  await usuario.click(ObtenerDia(15, 'marzo de 1990'))
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

  it('test_formulario_fecha_de_hoy: el control "Fecha" muestra la fecha local de hoy en "DD/MM/AAAA" y "Guardar" la envía como "AAAA-MM-DD"', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 11, 23, 30))
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    const campoFecha = screen.getByLabelText('Fecha')
    expect(campoFecha).toBe(ObtenerBotonFecha('11/11/2026'))
    expect(campoFecha).toHaveTextContent(/^11\/11\/2026$/)

    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1))
    expect(AgregarIngresoSimulado.mock.calls[0][0].fecha).toBe('2026-11-11')
  })

  it('test_fecha_local_a_las_22_utc_menos_3: a las 22:00 de Buenos Aires (01:00 UTC del día siguiente) preselecciona el 06/11/2026 y lo envía', async () => {
    vi.stubEnv('TZ', 'America/Argentina/Buenos_Aires')
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 7, 1, 0)))
    expect(new Date().getTimezoneOffset()).toBe(180)
    expect(new Date().getHours()).toBe(22)
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    const botonFecha = ObtenerBotonFecha('06/11/2026')
    await usuario.click(botonFecha)

    const seleccionados = screen.getAllByRole('gridcell', { selected: true })
    expect(seleccionados).toHaveLength(1)
    expect(within(seleccionados[0]).getByRole('button', { name: /\b6 de noviembre de 2026/ })).toBeInTheDocument()
    // El 7 de noviembre ya es "mañana" para el usuario, aunque en UTC sea hoy.
    expect(ObtenerDia(7, 'noviembre de 2026')).toBeDisabled()

    await usuario.click(botonFecha)
    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1))
    expect(AgregarIngresoSimulado).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: '2026-11-06' }),
    )
  })

  it('test_fecha_antigua_se_envia: se elige el 15/03/1990 con los selectores de año y mes y AgregarIngreso recibe "1990-03-15"', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 6, 12, 0))
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await ElegirFecha15DeMarzoDe1990(usuario)

    expect(ObtenerBotonFecha('15/03/1990')).toHaveAttribute('aria-expanded', 'false')

    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByTestId('sonda-cuenta')).toHaveTextContent(`Cuenta|/|${MENSAJE_EXITO}`)
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
    expect(AgregarIngresoSimulado).toHaveBeenCalledWith({
      montoTexto: '500',
      fecha: '1990-03-15',
      idCategoria: 'id-pago-ingresado',
    })
  })

  it('test_falla_alta_conserva_fecha_rechazado: si AgregarIngreso es rechazado con el 15/03/1990 muestra el error fijo y la fecha elegida se conserva', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 6, 12, 0))
    AgregarIngresoSimulado.mockRejectedValue(new Error(ERROR_TECNICO))
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await ElegirFecha15DeMarzoDe1990(usuario)
    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo.textContent).toBe(`${MENSAJE_ERROR_ALTA}Aceptar`)
    expect(AgregarIngresoSimulado).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: '1990-03-15' }),
    )

    await usuario.click(within(dialogo).getByRole('button', { name: 'Aceptar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sonda-cuenta')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Fecha')).toHaveTextContent(/^15\/03\/1990$/)
    expect(ObtenerBotonFecha('15/03/1990')).toBeInTheDocument()
    expect(ObtenerCampoMonto()).toHaveValue('500')
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

  it('test_campo_monto_rechaza_signo_y_letras: escribir "-50" muestra "50" y escribir "abc50" muestra "50"; signo y letras rechazados', async () => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '-50')
    expect(ObtenerCampoMonto()).toHaveValue('50')

    await usuario.clear(ObtenerCampoMonto())
    await usuario.type(ObtenerCampoMonto(), 'abc50')
    expect(ObtenerCampoMonto()).toHaveValue('50')
  })

  it('test_campo_monto_muestra_miles: escribir "1500,50" muestra "1.500,50" y AgregarIngreso recibe "1500.50"', async () => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '1500,50')
    expect(ObtenerCampoMonto()).toHaveValue('1.500,50')

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await screen.findByTestId('sonda-cuenta')
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
    expect(AgregarIngresoSimulado).toHaveBeenCalledWith(
      expect.objectContaining({ montoTexto: '1500.50' }),
    )
  })

  it('test_campo_monto_tercer_decimal_rechazado: escribir "10,555" muestra "10,55"', async () => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '10,555')

    expect(ObtenerCampoMonto()).toHaveValue('10,55')
  })

  it('test_monto_maximo_rechazado_sin_llamar_api: con "1000000000000,00" "Guardar" muestra el mensaje del máximo, no llama a AgregarIngreso y conserva lo escrito', async () => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '1000000000000,00')
    expect(ObtenerCampoMonto()).toHaveValue('1.000.000.000.000,00')

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    const dialogo = ObtenerDialogo()
    expect(dialogo.textContent).toBe(`${MENSAJE_MONTO_MAXIMO}Aceptar`)
    expect(AgregarIngresoSimulado).not.toHaveBeenCalled()
    expect(screen.queryByTestId('sonda-cuenta')).not.toBeInTheDocument()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Aceptar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(ObtenerCampoMonto()).toHaveValue('1.000.000.000.000,00')
  })

  it('test_monto_maximo_exacto_se_envia: con "999999999999,99" el campo muestra "999.999.999.999,99" y AgregarIngreso recibe "999999999999.99"', async () => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '999999999999,99')
    expect(ObtenerCampoMonto()).toHaveValue('999.999.999.999,99')

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await screen.findByTestId('sonda-cuenta')
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
    expect(AgregarIngresoSimulado).toHaveBeenCalledWith(
      expect.objectContaining({ montoTexto: '999999999999.99' }),
    )
  })

  it('test_campo_monto_cursor_conservado: con "1.500" y el cursor después del "1", escribir "2" deja "12.500" con el cursor después del "2"', async () => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    const campo = ObtenerCampoMonto()
    await usuario.type(campo, '1500')
    expect(campo).toHaveValue('1.500')

    await usuario.type(campo, '2', { initialSelectionStart: 1, initialSelectionEnd: 1 })

    expect(campo).toHaveValue('12.500')
    expect(campo.selectionStart).toBe(2)
    expect(campo.selectionEnd).toBe(2)
  })

  it('test_campo_monto_pegado_punto_decimal: pegar "1500.50" en el campo vacío muestra "1.500,50" y "Guardar" envía "1500.50"; pegar "1.500" muestra "1.500"', async () => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    const campo = ObtenerCampoMonto()
    await usuario.click(campo)
    await usuario.paste('1.500')
    expect(campo).toHaveValue('1.500')

    await usuario.clear(campo)
    await usuario.paste('1500.50')
    expect(campo).toHaveValue('1.500,50')
    expect(campo.selectionStart).toBe('1.500,50'.length)

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await screen.findByTestId('sonda-cuenta')
    expect(AgregarIngresoSimulado).toHaveBeenCalledWith(
      expect.objectContaining({ montoTexto: '1500.50' }),
    )
  })

  it('test_campo_monto_coma_inicial: en el campo vacío, escribir "," y después "5" deja "0,5" con el cursor al final', async () => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    const campo = ObtenerCampoMonto()
    await usuario.type(campo, ',')
    expect(campo).toHaveValue('0,')
    expect(campo.selectionStart).toBe(2)

    await usuario.type(campo, '5')

    expect(campo).toHaveValue('0,5')
    expect(campo.selectionStart).toBe(3)
    expect(campo.selectionEnd).toBe(3)
  })

  it('test_campo_monto_letra_en_medio_rechazada: con "1.500" y el cursor después del "1", escribir "a" deja "1.500" con el cursor todavía después del "1"', async () => {
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    const campo = ObtenerCampoMonto()
    await usuario.type(campo, '1500')
    expect(campo).toHaveValue('1.500')

    await usuario.type(campo, 'a', { initialSelectionStart: 1, initialSelectionEnd: 1 })

    expect(campo).toHaveValue('1.500')
    expect(campo.selectionStart).toBe(1)
    expect(campo.selectionEnd).toBe(1)
  })

  it('test_mensaje_error_validacion_hasta_aceptar: con "0" el mensaje sigue visible a los 10 s y solo se cierra con "Aceptar", sin perder los datos; monto inválido rechazado sin llamar a la API', async () => {
    RenderizarFormulario()
    await ObtenerTitulo()

    vi.useFakeTimers()
    fireEvent.change(ObtenerCampoMonto(), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(ObtenerDialogo().textContent).toBe(`${MENSAJE_MONTO_INVALIDO}Aceptar`)

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(ObtenerCampoMonto()).toHaveValue('0')
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

  it('test_guardar_doble_clic_duplicado_rechazado: con el alta pendiente, un clic en "Guardar" y un segundo envío del formulario llaman a AgregarIngreso una sola vez', async () => {
    const alta = CrearPromesaControlada()
    AgregarIngresoSimulado.mockReturnValue(alta.promesa)
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '500')
    const botonGuardar = screen.getByRole('button', { name: 'Guardar' })
    const formulario = botonGuardar.closest('form')

    await usuario.click(botonGuardar)
    // El submit llega a onSubmit aunque el botón ya esté deshabilitado: lo corta la guardia.
    fireEvent.submit(formulario)

    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)

    await act(async () => {
      alta.resolver(undefined)
    })

    expect(await screen.findByTestId('sonda-cuenta')).toHaveTextContent(`Cuenta|/|${MENSAJE_EXITO}`)
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(1)
  })

  it('test_guardando_deshabilita_formulario: con el alta pendiente "Guardar" dice "Guardando…" y quedan deshabilitados los campos, el calendario abierto, "Cancelar" y "Volver"; al resolver navega a "/"', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 6, 12, 0))
    const alta = CrearPromesaControlada()
    AgregarIngresoSimulado.mockReturnValue(alta.promesa)
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.click(ObtenerBotonFecha('06/11/2026'))
    // Se envía sin hacer clic fuera del calendario, para que siga abierto al guardar.
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar' }).closest('form'))

    const botonGuardando = await screen.findByRole('button', { name: 'Guardando…' })
    expect(botonGuardando).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument()
    expect(ObtenerCampoMonto()).toBeDisabled()
    expect(screen.getByLabelText('Categoría')).toBeDisabled()
    expect(ObtenerBotonFecha('06/11/2026')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Elegir el año' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Elegir el mes' })).toBeDisabled()
    expect(ObtenerDia(5, 'noviembre de 2026')).toBeDisabled()

    await act(async () => {
      alta.resolver(undefined)
    })

    expect(await screen.findByTestId('sonda-cuenta')).toHaveTextContent(`Cuenta|/|${MENSAJE_EXITO}`)
  })

  it('test_falla_alta_rehabilita_formulario_rechazado: si AgregarIngreso es rechazado muestra el mensaje fijo, vuelve "Guardar" habilitado, conserva los datos y permite volver a guardar', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 6, 12, 0))
    const alta = CrearPromesaControlada()
    AgregarIngresoSimulado.mockReturnValueOnce(alta.promesa)
    const usuario = userEvent.setup()

    RenderizarFormulario()
    await ObtenerTitulo()

    await usuario.type(ObtenerCampoMonto(), '500')
    await usuario.selectOptions(screen.getByLabelText('Categoría'), 'Sueldo')
    await ElegirFecha15DeMarzoDe1990(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeDisabled()

    await act(async () => {
      alta.rechazar(new Error(ERROR_TECNICO))
    })

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo.textContent).toBe(`${MENSAJE_ERROR_ALTA}Aceptar`)
    await usuario.click(within(dialogo).getByRole('button', { name: 'Aceptar' }))

    const botonGuardar = screen.getByRole('button', { name: 'Guardar' })
    expect(botonGuardar).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Guardando…' })).not.toBeInTheDocument()
    expect(ObtenerCampoMonto()).toBeEnabled()
    expect(ObtenerCampoMonto()).toHaveValue('500')
    expect(screen.getByLabelText('Categoría')).toHaveValue('id-sueldo')
    expect(ObtenerBotonFecha('15/03/1990')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeEnabled()

    await usuario.click(botonGuardar)

    expect(await screen.findByTestId('sonda-cuenta')).toHaveTextContent(`Cuenta|/|${MENSAJE_EXITO}`)
    expect(AgregarIngresoSimulado).toHaveBeenCalledTimes(2)
    expect(AgregarIngresoSimulado).toHaveBeenLastCalledWith({
      montoTexto: '500',
      fecha: '1990-03-15',
      idCategoria: 'id-sueldo',
    })
  })
})

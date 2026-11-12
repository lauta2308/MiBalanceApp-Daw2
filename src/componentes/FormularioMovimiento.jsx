import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import MensajeError from './MensajeError.jsx'
import SelectorFecha from './SelectorFecha.jsx'
import { AgregarIngreso } from '../servicios/movimientos.js'
import { ObtenerCategoriasIngreso } from '../servicios/categorias.js'
import { ObtenerFechaHoy } from '../utilidades/fechas.js'
import {
  AplicarMascaraMonto,
  CalcularPosicionCursor,
  ContarSignificativos,
  NormalizarMontoPegado,
} from '../utilidades/mascaraMonto.js'
import {
  MENSAJE_MONTO_INVALIDO,
  MENSAJE_MONTO_MAXIMO,
  ValidarMonto,
  ValidarMontoMaximo,
} from '../utilidades/validacionMonto.js'
import { MENSAJE_EXITO_INGRESO } from '../utilidades/mensajes.js'

const ESTADO_CARGANDO = 'cargando'
const ESTADO_CON_DATOS = 'con-datos'
const ESTADO_CON_ERROR = 'con-error'
const MENSAJE_ERROR_CARGA = 'No se pudo cargar el formulario. Vuelva a intentarlo.'
const MENSAJE_ERROR_ALTA = 'No se pudo registrar el ingreso. Vuelva a intentarlo.'
const RUTA_CUENTA = '/'

function RegistrarErrorTecnico(error) {
  if (import.meta.env.DEV) {
    console.error(error)
  }
}

// Sin la categoría por defecto el ingreso podría quedar sin categoría (RF-36): se trata como error de carga.
async function ObtenerDatosFormulario() {
  try {
    const categorias = await ObtenerCategoriasIngreso()
    const categoriaDefecto = categorias.find((categoria) => categoria.es_defecto === true)

    if (!categoriaDefecto) {
      throw new Error('No hay una categoría de ingreso por defecto')
    }

    return { estado: ESTADO_CON_DATOS, categorias, idCategoriaDefecto: categoriaDefecto.id }
  } catch (error) {
    RegistrarErrorTecnico(error)
    return { estado: ESTADO_CON_ERROR }
  }
}

export default function FormularioMovimiento() {
  const Navegar = useNavigate()
  const idCampoMonto = useId()
  const idCampoCategoria = useId()
  const idCampoFecha = useId()
  const idEtiquetaFecha = useId()
  const [datos, EstablecerDatos] = useState({ estado: ESTADO_CARGANDO })
  const [reintentando, EstablecerReintentando] = useState(false)
  const [montoTexto, EstablecerMontoTexto] = useState('')
  // null mientras el usuario no elija otra: se usa la categoría por defecto (RF-36).
  const [idCategoriaElegida, EstablecerIdCategoriaElegida] = useState(null)
  const [mensajeError, EstablecerMensajeError] = useState(null)
  // Hoy preseleccionado (FR-05); se envía tal cual, sin conversiones, como día calendario local.
  const [fecha, EstablecerFecha] = useState(() => ObtenerFechaHoy())
  const cargaEnCurso = useRef(false)
  // Corta el segundo envío en el mismo tick, antes de que el render deshabilite el formulario (ADR-006).
  const envioEnCurso = useRef(false)
  const [guardando, EstablecerGuardando] = useState(false)
  const campoMonto = useRef(null)
  const posicionCursorPendiente = useRef(null)
  // Cambia en cada tecleo, aunque la máscara deje el texto igual, para volver a ubicar el cursor.
  const [versionMonto, EstablecerVersionMonto] = useState(0)

  useLayoutEffect(() => {
    const posicion = posicionCursorPendiente.current

    if (posicion === null || campoMonto.current === null) {
      return
    }

    campoMonto.current.setSelectionRange(posicion, posicion)
    posicionCursorPendiente.current = null
  }, [versionMonto])

  // Aplica la máscara y deja el cursor con los mismos dígitos y comas a su derecha.
  function ActualizarMonto(valorCrudo, posicionCursorCruda) {
    const montoConMascara = AplicarMascaraMonto(valorCrudo)
    const significativosDespues = ContarSignificativos(valorCrudo.slice(posicionCursorCruda))
    // Si la máscara descartó caracteres, el conteo no puede superar a los que quedaron.
    const significativosConservados = Math.min(
      significativosDespues,
      ContarSignificativos(montoConMascara),
    )

    EstablecerMontoTexto(montoConMascara)
    posicionCursorPendiente.current = CalcularPosicionCursor(montoConMascara, significativosConservados)
    EstablecerVersionMonto((version) => version + 1)
  }

  function ManejarCambioMonto(evento) {
    const valor = evento.target.value
    const posicionCursor = evento.target.selectionStart ?? valor.length
    ActualizarMonto(valor, posicionCursor)
  }

  // "1500.50" pegado se lee como decimal; el resto sigue el camino del tecleo.
  function ManejarPegadoMonto(evento) {
    const textoPegado = evento.clipboardData.getData('text')
    const textoNormalizado = NormalizarMontoPegado(textoPegado)

    if (textoNormalizado === textoPegado) {
      return
    }

    evento.preventDefault()
    const campo = evento.target
    const inicioSeleccion = campo.selectionStart ?? campo.value.length
    const finSeleccion = campo.selectionEnd ?? inicioSeleccion
    const valorCrudo =
      campo.value.slice(0, inicioSeleccion) + textoNormalizado + campo.value.slice(finSeleccion)

    ActualizarMonto(valorCrudo, inicioSeleccion + textoNormalizado.length)
  }

  const IniciarCarga = useCallback(async () => {
    if (cargaEnCurso.current) {
      return
    }

    cargaEnCurso.current = true
    const datosObtenidos = await ObtenerDatosFormulario()
    cargaEnCurso.current = false

    EstablecerDatos(datosObtenidos)
    EstablecerReintentando(false)
  }, [])

  // En modo estricto el efecto corre dos veces: la segunda encuentra la carga en curso.
  useEffect(() => {
    IniciarCarga()
  }, [IniciarCarga])

  function ManejarAceptarErrorCarga() {
    EstablecerReintentando(true)
    IniciarCarga()
  }

  // Cierra el mensaje y deja el formulario con los datos cargados.
  function ManejarAceptarError() {
    EstablecerMensajeError(null)
  }

  function ManejarVolver() {
    Navegar(RUTA_CUENTA)
  }

  const idCategoria = idCategoriaElegida ?? datos.idCategoriaDefecto

  async function ManejarEnvio(evento) {
    evento.preventDefault()

    if (envioEnCurso.current) {
      return
    }

    const montoValidado = ValidarMonto(montoTexto)

    if (montoValidado === null) {
      EstablecerMensajeError(MENSAJE_MONTO_INVALIDO)
      return
    }

    if (!ValidarMontoMaximo(montoValidado)) {
      EstablecerMensajeError(MENSAJE_MONTO_MAXIMO)
      return
    }

    envioEnCurso.current = true
    EstablecerGuardando(true)

    try {
      await AgregarIngreso({ montoTexto: montoValidado, fecha, idCategoria })
    } catch (error) {
      RegistrarErrorTecnico(error)
      envioEnCurso.current = false
      EstablecerGuardando(false)
      EstablecerMensajeError(MENSAJE_ERROR_ALTA)
      return
    }

    // La guardia queda activa: el formulario se desmonta al navegar.
    Navegar(RUTA_CUENTA, { state: { mensajeExito: MENSAJE_EXITO_INGRESO } })
  }

  if (datos.estado === ESTADO_CARGANDO) {
    return <p>Cargando…</p>
  }

  if (datos.estado === ESTADO_CON_ERROR) {
    return (
      <MensajeError
        mensaje={MENSAJE_ERROR_CARGA}
        alAceptar={ManejarAceptarErrorCarga}
        deshabilitado={reintentando}
      />
    )
  }

  return (
    <section className="formulario-movimiento">
      <header className="encabezado-formulario">
        <button
          type="button"
          className="boton-volver"
          aria-label="Volver"
          onClick={ManejarVolver}
          disabled={guardando}
        >
          ←
        </button>
        <h1>Añadir Ingreso</h1>
      </header>

      <form onSubmit={ManejarEnvio} noValidate>
        {/* Deshabilita de una vez los campos, el calendario abierto, "Guardar" y "Cancelar". */}
        <fieldset className="campos-formulario" disabled={guardando}>
          <div className="campo-formulario">
            <label htmlFor={idCampoMonto}>Monto</label>
            <input
              id={idCampoMonto}
              ref={campoMonto}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={montoTexto}
              onChange={ManejarCambioMonto}
              onPaste={ManejarPegadoMonto}
            />
          </div>

          <div className="campo-formulario">
            <label htmlFor={idCampoCategoria}>Categoría</label>
            <select
              id={idCampoCategoria}
              value={idCategoria}
              onChange={(evento) => EstablecerIdCategoriaElegida(evento.target.value)}
            >
              {datos.categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="campo-formulario">
            <label htmlFor={idCampoFecha} id={idEtiquetaFecha}>
              Fecha
            </label>
            <SelectorFecha
              fecha={fecha}
              alCambiar={EstablecerFecha}
              idCampo={idCampoFecha}
              idEtiqueta={idEtiquetaFecha}
            />
          </div>

          <div className="acciones-formulario">
            <button type="submit" className="boton-principal">
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" className="boton-secundario" onClick={ManejarVolver}>
              Cancelar
            </button>
          </div>
        </fieldset>
      </form>

      {mensajeError && (
        <MensajeError mensaje={mensajeError} alAceptar={ManejarAceptarError} />
      )}
    </section>
  )
}

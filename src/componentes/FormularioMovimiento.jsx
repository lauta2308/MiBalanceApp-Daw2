import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import MensajeError from './MensajeError.jsx'
import { AgregarIngreso } from '../servicios/movimientos.js'
import { ObtenerCategoriasIngreso } from '../servicios/categorias.js'
import { FormatearFecha, ObtenerFechaHoy } from '../utilidades/fechas.js'
import { MENSAJE_MONTO_INVALIDO, ValidarMonto } from '../utilidades/validacionMonto.js'
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
  const [datos, EstablecerDatos] = useState({ estado: ESTADO_CARGANDO })
  const [reintentando, EstablecerReintentando] = useState(false)
  const [montoTexto, EstablecerMontoTexto] = useState('')
  // null mientras el usuario no elija otra: se usa la categoría por defecto (RF-36).
  const [idCategoriaElegida, EstablecerIdCategoriaElegida] = useState(null)
  const [mensajeError, EstablecerMensajeError] = useState(null)
  const [fecha] = useState(() => ObtenerFechaHoy())
  const cargaEnCurso = useRef(false)

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

    const montoValidado = ValidarMonto(montoTexto)

    if (montoValidado === null) {
      EstablecerMensajeError(MENSAJE_MONTO_INVALIDO)
      return
    }

    try {
      await AgregarIngreso({ montoTexto: montoValidado, fecha, idCategoria })
    } catch (error) {
      RegistrarErrorTecnico(error)
      EstablecerMensajeError(MENSAJE_ERROR_ALTA)
      return
    }

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
        <button type="button" className="boton-volver" aria-label="Volver" onClick={ManejarVolver}>
          ←
        </button>
        <h1>Añadir Ingreso</h1>
      </header>

      <form onSubmit={ManejarEnvio} noValidate>
        <div className="campo-formulario">
          <label htmlFor={idCampoMonto}>Monto</label>
          <input
            id={idCampoMonto}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={montoTexto}
            onChange={(evento) => EstablecerMontoTexto(evento.target.value)}
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
          <label htmlFor={idCampoFecha}>Fecha</label>
          <input id={idCampoFecha} type="text" value={FormatearFecha(fecha)} readOnly />
        </div>

        <div className="acciones-formulario">
          <button type="submit" className="boton-principal">
            Guardar
          </button>
          <button type="button" className="boton-secundario" onClick={ManejarVolver}>
            Cancelar
          </button>
        </div>
      </form>

      {mensajeError && (
        <MensajeError mensaje={mensajeError} alAceptar={ManejarAceptarError} />
      )}
    </section>
  )
}

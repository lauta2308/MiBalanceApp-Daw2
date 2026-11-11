import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import ListaMovimientos from '../componentes/ListaMovimientos.jsx'
import MensajeError from '../componentes/MensajeError.jsx'
import MensajeExito from '../componentes/MensajeExito.jsx'
import { ObtenerCuenta } from '../servicios/cuentas.js'
import { ObtenerMovimientos } from '../servicios/movimientos.js'
import { FormatearFecha } from '../utilidades/fechas.js'
import { FormatearMontoMovimiento, FormatearSaldo } from '../utilidades/formatoMoneda.js'
import { MENSAJE_EXITO_INGRESO } from '../utilidades/mensajes.js'

const ESTADO_CARGANDO = 'cargando'
const ESTADO_CON_DATOS = 'con-datos'
const ESTADO_CON_ERROR = 'con-error'
const MENSAJE_ERROR_CARGA = 'No se pudo cargar su cuenta. Vuelva a intentarlo.'
const RUTA_FORMULARIO_INGRESO = '/ingresos/nuevo'

// Un formato inválido lanza: se trata como error de carga y nunca se muestra un monto incorrecto.
function PrepararMovimiento({ id, tipo, monto, fecha, nombreCategoria }) {
  return {
    id,
    tipo,
    fecha: FormatearFecha(fecha),
    monto: FormatearMontoMovimiento(monto, tipo),
    nombreCategoria,
  }
}

async function ObtenerDatosPantalla() {
  try {
    const [cuenta, movimientos] = await Promise.all([ObtenerCuenta(), ObtenerMovimientos()])

    return {
      estado: ESTADO_CON_DATOS,
      encabezado: `${cuenta.nombre} (${cuenta.moneda})`,
      saldo: FormatearSaldo(cuenta.saldo, cuenta.moneda),
      movimientos: movimientos.map(PrepararMovimiento),
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(error)
    }
    return { estado: ESTADO_CON_ERROR }
  }
}

// Solo se acepta el texto fijo del alta: cualquier otro state de la navegación se ignora.
function ObtenerMensajeExitoAceptado(estadoNavegacion) {
  return estadoNavegacion?.mensajeExito === MENSAJE_EXITO_INGRESO ? MENSAJE_EXITO_INGRESO : null
}

export default function SeccionCuenta() {
  const ubicacion = useLocation()
  const Navegar = useNavigate()
  const [datos, EstablecerDatos] = useState({ estado: ESTADO_CARGANDO })
  const [reintentando, EstablecerReintentando] = useState(false)
  // Se captura una sola vez al montar: limpiar el state después no lo pierde, tampoco en modo estricto.
  const [mensajeExito, EstablecerMensajeExito] = useState(() =>
    ObtenerMensajeExitoAceptado(ubicacion.state),
  )
  const cargaEnCurso = useRef(false)

  const IniciarCarga = useCallback(async () => {
    if (cargaEnCurso.current) {
      return
    }

    cargaEnCurso.current = true
    const datosObtenidos = await ObtenerDatosPantalla()
    cargaEnCurso.current = false

    EstablecerDatos(datosObtenidos)
    EstablecerReintentando(false)
  }, [])

  // En modo estricto el efecto corre dos veces: la segunda encuentra la carga en curso.
  useEffect(() => {
    IniciarCarga()
  }, [IniciarCarga])

  // Limpia el state para que volver atrás o recargar no muestre el mensaje otra vez.
  useEffect(() => {
    if (ubicacion.state != null) {
      Navegar(ubicacion.pathname, { replace: true, state: null })
    }
  }, [Navegar, ubicacion.pathname, ubicacion.state])

  function ManejarAceptar() {
    EstablecerReintentando(true)
    IniciarCarga()
  }

  function ManejarAnadirIngreso() {
    Navegar(RUTA_FORMULARIO_INGRESO)
  }

  const ManejarCierreMensajeExito = useCallback(() => {
    EstablecerMensajeExito(null)
  }, [])

  if (datos.estado === ESTADO_CARGANDO) {
    return <p>Cargando…</p>
  }

  if (datos.estado === ESTADO_CON_ERROR) {
    return (
      <MensajeError
        mensaje={MENSAJE_ERROR_CARGA}
        alAceptar={ManejarAceptar}
        deshabilitado={reintentando}
      />
    )
  }

  return (
    <section className="seccion-cuenta">
      <MensajeExito mensaje={mensajeExito} alCerrar={ManejarCierreMensajeExito} />
      <h1>{datos.encabezado}</h1>
      <p className="saldo-cuenta">{datos.saldo}</p>
      <button type="button" className="boton-principal" onClick={ManejarAnadirIngreso}>
        Añadir Ingreso
      </button>
      {datos.movimientos.length === 0 ? (
        <p>Aquí verá sus movimientos.</p>
      ) : (
        <ListaMovimientos movimientos={datos.movimientos} />
      )}
    </section>
  )
}

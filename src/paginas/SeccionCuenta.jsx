import { useCallback, useEffect, useRef, useState } from 'react'
import MensajeError from '../componentes/MensajeError.jsx'
import { ContarMovimientos, ObtenerCuenta } from '../servicios/cuentas.js'
import { FormatearSaldo } from '../utilidades/formatoMoneda.js'

const ESTADO_CARGANDO = 'cargando'
const ESTADO_CON_DATOS = 'con-datos'
const ESTADO_CON_ERROR = 'con-error'
const MENSAJE_ERROR_CARGA = 'No se pudo cargar su cuenta. Vuelva a intentarlo.'

async function ObtenerDatosPantalla() {
  try {
    const [cuenta, cantidadMovimientos] = await Promise.all([ObtenerCuenta(), ContarMovimientos()])

    return {
      estado: ESTADO_CON_DATOS,
      encabezado: `${cuenta.nombre} (${cuenta.moneda})`,
      saldo: FormatearSaldo(cuenta.saldo, cuenta.moneda),
      sinMovimientos: cantidadMovimientos === 0,
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(error)
    }
    return { estado: ESTADO_CON_ERROR }
  }
}

export default function SeccionCuenta() {
  const [datos, EstablecerDatos] = useState({ estado: ESTADO_CARGANDO })
  const [reintentando, EstablecerReintentando] = useState(false)
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

  function ManejarAceptar() {
    EstablecerReintentando(true)
    IniciarCarga()
  }

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
    <section>
      <h1>{datos.encabezado}</h1>
      <p>{datos.saldo}</p>
      {datos.sinMovimientos && <p>Aquí verás sus movimientos.</p>}
    </section>
  )
}

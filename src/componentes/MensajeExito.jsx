import { useEffect, useEffectEvent } from 'react'

const DURACION_MENSAJE_MS = 3000

// La región role="status" queda siempre montada y solo cambia su texto: así los lectores de
// pantalla anuncian el mensaje cuando llega. Se cierra sola, sin botón.
export default function MensajeExito({ mensaje, alCerrar }) {
  // Un alCerrar nuevo en otro render no reinicia la cuenta de los 3 segundos.
  const Cerrar = useEffectEvent(() => {
    alCerrar()
  })

  useEffect(() => {
    if (!mensaje) {
      return undefined
    }

    const idTemporizador = setTimeout(() => Cerrar(), DURACION_MENSAJE_MS)

    return () => {
      clearTimeout(idTemporizador)
    }
  }, [mensaje])

  return (
    <div className="mensaje-exito" role="status">
      {mensaje}
    </div>
  )
}

import { useId } from 'react'

export default function MensajeError({ mensaje, alAceptar, deshabilitado = false }) {
  const idMensaje = useId()

  return (
    <div className="mensaje-error" role="alertdialog" aria-modal="true" aria-labelledby={idMensaje}>
      <p id={idMensaje}>{mensaje}</p>
      <button type="button" onClick={alAceptar} disabled={deshabilitado}>
        Aceptar
      </button>
    </div>
  )
}

import { useId, useRef, useState } from 'react'
import {
  DayPicker,
  formatCaption,
  formatMonthDropdown,
  formatWeekdayName,
} from 'react-day-picker'
import { es } from 'react-day-picker/locale'
import {
  ConvertirFechaATexto,
  ConvertirTextoAFecha,
  FormatearFecha,
  ObtenerFechaHoy,
} from '../utilidades/fechas.js'

// Enero de 1900 es el límite de la navegación, no una fecha mínima de la regla (FR-07).
const PRIMER_MES_NAVEGABLE = new Date(1900, 0)

function PonerMayusculaInicial(texto) {
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1)
}

// El encabezado del mes y los de la tabla son títulos: mayúscula inicial ("Noviembre 2026", "Lu").
const FORMATEADORES = {
  formatCaption: (mes, opciones, bibliotecaFechas) =>
    PonerMayusculaInicial(formatCaption(mes, opciones, bibliotecaFechas)),
  formatMonthDropdown: (mes, bibliotecaFechas) =>
    PonerMayusculaInicial(formatMonthDropdown(mes, bibliotecaFechas)),
  formatWeekdayName: (diaSemana, opciones, bibliotecaFechas) =>
    PonerMayusculaInicial(formatWeekdayName(diaSemana, opciones, bibliotecaFechas)),
}

export default function SelectorFecha({ fecha, alCambiar, idCampo, idEtiqueta }) {
  const idCalendario = useId()
  const idTextoFecha = useId()
  const [abierto, EstablecerAbierto] = useState(false)
  const botonFecha = useRef(null)
  const fechaSeleccionada = ConvertirTextoAFecha(fecha)
  const hoy = ConvertirTextoAFecha(ObtenerFechaHoy())

  // El calendario se desmonta al cerrarse: sin devolver el foco, quedaría en el body.
  function CerrarCalendario() {
    EstablecerAbierto(false)
    botonFecha.current.focus()
  }

  function ManejarClicBoton() {
    EstablecerAbierto((estabaAbierto) => !estabaAbierto)
  }

  // Con required, elegir de nuevo el día seleccionado lo devuelve igual, nunca vacío (FR-04).
  function ManejarSeleccion(diaElegido) {
    alCambiar(ConvertirFechaATexto(diaElegido))
    CerrarCalendario()
  }

  // Escape cierra sin elegir: la fecha queda como estaba.
  function ManejarTeclaCalendario(evento) {
    if (evento.key === 'Escape') {
      evento.preventDefault()
      CerrarCalendario()
    }
  }

  // El nombre accesible es "Fecha 06/11/2026" (RNF-08). Se referencia el texto y no el propio botón:
  // con la etiqueta apuntándole por htmlFor, algunas implementaciones resuelven el botón como "Fecha".
  return (
    <div className="selector-fecha">
      <button
        type="button"
        id={idCampo}
        ref={botonFecha}
        className="boton-selector-fecha"
        aria-labelledby={`${idEtiqueta} ${idTextoFecha}`}
        aria-expanded={abierto}
        aria-controls={abierto ? idCalendario : undefined}
        onClick={ManejarClicBoton}
      >
        <span id={idTextoFecha}>{FormatearFecha(fecha)}</span>
      </button>
      {abierto && (
        <div
          id={idCalendario}
          className="calendario-selector-fecha"
          onKeyDown={ManejarTeclaCalendario}
        >
          <DayPicker
            mode="single"
            required
            autoFocus
            selected={fechaSeleccionada}
            onSelect={ManejarSeleccion}
            defaultMonth={fechaSeleccionada}
            disabled={{ after: hoy }}
            captionLayout="dropdown"
            startMonth={PRIMER_MES_NAVEGABLE}
            endMonth={hoy}
            locale={es}
            formatters={FORMATEADORES}
          />
        </div>
      )}
    </div>
  )
}

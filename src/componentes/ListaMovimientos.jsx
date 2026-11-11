// Recibe los movimientos ya ordenados y con la fecha y el monto formateados.
// Agrupa los consecutivos de la misma fecha para respetar el orden recibido.
function AgruparPorFecha(movimientos) {
  const grupos = []

  for (const movimiento of movimientos) {
    const ultimoGrupo = grupos.at(-1)

    if (ultimoGrupo && ultimoGrupo.fecha === movimiento.fecha) {
      ultimoGrupo.movimientos.push(movimiento)
    } else {
      grupos.push({ fecha: movimiento.fecha, movimientos: [movimiento] })
    }
  }

  return grupos
}

export default function ListaMovimientos({ movimientos }) {
  const grupos = AgruparPorFecha(movimientos)

  return (
    <div className="lista-movimientos">
      {grupos.map((grupo) => (
        <section key={grupo.movimientos[0].id} className="grupo-movimientos">
          <h2>{grupo.fecha}</h2>
          <ul>
            {grupo.movimientos.map((movimiento) => (
              <li key={movimiento.id} className="movimiento">
                <span className="categoria-movimiento">{movimiento.nombreCategoria}</span>
                <span className={`monto-movimiento monto-${movimiento.tipo.toLowerCase()}`}>
                  {movimiento.monto}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

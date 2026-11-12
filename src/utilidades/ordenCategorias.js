// No distingue mayúsculas ni tildes: "alquiler" < "Ómnibus" < "Ventas" (ADR-004).
const comparadorNombres = new Intl.Collator('es', { sensitivity: 'base' })

function CompararCategorias(categoriaA, categoriaB) {
  if (categoriaA.es_defecto === true && categoriaB.es_defecto !== true) {
    return -1
  }

  if (categoriaB.es_defecto === true && categoriaA.es_defecto !== true) {
    return 1
  }

  return comparadorNombres.compare(categoriaA.nombre, categoriaB.nombre)
}

// Devuelve una copia: primero la categoría por defecto y después el resto en orden alfabético.
// Con nombres iguales para el comparador se mantiene el orden recibido (sort es estable).
export function OrdenarCategorias(categorias) {
  return [...categorias].sort(CompararCategorias)
}

# ADR-005: Máscara del monto propia sobre texto, sin librería de formato numérico

| Field | Value |
|-------|-------|
| Date | 2026-11-12 |
| Ticket | FEAT-001d |
| Status | Accepted |

## Context
FEAT-001d pidió que el campo "Monto" aceptara solo dígitos y una coma, con dos decimales como máximo, y mostrara el punto de miles mientras se escribe (RF-44, RF-43). Desde FEAT-001b el monto se manejaba solo como texto, de punta a punta, para no perder precisión (RNF-04, `validacionMonto.js`, `formatoMoneda.js`). El tope de 999.999.999.999,99 tiene 14 cifras significativas, al borde de lo que un `Number` de JavaScript representa sin error.

## Options considered

### Option 1: Librería de entrada numérica (react-number-format u otra)
- **Pros:** resolvía el cursor, el pegado y los separadores con código ya probado.
- **Cons:** sumaba una dependencia para un solo campo. Varias de estas librerías exponen el valor como `Number` o lo convierten internamente, lo que choca con RNF-04. Su configuración regional y su API de valores obligaban a adaptar `ValidarMonto` igual.

### Option 2: Máscara propia sobre texto
- **Pros:** sin dependencias. El valor nunca deja de ser texto. Era fácil de probar como función pura.
- **Cons:** la posición del cursor al editar en el medio del número quedaba a cargo del proyecto. El pegado de montos con punto decimal ("1500.50") necesitaba una regla propia.

## Decision
Se eligió la opción 2. RNF-04 pesó más que el ahorro de código: el proyecto ya había decidido no convertir montos a `Number`, y una librería reabría ese riesgo en el único punto de entrada de montos. El cursor se resolvió contando dígitos y comas después de la posición del cursor, una cantidad que no cambia al agregar o quitar ceros iniciales y puntos de miles.

## Consequences
- Se agregó `src/utilidades/mascaraMonto.js` (`AplicarMascaraMonto`, `CalcularPosicionCursor`). `ValidarMonto` pasó a leer el texto con formato ("1.500,50").
- El punto dejó de aceptarse como separador decimal en el campo: ahora es solo el separador de miles.
- El mantenimiento del manejo del cursor quedó en el proyecto. Su cobertura son las pruebas de `mascaraMonto.test.js` y `FormularioMovimiento.test.jsx`.
- Al pegar, un texto con un solo punto seguido de uno o dos dígitos y sin coma ("1500.50") se lee con ese punto como decimal; lo eligió el usuario el 2026-11-12. Al teclear, el punto sigue siendo siempre de miles.

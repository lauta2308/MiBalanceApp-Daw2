# ADR-003: Prueba de la atomicidad del alta de un movimiento con un script SQL

| Field | Value |
|-------|-------|
| Date | 2026-11-11 |
| Ticket | FEAT-001b |
| Status | Accepted |

## Context
AC-31 de `prd-FEAT-001b.md` pide demostrar que, si el alta de un ingreso falla después de escribir el movimiento y antes de actualizar el saldo, la cuenta queda igual que antes. Según ADR-001, el alta corre en una única función, `BASP_AGREGAR_MOVIMIENTO`, y PostgreSQL revierte la función completa ante cualquier error. El problema era provocar una falla a mitad de camino: desde supabase-js no se controla la transacción, y el proyecto usa un único Supabase, compartido por desarrollo y pruebas.

## Options considered

### Option 1: Script SQL manual y prueba de UI
- **Pros:** ejecuta la función real sin modificarla; el trigger temporal que provoca la falla se crea y se revierte dentro de la misma transacción, así que no queda en la base de datos; la prueba de UI con la API simulada sí corre en `npm test`.
- **Cons:** la parte de la base de datos se corre a mano en el SQL Editor y no forma parte del CI.

### Option 2: Parámetro oculto que fuerza la falla
- **Pros:** prueba automática y completa contra Supabase real.
- **Cons:** agrega a una función `security definer` de producción un camino que solo existe para pruebas, protegido por el metadato `es_prueba`, que el propio cliente define al registrarse.

### Option 3: Solo la prueba de UI
- **Pros:** es la opción más simple y no necesita nada manual.
- **Cons:** la consistencia de la base de datos queda como una afirmación que ninguna prueba demuestra.

## Decision
El usuario eligió la opción 1 en PLAN, el 2026-11-11. Fue la única que prueba la función real sin agregarle código a la función de producción. La misma decisión fijó que `BASP_AGREGAR_MOVIMIENTO` toma la cuenta de `auth.uid()` en lugar de recibir su id, así que no existe un parámetro con el que se pueda escribir en una cuenta ajena.

## Consequences
- Se agrega `supabase/scripts/pruebas_movimientos.sql`. Ese mismo script cubre los pendientes de FEAT-001a: borrar un usuario con movimientos y rechazar el borrado de una categoría en uso.
- Cada cambio en las funciones `BASP_` exige volver a correr el script a mano. VERIFY registra el resultado.
- `pruebas/movimientos.test.js` prueba los rechazos y la propiedad de los datos contra la API real, pero no la falla a mitad de camino.

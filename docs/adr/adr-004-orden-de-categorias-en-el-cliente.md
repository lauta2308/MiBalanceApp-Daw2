# ADR-004: Orden de las categorías en el cliente con Intl.Collator

| Field | Value |
|-------|-------|
| Date | 2026-11-11 |
| Ticket | FEAT-001c |
| Status | Accepted |

## Context
FR-02 de `prd-FEAT-001c.md` pide mostrar "Pago Ingresado" primero y después el resto de las categorías en orden alfabético, sin distinguir mayúsculas ni tildes (AC-11: "alquiler", "Ómnibus", "Ventas"). FEAT-001b ordenaba en PostgreSQL con `.order('es_defecto').order('nombre')`. Con la collation determinística de la base, "Ómnibus" queda después de "Ventas" y las mayúsculas van antes que las minúsculas. La futura sección Categorías (RF-71) usa el mismo criterio.

## Options considered

### Option 1: Ordenar en el cliente con `Intl.Collator('es', { sensitivity: 'base' })`
- **Pros:** sin migraciones; una sola función pura (`OrdenarCategorias`) que se prueba sin base de datos y que la sección Categorías puede reutilizar; el resultado no depende de la collation del proyecto de Supabase.
- **Cons:** el orden lo resuelve cada navegador con su ICU; no sirve para paginar categorías en el servidor.

### Option 2: Collation ICU no determinística en la base (`und-u-ks-level1`) sobre `nombre`
- **Pros:** el orden sale ordenado de la consulta y valdría para paginar.
- **Cons:** requiere una migración que cambia el tipo de la columna; las collations no determinísticas cambian también la igualdad y el `like`, lo que afecta la futura regla de nombres únicos; es más difícil de probar sin Supabase.

### Option 3: Columna normalizada (`nombre_orden`, sin tildes y en minúsculas) mantenida por trigger
- **Pros:** orden en el servidor con un índice simple.
- **Cons:** otra columna y otro trigger para un dato derivado; la normalización de tildes queda escrita a mano en SQL.

## Decision
Se eligió la opción 1. Las categorías de una cuenta son pocas y se cargan enteras en cada pantalla, así que el orden en el servidor no aporta nada hoy, y la opción 1 no toca el esquema. `ObtenerCategoriasIngreso` dejó de ordenar en SQL y aplica `OrdenarCategorias`.

## Consequences
- Nuevo `src/utilidades/ordenCategorias.js`; cambian `src/servicios/categorias.js` y sus pruebas.
- El criterio de orden vive en un solo lugar del frontend y la sección Categorías lo reutiliza.
- Si alguna vez se paginan las categorías en el servidor, esta decisión se revisa con un ADR nuevo.

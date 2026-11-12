# ADR-006: Doble envío del alta evitado en el cliente

| Field | Value |
|-------|-------|
| Date | 2026-11-12 |
| Ticket | FEAT-001e |
| Status | Accepted |

## Context
Hasta FEAT-001d, "Guardar" en "Añadir Ingreso" seguía habilitado mientras `AgregarIngreso` esperaba la respuesta de `BASP_AGREGAR_MOVIMIENTO`: un doble clic registraba dos ingresos (riesgo dejado para FEAT-001e en `threat-FEAT-001b.md`). El PRD (FR-02, AC-21) pide que cada confirmación registre un solo ingreso, con el botón deshabilitado y el texto "Guardando…".

## Options considered

### Option 1: deshabilitar el botón solo con estado de React
- **Pros:** un cambio mínimo en `FormularioMovimiento.jsx`.
- **Cons:** el estado se aplica en el render siguiente; dos eventos de envío en el mismo tick (doble clic rápido, Enter repetido) pasaban los dos antes de que el botón se deshabilitara.

### Option 2: clave de idempotencia generada en el cliente y restricción única en el servidor
- **Pros:** también cubría reintentos de red y envíos desde otra pestaña.
- **Cons:** cambiaba el esquema de `BAT_MOVIMIENTOS` y la firma de `BASP_AGREGAR_MOVIMIENTO`, con una migración nueva; el PRD no pedía reintentos automáticos y no había ningún reintento sin intervención del usuario.

### Option 3: guardia sincrónica en el cliente más controles deshabilitados
- **Pros:** una referencia (`useRef`) cortaba el segundo envío en el mismo tick; un `fieldset` deshabilitado bloqueaba monto, categoría, fecha, "Guardar" y "Cancelar" de una vez; sin cambios en la base.
- **Cons:** no protegía contra dos pestañas ni contra un cliente que llamara la RPC directamente.

## Decision
Se eligió la opción 3: cumplía FR-02 y AC-21 con el patrón de guardia por referencia que ya usaban las cargas (`cargaEnCurso`) y sin tocar el esquema. Un usuario que llame la RPC dos veces a propósito solo registra sus propios ingresos, que RNF-03 ya aísla de los demás.

## Consequences
- `FormularioMovimiento.jsx` sumó el estado `guardando` y la guardia `envioEnCurso`; `estilos.css`, el estilo de controles deshabilitados.
- Dos pestañas abiertas pueden registrar el mismo ingreso dos veces; queda aceptado.
- Si más adelante se agregan reintentos automáticos, la clave de idempotencia de la opción 2 vuelve a ser necesaria y requiere un ADR nuevo.

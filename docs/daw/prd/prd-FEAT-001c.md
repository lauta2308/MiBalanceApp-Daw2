# PRD FEAT-001c: Elegir categoría y fecha del ingreso

| Field | Value |
|-------|-------|
| Ticket | FEAT-001c |
| Tracker | none |
| Date | 2026-11-07 |
| PRD loops | 0 |
| Loops since last human decision | 0 |
| Padre | `prd-FEAT-001.md` (índice de la división) |
| Fuente | `PRD.md` (PRD-001 — MiBalance), entre paréntesis el RF/AC de origen |

## Context and Problem

Con FEAT-001b el ingreso se registra siempre con "Pago Ingresado" y la fecha de hoy. Este sub-ticket permite elegir otra categoría de ingreso y otra fecha pasada mediante un calendario, y ordena la lista de movimientos por fecha y momento del alta.

## Goals

- G-1: El usuario puede registrar un ingreso en cualquier categoría de ingreso de su cuenta y en cualquier fecha hasta hoy.
- G-2: La lista de la sección Cuenta muestra primero lo más reciente.

## Functional Requirements

- FR-01 (RF-30, RF-39): El sistema debe permitir elegir la categoría del ingreso en un selector que muestra solo las categorías de tipo ingreso de la cuenta.
- FR-02 (RF-40, RF-71): El sistema debe ordenar las opciones del selector con "Pago Ingresado" primero y después las demás categorías de ingreso en orden alfabético, sin distinguir mayúsculas/minúsculas ni tildes.
- FR-03 (RF-37): El sistema debe mostrar un calendario para seleccionar solo la fecha (sin hora) del ingreso.
- FR-04 (RF-33): El sistema debe tener siempre una fecha seleccionada en el calendario, sin una opción para dejarla vacía.
- FR-05 (RF-34): El sistema debe preseleccionar en el calendario el día de hoy según la fecha local del dispositivo.
- FR-06 (RF-38): El sistema debe deshabilitar en el calendario los días posteriores a hoy según la fecha local del dispositivo.
- FR-07 (RF-108): El sistema debe aceptar cualquier fecha pasada, sin una fecha mínima.
- FR-08 (RF-48): El sistema debe ordenar la lista de movimientos de la fecha más reciente a la más antigua y, dentro de una misma fecha, del alta más reciente a la más antigua.

## Non-Functional Requirements

- NFR-01 (riesgo de zona horaria de `PRD.md`): El 100% de las fechas registradas deben coincidir con el día elegido por el usuario en el calendario, en cualquier zona horaria del dispositivo, con 0 días de corrimiento.

## Acceptance Criteria
*(EARS — see `.daw/rules/validation-rules.instructions.md` §1 for the five patterns)*

- AC-05 (FR-01): WHEN el usuario A con saldo USD 10.000,00 y una categoría de ingresos "Sueldo" presiona "Añadir Ingreso", ingresa el monto 1000, selecciona "Sueldo", deja la fecha de hoy y presiona "Guardar", THE sistema SHALL mostrar en la lista, bajo la fecha de hoy, un movimiento con la categoría "Sueldo" y el monto "+1.000,00", el saldo "USD 11.000,00" y el mensaje "Ingreso registrado con éxito.". *(AC-44)*
- AC-10 (FR-01): WHEN el usuario A con una categoría de gastos "Mercado" y una de ingresos "Sueldo" abre el selector de categoría de "Añadir Ingreso", THE sistema SHALL mostrar solo "Pago Ingresado" y "Sueldo", sin "Pago Realizado", "Mercado" ni una opción vacía o "sin categoría". *(AC-54)*
- AC-11 (FR-02): WHEN el usuario A con las categorías de ingresos "Ventas", "alquiler" y "Ómnibus" abre el selector de categoría de "Añadir Ingreso", THE sistema SHALL mostrar las opciones en este orden: "Pago Ingresado", "alquiler", "Ómnibus" y "Ventas". *(AC-58)*
- AC-12 (FR-03, FR-04, FR-05, FR-06): WHEN el usuario A abre el selector de fecha de "Añadir Ingreso", THE sistema SHALL mostrar un calendario para seleccionar solo la fecha, con el día de hoy (fecha local del dispositivo) preseleccionado, sin opción para dejar la fecha vacía y con los días posteriores a hoy deshabilitados y sin poder seleccionarse. *(AC-53, AC-56)*
- AC-13 (FR-05, NFR-01): WHILE el dispositivo del usuario A está en una zona horaria UTC-3 y son las 22:00 del 06/11/2026 en hora local (01:00 del 07/11/2026 en UTC), THE sistema SHALL preseleccionar el 06/11/2026 en el calendario de "Añadir Ingreso" y registrar el ingreso guardado con esa fecha.
- AC-14 (FR-07): WHEN el usuario A con saldo USD 10.000,00 elige en el calendario la fecha 15/03/1990, ingresa el monto 100 y guarda, THE sistema SHALL registrar el ingreso bajo el grupo "15/03/1990" y mostrar el saldo "USD 10.100,00". *(AC-132)*
- AC-23 (FR-08): WHEN el usuario A registra un ingreso de 1.500 en "Sueldo" del 17/09/2026, luego uno de 50.000 en "Ventas" del 01/10/2026 y luego uno de 800 en "Pago Ingresado" del 01/10/2026, y accede a la sección Cuenta, THE sistema SHALL mostrar primero el grupo "01/10/2026" con "Pago Ingresado" seguido de "Ventas", y después el grupo "17/09/2026" con "Sueldo". *(AC-36)*

## Out of Scope

- Crear categorías propias: las categorías de ingreso que usan los AC se cargan como datos de prueba (RF-74, sección Categorías).
- Formato del monto y rechazos de validación desde la API (FEAT-001d), incluida la fecha posterior a mañana en UTC.
- Reinicio del formulario y mensajes (FEAT-001e).
- Gastos, edición, eliminación y paginación.

## Risks and Mitigations

- Riesgo: corrimiento de la fecha por zona horaria → mitigación: la fecha es un día calendario, "hoy" y los días deshabilitados se calculan con la fecha local del dispositivo, sin convertir a UTC (NFR-01, AC-13).
- Riesgo: orden alfabético distinto al de la sección Categorías futura → mitigación: un único criterio de orden (por defecto primero, después alfabético sin mayúsculas ni tildes) que reutilizará la sección Categorías (AC-11).

## Dependencies

- FEAT-001b (`prd-FEAT-001b.md`): formulario "Añadir Ingreso" y alta del ingreso.
- `PRD.md` (PRD-001) como fuente; `prd-FEAT-001.md` como índice de la división.

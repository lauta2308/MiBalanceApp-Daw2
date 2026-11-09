# PRD FEAT-001d: Monto del ingreso y límites

| Field | Value |
|-------|-------|
| Ticket | FEAT-001d |
| Tracker | none |
| Date | 2026-11-07 |
| PRD loops | 0 |
| Loops since last human decision | 0 |
| Padre | `prd-FEAT-001.md` (índice de la división) |
| Fuente | `PRD.md` (PRD-001 — MiBalance), entre paréntesis el RF/AC de origen |

## Context and Problem

Con FEAT-001b solo se rechaza un monto vacío o 0. Este sub-ticket define el campo de monto completo (solo dígitos y coma, dos decimales, punto de miles), el monto máximo, la precisión exacta de montos y saldo, y los rechazos cuando la operación llega directamente desde la API sin pasar por la interfaz.

## Goals

- G-1: El usuario no puede escribir un monto mal formado y ve el monto con formato mientras escribe.
- G-2: Ningún ingreso inválido entra por la API y ningún saldo pierde precisión.

## Functional Requirements

- FR-01 (RF-44): El sistema debe aceptar en el campo de monto solo dígitos y una coma decimal, sin signos ni letras, y mostrar el monto con punto de miles mientras se escribe (ej. "1500,50" se muestra "1.500,50").
- FR-02 (RF-43): El sistema debe impedir escribir más de dos decimales en el campo de monto.
- FR-03 (RF-42): El sistema debe rechazar un ingreso con un monto mayor a 999.999.999.999,99, con el mensaje "El monto máximo es 999.999.999.999,99.".
- FR-04 (RF-39, RF-41, RF-42, RF-43, RF-107): El sistema debe rechazar también cuando la operación llega directamente desde la API un ingreso con monto no mayor a 0, mayor a 999.999.999.999,99 o con más de dos decimales, con una categoría que no sea de tipo ingreso o no pertenezca a la cuenta del usuario, o con una fecha posterior a la de mañana según la hora universal (UTC).

## Non-Functional Requirements

- NFR-01 (RNF-04): El 100% de los montos y del saldo deben almacenarse y procesarse con una representación decimal exacta (no de punto flotante) de al menos dos decimales; el saldo se almacena sin tope de dígitos enteros.

## Acceptance Criteria
*(EARS — see `.daw/rules/validation-rules.instructions.md` §1 for the five patterns)*

- AC-15 (FR-01): WHEN el usuario A en "Añadir Ingreso" intenta escribir "-50" o "abc50" en el campo de monto, THE sistema SHALL no aceptar el signo ni las letras y mostrar "50" en ambos casos. *(AC-51)*
- AC-16 (FR-01): WHEN el usuario A con saldo USD 10.000,00 escribe "1500,50" en el monto de "Añadir Ingreso" y guarda, THE sistema SHALL mostrar "1.500,50" en el campo mientras escribe, el movimiento con el monto "+1.500,50" en la lista y el saldo "USD 11.500,50". *(AC-52)*
- AC-17 (FR-02): WHEN el usuario A en "Añadir Ingreso" intenta escribir "10,555" en el campo de monto, THE sistema SHALL no aceptar el tercer decimal y mostrar "10,55". *(AC-50)*
- AC-19 (FR-03): IF el usuario A con saldo USD 0,00 intenta guardar un ingreso de 1.000.000.000.000,00, THEN THE sistema SHALL no registrarlo y mostrar el mensaje "El monto máximo es 999.999.999.999,99."; y WHEN después guarda uno de 999.999.999.999,99, THE sistema SHALL registrarlo y mostrar el saldo "USD 999.999.999.999,99". *(AC-46)*
- AC-20 (FR-04): IF el usuario A con saldo USD 10.000,00, una categoría de gastos "Mercado" y otro usuario B con una categoría de ingresos "Ventas" intenta registrar directamente desde la API un ingreso con monto 0, con monto -50, con monto 1.000.000.000.000,00, con monto 10,555, con la categoría "Mercado", con la categoría "Ventas" de B o con una fecha dos días posterior a la fecha actual en UTC, THEN THE sistema SHALL rechazar todas las operaciones, no registrar ningún movimiento y mantener el saldo en USD 10.000,00. *(AC-49, AC-118, AC-131)*
- AC-29 (NFR-01): WHEN el usuario A con saldo USD 0,00 registra un ingreso de 0,10 y otro de 0,20, THE sistema SHALL mostrar el saldo exactamente "USD 0,30", y los montos y el saldo SHALL estar almacenados con una representación decimal exacta. *(AC-121)*
- AC-30 (NFR-01): WHEN el usuario A con saldo USD 0,00 registra dos ingresos de 999.999.999.999,99, THE sistema SHALL registrar ambos y mostrar el saldo exactamente "USD 1.999.999.999.999,98". *(AC-122)*

## Out of Scope

- Elegir categoría y fecha en la interfaz (FEAT-001c).
- Reinicio del formulario y mensajes (FEAT-001e).
- Gastos, edición, eliminación y paginación.

## Risks and Mitigations

- Riesgo: errores de redondeo en montos → mitigación: representación decimal exacta, probada con 0,10 + 0,20 y con el monto máximo (NFR-01, AC-29, AC-30).
- Riesgo: validaciones solo en la interfaz, saltables desde la API → mitigación: cada regla del monto, la categoría y la fecha también se aplica en el servidor (FR-04, AC-20).
- Riesgo: rechazar el "hoy" legítimo de una zona adelantada → mitigación: el servidor solo rechaza fechas posteriores a mañana en UTC.

## Dependencies

- FEAT-001b (`prd-FEAT-001b.md`): formulario "Añadir Ingreso" y alta del ingreso.
- `PRD.md` (PRD-001) como fuente; `prd-FEAT-001.md` como índice de la división.

# PRD FEAT-001b: Registrar ingreso con Pago Ingresado por defecto

| Field | Value |
|-------|-------|
| Ticket | FEAT-001b |
| Tracker | none |
| Date | 2026-11-07 |
| PRD loops | 0 |
| Loops since last human decision | 0 |
| Padre | `prd-FEAT-001.md` (índice de la división) |
| Fuente | `PRD.md` (PRD-001 — MiBalance), entre paréntesis el RF/AC de origen |

## Context and Problem

Con FEAT-001a el usuario entra y ve su cuenta, pero no puede registrar dinero. Este sub-ticket agrega el formulario "Añadir Ingreso" en su forma mínima: el usuario ingresa un monto y guarda, y el ingreso queda con la categoría "Pago Ingresado" y la fecha de hoy, el saldo sube y el movimiento aparece en la lista. El alta es atómica y solo puede escribir en la cuenta del propio usuario.

## Goals

- G-1: Un ingreso con la categoría y la fecha por defecto se registra en 3 interacciones desde la sección Cuenta ("Añadir Ingreso" → monto → "Guardar").
- G-2: Ningún ingreso queda sin categoría y ninguna falla deja el saldo inconsistente.

## Functional Requirements

- FR-01 (RF-30): El sistema debe permitir añadir un ingreso desde la sección Cuenta con el botón "Añadir Ingreso", ingresando el monto, la categoría y la fecha, los tres obligatorios.
- FR-02 (RF-36): El sistema debe preseleccionar la categoría "Pago Ingresado" al abrir el formulario "Añadir Ingreso".
- FR-03 (RF-32): El sistema debe tener siempre una categoría seleccionada en el formulario, sin una opción vacía ni "sin categoría".
- FR-04 (RF-34): El sistema debe preseleccionar como fecha del ingreso el día de hoy según la fecha local del dispositivo.
- FR-05 (RF-91): El sistema debe mostrar el botón "Guardar" en el formulario "Añadir Ingreso".
- FR-06 (RF-03, RF-64): El sistema debe permitir cerrar el formulario "Añadir Ingreso" sin guardar con la opción "Cancelar" y con una flecha para volver atrás, volviendo a la sección Cuenta.
- FR-07 (RF-41): El sistema debe rechazar un ingreso con el monto vacío o no mayor a 0, con el mensaje "El monto debe ser mayor a 0.".
- FR-08 (RF-45): El sistema debe aumentar el saldo de la cuenta en el monto del ingreso al registrarlo.
- FR-09 (RF-48): El sistema debe mostrar en la sección Cuenta los movimientos agrupados bajo su fecha ("DD/MM/AAAA"), cada uno con su categoría y su monto con signo ("+500,00" para un ingreso).
- FR-10 (RF-69, RF-104): El sistema debe mostrar el mensaje "Ingreso registrado con éxito." al registrar un ingreso, sin un botón "Aceptar", y cerrarlo solo a los 3 segundos.
- FR-11 (RF-105): El sistema debe mostrar cada mensaje de error, incluidos los de validación, hasta que el usuario presione su botón "Aceptar".

## Non-Functional Requirements

- NFR-01 (RNF-03): El sistema debe rechazar el 100% de los intentos de crear un movimiento en una cuenta ajena o con una categoría ajena, verificado con pruebas automatizadas que acceden directamente a la API.
- NFR-02 (RNF-05): Ante una falla durante el alta de un ingreso, la cuenta, sus movimientos y su saldo deben quedar exactamente como estaban antes de la operación (0 casos de estado parcial).
- NFR-03 (RNF-07): El 100% de los mensajes de error del alta de un ingreso deben estar en español, tratar de usted y no contener detalles técnicos.

## Acceptance Criteria
*(EARS — see `.daw/rules/validation-rules.instructions.md` §1 for the five patterns)*

- AC-06 (FR-01, FR-02, FR-04, FR-05, FR-08, FR-09): WHEN el usuario A con saldo USD 0,00 presiona "Añadir Ingreso", ingresa el monto 500 y presiona "Guardar" sin cambiar la categoría ni la fecha, THE sistema SHALL registrar el ingreso con la categoría "Pago Ingresado" y la fecha de hoy, mostrarlo en la lista bajo la fecha de hoy con el monto "+500,00" y mostrar el saldo "USD 500,00".
- AC-07 (FR-02, FR-03): WHEN el usuario A presiona "Añadir Ingreso", THE sistema SHALL mostrar el formulario con la categoría "Pago Ingresado" seleccionada y sin una opción vacía ni "sin categoría". *(AC-55)*
- AC-09 (FR-06): WHEN el usuario A con saldo USD 10.000,00 que en "Añadir Ingreso" ingresó el monto 500 presiona la flecha para volver atrás o "Cancelar", THE sistema SHALL mostrar la sección Cuenta sin registrar ningún movimiento y con el saldo en USD 10.000,00. *(AC-05)*
- AC-18 (FR-07, FR-11): IF el usuario A con saldo USD 10.000,00 intenta guardar un ingreso con el monto vacío o con el monto 0, THEN THE sistema SHALL no registrar el movimiento, mostrar el mensaje "El monto debe ser mayor a 0." con el botón "Aceptar" y mantener el saldo en USD 10.000,00. *(AC-45, AC-112)*
- AC-24 (FR-10): WHEN el usuario A registra un ingreso, THE sistema SHALL mostrar el mensaje "Ingreso registrado con éxito." sin botón "Aceptar" y cerrarlo solo a los 3 segundos. *(AC-111)*
- AC-28 (NFR-01): IF el usuario A autenticado intenta registrar directamente desde la API un ingreso en la cuenta del usuario B, o en su propia cuenta con una categoría de B, THEN THE sistema SHALL rechazar ambas operaciones y los saldos de A y de B SHALL quedar sin cambios. *(AC-118)*
- AC-31 (NFR-02, NFR-03): IF se simula una falla después de escribir el movimiento y antes de actualizar el saldo al dar de alta un ingreso de 1000 para el usuario A con saldo USD 10.000,00, THEN THE sistema SHALL no mostrar ningún movimiento nuevo, mantener el saldo en USD 10.000,00 y mostrar un mensaje de error en español, tratando de usted y sin detalles técnicos. *(AC-123)*

## Out of Scope

- Elegir otra categoría o fecha, calendario y orden de la lista (FEAT-001c).
- Formato del campo de monto, decimales, monto máximo y rechazos de validación desde la API (FEAT-001d).
- Reinicio del formulario, doble clic en "Guardar", convivencia de mensajes y consistencia en secuencias largas (FEAT-001e).
- Gastos, edición, eliminación, paginación, Categorías, Reportes, Perfil, Google (ver `prd-FEAT-001a.md`).

## Risks and Mitigations

- Riesgo: saldo inconsistente si el alta falla a mitad de camino → mitigación: el alta y la actualización del saldo son una única operación atómica, probada con una falla simulada (NFR-02, AC-31).
- Riesgo: un usuario escribe en la cuenta de otro o usa una categoría ajena → mitigación: el servidor valida la propiedad de la cuenta y de la categoría (NFR-01, AC-28).
- Riesgo: corrimiento de la fecha por zona horaria → mitigación: "hoy" se calcula con la fecha local del dispositivo y se guarda como día calendario, sin convertir a UTC.

## Dependencies

- FEAT-001a (`prd-FEAT-001a.md`): sesión, cuenta, categorías por defecto y sección Cuenta.
- `PRD.md` (PRD-001) como fuente; `prd-FEAT-001.md` como índice de la división.

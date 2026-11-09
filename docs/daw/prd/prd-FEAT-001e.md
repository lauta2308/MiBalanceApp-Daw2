# PRD FEAT-001e: Comportamiento del formulario y mensajes

| Field | Value |
|-------|-------|
| Ticket | FEAT-001e |
| Tracker | none |
| Date | 2026-11-07 |
| PRD loops | 0 |
| Loops since last human decision | 0 |
| Padre | `prd-FEAT-001.md` (índice de la división) |
| Fuente | `PRD.md` (PRD-001 — MiBalance), entre paréntesis el RF/AC de origen |

## Context and Problem

Con FEAT-001b a FEAT-001d el ingreso se registra con categoría, fecha y monto válidos. Este sub-ticket cierra el comportamiento del formulario y de los mensajes: el formulario no arrastra valores de un intento anterior, un doble clic en "Guardar" no registra dos ingresos, el mensaje de éxito no bloquea, los errores esperan al usuario, y el saldo se mantiene consistente en secuencias largas y ante fallas del servidor.

## Goals

- G-1: Cada confirmación registra exactamente un ingreso.
- G-2: El usuario puede encadenar ingresos sin cerrar mensajes de éxito, y nunca pierde un mensaje de error sin leerlo.

## Functional Requirements

- FR-01 (RF-31): El sistema debe mostrar el formulario "Añadir Ingreso" sin conservar los valores de un intento anterior: monto vacío, categoría "Pago Ingresado" y fecha de hoy.
- FR-02 (RF-106): El sistema debe deshabilitar el botón "Guardar" mientras se procesa el alta, mostrando el texto "Guardando…", sin permitir editar ni cerrar el formulario hasta que termine, de modo que cada confirmación registre un solo ingreso.
- FR-03 (RF-104): El sistema debe permitir seguir usando la aplicación mientras se muestra el mensaje "Ingreso registrado con éxito.".
- FR-04 (RF-105): El sistema debe mantener cada mensaje de error visible hasta que el usuario presione su botón "Aceptar", sin cerrarlo por tiempo.

## Non-Functional Requirements

- NFR-01 (RNF-05): En todo momento el saldo debe ser igual a la suma de los ingresos menos la suma de los gastos de la cuenta (0 diferencias), verificado después de cada operación de una secuencia de prueba.
- NFR-02 (RNF-07): El 100% de los mensajes de error de la carga de la sección Cuenta y del alta de un ingreso deben estar en español, tratar de usted y no contener detalles técnicos (códigos internos, stack traces).

## Acceptance Criteria
*(EARS — see `.daw/rules/validation-rules.instructions.md` §1 for the five patterns)*

- AC-08 (FR-01): WHEN el usuario A que en "Añadir Ingreso" ingresó el monto 500, eligió "Sueldo" y cambió la fecha a 01/10/2026 vuelve atrás con la flecha, con "Cancelar" o guarda el ingreso, y después presiona otra vez "Añadir Ingreso", THE sistema SHALL mostrar en los tres casos el monto vacío, la categoría "Pago Ingresado" y la fecha de hoy. *(AC-57)*
- AC-21 (FR-02): WHEN el usuario A con saldo USD 10.000,00 que en "Añadir Ingreso" ingresó el monto 1500 presiona "Guardar" dos veces seguidas, THE sistema SHALL mostrar mientras se procesa el botón deshabilitado con el texto "Guardando…", no permitir editar ni cerrar el formulario, registrar un solo ingreso y mostrar el saldo "USD 11.500,00". *(AC-129)*
- AC-25 (FR-03): WHILE el mensaje "Ingreso registrado con éxito." está en pantalla, THE sistema SHALL permitir al usuario A presionar "Añadir Ingreso", ingresar el monto 500 y guardar un segundo ingreso sin cerrar el primer mensaje. *(AC-128)*
- AC-26 (FR-04): WHILE el mensaje "El monto debe ser mayor a 0." está en pantalla y el usuario A no presionó "Aceptar", THE sistema SHALL mantenerlo visible pasados 10 segundos, y WHEN lo presiona, THE sistema SHALL cerrarlo. *(AC-113)*
- AC-32 (NFR-01): WHEN se ejecuta una secuencia fija, definida en la prueba, de 20 altas de ingresos con montos y fechas distintos para el usuario A con saldo USD 0,00, THE sistema SHALL tener después de cada alta un saldo igual a la suma de los ingresos menos la suma de los gastos de la cuenta. *(AC-125)*
- AC-33 (NFR-02): IF se simula una falla del servidor al cargar la sección Cuenta o al registrar un ingreso, THEN THE sistema SHALL mostrar en cada caso un mensaje en español, tratando de usted, sin códigos de error internos ni stack traces, con el botón "Aceptar". *(AC-127)*

## Out of Scope

- Gastos, edición, eliminación y paginación (su doble clic y sus mensajes se definen con esas funcionalidades).
- Rendimiento, adaptación a anchos de viewport y uso solo con teclado (RNF-01, RNF-02, RNF-06, RNF-08).

## Risks and Mitigations

- Riesgo: un doble clic o una conexión lenta registra dos ingresos → mitigación: el botón se deshabilita durante el alta y se prueba el doble clic (FR-02, AC-21).
- Riesgo: un mensaje de error se cierra antes de que el usuario lo lea → mitigación: los errores solo se cierran con "Aceptar" (FR-04, AC-26).

## Dependencies

- FEAT-001b (`prd-FEAT-001b.md`): formulario y alta del ingreso.
- FEAT-001c (`prd-FEAT-001c.md`): AC-08 elige categoría y fecha, que llegan con ese sub-ticket.
- `PRD.md` (PRD-001) como fuente; `prd-FEAT-001.md` como índice de la división.

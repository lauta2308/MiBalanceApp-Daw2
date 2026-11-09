# PRD FEAT-001a: Entrar y ver la cuenta

| Field | Value |
|-------|-------|
| Ticket | FEAT-001a |
| Tracker | none |
| Date | 2026-11-07 |
| PRD loops | 0 |
| Loops since last human decision | 0 |
| Padre | `prd-FEAT-001.md` (índice de la división) |
| Fuente | `PRD.md` (PRD-001 — MiBalance), entre paréntesis el RF/AC de origen |

## Context and Problem

MiBalance todavía no tiene ninguna funcionalidad construida. Antes de poder registrar un ingreso, el usuario tiene que poder entrar a la aplicación y ver su cuenta. Este sub-ticket entrega esa primera pantalla: un inicio de sesión provisorio sin credenciales (que se reemplazará por Google en otro ticket), la cuenta "Mi Cuenta" en USD y las categorías por defecto que se crean la primera vez, y la sección Cuenta con el saldo y la lista vacía.

## Goals

- G-1: Un usuario nuevo entra a la aplicación sin pasos de registro y ve la sección Cuenta con "Mi Cuenta (USD)", el saldo "USD 0,00" y el mensaje "Aquí verá sus movimientos." (0 interacciones).
- G-2: Al volver a abrir la aplicación, el usuario sigue en la misma cuenta.

## Functional Requirements

- FR-01 (RF-04): El sistema debe crear una cuenta llamada "Mi Cuenta", con moneda USD y saldo 0, para cada usuario que inicia sesión por primera vez.
- FR-02 (RF-05): El sistema debe crear las categorías por defecto "Pago Realizado" (tipo gasto) y "Pago Ingresado" (tipo ingreso) en la cuenta de cada usuario que inicia sesión por primera vez.
- FR-03 (provisorio, AGENTS.md; RF-28): El sistema debe iniciar una sesión provisoria sin pedir credenciales al abrir la aplicación cuando no haya una sesión iniciada, y conservar la sesión al cerrar y volver a abrir el navegador. Es temporal: se reemplaza por RF-22 y RF-23 (Google) en otro ticket.
- FR-04 (provisorio, RF-105): El sistema debe mostrar, si falla el inicio de la sesión provisoria, el mensaje "No se pudo iniciar la sesión. Vuelva a intentarlo." con el botón "Aceptar", que reintenta el inicio de sesión.
- FR-05 (RF-25, AC-09): El sistema debe mostrar la sección Cuenta como pantalla inicial una vez iniciada la sesión, con el encabezado "{nombre de la cuenta} ({moneda})" y el saldo con el formato "USD 11.000,00" (código de moneda, punto de miles, coma decimal y dos decimales; signo "-" si es negativo).
- FR-06 (RF-49): El sistema debe mostrar el mensaje "Aquí verá sus movimientos." en la sección Cuenta cuando la cuenta no tenga movimientos.
- FR-07 (RF-105): El sistema debe mostrar cada mensaje de error hasta que el usuario presione su botón "Aceptar".

## Non-Functional Requirements

- NFR-01 (RNF-03): El sistema debe devolver 0 registros en el 100% de los intentos de leer cuentas, categorías o movimientos cuyo propietario no sea el usuario autenticado, verificado con pruebas automatizadas que acceden directamente a la API sin pasar por la interfaz.
- NFR-02 (RNF-07): El 100% de los mensajes de error del inicio de sesión provisorio deben estar en español, tratar de usted y no contener detalles técnicos (códigos internos, stack traces).

## Acceptance Criteria
*(EARS — see `.daw/rules/validation-rules.instructions.md` §1 for the five patterns)*

- AC-01 (FR-01, FR-03, FR-05): WHEN un usuario sin sesión abre la aplicación por primera vez y se inicia su sesión provisoria, THE sistema SHALL mostrar la sección Cuenta con el encabezado "Mi Cuenta (USD)" y el saldo "USD 0,00". *(AC-09)*
- AC-02 (FR-02): WHEN el usuario A que acaba de iniciar sesión por primera vez consulta sus categorías, THE sistema SHALL devolver exactamente dos: "Pago Ingresado" de tipo ingreso y "Pago Realizado" de tipo gasto.
- AC-03 (FR-03): WHEN el usuario A con una sesión ya iniciada cierra el navegador y vuelve a abrir la aplicación, THE sistema SHALL mostrar la sección Cuenta de la misma cuenta (mismo identificador de cuenta), sin crear otra cuenta ni otras categorías por defecto. *(AC-35)*
- AC-04 (FR-04, FR-07, NFR-02): IF falla el inicio de la sesión provisoria, THEN THE sistema SHALL mostrar el mensaje "No se pudo iniciar la sesión. Vuelva a intentarlo." con el botón "Aceptar", sin detalles técnicos, mantenerlo visible hasta que se presione "Aceptar" y, al presionarlo, volver a intentar el inicio de sesión.
- AC-22 (FR-06): WHEN el usuario A sin movimientos accede a la sección Cuenta, THE sistema SHALL mostrar el mensaje "Aquí verá sus movimientos." en lugar de la lista. *(AC-42)*
- AC-27 (NFR-01): WHEN el usuario A autenticado consulta directamente desde la API la cuenta, las categorías y los movimientos del usuario B filtrando por sus identificadores, THE sistema SHALL devolver 0 registros en cada consulta. *(AC-116)*

## Out of Scope

- Registrar ingresos y todo lo de los sub-tickets FEAT-001b a FEAT-001e (formulario, categorías y fecha, monto, mensajes).
- Gastos, edición y eliminación de movimientos, paginación (RF-29, RF-50 a RF-68).
- Sección Categorías, Reportes y Perfil; barra de navegación (RF-01, RF-02, RF-26, RF-70 a RF-103).
- Inicio de sesión con Google y cierre de sesión (RF-22 a RF-24, RF-27).
- Editar o restablecer la cuenta y cambiar la moneda (RF-06 a RF-21).
- Rendimiento, adaptación a anchos de viewport y uso solo con teclado (RNF-01, RNF-02, RNF-06, RNF-08).

## Risks and Mitigations

- Riesgo: un usuario lee datos de otro → mitigación: el acceso a cuentas, categorías y movimientos queda restringido al propietario en el servidor y se prueba directamente contra la API (NFR-01, AC-27).
- Riesgo: crear dos cuentas para el mismo usuario si la creación corre dos veces → mitigación: la cuenta y sus categorías por defecto se crean una sola vez por usuario (AC-03).
- Riesgo: el proveedor limita las sesiones provisorias nuevas por hora y por IP → mitigación: los tests marcan y limpian sus usuarios de prueba; Google lo reemplaza antes de abrir la aplicación a usuarios reales.
- Supuesto: `PRD.md` remite a `INTERFAZ.md` para formatos, colores e íconos, pero ese archivo no existe. Los formatos de este PRD se toman de los AC de `PRD.md`.
- Supuesto: el texto del error de inicio de sesión provisorio no está en `PRD.md`; se propone "No se pudo iniciar la sesión. Vuelva a intentarlo.".

## Dependencies

- `PRD.md` (PRD-001) como fuente de los requisitos; `prd-FEAT-001.md` como índice de la división.
- Proyecto de base de datos y autenticación declarado en `AGENTS.md` (Stack), con el inicio de sesión anónimo habilitado.
- Ninguna dependencia de otro sub-ticket: FEAT-001a es el primero.

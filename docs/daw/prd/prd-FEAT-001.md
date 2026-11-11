# Parent PRD: Añadir ingreso con categoría Pago Ingresado por defecto

| Metric | Value |
|--------|-------|
| Ticket | FEAT-001 |
| Date | 2026-11-07 |
| Status | Split |
| Acceptance criteria to cover | 33 |

## Sub-tickets

| Sub-ticket | Title | PRD | ACs | Dependencies | Status |
|---|---|---|---|---|---|
| FEAT-001a | Entrar y ver la cuenta | prd-FEAT-001a.md | AC-01, AC-02, AC-03, AC-04, AC-22, AC-27 | none | done (mergeado en main, PR #2) |
| FEAT-001b | Registrar ingreso con Pago Ingresado por defecto | prd-FEAT-001b.md | AC-06, AC-07, AC-09, AC-18, AC-24, AC-28, AC-31 | depends on a | done (mergeado en main con squash, PR #9) |
| FEAT-001c | Elegir categoría y fecha del ingreso | prd-FEAT-001c.md | AC-05, AC-10, AC-11, AC-12, AC-13, AC-14, AC-23 | depends on b | active |
| FEAT-001d | Monto del ingreso y límites | prd-FEAT-001d.md | AC-15, AC-16, AC-17, AC-19, AC-20, AC-29, AC-30 | depends on b | pending |
| FEAT-001e | Comportamiento del formulario y mensajes | prd-FEAT-001e.md | AC-08, AC-21, AC-25, AC-26, AC-32, AC-33 | depends on b and c | pending |

Los 33 criterios provienen de la versión sin dividir de este PRD (2026-11-07), escrita a partir de `PRD.md` con el alcance acordado con el usuario en DEFINE; ninguno se agregó al dividir.

## Suggested implementation order
FEAT-001a → FEAT-001b → FEAT-001c → FEAT-001d → FEAT-001e

Decisión del usuario (2026-11-07): dividir y ejecutar ahora solo FEAT-001a; FEAT-001b a FEAT-001e quedan escritos para después.

## Original context

MiBalance no tiene funcionalidad construida. El pedido fue "crear un ingreso y que reciba la categoría Pago Ingresado por defecto". El alcance acordado incluyó la base mínima (sesión provisoria, cuenta y categorías por defecto, sección Cuenta), el formulario "Añadir Ingreso" con sus validaciones, el saldo, la lista simple de movimientos (sin paginación) y los RNF-03, RNF-04, RNF-05 y RNF-07 sobre el alta. El PRD resultante tenía 33 criterios, por encima del umbral de control de alcance, y se dividió en cinco partes que se pueden poner en producción una tras otra.

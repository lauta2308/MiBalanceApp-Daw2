# Fix FIX-002: Restaurar el mensaje de lista vacía

- **Bug**: la sección Cuenta muestra "Aquí verás sus movimientos." desde FIX-001, y el usuario decidió volver a "Aquí verá sus movimientos.".
- **Change**: src/paginas/SeccionCuenta.jsx:75 — restaurar el texto "Aquí verá sus movimientos.", y actualizar la constante y los títulos de `src/paginas/SeccionCuenta.test.jsx`.
- **Regression test**: `AC-22: con 0 movimientos muestra "Aquí verá sus movimientos."` en `src/paginas/SeccionCuenta.test.jsx`, que falla antes del cambio y pasa después.
- **Risk**: ninguno; el texto vuelve a coincidir con RF-49 de PRD.md, con FR-06 y AC-22 de prd-FEAT-001a.md y con la regla de trato de usted de AGENTS.md.

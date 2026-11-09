# Fix FIX-001: Cambiar el mensaje de lista vacía

- **Bug**: la sección Cuenta muestra "Aquí verá sus movimientos." y el usuario decidió que diga "Aquí verás sus movimientos.".
- **Change**: src/paginas/SeccionCuenta.jsx:75 — reemplazar el texto del mensaje por "Aquí verás sus movimientos.", y actualizar la constante y los títulos de `src/paginas/SeccionCuenta.test.jsx`.
- **Regression test**: `AC-22: con 0 movimientos muestra "Aquí verás sus movimientos."` en `src/paginas/SeccionCuenta.test.jsx`, que falla antes del cambio y pasa después.
- **Risk**: el texto mezcla "verás" (tú) con "sus" (usted), se aparta de la regla de trato de usted de AGENTS.md y deja de coincidir con RF-49 de PRD.md y con FR-06 y AC-22 de prd-FEAT-001a.md, que no se modifican en este ticket; lo decidió el usuario sabiéndolo (2026-11-09).

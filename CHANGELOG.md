# Changelog

## Unreleased

### Added
- [FEAT-001a] Proyecto base, esquema con RLS y sección Cuenta: sesión provisoria sin credenciales, cuenta "Mi Cuenta" en USD con sus categorías por defecto, y saldo inicial con mensaje de lista vacía.
- [FEAT-002] Integración continua en cada pull request: GitHub Actions instala con `npm ci` y corre el lint y las pruebas unitarias, sin secretos y con permisos de solo lectura. Las pruebas unitarias bloquean la red externa, así que ninguna llega a servicios de afuera.
- [FEAT-001b] Registrar un ingreso desde el formulario "Añadir Ingreso": monto validado, fecha de hoy y categoría "Pago Ingresado" preseleccionada. El alta y la actualización del saldo son atómicas en `BASP_AGREGAR_MOVIMIENTO`, que solo acepta categorías de la propia cuenta. La sección Cuenta muestra los movimientos agrupados por fecha y un mensaje de éxito que se cierra a los 3 segundos.

### Changed
- [FIX-001] El mensaje de lista vacía de la sección Cuenta dice "Aquí verás sus movimientos.".
- [FIX-002] El mensaje de lista vacía de la sección Cuenta vuelve a decir "Aquí verá sus movimientos.".

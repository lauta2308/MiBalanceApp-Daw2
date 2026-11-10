# Changelog

## Unreleased

### Added
- [FEAT-001a] Proyecto base, esquema con RLS y sección Cuenta: sesión provisoria sin credenciales, cuenta "Mi Cuenta" en USD con sus categorías por defecto, y saldo inicial con mensaje de lista vacía.
- [FEAT-002] Integración continua en cada pull request: GitHub Actions instala con `npm ci` y corre el lint y las pruebas unitarias, sin secretos y con permisos de solo lectura. Las pruebas unitarias bloquean la red externa, así que ninguna llega a servicios de afuera.

### Changed
- [FIX-001] El mensaje de lista vacía de la sección Cuenta dice "Aquí verás sus movimientos.".
- [FIX-002] El mensaje de lista vacía de la sección Cuenta vuelve a decir "Aquí verá sus movimientos.".

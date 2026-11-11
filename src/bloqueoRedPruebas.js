// Bloqueo de red de las pruebas unitarias (FEAT-002, FR-08, ADR-002).
// Intercepta las llamadas de conexión de `net.Socket` (que usan `net`, `tls`, `http`,
// `https` y el `fetch` nativo), la creación, el envío y la conexión de `dgram`, y el `open`
// síncrono del XHR de jsdom. Cuando el destino es un host externo, rechaza la llamada antes
// de pasarla al método original y registra el intento para que la prueba falle.
// Quedan fuera del bloqueo: las consultas directas a `dns` (`dns.lookup`, `dns.resolve*`),
// los worker_threads, los procesos hijos, las redirecciones internas del XHR síncrono de
// jsdom, que corren en otro hilo, y los sockets UDP creados con `new dgram.Socket(...)` y
// un `lookup` propio (solo se vigila el `lookup` que llega por `dgram.createSocket`).
import net from 'node:net'
import tls from 'node:tls'
import dgram from 'node:dgram'
import process from 'node:process'
import { syncBuiltinESMExports } from 'node:module'
import { expect } from 'vitest'

const codigoBloqueo = 'ERR_RED_BLOQUEADA'
const marcaParche = Symbol.for('mibalance.bloqueoRedPruebas.parche')
const marcaLookupPropio = Symbol.for('mibalance.bloqueoRedPruebas.lookupPropio')
const marcaConexionUdpEnCurso = Symbol.for('mibalance.bloqueoRedPruebas.conexionUdpEnCurso')
const claveEstado = Symbol.for('mibalance.bloqueoRedPruebas.estado')
const puertosPorProtocolo = { 'http:': 80, 'https:': 443, 'ws:': 80, 'wss:': 443 }
const marcadorUrlIlegible = 'url-ilegible'

// Los módulos nativos se comparten entre los archivos de prueba de un mismo proceso,
// pero este módulo se vuelve a evaluar en cada archivo. El estado vive en `process`
// para que todas sus instancias usen los mismos parches y el mismo registro.
// Consecuencia: un intento asíncrono tardío de un archivo que llega mientras corre otro
// archivo del mismo proceso se registra con el nombre de la prueba en curso y hace fallar
// esa prueba, no la que lo originó.
function ObtenerEstado() {
  if (!process[claveEstado]) {
    process[claveEstado] = {
      intentos: [],
      originales: null,
      parches: null,
      ObtenerNombrePrueba: () => undefined,
    }
  }
  return process[claveEstado]
}

function EsOctetoValido(texto) {
  return /^\d{1,3}$/.test(texto) && Number(texto) <= 255
}

function EsIpv4Loopback(host) {
  const partes = host.split('.')
  return partes.length === 4 && partes[0] === '127' && partes.every(EsOctetoValido)
}

// IP literal de loopback, tal como la reconoce Node (`net.isIP`): solo esas no pasan por
// ninguna resolución de nombres. '127.000.000.001' no es IP para Node y se resuelve.
function EsIpLoopbackLiteral(host) {
  if (typeof host !== 'string' || net.isIP(host) === 0) return false
  const hostNormalizado = host.toLowerCase()
  if (hostNormalizado === '::1' || EsIpv4Loopback(hostNormalizado)) return true
  return (
    hostNormalizado.startsWith('::ffff:') &&
    EsIpv4Loopback(hostNormalizado.slice('::ffff:'.length))
  )
}

export function EsHostLocal(host) {
  if (host === undefined || host === null || host === '') return true
  if (typeof host !== 'string') return false
  return host.toLowerCase() === 'localhost' || EsIpLoopbackLiteral(host)
}

function EsPuerto(valor) {
  return (
    (typeof valor === 'number' && Number.isFinite(valor)) ||
    (typeof valor === 'string' && /^\d+$/.test(valor))
  )
}

function EsHostAceptado(valor) {
  return valor === undefined || typeof valor === 'string'
}

// `net.connect` pasa a `connect` un arreglo marcado con el símbolo `normalizedArgs` de Node.
// Cualquier otro arreglo Node lo usa como objeto de opciones, y así se lee acá.
function EsArregloNormalizado(valor) {
  return (
    Array.isArray(valor) &&
    Object.getOwnPropertySymbols(valor).some((simbolo) => simbolo.description === 'normalizedArgs')
  )
}

// Devuelve { local, host, puerto } o null si la forma de los argumentos no se reconoce.
function ExtraerDestinoConexion(argumentos) {
  const primero = argumentos[0]
  const esNormalizado = EsArregloNormalizado(primero)
  const opciones = esNormalizado ? primero[0] : primero

  if (opciones !== null && typeof opciones === 'object') {
    if (typeof opciones.path === 'string' && opciones.path !== '') {
      return { local: true, host: opciones.path, puerto: null }
    }
    if (!EsHostAceptado(opciones.host)) return null
    if (opciones.port !== undefined && !EsPuerto(opciones.port)) return null
    // Un lookup propio puede resolver cualquier nombre a una dirección externa: solo se
    // acepta con una IP literal de loopback según `net.isIP`, que Node conecta sin lookup.
    const tieneLookupPropio = typeof opciones.lookup === 'function'
    const local = tieneLookupPropio
      ? EsIpLoopbackLiteral(opciones.host)
      : EsHostLocal(opciones.host)
    return { local, host: opciones.host, puerto: opciones.port }
  }

  // Igual que `isPipeName` de Node: un string es ruta de socket solo si no es
  // `Number(x) >= 0`; en otro caso Node lo usa como puerto (' 443', '0x1bb', '4.43e2').
  const esRutaDeSocket =
    typeof opciones === 'string' && opciones !== '' && !(Number(opciones) >= 0)
  if (!Array.isArray(primero) && esRutaDeSocket) {
    return { local: true, host: opciones, puerto: null }
  }

  if (!Array.isArray(primero) && (typeof opciones === 'number' || typeof opciones === 'string')) {
    const host = typeof argumentos[1] === 'function' ? undefined : argumentos[1]
    if (!EsHostAceptado(host)) return null
    return { local: EsHostLocal(host), host, puerto: opciones }
  }

  return null
}

function NormalizarPuerto(puerto) {
  if (typeof puerto === 'string' && /^\d+$/.test(puerto)) return Number(puerto)
  return puerto ?? null
}

function RegistrarIntento(protocolo, host, puerto) {
  const estado = ObtenerEstado()
  let prueba
  try {
    prueba = estado.ObtenerNombrePrueba()
  } catch {
    prueba = undefined
  }
  const intento = {
    protocolo,
    host: host === undefined ? null : String(host),
    puerto: NormalizarPuerto(puerto),
    prueba: prueba ?? null,
  }
  estado.intentos.push(intento)
  return intento
}

// Host omitido: Node usa localhost. Sin puerto conocido se muestra solo el host.
function FormatearDestino(intento) {
  const host = intento.host === null || intento.host === '' ? 'localhost' : intento.host
  return intento.puerto === null ? host : `${host}:${intento.puerto}`
}

function CrearErrorBloqueo(intento) {
  const error = new Error(
    `Conexión de red bloqueada en las pruebas unitarias: ${FormatearDestino(intento)}`,
  )
  error.code = codigoBloqueo
  return error
}

function CrearParcheConexionTcp(conexionOriginal) {
  function ConectarConBloqueo(...argumentos) {
    const destino = ExtraerDestinoConexion(argumentos)
    if (destino?.local) {
      return conexionOriginal.apply(this, argumentos)
    }
    const protocolo = this instanceof tls.TLSSocket ? 'tls' : 'tcp'
    const intento = RegistrarIntento(
      protocolo,
      destino ? destino.host : 'desconocido',
      destino ? destino.puerto : null,
    )
    const error = CrearErrorBloqueo(intento)
    process.nextTick(() => this.destroy(error))
    return this
  }
  ConectarConBloqueo[marcaParche] = true
  return ConectarConBloqueo
}

// Un socket UDP con lookup propio solo acepta como destino una IP literal de loopback.
function EsDestinoUdpLocal(socket, direccion) {
  return socket[marcaLookupPropio] ? EsIpLoopbackLiteral(direccion) : EsHostLocal(direccion)
}

// Dirección que devuelve un lookup: loopback o la dirección sin especificar del bind.
function EsDireccionResueltaLocal(direccion) {
  return EsIpLoopbackLiteral(direccion) || direccion === '0.0.0.0' || direccion === '::'
}

// dgram consulta el lookup propio aun con una IP literal, así que también se vigila
// la dirección que devuelve.
function CrearLookupVigilado(lookupPropio) {
  function ConsultarConBloqueo(host, opciones, alTerminar) {
    return lookupPropio(host, opciones, (error, direccion, familia) => {
      if (error) {
        alTerminar(error, direccion, familia)
        return
      }
      const direcciones = Array.isArray(direccion)
        ? direccion.map((elemento) => elemento?.address)
        : [direccion]
      if (direcciones.every(EsDireccionResueltaLocal)) {
        alTerminar(null, direccion, familia)
        return
      }
      alTerminar(CrearErrorBloqueo(RegistrarIntento('udp', host, null)))
    })
  }
  return ConsultarConBloqueo
}

function CrearParcheCreacionUdp(creacionOriginal) {
  function CrearSocketUdpConBloqueo(...argumentos) {
    const [opciones] = argumentos
    if (opciones !== null && typeof opciones === 'object' && typeof opciones.lookup === 'function') {
      const opcionesVigiladas = { ...opciones, lookup: CrearLookupVigilado(opciones.lookup) }
      const socket = creacionOriginal.call(this, opcionesVigiladas, ...argumentos.slice(1))
      socket[marcaLookupPropio] = true
      return socket
    }
    return creacionOriginal.apply(this, argumentos)
  }
  CrearSocketUdpConBloqueo[marcaParche] = true
  return CrearSocketUdpConBloqueo
}

function ObtenerDireccionRemotaUdp(socket) {
  try {
    return socket.remoteAddress()
  } catch {
    return null
  }
}

function EmitirErrorUdp(socket, alTerminar, error) {
  if (typeof alTerminar === 'function') {
    process.nextTick(alTerminar, error)
  } else {
    process.nextTick(() => socket.emit('error', error))
  }
}

// Lee los argumentos de un socket no conectado como lo hace Node:
// send(mensaje, [desplazamiento, longitud,] puerto, [direccion], [alTerminar]).
function ExtraerDestinoEnvio(argumentos) {
  const [, desplazamiento, longitud, puerto, direccion, alTerminar] = argumentos
  let destino
  if (direccion || (puerto && typeof puerto !== 'function')) {
    destino = { puerto, direccion, alTerminar }
  } else {
    destino = { puerto: desplazamiento, direccion: longitud, alTerminar: puerto }
  }
  if (typeof destino.direccion === 'function') {
    destino.alTerminar = destino.direccion
    destino.direccion = undefined
  }
  return destino
}

function ObtenerRetornoEnvioConectado(argumentos) {
  const ultimo = argumentos[argumentos.length - 1]
  return typeof ultimo === 'function' ? ultimo : undefined
}

function CrearParcheEnvio(envioOriginal) {
  function EnviarConBloqueo(...argumentos) {
    // Socket conectado: Node usa la dirección a la que está conectado.
    const remota = ObtenerDireccionRemotaUdp(this)
    if (remota) {
      if (EsHostLocal(remota.address)) return envioOriginal.apply(this, argumentos)
      const error = CrearErrorBloqueo(RegistrarIntento('udp', remota.address, remota.port))
      EmitirErrorUdp(this, ObtenerRetornoEnvioConectado(argumentos), error)
      return undefined
    }

    const { puerto, direccion, alTerminar } = ExtraerDestinoEnvio(argumentos)

    // Connect en curso hacia loopback: Node encola el envío y lo manda al destino del
    // connect. Solo se rechaza si el envío nombra un host externo explícito.
    if (this[marcaConexionUdpEnCurso]) {
      if (typeof direccion !== 'string' || direccion === '' || EsDestinoUdpLocal(this, direccion)) {
        return envioOriginal.apply(this, argumentos)
      }
      EmitirErrorUdp(this, alTerminar, CrearErrorBloqueo(RegistrarIntento('udp', direccion, puerto)))
      return undefined
    }

    // Sin puerto, Node rechaza el envío por sí mismo: no sale nada a la red.
    if (puerto === undefined || typeof puerto === 'function') {
      return envioOriginal.apply(this, argumentos)
    }
    if (EsDestinoUdpLocal(this, direccion)) {
      return envioOriginal.apply(this, argumentos)
    }
    const error = CrearErrorBloqueo(RegistrarIntento('udp', direccion, puerto))
    EmitirErrorUdp(this, alTerminar, error)
    return undefined
  }
  EnviarConBloqueo[marcaParche] = true
  return EnviarConBloqueo
}

function MarcarConexionUdpEnCurso(socket) {
  socket[marcaConexionUdpEnCurso] = true
  const Limpiar = () => {
    socket[marcaConexionUdpEnCurso] = false
  }
  socket.once('connect', Limpiar)
  socket.once('close', Limpiar)
}

function CrearParcheConexionUdp(conexionOriginal) {
  function ConectarUdpConBloqueo(...argumentos) {
    let [puerto, direccion, alTerminar] = argumentos
    if (typeof direccion === 'function') {
      alTerminar = direccion
      direccion = undefined
    }
    if (EsDestinoUdpLocal(this, direccion)) {
      const resultado = conexionOriginal.apply(this, argumentos)
      MarcarConexionUdpEnCurso(this)
      return resultado
    }
    const error = CrearErrorBloqueo(RegistrarIntento('udp', direccion, puerto))
    process.nextTick(() => {
      if (typeof alTerminar === 'function') alTerminar(error)
      else this.emit('error', error)
    })
    return undefined
  }
  ConectarUdpConBloqueo[marcaParche] = true
  return ConectarUdpConBloqueo
}

function ObtenerHostDeUrl(direccionUrl) {
  const host = direccionUrl.hostname
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
}

// jsdom ejecuta el XHR síncrono en un worker_thread donde el parche de `net` no existe,
// por eso se intercepta en `open`. jsdom convierte el tercer argumento a booleano, así que
// cualquier valor falso explícito abre un XHR síncrono.
function CrearParcheAperturaXhr(aperturaOriginal) {
  function AbrirConBloqueo(...argumentos) {
    if (argumentos.length >= 3 && !argumentos[2]) {
      let direccionUrl
      try {
        direccionUrl = new URL(String(argumentos[1]), globalThis.location?.href)
      } catch {
        direccionUrl = null
      }
      // Si la URL no se puede leer se registra un marcador fijo, nunca la URL (R-08).
      const host = direccionUrl ? ObtenerHostDeUrl(direccionUrl) : marcadorUrlIlegible
      if (!direccionUrl || !EsHostLocal(host)) {
        const puerto = direccionUrl
          ? direccionUrl.port || puertosPorProtocolo[direccionUrl.protocol] || null
          : null
        throw CrearErrorBloqueo(RegistrarIntento('xhr', host, puerto))
      }
    }
    return aperturaOriginal.apply(this, argumentos)
  }
  AbrirConBloqueo[marcaParche] = true
  return AbrirConBloqueo
}

function ObtenerPrototipoXhr() {
  const claseXhr = globalThis.XMLHttpRequest
  return typeof claseXhr === 'function' && claseXhr.prototype ? claseXhr.prototype : null
}

// Cada archivo de prueba tiene su propia ventana de jsdom, así que el original y el
// parche del XHR se guardan por prototipo.
function InstalarBloqueoXhr(estado) {
  const prototipo = ObtenerPrototipoXhr()
  if (!prototipo) return
  let registro = estado.originales.xhr.get(prototipo)
  if (!registro) {
    const original = prototipo.open
    registro = { original, parche: CrearParcheAperturaXhr(original) }
    estado.originales.xhr.set(prototipo, registro)
  }
  prototipo.open = registro.parche
}

export function InstalarBloqueoRed() {
  const estado = ObtenerEstado()
  estado.ObtenerNombrePrueba = () => expect.getState().currentTestName

  if (!estado.originales) {
    estado.originales = {
      conexionTcp: net.Socket.prototype.connect,
      creacionUdp: dgram.createSocket,
      envioUdp: dgram.Socket.prototype.send,
      conexionUdp: dgram.Socket.prototype.connect,
      xhr: new WeakMap(),
    }
    estado.parches = {
      conexionTcp: CrearParcheConexionTcp(estado.originales.conexionTcp),
      creacionUdp: CrearParcheCreacionUdp(estado.originales.creacionUdp),
      envioUdp: CrearParcheEnvio(estado.originales.envioUdp),
      conexionUdp: CrearParcheConexionUdp(estado.originales.conexionUdp),
    }
  }

  // Si una prueba reemplazó un método, se vuelve a poner el parche sobre el original.
  net.Socket.prototype.connect = estado.parches.conexionTcp
  dgram.createSocket = estado.parches.creacionUdp
  dgram.Socket.prototype.send = estado.parches.envioUdp
  dgram.Socket.prototype.connect = estado.parches.conexionUdp
  // Actualiza las exportaciones con nombre (`import { createSocket } from 'node:dgram'`).
  syncBuiltinESMExports()
  InstalarBloqueoXhr(estado)
}

export function ObtenerIntentosBloqueados() {
  return ObtenerEstado().intentos.map((intento) => ({ ...intento }))
}

function DescribirIntentos(intentos) {
  const detalle = intentos
    .map((intento) => {
      const prueba = intento.prueba ? `, prueba "${intento.prueba}"` : ''
      return `${FormatearDestino(intento)} (${intento.protocolo}${prueba})`
    })
    .join('; ')
  const resumen =
    intentos.length === 1
      ? 'Se bloqueó 1 intento'
      : `Se bloquearon ${intentos.length} intentos`
  return `${resumen} de conexión a servicios externos durante las pruebas unitarias: ${detalle}.`
}

export function ComprobarIntentosBloqueados() {
  const estado = ObtenerEstado()
  if (estado.intentos.length === 0) return
  const intentos = estado.intentos.splice(0)
  throw new Error(`${DescribirIntentos(intentos)} Simule la llamada en la prueba.`)
}

// Lo que corre después de cada prueba: si la prueba desinstaló el bloqueo, lo reinstala y
// falla con sus intentos en el mismo error, para que falle esa prueba y no la siguiente.
export function ComprobarBloqueoTrasPrueba() {
  if (VerificarBloqueoInstalado()) {
    ComprobarIntentosBloqueados()
    return
  }
  InstalarBloqueoRed()
  const intentos = ObtenerEstado().intentos.splice(0)
  const detalle = intentos.length > 0 ? ` ${DescribirIntentos(intentos)}` : ''
  throw new Error(
    'La prueba desinstaló el bloqueo de red de las pruebas unitarias. Restaure los mocks de red que reemplazó, por ejemplo con vi.restoreAllMocks() o vi.unstubAllGlobals().' +
      detalle,
  )
}

export function VerificarBloqueoInstalado() {
  const estado = ObtenerEstado()
  if (!estado.parches) return false
  const redInstalada =
    net.Socket.prototype.connect === estado.parches.conexionTcp &&
    dgram.createSocket === estado.parches.creacionUdp &&
    dgram.Socket.prototype.send === estado.parches.envioUdp &&
    dgram.Socket.prototype.connect === estado.parches.conexionUdp
  if (!redInstalada) return false
  const prototipo = ObtenerPrototipoXhr()
  if (!prototipo) return true
  const registro = estado.originales.xhr.get(prototipo)
  return Boolean(registro) && prototipo.open === registro.parche
}

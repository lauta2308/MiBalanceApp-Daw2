import { beforeAll, describe, expect, it } from 'vitest'
import net from 'node:net'
import https from 'node:https'
import dgram from 'node:dgram'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ComprobarBloqueoTrasPrueba,
  ComprobarIntentosBloqueados,
  EsHostLocal,
  InstalarBloqueoRed,
  ObtenerIntentosBloqueados,
  VerificarBloqueoInstalado,
} from './bloqueoRedPruebas.js'

const codigoBloqueo = 'ERR_RED_BLOQUEADA'

// Abre una conexión TCP y devuelve el error que emite el socket.
function EsperarErrorDeConexion(opciones) {
  return new Promise((resolver, rechazar) => {
    const socket = net.connect(opciones)
    socket.once('connect', () => {
      socket.destroy()
      rechazar(new Error('La conexión no debía establecerse'))
    })
    socket.once('error', resolver)
  })
}

// Consume el registro de intentos para que el afterEach de la configuración no falle.
function ConsumirIntentos() {
  try {
    ComprobarIntentosBloqueados()
  } catch {
    // El error es esperado: la prueba ya verificó el intento.
  }
}

function BuscarIntento(host, puerto) {
  return ObtenerIntentosBloqueados().find(
    (intento) => intento.host === host && String(intento.puerto) === String(puerto),
  )
}

beforeAll(() => {
  InstalarBloqueoRed()
})

describe('bloqueo de red de las pruebas unitarias', () => {
  it('test_rechaza_conexion_tcp_externa: net.connect a example.com:443 es rechazado y registrado', async () => {
    const error = await EsperarErrorDeConexion({ host: 'example.com', port: 443 })

    expect(error.code).toBe(codigoBloqueo)
    expect(BuscarIntento('example.com', 443)).toMatchObject({ protocolo: 'tcp' })
    ConsumirIntentos()
  })

  it('test_rechaza_conexion_tcp_externa / test_rechaza_conexion_externa_con_lookup_propio: un lookup propio no deja pasar un host externo', async () => {
    let llamadasLookup = 0
    function ResolverHaciaAfuera(_host, _opciones, alTerminar) {
      llamadasLookup += 1
      alTerminar(null, '93.184.215.14', 4)
    }

    const errorLocalhost = await EsperarErrorDeConexion({
      host: 'localhost',
      port: 443,
      lookup: ResolverHaciaAfuera,
    })
    const errorSinHost = await EsperarErrorDeConexion({ port: 443, lookup: ResolverHaciaAfuera })

    expect(errorLocalhost.code).toBe(codigoBloqueo)
    expect(errorSinHost.code).toBe(codigoBloqueo)
    expect(llamadasLookup).toBe(0)
    expect(ObtenerIntentosBloqueados()).toHaveLength(2)
    ConsumirIntentos()
  })

  it('test_rechaza_puerto_texto_no_canonico: un puerto en texto no canónico no se toma como ruta local', async () => {
    for (const puertoTexto of [' 443', '0x1bb', '+443', '443.0', '4.43e2']) {
      const error = await new Promise((resolver, rechazar) => {
        const socket = new net.Socket()
        socket.once('connect', () => {
          socket.destroy()
          rechazar(new Error('La conexión no debía establecerse'))
        })
        socket.once('error', resolver)
        socket.connect(puertoTexto, 'example.com')
      })

      expect(error.code, `puerto ${JSON.stringify(puertoTexto)}`).toBe(codigoBloqueo)
      const intentos = ObtenerIntentosBloqueados()
      expect(intentos).toHaveLength(1)
      expect(intentos[0]).toMatchObject({ protocolo: 'tcp', host: 'example.com' })
      ConsumirIntentos()
    }
  })

  it('test_rechaza_arreglo_no_normalizado: un arreglo sin el símbolo de Node se lee como opciones', async () => {
    const opcionesEnArreglo = [{ host: '127.0.0.1', port: 443 }]
    opcionesEnArreglo.host = 'example.com'
    opcionesEnArreglo.port = 443

    const error = await new Promise((resolver, rechazar) => {
      const socket = new net.Socket()
      socket.once('connect', () => {
        socket.destroy()
        rechazar(new Error('La conexión no debía establecerse'))
      })
      socket.once('error', resolver)
      socket.connect(opcionesEnArreglo)
    })

    expect(error.code).toBe(codigoBloqueo)
    expect(ObtenerIntentosBloqueados()).toEqual([
      expect.objectContaining({ protocolo: 'tcp', host: 'example.com', puerto: 443 }),
    ])
    ConsumirIntentos()
  })

  it('test_rechaza_loopback_con_ceros_y_lookup_propio: un loopback escrito con ceros no es IP literal para Node', async () => {
    let llamadasLookup = 0
    function ResolverHaciaAfuera(_host, _opciones, alTerminar) {
      llamadasLookup += 1
      alTerminar(null, '93.184.215.14', 4)
    }

    for (const host of ['127.000.000.001', '::ffff:127.0.0.01']) {
      const error = await EsperarErrorDeConexion({ host, port: 443, lookup: ResolverHaciaAfuera })
      expect(error.code, host).toBe(codigoBloqueo)
    }

    expect(llamadasLookup).toBe(0)
    expect(ObtenerIntentosBloqueados()).toHaveLength(2)
    ConsumirIntentos()
  })

  it('test_permite_ruta_de_socket_local: una conexión por ruta de socket local funciona y no registra intentos', async () => {
    const directorio = mkdtempSync(join(tmpdir(), 'bloqueo-red-'))
    const ruta = join(directorio, 'servidor.sock')
    const servidor = net.createServer((socket) => socket.end())
    await new Promise((resolver) => servidor.listen(ruta, resolver))
    try {
      for (const ConectarPorRuta of [
        (alConectar) => net.connect(ruta, alConectar),
        (alConectar) => net.connect({ path: ruta }, alConectar),
        (alConectar) => new net.Socket().connect(ruta, alConectar),
      ]) {
        await new Promise((resolver, rechazar) => {
          const socket = ConectarPorRuta(() => {
            socket.destroy()
            resolver()
          })
          socket.once('error', rechazar)
        })
      }
      expect(ObtenerIntentosBloqueados()).toHaveLength(0)
    } finally {
      await new Promise((resolver) => servidor.close(resolver))
      rmSync(directorio, { recursive: true, force: true })
    }
  })

  it('test_rechaza_fetch_externo: fetch a https://example.com es rechazado y registrado', async () => {
    let errorObtenido = null
    try {
      await fetch('https://example.com')
    } catch (error) {
      errorObtenido = error
    }

    expect(errorObtenido).not.toBeNull()
    expect(BuscarIntento('example.com', 443)).toBeDefined()
    ConsumirIntentos()
  })

  it('test_rechaza_https_externo: https.get a un host externo es rechazado con error', async () => {
    const error = await new Promise((resolver, rechazar) => {
      const solicitud = https.get('https://example.com/', (respuesta) => {
        respuesta.resume()
        rechazar(new Error('La solicitud no debía responder'))
      })
      solicitud.once('error', resolver)
    })

    expect(error.code).toBe(codigoBloqueo)
    expect(BuscarIntento('example.com', 443)).toBeDefined()
    ConsumirIntentos()
  })

  it('test_rechaza_udp_externo: dgram hacia un host externo es rechazado con error', async () => {
    const socket = dgram.createSocket('udp4')
    try {
      const errorEnvio = await new Promise((resolver) => {
        socket.send('hola', 53, 'example.com', resolver)
      })
      expect(errorEnvio?.code).toBe(codigoBloqueo)

      const errorConexion = await new Promise((resolver) => {
        socket.connect(53, 'example.com', resolver)
      })
      expect(errorConexion?.code).toBe(codigoBloqueo)

      const intentos = ObtenerIntentosBloqueados()
      expect(intentos).toHaveLength(2)
      expect(intentos.every((intento) => intento.protocolo === 'udp')).toBe(true)
      expect(BuscarIntento('example.com', 53)).toBeDefined()
    } finally {
      socket.close()
      ConsumirIntentos()
    }
  })

  it('test_rechaza_udp_externo / test_rechaza_udp_externo_con_lookup_propio: un socket con lookup propio solo acepta IP literal de loopback', async () => {
    let llamadasLookup = 0
    function ResolverHaciaAfuera(_host, _opciones, alTerminar) {
      llamadasLookup += 1
      alTerminar(null, '93.184.215.14', 4)
    }
    const socket = dgram.createSocket({ type: 'udp4', lookup: ResolverHaciaAfuera })
    try {
      const errorEnvio = await new Promise((resolver) => {
        socket.send('x', 9, 'localhost', resolver)
      })
      const errorSinDireccion = await new Promise((resolver) => {
        socket.send('x', 9, resolver)
      })
      const errorConexion = await new Promise((resolver) => {
        socket.connect(9, 'localhost', resolver)
      })

      expect(errorEnvio?.code).toBe(codigoBloqueo)
      expect(errorSinDireccion?.code).toBe(codigoBloqueo)
      expect(errorConexion?.code).toBe(codigoBloqueo)
      expect(llamadasLookup).toBe(0)
      expect(ObtenerIntentosBloqueados()).toHaveLength(3)
      ConsumirIntentos()

    } finally {
      socket.close()
      ConsumirIntentos()
    }
  })

  it('test_rechaza_udp_externo_con_lookup_propio_que_redirige_una_ip_literal: dgram siempre consulta el lookup', async () => {
    // A diferencia de net, dgram pasa por el lookup aun con una IP literal.
    const socket = dgram.createSocket({
      type: 'udp4',
      lookup: (host, _opciones, alTerminar) =>
        alTerminar(null, host === '127.0.0.1' ? '93.184.215.14' : host, 4),
    })
    try {
      const errorLiteral = await new Promise((resolver) => {
        socket.send('x', 9, '127.0.0.1', resolver)
      })
      expect(errorLiteral?.code).toBe(codigoBloqueo)
      expect(ObtenerIntentosBloqueados()).toEqual([
        expect.objectContaining({ protocolo: 'udp', host: '127.0.0.1' }),
      ])
    } finally {
      socket.close()
      ConsumirIntentos()
    }
  })

  it('test_mensaje_con_destino_legible: un host omitido se muestra como localhost y sin puerto solo el host', async () => {
    const error = await EsperarErrorDeConexion({
      port: 443,
      lookup: (_host, _opciones, alTerminar) => alTerminar(null, '127.0.0.1', 4),
    })
    expect(error.message).toContain('localhost:443')
    try {
      new XMLHttpRequest().open('GET', 'http://[ilegible', false)
    } catch {
      // El rechazo es esperado.
    }

    let mensaje = ''
    try {
      ComprobarIntentosBloqueados()
    } catch (errorComprobacion) {
      mensaje = errorComprobacion.message
    }
    expect(mensaje).toContain('localhost:443')
    expect(mensaje).toContain('url-ilegible (xhr')
    expect(mensaje).not.toMatch(/null:|:null/)
  })

  it('test_rechaza_xhr_sincrono_externo: open síncrono hacia un host externo es rechazado con error', () => {
    // jsdom convierte el tercer argumento a booleano: undefined y 0 también son síncronos.
    for (const asincrono of [false, undefined, 0]) {
      const solicitud = new XMLHttpRequest()
      let errorObtenido = null
      try {
        solicitud.open('GET', 'https://example.com/datos', asincrono)
      } catch (error) {
        errorObtenido = error
      }

      expect(errorObtenido?.code, `tercer argumento ${String(asincrono)}`).toBe(codigoBloqueo)
      expect(BuscarIntento('example.com', 443)).toMatchObject({ protocolo: 'xhr' })
      ConsumirIntentos()
    }
  })

  it('test_xhr_con_url_ilegible_no_registra_la_url: se registra un marcador fijo, nunca la URL', () => {
    const urlIlegible = 'http://[ilegible/secreto?clave=123'
    const solicitud = new XMLHttpRequest()
    let errorObtenido = null
    try {
      solicitud.open('GET', urlIlegible, false)
    } catch (error) {
      errorObtenido = error
    }

    expect(errorObtenido?.code).toBe(codigoBloqueo)
    const intentos = ObtenerIntentosBloqueados()
    expect(intentos).toHaveLength(1)
    expect(intentos[0].host).toBe('url-ilegible')
    expect(JSON.stringify(intentos)).not.toContain('secreto')
    ConsumirIntentos()
  })

  it('test_reinstalacion_xhr_envuelve_el_original: reinstalar no envuelve el open que dejó una prueba', () => {
    const aperturaAntes = XMLHttpRequest.prototype.open
    let llamadasFalsas = 0
    XMLHttpRequest.prototype.open = function AbrirFalso() {
      llamadasFalsas += 1
    }

    InstalarBloqueoRed()

    expect(XMLHttpRequest.prototype.open).toBe(aperturaAntes)
    expect(VerificarBloqueoInstalado()).toBe(true)
    new XMLHttpRequest().open('GET', 'http://127.0.0.1/', true)
    expect(llamadasFalsas).toBe(0)
  })

  it('test_permite_udp_por_socket_conectado_a_loopback: send sin destino usa la dirección conectada', async () => {
    const servidor = dgram.createSocket('udp4')
    const cliente = dgram.createSocket('udp4')
    try {
      await new Promise((resolver) => servidor.bind(0, '127.0.0.1', resolver))
      const { port: puerto } = servidor.address()
      const mensajes = []
      const recibirDos = new Promise((resolver) => {
        servidor.on('message', (mensaje) => {
          mensajes.push(mensaje.toString())
          if (mensajes.length === 2) resolver()
        })
      })

      await new Promise((resolver, rechazar) => {
        cliente.once('error', rechazar)
        cliente.connect(puerto, '127.0.0.1', resolver)
      })
      cliente.send(new TextEncoder().encode('hola'), 0, 4)
      await new Promise((resolver, rechazar) => {
        cliente.send(new TextEncoder().encode('chau'), 0, 4, (error) => (error ? rechazar(error) : resolver()))
      })
      await recibirDos

      expect(mensajes).toEqual(['hola', 'chau'])
      expect(ObtenerIntentosBloqueados()).toHaveLength(0)
    } finally {
      cliente.close()
      servidor.close()
    }
  })

  it('test_udp_con_conexion_en_curso_no_registra_intentos: mientras conecta a loopback, decide Node y no el bloqueo', async () => {
    const servidor = dgram.createSocket('udp4')
    const cliente = dgram.createSocket('udp4')
    try {
      await new Promise((resolver) => servidor.bind(0, '127.0.0.1', resolver))
      const { port: puerto } = servidor.address()

      // Mientras conecta, Node lee los argumentos como en un socket sin conectar y rechaza
      // el puerto 0 por su cuenta: el bloqueo no debe registrarlo como intento externo.
      const conectado = new Promise((resolver) => cliente.connect(puerto, '127.0.0.1', resolver))
      expect(() => cliente.send(new TextEncoder().encode('hola'), 0, 4)).toThrow(RangeError)
      expect(ObtenerIntentosBloqueados()).toHaveLength(0)
      await conectado

      // Un destino externo explícito sigue rechazado aunque haya un connect en curso.
      const otroCliente = dgram.createSocket('udp4')
      otroCliente.on('error', () => {})
      otroCliente.connect(puerto, '127.0.0.1')
      const errorExterno = await new Promise((resolver) => {
        otroCliente.send('x', 0, 1, 53, 'example.com', resolver)
      })
      otroCliente.close()
      expect(errorExterno?.code).toBe(codigoBloqueo)
      ConsumirIntentos()
    } finally {
      cliente.close()
      servidor.close()
    }
  })

  it('test_rechaza_host_que_imita_loopback: 127.0.0.1.ejemplo.com y localhost.ejemplo.com son externos', async () => {
    expect(EsHostLocal('127.0.0.1.ejemplo.com')).toBe(false)
    expect(EsHostLocal('localhost.ejemplo.com')).toBe(false)

    const errorIp = await EsperarErrorDeConexion({ host: '127.0.0.1.ejemplo.com', port: 80 })
    const errorNombre = await EsperarErrorDeConexion({ host: 'localhost.ejemplo.com', port: 80 })

    expect(errorIp.code).toBe(codigoBloqueo)
    expect(errorNombre.code).toBe(codigoBloqueo)
    expect(BuscarIntento('127.0.0.1.ejemplo.com', 80)).toBeDefined()
    expect(BuscarIntento('localhost.ejemplo.com', 80)).toBeDefined()
    ConsumirIntentos()
  })

  it('test_permite_loopback: una conexión a un servidor local en 127.0.0.1 funciona y no registra intentos', async () => {
    expect(VerificarBloqueoInstalado()).toBe(true)
    for (const host of ['localhost', '127.0.0.1', '127.1.2.3', '::1', '::ffff:127.0.0.1', '', undefined]) {
      expect(EsHostLocal(host)).toBe(true)
    }

    const servidor = net.createServer((socket) => socket.end())
    await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver))
    const { port: puerto } = servidor.address()
    try {
      await new Promise((resolver, rechazar) => {
        const socket = net.connect({ host: '127.0.0.1', port: puerto }, () => {
          socket.destroy()
          resolver()
        })
        socket.once('error', rechazar)
      })

      expect(ObtenerIntentosBloqueados()).toHaveLength(0)
    } finally {
      await new Promise((resolver) => servidor.close(resolver))
    }
  })

  it('test_intento_registrado_marca_error_en_la_prueba: ComprobarIntentosBloqueados nombra host:puerto y vacía el registro', async () => {
    await EsperarErrorDeConexion({ host: 'example.com', port: 8443 })

    expect(ObtenerIntentosBloqueados()).toHaveLength(1)
    expect(ObtenerIntentosBloqueados()[0]).toMatchObject({
      protocolo: 'tcp',
      host: 'example.com',
      puerto: 8443,
    })
    expect(() => ComprobarIntentosBloqueados()).toThrow('example.com:8443')
    expect(ObtenerIntentosBloqueados()).toHaveLength(0)
    expect(() => ComprobarIntentosBloqueados()).not.toThrow()
  })

  it('test_bloqueo_desinstalado_es_error: si una prueba reemplaza connect, VerificarBloqueoInstalado da false', () => {
    const conexionBloqueada = net.Socket.prototype.connect
    expect(VerificarBloqueoInstalado()).toBe(true)
    try {
      net.Socket.prototype.connect = function ConectarSinBloqueo() {
        return this
      }
      expect(VerificarBloqueoInstalado()).toBe(false)
    } finally {
      net.Socket.prototype.connect = conexionBloqueada
    }
    expect(VerificarBloqueoInstalado()).toBe(true)

    const creacionBloqueada = dgram.createSocket
    try {
      dgram.createSocket = function CrearSinBloqueo() {}
      expect(VerificarBloqueoInstalado()).toBe(false)
    } finally {
      dgram.createSocket = creacionBloqueada
    }
    expect(VerificarBloqueoInstalado()).toBe(true)
  })

  it('test_bloqueo_desinstalado_falla_con_sus_intentos: el error nombra los intentos y vacía el registro', async () => {
    await EsperarErrorDeConexion({ host: 'example.com', port: 443 })
    net.Socket.prototype.connect = function ConectarSinBloqueo() {
      return this
    }

    let errorObtenido = null
    try {
      ComprobarBloqueoTrasPrueba()
    } catch (error) {
      errorObtenido = error
    }

    expect(errorObtenido?.message).toContain('desinstaló el bloqueo de red')
    expect(errorObtenido?.message).toContain('example.com:443')
    expect(errorObtenido?.message).toContain('vi.restoreAllMocks()')
    expect(errorObtenido?.message).toContain('vi.unstubAllGlobals()')
    expect(ObtenerIntentosBloqueados()).toHaveLength(0)
    expect(VerificarBloqueoInstalado()).toBe(true)
  })

  it('test_instalacion_idempotente: instalar dos veces no duplica parches ni registros', async () => {
    const conexionAntes = net.Socket.prototype.connect
    const envioAntes = dgram.Socket.prototype.send
    const conexionUdpAntes = dgram.Socket.prototype.connect
    const creacionUdpAntes = dgram.createSocket
    const aperturaAntes = XMLHttpRequest.prototype.open

    InstalarBloqueoRed()
    InstalarBloqueoRed()

    expect(net.Socket.prototype.connect).toBe(conexionAntes)
    expect(dgram.Socket.prototype.send).toBe(envioAntes)
    expect(dgram.Socket.prototype.connect).toBe(conexionUdpAntes)
    expect(dgram.createSocket).toBe(creacionUdpAntes)
    expect(dgram.createSocket.name).toBe('CrearSocketUdpConBloqueo')
    expect(XMLHttpRequest.prototype.open).toBe(aperturaAntes)
    expect(VerificarBloqueoInstalado()).toBe(true)

    await EsperarErrorDeConexion({ host: 'example.com', port: 443 })
    expect(ObtenerIntentosBloqueados()).toHaveLength(1)
    ConsumirIntentos()
  })
})

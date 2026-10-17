#include <Arduino.h>
#include <WiFi.h>
#include <DNSServer.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <esp_wifi.h>

// ---------------------------------------------------------------------------
// Configuración de red
// ---------------------------------------------------------------------------
static const char *const AP_SSID = "Portal_Riesgos_Chile";
#define PLACA 1   // 1, 2 o 3: lo único que cambias en cada placa
static const uint8_t CANALES[3] = {1, 6, 11};
static const uint8_t AP_CANAL = CANALES[PLACA - 1];
static const uint8_t AP_MAX_CLIENTES = 10;  // límite de hardware del SoftAP del ESP32-S3
static const uint16_t DNS_PUERTO = 53;

static const char *const HOST_PORTAL = "192.168.4.1";
static const char *const URL_PORTAL = "http://192.168.4.1/";

static const IPAddress AP_IP(192, 168, 4, 1);
static const IPAddress AP_GATEWAY(192, 168, 4, 1);
static const IPAddress AP_MASCARA(255, 255, 255, 0);

DNSServer dnsServer;
AsyncWebServer server(80);
// --- Control de inactividad ---
static const uint32_t LIMITE_INACTIVIDAD_MS = 60000;               // sin latido ni petición
static const uint32_t ROTACION_MS           = 210000;              // 3 min 30 s conectado
static const uint8_t  UMBRAL_DESALOJO       = AP_MAX_CLIENTES - 1; // desde aquí se libera un cupo

struct Cliente {
  bool     uso;
  uint8_t  mac[6];
  uint16_t aid;
  uint32_t ip;
  uint32_t conectado;
  uint32_t visto;
};
static Cliente clientes[AP_MAX_CLIENTES];
static portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

static int buscarMac(const uint8_t *mac) {
  for (int i = 0; i < AP_MAX_CLIENTES; i++)
    if (clientes[i].uso && memcmp(clientes[i].mac, mac, 6) == 0) return i;
  return -1;
}
static int buscarIp(uint32_t ip) {
  for (int i = 0; i < AP_MAX_CLIENTES; i++)
    if (clientes[i].uso && clientes[i].ip == ip) return i;
  return -1;
}

static void alEventoWiFi(arduino_event_id_t ev, arduino_event_info_t info) {
  uint32_t ahora = millis();
  portENTER_CRITICAL(&mux);
  if (ev == ARDUINO_EVENT_WIFI_AP_STACONNECTED) {
    int i = buscarMac(info.wifi_ap_staconnected.mac);
    if (i < 0) { i = 0; while (i < AP_MAX_CLIENTES && clientes[i].uso) i++; }
    if (i < AP_MAX_CLIENTES) {
      memset(&clientes[i], 0, sizeof(Cliente));
      clientes[i].uso = true;
      memcpy(clientes[i].mac, info.wifi_ap_staconnected.mac, 6);
      clientes[i].aid = info.wifi_ap_staconnected.aid;
      clientes[i].conectado = clientes[i].visto = ahora;
    }
  } else if (ev == ARDUINO_EVENT_WIFI_AP_STADISCONNECTED) {
    int i = buscarMac(info.wifi_ap_stadisconnected.mac);
    if (i >= 0) clientes[i].uso = false;
  } else if (ev == ARDUINO_EVENT_WIFI_AP_STAIPASSIGNED) {
    int i = buscarMac(info.wifi_ap_staipassigned.mac);
    if (i >= 0) { clientes[i].ip = info.wifi_ap_staipassigned.ip.addr; clientes[i].visto = ahora; }
  }
  portEXIT_CRITICAL(&mux);
}

static void registrarActividad(AsyncWebServerRequest *request) {
  uint32_t ip = (uint32_t)request->client()->remoteIP();
  portENTER_CRITICAL(&mux);
  int i = buscarIp(ip);
  if (i >= 0) clientes[i].visto = millis();
  portEXIT_CRITICAL(&mux);
}

static void desalojarSiHayPresion() {
  uint32_t ahora = millis();
  int n = 0, idxInactivo = -1, idxAntiguo = -1;
  uint32_t maxInactivo = 0, maxConectado = 0;
  uint16_t aid = 0;
  const char *motivo = "";

  portENTER_CRITICAL(&mux);
  for (int i = 0; i < AP_MAX_CLIENTES; i++) {
    if (!clientes[i].uso) continue;
    n++;
    uint32_t sinActividad = ahora - clientes[i].visto;
    uint32_t tiempoConectado = ahora - clientes[i].conectado;
    if (sinActividad >= LIMITE_INACTIVIDAD_MS && sinActividad > maxInactivo) { maxInactivo = sinActividad; idxInactivo = i; }
    if (tiempoConectado >= ROTACION_MS && tiempoConectado > maxConectado) { maxConectado = tiempoConectado; idxAntiguo = i; }
  }
  if (n >= UMBRAL_DESALOJO && idxInactivo >= 0) { aid = clientes[idxInactivo].aid; motivo = "inactivo"; }
  portEXIT_CRITICAL(&mux);

  if (aid) {   // aid 0 expulsaría a todos: nunca se llama sin este if
    esp_wifi_deauth_sta(aid);
    Serial.printf("Placa %d: cliente expulsado (%s). Conectados antes: %d\n", PLACA, motivo, n);
  }
}
// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

// Redirige (302) al portal. Responder 204 en /generate_204 o "Success" en
// /hotspot-detect.html haría creer al sistema operativo que hay internet y el
// portal no se abriría automáticamente.
static void redirigirAlPortal(AsyncWebServerRequest *request) {
  request->redirect(URL_PORTAL);
}

// Para cualquier ruta inexistente: si la petición llegó con un dominio ajeno
// (secuestro DNS), se redirige al portal. Si ya está en 192.168.4.1 o pide "/",
// se responde 404 para evitar un bucle de redirecciones (por ejemplo, si
// index.html no estuviera en LittleFS).
static void manejarNoEncontrado(AsyncWebServerRequest *request) {
  const bool yaEnElPortal = request->host().startsWith(HOST_PORTAL);
  if (yaEnElPortal || request->url() == "/") {
    request->send(404, "text/plain", "404 - Recurso no encontrado en el portal");
    return;
  }
  redirigirAlPortal(request);
}

// ---------------------------------------------------------------------------
// setup / loop
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("=== Portal cautivo offline - ESP32-S3 N16R8 ===");
  Serial.printf("Flash: %lu bytes | PSRAM: %lu bytes\n",
                (unsigned long)ESP.getFlashChipSize(),
                (unsigned long)ESP.getPsramSize());

  // Sistema de archivos: sin formateo automático para no borrar datos por error.
  if (!LittleFS.begin(false, "/littlefs", 20, "spiffs")) {
    while (true) {
      Serial.println("ERROR: no se pudo montar LittleFS. Ejecuta 'Upload Filesystem Image'.");
      delay(2000);
    }
  }
  Serial.printf("LittleFS: %lu bytes usados de %lu\n",
                (unsigned long)LittleFS.usedBytes(),
                (unsigned long)LittleFS.totalBytes());

  // SoftAP abierto con IP estática
  WiFi.persistent(false);
  WiFi.mode(WIFI_AP);
  WiFi.onEvent(alEventoWiFi);
  if (!WiFi.softAPConfig(AP_IP, AP_GATEWAY, AP_MASCARA)) {
    Serial.println("ERROR: no se pudo configurar la IP estática del SoftAP.");
  }
  if (!WiFi.softAP(AP_SSID, nullptr, AP_CANAL, 0, AP_MAX_CLIENTES)) {
    Serial.println("ERROR: no se pudo iniciar el SoftAP. Reiniciando...");
    delay(2000);
    ESP.restart();
  }
  esp_wifi_set_inactive_time(WIFI_IF_AP, 60);
  Serial.printf("Placa %d | '%s' | canal %d | máx %d | IP %s\n", PLACA, AP_SSID, AP_CANAL, AP_MAX_CLIENTES, WiFi.softAPIP().toString().c_str());

  // Servidor DNS: cualquier dominio resuelve a 192.168.4.1
  dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
  if (!dnsServer.start(DNS_PUERTO, "*", AP_IP)) {
    Serial.println("ERROR: no se pudo iniciar el servidor DNS.");
  }

  // Rutas de detección de conectividad (Android, iOS, Windows)
  server.on("/generate_204", HTTP_ANY, redirigirAlPortal);
  server.on("/hotspot-detect.html", HTTP_ANY, redirigirAlPortal);
  server.on("/ncsi.txt", HTTP_ANY, redirigirAlPortal);

  // Archivos estáticos desde LittleFS, con caché de 24 horas
    server.on("/ping", HTTP_GET, [](AsyncWebServerRequest *request) {
    registrarActividad(request);
    request->send(204);
  });
  server.serveStatic("/", LittleFS, "/")
      .setDefaultFile("index.html")
      .setCacheControl("max-age=86400")
      .setFilter([](AsyncWebServerRequest *request) {
        if (request->host().startsWith(HOST_PORTAL)) registrarActividad(request);
        return true;
      });

  // Cualquier otra ruta
  server.onNotFound(manejarNoEncontrado);

  server.begin();
  Serial.println("Servidor web iniciado en el puerto 80.");
}

void loop() {
  dnsServer.processNextRequest();

  static uint32_t tPurga = 0;
  if (millis() - tPurga >= 2000) { tPurga = millis(); desalojarSiHayPresion(); }
   static uint32_t t0 = 0;
  if (millis() - t0 > 5000) {
    t0 = millis();
    Serial.printf("Placa %d: %d/%d conectados\n", PLACA, WiFi.softAPgetStationNum(), AP_MAX_CLIENTES);
  }
  static uint32_t ultimoReporte = 0;
  if (millis() - ultimoReporte >= 10000) {
    ultimoReporte = millis();
    Serial.printf("Clientes: %d | Heap libre: %lu | PSRAM libre: %lu\n",
                  (int)WiFi.softAPgetStationNum(),
                  (unsigned long)ESP.getFreeHeap(),
                  (unsigned long)ESP.getFreePsram());
  }

  delay(2);
}
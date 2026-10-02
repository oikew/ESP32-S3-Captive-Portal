# Portal Cautivo ESP32-S3 (Feria Científica)

*Read this document in [English](README.md).*

# Contexto del Proyecto
Portal de contingencia y prevención de riesgos naturales desarrollado de forma 100% offline para la feria científica del Colegio Bicentenario de Excelencia Newen.

# Arquitectura y Despliegue
- Servidor Físico: ESP32-S3 operando como red Wi-Fi aislada y servidor DNS/HTTP simultáneo.
- Base de Datos Local: Archivo `data.json` que mapea 16 regiones de Chile y 15 protocolos oficiales de SENAPRED procesados algorítmicamente.
- Optimización Web: Diseño *Mobile-First*, sin dependencias externas (CDNs) y carga diferida (*Lazy Loading*) para imágenes `.webp`.

# Evidencia Física
<img width="1600" height="900" alt="ESP32-S3" src="https://github.com/user-attachments/assets/621b8a60-d00f-40b6-af8d-dbfb465568da" />

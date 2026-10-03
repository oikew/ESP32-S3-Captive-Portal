# ESP32-S3-Captive-Portal
Asynchronous captive portal serving highly concurrent local traffic using LittleFS and web optimization on ESP32-S3 N16R8.

*Read this document in [Español](README-es.md).*

## The Problem
Serving a robust, mobile-first Web Application (SPA) with 16 geographical regions and heavy disaster response protocols to dozens of concurrent users without internet access.

## The Architecture
- **Hardware:** ESP32-S3 N16R8. Leveraged its 16MB Flash and 8MB PSRAM to handle concurrent local traffic.
- **Firmware/Storage:** LittleFS for injecting the SPA directly into the silicon.
- **Frontend:** Vanilla JS, CSS-only (no CDNs). Asynchronous JSON fetching with hybrid icon rendering.
- **Network:** Zero-latency Lazy Loading implemented to prevent Wi-Fi bandwidth bottlenecks.

## Methodology
The network topology, hardware selection (ESP32-S3, PSRAM constraints), thermal load management, and JSON data funneling were architected independently. Syntax generation for C++ and JS was AI-assisted under strict embedded-system constraints.

## Visual Evidence
<img width="1600" height="900" alt="ESP32-S3" src="https://github.com/user-attachments/assets/f68f01d8-6ba4-4bc3-8136-d9871d53c7bf" />

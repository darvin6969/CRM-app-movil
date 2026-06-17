# Quantica CRM App - Cliente Móvil

Aplicación móvil oficial para clientes del sistema **Quantica CRM**. Desarrollada para ofrecer una experiencia nativa fluida, esta aplicación permite a los usuarios acceder a su perfil de lealtad, visualizar sus puntos, explorar beneficios según su nivel (Tier) y canjear recompensas en tiempo real.

---

## Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura Móvil](#arquitectura-móvil)
3. [Características Principales](#características-principales)
4. [Tecnologías y Stack](#tecnologías-y-stack)
5. [Guía de Instalación](#guía-de-instalación)
6. [Estructura del Proyecto](#estructura-del-proyecto)

---

## Descripción General

La aplicación móvil es la interfaz directa entre el cliente final y el programa de fidelización de Quantica. Su objetivo es mantener al cliente comprometido mediante notificaciones push personalizadas, visualización del progreso hacia el siguiente nivel y un catálogo interactivo de premios.

---

## Arquitectura Móvil

La aplicación está construida utilizando un enfoque híbrido moderno impulsado por **Expo** y **React Native**, lo que permite compilar para plataformas iOS y Android desde un único código base.

*   **Autenticación y Datos:** Se integra directamente con el backend de Supabase mediante su SDK de JavaScript, utilizando autenticación basada en correo electrónico o Single Sign-On (OAuth).
*   **Diseño UI:** Implementación de utilidades CSS a través de NativeWind, permitiendo utilizar las mismas clases de Tailwind CSS que se emplean en el CRM Web.
*   **Enrutamiento:** Basado en archivos mediante `expo-router`, facilitando la navegación mediante pestañas (Tabs) y pilas de vistas (Stacks).
*   **Notificaciones:** Uso extensivo del servicio de notificaciones Push de Expo, conectado al backend para recibir alertas recurrentes, transaccionales y manuales.

---

## Características Principales

### 1. Perfil de Lealtad (Gamificación)
*   Visualización del saldo actual de puntos.
*   Progreso visual para alcanzar el siguiente nivel (Bronze, Silver, Gold, Platinum).
*   Historial detallado de acumulación y canje de puntos.

### 2. Catálogo de Recompensas
*   Exploración de premios disponibles según el puntaje actual.
*   Flujo de canje integrado que genera un código QR de validación.
*   Categorización y filtros de premios.

### 3. Código QR de Identificación
*   Generación de código QR único por usuario para que los agentes en tiendas físicas (utilizando el panel Web) puedan escanear e identificar rápidamente la cuenta para asignar puntos.

### 4. Centro de Notificaciones
*   Bandeja de entrada in-app para revisar el historial de mensajes enviados por el CRM.
*   Recepción de alertas Push en segundo plano y con la aplicación cerrada.

---

## Tecnologías y Stack

*   **Framework Base:** React Native
*   **Herramienta de Desarrollo:** Expo SDK
*   **Enrutador:** Expo Router (File-based routing)
*   **Estilos:** Tailwind CSS (vía NativeWind v4)
*   **Backend as a Service:** Supabase SDK
*   **Lenguaje:** TypeScript

---

## Guía de Instalación

Siga las instrucciones para correr la aplicación móvil en un simulador o dispositivo físico.

### Prerrequisitos

*   Node.js (versión 18 o superior).
*   Aplicación **Expo Go** instalada en su dispositivo móvil iOS o Android.

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/App-Movil-Quantica.git
   cd App-Movil-Quantica
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar las Variables de Entorno:**
   Cree un archivo `.env` en la raíz del proyecto. Este archivo no se sube a control de versiones. Agregue sus credenciales:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=URL_DE_SU_PROYECTO_SUPABASE
   EXPO_PUBLIC_SUPABASE_ANON_KEY=CLAVE_ANONIMA_DE_SUPABASE
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm start
   ```
   *Opcionalmente, puede usar `npx expo start`.*

5. **Visualizar la App:**
   Escanee el código QR que aparecerá en su terminal usando la cámara de su dispositivo (iOS) o la app Expo Go (Android) para compilar y cargar la interfaz en su teléfono.

---

## Estructura del Proyecto

```text
/
├── app/                    # Rutas de la aplicación (Expo Router)
│   ├── (tabs)/             # Vistas de la barra de navegación inferior (Home, Catálogo, Perfil)
│   ├── login.tsx           # Pantalla de inicio de sesión
│   ├── register.tsx        # Pantalla de registro
│   └── _layout.tsx         # Configuración global del enrutador
├── assets/                 # Imágenes, iconos, fuentes y splash screen
├── components/             # Componentes de UI reutilizables (Botones, Modales, QR)
├── lib/                    # Lógica de conexión a servicios
│   ├── supabase.ts         # Cliente de Supabase
│   └── notifications.ts    # Configuración de Expo Push Token
├── types/                  # Tipado estático de TypeScript
├── package.json            # Dependencias
├── app.json                # Configuración global de Expo (Nombre, paquete, iconos)
└── tailwind.config.js      # Configuración de diseño con NativeWind
```

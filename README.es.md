# Gemini CLI

[![Gemini CLI CI](https://github.com/google-gemini/gemini-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/google-gemini/gemini-cli/actions/workflows/ci.yml)

![Captura de pantalla de Gemini CLI](./docs/assets/gemini-screenshot.png)

Este repositorio contiene Gemini CLI, una herramienta de flujo de trabajo de IA de línea de comandos que se conecta a tus
herramientas, comprende tu código y acelera tus flujos de trabajo.

Con Gemini CLI puedes:

- Consultar y editar grandes bases de código dentro y más allá de la ventana de contexto de 1 millón de tokens de Gemini.
- Generar nuevas aplicaciones a partir de archivos PDF o bocetos, utilizando las capacidades multimodales de Gemini.
- Automatizar tareas operativas, como consultar solicitudes de extracción o manejar rebases complejos.
- Usar herramientas y servidores MCP para conectar nuevas capacidades, incluida la [generación de medios con Imagen,
  Veo o Lyria](https://github.com/GoogleCloudPlatform/vertex-ai-creative-studio/tree/main/experiments/mcp-genmedia)
- Fundamentar tus consultas con la herramienta de [Búsqueda de Google](https://ai.google.dev/gemini-api/docs/grounding)
  , integrada en Gemini.

## Inicio rápido

1. **Requisitos previos:** Asegúrate de tener instalado [Node.js versión 20](https://nodejs.org/en/download) o superior.
2. **Ejecuta la CLI:** Ejecuta el siguiente comando en tu terminal:

   ```bash
   npx https://github.com/google-gemini/gemini-cli
   ```

   O instálalo con:

   ```bash
   npm install -g @google/gemini-cli
   gemini
   ```

3. **Elige un tema de color**
4. **Autenticación:** Cuando se te solicite, inicia sesión con tu cuenta personal de Google. Esto te otorgará hasta 60 solicitudes de modelo por minuto y 1,000 solicitudes de modelo por día usando Gemini.

¡Ya estás listo para usar Gemini CLI!

### Usa una clave de API de Gemini:

La API de Gemini proporciona un nivel gratuito con [100 solicitudes por día](https://ai.google.dev/gemini-api/docs/rate-limits#free-tier) usando Gemini 2.5 Pro, control sobre qué modelo usas y acceso a límites de tasa más altos (con un plan de pago):

1. Genera una clave desde [Google AI Studio](https://aistudio.google.com/apikey).
2. Establécela como una variable de entorno en tu terminal. Reemplaza `TU_CLAVE_DE_API` con tu clave generada.

   ```bash
   export GEMINI_API_KEY="TU_CLAVE_DE_API"
   ```

3. (Opcional) Actualiza tu proyecto de la API de Gemini a un plan de pago en la página de la clave de API (desbloqueará automáticamente los [límites de tasa de Nivel 1](https://ai.google.dev/gemini-api/docs/rate-limits#tier-1))

Para otros métodos de autenticación, incluidas las cuentas de Google Workspace, consulta la guía de [autenticación](./docs/cli/authentication.md).

## Ejemplos

Una vez que la CLI esté en funcionamiento, puedes comenzar a interactuar con Gemini desde tu shell.

Puedes iniciar un proyecto desde un nuevo directorio:

```sh
cd nuevo-proyecto/
gemini
> Escríbeme un bot de Discord de Gemini que responda preguntas usando un archivo FAQ.md que proporcionaré
```

O trabajar con un proyecto existente:

```sh
git clone https://github.com/google-gemini/gemini-cli
cd gemini-cli
gemini
> Dame un resumen de todos los cambios que se realizaron ayer
```

### Próximos pasos

- Aprende cómo [contribuir o compilar desde el código fuente](./CONTRIBUTING.md).
- Explora los **[Comandos de la CLI](./docs/cli/commands.md)** disponibles.
- Si encuentras algún problema, revisa la **[Guía de solución de problemas](./docs/troubleshooting.md)**.
- Para obtener documentación más completa, consulta la [documentación completa](./docs/index.md).
- Echa un vistazo a algunas [tareas populares](#tareas-populares) para obtener más inspiración.

### Solución de problemas

Dirígete a la guía de [solución de problemas](docs/troubleshooting.md) si tienes
problemas.

## Tareas populares

### Explora una nueva base de código

Comienza haciendo `cd` en un repositorio existente o recién clonado y ejecutando `gemini`.

```text
> Describe las piezas principales de la arquitectura de este sistema.
```

```text
> ¿Qué mecanismos de seguridad existen?
```

### Trabaja con tu código existente

```text
> Implementa un primer borrador para el issue de GitHub #123.
```

```text
> Ayúdame a migrar esta base de código a la última versión de Java. Comienza con un plan.
```

### Automatiza tus flujos de trabajo

Usa servidores MCP para integrar las herramientas de tu sistema local con tu suite de colaboración empresarial.

```text
> Hazme una presentación de diapositivas que muestre el historial de git de los últimos 7 días, agrupado por función y miembro del equipo.
```

```text
> Crea una aplicación web de pantalla completa para una pantalla de pared que muestre nuestros issues de GitHub con los que más se ha interactuado.
```

### Interactúa con tu sistema

```text
> Convierte todas las imágenes de este directorio a png y cámbiales el nombre para usar las fechas de los datos exif.
```

```text
> Organiza mis facturas en PDF por mes de gasto.
```

### Desinstalar

Dirígete a la guía de [Desinstalación](docs/Uninstall.md) para obtener instrucciones de desinstalación.

## Términos de servicio y Aviso de privacidad

Para obtener detalles sobre los términos de servicio y el aviso de privacidad aplicables a tu uso de Gemini CLI, consulta los [Términos de servicio y Aviso de privacidad](./docs/tos-privacy.md).

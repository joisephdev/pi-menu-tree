# Plan — Grouped Slash Menu

## Objetivo
Mejorar el autocompletado que aparece al escribir `/` en Pi, para que los comandos se distingan por procedencia y sean más rápidos de encontrar.

## Alcance inicial (MVP)

1. Crear una extensión TypeScript global instalable desde `~/.pi/agent/extensions/`.
2. Envolver —sin reemplazar— el proveedor nativo de autocompletado con `ctx.ui.addAutocompleteProvider()`.
3. Clasificar las sugerencias en:
   - **Nativo**: comandos propios de Pi.
   - **Extensión**: comandos registrados por extensiones.
   - **Prompt**: plantillas de `prompts/`.
   - **Skill**: comandos `/skill:<nombre>`.
4. Al escribir `/`, abrir inmediatamente un menú raíz integrado bajo el editor con Native commands, Extensions, Skills y Prompt templates.
5. Al seleccionar una categoría, sustituirlo por un submenú integrado con sus comandos; `Esc` vuelve al menú raíz.
6. Al seleccionar un comando final, escribirlo en el editor y conservar el Enter final nativo para ejecutarlo.
7. Mantener el autocompletado nativo para rutas y para comandos escritos manualmente (`/model`, `/skill:...`).

## Decisiones técnicas

- Usar la API pública de Pi; no modificar ni hacer fork de Pi.
- Reemplazar únicamente el editor con una subclase de `CustomEditor`; Pi conserva sus atajos y conecta el proveedor nativo automáticamente.
- Obtener extensiones, prompts y skills mediante `pi.getCommands()`, que incluye su campo canónico `source`.
- Definir los comandos nativos en un catálogo local porque `pi.getCommands()` no los devuelve.
- Suprimir solo el autocompletado nativo cuando el texto es exactamente `/`; el menú jerárquico se renderiza como parte del editor, no como modal.

## Estructura prevista

```text
grouped-slash-menu/
├── PLAN.md
├── README.md
├── index.ts
└── package.json          # opcional; solo si hiciera falta para distribución
```

## Implementación

1. Definir el mapa inmutable de categorías, sus prefijos y el orden de presentación.
2. Implementar una función de clasificación basada en `pi.getCommands()` y el conjunto de comandos nativos.
3. Registrar un wrapper de `AutocompleteProvider` durante `session_start`.
4. Delegar `getSuggestions`, etiquetar las sugerencias de slash commands y reordenarlas solo en la raíz `/`.
5. Delegar sin cambios `applyCompletion` y `shouldTriggerFileCompletion`.
6. Evitar el registro duplicado al recargar la sesión/extensión.

## Validación

1. Cargar temporalmente la extensión:
   ```bash
   pi -e ./grouped-slash-menu/index.ts
   ```
2. Escribir `/` y confirmar que aparecen las cuatro categorías visuales.
3. Probar `/skill:` y una plantilla/prompt para verificar que se insertan y ejecutan correctamente.
4. Probar un comando de extensión y uno nativo (`/settings`) para confirmar que el wrapper no altera la ejecución.
5. Probar `@archivo` y rutas para confirmar que la autocompletación de archivos sigue intacta.
6. Copiar la carpeta final a `~/.pi/agent/extensions/grouped-slash-menu/` y ejecutar `/reload`.

## Futuras mejoras (fuera del MVP)

- Un modo de navegación por categorías con una UI propia.
- Configuración de orden, iconos y categorías visibles.
- Atajos para filtrar directamente por tipo.
- Convertirlo en un paquete Pi publicable por npm.

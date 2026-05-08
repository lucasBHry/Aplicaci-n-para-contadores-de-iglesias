# Ofrendas App

App de contabilidad para organizaciones sin fines de lucro.

## Requisitos (solo para quien la compila/desarrolla)
- Node.js v18 o superior
- En Windows: Visual Studio Build Tools (para compilar better-sqlite3)
- En Mac: Xcode Command Line Tools (`xcode-select --install`)

## Instalación y primer arranque

```bash
# 1. Entra en la carpeta
cd ofrendas-app

# 2. Instala dependencias
npm install

# 3. Arranca la app en modo desarrollo
npm start
```

## Generar instaladores para distribuir

```bash
# Solo Windows (.exe)
npm run build:win

# Solo Mac (.dmg)
npm run build:mac

# Ambos
npm run build
```

Los instaladores quedan en la carpeta `dist/`.

## Notas
- La base de datos se guarda automáticamente en la carpeta de datos del usuario
  - Windows: `%APPDATA%\ofrendas-app\ofrendas.db`
  - Mac: `~/Library/Application Support/ofrendas-app/ofrendas.db`
- No requiere instalar nada externo para los usuarios finales

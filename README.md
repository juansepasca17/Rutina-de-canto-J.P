# 🎙️ Vocalia — rutina de canto J.P

Rutina vocal por categorías, con timer, minijuegos que escuchan tu voz y un desafío de 30 días de respiración.

- **📱 Úsala en el celular o en el navegador: [https://rutina-de-canto-jp-five.vercel.app](https://rutina-de-canto-jp-five.vercel.app/)
- **🪟 Descarga para Windows:** [Vocalia.exe (última versión)](https://github.com/juansepasca17/Rutina-de-canto-J.P/releases/latest/download/Vocalia.exe)

## Qué trae

- **Categorías = tandas**: Relajación, Respiración, Apoyo y control, Resonancia, Proyección, Fonación, Afinación, Ritmo, Articulación y Kodály. Cada tanda corre sus ejercicios uno tras otro con "prepárate", pausa, saltar, volver y ±15 s.
- **Minijuegos con el micrófono**: soplo medido, vela virtual, afinar una nota, ruta de notas (escalas, sirenas, intervalos), volumen, ritmo, récords y grabarte.
- **Desafío de 30 días**: los días 1–21 siguen el curso de *El super poder pulmonar*; los días 22–30 son de repaso e integración con canto, con prueba inicial y final.
- **Ajustes**: tonalidad, registro de voz, duración, calibración del micrófono y rango vocal.

Todo funciona sin conexión y tu progreso se guarda solo en tu dispositivo: no hay cuentas ni se envía nada a internet.

## En Android

Abre el enlace en Chrome → menú ⋮ → **Agregar a la pantalla principal**. Queda como una app con su ícono. La primera vez, permite el micrófono.

## En Windows

Descarga `Vocalia.exe` y ábrelo. Es un solo archivo, sin instalación; usa el motor WebView2 que trae Windows 10/11.

- Como el `.exe` no tiene firma digital de pago, Windows SmartScreen puede decir *"Windows protegió su PC"*. Toca **Más información → Ejecutar de todas formas**.
- Puedes comprobar que el archivo es el original con su suma **SHA-256**, que está en las notas de la versión:
  ```powershell
  Get-FileHash .\Vocalia.exe -Algorithm SHA256
  ```
- El `.exe` no pide permisos de administrador, no abre puertos y solo escribe en `%LOCALAPPDATA%\Vocalia`. El código está en [`escritorio/`](escritorio/).

## Para desarrollar

| Archivo | Qué contiene |
|---|---|
| `js/data/exercises.js` | Los ejercicios (título, texto, duración, minijuego) |
| `js/data/categories.js` | Las categorías y su orden |
| `js/data/soploPatterns.js` | Los patrones de respiración |
| `js/data/challenge30.js` | Los 30 días del desafío |

- Pruebas: `node --test tests/*.test.mjs`
- Probar la web en local: `python servidor.py` → <http://localhost:5173>
- Compilar el `.exe`: `cd escritorio && dotnet build -c Release` (deja `Vocalia.exe` en la raíz)
- Cada push a `main` actualiza la página en Vercel.

## Créditos

Rutina de **Juan Sebastián Pascagaza Rivera**. El desafío se basa en el curso de 21 días de *El super poder pulmonar*, de A. A. "Sandy" Adam; las instrucciones están redactadas con palabras propias. Licencia MIT.

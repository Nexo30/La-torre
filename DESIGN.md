# La Torre (roguelike por turnos, pixel art, Android)
Concepto: sube una torre de 10 pisos con niebla de guerra; 4 clases (Guerrero, Maga, Arquero, Asesino) y sexo Hombre/Mujer (cambia look y pequeños stats).
Mecánica: cada acción válida (paso, ataque, habilidad, poción, esperar) gasta 1 turno y luego actúan los enemigos. Piso 10 tiene al Guardián.
Arte: sprites pixel art dibujados por código en 16x16 con paleta morada del atardecer en la torre.

## Journal
- Balance (bot headless): Guardián bajado a 36 vida / ataque 6 sin escalar; menos enemigos por piso (2 + 0.6·piso); subir piso da +2 vida máxima y 50% curación. Bot medio llega al piso 6-7.
- Bug corregido: la niebla no se actualizaba al caminar (faltaba updateVision en endTurn).
- Bug corregido: los toques quedaban desalineados porque el tablero cambia de alto cuando crece el registro; ahora se usa ResizeObserver.
- Primera versión creada: controles táctiles (tocar casilla), habilidad por clase, cofres, 5 tipos de enemigos.

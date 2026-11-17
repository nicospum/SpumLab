# Wheeler · Preguntas y elección retardada

Primera escena del laboratorio independiente `/wheeler/`, incorporado al catálogo de SPUM. La portada aprobada reinterpreta artísticamente el ojo y el universo participativo mediante una imagen generada. Se distribuye como WebP de 312 KB y 1254 × 1254 píxeles.

La segunda escena se abre directamente en `/wheeler/#eleccion-retardada`. Las dos escenas conservan su estado durante la visita. Cambiar de escena pausa el viaje de un fotón; volver permite continuarlo. Recargar inicia una sesión nueva.

## Segunda escena: elegir cuando ya entró

Un interferómetro de Mach–Zehnder ideal permite enviar un fotón desde la fuente, ajustar la fase entre sus brazos y colocar o retirar el divisor de salida. Los controles se ubican sobre los componentes del montaje. Los detectores muestran por separado la probabilidad teórica y los clics acumulados con la configuración actual.

- **Elegir antes** fija el montaje al emitir.
- **Elegir después** pausa el viaje después del primer divisor y de la placa de fase, antes de llegar al divisor de salida. El visitante puede cambiar ese divisor y continuar. Esta pausa y la propagación ralentizada son ayudas didácticas.
- **Salida reunida:** las amplitudes interfieren; la fase redistribuye las probabilidades entre D0 y D1.
- **Salida abierta:** D0 identifica el brazo A y D1 el B; cada resultado tiene probabilidad 1/2, independiente de la fase.
- Cada emisión produce un solo clic. Los dos trazos representan amplitudes de un solo fotón. El dibujo no afirma que se hayan observado dos trayectorias simultáneamente.
- **Simular 100 detecciones** muestrea cien repeticiones independientes con la misma configuración. La tabla agrupa por fase, salida y momento de elección; cambiar controles preserva los resultados anteriores. Los puntos muestran los últimos 24 clics de esa condición.

Cuatro retos guiados proponen observar un fotón individual, comparar 0° con 180° en salida reunida, repetir con salida abierta y comparar elección temprana con tardía para un montaje final idéntico. Las explicaciones, la tabla y las fuentes se expanden debajo del experimento.

### Cuatro retos guiados

«Empezar los cuatro retos» activa la guía junto al montaje. En escritorio ocupa una columna lateral; en celular se coloca inmediatamente debajo y reemplaza los textos y conteos redundantes de la exploración libre. Cada etapa muestra una predicción, la siguiente acción, las observaciones guardadas o una conclusión. Se puede seleccionar cualquier reto y volver a «Libre». Las partidas, los registros generales y los logros se conservan durante la visita; recargar inicia otra sesión.

| Reto | Prueba requerida | Qué permite entender |
| --- | --- | --- |
| Un fotón, un clic | Emitir manualmente con fase 90°, salida reunida y elección antes | Los dos trazos son amplitudes de un fotón; cada disparo produce un solo clic |
| Cambiar el destino | Acumular al menos 100 clics a 0° y otros 100 a 180°, con salida reunida y elección antes | La fase cambia la interferencia y el detector que concentra los clics |
| Identificar el camino | Repetir ambas fases con al menos 100 clics por fase, salida abierta y elección antes | Cada detector identifica un brazo; las probabilidades son 50/50 y los conteos pueden variar |
| Elegir cuando ya entró | Emitir a 0° con salida reunida antes; luego emitir a 0° con salida abierta, insertar el divisor durante la pausa y continuar | Con la misma configuración final, elegir antes o después produce las mismas probabilidades |

Cada reto exige elegir una predicción y realizar observaciones nuevas mientras está activo. Una predicción incorrecta permite experimentar. «Comprobar mi idea» sólo completa el reto si se reunieron las observaciones y la explicación coincide con ellas. La devolución de una respuesta incorrecta ofrece una pista; «Revisar mi idea» conserva la evidencia y vuelve a pedir una predicción antes de otro disparo.

El botón «Preparar» ajusta la configuración de la prueba pendiente y conserva resultados. No registra observaciones por sí mismo. La fuente, el divisor y la fase siguen siendo controles directos sobre la escena. Los retos primero y cuarto requieren disparos individuales y no admiten lotes como evidencia. Sus tarjetas guardan el primer disparo válido, de modo que repetir no transforme una observación de un fotón en un contador de varios; la tabla general sigue acumulando todos los ensayos. Los retos estadísticos admiten lotes o emisiones individuales y nunca exigen exactamente 50 clics por detector.

El motor conserva evidencia de la secuencia del cuarto reto: empezar con salida abierta, insertar durante la pausa y continuar con salida reunida. Una salida ya reunida al emitir, un lote, una fase distinta o un clic de una visita anterior no satisfacen esa prueba. Los logros se otorgan sólo mediante comprobación explícita, no por preparar un montaje o acertar una opción sin observar.

Al reabrir un reto que ya tiene todas sus observaciones, la escena recupera el montaje final de esa prueba, sin emitir ni alterar resultados. Así la conclusión guardada no aparece junto a la configuración de otro reto. La revisión de los cuatro retos pasó 480 pruebas del código publicado, lint y compilación. Tres agentes revisaron código, ciencia y producto; se probaron respuestas incorrectas y correctas de cada reto, ayudas, regreso a la exploración libre y encuadres de 320 × 700 y 390 × 844.

`src/wheeler/challenges.ts` envuelve el motor óptico con la lógica de predicción y evidencia; `DelayedChallenges.tsx` presenta la guía. `tests/wheeler-challenges.test.mjs` comprueba observaciones insuficientes, condiciones incorrectas, opciones correctas e incorrectas de los cuatro retos, independencia del historial previo, disparos repetidos, revisión, navegación y la secuencia tardía. La revisión independiente de ciencia y producto incluye escritorio y tamaños móviles emulados; siguen pendientes Safari y teléfonos físicos.

### Modelo y alcance

Con una convención equivalente de divisores 50/50 y fases de reflexión absorbidas en el origen de la fase total, el estado entre divisores es `( |A> + exp(iφ)|B> ) / sqrt(2)`. Recombinarlos produce `P(D0) = (1 + cos φ)/2`, `P(D1) = 1 − P(D0)`. Retirar el segundo divisor produce `P(D0) = P(D1) = 1/2`. El control expresa φ en grados, en pasos de 15°; el cálculo trigonométrico usa radianes.

El modelo supone fotones individuales, óptica equilibrada, fase estable y detección perfecta. El tamaño del esquema, las formas de onda y sus tiempos de viaje no están a escala física. El ancho dibujado de las amplitudes salientes depende de la raíz de la probabilidad. El sorteo de un detector sigue la regla de Born. No se modelan pérdidas, ruido, decoherencia ni detalles de polarización de un dispositivo experimental concreto.

La configuración se fija antes de que el fotón interactúe con el divisor final. La elección tardía produce las mismas probabilidades que una elección temprana con la misma fase y configuración final. Los registros anteriores no se modifican. La primera escena sigue siendo una analogía clásica; esta segunda implementa predicciones cuánticas de un montaje ideal.

Referencias primarias: [Jacques et al., *Experimental realization of Wheeler's delayed-choice GedankenExperiment*, Science 315, 966–968 (2007)](https://arxiv.org/abs/quant-ph/0610241), y [Ma, Kofler y Zeilinger, *Delayed-choice gedanken experiments and their realizations*, Reviews of Modern Physics 88, 015005 (2016)](https://arxiv.org/abs/1407.2930). La realización de Jacques empleó fotones individuales, conmutación electroóptica aleatoria y separación espaciotemporal controlada. La elección manual con pausa del laboratorio es una adaptación para explorar sus probabilidades.

### Implementación y verificación de elección retardada

- `src/wheeler/delayed.ts`: probabilidades, sorteo, estados del viaje y registros inmutables. La fase se fija al emitir; la salida solo puede cambiar en reposo o en la pausa de elección. Cada condición retiene hasta 24 eventos recientes y existen como máximo 100 condiciones de controles.
- `src/wheeler/DelayedBoard.tsx`: dibujo Canvas 2D, tamaño observado y resolución limitada a dos píxeles físicos por píxel CSS.
- `src/wheeler/DelayedChoice.tsx` y `delayed.css`: controles DOM accesibles sobre el montaje, anuncios, foco, comparación y explicación. La animación se pausa al ocultar la escena o la pestaña; el tiempo de un frame se acota para evitar saltarse una elección.
- `tests/wheeler-delayed.test.mjs`: diez pruebas del modelo. Incluyen amplitudes complejas calculadas independientemente, exclusión exacta de puertos oscuros, equivalencia entre elección temprana y tardía, bloqueos de controles, un clic por emisión, conservación de registros y entradas extremas.

Tres agentes independientes revisaron ciencia, código y producto. La revisión científica contrastó 254 casos adicionales. El recorrido en navegador comprobó cambios de fase y salida, emisión individual, pausa, lote, tabla por condición, cambio de escena y conservación de la partida previa. Se corrigieron el encuadre de enlaces directos, el foco durante el viaje, el singular de los conteos y el espacio entre detectores y divisor en celular. Se comprobaron escritorio y tamaños móviles emulados. Continúan pendientes Safari, teléfonos físicos y pruebas de aprendizaje con participantes.

### Revisión de primera visita

Una segunda revisión con tres agentes partió de la versión pública. Encontró tres fricciones educativas: el botón «Reunir caminos» parecía nombrar una acción aunque retiraba el divisor; cambiar fase o salida no explicaba su efecto hasta emitir; y el contador volvía a cero al cambiar de condición sin hacer evidente que las mediciones anteriores seguían guardadas.

El botón ahora separa estado («Salida reunida/abierta») y acción («Tocá para retirar/insertar»). El centro libre del montaje identifica qué se mide: interferencia o camino, junto con su relación con la fase o los detectores. La explicación se actualiza también antes de emitir y después de un lote. Los clics de otras condiciones aparecen como guardados. Se define fase como alineación de las oscilaciones, se explica la función de las amplitudes y se indica que reconocer interferencia requiere comparar muchos clics. La lectura ampliada aclara qué puede concluirse de la elección tardía.

Se agregaron ayudas específicas para el dibujo, su leyenda, continuar, pausar, vaciar y comparar, así como para cuatro controles del primer juego que heredaban explicaciones genéricas. Se corrigió el estilo de `hover` de la fuente y de Continuar: un estilo general reemplazaba su fondo claro y dejaba texto oscuro sobre fondo oscuro, aun estando habilitados.

La revisión de código comprobó resolución de ayudas y conservación de conteos; la de ciencia validó el nuevo lenguaje. En navegador se probaron pantallas de 320 × 700 y 390 × 844, cambios de fase y salida, lotes, elección durante el viaje y ayuda sobre el canvas. La ayuda se coloca debajo del dibujo y Escape permite seguir jugando. La revisión es una evaluación de QA, sin participantes de aprendizaje ni dispositivos físicos.

## Qué se juega y qué se aprende

El visitante toca preguntas o figuras para reducir un conjunto de 16 posibilidades. Puede volver una pregunta atrás o elegir cualquier respuesta en «Mis caminos». Al hacer otra pregunta desde ese punto conserva ambas ramas para compararlas.

Tocar una figura descartada muestra la pregunta y respuesta que la excluyeron. «Volver antes de esa respuesta» recupera el último estado de ese recorrido donde la figura seguía siendo posible. El historial identifica cada paso mediante su pregunta y la respuesta anterior.

- **Sorpresa** empieza con todas las posibilidades. Cada respuesta mantiene al menos una compatible con el registro completo de la rama. Si sí y no son posibles, una moneda pseudoaleatoria reproducible decide la respuesta. Si solo una respuesta es compatible, queda obligada.
- **Palabra elegida** fija un objeto al iniciar la partida y responde según sus propiedades. Volver atrás conserva ese objeto.
- Cada rama admite hasta veinte preguntas y termina antes si queda una sola palabra. Repetir una pregunta desde el mismo punto recupera el resultado guardado.
- Las dos reglas conservan partidas independientes durante la visita. «Nueva partida» pide confirmar y reemplaza los caminos de la regla activa. Recargar la página inicia partidas nuevas.

La escena muestra qué posibilidades se descartan y cuántas quedan. Una pregunta cuya respuesta ya se deduce cuenta como pregunta y conserva el conjunto. Esto permite descubrir que el número de respuestas registradas y la información nueva obtenida son cantidades diferentes.

Las descripciones de las figuras definen el catálogo del juego. Por ejemplo, la vela está encendida, el reloj es mecánico y el cometa tiene una cola de polvo que refleja luz solar. Las preguntas usan esas propiedades explícitas. Cuando las propiedades disponibles ya no distinguen los objetos, se sugieren preguntas por su nombre.

## Marco científico

Wheeler relató una versión sorpresa de las veinte preguntas en la que sus amigos respondían sin haber acordado una palabra. Cada respuesta debía ser compatible con las anteriores y con alguna palabra posible. Esta adaptación usa un catálogo finito visible para poder seguir los descartes. [Wheeler, *Law Without Law*, 1983, pp. 201–203](https://heyredhat.github.io/refs/wheeler_law_without_law.pdf)

*It from bit* y el universo participativo se presentan como una hipótesis de trabajo de Wheeler. La escena implementa una analogía clásica con atributos definidos. Las predicciones de experimentos cuánticos requieren un modelo específico. Un registro de respuestas puede ser compatible con ambas reglas del juego. Volver atrás sirve para explorar recorridos alternativos. [Wheeler, *Information, Physics, Quantum*, 1989, §19.2](https://scienceplusplus.org/visions/assets/Wheeler1989.pdf)

Un sí o no admite representación mediante un bit. La información que aporta depende del conocimiento previo. El catálogo permite observar una respuesta obligada que deja intactas las posibilidades.

## Organización

- `src/wheeler/game.ts` contiene el catálogo, las preguntas, las reglas y el árbol inmutable de respuestas. El modo sorpresa conserva `target: null`.
- `src/wheeler/App.tsx` presenta figuras, preguntas, inspección, resultados, historial y explicación científica.
- `src/wheeler/wheeler.css` adapta el espacio de juego, la portada y los controles.
- `wheeler/index.html` y `vite.config.ts` definen la entrada multipágina.
- El catálogo compartido incorpora la tarjeta y los enlaces de navegación. La política de ayuda incluye la ruta nueva.

El juego funciona en el cliente con React y CSS. Las respuestas proceden del motor y la escena refleja su estado. Las transiciones respetan la preferencia de movimiento reducido.

## Uso en celular y accesibilidad

En pantallas angostas aparecen dos preguntas sugeridas junto al conjunto de figuras. «Otras preguntas» reemplaza las sugerencias por un selector compacto y permite elegir las restantes. Al agotarse las propiedades, siguen disponibles las preguntas por nombre. Tocar una figura muestra su descripción y permite preguntar por su nombre. El botón de retroceso y el historial permanecen debajo del espacio de juego.

Al responder, cambiar de regla, reiniciar o abrir una descripción, el encuadre vuelve al espacio de juego si hace falta. El resultado recibe el foco al cambiar de estado, incluso cuando se vuelve al inicio. Cerrar una descripción devuelve el foco a la figura. El modo activo aparece junto a las posibilidades para reconocerlo mientras se juega. Hay etiquetas accesibles, estado de botones, foco visible, anuncio de resultados y descripciones mediante «Modo ayuda».

## Verificación

`node --test tests/wheeler-game.test.mjs` comprueba las dos reglas, coherencia con todas las respuestas, conjuntos siempre no vacíos, conservación del objetivo fijo, retroceso, recuperación de ramas, preguntas sin información nueva, entradas inválidas y límite de veinte.

Un agente científico independiente contrastó 12.000 estados y completó ambas reglas en navegador. Un segundo agente revisó producto, uso con teclado y tamaños móviles. La revisión detectó y motivó correcciones del foco, el encuadre móvil, las sugerencias por nombre y la ocultación de figuras descartadas en el resultado final.

La revisión del 17 de noviembre de 2026 pasó 453 pruebas del código publicado, lint y compilación de las 27 entradas. En navegador se comprobó una rama completa de veinte preguntas, su bloqueo al llegar al límite y el regreso a la pregunta diecinueve para resolver por otro camino. Los encuadres de 320 × 700 y 390 × 844 se revisaron con escena, respuestas y controles visibles. El texto al inspeccionar una figura en el límite indica cómo continuar desde un punto anterior.

Las pruebas móviles usan tamaños de pantalla emulados. Safari, teléfonos físicos y evaluación de aprendizaje con participantes quedan pendientes de acceso y de una sesión específica.

## Revisión de claridad y navegación

Dos agentes independientes revisaron nuevamente código, explicación y uso de la versión publicada. Se reprodujeron un selector vacío al agotar las propiedades, acciones del formulario y la inspección por debajo del visor móvil, y pérdida del foco y del encuadre tras reiniciar o cambiar a una partida en su inicio. Las correcciones se acompañaron de una explicación explícita del guardado automático, la identificación de la respuesta que descarta cada figura y un historial con relaciones expresadas mediante las preguntas.

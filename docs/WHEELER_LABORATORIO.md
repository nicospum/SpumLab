# Wheeler · Preguntas, elección retardada y universo participativo

El laboratorio independiente `/wheeler/`, incorporado al catálogo de SPUM, contiene tres escenas: el juego de las veinte preguntas, la elección retardada y «El universo que responde». La portada aprobada reinterpreta artísticamente el ojo y el universo participativo mediante una imagen generada. Se distribuye como WebP de 312 KB y 1254 × 1254 píxeles.

La segunda escena se abre directamente en `/wheeler/#eleccion-retardada` y la tercera en `/wheeler/#universo-que-responde`. Las tres escenas conservan su estado durante la visita. Cambiar de escena pausa el viaje de un fotón; volver permite continuarlo. Recargar inicia una sesión nueva.

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

### Revisión de los retos como primera visita

La revisión de la versión publicada identificó cuatro fricciones: el botón de ayuda rozaba la acción del reto en pantallas bajas; una conclusión anterior ocultaba las instrucciones al repetir o pausar un vuelo; cambiar el montaje dejaba visible una conclusión de otra configuración; y omitir la inserción tardía producía un clic sin explicar por qué la tarjeta del reto quedaba pendiente.

La guía ahora prioriza el viaje en curso. Si la comparación está observada y el visitante cambia a un montaje distinto, muestra un aviso y «Restaurar montaje del reto», conservando predicción, evidencia, logros y conteos. Las dos configuraciones válidas de cada comparación siguen disponibles. Los intentos tardíos que terminan abiertos o empiezan reunidos reciben una explicación específica; para completar el cuarto reto sigue siendo necesario insertar el divisor durante la pausa. Las instrucciones nombran los controles visibles. Las conclusiones definen las amplitudes y explican refuerzo y cancelación; «Reto completado» describe el avance sin afirmar que se haya medido el aprendizaje.

En móvil, el alto del montaje guiado se adapta entre 300 y 350 px a la altura disponible; la fuente mantiene al menos 44 px de área táctil y queda separada del control de fase. La exploración libre conserva su tamaño. Se añadieron cuatro pruebas de regresión sobre conservación de evidencia, restauración y mensajes de los disparos tardíos. La suite del código publicado suma 484 pruebas. Esta evaluación de QA no sustituye una prueba de comprensión con participantes.

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

### Las dos escenas como un recorrido

La revisión completa encontró que pasar del juego a los fotones dejaba oculto el vínculo conceptual en una lectura desplegable. El índice ahora distingue «Analogía clásica» y «Modelo cuántico». Antes de cambiar de escena se explica la relación pregunta → registro: preguntas y respuestas sí/no en el juego; elección del montaje y clics de detectores en el interferómetro. La lectura «¿Qué une una palabra y un fotón?» está disponible desde ambas escenas sin abandonar la activa. Se mantiene explícito que *it from bit* es una hipótesis y que estos resultados no prueban que la conciencia cree el universo. El vínculo procede del propio Wheeler, *Information, Physics, Quantum* (1989), §§19.2 y 19.4.

La navegación usa el hash como única fuente del cambio de escena: abrir un enlace en otra pestaña no cambia la partida original. Al regresar, se conservan las ramas del juego, los conteos y la guía; el foco y el encuadre vuelven a los controles de la actividad en curso. Consultar la explicación mientras viaja un fotón no permite que un cambio de etapa desplace la lectura. El modo ayuda descarta la consulta de la escena anterior al navegar, incluidos eventos de puntero pendientes, y permanece activado.

Tres agentes revisaron código, ciencia y recorrido de producto. La verificación incluyó navegación de ida y vuelta, alternativas desde una pregunta anterior, conservación de resultados y pantallas móviles emuladas de 320 × 700 y 390 × 844. Pasaron las 484 pruebas del código publicado, lint y compilación. Safari, teléfonos físicos y comprensión con participantes siguen pendientes; QA no equivale a una medición de aprendizaje.

## Tercera escena: el universo que responde

Un mapa tridimensional oscuro adquiere cuerpos, profundidad y recorridos al consultar seis regiones. El ojo representa un instrumento simbólico. La oscuridad significa «sin registrar», no «no existe». Esta actividad es una metáfora clásica de *it from bit*, distinta del modelo cuántico calculable de la segunda escena. No reproduce creación física, formación de galaxias ni una evolución cuántica. La fuente conceptual sigue siendo Wheeler, *Information, Physics, Quantum* (1989), §§19.2 y 19.4.

### Interacción y representación

Tocar una región aplica la herramienta elegida y registra su respuesta. También se puede elegir una región en un selector y pulsar «Observar», sin depender de gestos sobre el dibujo. Arrastrar el fondo gira el mapa; pellizcar o usar los botones de acercamiento cambia el punto de vista. «Centrar vista» recupera el encuadre inicial sin borrar datos. «Pausar movimiento» detiene la animación ilustrativa.

| Herramienta | Pregunta del modelo | Cambio visible |
| --- | --- | --- |
| Luz | ¿Emite luz visible propia? | Distingue una fuente luminosa de un cuerpo sin luz visible propia; este último puede verse por iluminación reflejada |
| Distancia | ¿Está en la zona cercana? | Despliega profundidad en el mapa, con posiciones gráficas distintas para cerca y lejos |
| Movimiento | ¿Cambia de posición en este mapa? | Muestra un recorrido ilustrativo o una posición que permanece fija |

«Cerca» y «lejos» se definen respecto del punto de vista inicial. Girar o acercar la cámara no cambia ese registro. El desplazamiento gráfico al consultar distancia representa nueva información, no una fuerza que empuja el objeto. Tamaños, profundidades y tiempos son escalas de dibujo sin unidades físicas; las estrellas de fondo y las nubes de color son decorativas. Las propiedades no consultadas permanecen sin registrar, incluso si el motor ya las tiene fijadas en la regla correspondiente.

### Dos reglas y recorridos alternativos

- **Al preguntar:** el motor completa una propiedad cuando se consulta y conserva las respuestas de la rama. La continuación de propiedades todavía no registradas puede depender del orden de las preguntas.
- **Desde el inicio:** el motor prepara todas las respuestas al iniciar la sesión y sólo muestra las consultadas. El orden de las preguntas no cambia esas propiedades.

Alba y Eco son un par didáctico preparado en ambas reglas: las dos emiten luz visible propia, Alba está cerca y Eco lejos. Las otras respuestas se generan con una semilla reproducible; no se presentan como resultados aleatorios de una medición cuántica. El cuarto reto utiliza deliberadamente el mismo registro de luz para mostrar que una respuesta aislada puede ser compatible con dos reglas diferentes. No sostiene que todos sus posibles registros sean indistinguibles.

«Una consulta atrás» recupera el estado anterior del juego. «Registros y caminos» permite volver a cualquier punto guardado y consultar otra propiedad; conserva las ramas anteriores. Repetir una propiedad conocida devuelve el mismo valor y no agrega un registro nuevo. Repetir la pregunta de un hijo ya guardado desde su mismo padre recupera ese hijo. Deshacer es una herramienta de comparación del juego, no una afirmación de que se pueda modificar el pasado físico.

Cada regla conserva un árbol independiente de hasta 161 nodos, incluida la raíz. Una rama puede registrar las 18 propiedades del catálogo (seis regiones por tres herramientas). Alcanzar el límite impide crear más ramas, pero permite consultar las existentes. Cambiar de regla o de escena conserva mapas, respuestas y retos durante esta visita; recargar inicia partidas nuevas.

### Cuatro retos del universo

| Reto | Observaciones necesarias mientras está activo | Idea que se contrasta |
| --- | --- | --- |
| Encendé un rincón | Consultar Luz en Alba | Ahora hay un registro; no se probó que antes no existiera la región |
| Separá las distancias | Consultar Distancia en Alba y Eco | Estar cerca en una imagen no determina la separación en profundidad |
| El registro deja huella | Con Luz, observar Alba, luego Eco y volver a observar Alba, en la misma regla | Los registros de la rama se conservan al explorar otra región |
| ¿Descubrir o completar? | Consultar Luz en Alba en ambas reglas | Esa respuesta común no permite distinguir cómo la decidió el juego |

Seleccionar región, herramienta, regla o reto no cuenta como observación. Los registros de exploración libre no satisfacen automáticamente un reto recién iniciado; deben consultarse de nuevo durante su actividad. Cada reto exige además elegir una explicación y pulsar «Comprobar». Una respuesta incorrecta recibe una pista y conserva las observaciones para reintentar. El tercer reto no admite deshacer o cambiar de rama como sustituto de alejarse y volver a consultar: rebobinar reinicia esa secuencia mientras no esté completada.

### Código, móvil y alcance de la verificación

- `src/wheeler/universe.ts`: catálogo, preguntas, dos reglas, árbol de registros, acciones puras y evidencia de los retos. `createUniverse` inicia el estado; `universeReducer` recibe acciones; `currentUniverse`, `universePath` y `lessonEvidence` exponen la rama, su recorrido y los pasos del reto. `node.depth` cuenta propiedades registradas; `state.serial` cuenta consultas, incluidas repeticiones, para disparar la respuesta visual.
- `src/wheeler/UniverseBoard.tsx`: visor WebGL con Three.js ya disponible en el proyecto. Genera geometría, partículas y luces sin descargar imágenes nuevas. Los botones de región se proyectan sobre el mapa y permiten interacción por teclado; si se alinean, sus etiquetas se separan mediante líneas guía. Hay ayudas de escena y una alternativa con regiones y registros si WebGL no está disponible. La resolución se limita a 1,6 píxeles físicos por píxel CSS y el dibujo a 30 fps; se omite el render fuera del visor o con la pestaña oculta. Las coordenadas DOM sólo se actualizan cuando cambian. El visor libera geometrías, materiales, textura, observadores, eventos y renderizador al desactivarse, conservando el estado del juego en su componente padre.
- `src/wheeler/UniverseScene.tsx` y `universe.css`: herramientas, resultado, guía, reglas y lectura ampliada. La guía ocupa una columna junto al dibujo en escritorio y pasa debajo en pantallas angostas. En móvil, el visor guiado adapta su altura a la pantalla; las explicaciones extensas y el historial están cerrados de inicio. El movimiento respeta la preferencia de movimiento reducido.
- `src/wheeler/App.tsx`, `src/portal/catalog.ts` y `wheeler/index.html`: tercera entrada del índice, navegación entre escenas, conservación durante la visita y metadatos que describen las tres actividades. El visor de esta escena se carga al visitarlo.

`tests/wheeler-universe.test.mjs` añade 14 pruebas del motor. Comprueban la reconstrucción independiente de todos los registros desde sus ancestros, orden de preguntas, coherencia de la regla fijada, persistencia de ramas, repeticiones sin información nueva, límite de memoria, entradas inválidas y los cuatro retos con evidencia faltante, respuestas incorrectas y respuestas correctas. La prueba de coherencia recorre 90 partidas completas entre ambas reglas. Estas pruebas de lógica no reemplazan la revisión visual ni permiten afirmar que el visitante haya aprendido.

La revisión independiente cubrió ciencia, código y experiencia. Se comprobaron los cuatro retos con observaciones insuficientes, respuestas incorrectas y correctas; consulta directa, ramas alternativas, recuperación del historial, cambio de reglas, navegación por las tres escenas y conservación de sus registros. Una auditoría adicional reconstruyó los datos de 60.000 estados/acciones del motor. Pasaron las 498 pruebas del código a publicar, lint y compilación.

En navegador se revisaron escritorio y tamaños de 320 × 700 y 390 × 844. Se comprobaron arrastre, botones de zoom y pellizco con entrada táctil emulada, sin generar consultas accidentales. La ayuda no altera registros ni cubre el visor en los estados revisados. El cuarto reto separa la comparación de reglas y la pregunta final para que sus controles quepan en celular; las devoluciones reemplazan al formulario y permiten revisarlo conservando la evidencia. Se corrigieron un resultado anterior que parecía describir la herramienta recién seleccionada y la pérdida del encuadre al responder.

Safari, teléfonos físicos y pruebas de comprensión con participantes permanecen pendientes; tamaños móviles emulados no equivalen a esos dispositivos.

### Segunda revisión del universo: primera visita y reintentos

La auditoría de la versión publicada detectó una aprobación incorrecta al observar de nuevo después de completar un reto y cambiar su explicación. Ahora sólo la acción «Comprobar» puede aprobar el intento actual. El logro anterior se conserva por separado. «Repetir la prueba» limpia las observaciones del intento, su respuesta y la secuencia de ida y vuelta; conserva los mapas y el logro histórico. Volver atrás durante un nuevo intento del tercer reto invalida su secuencia aunque se haya completado anteriormente. Las devoluciones aprobadas se identifican como conclusiones guardadas, para no confundirlas con el estado actual del mapa.

La instrucción inicial presenta el orden real: elegir herramienta y tocar una región. Se define «registro» al comenzar y «bit» en el primer reto. La explicación de Distancia identifica las esferas de líneas cuando todavía no se consultó Luz; cambiar de regla explica cuándo prepara las respuestas el programa. Los mensajes de observaciones faltantes nombran el botón para volver a los pasos visibles. Salir del historial devuelve el foco al resultado, y revisar una explicación lo devuelve al selector de respuestas.

En pantallas de hasta 660 píxeles de alto, la altura del visor guiado reserva espacio para las devoluciones y el botón de ayuda. Al liberar el visor se restablecen los indicadores de carga de texturas de WebGL: el mismo canvas se reutiliza al volver de otra escena, y esos indicadores no deben quedar activos al crear las texturas del nuevo renderizador.

La colocación de etiquetas usa sus medidas reales y busca posiciones libres en dos dimensiones. Si las regiones se aglomeran, redistribuye las seis etiquetas en una grilla y las conecta con sus objetos mediante líneas. `universeLayout.ts` contiene esta colocación pura. Cuatro pruebas adicionales cubren la colisión de Eco/Umbral y 945 combinaciones de cámara, profundidad y tamaño, incluido un visor de 261 × 200 píxeles. El motor tiene ahora 17 pruebas, con regresiones para reintentar los cuatro retos, evitar aprobaciones por observar y deshacer durante un nuevo intento.

La revisión independiente de navegador probó los cuatro retos con respuestas correctas, incorrectas y evidencia incompleta. Repitió los casos corregidos, el uso de herramientas equivocadas, la ayuda, el historial, el foco, el zoom mínimo y tres regresos entre escenas. Se revisaron tamaños de 320 × 640, 320 × 700, 375 × 667, 390 × 844 y escritorio: sin etiquetas superpuestas, sin acciones de los retos tapadas por la ayuda y sin nuevas advertencias WebGL en los regresos. Pasaron las 505 pruebas del código a publicar, lint y compilación. Se excluyó la prueba del prototipo de entropía no publicado, que es un cambio previo ajeno a esta revisión. Safari, teléfonos físicos y evaluación de comprensión con participantes siguen pendientes.

## Revisión del recorrido completo de Wheeler

El índice presenta la pregunta común antes de entrar: qué podemos conocer a partir de lo registrado. La lectura compartida distingue las tres actividades mediante acciones concretas: preguntas que acotan figuras, un montaje que produce clics y consultas que forman un mapa. Cada tarjeta enlaza con su escena y propone una comparación. Se conserva la distinción entre analogía clásica, modelo cuántico y metáfora, y la anécdota histórica queda en una lectura desplegable.

Al abrir «La idea de Wheeler», los enlaces «Volver a…» al principio y al final de la explicación recuperan la escena activa. Mantienen su estado y restituyen el encuadre del juego o del reto, incluso si se llegó a la lectura desplazándose manualmente y el hash no cambió. Los clics modificados para abrir otra pestaña mantienen su comportamiento nativo. En elección retardada, un vuelo en curso o una configuración con mediciones guardadas vuelve directamente al espacio de trabajo también en exploración libre; esto evita que el encabezado empuje «Continuar» debajo de la ayuda. La lectura ya no termina sin una salida directa al experimento.

La auditoría reprodujo un salto del visor cuando el visitante se desplazaba manualmente a leer mientras viajaba un fotón, sin cambiar el hash. Los efectos automáticos de etapa y guía ahora respetan que el visor haya quedado totalmente fuera de pantalla. Iniciar explícitamente los retos y regresar por enlace conservan su encuadre. El nombre accesible del divisor incluye el rótulo visible «Salida abierta» o «Salida reunida», además de su acción, para permitir reconocer el control con lectores de pantalla y voz.

Tres agentes revisaron ciencia, código y uso. La comprobación de navegador incluyó completar el juego, deshacer y abrir otra rama; respuestas correctas e incorrectas de los retos 1 y 4 del interferómetro; regresar durante un vuelo o una elección pendiente; volver al universo con el reto conservado; leer por enlace y por desplazamiento manual; y abrir el retorno con Ctrl+clic sin mover la pestaña original. Se repitieron los casos corregidos en 320 × 640 y 375 × 667, además de revisar 390 × 844 y escritorio. Escena, continuación y consigna quedaron visibles en los regresos comprobados. Pasaron 505 pruebas, lint y compilación. Continúan pendientes Safari, dispositivos físicos y evaluación de aprendizaje con participantes.

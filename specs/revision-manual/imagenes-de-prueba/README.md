# Imágenes para probar la subida de portadas a mano

Cada archivo dice en la propia imagen qué se espera de él, para que no haya que volver acá a
chequear. El mínimo es **800 px de lado corto** (H-94a; desde que no recortamos, la regla es sobre
el lado corto y no ancho×alto por separado — ver H-102 y la enmienda de D110).

| Archivo | Qué tiene que pasar | Por qué está |
|---|---|---|
| `chica-400x600.jpg` | **Rechazada** | Muy por debajo del mínimo. El caso obvio. |
| `angosta-799x2000.jpg` | **Rechazada** | Lado corto 799: **uno menos** que el mínimo. Es el que encuentra el `>=` escrito como `>`. |
| `justa-800x1200.jpg` | **Entra** | Lado corto exactamente 800. El otro lado del mismo borde. |
| `apaisada-1600x900.jpg` | **Entra, sin recortar** | Apaisada. Con `fit: 'inside'` tiene que entrar entera, con aire a los costados. Antes de la enmienda de D110 se recortaba. |
| `no-es-imagen.txt` | **Rechazado** | Que el rechazo por tipo de archivo diga algo claro. |

Al rechazar, mirar dos cosas: que el mensaje se entienda sin saber cómo está hecho el sistema, y
que el libro **no quede con una portada a medias** — que el rechazo no deje basura.

## El archivo de más de 5 MB

No se versiona (serían 5 MB en el repo por una prueba). Se genera en el momento:

```
python3 -c "from PIL import Image; import numpy as np; Image.fromarray(np.random.randint(0,255,(3000,4500,3),dtype='uint8')).save('/tmp/pesada.jpg', quality=98)"
```

Ruido aleatorio, que es lo que no comprime. Tiene que pasar el mínimo de dimensiones y ser
rechazada **por peso** (D110: 5 MB), con un mensaje distinto del de dimensiones.

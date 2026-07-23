#!/usr/bin/env bash
# ============================================================
# correr_todas_las_salas.sh — genera los 6 .glb de una vez
# Digital Circus STEM Escape
#
# ANTES DE CORRER:
#   1. Descarga de Sketchfab a la carpeta ORIGEN:
#        circo_pack.glb  gangle.glb  ragatha.glb
#        kinger.glb  zooble.glb  pomni.glb  caine.glb
#   2. Averigua los nombres de objetos de cada archivo:
#        blender --background --python pipeline_sala.py -- \
#            --entrada ORIGEN/gangle.glb --listar
#   3. Ajusta las columnas puerta/llave abajo si hace falta
#
# USO:  bash correr_todas_las_salas.sh
# ============================================================

set -e

BLENDER="blender"                 # si no está en PATH, pon la ruta completa
ORIGEN="$HOME/Descargas/circo"    # donde descargaste los .glb
DESTINO="../web/modelos"

# nombre_salida | archivo origen | objeto puerta | objeto llave | props
SALAS=(
  "sala1_gangle|gangle.glb|Door|Key|llave,mascaras"
  "sala2_ragatha|ragatha.glb|Door|Key|llave,molecula"
  "sala3_kinger|kinger.glb|Door|Key|llave,frascos"
  "sala4_zooble|zooble.glb|Door|Key|llave,engranajes"
  "sala5_pomni|pomni.glb|Door|Key|llave,ojo"
)

for fila in "${SALAS[@]}"; do
  IFS="|" read -r nombre archivo puerta llave props <<< "$fila"
  echo ""
  echo "=================================================="
  echo "  $nombre"
  echo "=================================================="
  "$BLENDER" --background --python pipeline_sala.py -- \
    --entrada "$ORIGEN/$archivo" \
    --salida  "$DESTINO/$nombre.glb" \
    --puerta  "$puerta" \
    --llave   "$llave" \
    --props   "$props"
done

echo ""
echo "=================================================="
echo "  Portal (generado por código, no requiere descarga)"
echo "=================================================="
"$BLENDER" --background --python props_stem.py -- \
  --portal --salida "$DESTINO/portal.glb"

echo ""
echo "=================================================="
echo "  Caine para la portada"
echo "=================================================="
"$BLENDER" --background --python pipeline_sala.py -- \
  --entrada "$ORIGEN/caine.glb" \
  --salida  "$DESTINO/caine.glb" \
  --tris 80000

echo ""
echo "Listo. Pesos finales:"
ls -lh "$DESTINO"/*.glb

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
ajustar_escena.py — Mover piezas sueltas de un .glb
====================================================
Digital Circus STEM Escape

Para arreglar geometría que se cruza (por ejemplo, la carpa hundida
dentro de la colina) sin abrir la interfaz de Blender.

USO

1) Ver qué objetos hay y dónde están:

   blender --background --python ajustar_escena.py -- ^
       --entrada ..\web\modelos\digital_circus_scene.glb --listar

2) Subir la carpa medio metro (eje Z) y reexportar:

   blender --background --python ajustar_escena.py -- ^
       --entrada ..\web\modelos\digital_circus_scene.glb ^
       --salida  ..\web\modelos\digital_circus_scene.glb ^
       --objeto  Tent ^
       --mover   0,0,0.5

3) Varios ajustes de una vez (separa con punto y coma):

   --ajustes "Tent:mover=0,0,0.5; Hill:escalar=0.95"

PARÁMETROS POR OBJETO
   mover=X,Y,Z      desplaza (metros, relativo a donde está)
   rotar=X,Y,Z      gira (grados)
   escalar=N        escala uniforme
   escalar=X,Y,Z    escala por eje
   ocultar=1        lo saca de la escena

CONSEJO: sube de poquito en poquito (0.2, 0.3...) y vuelve a mirar
en el calibrador hasta que deje de cruzarse.
"""

import bpy
import sys
import os
import math

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    import props_stem
except ImportError:
    props_stem = None


def log(m):
    print(f"[ajustar] {m}")


def leer_args():
    cfg = {"entrada": "", "salida": "", "objeto": "", "mover": "",
           "rotar": "", "escalar": "", "ajustes": "", "listar": False}
    if "--" in sys.argv:
        argv = sys.argv[sys.argv.index("--") + 1:]
        i = 0
        while i < len(argv):
            a = argv[i]
            if a == "--listar":
                cfg["listar"] = True; i += 1; continue
            if a.startswith("--") and i + 1 < len(argv):
                cfg[a[2:].replace("-", "_")] = argv[i + 1]; i += 2; continue
            i += 1
    return cfg


def importar(ruta):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    if not os.path.exists(ruta):
        sys.exit(f"ERROR: no existe {ruta}")
    bpy.ops.import_scene.gltf(filepath=ruta)
    log(f"{len(bpy.context.scene.objects)} objetos importados")


def listar():
    print("\n" + "=" * 68)
    print(f"{'OBJETO':<32} {'POSICIÓN (X, Y, Z)':<24} {'TAMAÑO'}")
    print("=" * 68)
    for o in sorted(bpy.context.scene.objects, key=lambda x: x.name):
        if o.type != "MESH":
            continue
        d = o.dimensions
        print(f"{o.name[:31]:<32} "
              f"({o.location.x:6.2f},{o.location.y:6.2f},{o.location.z:6.2f})   "
              f"{d.x:.2f} x {d.y:.2f} x {d.z:.2f}")
    print("=" * 68)
    print("Copia el nombre exacto y úsalo en --objeto\n")


def buscar(nombre):
    if nombre in bpy.data.objects:
        return [bpy.data.objects[nombre]]
    n = nombre.lower()
    hallados = [o for o in bpy.context.scene.objects if n in o.name.lower()]
    if hallados:
        log(f"'{nombre}' → {[o.name for o in hallados]}")
    else:
        log(f"⚠ ningún objeto contiene '{nombre}'")
    return hallados


def trio(texto, defecto=0.0):
    partes = [p.strip() for p in str(texto).split(",") if p.strip() != ""]
    if len(partes) == 1:
        return (float(partes[0]),) * 3
    if len(partes) == 3:
        return tuple(float(p) for p in partes)
    return (defecto,) * 3


def aplicar(objs, mover="", rotar="", escalar="", ocultar=False):
    for o in objs:
        if ocultar:
            bpy.data.objects.remove(o, do_unlink=True)
            log(f"  '{o.name}' eliminado")
            continue
        if mover:
            dx, dy, dz = trio(mover)
            o.location.x += dx; o.location.y += dy; o.location.z += dz
            log(f"  '{o.name}' movido ({dx:+.2f}, {dy:+.2f}, {dz:+.2f}) "
                f"→ ({o.location.x:.2f}, {o.location.y:.2f}, {o.location.z:.2f})")
        if rotar:
            rx, ry, rz = trio(rotar)
            o.rotation_euler.x += math.radians(rx)
            o.rotation_euler.y += math.radians(ry)
            o.rotation_euler.z += math.radians(rz)
            log(f"  '{o.name}' rotado ({rx:+.1f}°, {ry:+.1f}°, {rz:+.1f}°)")
        if escalar:
            sx, sy, sz = trio(escalar, 1.0)
            o.scale.x *= sx; o.scale.y *= sy; o.scale.z *= sz
            log(f"  '{o.name}' escalado ({sx:.2f}, {sy:.2f}, {sz:.2f})")


def procesar_ajustes(texto):
    """Formato: 'Objeto:mover=0,0,0.5; Otro:escalar=0.9'"""
    for bloque in texto.split(";"):
        bloque = bloque.strip()
        if not bloque or ":" not in bloque:
            continue
        nombre, resto = bloque.split(":", 1)
        opciones = {}
        for par in resto.split("|"):
            if "=" in par:
                k, v = par.split("=", 1)
                opciones[k.strip()] = v.strip()
        objs = buscar(nombre.strip())
        if objs:
            aplicar(objs,
                    mover=opciones.get("mover", ""),
                    rotar=opciones.get("rotar", ""),
                    escalar=opciones.get("escalar", ""),
                    ocultar=opciones.get("ocultar") == "1")


def main():
    cfg = leer_args()
    if not cfg["entrada"]:
        sys.exit("ERROR: falta --entrada")

    importar(cfg["entrada"])

    if cfg["listar"]:
        listar()
        return

    if not cfg["salida"]:
        sys.exit("ERROR: falta --salida")

    if cfg["ajustes"]:
        procesar_ajustes(cfg["ajustes"])
    elif cfg["objeto"]:
        objs = buscar(cfg["objeto"])
        if not objs:
            sys.exit("Nada que ajustar. Usa --listar para ver los nombres.")
        aplicar(objs, cfg["mover"], cfg["rotar"], cfg["escalar"])
    else:
        sys.exit("ERROR: indica --objeto o --ajustes")

    print()
    if props_stem and hasattr(props_stem, "exportar_glb"):
        props_stem.exportar_glb(cfg["salida"], con_draco=True)
    else:
        os.makedirs(os.path.dirname(os.path.abspath(cfg["salida"])), exist_ok=True)
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.export_scene.gltf(filepath=cfg["salida"], export_format="GLB")
        log(f"✔ exportado {cfg['salida']}")


if __name__ == "__main__":
    main()
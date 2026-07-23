#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pipeline_sala.py — Automatización del pipeline 3D
=================================================
Digital Circus STEM Escape

Hace TODO el trabajo mecánico de una sala:
  1. Importa el .glb descargado de Sketchfab
  2. Borra cámaras/luces del pack y objetos vacíos
  3. Decima hasta cumplir el presupuesto de triángulos (<150k)
  4. Baja las texturas a 2048px máximo
  5. Crea las animaciones con los NOMBRES EXACTOS del contrato
     (puerta_abrir, recompensa_aparecer) y las empuja al NLA
  6. Exporta el .glb listo para la web

USO (desde terminal, sin abrir Blender):

  blender --background --python pipeline_sala.py -- \
      --entrada  ~/Descargas/gangle_room.glb \
      --salida   ../web/modelos/sala1_gangle.glb \
      --puerta   Door \
      --llave    Key

USO (dentro de Blender):
  Pestaña Scripting → abrir este archivo → editar CONFIG_MANUAL abajo → Run

PARÁMETROS:
  --entrada   .glb de origen (obligatorio)
  --salida    .glb de destino (obligatorio)
  --puerta    nombre del objeto que hará de puerta (opcional*)
  --llave     nombre del objeto llave/recompensa (opcional*)
  --tris      presupuesto de triángulos (default 150000)
  --textura   tamaño máximo de textura (default 2048)
  --listar    solo imprime los objetos del archivo y sale

  * Si no sabes los nombres, corre primero con --listar para verlos.

NOTA IMPORTANTE SOBRE EL PORTAL:
  Este script NO modela el portal. La cámara del portal es tu evidencia
  de modelado propio para la rúbrica y debe salir de tus manos.
  Sí puedes usar este script sobre tu portal ya modelado para la parte
  mecánica (decimar + animar portal_activar + exportar):
      --puerta TU_ARCO --anim-portal
"""

import bpy
import bmesh
import sys
import os
import math

# Permite importar props_stem.py que vive en la misma carpeta
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    import props_stem
except ImportError:
    props_stem = None
    print("[pipeline] ⚠ props_stem.py no encontrado: --props quedará inactivo")

# ── CONFIG MANUAL (solo si corres el script DENTRO de Blender) ───────────────
CONFIG_MANUAL = {
    "entrada": "",       # ej: "/home/diana/Descargas/gangle_room.glb"
    "salida": "",        # ej: "/home/diana/proyecto/web/modelos/sala1_gangle.glb"
    "puerta": "",        # nombre del objeto puerta
    "llave": "",         # nombre del objeto llave/recompensa
    "tris": 150000,
    "textura": 2048,
    "anim_portal": False,
    "listar": False,
    "props": "",          # ej: "llave,mascaras"
}

# Nombres del contrato — NO CAMBIAR (README, sección "Contratos entre módulos")
ANIM_PUERTA = "puerta_abrir"
ANIM_RECOMPENSA = "recompensa_aparecer"
ANIM_PORTAL = "portal_activar"


# ── UTILIDADES ───────────────────────────────────────────────────────────────

def log(msg):
    print(f"[pipeline] {msg}")


def leer_args():
    """Lee argumentos después de '--', o usa CONFIG_MANUAL si no hay."""
    cfg = dict(CONFIG_MANUAL)
    if "--" in sys.argv:
        argv = sys.argv[sys.argv.index("--") + 1:]
        i = 0
        while i < len(argv):
            a = argv[i]
            if a == "--listar":
                cfg["listar"] = True
                i += 1
                continue
            if a == "--anim-portal":
                cfg["anim_portal"] = True
                i += 1
                continue
            if a.startswith("--") and i + 1 < len(argv):
                clave = a[2:].replace("-", "_")
                valor = argv[i + 1]
                cfg[clave] = int(valor) if clave in ("tris", "textura") else valor
                i += 2
                continue
            i += 1
    return cfg


def limpiar_escena():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for bloque in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
        for item in list(bloque):
            if item.users == 0:
                bloque.remove(item)


def contar_tris():
    total = 0
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            bmesh.ops.triangulate(bm, faces=bm.faces)
            total += len(bm.faces)
            bm.free()
    return total


def buscar_objeto(nombre):
    """Busca por nombre exacto y, si falla, por coincidencia parcial."""
    if not nombre:
        return None
    if nombre in bpy.data.objects:
        return bpy.data.objects[nombre]
    n = nombre.lower()
    for obj in bpy.data.objects:
        if n in obj.name.lower():
            log(f"  '{nombre}' → usando '{obj.name}' (coincidencia parcial)")
            return obj
    log(f"  ⚠ No encontré ningún objeto parecido a '{nombre}'")
    return None


# ── PASOS DEL PIPELINE ───────────────────────────────────────────────────────

def paso_importar(ruta):
    log(f"Importando {ruta}")
    if not os.path.exists(ruta):
        sys.exit(f"ERROR: no existe el archivo {ruta}")
    ext = os.path.splitext(ruta)[1].lower()
    if ext == ".glb" or ext == ".gltf":
        bpy.ops.import_scene.gltf(filepath=ruta)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=ruta)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=ruta)
    elif ext == ".blend":
        bpy.ops.wm.open_mainfile(filepath=ruta)
    else:
        sys.exit(f"ERROR: formato no soportado: {ext}")
    log(f"  {len(bpy.context.scene.objects)} objetos importados")


def paso_listar():
    print("\n" + "=" * 60)
    print("OBJETOS EN LA ESCENA (usa estos nombres en --puerta y --llave)")
    print("=" * 60)
    for obj in sorted(bpy.context.scene.objects, key=lambda o: o.name):
        tris = ""
        if obj.type == "MESH":
            tris = f"  ({len(obj.data.polygons)} caras)"
        print(f"  [{obj.type:9}] {obj.name}{tris}")
    print("=" * 60 + "\n")


def paso_limpiar_basura():
    """Borra cámaras, luces y vacíos del pack (la web usa su propia iluminación)."""
    borrados = 0
    for obj in list(bpy.context.scene.objects):
        if obj.type in ("CAMERA", "LIGHT"):
            bpy.data.objects.remove(obj, do_unlink=True)
            borrados += 1
        elif obj.type == "EMPTY" and not obj.children:
            bpy.data.objects.remove(obj, do_unlink=True)
            borrados += 1
    log(f"Limpieza: {borrados} objetos innecesarios borrados")


def paso_decimar(presupuesto):
    """Aplica Decimate proporcionalmente hasta caber en el presupuesto."""
    actual = contar_tris()
    log(f"Triángulos actuales: {actual:,} (presupuesto: {presupuesto:,})")
    if actual <= presupuesto:
        log("  Ya cabe. Sin decimar.")
        return

    ratio = (presupuesto / actual) * 0.95  # margen de seguridad
    log(f"  Decimando con ratio {ratio:.3f}")

    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or len(obj.data.polygons) < 200:
            continue  # objetos pequeños no se tocan (props, llaves)
        mod = obj.modifiers.new(name="Decimate", type="DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = obj
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError as e:
            log(f"  ⚠ No pude decimar '{obj.name}': {e}")

    log(f"  Resultado: {contar_tris():,} triángulos")


def paso_texturas(maximo):
    """Reescala texturas grandes: suele bajar más peso que el decimate."""
    tocadas = 0
    for img in bpy.data.images:
        if img.size[0] > maximo or img.size[1] > maximo:
            escala = maximo / max(img.size)
            img.scale(int(img.size[0] * escala), int(img.size[1] * escala))
            tocadas += 1
    log(f"Texturas reescaladas a ≤{maximo}px: {tocadas}")


def _crear_accion(obj, nombre_accion, keyframes):
    """
    Crea una acción con nombre exacto y la empuja al NLA.
    El Push Down al NLA es OBLIGATORIO: sin él, glTF exporta una sola
    animación sin nombre y model-viewer no la encuentra por nombre.
    keyframes: lista de (frame, {propiedad: valor})
    """
    obj.animation_data_clear()
    obj.animation_data_create()
    accion = bpy.data.actions.new(name=nombre_accion)
    obj.animation_data.action = accion

    for frame, props in keyframes:
        for prop, valor in props.items():
            setattr(obj, prop, valor)
            obj.keyframe_insert(data_path=prop, frame=frame)

    # Push Down → NLA (esto es lo que preserva el nombre en el export)
    pista = obj.animation_data.nla_tracks.new()
    pista.name = nombre_accion
    pista.strips.new(nombre_accion, int(accion.frame_range[0]), accion)
    obj.animation_data.action = None
    log(f"  ✔ Animación '{nombre_accion}' creada en '{obj.name}' y empujada al NLA")


def paso_animar_puerta(obj):
    """La puerta gira 100° sobre Z en 40 frames."""
    if not obj:
        log("  ⚠ Sin objeto puerta: se omite puerta_abrir")
        return
    z0 = obj.rotation_euler.z
    _crear_accion(obj, ANIM_PUERTA, [
        (1,  {"rotation_euler": (obj.rotation_euler.x, obj.rotation_euler.y, z0)}),
        (40, {"rotation_euler": (obj.rotation_euler.x, obj.rotation_euler.y,
                                 z0 + math.radians(100))}),
    ])


def paso_animar_recompensa(obj):
    """La llave aparece: escala 0 → 1 con rebote, sube y gira."""
    if not obj:
        log("  ⚠ Sin objeto llave: se omite recompensa_aparecer")
        return
    loc = tuple(obj.location)
    alto = (loc[0], loc[1], loc[2] + 0.4)
    _crear_accion(obj, ANIM_RECOMPENSA, [
        (1,  {"scale": (0, 0, 0), "location": loc, "rotation_euler": (0, 0, 0)}),
        (18, {"scale": (1.25, 1.25, 1.25), "location": alto}),
        (26, {"scale": (1, 1, 1)}),
        (60, {"rotation_euler": (0, 0, math.radians(360)), "location": alto}),
    ])


def paso_animar_portal(obj):
    """El portal se activa: crece y gira lento (para portal.glb)."""
    if not obj:
        log("  ⚠ Sin objeto portal: se omite portal_activar")
        return
    esc = tuple(obj.scale)
    _crear_accion(obj, ANIM_PORTAL, [
        (1,  {"scale": (esc[0] * 0.05, esc[1] * 0.05, esc[2] * 0.05)}),
        (50, {"scale": (esc[0] * 1.15, esc[1] * 1.15, esc[2] * 1.15)}),
        (70, {"scale": esc}),
        (120, {"rotation_euler": (obj.rotation_euler.x, obj.rotation_euler.y,
                                  obj.rotation_euler.z + math.radians(180))}),
    ])


def paso_exportar(ruta):
    os.makedirs(os.path.dirname(os.path.abspath(ruta)), exist_ok=True)
    log(f"Exportando {ruta}")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=ruta,
        export_format="GLB",
        export_apply=True,           # aplica modificadores
        export_animations=True,
        export_nla_strips=True,      # ← preserva los nombres de animación
        export_animation_mode="NLA_TRACKS",
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_cameras=False,
        export_lights=False,
    )
    mb = os.path.getsize(ruta) / (1024 * 1024)
    log(f"  ✔ {mb:.1f} MB")
    if mb > 15:
        log("  ⚠ Más de 15 MB: va a tardar en cargar en celular con datos.")
        log("    Baja --tris o --textura y vuelve a correr.")


# ── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    cfg = leer_args()

    if not cfg.get("entrada"):
        sys.exit("ERROR: falta --entrada (o edita CONFIG_MANUAL si corres dentro de Blender)")

    limpiar_escena()
    paso_importar(cfg["entrada"])

    if cfg.get("listar"):
        paso_listar()
        return

    if not cfg.get("salida"):
        sys.exit("ERROR: falta --salida")

    print()
    paso_limpiar_basura()
    paso_decimar(int(cfg.get("tris", 150000)))
    paso_texturas(int(cfg.get("textura", 2048)))

    if cfg.get("props") and props_stem:
        print()
        log("Agregando props STEM generados por código...")
        props_stem.agregar_props(str(cfg["props"]).split(","))

    print()
    log("Creando animaciones del contrato...")
    if cfg.get("anim_portal"):
        paso_animar_portal(buscar_objeto(cfg.get("puerta")))
    else:
        paso_animar_puerta(buscar_objeto(cfg.get("puerta")))
    paso_animar_recompensa(buscar_objeto(cfg.get("llave")))

    print()
    paso_exportar(cfg["salida"])

    print()
    log("LISTO. Verifica en https://gltf-viewer.donmccurdy.com/")
    log("(arrastra el .glb: debe listar las animaciones con sus nombres)")


if __name__ == "__main__":
    main()

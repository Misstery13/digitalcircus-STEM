#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
props_stem.py — Utilería generada por código
=============================================
Digital Circus STEM Escape

Genera los props de cada sala y la cámara del portal desde primitivas,
con una paleta compartida. Ventaja sobre descargarlos de Sketchfab:
todos comparten estilo, así que la escena se ve coherente (criterio 2
de la rúbrica: "coherencia visual").

USO A) Ver todos los props de una vez (para revisarlos):
  blender --background --python props_stem.py -- --demo --salida props_demo.glb

USO B) Generar solo el portal, ya animado y listo:
  blender --background --python props_stem.py -- --portal --salida ../web/modelos/portal.glb

USO C) Desde pipeline_sala.py (automático con --props):
  blender --background --python pipeline_sala.py -- \
      --entrada gangle.glb --salida ../web/modelos/sala1_gangle.glb \
      --props llave,mascaras --puerta Door

PROPS DISPONIBLES por sala:
  llave        todas       la llave de la sala (dorada)
  mascaras     sala 1      máscaras de comedia y tragedia flotantes
  molecula     sala 2      molécula de agua H2O
  frascos      sala 3      frascos con insectos
  engranajes   sala 4      engranajes flotantes
  ojo          sala 5      ojo digital estilo Caine
"""

import bpy
import math
import sys
import os

# ── Paleta compartida (la misma del CSS del sitio) ───────────────────────────
PALETA = {
    "dorado":  (0.851, 0.643, 0.255, 1.0),
    "lona":    (0.957, 0.910, 0.816, 1.0),
    "rojo":    (0.784, 0.196, 0.169, 1.0),
    "noche":   (0.071, 0.063, 0.122, 1.0),
    "glitch":  (0.302, 0.890, 0.757, 1.0),
    "acero":   (0.451, 0.451, 0.478, 1.0),
    "vidrio":  (0.729, 0.878, 0.855, 0.35),
}


def material(nombre, color, emision=0.0, alpha=1.0):
    """Crea (o reutiliza) un material plano estilo caricatura."""
    if nombre in bpy.data.materials:
        return bpy.data.materials[nombre]
    mat = bpy.data.materials.new(name=nombre)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = 0.45
        if "Metallic" in bsdf.inputs and nombre in ("mat_dorado", "mat_acero"):
            bsdf.inputs["Metallic"].default_value = 0.85
        # Emisión: el nombre del socket cambió entre Blender 3.x y 4.x
        if emision > 0:
            for clave in ("Emission Color", "Emission"):
                if clave in bsdf.inputs:
                    try:
                        bsdf.inputs[clave].default_value = color
                        break
                    except (TypeError, AttributeError):
                        pass
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = emision
        if alpha < 1.0:
            bsdf.inputs["Alpha"].default_value = alpha
            mat.blend_method = "BLEND"
    return mat


def pintar(obj, nombre_mat, color, emision=0.0, alpha=1.0):
    obj.data.materials.clear()
    obj.data.materials.append(material(nombre_mat, color, emision, alpha))
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def unir(objetos, nombre):
    """Une varios objetos en uno y lo renombra."""
    objetos = [o for o in objetos if o is not None]
    if not objetos:
        return None
    bpy.ops.object.select_all(action="DESELECT")
    for o in objetos:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objetos[0]
    if len(objetos) > 1:
        bpy.ops.object.join()
    fusion = bpy.context.view_layer.objects.active
    fusion.name = nombre
    return fusion


def flotar(obj, altura=0.18, frames=90):
    """Animación de flotación en bucle (idle). Se exporta al glb."""
    z = obj.location.z
    obj.animation_data_clear()
    for f, dz in ((1, 0), (frames // 2, altura), (frames, 0)):
        obj.location.z = z + dz
        obj.keyframe_insert(data_path="location", frame=f)
    obj.rotation_euler.z = 0
    obj.keyframe_insert(data_path="rotation_euler", frame=1)
    obj.rotation_euler.z = math.radians(360)
    obj.keyframe_insert(data_path="rotation_euler", frame=frames)
    if obj.animation_data and obj.animation_data.action:
        for fc in obj.animation_data.action.fcurves:
            fc.modifiers.new(type="CYCLES")
    return obj


# ── PROPS ────────────────────────────────────────────────────────────────────

def crear_llave(loc=(0, 0, 1.4)):
    """Llave dorada: anillo + vástago + dientes."""
    piezas = []
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.13, minor_radius=0.04, location=(0, 0, 0.22),
        rotation=(math.radians(90), 0, 0), major_segments=20, minor_segments=10)
    piezas.append(bpy.context.object)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.42, location=(0, 0, -0.05), vertices=12)
    piezas.append(bpy.context.object)

    for i, y in enumerate((-0.20, -0.26)):
        bpy.ops.mesh.primitive_cube_add(size=0.09, location=(0.06, 0, y))
        c = bpy.context.object
        c.scale = (1.0, 0.5, 0.55)
        piezas.append(c)

    llave = unir(piezas, "llave")
    llave.location = loc
    pintar(llave, "mat_dorado", PALETA["dorado"], emision=0.35)
    return flotar(llave)


def crear_mascaras(loc=(0, 0, 1.6)):
    """Sala 1 · Gangle: máscaras de comedia y tragedia."""
    caras = []
    for signo, x in ((1, -0.45), (-1, 0.45)):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, location=(x, 0, 0), segments=20, ring_count=12)
        cara = bpy.context.object
        cara.scale = (1.0, 0.45, 1.15)
        piezas = [cara]
        # ojos
        for ox in (-0.12, 0.12):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, location=(x + ox, -0.13, 0.09), segments=10, ring_count=6)
            piezas.append(bpy.context.object)
        # boca curvada hacia arriba (comedia) o abajo (tragedia)
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.13, minor_radius=0.028,
            location=(x, -0.12, -0.10 - 0.05 * signo),
            rotation=(math.radians(90), 0, 0), major_segments=16, minor_segments=8)
        boca = bpy.context.object
        boca.scale = (1.0, 1.0, 0.5 * signo)
        piezas.append(boca)
        m = unir(piezas, "mascara_comedia" if signo > 0 else "mascara_tragedia")
        pintar(m, "mat_lona", PALETA["lona"])
        caras.append(m)

    grupo = unir(caras, "mascaras")
    grupo.location = loc
    return flotar(grupo, altura=0.12)


def crear_molecula(loc=(0, 0, 1.5)):
    """Sala 2 · Ragatha: molécula de agua H2O."""
    piezas = []
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.26, location=(0, 0, 0), segments=24, ring_count=14)
    oxigeno = bpy.context.object
    pintar(oxigeno, "mat_rojo", PALETA["rojo"])
    piezas.append(oxigeno)

    ang = math.radians(52.25)  # medio ángulo real del enlace H-O-H
    for signo in (1, -1):
        px, pz = 0.42 * math.sin(ang) * signo, 0.42 * math.cos(ang)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(px, 0, pz), segments=18, ring_count=10)
        h = bpy.context.object
        pintar(h, "mat_lona", PALETA["lona"])
        piezas.append(h)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=0.42, location=(px / 2, 0, pz / 2),
                                            rotation=(0, ang * signo, 0), vertices=10)
        enlace = bpy.context.object
        pintar(enlace, "mat_acero", PALETA["acero"])
        piezas.append(enlace)

    mol = unir(piezas, "molecula_agua")
    mol.location = loc
    return flotar(mol, altura=0.1)


def crear_frascos(loc=(0, 0, 1.0)):
    """Sala 3 · Kinger: frascos con insectos (los 'bugs')."""
    grupo = []
    for i, x in enumerate((-0.5, 0.0, 0.5)):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.16, depth=0.4, location=(x, 0, 0), vertices=16)
        frasco = bpy.context.object
        pintar(frasco, "mat_vidrio", PALETA["vidrio"], alpha=0.35)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.17, depth=0.05, location=(x, 0, 0.22), vertices=16)
        tapa = bpy.context.object
        pintar(tapa, "mat_dorado", PALETA["dorado"])
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.07, location=(x, 0, -0.05), segments=10, ring_count=6)
        bicho = bpy.context.object
        bicho.scale = (1.6, 0.8, 0.7)
        pintar(bicho, "mat_noche", PALETA["noche"])
        grupo += [frasco, tapa, bicho]

    frascos = unir(grupo, "frascos_insectos")
    frascos.location = loc
    return frascos


def crear_engranajes(loc=(0, 0, 1.6)):
    """Sala 4 · Zooble: engranajes flotantes."""
    ruedas = []
    for radio, x, dientes in ((0.32, -0.3, 10), (0.22, 0.28, 8)):
        piezas = []
        bpy.ops.mesh.primitive_cylinder_add(radius=radio, depth=0.09, location=(x, 0, 0), vertices=20)
        piezas.append(bpy.context.object)
        for i in range(dientes):
            a = (2 * math.pi / dientes) * i
            bpy.ops.mesh.primitive_cube_add(
                size=0.12,
                location=(x + math.cos(a) * radio, math.sin(a) * radio, 0),
                rotation=(0, 0, a))
            piezas.append(bpy.context.object)
        bpy.ops.mesh.primitive_cylinder_add(radius=radio * 0.28, depth=0.12, location=(x, 0, 0), vertices=12)
        piezas.append(bpy.context.object)
        r = unir(piezas, f"engranaje_{len(ruedas)}")
        pintar(r, "mat_acero", PALETA["acero"])
        ruedas.append(r)

    grupo = unir(ruedas, "engranajes")
    grupo.location = loc
    grupo.rotation_euler.x = math.radians(90)
    return flotar(grupo, altura=0.08)


def crear_ojo(loc=(0, 0, 1.8)):
    """Sala 5 · Pomni: ojo digital estilo Caine."""
    piezas = []
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, location=(0, 0, 0), segments=24, ring_count=14)
    globo = bpy.context.object
    pintar(globo, "mat_lona", PALETA["lona"], emision=0.2)
    piezas.append(globo)

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.13, location=(0, -0.22, 0), segments=16, ring_count=10)
    pupila = bpy.context.object
    pupila.scale = (1, 0.5, 1)
    pintar(pupila, "mat_noche", PALETA["noche"])
    piezas.append(pupila)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.42, minor_radius=0.022,
                                     location=(0, 0, 0), major_segments=28, minor_segments=8)
    aro = bpy.context.object
    pintar(aro, "mat_glitch", PALETA["glitch"], emision=1.2)
    piezas.append(aro)

    ojo = unir(piezas, "ojo_digital")
    ojo.location = loc
    return flotar(ojo, altura=0.1)


def crear_portal(loc=(0, 0, 0)):
    """
    Cámara del portal: arco + disco + cortinas + dientes flotantes.
    Genera la animación 'portal_activar' lista para exportar.
    """
    piezas_marco = []
    bpy.ops.mesh.primitive_torus_add(major_radius=1.5, minor_radius=0.16, location=(0, 0, 1.6),
                                     rotation=(math.radians(90), 0, 0),
                                     major_segments=32, minor_segments=12)
    arco = bpy.context.object
    pintar(arco, "mat_dorado", PALETA["dorado"], emision=0.3)
    piezas_marco.append(arco)

    # dientes alrededor del arco (firma visual de Caine)
    for i in range(16):
        a = (2 * math.pi / 16) * i
        bpy.ops.mesh.primitive_cone_add(radius1=0.11, depth=0.3,
                                        location=(math.cos(a) * 1.5, 0, 1.6 + math.sin(a) * 1.5),
                                        rotation=(0, 0, 0))
        d = bpy.context.object
        d.rotation_euler = (math.radians(90) + 0, a + math.pi, 0)
        pintar(d, "mat_lona", PALETA["lona"])
        piezas_marco.append(d)

    marco = unir(piezas_marco, "portal_marco")

    # superficie del portal (lo que se anima)
    bpy.ops.mesh.primitive_circle_add(radius=1.42, location=(0, 0.02, 1.6),
                                      rotation=(math.radians(90), 0, 0), vertices=48, fill_type="NGON")
    disco = bpy.context.object
    disco.name = "portal_superficie"
    pintar(disco, "mat_glitch", PALETA["glitch"], emision=2.0)

    # cortinas laterales
    for x in (-2.6, 2.6):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, 0.3, 1.7))
        cort = bpy.context.object
        cort.scale = (0.5, 0.12, 1.8)
        pintar(cort, "mat_rojo", PALETA["rojo"])
        cort.name = f"cortina_{'izq' if x < 0 else 'der'}"

    # suelo
    bpy.ops.mesh.primitive_cylinder_add(radius=4.5, depth=0.12, location=(0, 0, -0.06), vertices=32)
    suelo = bpy.context.object
    suelo.name = "suelo_pista"
    pintar(suelo, "mat_noche", PALETA["noche"])

    # ── animación portal_activar (contrato con la web) ──
    disco.animation_data_clear()
    disco.animation_data_create()
    accion = bpy.data.actions.new(name="portal_activar")
    disco.animation_data.action = accion
    for frame, escala in ((1, 0.02), (45, 1.12), (65, 1.0), (120, 1.0)):
        disco.scale = (escala, escala, escala)
        disco.keyframe_insert(data_path="scale", frame=frame)
    disco.rotation_euler = (math.radians(90), 0, 0)
    disco.keyframe_insert(data_path="rotation_euler", frame=1)
    disco.rotation_euler = (math.radians(90), 0, math.radians(360))
    disco.keyframe_insert(data_path="rotation_euler", frame=120)

    pista = disco.animation_data.nla_tracks.new()
    pista.name = "portal_activar"
    pista.strips.new("portal_activar", 1, accion)
    disco.animation_data.action = None

    print("[props] Portal generado con animación 'portal_activar'")
    return disco


CATALOGO = {
    "llave": crear_llave,
    "mascaras": crear_mascaras,
    "molecula": crear_molecula,
    "frascos": crear_frascos,
    "engranajes": crear_engranajes,
    "ojo": crear_ojo,
}


def agregar_props(lista):
    """Agrega props por nombre a la escena actual. Usado por pipeline_sala.py."""
    creados = []
    for nombre in lista:
        nombre = nombre.strip().lower()
        if nombre in CATALOGO:
            creados.append(CATALOGO[nombre]())
            print(f"[props] ✔ {nombre}")
        elif nombre:
            print(f"[props] ⚠ prop desconocido: '{nombre}'")
    return creados


# ── MAIN (uso independiente) ─────────────────────────────────────────────────

def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    salida = ""
    modo = "demo"
    for i, a in enumerate(argv):
        if a == "--salida" and i + 1 < len(argv):
            salida = argv[i + 1]
        elif a == "--portal":
            modo = "portal"
        elif a == "--demo":
            modo = "demo"

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    if modo == "portal":
        crear_portal()
    else:
        for i, (nombre, fn) in enumerate(CATALOGO.items()):
            obj = fn()
            if obj:
                obj.location.x = (i - 2.5) * 1.4
                print(f"[props] {nombre} en x={obj.location.x:.1f}")

    if salida:
        os.makedirs(os.path.dirname(os.path.abspath(salida)), exist_ok=True)
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.export_scene.gltf(
            filepath=salida, export_format="GLB", export_apply=True,
            export_animations=True, export_nla_strips=True,
            export_cameras=False, export_lights=False)
        mb = os.path.getsize(salida) / (1024 * 1024)
        print(f"[props] ✔ exportado {salida} ({mb:.2f} MB)")


if __name__ == "__main__":
    main()

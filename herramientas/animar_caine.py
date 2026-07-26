#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
animar_caine.py — Animaciones para un modelo con rig
=====================================================
Digital Circus STEM Escape

Genera dos animaciones sobre el esqueleto del modelo y las hornea
en el .glb para que la web pueda reproducirlas:

    caine_idle     respiración, balanceo, brazos sueltos
    caine_hablar   boca abriendo y cerrando, gestos de brazos, cabezazos

USO

1) Ver qué huesos tiene el modelo (SIEMPRE lo primero):

   %blender% --background --python animar_caine.py -- ^
       --entrada ..\web\modelos\caine_tadc.glb --listar

2) Generar las animaciones (el script intenta reconocer los huesos solo):

   %blender% --background --python animar_caine.py -- ^
       --entrada ..\web\modelos\caine_tadc.glb ^
       --salida  ..\web\modelos\caine_tadc.glb

3) Si no acierta con algún hueso, se lo dices tú:

   ... --mapa "boca=Jaw_01; brazoI=Arm_L; brazoD=Arm_R; cabeza=Head"

PARTES QUE BUSCA
   cabeza    para cabezazos y balanceo
   boca      para abrir y cerrar al hablar
   brazoI    brazo izquierdo
   brazoD    brazo derecho
   piernaI   pierna izquierda
   piernaD   pierna derecha
   torso     para la respiración

No pasa nada si alguna no aparece: se anima lo que haya.
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


EJE_BOCA = "X"
GRADOS_BOCA = 20.0


def log(m):
    print(f"[animar] {m}")


# Palabras que suelen aparecer en los nombres de hueso de cada parte.
# Se prueban en orden: la primera que encaje, gana.
PISTAS = {
    "cabeza":  ["head", "cabeza", "skull", "cranium"],
    "boca":    ["mouthbotcontrol", "jawlower", "jaw", "boca", "mandible",
                "mouthbot", "chin", "teeth", "diente"],
    "bocaSup": ["mouthtopcontrol", "jawupper", "mouthtop", "upperjaw"],
    "sombrero": ["hat", "sombrero", "cap"],
    "brazoI":  ["arm.l", "arm_l", "leftarm", "arm.left", "brazo.l", "upperarm.l",
                "shoulder.l", "hombro.l", "l_arm", "arml"],
    "brazoD":  ["arm.r", "arm_r", "rightarm", "arm.right", "brazo.r", "upperarm.r",
                "shoulder.r", "hombro.r", "r_arm", "armr"],
    "piernaI": ["leg.l", "leg_l", "leftleg", "leg.left", "pierna.l", "thigh.l",
                "upleg.l", "l_leg", "legl"],
    "piernaD": ["leg.r", "leg_r", "rightleg", "leg.right", "pierna.r", "thigh.r",
                "upleg.r", "r_leg", "legr"],
    "torso":   ["spine", "torso", "chest", "pecho", "body", "cuerpo", "hips"],
}


def leer_args():
    cfg = {"entrada": "", "salida": "", "mapa": "", "listar": False,
           "eje_boca": "X", "grados_boca": "20"}
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


def buscar_armature():
    for o in bpy.context.scene.objects:
        if o.type == "ARMATURE":
            return o
    return None


def listar(arm):
    print("\n" + "=" * 66)
    if arm:
        print(f"ESQUELETO: {arm.name}  ·  {len(arm.pose.bones)} huesos")
        print("=" * 66)
        for b in arm.pose.bones:
            padre = b.parent.name if b.parent else "—"
            print(f"  {b.name:<34} (padre: {padre})")
    else:
        print("NO HAY ESQUELETO. Objetos de malla:")
        print("=" * 66)
        for o in bpy.context.scene.objects:
            if o.type == "MESH":
                print(f"  {o.name}")
    print("=" * 66)

    # Animaciones ya existentes en el archivo
    acciones = [a.name for a in bpy.data.actions]
    print(f"Animaciones ya presentes: {acciones if acciones else 'ninguna'}")
    print("\nCopia los nombres que necesites y pásalos con --mapa")
    print('Ejemplo: --mapa "boca=Jaw; brazoI=Arm_L; brazoD=Arm_R"\n')


def emparejar(arm, mapa_manual):
    """Asocia cada parte con un hueso real. Devuelve {parte: nombre_hueso}."""
    encontrados = {}
    nombres = [b.name for b in arm.pose.bones]
    bajos = {n.lower(): n for n in nombres}

    # 1 · lo que diga el usuario manda
    for par in mapa_manual.split(";"):
        if "=" in par:
            k, v = par.split("=", 1)
            k, v = k.strip(), v.strip()
            if v in nombres:
                encontrados[k] = v
            else:
                coincide = [n for n in nombres if v.lower() in n.lower()]
                if coincide:
                    encontrados[k] = coincide[0]
                else:
                    log(f"  ⚠ no hay ningún hueso parecido a '{v}'")

    # 2 · el resto, por reconocimiento
    for parte, pistas in PISTAS.items():
        if parte in encontrados:
            continue
        for pista in pistas:
            hallado = next((orig for bajo, orig in bajos.items() if pista in bajo), None)
            if hallado:
                encontrados[parte] = hallado
                break

    print()
    log("Huesos reconocidos:")
    for parte in PISTAS:
        log(f"  {parte:<9} → {encontrados.get(parte, '(no encontrado)')}")
    return encontrados


def curvas_de(accion):
    """
    Devuelve las f-curves de una acción.
    Blender <=4.3 las expone en accion.fcurves; desde 4.4 (y en 5.x)
    viven dentro de capas y channelbags. Se prueban ambas rutas.
    """
    if hasattr(accion, "fcurves"):
        try:
            return list(accion.fcurves)
        except (AttributeError, TypeError):
            pass
    encontradas = []
    try:
        for capa in accion.layers:
            for tira in capa.strips:
                bolsas = getattr(tira, "channelbags", None) or []
                for bolsa in bolsas:
                    encontradas.extend(bolsa.fcurves)
    except (AttributeError, TypeError):
        pass
    return encontradas


def _clave(hueso, frame, rot=None, loc=None, escala=None):
    if rot:
        hueso.rotation_mode = "XYZ"
        hueso.rotation_euler = tuple(math.radians(v) for v in rot)
        hueso.keyframe_insert(data_path="rotation_euler", frame=frame)
    if loc:
        hueso.location = loc
        hueso.keyframe_insert(data_path="location", frame=frame)
    if escala:
        hueso.scale = escala
        hueso.keyframe_insert(data_path="scale", frame=frame)


def crear_accion(arm, nombre, guion, largo):
    """
    guion: lista de (parte, [(frame, {rot/loc/escala})])
    Crea la acción, mete los fotogramas clave y la empuja al NLA.
    """
    # OJO: nada de animation_data_clear() aquí — borraría las pistas
    # NLA creadas por las llamadas anteriores y solo sobreviviría la última.
    if not arm.animation_data:
        arm.animation_data_create()
    accion = bpy.data.actions.new(name=nombre)
    arm.animation_data.action = accion

    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")

    puestos = 0
    for hueso_nombre, claves in guion:
        hueso = arm.pose.bones.get(hueso_nombre)
        if not hueso:
            continue
        for frame, props in claves:
            _clave(hueso, frame, props.get("rot"), props.get("loc"), props.get("escala"))
            puestos += 1

    bpy.ops.object.mode_set(mode="OBJECT")

    # Bucle continuo (opcional: la web repite las animaciones igualmente)
    curvas = curvas_de(accion)
    if curvas:
        for fc in curvas:
            try:
                fc.modifiers.new(type="CYCLES")
            except (RuntimeError, AttributeError):
                pass
    else:
        log("    (sin acceso a las f-curves en esta versión; el bucle lo hará la web)")

    pista = arm.animation_data.nla_tracks.new()
    pista.name = nombre
    pista.strips.new(nombre, 1, accion)
    arm.animation_data.action = None

    log(f"  ✔ '{nombre}': {puestos} fotogramas clave en {largo} frames")
    return accion


def reposo(arm):
    """Devuelve todos los huesos a su pose original."""
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    for b in arm.pose.bones:
        b.location = (0, 0, 0)
        b.rotation_mode = "XYZ"
        b.rotation_euler = (0, 0, 0)
        b.rotation_quaternion = (1, 0, 0, 0)
        b.scale = (1, 1, 1)
    bpy.ops.object.mode_set(mode="OBJECT")


def guion_idle(h):
    """Reposo: respira, se mece, los brazos cuelgan con vaivén."""
    g = []
    if "torso" in h:
        g.append((h["torso"], [
            (1,  {"escala": (1, 1, 1), "rot": (0, 0, 0)}),
            (30, {"escala": (1.02, 1.03, 1.02), "rot": (0, 2, 0)}),
            (60, {"escala": (1, 1, 1), "rot": (0, 0, 0)}),
            (90, {"escala": (1.02, 1.03, 1.02), "rot": (0, -2, 0)}),
            (120, {"escala": (1, 1, 1), "rot": (0, 0, 0)}),
        ]))
    if "cabeza" in h:
        g.append((h["cabeza"], [
            (1,  {"rot": (0, 0, 0)}),
            (40, {"rot": (3, 6, 0)}),
            (80, {"rot": (-2, -5, 0)}),
            (120, {"rot": (0, 0, 0)}),
        ]))
    for parte, signo in (("brazoI", 1), ("brazoD", -1)):
        if parte in h:
            g.append((h[parte], [
                (1,  {"rot": (0, 0, 0)}),
                (35, {"rot": (0, 0, 7 * signo)}),
                (75, {"rot": (0, 0, -5 * signo)}),
                (120, {"rot": (0, 0, 0)}),
            ]))
    for parte in ("piernaI", "piernaD"):
        if parte in h:
            g.append((h[parte], [
                (1,  {"rot": (0, 0, 0)}),
                (60, {"rot": (2, 0, 0)}),
                (120, {"rot": (0, 0, 0)}),
            ]))
    if "sombrero" in h:
        g.append((h["sombrero"], [
            (1,  {"rot": (0, 0, 0)}),
            (50, {"rot": (2, 0, 1.5)}),
            (120, {"rot": (0, 0, 0)}),
        ]))
    return g


def guion_hablar(h):
    """Habla: boca abriendo y cerrando, brazos gesticulando, cabezazos."""
    g = []
    eje = {"X": 0, "Y": 1, "Z": 2}.get(EJE_BOCA.upper(), 0)
    tope = GRADOS_BOCA

    def claves_boca(signo):
        """Abre y cierra al ritmo de sílabas, sobre el eje elegido."""
        claves = []
        f, abierto = 1, False
        while f <= 96:
            rot = [0.0, 0.0, 0.0]
            if abierto:
                rot[eje] = tope * signo
            claves.append((f, {"rot": tuple(rot)}))
            abierto = not abierto
            f += 8
        return claves

    # Mandíbula inferior baja y superior sube: la boca se abre de verdad
    if "boca" in h:
        g.append((h["boca"], claves_boca(1)))
    if "bocaSup" in h:
        g.append((h["bocaSup"], claves_boca(-0.55)))
    if "sombrero" in h:
        g.append((h["sombrero"], [
            (1,  {"rot": (0, 0, 0)}),
            (24, {"rot": (4, 0, 3)}),
            (48, {"rot": (-3, 0, -2)}),
            (96, {"rot": (0, 0, 0)}),
        ]))
    if "cabeza" in h:
        g.append((h["cabeza"], [
            (1,  {"rot": (0, 0, 0)}),
            (16, {"rot": (7, 4, 0)}),
            (32, {"rot": (-3, -6, 0)}),
            (48, {"rot": (6, 3, 0)}),
            (64, {"rot": (-4, 5, 0)}),
            (96, {"rot": (0, 0, 0)}),
        ]))
    for parte, signo in (("brazoI", 1), ("brazoD", -1)):
        if parte in h:
            g.append((h[parte], [
                (1,  {"rot": (0, 0, 0)}),
                (24, {"rot": (0, 12 * signo, 26 * signo)}),
                (48, {"rot": (0, -8 * signo, 10 * signo)}),
                (72, {"rot": (0, 14 * signo, 30 * signo)}),
                (96, {"rot": (0, 0, 0)}),
            ]))
    if "torso" in h:
        g.append((h["torso"], [
            (1,  {"rot": (0, 0, 0)}),
            (24, {"rot": (0, 4, 0)}),
            (48, {"rot": (0, -4, 0)}),
            (96, {"rot": (0, 0, 0)}),
        ]))
    return g


def main():
    global EJE_BOCA, GRADOS_BOCA
    cfg = leer_args()
    EJE_BOCA = str(cfg.get("eje_boca", "X"))
    GRADOS_BOCA = float(cfg.get("grados_boca", 20))
    if not cfg["entrada"]:
        sys.exit("ERROR: falta --entrada")

    importar(cfg["entrada"])
    arm = buscar_armature()

    if cfg["listar"]:
        listar(arm)
        return

    if not cfg["salida"]:
        sys.exit("ERROR: falta --salida")
    if not arm:
        sys.exit("ERROR: este modelo no tiene esqueleto; no se puede animar por huesos.\n"
                 "       Usa --listar para ver qué contiene.")

    huesos = emparejar(arm, cfg["mapa"])
    if not huesos:
        sys.exit("No reconocí ningún hueso. Usa --listar y pásalos con --mapa.")

    print()
    log(f"Creando animaciones... (boca: eje {EJE_BOCA}, {GRADOS_BOCA:.0f}°)")
    crear_accion(arm, "caine_idle", guion_idle(huesos), 120)
    crear_accion(arm, "caine_hablar", guion_hablar(huesos), 96)

    # Sin acción activa y con la pose en reposo: así el modelo se
    # exporta en su postura original y no deformado por el último clave.
    if arm.animation_data:
        arm.animation_data.action = None
    reposo(arm)

    pistas = [t.name for t in (arm.animation_data.nla_tracks if arm.animation_data else [])]
    log(f"Pistas NLA listas para exportar: {pistas}")
    if len(pistas) < 2:
        log("  ⚠ esperaba 2 pistas; algo se perdió por el camino")

    print()
    # Sin Draco: la compresión da problemas de dibujado con mallas
    # con esqueleto en algunos visores (se ven en negro).
    mallas = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    log(f"Mallas en la escena antes de exportar: {len(mallas)}")
    if not mallas:
        sys.exit("ERROR: no queda ninguna malla; algo se perdió al animar.")

    if props_stem and hasattr(props_stem, "exportar_glb"):
        props_stem.exportar_glb(cfg["salida"], con_draco=False,
                                aplicar_modificadores=False)
    else:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.export_scene.gltf(filepath=cfg["salida"], export_format="GLB",
                                  export_apply=False,
                                  export_animations=True, export_nla_strips=True)
        log(f"✔ exportado {cfg['salida']}")

    print()
    log("Comprueba en https://gltf-viewer.donmccurdy.com/ que aparecen")
    log("'caine_idle' y 'caine_hablar' en la lista de animaciones.")


if __name__ == "__main__":
    main()
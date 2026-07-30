#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
animar_personaje.py — Animaciones de sala para un personaje
=============================================================
Digital Circus STEM Escape

Genera las dos animaciones que pide el contrato de la web
(config-salas.js → ANIMACIONES) y las hornea en el .glb:

    puerta_abrir        el personaje reacciona al abrir la puerta
    recompensa_aparecer  celebración al ganar la llave de la sala

Es la versión generalizada de animar_caine.py (que anima
caine_idle/caine_hablar): incluye más patrones de nombres de
hueso, porque cada personaje viene de un Sketchfab distinto con
su propia convención (Valve Biped, Mixamo, huesos con sufijos
numéricos, etc). Si el modelo no tiene esqueleto (huesos), anima
el objeto entero en su lugar — mismo resultado para la web
(el nombre de la animación es lo único que sala.js necesita).

USO

1) Ver qué huesos tiene el modelo (SIEMPRE lo primero):

   %blender% --background --python animar_personaje.py -- ^
       --entrada ..\assets\modelos\ragatha.glb --listar

2) Generar las animaciones (el script intenta reconocer los huesos solo):

   %blender% --background --python animar_personaje.py -- ^
       --entrada ..\assets\modelos\ragatha.glb ^
       --salida  ..\assets\modelos\ragatha.glb

3) Si no acierta con algún hueso, se lo dices tú:

   ... --mapa "brazoI=Bip01_L_UpperArm; brazoD=Bip01_R_UpperArm"

PARTES QUE BUSCA
   cabeza, torso, brazoI, brazoD, piernaI, piernaD

No pasa nada si alguna no aparece: se anima lo que haya. Si no hay
ningún hueso reconocible (o el modelo no tiene esqueleto), anima
el objeto de malla completo en su lugar.
"""

import bpy
import sys
import os
import math


def log(m):
    print(f"[animar] {m}")


# Palabras que suelen aparecer en los nombres de hueso de cada parte.
# Se prueban en orden: la primera que encaje, gana. Incluye tanto
# "lado_parte" (Valve Biped: L_UpperArm, L_Thigh) como "parte.lado"
# (Mixamo/genérico: upperarm.l, thigh.l) y variantes con Hip/Knee.
PISTAS = {
    "cabeza":  ["head", "cabeza", "skull", "cranium"],
    # OJO: nada de "l_arm"/"r_arm" sueltos — "upper_arm" contiene
    # "r_arm" como substring (unión de "uppe-R" + "_ARM") sin importar
    # el lado, y da falsos positivos. Los patrones de abajo sí son
    # seguros porque exigen "arm" pegado al lado, no al revés.
    "brazoI":  ["l_upperarm", "upperarm.l", "upperarm_l", "arm.l", "arm_l",
                "leftarm", "arm.left", "brazo.l", "shoulder.l", "l_shoulder",
                "hombro.l", "l_clavicle"],
    "brazoD":  ["r_upperarm", "upperarm.r", "upperarm_r", "arm.r", "arm_r",
                "rightarm", "arm.right", "brazo.r", "shoulder.r", "r_shoulder",
                "hombro.r", "r_clavicle"],
    # Mismo cuidado que arriba: "upper_leg" contiene "r_leg" como
    # substring ("uppe-R" + "_LEG") sin importar el lado — nada de
    # "r_leg"/"l_leg" sueltos aquí tampoco.
    "piernaI": ["l_thigh", "thigh.l", "thigh_l", "leg.l", "leg_l",
                "leftleg", "leg.left", "pierna.l", "upleg.l", "hip_l", "hip.l"],
    "piernaD": ["r_thigh", "thigh.r", "thigh_r", "leg.r", "leg_r",
                "rightleg", "leg.right", "pierna.r", "upleg.r", "hip_r", "hip.r"],
    "torso":   ["spine", "torso", "chest", "pecho", "cuerpo", "hips", "pelvis"],
}


def leer_args():
    cfg = {"entrada": "", "salida": "", "mapa": "", "listar": False}
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


def desenvolver_ejes(entidad):
    """
    Sketchfab suele exportar modelos que vinieron de un .fbx con un
    envoltorio de conversión de ejes: uno o más vacíos ancestros
    (rotación ±90°, escala 0.01 de cm→m) que Blender vuelve a exportar
    mal — el personaje sale diminuto o mal orientado.

    En vez de intentar cancelar esos valores a mano, se saca TODO el
    grupo (la entidad y cualquier hermano que cuelgue del mismo
    vacío raíz: mallas separadas, etc.) de la cadena de vacíos de una
    sola vez, con "mantener transformación" — conserva la posición y
    el tamaño relativo entre ellos — y se borran los vacíos vacíos.
    """
    bpy.context.view_layer.update()
    if entidad.parent is None:
        return  # ya es raíz, nada que desenvolver

    raiz = entidad
    while raiz.parent is not None:
        raiz = raiz.parent

    # Todo lo que cuelga de esa raíz (menos la raíz misma) sale a top-level junto
    grupo = [o for o in bpy.context.scene.objects if o != raiz and (
        o == raiz or _es_descendiente(o, raiz))]
    log(f"  desenvolviendo vacío raíz '{raiz.name}' — {len(grupo)} objeto(s): "
        f"{[o.name for o in grupo]}")

    bpy.ops.object.select_all(action="DESELECT")
    for o in grupo:
        o.select_set(True)
    bpy.context.view_layer.objects.active = entidad
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.context.view_layer.update()

    # Borra los vacíos (raíz incluida) que se quedaron sin hijos
    for o in [raiz] + grupo:
        if o.type == "EMPTY" and o.name in bpy.data.objects and len(o.children) == 0:
            bpy.data.objects.remove(o, do_unlink=True)

    escala_final = entidad.matrix_world.to_scale()
    log(f"  escala mundial de '{entidad.name}' tras desenvolver: {tuple(escala_final)}")


def _es_descendiente(o, raiz):
    p = o.parent
    while p is not None:
        if p == raiz:
            return True
        p = p.parent
    return False


def objeto_raiz():
    """Sin esqueleto: el objeto de malla más grande (el personaje,
    no accesorios sueltos), o el primero si hay solo uno."""
    mallas = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not mallas:
        return None
    return max(mallas, key=lambda o: len(o.data.vertices) if o.data else 0)


def listar(arm):
    print("\n" + "=" * 66)
    if arm:
        print(f"ESQUELETO: {arm.name}  ·  {len(arm.pose.bones)} huesos")
        print("=" * 66)
        for b in arm.pose.bones:
            padre = b.parent.name if b.parent else "—"
            print(f"  {b.name:<34} (padre: {padre})")
    else:
        print("NO HAY ESQUELETO. Se animaría el objeto de malla completo:")
        print("=" * 66)
        for o in bpy.context.scene.objects:
            if o.type == "MESH":
                print(f"  {o.name}")
    print("=" * 66)

    acciones = [a.name for a in bpy.data.actions]
    print(f"Animaciones ya presentes: {acciones if acciones else 'ninguna'}")
    if arm:
        print("\nCopia los nombres que necesites y pásalos con --mapa")
        print('Ejemplo: --mapa "brazoI=Bip01_L_UpperArm; brazoD=Bip01_R_UpperArm"\n')


def emparejar(arm, mapa_manual):
    """Asocia cada parte con un hueso real. Devuelve {parte: nombre_hueso}."""
    encontrados = {}
    nombres = [b.name for b in arm.pose.bones]
    bajos = {n.lower(): n for n in nombres}

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


def _clave(entidad, frame, rot=None, loc=None, escala=None):
    if rot:
        entidad.rotation_mode = "XYZ"
        entidad.rotation_euler = tuple(math.radians(v) for v in rot)
        entidad.keyframe_insert(data_path="rotation_euler", frame=frame)
    if loc:
        entidad.location = loc
        entidad.keyframe_insert(data_path="location", frame=frame)
    if escala:
        entidad.scale = escala
        entidad.keyframe_insert(data_path="scale", frame=frame)


def crear_accion_huesos(arm, nombre, guion):
    """guion: lista de (hueso, [(frame, {rot/loc/escala})]). Sin bucle:
    son animaciones de un solo disparo (puerta/recompensa), no ciclos."""
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

    pista = arm.animation_data.nla_tracks.new()
    pista.name = nombre
    pista.strips.new(nombre, 1, accion)
    arm.animation_data.action = None

    log(f"  ✔ '{nombre}': {puestos} fotogramas clave (huesos)")
    return accion


def crear_accion_objeto(obj, nombre, claves):
    """Sin esqueleto: anima el transform del objeto completo."""
    if not obj.animation_data:
        obj.animation_data_create()
    accion = bpy.data.actions.new(name=nombre)
    obj.animation_data.action = accion

    puestos = 0
    for frame, props in claves:
        _clave(obj, frame, props.get("rot"), props.get("loc"), props.get("escala"))
        puestos += 1

    pista = obj.animation_data.nla_tracks.new()
    pista.name = nombre
    pista.strips.new(nombre, 1, accion)
    obj.animation_data.action = None

    log(f"  ✔ '{nombre}': {puestos} fotogramas clave (objeto completo)")
    return accion


def reposo(arm):
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    for b in arm.pose.bones:
        b.location = (0, 0, 0)
        b.rotation_mode = "XYZ"
        b.rotation_euler = (0, 0, 0)
        b.rotation_quaternion = (1, 0, 0, 0)
        b.scale = (1, 1, 1)
    bpy.ops.object.mode_set(mode="OBJECT")


def guion_puerta_abrir(h):
    """Reacción breve al abrir la puerta: se gira hacia cámara y saluda."""
    g = []
    if "torso" in h:
        g.append((h["torso"], [
            (1,  {"rot": (0, 0, 0)}),
            (15, {"rot": (0, -8, 0)}),
            (30, {"rot": (0, 3, 0)}),
            (45, {"rot": (0, 0, 0)}),
        ]))
    if "cabeza" in h:
        g.append((h["cabeza"], [
            (1,  {"rot": (0, 0, 0)}),
            (18, {"rot": (-6, -10, 0)}),
            (45, {"rot": (0, 0, 0)}),
        ]))
    if "brazoD" in h:
        g.append((h["brazoD"], [
            (1,  {"rot": (0, 0, 0)}),
            (20, {"rot": (0, 0, -35)}),
            (35, {"rot": (0, 0, -20)}),
            (45, {"rot": (0, 0, 0)}),
        ]))
    if "brazoI" in h:
        g.append((h["brazoI"], [
            (1,  {"rot": (0, 0, 0)}),
            (25, {"rot": (0, 0, 8)}),
            (45, {"rot": (0, 0, 0)}),
        ]))
    return g


def guion_recompensa_aparecer(h):
    """Celebración al ganar la llave: brazos arriba, salta, asiente."""
    g = []
    if "torso" in h:
        g.append((h["torso"], [
            (1,  {"escala": (1, 1, 1), "rot": (0, 0, 0)}),
            (16, {"escala": (0.94, 1.1, 0.94), "rot": (0, 0, 0)}),
            (32, {"escala": (1.05, 0.96, 1.05), "rot": (0, 6, 0)}),
            (48, {"escala": (1, 1, 1), "rot": (0, -3, 0)}),
            (60, {"escala": (1, 1, 1), "rot": (0, 0, 0)}),
        ]))
    if "cabeza" in h:
        g.append((h["cabeza"], [
            (1,  {"rot": (0, 0, 0)}),
            (20, {"rot": (-10, 0, 0)}),
            (36, {"rot": (5, 0, 0)}),
            (60, {"rot": (0, 0, 0)}),
        ]))
    for parte, signo in (("brazoI", 1), ("brazoD", -1)):
        if parte in h:
            g.append((h[parte], [
                (1,  {"rot": (0, 0, 0)}),
                (18, {"rot": (0, 0, 150 * signo)}),
                (40, {"rot": (0, 0, 165 * signo)}),
                (60, {"rot": (0, 0, 0)}),
            ]))
    for parte in ("piernaI", "piernaD"):
        if parte in h:
            g.append((h[parte], [
                (1,  {"rot": (0, 0, 0)}),
                (16, {"rot": (-12, 0, 0)}),
                (32, {"rot": (6, 0, 0)}),
                (60, {"rot": (0, 0, 0)}),
            ]))
    return g


def guion_objeto_puerta_abrir():
    """Sin esqueleto: un pequeño respingo del modelo completo."""
    return [
        (1,  {"escala": (1, 1, 1), "rot": (0, 0, 0)}),
        (15, {"escala": (1.06, 0.95, 1.06), "rot": (0, -4, 0)}),
        (30, {"escala": (0.97, 1.04, 0.97), "rot": (0, 2, 0)}),
        (45, {"escala": (1, 1, 1), "rot": (0, 0, 0)}),
    ]


def guion_objeto_recompensa_aparecer():
    """Sin esqueleto: rebote más grande, tipo festejo."""
    return [
        (1,  {"escala": (1, 1, 1), "loc": (0, 0, 0)}),
        (14, {"escala": (0.9, 1.18, 0.9), "loc": (0, 0, 0.08)}),
        (28, {"escala": (1.1, 0.88, 1.1), "loc": (0, 0, 0)}),
        (42, {"escala": (0.96, 1.06, 0.96), "loc": (0, 0, 0.03)}),
        (60, {"escala": (1, 1, 1), "loc": (0, 0, 0)}),
    ]


def exportar(ruta_salida):
    mallas = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    log(f"Mallas en la escena antes de exportar: {len(mallas)}")
    if not mallas:
        sys.exit("ERROR: no queda ninguna malla; algo se perdió al animar.")
    bpy.ops.object.select_all(action="SELECT")
    # Sin Draco: la compresión da problemas de dibujado con mallas
    # con esqueleto en algunos visores (se ven en negro).
    bpy.ops.export_scene.gltf(filepath=ruta_salida, export_format="GLB",
                              export_apply=False,
                              export_animations=True, export_nla_strips=True)
    log(f"✔ exportado {ruta_salida}")


def main():
    cfg = leer_args()
    if not cfg["entrada"]:
        sys.exit("ERROR: falta --entrada")

    importar(cfg["entrada"])
    arm = buscar_armature()
    desenvolver_ejes(arm if arm else objeto_raiz())

    if cfg["listar"]:
        listar(arm)
        return

    if not cfg["salida"]:
        sys.exit("ERROR: falta --salida")

    print()
    if arm:
        huesos = emparejar(arm, cfg["mapa"])
        if not huesos:
            sys.exit("No reconocí ningún hueso. Usa --listar y pásalos con --mapa.")
        log("Creando animaciones por huesos...")
        crear_accion_huesos(arm, "puerta_abrir", guion_puerta_abrir(huesos))
        crear_accion_huesos(arm, "recompensa_aparecer", guion_recompensa_aparecer(huesos))
        if arm.animation_data:
            arm.animation_data.action = None
        reposo(arm)
        pistas = [t.name for t in (arm.animation_data.nla_tracks if arm.animation_data else [])]
    else:
        obj = objeto_raiz()
        if not obj:
            sys.exit("ERROR: no hay ni esqueleto ni malla para animar.")
        log(f"Sin esqueleto: animando el objeto completo '{obj.name}'")
        crear_accion_objeto(obj, "puerta_abrir", guion_objeto_puerta_abrir())
        crear_accion_objeto(obj, "recompensa_aparecer", guion_objeto_recompensa_aparecer())
        if obj.animation_data:
            obj.animation_data.action = None
        pistas = [t.name for t in (obj.animation_data.nla_tracks if obj.animation_data else [])]

    log(f"Pistas NLA listas para exportar: {pistas}")
    if len(pistas) < 2:
        log("  ⚠ esperaba 2 pistas; algo se perdió por el camino")

    print()
    exportar(cfg["salida"])

    print()
    log("Comprueba en https://gltf-viewer.donmccurdy.com/ que aparecen")
    log("'puerta_abrir' y 'recompensa_aparecer' en la lista de animaciones.")


if __name__ == "__main__":
    main()

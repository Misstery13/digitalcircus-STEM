# Modelos 3D (.glb)

Aquí van los 6 archivos exportados desde Blender (responsable: Diana):

| Archivo | Escena |
|---|---|
| `sala1_gangle.glb` | Habitación de Gangle (Matemáticas) |
| `sala2_ragatha.glb` | Habitación de Ragatha (Ciencias) |
| `sala3_kinger.glb` | Fortaleza de Kinger (Programación) |
| `sala4_zooble.glb` | Habitación de Zooble (Tecnología) |
| `sala5_pomni.glb` | Habitación de Pomni (IA) |
| `portal.glb` | Cámara del portal (modelado propio) |

**Requisitos de exportación:**
- <150k triángulos por escena (modificador Decimate)
- Texturas ≤ 2048px
- Animaciones incluidas con los nombres EXACTOS del contrato:
  `puerta_abrir`, `recompensa_aparecer`, `portal_activar`
  (en Blender: cada acción con su nombre, empujada a NLA antes de exportar,
  y en el export glTF marcar "Animation > NLA Tracks")
- GitHub rechaza archivos >100 MB; si un .glb pesa más, falta decimar.

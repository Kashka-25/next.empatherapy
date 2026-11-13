"""
The Golden Pause v2: the 3D honey dipper (Cassidy's Meshy model, source/dipper.glb), rendered in Blender EEVEE with a
transparent background, frame by frame, for honey.py to composite over the softened backdrop.

The model's own drip is the same matte material as the wood, so it is trimmed just below the head at its thinnest
point; the honey left clinging to the head gets a glossy honey finish, and honey.py's flowing stream continues from
exactly that point. The tip's screen position (and the thread radius) for every frame is written to tip-<variant>.json.

Motion (all gentle): a slow sway, a small dip while the drop gathers, then a lift away after the stream lets go.
The camera tilt at the end is applied in honey.py (the whole layer moves up with the scene).

Run:  blender -b --python dipper.py -- --variant wide [--frames 0,60,120] [--all]
"""
import bpy, bmesh, os, sys, math, json, time, mathutils

HERE = os.path.dirname(os.path.abspath(__file__))
CUES = json.load(open(os.path.join(HERE, 'cues.json'), encoding='utf-8'))
FPS, DUR = CUES['fps'], CUES['duration']
NFRAMES = int(round(FPS * DUR))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    if name in argv:
        i = argv.index(name)
        return argv[i + 1] if i + 1 < len(argv) and not argv[i + 1].startswith('--') else True
    return default

VARIANT = arg('--variant', 'wide')
L = CUES['layout'][VARIANT]
W, H = L['size']
FRAMING = {   # camera distance (units) and where the tip sits on screen (fraction of height), per format
    'wide': {'distance': 7.3, 'tip_y': 0.45},
    'square': {'distance': 5.2, 'tip_y': 0.41},
}[VARIANT]
# the honey coat, after the reference Cassidy shared (13 Nov 2026, a dipper with a translucent golden drip): clear gold
# you can see the wood through, amber where it pools, glowing where light passes through it
HONEY_TINT = (0.88, 0.52, 0.08, 1)        # multiplied over the wood: the grain shows through, golden
HONEY_BODY = (0.86, 0.42, 0.03, 1)       # a little of honey's own colour, for depth
HONEY_BODY_MIX = 0.15
HONEY_POOL = (0.42, 0.17, 0.04, 1)       # multiplied in where it pools in the grooves: deeper amber
HONEY_SSS = 0.28
HONEY_GLOW_STRENGTH = 0.04
CUT_Z = -0.30                       # trim the modelled drip here (its thread is narrowest around -0.40)
TIP = mathutils.Vector((0.654, 0.0, CUT_Z))

def smooth(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def window(t, a, b): return smooth((t - a) / max(1e-6, b - a))

# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, 'source', 'dipper.glb'))
obj = [o for o in bpy.context.scene.objects if o.type == 'MESH'][0]
bpy.context.view_layer.objects.active = obj

# trim the drip below CUT_Z and measure the thread radius at the cut
bm = bmesh.new(); bm.from_mesh(obj.data)
near = [v.co for v in bm.verts if abs(v.co.z - CUT_Z) < 0.015 and v.co.x > 0.5]
thread_r = (max(c.x for c in near) - min(c.x for c in near)) / 2 if near else 0.038
# a clean, straight cut through the drip (no jagged triangles), capped so nothing shows inside
geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, CUT_Z), plane_no=(0, 0, 1), clear_inner=True)
edges = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
if edges:
    try: bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    except Exception as e: print('cap skipped', e)
# glossy honey on the honey still clinging below the head
honey_faces = [f for f in bm.faces if all(v.co.z < -0.085 for v in f.verts) and f.calc_center_median().x > 0.5]
bm.to_mesh(obj.data); bm.free()
mat_wood = obj.data.materials[0]
mat_honey = bpy.data.materials.new('honey'); mat_honey.use_nodes = True
pb = mat_honey.node_tree.nodes['Principled BSDF']
pb.inputs['Base Color'].default_value = (0.70, 0.29, 0.02, 1)
pb.inputs['Roughness'].default_value = 0.03
for name, val in (('Coat Weight', 1.0), ('Coat Roughness', 0.01), ('Coat Tint', (1.0, 0.8, 0.4, 1)), ('Subsurface Weight', 0.15),
                  ('Subsurface Radius', (1.0, 0.45, 0.12)), ('Subsurface Scale', 0.08), ('Specular IOR Level', 0.85)):
    if name in pb.inputs: pb.inputs[name].default_value = val
if 'Emission Color' in pb.inputs:
    pb.inputs['Emission Color'].default_value = (1.0, 0.6, 0.12, 1); pb.inputs['Emission Strength'].default_value = 0.08
# (the separate honey material is no longer used: the drip shares the head's honey coat)
# a coat of golden honey over the carved head, thinning up the handle: you see the wood through it, it is
# mirror-smooth, glows a little where light passes through, and softens the carving where it pools
def honey_coat(mat):
    nt = mat.node_tree; N = nt.nodes; Lk = nt.links
    pb = N['Principled BSDF']
    def inp(node, name, kind=None):
        for s in node.inputs:
            if s.name == name and (kind is None or s.type == kind): return s
    def out(node, name, kind=None):
        for s in node.outputs:
            if s.name == name and (kind is None or s.type == kind): return s
    tc = N.new('ShaderNodeTexCoord'); xyz = N.new('ShaderNodeSeparateXYZ'); Lk.new(tc.outputs['Object'], xyz.inputs[0])
    along = N.new('ShaderNodeMapRange'); Lk.new(xyz.outputs['X'], along.inputs['Value'])
    along.inputs['From Min'].default_value = -0.05; along.inputs['From Max'].default_value = 0.30
    noise = N.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 6.0; noise.inputs['Detail'].default_value = 4.0
    Lk.new(tc.outputs['Object'], noise.inputs['Vector'])
    vary = N.new('ShaderNodeMapRange'); Lk.new(noise.outputs['Fac'], vary.inputs['Value'])
    vary.inputs['From Min'].default_value = 0.35; vary.inputs['From Max'].default_value = 0.65
    vary.inputs['To Min'].default_value = 0.8; vary.inputs['To Max'].default_value = 1.0
    mask = N.new('ShaderNodeMath'); mask.operation = 'MULTIPLY'; mask.use_clamp = True
    Lk.new(along.outputs['Result'], mask.inputs[0]); Lk.new(vary.outputs['Result'], mask.inputs[1])
    m = mask.outputs['Value']
    # colour (after Cassidy's reference): the wood seen through clear golden honey, thin over the ridges so the grain
    # shows, deepening to amber where the honey pools in the grooves
    wood_link = pb.inputs['Base Color'].links[0].from_socket
    gold = N.new('ShaderNodeMix'); gold.data_type = 'RGBA'; gold.blend_type = 'MULTIPLY'
    gold.inputs['Factor'].default_value = 1.0
    Lk.new(wood_link, inp(gold, 'A', 'RGBA')); inp(gold, 'B', 'RGBA').default_value = HONEY_TINT
    bright = N.new('ShaderNodeMix'); bright.data_type = 'RGBA'; bright.blend_type = 'MIX'
    Lk.new(out(gold, 'Result', 'RGBA'), inp(bright, 'A', 'RGBA')); inp(bright, 'B', 'RGBA').default_value = HONEY_BODY
    bright.inputs['Factor'].default_value = HONEY_BODY_MIX
    # pooled in the grooves (ambient occlusion): deeper amber, as honey is where it lies thick
    ao = N.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.12
    pool = N.new('ShaderNodeMapRange'); Lk.new(out(ao, 'AO', 'VALUE'), pool.inputs['Value'])
    pool.inputs['From Min'].default_value = 0.55; pool.inputs['From Max'].default_value = 1.0
    pool.inputs['To Min'].default_value = 1.0; pool.inputs['To Max'].default_value = 0.0
    deep = N.new('ShaderNodeMix'); deep.data_type = 'RGBA'; deep.blend_type = 'MULTIPLY'
    Lk.new(pool.outputs['Result'], deep.inputs['Factor'])
    Lk.new(out(bright, 'Result', 'RGBA'), inp(deep, 'A', 'RGBA')); inp(deep, 'B', 'RGBA').default_value = HONEY_POOL
    final = N.new('ShaderNodeMix'); final.data_type = 'RGBA'; final.blend_type = 'MIX'
    Lk.new(m, final.inputs['Factor']); Lk.new(wood_link, inp(final, 'A', 'RGBA')); Lk.new(out(deep, 'Result', 'RGBA'), inp(final, 'B', 'RGBA'))
    Lk.new(out(final, 'Result', 'RGBA'), pb.inputs['Base Color'])
    # roughness: mirror-smooth where coated
    rough_link = pb.inputs['Roughness'].links[0].from_socket
    rmix = N.new('ShaderNodeMix'); rmix.data_type = 'FLOAT'
    Lk.new(m, rmix.inputs['Factor']); Lk.new(rough_link, inp(rmix, 'A', 'VALUE')); inp(rmix, 'B', 'VALUE').default_value = 0.03
    Lk.new(out(rmix, 'Result', 'VALUE'), pb.inputs['Roughness'])
    # the honey softens the carving's fine texture where it pools
    nm = N['Normal Map']
    soft = N.new('ShaderNodeMath'); soft.operation = 'MULTIPLY_ADD'
    Lk.new(m, soft.inputs[0]); soft.inputs[1].default_value = -0.65; soft.inputs[2].default_value = 1.0
    Lk.new(soft.outputs['Value'], nm.inputs['Strength'])
    # clear golden top coat, a touch of glow through it
    Lk.new(m, pb.inputs['Coat Weight'])
    pb.inputs['Coat Roughness'].default_value = 0.01
    pb.inputs['Coat IOR'].default_value = 1.5
    pb.inputs['Coat Tint'].default_value = (1.0, 0.88, 0.58, 1)
    pb.inputs['Specular IOR Level'].default_value = 0.8
    # light passing through the honey: a golden glow from within
    ssw = N.new('ShaderNodeMath'); ssw.operation = 'MULTIPLY'; ssw.inputs[1].default_value = HONEY_SSS
    Lk.new(m, ssw.inputs[0]); Lk.new(ssw.outputs['Value'], pb.inputs['Subsurface Weight'])
    pb.inputs['Subsurface Radius'].default_value = (1.0, 0.58, 0.16); pb.inputs['Subsurface Scale'].default_value = 0.08
    em = N.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; em.inputs[1].default_value = HONEY_GLOW_STRENGTH
    Lk.new(m, em.inputs[0]); Lk.new(em.outputs['Value'], pb.inputs['Emission Strength'])
    pb.inputs['Emission Color'].default_value = (1.0, 0.70, 0.22, 1)
honey_coat(mat_wood)

# pivot at the tip, so sway and lift happen around where the honey leaves the dipper
pivot = bpy.data.objects.new('pivot', None); bpy.context.scene.collection.objects.link(pivot)
pivot.location = TIP
obj.parent = pivot; obj.location = -TIP

sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = W, H, 100
sc.render.film_transparent = True
sc.render.fps = FPS
sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
try: sc.eevee.taa_render_samples = 48
except Exception: pass
world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
bgn = world.node_tree.nodes['Background']; bgn.inputs[0].default_value = (1.0, 0.88, 0.68, 1); bgn.inputs[1].default_value = 0.4
def light(name, kind, energy, color, rot, size=None):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = color
    if size is not None and hasattr(ld, 'angle'): ld.angle = size
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob); ob.rotation_euler = [math.radians(a) for a in rot]
    return ob
light('key', 'SUN', 1.6, (1.0, 0.84, 0.62), (48, -28, -35), 0.15)        # warm sun from the upper left
light('rim', 'SUN', 1.2, (1.0, 0.78, 0.5), (-60, 25, 160), 0.3)           # golden backlight
light('fill', 'SUN', 0.6, (1.0, 0.95, 0.88), (70, 30, 40), 0.6)
# small bright soft-boxes, placed to put liquid-gold glints along the honey-coated grooves
def glint(name, energy, size, loc, target=(0.55, 0.0, 0.12)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = energy; ld.size = size; ld.color = (1.0, 0.93, 0.78)
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob); ob.location = loc
    ob.rotation_euler = (mathutils.Vector(target) - mathutils.Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
glint('glint_a', 120, 0.32, (-0.9, -2.6, 1.9))    # larger soft-boxes than before: broad glossy highlights, as in the reference
glint('glint_b', 50, 0.2, (2.0, -2.2, 0.5))
glint('glint_c', 30, 0.4, (0.6, -2.8, -1.2))

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 70; cam.data.sensor_fit = 'HORIZONTAL'; cam.data.sensor_width = 36
D = FRAMING['distance']
cam.location = (TIP.x, -D, TIP.z); cam.rotation_euler = (math.radians(90), 0, 0)
# shift the frame so the tip lands at the screen centre horizontally and at tip_y vertically
cam.data.shift_x = 0.0
cam.data.shift_y = (FRAMING['tip_y'] - 0.5) * (H / W)     # shift is in units of the larger side (width)

def pose(t):
    sway = math.radians(0.9) * math.sin(2 * math.pi * 0.17 * t)
    bob = 0.006 * math.sin(2 * math.pi * 0.23 * t + 1.0)
    dip = -0.035 * window(t, *CUES['drop']['gather']) * (1 - window(t, CUES['drop']['land'], CUES['drop']['land'] + 1.2))
    lift = 0.55 * window(t, CUES['letGo']['break'], CUES['letGo']['break'] + 1.6)
    pivot.location = (TIP.x, TIP.y, TIP.z + bob + dip + lift)
    pivot.rotation_euler = (0, sway, 0)

def tip_screen():
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    p = pivot.matrix_world.translation
    v = world_to_camera_view(sc, cam, p)
    edge = world_to_camera_view(sc, cam, p + mathutils.Vector((thread_r, 0, 0)))
    return [v.x * W, (1 - v.y) * H, abs(edge.x - v.x) * W]

if __name__ == '__main__':
    out_dir = os.path.join(HERE, 'out', f'v2-dipper-{VARIANT}') if arg('--all') else os.path.join(HERE, 'work', f'v2-dipper-test-{VARIANT}')
    os.makedirs(out_dir, exist_ok=True)
    last = int(round(FPS * (CUES['tilt'][0] + 1.4)))          # after this the dipper has left the frame
    frames = list(range(0, min(NFRAMES, last + 1))) if arg('--all') else [int(x) for x in str(arg('--frames', '0,60,77,120,180,200')).split(',')]
    tips = {}
    t0 = time.time()
    for n in frames:
        t = n / FPS
        pose(t)
        tips[n] = tip_screen()
        sc.render.filepath = os.path.join(out_dir, f'{n:04d}.png')
        bpy.ops.render.render(write_still=True)
        if n % 24 == 0 or not arg('--all'): print('frame', n, f'{time.time() - t0:.1f}s', 'tip', [round(v, 1) for v in tips[n]], flush=True)
    if arg('--all'):
        json.dump({'variant': VARIANT, 'last_frame': last, 'thread_r_units': thread_r, 'tips': tips}, open(os.path.join(HERE, 'out', f'tip-{VARIANT}.json'), 'w'))
    else:
        json.dump({'tips': tips}, open(os.path.join(out_dir, 'tip.json'), 'w'))
    print('DONE', len(frames), 'frames in', f'{time.time() - t0:.1f}s', 'thread_r', round(thread_r, 4))

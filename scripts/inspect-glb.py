import json
import struct
import sys


def read_glb_json(path):
    with open(path, 'rb') as f:
        magic, version, length = struct.unpack('<4sII', f.read(12))
        if magic != b'glTF':
            raise ValueError(f'Not a GLB file: {path}')
        chunk_length, chunk_type = struct.unpack('<II', f.read(8))
        if chunk_type != 0x4E4F534A:  # 'JSON'
            raise ValueError('First chunk is not JSON')
        json_bytes = f.read(chunk_length)
        return json.loads(json_bytes), version, length


def bbox_from_accessors(gltf):
    mins = [float('inf')] * 3
    maxs = [float('-inf')] * 3
    for acc in gltf.get('accessors', []):
        if acc.get('type') == 'VEC3' and 'min' in acc and 'max' in acc:
            for i in range(3):
                mins[i] = min(mins[i], acc['min'][i])
                maxs[i] = max(maxs[i], acc['max'][i])
    return mins, maxs


def triangle_count(gltf):
    total = 0
    for mesh in gltf.get('meshes', []):
        for prim in mesh.get('primitives', []):
            if 'indices' in prim:
                acc = gltf['accessors'][prim['indices']]
                total += acc['count'] // 3
            else:
                pos_acc = gltf['accessors'][prim['attributes']['POSITION']]
                total += pos_acc['count'] // 3
    return total


def inspect(path):
    print(f'=== {path} ===')
    gltf, version, total_len = read_glb_json(path)
    print(f'glTF binary version: {version}, total file declared length: {total_len}')
    print(f'asset.generator: {gltf.get("asset", {}).get("generator")}')
    print(f'asset.version: {gltf.get("asset", {}).get("version")}')
    print(f'extensionsUsed: {gltf.get("extensionsUsed")}')
    print(f'extensionsRequired: {gltf.get("extensionsRequired")}')
    print(f'scenes: {len(gltf.get("scenes", []))}, nodes: {len(gltf.get("nodes", []))}')
    print(f'meshes: {len(gltf.get("meshes", []))}')
    print(f'materials: {len(gltf.get("materials", []))}')
    print(f'textures: {len(gltf.get("textures", []))}, images: {len(gltf.get("images", []))}')
    print(f'buffers: {len(gltf.get("buffers", []))}')
    for i, buf in enumerate(gltf.get('buffers', [])):
        uri = buf.get('uri', '(embedded/GLB binary chunk)')
        print(f'  buffer[{i}]: uri={uri!r}, byteLength={buf.get("byteLength")}')
    ext_images = [img for img in gltf.get('images', []) if 'uri' in img]
    print(f'images with external uri (potential missing-dependency risk): {len(ext_images)}')
    for img in ext_images[:10]:
        print(f'  external image uri: {img.get("uri")}')

    print(f'triangle count (approx, from accessors): {triangle_count(gltf):,}')
    mins, maxs = bbox_from_accessors(gltf)
    dims = [maxs[i] - mins[i] for i in range(3)]
    print(f'bounding box min: {mins}')
    print(f'bounding box max: {maxs}')
    print(f'bounding box dimensions (model units): {dims}')

    print('materials detail:')
    for i, mat in enumerate(gltf.get('materials', [])):
        pbr = mat.get('pbrMetallicRoughness', {})
        print(f'  [{i}] name={mat.get("name")!r} baseColorFactor={pbr.get("baseColorFactor")} '
              f'metallic={pbr.get("metallicFactor")} roughness={pbr.get("roughnessFactor")} '
              f'hasBaseColorTex={"baseColorTexture" in pbr} hasNormalTex={"normalTexture" in mat} '
              f'hasEmissive={"emissiveFactor" in mat} emissiveFactor={mat.get("emissiveFactor")} '
              f'alphaMode={mat.get("alphaMode")} extensions={list(mat.get("extensions", {}).keys())}')
    print()


if __name__ == '__main__':
    for path in sys.argv[1:]:
        inspect(path)

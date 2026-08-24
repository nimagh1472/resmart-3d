'use client';

import { useEffect, useState } from 'react';

/** Diagnostic-only — bypasses React Three Fiber/drei/Suspense entirely to
 * isolate whether the Ocean Heights load hang is a Three.js GLTFLoader
 * problem with the file itself, or a bug in this project's R3F integration. */
export default function RawLoaderTestPage() {
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const append = (msg: string) => setLog((prev) => [...prev, `${Date.now()}: ${msg}`]);
    append('starting');

    import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
      append('GLTFLoader module loaded');
      const loader = new GLTFLoader();
      const start = Date.now();
      const modelPath = new URLSearchParams(window.location.search).get('model') === 'burj'
        ? '/assets/3d-source/the_burj_khalifa.glb'
        : '/assets/3d-source/dubai_skyscraper.glb';
      append(`loading ${modelPath}`);
      loader.load(
        modelPath,
        (gltf) => {
          append(`SUCCESS after ${Date.now() - start}ms — scenes: ${gltf.scenes.length}, scene children: ${gltf.scene.children.length}`);
        },
        (progress) => {
          append(`progress: ${progress.loaded} / ${progress.total} bytes`);
        },
        (error) => {
          append(`ERROR after ${Date.now() - start}ms: ${String(error)}`);
        },
      );
    });
  }, []);

  const tail = log.slice(-10);
  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 12, color: '#0f0', background: '#000', minHeight: '100vh' }}>
      <div>total log lines: {log.length}</div>
      <div>--- last 10 ---</div>
      {tail.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

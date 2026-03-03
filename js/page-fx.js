(() => {
  'use strict';
  const getCss = (v, f) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || f;
  const hex = c => parseInt((c.startsWith('#') ? c.slice(1) : c), 16) || 0xffffff;

  const initFx = (id, type) => {
    if (!window.THREE || !document.getElementById(id)) return;
    const { tier, dpr: perfDpr } = window.__sitePerf || { tier: 'mid', dpr: 1 };
    const isLow = tier === 'low';
    const accent1 = hex(getCss('--accent', '#2B4C7E')), accent2 = hex(getCss('--accent2', '#2E6B4F')), accent3 = hex(getCss('--accent3', '#7C96B6'));

    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById(id), alpha: true, antialias: true, powerPreference: 'high-performance' });
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 120);
    camera.position.z = 14;

    const strong = type === 'projects' || type === 'contact';
    scene.add(new THREE.AmbientLight(0xffffff, strong ? 0.78 : 0.55));
    const key = new THREE.PointLight(0xffffff, strong ? 1.35 : 1.05, 60); key.position.set(6, 6, 10); scene.add(key);
    const fill = new THREE.PointLight(0xffffff, strong ? 0.85 : 0.65, 60); fill.position.set(-7, -4, 10); scene.add(fill);
    scene.fog = new THREE.FogExp2(0x000000, strong ? 0.015 : 0.022);

    const resize = () => { renderer.setPixelRatio(perfDpr); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); };
    window.addEventListener('resize', resize, { passive: true }); resize();

    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener('pointermove', e => { ptr.tx = (e.clientX/innerWidth)*2 - 1; ptr.ty = -(e.clientY/innerHeight)*2 + 1; }, { passive: true });

    const pCount = strong ? (isLow ? 900 : 1400) : (isLow ? 650 : 1000);
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(pCount*3), col = new Float32Array(pCount*3);
    const c1 = new THREE.Color(accent3), c2 = new THREE.Color(accent1);
    for(let i=0; i<pCount; i++){
      const r = 6.0*Math.pow(Math.random(), 0.55), a = Math.random()*Math.PI*2;
      pos[i*3]=Math.cos(a)*r; pos[i*3+1]=(Math.random()-0.5)*6.5; pos[i*3+2]=Math.sin(a)*r;
      const c = c1.clone().lerp(c2, Math.min(1, Math.max(0, r/6)));
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const particles = new THREE.Points(geo, new THREE.PointsMaterial({ size: type==='contact'?0.06:0.05, transparent: true, opacity: strong?0.72:0.48, vertexColors: true, depthWrite: false }));
    particles.position.z = -6; scene.add(particles);

    const cMat = new THREE.MeshStandardMaterial({ color: accent1, roughness: 0.52, metalness: 0.3, transparent: true, opacity: strong?0.56:0.38, emissive: new THREE.Color(accent2), emissiveIntensity: strong?0.34:0.18 });
    let core, ring;
    if(type === 'about'){
      core = new THREE.Mesh(new THREE.TorusKnotGeometry(2.15, 0.62, 160, 20), cMat); core.position.set(2.2, -0.2, -1.2);
      ring = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(2.15, 0.62, 90, 12)), new THREE.LineBasicMaterial({color:accent3, transparent:true, opacity:0.16}));
      ring.position.copy(core.position); scene.add(ring);
    } else {
      core = new THREE.Mesh(new THREE.IcosahedronGeometry(type==='contact'?2.3:2.35, type==='contact'?1:2), cMat); core.position.set(type==='contact'?-2.0:2.0, type==='contact'?0.4:0.2, -1.5);
      ring = new THREE.Mesh(new THREE.TorusGeometry(type==='contact'?4.1:4.4, type==='contact'?0.06:0.085, 12, 220), new THREE.MeshBasicMaterial({color:accent2, transparent:true, opacity:0.18}));
      ring.rotation.set(Math.PI*0.45, Math.PI*0.2, 0); ring.position.copy(core.position); scene.add(ring);
    }
    scene.add(core);

    let run = true;
    document.addEventListener('site:inactive', () => run = false, { passive: true });
    document.addEventListener('site:active', () => run = true, { passive: true });

    const loop = (t) => {
      requestAnimationFrame(loop); if(!run) return;
      ptr.x += (ptr.tx - ptr.x)*0.08; ptr.y += (ptr.ty - ptr.y)*0.08;
      camera.position.x += (ptr.x*1.5 - camera.position.x)*0.06; camera.position.y += (ptr.y*0.95 - camera.position.y)*0.06; camera.lookAt(0,0,0);
      key.position.set(6+ptr.x*6, 6+ptr.y*5, 10);
      particles.rotation.set(t*0.00004 + ptr.y*0.06, t*0.00006 + ptr.x*0.08, 0);
      core.rotation.set(t*0.00028 + ptr.y*0.22, t*0.00042 + ptr.x*0.35, 0);
      renderer.render(scene, camera);
    }; requestAnimationFrame(loop);
  };

  document.addEventListener('DOMContentLoaded', () => {
    ['about', 'projects', 'contact'].forEach(p => document.body.classList.contains(`${p}-page`) && initFx(`fx-${p}`, p));
  });
})();
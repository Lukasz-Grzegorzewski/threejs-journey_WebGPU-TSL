import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Inspector } from "three/addons/inspector/Inspector.js";
import { uv } from "three/tsl";

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.threejs");

// Scene
const scene = new THREE.Scene();

// Loaders
const textureLoader = new THREE.TextureLoader();

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  100,
);
camera.position.x = 2;
camera.position.y = 2.5;
camera.position.z = 4 * 1.25;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.75, 0);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
  canvas: canvas,
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x111111);
renderer.inspector = new Inspector();
await renderer.init();

/**
 * Floor
 */
{
  const texture = textureLoader.load("./floor-color.jpg");
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardNodeMaterial({ map: texture, transparent: true }),
  );
  mesh.material.opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.receiveShadow = true;
  mesh.renderOrder = -1;
  scene.add(mesh);
}

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight(0xffc799, 4);
directionalLight.castShadow = true;
directionalLight.position.set(4, 2, 1).normalize().multiplyScalar(10);
directionalLight.shadow.radius = 5;
directionalLight.shadow.normalBias = 0.1;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x859dff, 0.5);
scene.add(ambientLight);

// Debug
const lightsGui = renderer.inspector.createParameters("Lights").close();

lightsGui.addColor(directionalLight, "color").name("directionalColor");
lightsGui
  .add(directionalLight, "intensity", 0, 5, 0.01)
  .name("directionalIntensity");

lightsGui.addColor(ambientLight, "color").name("ambientColor");
lightsGui.add(ambientLight, "intensity", 0, 5, 0.01).name("ambientIntensity");

/**
 * Animate
 */
const tick = () => {
  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);
};

renderer.setAnimationLoop(tick);

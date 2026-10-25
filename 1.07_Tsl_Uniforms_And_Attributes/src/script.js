import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { Inspector } from "three/addons/inspector/Inspector.js";
import {
  attribute,
  bufferAttribute,
  color,
  float,
  positionWorld,
  texture,
  time,
  uniform,
  uniformArray,
  uv,
  vec2,
} from "three/tsl";

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.threejs");
texture;
// Scene
const scene = new THREE.Scene();

// Loaders
const textureLoader = new THREE.TextureLoader();

/**
 * Textures
 */
const uvChecker = textureLoader.load("./uvChecker.png");
uvChecker.colorSpace = THREE.SRGBColorSpace;

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
camera.position.x = 5;
camera.position.y = 4.5;
camera.position.z = 2.5;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1, 0);
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

/**
 * Floor
 */
{
  const geometry = new THREE.PlaneGeometry(10, 10, 10, 10);

  const count = geometry.attributes.position.count;
  const randomArray = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    randomArray[i] = Math.random();
  }
  const randomBuffer = new THREE.BufferAttribute(randomArray, 1);
  // geometry.setAttribute("random", randomBuffer);
  // const random = attribute("random");
  // instead of putting attribute into geometry we can use it directly
  const random = bufferAttribute(randomBuffer, "float");

  const material = new THREE.MeshStandardNodeMaterial({
    map: uvChecker,
    transparent: true,
  });

  material.colorNode = random;

  const fade = uv().sub(0.5).length().smoothstep(0.5, 0.2);
  material.opacityNode = fade;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

/**
 * Torus Knot
 */
{
  const geometry = new THREE.TorusKnotGeometry(0.5, 0.24, 128, 32);

  const material = new THREE.MeshStandardNodeMaterial();

  const frequencies = uniform(vec2(2, 0.25));
  const uColors = uniformArray([
    new THREE.Color(0x0b5d79),
    new THREE.Color(0x5ed6c2),
    new THREE.Color(0xfeedaa),
    new THREE.Color(0xfc8f74),
    new THREE.Color(0xcf2c65),
  ]);
  const pattern = positionWorld.y
    .mul(frequencies.x)
    .sub(time.mul(frequencies.y))
    .fract()
    .mul(uColors.array.length) // as many colors are in uColorsArray
    .floor() // we want 0,1,2,3,4 and not 1,2,3,4,5
    .toInt(); // it removes decimal part so '.floor()' is not really needed
  material.colorNode = uColors.element(pattern); // element gives Int so '.toInt' is not really needed

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = 1;
  scene.add(mesh);

  const gui = renderer.inspector.createParameters("Torus Knot");
  gui.add(frequencies.value, "x", 0, 10, 0.01).name("Position frequency");
  gui.add(frequencies.value, "y", 0, 10, 0.01).name("Time frequency");
  // gui.addColor(uColor, "value").name("Color");
}

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight(0xffffff, 4.5);
directionalLight.castShadow = true;
directionalLight.position.set(2, 0.75, -1).normalize().multiplyScalar(10);
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.bottom = -10;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 20;
directionalLight.shadow.radius = 3;
directionalLight.shadow.normalBias = 0.1;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x859dff, 1);
scene.add(ambientLight);

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

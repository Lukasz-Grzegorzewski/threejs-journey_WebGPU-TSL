import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Inspector } from "three/addons/inspector/Inspector.js";
import TSLGraphEditor from "three/addons/inspector/extensions/tsl-graph/TSLGraphEditor.js";
import { uv } from "three/tsl";
import * as THREE from "three/webgpu";

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
  // forceWebGL: true, // force the use of WebGL instead of WebGPU
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x111111);
renderer.inspector = new Inspector(); // shows inspector for inspections
renderer.inspector.addTab(new TSLGraphEditor()); // add tab to inspector that shows nodes

/**
 * Floor
 */
{
  const textureColor = textureLoader.load("./floor-color.jpg");
  textureColor.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.PlaneGeometry(10, 10, 10, 10);

  const material = new THREE.MeshStandardNodeMaterial({
    map: textureColor,
    transparent: true,
  });

  const fade = uv()
    .sub(0.5)
    .length()
    .smoothstep(0.5, 0.2)
    .toVar("fade") // in the vertexShader variable 'fade' will be created
    // .debug() // will console.log() the part where this part exists in the vertexShader/frangmentShader
    .toInspector("FloorFade");
  material.opacityNode = fade;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // const { vertexShader, fragmentShader } = await renderer.debug.getShaderAsync(
  //   scene,
  //   camera,
  //   mesh,
  // );
  // console.log(vertexShader);
}

/**
 * Torus Knot
 */
{
  const geometry = new THREE.TorusKnotGeometry(0.5, 0.24, 128, 32);

  const material = new THREE.MeshStandardNodeMaterial({ color: "#ff2929" });
  // material.userData.graphId = "torus-physical";

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = 1;
  scene.add(mesh);

  // Tweeks
  const gui = renderer.inspector.createParameters("Torus");

  gui.add(material, "roughness", 0, 1);
  gui.add(material, "metalness", 0, 1);
  gui.addColor(material, "color");
  gui.add(material, "wireframe");
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

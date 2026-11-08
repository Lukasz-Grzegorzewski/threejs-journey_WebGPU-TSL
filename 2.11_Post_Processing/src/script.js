import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Inspector } from "three/addons/inspector/Inspector.js";
import { SkyMesh } from "three/addons/objects/SkyMesh.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  color,
  convertToTexture,
  mrt,
  normalWorld,
  output,
  pass,
  positionWorld,
  renderOutput,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { chromaticAberration } from "three/addons/tsl/display/ChromaticAberrationNode.js";
import { pixelationPass } from "three/addons/tsl/display/PixelationPassNode.js";
import { sobel } from "three/addons/tsl/display/SobelOperatorNode.js";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";
import { shatter } from "./ShatterNode";

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.threejs");

// Scene
const scene = new THREE.Scene();

// Loaders
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

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
camera.position.y = 2.5;
camera.position.z = 2.5;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.25, 0);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
  canvas: canvas,
  antialias: false,
});
const toneMappingList = {
  None: THREE.NoToneMapping,
  Linear: THREE.LinearToneMapping,
  Reinhard: THREE.ReinhardToneMapping,
  Cineon: THREE.CineonToneMapping,
  ACESFilmic: THREE.ACESFilmicToneMapping,
  AgX: THREE.AgXToneMapping,
  Neutral: THREE.NeutralToneMapping,
};
const toneMapping = { value: "Cineon" };

renderer.toneMapping = toneMappingList[toneMapping.value];
renderer.toneMappingExposure = 1.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x111111);
renderer.inspector = new Inspector();

// Debug
const rendererGui = renderer.inspector.createParameters("Renderer");
rendererGui
  .add(toneMapping, "value", Object.keys(toneMappingList))
  .onChange((value) => (renderer.toneMapping = toneMappingList[value]));
rendererGui.add(renderer, "toneMappingExposure", 1, 10, 0.01);

/**
 * Post-processing
 */
const renderPipeline = new THREE.RenderPipeline(renderer);
renderPipeline.outputColorTransform = false;

// Debug
const postProcessingGui =
  renderer.inspector.createParameters("Post-processing");

// Scene pass
const scenePass = pass(scene, camera);
scenePass.setMRT(
  mrt({
    output: output,
    normal: normalWorld,
  }),
);
renderPipeline.outputNode = scenePass.getTextureNode("output");

// // Pixelation pass
// // Needs to go first because it changes resolution..etc.
// // It replaces first pass ["scenePass"] so we can comment out {// Scene Pass} sector
// // const pixelationPassOutput = pixelationPass(
// //   scene,
// //   camera,
// //   20, // pixel size
// //   2, // strength of edges according to the normal
// //   1, // strength of edges according to depth
// // );
// // renderPipeline.outputNode = pixelationPassOutput;

// // chromaticAberration pass(rgb colors shift) can be the first pass, it doesn't matter
// const chromaticAberrationPass = chromaticAberration(
//   renderPipeline.outputNode,
//   2, // how far the effect pushes the color
//   vec2(0.5), // from where (origin) further from the origin, the stronger effect
//   1, // first color will be move by distance, second color will be moved [value] times more, third again [value] times more
// );
// renderPipeline.outputNode = chromaticAberrationPass;

// // Sobel pass
// // const sobelPass = sobel(renderPipeline.outputNode);
// const sobelPass = sobel(scenePass.getTextureNode("normal")).remapClamp(
//   0.2,
//   1,
//   0,
//   1,
// );
// renderPipeline.outputNode = renderPipeline.outputNode.add(sobelPass);

// // Drunk
// const drunkTexture = convertToTexture(renderPipeline.outputNode);
// const waveUv = vec2(
//   uv().x,
//   uv().y.add(uv().x.add(time.mul(0.2)).mul(7).sin().mul(0.1)),
// );
// renderPipeline.outputNode = texture(drunkTexture, waveUv).mul(
//   color("aquamarine"),
// );

// Shatter pass
const subdivision = uniform(3);
const seed = uniform(18, "int");
const progress = uniform(0.5);
const thickness = uniform(0.02);
const _color = uniform(color(0xff824d));
const colorStrenth = uniform(3);
const offsetStrenth = uniform(0.05);
const shatterPass = shatter(
  renderPipeline.outputNode,
  // subdivision,
  // seed,
  // progress,
  // thickness,
  // _color,
  // colorStrenth,
  // offsetStrenth,
);
renderPipeline.outputNode = shatterPass;

const shatterGui = postProcessingGui.addFolder("Shatter");
shatterGui.add(subdivision, "value", 1, 10, 1).name("Subdivision");
shatterGui.add(seed, "value", 0, 100, 1).name("Seed");
shatterGui.add(progress, "value", 0, 1, 0.01).name("Progress");
shatterGui.add(thickness, "value", 0, 0.05, 0.0001).name("Thickness");
shatterGui.addColor(_color, "value").name("Color");
shatterGui.add(colorStrenth, "value", 1, 10, 0.01).name("ColorStrength");
shatterGui.add(offsetStrenth, "value", 0, 0.2, 0.001).name("OffsetStrength");

// Bloom pass
const bloomPass = bloom(renderPipeline.outputNode);
bloomPass.threshold.value = 0.25;
bloomPass.strength.value = 1;
renderPipeline.outputNode = renderPipeline.outputNode.add(bloomPass);

const bloomGui = postProcessingGui.addFolder("bloom");
bloomGui.add(bloomPass.threshold, "value", 0, 2, 0.01).name("Bloom");
bloomGui.add(bloomPass.strength, "value", 0, 2, 0.01).name("Strength");

// Color transform pass
renderPipeline.outputNode = renderOutput(renderPipeline.outputNode);

// FXAA pass
const fxaaPass = fxaa(renderPipeline.outputNode);
renderPipeline.outputNode = fxaaPass;

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
  mesh.material.mrtNode = mrt({
    output: output,
    normal: vec4(1), // white color so tghe edges(for sobel) are not detected for a floor
  });
  mesh.material.opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);
  // mesh.material.colorNode = vec3(uv().x.mul(10).fract().step(0.5));
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

/**
 * Model
 */
const model = await gltfLoader.loadAsync("./anvil.glb");
model.scene.traverse((child) => {
  if (child.isMesh) {
    child.material.side = THREE.FrontSide;
    child.material.shadowSide = THREE.FrontSide;
    child.castShadow = true;
    child.receiveShadow = true;
  }
});
model.scene.position.y = 0.001;
scene.add(model.scene);

/**
 * Sky
 */
const sky = new SkyMesh();
sky.material.mrtNode = mrt({
  output: output,
  normal: vec4(1),
}); // white color so tghe edges(for sobel) are not detected for a sky
sky.scale.setScalar(1000);
scene.add(sky);
const effectController = {
  turbidity: 5.5,
  rayleigh: 1.25,
  mieCoefficient: 0.02,
  mieDirectionalG: 0.35,
  elevation: 0.4,
  azimuth: 100,
  cloudCoverage: 0.4,
  cloudDensity: 0.4,
  cloudElevation: 0.5,
};

const sun = new THREE.Vector3();

const skyChanged = () => {
  sky.turbidity.value = effectController.turbidity;
  sky.rayleigh.value = effectController.rayleigh;
  sky.mieCoefficient.value = effectController.mieCoefficient;
  sky.mieDirectionalG.value = effectController.mieDirectionalG;
  sky.cloudCoverage.value = effectController.cloudCoverage;
  sky.cloudDensity.value = effectController.cloudDensity;
  sky.cloudElevation.value = effectController.cloudElevation;

  const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
  const theta = THREE.MathUtils.degToRad(effectController.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);

  sky.sunPosition.value.copy(sun);
};

skyChanged();

// Debug
const skyGui = renderer.inspector.createParameters("Sky").close();

skyGui.add(effectController, "turbidity", 0.0, 20.0, 0.1).onChange(skyChanged);
skyGui.add(effectController, "rayleigh", 0.0, 4, 0.001).onChange(skyChanged);
skyGui
  .add(effectController, "mieCoefficient", 0.0, 0.1, 0.001)
  .onChange(skyChanged);
skyGui
  .add(effectController, "mieDirectionalG", 0.0, 1, 0.001)
  .onChange(skyChanged);
skyGui.add(effectController, "elevation", -10, 90, 0.1).onChange(skyChanged);
skyGui.add(effectController, "azimuth", -180, 180, 0.1).onChange(skyChanged);

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.castShadow = true;
directionalLight.position.set(2, 1, -0.75).normalize().multiplyScalar(10);
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 30;
directionalLight.shadow.radius = 5;
directionalLight.shadow.normalBias = 0.1;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x859dff, 0.75);
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
  // renderer.render(scene, camera);
  renderPipeline.render();
};

renderer.setAnimationLoop(tick);

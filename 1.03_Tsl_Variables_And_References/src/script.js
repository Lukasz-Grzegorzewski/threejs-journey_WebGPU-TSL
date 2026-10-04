import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { attribute, checker, materialColor, uv, vec3, vec4 } from "three/tsl";
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
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x111111);

/**
 * Floor
 */
{
  const textureColor = textureLoader.load("./floor-color.jpg");
  textureColor.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.PlaneGeometry(10, 10, 10, 10);

  const material = new THREE.MeshStandardNodeMaterial({ map: textureColor });

  /**
   * materialColor - it is a original material.
   * pattern - Checker is changing texture in the chest board
   * materialColor multiplied by pattarn. so black(0) stays black and white(1) becomes original material(texture)
   */
  //
  const pattern = vec3(checker(uv().mul(4)));
  material.colorNode = materialColor.mul(pattern);

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

  /**
   * Position References
   */
  // positionLocal - follows updated position (with before displacement applied)
  // positionWorld  - follows original position
  // positionGeometry - follows updated position (without before displacement applied)
  // uv() -
  // normalLocal - follows updated normals
  // modelNormalMatrix - follows original normals
  // normalWorld - follows original normals
  // normalView - follows the camera view
  // screenUV - vec2 follows the screen(canvas) coordinates
  // screenCoodrinate - vec2 coodrinates of screen(need to be devided by large number because coordinates are pixels going from 0 to as many pixels are on the screen and UV needs from 0 -> 1)
  // viewportUV - vec2 it works as on screenUV but on the viewport set by renderer
  // viewportCoordinate - vec2 it works as on screenCoodrinate but on the viewport set by renderer
  // modelPosition - vec3(position of an object)
  // modelDirection - vec3(position of rotation of an object)
  // modelScale - vec3(scale of an object)

  /**
   * Uniforms
   */
  // userData - data stored in the object userData (uniform) and inside a custom property. ex: mesh.userData.toto = ... It can be dynamicly changed(in setTimeout for example : mesh.userData.toto.set("orange"))

  /**
   * Atributes
   */
  // attribue - attribute("uv"), attribute("position"), attribute("customAttribute")

  material.outputNode = vec4(attribute("uv"), 1, 1);

  /**
   * colorNode
   */
  // const foo = color("crimson");
  // material.colorNode = foo;

  // const foo = vec2(0.5, 1);
  // material.colorNode = foo.yyy;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.toto = new THREE.Color("#705DF2"); // userData that is a place to store custom data
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = 1;
  scene.add(mesh);

  setTimeout(() => {
    mesh.userData.toto.set("orange");
  }, 2000);

  // TransformControl
  const transformControls = new TransformControls(camera, canvas);
  transformControls.attach(mesh);
  scene.add(transformControls.getHelper());

  transformControls.addEventListener("dragging-changed", (event) => {
    controls.enabled = !event.value;
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "g") transformControls.setMode("translate");
    else if (event.key === "r") transformControls.setMode("rotate");
    else if (event.key === "s") transformControls.setMode("scale");
  });
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

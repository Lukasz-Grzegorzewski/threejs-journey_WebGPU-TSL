import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { Inspector } from "three/addons/inspector/Inspector.js";
import {
  uv,
  texture,
  rotateUV,
  vec2,
  vec4,
  triplanarTexture,
  float,
  positionLocal,
  normalLocal,
  mix,
  materialColor,
  oscSine,
  time,
  blendDodge,
  blendBurn,
  blendColor,
  saturation,
  grayscale,
  luminance,
  vibrance,
  hue,
} from "three/tsl";

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
 * Textures
 */
const uvChecker = textureLoader.load("./uvChecker.png");
uvChecker.colorSpace = THREE.SRGBColorSpace;
uvChecker.wrapS = THREE.MirroredRepeatWrapping;
uvChecker.wrapT = THREE.MirroredRepeatWrapping;
uvChecker.repeat.set(3, 3);
uvChecker.rotation = 1;

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

  const material = new THREE.MeshStandardNodeMaterial({
    // map: uvChecker,
    color: "crimson",
    transparent: true,
  });

  // material.colorNode = texture(
  //   uvChecker,
  //   rotateUV(
  //     uv() // just uv() it will switch off uvChecker.rotation = 1; uvChecker.repeat.set(3, 3);
  //       .mul(3), // it works as <uvChecker.repeat.set(3, 3)>
  //     -1,
  //     vec2(0), // center of rotation
  //   ),
  //   // 2, // mipmap level
  // );

  const oscilation = oscSine(
    // oscSine: -1 <-> 1 =====> 0 <-> 1
    time.mul(0.5), // make oscilation slower
  );
  // material.colorNode = mix(texture(uvChecker).rgb, materialColor, oscilation); // mix color based on third value
  // material.colorNode = blendDodge(texture(uvChecker).rgb, materialColor); //
  // material.colorNode = blendBurn(texture(uvChecker).rgb, materialColor); //
  // material.colorNode = blendColor(vec4(texture(uvChecker).rgb), vec4(materialColor, 0.5) ); //
  // material.colorNode = saturation(texture(uvChecker).rgb, oscilation.mul(2)); // 1 - unmodified, 0 - desaturated, > 1 -> saturate
  // material.colorNode = grayscale(texture(uvChecker).rgb); //
  // material.colorNode = luminance(texture(uvChecker).rgb); //
  // material.colorNode = vibrance(texture(uvChecker).rgb, oscilation); //
  material.colorNode = hue(texture(uvChecker).rgb, time); // turn color on the hue wheel

  const fade = uv().sub(0.5).length().smoothstep(0.5, 0.2);
  material.opacityNode = fade;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const gui = renderer.inspector.createParameters("Floor");
  gui.addColor(material, "color");
}

/**
 * Torus Knot
 */
{
  const geometry = new THREE.TorusKnotGeometry(0.5, 0.24, 128, 32);

  const material = new THREE.MeshStandardNodeMaterial();

  material.colorNode = triplanarTexture(
    texture(
      uvChecker, //
      null, //
      null, //
      float(1), //
      positionLocal, //
      normalLocal, //
    ),
  );

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = 1;
  scene.add(mesh);

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

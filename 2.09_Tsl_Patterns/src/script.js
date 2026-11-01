import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Inspector } from "three/addons/inspector/Inspector.js";
import {
  add,
  atan,
  checker,
  color,
  cos,
  Fn,
  hash,
  mix,
  mul,
  mx_noise_float,
  mx_worley_noise_float,
  parallaxUV,
  PI,
  rand,
  time,
  TWO_PI,
  uv,
  vec2,
  vec3,
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
camera.position.set(1.25, 2, 4);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0, 0);
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
  const textureColor = textureLoader.load("./floor-color.jpg");
  textureColor.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.PlaneGeometry(10, 10);

  const material = new THREE.MeshBasicNodeMaterial({
    map: textureColor,
    transparent: true,
  });
  material.opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

/**
 * Patterns
 */
// Geometry
// const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
const geometry = new THREE.CircleGeometry(2, 32);

// Material
const material = new THREE.MeshBasicNodeMaterial();

/* Pattern 1 */
material.colorNode = vec3(uv(), 1);

/* Pattern 2 */
material.colorNode = vec3(uv().x, uv().x, uv().x);

/* Pattern 3 */
material.colorNode = vec3(uv().x.mul(10).fract()); // fract() - or - mod(1)

/* Pattern 4 */
// material.colorNode = vec3(
//   add(
//     uv().x.mul(10).fract().step(0.5), // x axis
//     uv().y.mul(10).fract().step(0.5), // y axis
//   )
//     .sub(1)
//     .abs(),
// );
material.colorNode = vec3(checker(uv().mul(10))).oneMinus();

/* Pattern 5 */
// material.colorNode = vec3(uv().distance(vec2(0.5)));
material.colorNode = vec3(uv().sub(0.5).length()); // length = distance from the origin

/* Pattern 6 */
const polarUv = uv().sub(0.5);
const angle = atan(polarUv.x, polarUv.y); // direction from origin. Fragment is pointing to a uv coords from origin(0.5,0.5) and gives value from -PI -> PI
// material.colorNode = vec3(angle.add(PI).div(TWO_PI));
material.colorNode = vec3(
  angle.remap(
    PI.negate(), // initial low
    PI, // initial high
    0, // low output
    1, // high output
  ),
);

/* Pattern 7 */
const subdivision = 10;
const gridUv = uv().mul(subdivision).floor();
// const random = hash(gridUv.x.mul(subdivision).add(gridUv.y));
const random = rand(gridUv);
material.colorNode = vec3(random);

/* Pattern 8 */

const perlinUv = uv().mul(5);
const perlinNoise = mx_noise_float(perlinUv);
material.colorNode = vec3(
  perlinNoise
    .mul(5) //  more noise(more frequent)
    .add(
      //  animation based on time
      time.mul(0.5), // slow down by multiply by .5
    )
    .fract() // when > 1 it takes only decimal part so [0 -> 1)
    .step(0.8), //  0 when <= 0.8   <=>   1 when  > 0.8
);

/* Pattern 9 */
// cosine based palette, 4 vec3 params
export const palette = /*@__PURE__*/ Fn(
  ([t, a, b, c, d]) => {
    return a.add(b.mul(cos(mul(6.283185, c.mul(t).add(d)))));
  },
  { t: "float", a: "vec3", b: "vec3", c: "vec3", d: "vec3", return: "vec3" },
);
const worleyUv = uv().mul(10);
const worleyNoise = mx_worley_noise_float(vec3(worleyUv, time));
// material.colorNode = vec3(worleyNoise);
material.colorNode = palette(
  worleyNoise,
  vec3(0.5, 0.3, 0.4),
  vec3(0.9, 0.5, 0.4),
  vec3(1.0, 1.0, 1.0),
  vec3(0.0, 0.1, 0.2),
);

/* Pattern 10 */
const depthUv = parallaxUV(uv(), 0.5).xy;
const causticsInput = vec3(depthUv.mul(6), time.mul(0.3));
const causticsNoise = mx_worley_noise_float(causticsInput).pow(3);
const depthColor = mix(color(0x1b3956), color(0x11eeff), causticsNoise);

const foamInput = uv().mul(5);
const foamNoise = mx_noise_float(vec3(foamInput, time.mul(0.1)));
const foamMask = foamNoise.abs().step(0.05).oneMinus();
const foamColor = color(0xe5f7ff);

const liliPadInput = vec3(uv().mul(4), 0);
const liliPadNoise = mx_worley_noise_float(liliPadInput);
const liliPadMask = liliPadNoise.step(0.2).oneMinus();
const liliPadColor = mix(
  color(0xd7e689),
  color(0x329a89),
  liliPadNoise.div(0.2), // dividing so the lili pads gradient towards outside is happening faster
);

let final = mix(depthColor, foamColor, foamMask);
final = mix(final, liliPadColor, liliPadMask);
material.colorNode = final;

// Mesh
const mesh = new THREE.Mesh(geometry, material);
// mesh.position.y = 1;

mesh.rotation.x = -Math.PI * 0.5;
mesh.position.y = 0.01;
scene.add(mesh);

/**
 * Animate
 */
const timer = new THREE.Timer();

const tick = () => {
  timer.update();

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);
};

renderer.setAnimationLoop(tick);

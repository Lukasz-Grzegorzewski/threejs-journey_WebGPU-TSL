import * as THREE from "three/webgpu";
import gsap from "gsap";
import {
  add,
  color,
  dot,
  float,
  Fn,
  Loop,
  max,
  mix,
  mul,
  normalView,
  objectPosition,
  oneMinus,
  positionLocal,
  positionViewDirection,
  positionWorld,
  texture,
  time,
  TWO_PI,
  uniform,
  uniformArray,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";

export default class Shield {
  constructor(
    _texture,
    radius = 2,
    colorA = color(0x1a5bff),
    colorB = color(0xff2e43),
    strength = 7,
  ) {
    this.texture = _texture;
    this.radius = uniform(radius);
    this.colorA = uniform(colorA);
    this.colorB = uniform(colorB);
    this.strength = uniform(strength);

    this.setGeometry();
    this.setImpacts();
    this.setMaterial();
    this.setMesh();
    this.setJunctionNode();
  }

  setImpacts() {
    this.impacts = {};
    this.impacts.count = 5;
    this.impacts.index = 0;

    // Uniform array
    const data = [];

    for (let i = 0; i < this.impacts.count; i++)
      data.push(new THREE.Vector4(0, 0, 0, 0));

    this.impacts.uniforms = uniformArray(data, "vec4");

    // Add impact
    this.impacts.add = (position, radius = 1) => {
      const impact = data[this.impacts.index];

      // Position
      const localPosition = this.mesh.worldToLocal(position); // worldToLocal so after the translation of the sphere the position of an impact stays relative to Sphere and not modified Sphere in the world
      impact.x = localPosition.x;
      impact.y = localPosition.y;
      impact.z = localPosition.z;

      // Radius
      gsap.to(impact, {
        w: radius,
        duration: 0.1,
        ease: "power2.out",
        onComplete: () => {
          gsap.to(impact, {
            w: 0,
            duration: 1,
            ease: "power2.in",
          });
        },
      });

      // Update index
      this.impacts.index++;

      if (this.impacts.index >= this.impacts.count) this.impacts.index = 0;
    };
  }

  setGeometry() {
    this.geometry = new THREE.SphereGeometry(1, 32, 32);
  }
  setMaterial() {
    this.material = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending, // it adds colors on the top of eachother
      color: 0x000000, // AdditiveBlending consider Black color as transparent
      side: THREE.DoubleSide, // To see other side ot a Sphere (exagons)
    });

    this.material.emissiveNode = Fn(() => {
      // Impacts
      const finalImpact = float(0);

      Loop(this.impacts.count, ({ i }) => {
        const impactData = this.impacts.uniforms.element(i);
        const impactDistance = impactData.xyz.distance(positionLocal);

        const impact = impactDistance
          .div(impactData.w) // we devide by radius given as 4th parameter. for impactDistance = 0.5 && radius = 0.5 => 0.5 / 0.5 = 1
          .oneMinus() // we want 0 -> 1 and going down so 1 - 1 = 0 ---- 0.5 is the edge of a impact. for impactDistance < 0.5 (ex. 0.25)  => 0.25 / 0.5 = 0.5 <-----> 1 - 0.5 = 0.5 so it will be visible
          .max(0); // we don't want the values to be smaller than 0
        finalImpact.assign(max(finalImpact, impact)); // if the impact < 0 so it will use 0. If impact > 0 it will take the a value because originaly final impact is 0
      });

      // [0.4, 1] => [1, 0] ------ [0, 0.4] (range outside of the one defined) => values > 1 (the line goes withouth claping so it goes more than 1)
      // Values extrapolated ( the one beyond 1) will be brighter
      finalImpact.assign(finalImpact.remap(0.4, 0, 1, 0)); // values > 0.4 => 1 ------ values < 0.4 => [1, 0]

      // Fresnel
      const fresnel = dot(positionViewDirection, normalView).abs().oneMinus();

      // Hexagons
      const hexagonsColor = texture(this.texture, uv().mul(vec2(6, 4)));

      const hexagonsStep = time
        .add(hexagonsColor.g.mul(TWO_PI)) // Convert the texture green channel [0 → 1] into an angle offset [0 → 2π]
        .sin() // pulsaiting based on sinus function
        .remap(-1, 1, 0, 1); // [-1 -> 1] => [0 -> 1]
      const hexagonsStepWithImpact = max(hexagonsStep, finalImpact); // fresnel will not affect the finalImpact(click effect on the Sphere)

      const hexagonsMask = oneMinus(
        hexagonsColor.r.step(hexagonsStepWithImpact),
      );

      const hexagonsPolarMask = uv()
        .y // bottom of the Sphere = 0; top = 1.
        .sub(0.5) // -0.5 <-> 0.5
        .abs() // 0.5 <-> 0 <-> 0.5
        .remapClamp(0.2, 0.35, 0, 1) // [0, 0.2] = 0  |  [0.2, 0.35] = [0, 1]  |  [0.35, 0.5] = 1
        .oneMinus();

      const hexagonsFresnelMask = fresnel.pow(2); // pow increases the result
      const hexagonsFresnelMaskWithImpact = max(
        hexagonsFresnelMask,
        finalImpact,
      ); // fresnel will not affect the finalImpact(click effect on the Sphere)

      const hexagonsFill = hexagonsColor.r;
      const hexagonsFillWithImpact = max(hexagonsFill, finalImpact); // fresnel will not affect the finalImpact(click effect on the Sphere)

      const hexagons = mul(
        hexagonsMask,
        hexagonsColor.b, // Using blue channel(alpha) to remove artifacts from between exagons
        hexagonsPolarMask, // Remove top and bottom part of the Sphere
        hexagonsFresnelMaskWithImpact, // remove the part of the Sphere where camera is frontal
        hexagonsFillWithImpact, // Create gradiens inside the hexagons based on the red channel of the texture(black/white gradient masl)
      );

      // Lines
      const linesStrength = positionWorld.y
        .mul(3)
        .sub(time)
        .sin()
        .remap(-1, 1, 0, 1)
        .mul(0.05);
      const lines = positionWorld.y
        .mul(20)
        .add(time)
        .fract()
        .pow(3)
        .mul(linesStrength);

      // Emissive
      const emissiveStrength = add(
        hexagons,
        fresnel.pow(5), // adds fresnel to hexagons to make effect on the edges stronger
        lines,
      ).mul(this.strength);

      const emissive = mix(this.colorA, this.colorB, emissiveStrength) // mix between the colors based on the pattern (there will be always some color and never transparent(black))
        .mul(emissiveStrength); // where pattern is 0 the color will be 0 so transparrent

      return vec3(emissive);
    })();

    this.material.positionNode = positionLocal.mul(this.radius);
  }
  setMesh() {
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  setJunctionNode() {
    const center = objectPosition(this.mesh); // objectPosition gives worldPosition. this.mesh.position will give the position relqtive to group for example Shield belongs to a ship, so when the ship moves the position relative to mesh doesnt move but in the world it moves

    // the line when shield crosses other mqteriql (floor or model)
    this.junctionNode = Fn(() => {
      const sdf = positionWorld.distance(center).sub(this.radius);

      const mask = sdf.step(0).oneMinus();

      const strength = sdf
        .remapClamp(0, -0.2, 1, 0)
        .mul(mask)
        .pow(3)
        .mul(this.strength);

      const _color = mix(this.colorA, this.colorB, strength).mul(strength);
      return _color;
    })();
  }
}

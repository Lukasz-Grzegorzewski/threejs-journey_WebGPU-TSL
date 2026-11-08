import * as THREE from "three/webgpu";
import {
  convertToTexture,
  float,
  int,
  max,
  mix,
  mx_noise_float,
  nodeObject,
  sqrt,
  texture,
  TWO_PI,
  uv,
  vec2,
  vec3,
  vec4,
  viewportCoordinate,
  viewportSize,
  viewportUV,
  color,
} from "three/tsl";
import { voronoi } from "./voronoi";

export class ShatterNode extends THREE.Node {
  static get type() {
    return "ShatterNode";
  }

  constructor(
    textureNode,
    subdivision,
    seed,
    progress,
    thickness,
    _color,
    colorStrength,
    offsetStrenth,
  ) {
    super("vec4");
    this.textureNode = textureNode;
    this.subdivision = subdivision;
    this.seed = seed;
    this.progress = progress;
    this.thickness = thickness;
    this._color = _color;
    this.colorStrength = colorStrength;
    this.offsetStrenth = offsetStrenth;
  }

  setup() {
    // Voronoi
    const viewportMaxSize = max(viewportSize.x, viewportSize.y);
    const voronoiUv = viewportCoordinate.div(viewportMaxSize);
    const voronoiColor = voronoi(voronoiUv, this.subdivision, this.seed);

    // Cracks
    const cracksNoise = mx_noise_float(voronoiUv.mul(5)).remap(-1, 1, 0, 0.5);
    const cracks = voronoiColor.g.step(
      this.progress.sub(cracksNoise).mul(this.thickness),
    );
    const cracksColor = this._color.mul(this.colorStrength);

    // Offset UV
    const goldenRatio = sqrt(5).add(1).div(2);
    const goldenAngle = goldenRatio.mul(TWO_PI);
    const angle = voronoiColor.a.mul(goldenAngle);
    const offset = vec2(angle.cos(), angle.sin()).mul(this.progress);
    const offsetUv = viewportUV.add(offset.mul(this.offsetStrenth));

    return mix(cracksColor, texture(this.textureNode, offsetUv), cracks);
  }
}

export const shatter = (
  textureNode,
  subdivision = float(4),
  seed = int(0),
  progress = float(1),
  thickness = float(0.02),
  _color = color(0xff824d),
  colorStrength = float(3),
  offsetStrenth = float(0.02),
) =>
  new ShatterNode(
    convertToTexture(textureNode),
    nodeObject(subdivision),
    nodeObject(seed),
    nodeObject(progress),
    nodeObject(thickness),
    nodeObject(_color),
    nodeObject(colorStrength),
    nodeObject(offsetStrenth),
  );

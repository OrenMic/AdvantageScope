// Copyright (c) 2021-2026 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { Shape2d } from "../../../geometry";
import { Field3dRendererCommand_ZoneObj } from "../../Field3dRenderer";
import ObjectManager from "../ObjectManager";

type ZoneVisual = {
  group: THREE.Group;
  outline: Line2;
  fill: THREE.Mesh;
};

const ELLIPSE_SEGMENTS = 48;
const CARPET_Z = 0.02;

export default class ZoneManager extends ObjectManager<Field3dRendererCommand_ZoneObj> {
  private visuals: ZoneVisual[] = [];

  dispose(): void {
    this.visuals.forEach((visual) => this.disposeVisual(visual));
    this.visuals = [];
  }

  setResolution(resolution: THREE.Vector2) {
    super.setResolution(resolution);
    this.visuals.forEach((visual) => {
      visual.outline.material.resolution = resolution;
    });
  }

  setObjectData(object: Field3dRendererCommand_ZoneObj): void {
    while (this.visuals.length > object.shapes.length) {
      this.disposeVisual(this.visuals.pop()!);
    }
    while (this.visuals.length < object.shapes.length) {
      this.visuals.push(this.createVisual());
    }

    const drawFill = object.style === "fill" || object.style === "both";
    const drawOutline = object.style === "outline" || object.style === "both";
    const color = new THREE.Color(object.color);
    const lineWidth = object.size === "bold" ? 6 : 2;

    object.shapes.forEach((shape, index) => {
      const visual = this.visuals[index];
      visual.group.position.set(shape.center.translation[0], shape.center.translation[1], CARPET_Z);
      visual.group.rotation.z = shape.center.rotation;

      const positions = this.getLocalOutlinePositions(shape);
      visual.outline.geometry.dispose();
      visual.outline.geometry = new LineGeometry();
      visual.outline.geometry.setPositions(positions);
      visual.outline.material.color = color;
      visual.outline.material.linewidth = lineWidth;
      visual.outline.material.resolution = this.resolution;
      visual.outline.visible = drawOutline;

      visual.fill.geometry.dispose();
      visual.fill.geometry = new THREE.ShapeGeometry(this.getShape(shape));
      (visual.fill.material as THREE.MeshBasicMaterial).color = color;
      visual.fill.visible = drawFill;
    });
  }

  private createVisual(): ZoneVisual {
    const group = new THREE.Group();
    this.root.add(group);

    const outline = new Line2(
      new LineGeometry(),
      new LineMaterial({ color: 0xff8c00, linewidth: 2, resolution: this.resolution })
    );
    group.add(outline);

    const fill = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        color: 0xff8c00,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    group.add(fill);

    return { group, outline, fill };
  }

  private disposeVisual(visual: ZoneVisual): void {
    this.root.remove(visual.group);
    visual.outline.geometry.dispose();
    visual.outline.material.dispose();
    visual.fill.geometry.dispose();
    (visual.fill.material as THREE.Material).dispose();
  }

  private getShape(shape: Shape2d): THREE.Shape {
    const threeShape = new THREE.Shape();
    if (shape.shape === "rectangle") {
      threeShape.moveTo(shape.xRadius, shape.yRadius);
      threeShape.lineTo(shape.xRadius, -shape.yRadius);
      threeShape.lineTo(-shape.xRadius, -shape.yRadius);
      threeShape.lineTo(-shape.xRadius, shape.yRadius);
      threeShape.closePath();
    } else {
      threeShape.absellipse(0, 0, shape.xRadius, shape.yRadius, 0, Math.PI * 2, false, 0);
    }
    return threeShape;
  }

  private getLocalOutlinePositions(shape: Shape2d): number[] {
    const points: number[] = [];
    if (shape.shape === "rectangle") {
      const corners: [number, number][] = [
        [shape.xRadius, shape.yRadius],
        [shape.xRadius, -shape.yRadius],
        [-shape.xRadius, -shape.yRadius],
        [-shape.xRadius, shape.yRadius],
        [shape.xRadius, shape.yRadius]
      ];
      corners.forEach(([x, y]) => {
        points.push(x, y, 0);
      });
    } else {
      for (let i = 0; i <= ELLIPSE_SEGMENTS; i++) {
        const angle = (i / ELLIPSE_SEGMENTS) * Math.PI * 2;
        points.push(Math.cos(angle) * shape.xRadius, Math.sin(angle) * shape.yRadius, 0);
      }
    }
    return points;
  }
}

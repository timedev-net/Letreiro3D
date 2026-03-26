declare module 'clipper-lib' {
  interface ClipperPoint {
    X: number
    Y: number
  }

  type Path = ClipperPoint[]
  type Paths = Path[]

  interface ClipperOffsetInstance {
    AddPath(path: Path, joinType: number, endType: number): void
    Execute(solution: Paths, delta: number): void
  }

  interface ClipperLibStatic {
    ClipperOffset: new (miterLimit?: number, arcTolerance?: number) => ClipperOffsetInstance
    Paths: new () => Paths
    JoinType: {
      jtRound: number
    }
    EndType: {
      etClosedPolygon: number
    }
  }

  const ClipperLib: ClipperLibStatic
  export default ClipperLib
}

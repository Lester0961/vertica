"use client";

/* eslint-disable react-hooks/immutability -- Three.js camera and scene objects use imperative APIs. */
import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { InteriorUnitInput } from "../UnitInterior3D";
import { buildInteriorScene } from "./interiorRenderer";
import { getFloorPlan, hasBalconyFeature, type FloorPlan } from "@/features/units/floorPlans";
import { unit204Plan, unit204Stops } from "@/features/units/unit204ReferencePlan";
import { SceneBoundary } from "./SceneBoundary";

type Stop = { name: string; position: readonly [number,number,number]; target: readonly [number,number,number] };
function RoomScene({plan,walk,stop,reset,balcony,furnishing}:{plan:FloorPlan;walk:boolean;stop:Stop;reset:number;balcony:boolean;furnishing:string}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const {camera,invalidate,size} = useThree();
  const scene = useMemo(() => buildInteriorScene(plan,{furnishing,balcony,cutaway:plan !== unit204Plan && !walk,hideExterior:true}),[balcony,furnishing,plan,walk]);
  useEffect(() => {
    scene.setCeilingVisible(walk);
    invalidate();
    return () => {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.group.traverse(object => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material));
        }
      });
      geometries.forEach(geometry=>geometry.dispose());
      materials.forEach(material=>material.dispose());
    };
  },[scene,invalidate,walk]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = walk ? 72 : 42;
      camera.updateProjectionMatrix();
    }
    if (walk) {
      camera.position.set(stop.position[0],stop.position[1],stop.position[2]);
      const direction = new THREE.Vector3(stop.target[0],stop.target[1],stop.target[2]).sub(camera.position).normalize();
      orbit.target.copy(camera.position).addScaledVector(direction,0.01);
    } else {
      const fit = Math.max(1, 1.25/(size.width/size.height));
      if (plan === unit204Plan) {
        camera.position.set(plan.overallW*.3*fit,plan.overallW*1.65*fit,plan.overallD*.9*fit);
        orbit.target.set(0,.65,0);
      } else {
        camera.position.set(plan.overallW*.75*fit,plan.overallW*1.05*fit,plan.overallD*1.35*fit);
        orbit.target.set(0,0,0);
      }
    }
    orbit.update();
    invalidate();
  },[walk,stop,reset,camera,invalidate,plan,size.width,size.height]);
  return <>
    <color attach="background" args={["#edf0eb"]}/>
    <ambientLight intensity={0.65}/>
    <hemisphereLight args={["#fff7e8","#b7bcb4",1.1]}/>
    <directionalLight position={[0,8,4]} intensity={1.6}/>
    {walk && <pointLight position={[stop.position[0],2.3,stop.position[2]]} intensity={5} distance={10}/>}
    <primitive object={scene.group}/>
    <OrbitControls ref={controls} makeDefault enableDamping={false} enablePan={false} enableZoom={!walk}
      rotateSpeed={walk ? -0.45 : 0.7} minDistance={walk?0.01:5} maxDistance={walk?0.01:40}
      minPolarAngle={walk?0.3:0.15} maxPolarAngle={walk?Math.PI-0.3:Math.PI/2.3}/>
  </>;
}

export default function ResidenceViewer({unit}:{unit:InteriorUnitInput}) {
  const [walk,setWalk] = useState(false);
  const [stopIndex,setStopIndex] = useState(0);
  const [reset,setReset] = useState(0);
  const [expanded,setExpanded] = useState(false);
  const showcase = unit.publicLabel === "Unit 204";
  const plan = useMemo(()=>showcase?unit204Plan:getFloorPlan(unit.unitTypeCode,unit.bedrooms),[showcase,unit.unitTypeCode,unit.bedrooms]);
  const furnishing = showcase ? "FURNISHED" : unit.furnishing ?? "SEMI_FURNISHED";
  const balcony = !showcase && hasBalconyFeature(unit.features);
  const stops: readonly Stop[] = useMemo(()=>showcase?unit204Stops:plan.rooms.map(room=>({
    name:room.name,position:[room.x+room.w/2,1.6,room.z+room.d/2],target:[room.x+room.w/2,1.2,room.z+room.d-0.1],
  })),[showcase,plan]);
  useEffect(()=>{
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow="hidden";
    const escape = (event:KeyboardEvent)=>{if(event.key==="Escape")setExpanded(false);};
    window.addEventListener("keydown",escape);
    return ()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",escape);};
  },[expanded]);
  const button = "min-h-11 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";
  return <div className={expanded?"fixed inset-0 z-50 flex flex-col overflow-auto bg-white p-3 sm:p-6":"overflow-hidden rounded-2xl border border-neutral-200 bg-white"}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 p-3">
      <div className="flex gap-1 rounded-xl bg-neutral-100 p-1" aria-label="Viewing perspective">
        <button className={`${button} ${!walk?"bg-emerald-800 text-white":"text-neutral-700"}`} aria-pressed={!walk} onClick={()=>setWalk(false)}>Dollhouse</button>
        <button className={`${button} ${walk?"bg-emerald-800 text-white":"text-neutral-700"}`} aria-pressed={walk} onClick={()=>setWalk(true)}>Walkthrough</button>
      </div>
      <div className="flex gap-1">
        <button className={`${button} text-neutral-600 hover:bg-neutral-100`} onClick={()=>setReset(value=>value+1)}>Reset view</button>
        <button className={`${button} text-neutral-600 hover:bg-neutral-100`} aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?"Close expanded view":"Expand"}</button>
      </div>
    </div>
    <div className={expanded?"min-h-[300px] flex-1":"h-[400px] sm:h-[540px]"} style={{touchAction:"none"}}>
      <SceneBoundary fallback={<p className="p-8 text-neutral-600">3D viewing is unavailable on this device. Use the photo view or try a browser with WebGL enabled.</p>}>
        <Canvas frameloop="demand" dpr={[1,1.5]} camera={{near:0.001,far:100}} aria-label={`${unit.publicLabel} ${walk?"walkthrough":"dollhouse"}`}>
          <Suspense fallback={null}><RoomScene plan={plan} walk={walk} stop={stops[stopIndex] ?? unit204Stops[0]} reset={reset} balcony={balcony} furnishing={furnishing}/></Suspense>
        </Canvas>
      </SceneBoundary>
    </div>
    <div className="space-y-3 border-t border-neutral-200 bg-white p-4">
      <p className="text-sm text-neutral-600">{walk?"Choose a room, then drag to look around from eye level.":"Drag to rotate. Scroll or pinch to zoom. Open Walkthrough to step inside."}</p>
      {walk && <div className="flex flex-wrap gap-2" aria-label="Walkthrough rooms">{stops.map((stop,index)=><button key={stop.name} aria-pressed={stopIndex===index} onClick={()=>{setStopIndex(index);setReset(value=>value+1);}} className={`${button} ${stopIndex===index?"bg-emerald-800 text-white":"bg-neutral-100 text-neutral-700"}`}>{stop.name}</button>)}</div>}
      <p className="text-xs leading-relaxed text-neutral-500">Illustrative furnished layout. Furniture and room arrangement are for visualization; refer to the listing for included furnishings.</p>
    </div>
  </div>;
}

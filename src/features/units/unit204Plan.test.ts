import { describe, expect, it } from "vitest";
import { unit204Plan as plan, unit204Stops } from "./unit204ReferencePlan";

const bounds = plan.furniture.filter(item=>item.kind!=="rug").map(item=>{
  const rotated = Math.abs(Math.sin(item.rotY??0))>0.5;
  return {kind:item.kind,x:item.x,z:item.z,w:rotated?item.d:item.w,d:rotated?item.w:item.d};
});
describe("Unit 204 circulation and staging",()=>{
  it("centres the balcony between bedrooms on the entrance axis",()=>{
    const balcony=plan.rooms.find(room=>room.id==="balcony")!;
    expect(balcony.x+balcony.w/2).toBe(0);
    expect(balcony.w*balcony.d).toBeCloseTo(3.12);
    expect(plan.rooms.find(room=>room.id==="master")!.x).toBeLessThan(balcony.x);
    expect(plan.rooms.find(room=>room.id==="bed2")!.x).toBe(balcony.x+balcony.w);
    expect(unit204Stops[0].position[0]).toBe(0);
  });
  it("covers 58 square metres and includes two bedrooms and two complete bathrooms",()=>{
    expect(plan.rooms.reduce((area,room)=>area+room.w*room.d,0)).toBeCloseTo(58);
    for(const kind of ["bed","toilet","shower","sink"]) expect(bounds.filter(item=>item.kind===kind)).toHaveLength(2);
  });
  it("keeps rotated furniture inside rooms without overlapping other furniture",()=>{
    for(const item of bounds){
      expect(plan.rooms.some(room=>item.x-item.w/2>=room.x && item.x+item.w/2<=room.x+room.w && item.z-item.d/2>=room.z-1e-6 && item.z+item.d/2<=room.z+room.d+1e-6)).toBe(true);
      for(const other of bounds){
        if(item===other)continue;
        expect(Math.abs(item.x-other.x)>=(item.w+other.w)/2 || Math.abs(item.z-other.z)>=(item.d+other.d)/2).toBe(true);
      }
    }
  });
  it("keeps every walkthrough stop clear of furniture with space around the camera",()=>{
    for(const stop of unit204Stops){
      for(const item of bounds){
        expect(Math.abs(stop.position[0]-item.x)>=item.w/2+0.2 || Math.abs(stop.position[2]-item.z)>=item.d/2+0.2).toBe(true);
      }
    }
  });
});

import { unit204Plan as plan } from "@/features/units/unit204ReferencePlan";
export function Unit204FloorPlan() {
  return <div className="rounded-xl border border-neutral-200 bg-white p-3">
    <svg viewBox="-4.5 -4.2 9 8.6" role="img" aria-label="Unit 204: central entrance and living room leading to a balcony between two bedrooms" className="mx-auto max-h-[680px] w-full" style={{background:"#fff",color:"#17231d"}}>
      <text x="0" y="-3.93" textAnchor="middle" fontSize=".17" fill="currentColor">UNIT 204 · 8.00 m × 7.25 m CONCEPT</text>
      {plan.rooms.map(room=><rect key={room.id} x={room.x} y={room.z} width={room.w} height={room.d} fill={room.id==="balcony"?"#dceadd":room.floor==="tile"?"#f0f2f0":"#faf6ef"} stroke="#ddd" strokeWidth=".015"/>)}
      {plan.furniture.map((item,index)=><g key={index} transform={`translate(${item.x} ${item.z}) rotate(${-(item.rotY??0)*180/Math.PI})`}>
        <rect x={-item.w/2} y={-item.d/2} width={item.w} height={item.d} rx=".04" fill="#fff" stroke="#667169" strokeWidth=".025"/>
        {(item.kind==="bed"||item.kind==="bedSingle")&&<rect x={-item.w/2+.08} y={-item.d/2+.08} width={item.w-.16} height=".32" rx=".07" fill="#e5e8e2" stroke="#667169" strokeWidth=".02"/>}
      </g>)}
      {plan.walls.map((wall,index)=>{
        const dx=wall.to[0]-wall.from[0],dz=wall.to[1]-wall.from[1],length=Math.hypot(dx,dz);
        return <g key={index} transform={`translate(${wall.from[0]} ${wall.from[1]}) rotate(${Math.atan2(dz,dx)*180/Math.PI})`}>
          <path d={`M0,0H${length}`} stroke="#26322c" strokeWidth=".09"/>
          {wall.openings?.map((opening,i)=><path key={i} d={`M${opening.at*length-opening.width/2},0h${opening.width}`} stroke={opening.kind==="window"?"#91b8ba":"#fff"} strokeWidth=".11"/>)}
        </g>;
      })}
      <path d="M-1.3,-3.625H1.3" stroke="#69898a" strokeWidth=".06"/>
      <path d="M-1.05,-2.425h2.1m-2.1,.06h2.1" stroke="#69898a" strokeWidth=".025"/>
      <rect x="2.925" y="2.85" width=".65" height=".65" fill="#fff" stroke="#667169" strokeWidth=".025"/>
      <circle cx="3.25" cy="3.175" r=".2" fill="none" stroke="#667169" strokeWidth=".025"/>
      {[[0,-3.4,"BALCONY ≈ 3 m²"],[-2.65,-.6,"MAIN BEDROOM"],[2.65,-.6,"BEDROOM 2"],[0,.45,"LIVING / DINING"],[-3.15,1.58,"ENSUITE"],[3.15,1.55,"COMMON BATH"],[3.15,2.96,"LAUNDRY"],[1.25,2.67,"KITCHEN"]].map(([x,y,label])=><text key={label} x={x} y={y} textAnchor="middle" fontSize=".13" fontWeight="600" fill="#17231d">{label}</text>)}
      <path d="M0,4V3.82m-.09,.1L0,3.82l.09,.1" stroke="#17231d" strokeWidth=".025" fill="none"/>
      <text x="0" y="4.22" textAnchor="middle" fontSize=".14" fill="#17231d">ENTRANCE</text>
      <text x="-2.65" y="-.4" textAnchor="middle" fontSize=".1" fill="#536159">Queen bed</text>
      <text x="2.65" y="-.4" textAnchor="middle" fontSize=".1" fill="#536159">Double + single · 3 sleeping places</text>
    </svg>
    <p className="mt-2 text-xs text-neutral-500">Reference-inspired concept. Approximate 58 m² envelope includes the centered balcony; listing area remains unchanged.</p>
  </div>;
}

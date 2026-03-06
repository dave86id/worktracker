import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { loadData, saveData } from "./supabase.js";

let _id = 100;
const uid = () => String(_id++);

const mkEntry = (time="", task="") => ({ type:"entry", id:uid(), time, task });
const mkNote  = (text="")          => ({ type:"note",  id:uid(), text });
const mkBox   = (title="Nová skupina", blocks=[]) => ({
  type:"box", id:uid(), title, collapsed:false,
  invoiced:false, paid:false, invoiceNote:"", blocks
});

const ph    = s => { const n=parseFloat((s||"").replace(",",".")); return isNaN(n)?0:n; };
const sumH  = bs => bs.filter(b=>b.type==="entry").reduce((s,b)=>s+ph(b.time),0);
const rnd   = h => Math.round(h*100)/100;
// Cache formatter — Intl.NumberFormat construction is expensive, reuse instance
const _fmt  = new Intl.NumberFormat("cs-CZ");
const fmtKc = n => _fmt.format(Math.round(n));
const getInitials = n => n.split(/[\s/]+/).map(w=>w[0]).join("").toUpperCase().slice(0,2);

function btnTextColor(hex) {
  const c=hex.replace("#","");
  const r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);
  return (0.299*r+0.587*g+0.114*b)/255>0.55?"#111":"#fff";
}

const PALETTE=[
  "#E8533F","#E8703F","#E89A3F","#E8C43F","#C4E83F","#7EE83F","#3FB87E","#3FE8A8",
  "#3FD4E8","#3FA8E8","#3F7DE8","#3F5CE8","#6B3FE8","#A03FE8","#C43FE8","#E83FD4",
  "#E83FA8","#E83F7E","#E83F5C","#E84F3F","#A05030","#7A6030","#407A40","#306050",
  "#305078","#403080","#602860","#782840","#888888","#AAAAAA","#CCCCCC","#E8E8E8",
];
const DEF_COLORS=["#E8533F","#3F7DE8","#3FB87E","#B03FE8","#E8A03F","#3FD4E8","#E83FA0","#7EE83F","#E8683F","#3F5CE8","#E8C43F","#3FE8A8","#C43FE8","#E84F3F","#3FA0E8","#E8533F","#3F7DE8","#3FB87E","#B03FE8","#E8A03F"];

function buildInitial() {
  const E=mkEntry, N=mkNote;
  const raw={
    "Envys":[
      N("32 800 Kč"),
      E("1","PPA stránka"),E("","meety, plnění"),E("1","Figma"),E("10","wek. kalkulačka atd"),
    ],
    "Firemni profily":[E("0.25","tabulky z PDF do HTML")],
    "NC + Logos":[E("","Dobito odhad do 6 tis")],
    "BB / MBC":[N("7 400 Kč"),E("0.5","plachta")],
    "TFV":[
      N("z 2025"),
      E("2","landing page pro vinaře"),E("0.5","PF 1"),E("0.5","PF 2 a tiskova data"),
      E("0.5","úprava postu s divadlem (M)"),E("0.5","úprava postu s divadlem (M)"),
      E("0.5","propisky, kapsa, sklenka"),E("1","banner Dušek 2 ks (M)"),
      N("4 200 Kč"),N("následně 1 300 Kč"),
    ],
    "BZUCO":[
      N("16 800 Kč (z 2025)"),
      E("0.5","PF"),E("0.5","PF tisk"),E("0.5","korektury brožury"),
      N("1 200 Kč"),N("následně 1 300 Kč"),
    ],
    "HOMEA / MEDICALTECH":[
      E("3","konzultace a zadání Rehabce"),
      N("zdražit i Filipovi na 1300"),
      E("4","medicaltech videa atd"),
    ],
    "Softmedia":[
      N("Labska (odhad 20 tis.)"),
      E("4.25","gn1"),E("5.5","gn2"),
      N("13 000 Kč"),N("Lehman (do 50 tis.)"),
      E("1","Lehman ind. - call"),E("1.5","Lehman WF 1"),E("2.5","Lehmann v2 a logo"),
      E("4","WFa grafika"),E("3.5","retuse a grafika 3"),E("4","call a upravy"),
      E("4","foto retuše a ikony (M)"),E("2","edit a video"),E("6","video 2, stroje, ikony"),
      N("37 050 Kč"),
      E("13","foto retuše (M)"),E("2.5","foto retuše (M)"),
      E("1.75","infotbal ladění 2"),E("1","astorie str 25 let (odh2)"),
      N("52 975 Kč"),
      E("2.5","ladění po schválení, po nasrání P Perduly"),
    ],
    "U2K":[E("0.5","inzerce")],
    "PFF":[
      N("fakturace@pff.cz"),
      E("1.5","ladeni eshopu"),E("1","upravy produktovych fotek"),E("1.5","úprava 3 bannerů carousel (M)"),
    ],
    "Hájenka":[N("1 500 Kč")],
    "Dix":[
      E("","Simeti"),E("0.5","Uprava materialu"),
      N("18 800 Kč (červen)"),N("5 600 Kč"),N("9 000 Kč"),
      E("","Dix uprava tiskovin (teasery)"),
    ],
    "Appleking":[E("0.5","mobil pokladna"),E("","figma"),E("0.5","bazarový prodej WF1"),N("13 000 Kč")],
    "YourBox":[E("0.5","Kobylisy | banner")],
    "Speedlo":[E("7","finalizace"),E("0.25","call"),E("2","edit WF asi 5")],
    "VST":[
      E("1","shuzka 1"),E("1","shuzka 2"),E("1","mailing a zadani"),
      E("7","WF1"),E("2","Grafický návrh a úpravy"),E("1.5","zadání programátorům"),E("1.5","polep dodávky"),
      N("19 500 Kč"),
    ],
    "Aerosped":[E("2.5","PFko1 (marketing)"),N("2 000 Kč")],
    "Design Developers":[
      N("Odhad byl 45–75 tis."),
      E("6","přípravy a skici"),E("7","návrhy"),E("3.5","návrhy 4"),E("1","finalizace 1"),
      N("32 000 Kč (část 2)"),
    ],
    "Aquarex":[E("1","call a draft letáku")],
    "Vlesku":[N("275 Kč – sazba"),E("","Skica")],
    "Blue collar evoptima":[E("2","skici a úpravy"),E("0.25","upravy")],
  };
  const out={};
  Object.keys(raw).forEach((name,i)=>{
    out[name]={boxes:[mkBox("Skupina 1",raw[name])],lastChanged:Date.now()-i*60000,color:DEF_COLORS[i%DEF_COLORS.length],rate:""};
  });
  return out;
}

// Build initial state once — avoids double-call from useState(fn) + useState(()=>keys(fn())[0])
const INITIAL_CLIENTS = buildInitial();
const INITIAL_SELECTED = Object.keys(INITIAL_CLIENTS)[0] || "";
function InlineEdit({value,onChange,placeholder="",style={},mono=false}){
  const[editing,setEditing]=useState(false);
  const[val,setVal]=useState(value);
  const ref=useRef(null);
  useEffect(()=>{setVal(value);},[value]);
  useEffect(()=>{if(editing){ref.current?.focus();ref.current?.select();}},[editing]);
  const commit=()=>{setEditing(false);if(val!==value)onChange(val);};
  if(editing)return(
    <input ref={ref} value={val} onChange={e=>setVal(e.target.value)} onBlur={commit}
      onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setVal(value);setEditing(false);}}}
      style={{background:"#0E0E0E",border:"1px solid #3A3A3A",borderRadius:4,color:"#E8E8E8",outline:"none",fontFamily:mono?"monospace":"inherit",...style}}
    />
  );
  return(
    <span onClick={()=>setEditing(true)} title="Klikni pro úpravu" style={{cursor:"text",...style}}>
      {value||<span style={{color:"#404040",fontStyle:"italic"}}>{placeholder}</span>}
    </span>
  );
}

// ─── TASK DISPLAY ─────────────────────────────────────────────────────────────
function TaskDisplay({value,onChange}){
  const[editing,setEditing]=useState(false);
  const[val,setVal]=useState(value);
  const ref=useRef(null);
  useEffect(()=>{setVal(value);},[value]);
  useEffect(()=>{if(editing){ref.current?.focus();ref.current?.select();}},[editing]);
  const commit=()=>{setEditing(false);if(val!==value)onChange(val);};
  const isUrl=/^https?:\/\/\S+$/.test((value||"").trim());
  if(editing)return(
    <input ref={ref} value={val} onChange={e=>setVal(e.target.value)} onBlur={commit}
      onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setVal(value);setEditing(false);}}}
      placeholder="Popis práce…"
      style={{display:"block",width:"100%",padding:"4px 6px",fontSize:13,color:"#E8E8E8",background:"#0E0E0E",border:"1px solid #3A3A3A",borderRadius:4,outline:"none",boxSizing:"border-box"}}
    />
  );
  if(isUrl)return(
    <span style={{display:"flex",alignItems:"center",gap:4,padding:"4px 6px"}}>
      <a href={value.trim()} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
        style={{color:"#5A9EE8",textDecoration:"underline",fontSize:13,wordBreak:"break-all",cursor:"pointer",flex:1}}
      >{value.trim()}</a>
      <button onClick={e=>{e.stopPropagation();setEditing(true);}} title="Upravit"
        style={{background:"none",border:"none",color:"#404040",cursor:"pointer",fontSize:11,padding:"0 2px",lineHeight:1,flexShrink:0}}
        onMouseEnter={e=>e.currentTarget.style.color="#888888"} onMouseLeave={e=>e.currentTarget.style.color="#404040"}
      >&#9998;</button>
    </span>
  );
  return(
    <span onClick={()=>setEditing(true)} title="Klikni pro úpravu"
      style={{display:"block",width:"100%",padding:"4px 6px",fontSize:13,color:value?"#C8C8C8":"#404040",fontStyle:value?"normal":"italic",cursor:"text",boxSizing:"border-box",wordBreak:"break-word"}}
    >{value||"Popis práce…"}</span>
  );
}

// ─── NOTE CONTENT ─────────────────────────────────────────────────────────────
function NoteContent({text,onEdit}){
  const segs=[];
  const re=/https?:\/\/[^\s]+/g;
  let last=0,m;
  while((m=re.exec(text))!==null){
    if(m.index>last)segs.push({k:"t",v:text.slice(last,m.index)});
    segs.push({k:"u",v:m[0]});last=re.lastIndex;
  }
  if(last<text.length)segs.push({k:"t",v:text.slice(last)});
  return(
    <span style={{lineHeight:1.55,fontSize:12}}>
      {segs.map((s,i)=>s.k==="u"
        ?<a key={i} href={s.v} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
            style={{color:"#5A9EE8",textDecoration:"underline",wordBreak:"break-all",cursor:"pointer"}}>{s.v}</a>
        :<span key={i}>{s.v}</span>
      )}
      <button onClick={e=>{e.preventDefault();e.stopPropagation();onEdit();}} title="Upravit"
        style={{background:"none",border:"none",color:"#404040",cursor:"pointer",fontSize:10,padding:"0 0 0 4px",lineHeight:1,verticalAlign:"middle"}}
        onMouseEnter={e=>e.currentTarget.style.color="#888888"} onMouseLeave={e=>e.currentTarget.style.color="#404040"}
      >&#9998;</button>
    </span>
  );
}

// ─── COLOR PICKER ─────────────────────────────────────────────────────────────
function ColorPicker({current,onSelect,onClose}){
  const ref=useRef(null);
  const onCloseRef=useRef(onClose);
  useEffect(()=>{onCloseRef.current=onClose;},[onClose]);
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))onCloseRef.current();};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]); // stable — no re-run on every render
  return(
    <div ref={ref} style={{position:"absolute",top:"100%",left:0,zIndex:999,background:"#1E1E1E",border:"1px solid #333333",borderRadius:9,padding:8,marginTop:4,width:152,display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:3,boxShadow:"0 8px 30px #00000088"}}>
      {PALETTE.map(c=>(
        <div key={c} onClick={()=>{onSelect(c);onClose();}} title={c}
          style={{width:14,height:14,borderRadius:3,background:c,cursor:"pointer",outline:current===c?"2px solid #fff":"none",outlineOffset:1,transition:"transform 0.1s"}}
          onMouseEnter={e=>e.target.style.transform="scale(1.3)"} onMouseLeave={e=>e.target.style.transform="scale(1)"}
        />
      ))}
    </div>
  );
}

// ─── NOTE INPUT ───────────────────────────────────────────────────────────────
function NoteInputRow({onAdd,onCancel,initial=""}){
  const[text,setText]=useState(initial);
  const ref=useRef(null);
  useEffect(()=>{ref.current?.focus();},[]);
  return(
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      <span style={{color:"#555",fontSize:13}}>&#9998;</span>
      <input ref={ref} value={text} onChange={e=>setText(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter")onAdd(text);if(e.key==="Escape")onCancel();}}
        placeholder="Poznámka (Enter, podporuje URL)"
        style={{flex:1,padding:"6px 10px",background:"#1A1A1A",border:"1px dashed #3A3A3A",borderRadius:7,color:"#888888",fontSize:12,outline:"none"}}
      />
      <button onClick={()=>onAdd(text)} style={{padding:"6px 11px",background:"#222222",border:"1px solid #3A3A3A",borderRadius:7,color:"#888",cursor:"pointer",fontSize:12}}>Uložit</button>
      <button onClick={onCancel} style={{padding:"6px 8px",background:"transparent",border:"1px solid #222222",borderRadius:7,color:"#555",cursor:"pointer",fontSize:12}}>&#10005;</button>
    </div>
  );
}

// ─── TRASH ICON ───────────────────────────────────────────────────────────────
function TrashIcon({onClick,style={}}){
  const[confirming,setConfirming]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    if(!confirming)return;
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setConfirming(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[confirming]);
  if(confirming)return(
    <span ref={ref} style={{display:"inline-flex",alignItems:"center",gap:3,...style}}>
      <span style={{fontSize:11,color:"#A06060",whiteSpace:"nowrap"}}>Smazat?</span>
      <button onClick={e=>{e.stopPropagation();setConfirming(false);onClick();}}
        style={{padding:"2px 6px",background:"#5A1E1E",border:"1px solid #8A3030",borderRadius:4,color:"#FF8080",fontSize:11,cursor:"pointer",fontWeight:700}}>Ano</button>
      <button onClick={e=>{e.stopPropagation();setConfirming(false);}}
        style={{padding:"2px 6px",background:"#202020",border:"1px solid #333333",borderRadius:4,color:"#808080",fontSize:11,cursor:"pointer"}}>Ne</button>
    </span>
  );
  return(
    <button onClick={e=>{e.stopPropagation();setConfirming(true);}} title="Smazat"
      style={{background:"none",border:"none",cursor:"pointer",padding:"2px 4px",color:"#3A2A2A",display:"flex",alignItems:"center",...style}}
      onMouseEnter={e=>e.currentTarget.style.color="#994444"}
      onMouseLeave={e=>e.currentTarget.style.color=style.color||"#3A2A2A"}
    >
      <svg width="12" height="13" viewBox="0 0 13 14" fill="none">
        <path d="M1 3.5h11M4.5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M5.5 6.5v4M7.5 6.5v4M2 3.5l.7 8a.5.5 0 0 0 .5.5h6.6a.5.5 0 0 0 .5-.5l.7-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// ─── DROP ZONE ────────────────────────────────────────────────────────────────
function DropZone({onDrop}){
  const[depth,setDepth]=useState(0);
  const over=depth>0;
  return(
    <div
      onDragEnter={e=>{e.preventDefault();e.stopPropagation();setDepth(d=>d+1);}}
      onDragOver={e=>{e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="move";}}
      onDragLeave={e=>{e.stopPropagation();setDepth(d=>Math.max(0,d-1));}}
      onDrop={e=>{e.preventDefault();e.stopPropagation();setDepth(0);onDrop();}}
      style={{height:over?6:3,margin:"2px 0",borderRadius:3,background:over?"#3F7DE8":"transparent",transition:"height 0.12s,background 0.12s"}}
    />
  );
}

// ─── BOX BLOCK ────────────────────────────────────────────────────────────────
let dragState=null;

function BoxBlock({box,color,rate,onUpdate,onUpdateBlock,onDeleteBlock,onMoveBlock,canDelete,onDelete}){
  const hrs=rnd(sumH(box.blocks));
  const price=rate>0&&hrs>0?rate*hrs:null;
  const[editingNoteId,setEditingNoteId]=useState(null);
  const statusColor=box.paid?"#3FD48A":box.invoiced?"#E8533F":color;

  function onHandleDragStart(e,blockId){
    dragState={srcBoxId:box.id,blockId};
    e.dataTransfer.effectAllowed="move";
    e.dataTransfer.setData("text/plain",blockId);
  }
  function handleDrop(targetIdx){
    if(!dragState)return;
    onMoveBlock(dragState.srcBoxId,dragState.blockId,box.id,targetIdx);
    dragState=null;
  }
  const row=(b,idx,children)=>(
    <div key={b.id}>{children}<DropZone onDrop={()=>handleDrop(idx+1)}/></div>
  );

  return(
    <div style={{background:"#141414",border:`1px solid ${box.paid?"#163A22":box.invoiced?"#3A1A1A":"#252525"}`,borderRadius:8,marginBottom:7,overflow:"hidden"}}>

      {/* Box Header */}
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",borderBottom:box.collapsed?"none":"1px solid #202020",userSelect:"none"}}>
        <span onClick={()=>onUpdate({collapsed:!box.collapsed})}
          style={{color:"#606060",fontSize:11,display:"inline-block",transform:box.collapsed?"rotate(-90deg)":"rotate(0deg)",transition:"transform 0.2s",flexShrink:0,width:13,textAlign:"center",cursor:"pointer"}}>&#9660;</span>
        <div style={{flex:1}} onClick={e=>e.stopPropagation()}>
          <InlineEdit value={box.title} onChange={v=>onUpdate({title:v})} placeholder="Název skupiny…"
            style={{display:"block",width:"100%",padding:"1px 4px",fontSize:13,fontWeight:600,color:"#A8A8A8",boxSizing:"border-box"}}
          />
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          {hrs>0&&<span style={{fontSize:11,fontWeight:700,color:statusColor}}>{hrs}h</span>}
          {price&&<span style={{fontSize:11,color:"#404040"}}>·</span>}
          {price&&<span style={{fontSize:11,fontWeight:700,color:box.paid?"#3FD48A":box.invoiced?"#C04030":"#706858"}}>{fmtKc(price)} Kč</span>}
        </div>
        {canDelete&&<TrashIcon onClick={onDelete} style={{flexShrink:0}}/>}
      </div>

      {/* Box Body */}
      {!box.collapsed&&(
        <div style={{padding:"6px 8px 0"}}>
          <DropZone onDrop={()=>handleDrop(0)}/>
          {box.blocks.map((b,idx)=>{
            if(b.type==="entry")return row(b,idx,(
              <div
                style={{background:"#181818",border:"1px solid #232323",borderRadius:7,padding:"5px 8px",display:"flex",alignItems:"center",gap:7}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="#333333"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="#232323"}
              >
                <span draggable onDragStart={e=>onHandleDragStart(e,b.id)} onDragEnd={()=>{dragState=null;}}
                  style={{color:"#404040",fontSize:13,flexShrink:0,cursor:"grab",padding:"0 2px",userSelect:"none",lineHeight:1}}
                  onMouseEnter={e=>e.currentTarget.style.color="#686868"} onMouseLeave={e=>e.currentTarget.style.color="#404040"}
                >&#8942;</span>
                <div style={{width:44,borderRadius:5,flexShrink:0,background:b.time?color+"16":"#1A1A1A",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <InlineEdit value={b.time} onChange={v=>onUpdateBlock(b.id,{time:v})} placeholder="—" mono
                    style={{display:"block",width:"100%",textAlign:"center",padding:"3px",fontSize:12,fontWeight:700,color:b.time?color:"#404040",boxSizing:"border-box"}}
                  />
                </div>
                <div style={{flex:1}}>
                  <TaskDisplay value={b.task} onChange={v=>onUpdateBlock(b.id,{task:v})}/>
                </div>
                <TrashIcon onClick={()=>onDeleteBlock(b.id)}/>
              </div>
            ));
            if(b.type==="note")return row(b,idx,(
              editingNoteId===b.id
                ?<NoteInputRow initial={b.text}
                    onAdd={v=>{onUpdateBlock(b.id,{text:v});setEditingNoteId(null);}}
                    onCancel={()=>setEditingNoteId(null)}
                  />
                :<div style={{background:"#151515",border:"1px dashed #252525",borderRadius:6,padding:"5px 10px",display:"flex",alignItems:"flex-start",gap:8}}>
                    <span draggable onDragStart={e=>onHandleDragStart(e,b.id)} onDragEnd={()=>{dragState=null;}}
                      style={{color:"#404040",fontSize:13,flexShrink:0,marginTop:1,cursor:"grab",userSelect:"none",lineHeight:1}}
                      onMouseEnter={e=>e.currentTarget.style.color="#686868"} onMouseLeave={e=>e.currentTarget.style.color="#404040"}
                    >&#8942;</span>
                    <div style={{flex:1,wordBreak:"break-word"}}>
                      <NoteContent text={b.text} onEdit={()=>setEditingNoteId(b.id)}/>
                    </div>
                    <TrashIcon onClick={()=>onDeleteBlock(b.id)} style={{marginTop:1}}/>
                  </div>
            ));
            return null;
          })}
        </div>
      )}

      {/* Box Footer */}
      <div style={{padding:"5px 10px 6px",borderTop:"1px solid #1A1A1A",display:"flex",alignItems:"center",gap:8}}>
        <input value={box.invoiceNote} onChange={e=>onUpdate({invoiceNote:e.target.value})}
          placeholder="Poznámka…"
          style={{flex:1,padding:"3px 8px",background:"#101212",border:"1px solid #1A2020",borderRadius:5,color:"#708090",fontSize:11,outline:"none",minWidth:0}}
        />
        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",userSelect:"none",flexShrink:0}}>
          <input type="checkbox" checked={box.invoiced}
            onChange={e=>{const v=e.target.checked;onUpdate({invoiced:v,collapsed:v?true:box.collapsed,paid:v?box.paid:false});}}
            style={{accentColor:"#E8533F",width:12,height:12,cursor:"pointer"}}
          />
          <span style={{fontSize:11,color:box.invoiced?"#E8533F":"#606060",whiteSpace:"nowrap"}}>Faktura</span>
        </label>
        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",userSelect:"none",flexShrink:0,opacity:box.invoiced?1:0.3,pointerEvents:box.invoiced?"auto":"none"}}>
          <input type="checkbox" checked={box.paid||false}
            onChange={e=>onUpdate({paid:e.target.checked})}
            style={{accentColor:"#3FD48A",width:12,height:12,cursor:"pointer"}}
          />
          <span style={{fontSize:11,color:box.paid?"#3FD48A":"#606060",whiteSpace:"nowrap"}}>Zaplaceno</span>
        </label>
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
// Defined outside Dashboard to avoid remount on every render
function StatCard({label,value,color="#C8C8C8",sub,warn}){
  return(
    <div style={{background:warn?"#1A1208":"#151515",border:`1px solid ${warn?"#3A2808":"#1E1E1E"}`,borderRadius:8,padding:"10px 13px",flex:1,minWidth:0}}>
      <div style={{fontSize:10,color:warn?"#8A5828":"#505050",letterSpacing:0.5,marginBottom:4}}>{label}</div>
      <div style={{fontSize:17,fontWeight:700,color,lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:warn?"#6A4020":"#404040",marginTop:3}}>{sub}</div>}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({clients,onSelectClient}){
  const stats=Object.entries(clients).map(([name,cl])=>{
    const r=ph(String(cl.rate||""));
    let totalH=0,paidH=0,invoicedH=0,openH=0,invoicedUnpaidCount=0;
    cl.boxes.forEach(bx=>{
      const h=sumH(bx.blocks);totalH+=h;
      if(bx.paid)paidH+=h;
      else if(bx.invoiced){invoicedH+=h;invoicedUnpaidCount++;}
      else openH+=h;
    });
    const entries=cl.boxes.reduce((s,bx)=>s+bx.blocks.filter(b=>b.type==="entry").length,0);
    return{name,color:cl.color||"#888",r,
      totalH:rnd(totalH),paidH:rnd(paidH),invoicedH:rnd(invoicedH),openH:rnd(openH),
      totalKc:r>0?r*totalH:null,paidKc:r>0?r*paidH:null,
      invoicedKc:r>0?r*invoicedH:null,openKc:r>0?r*openH:null,
      invoicedUnpaidCount,entries};
  });

  const withRate=stats.filter(s=>s.r>0);
  const grandPaid=withRate.reduce((s,c)=>s+(c.paidKc||0),0);
  const grandInvoiced=withRate.reduce((s,c)=>s+(c.invoicedKc||0),0);
  const grandOpen=withRate.reduce((s,c)=>s+(c.openKc||0),0);
  const grandTotal=withRate.reduce((s,c)=>s+(c.totalKc||0),0);
  const grandHrs=rnd(stats.reduce((s,c)=>s+c.totalH,0));
  const activeCount=stats.filter(s=>s.entries>0).length;
  const invoicedUnpaidList=stats.filter(s=>s.invoicedH>0&&s.invoicedUnpaidCount>0);
  // maxH removed — progress bar now uses per-client totalH as 100% (clearer breakdown)

  return(
    <div style={{flex:1,overflowY:"auto",padding:"16px 22px 22px"}}>
      <div style={{fontSize:10,fontWeight:800,letterSpacing:2.5,color:"#404040",marginBottom:13}}>PŘEHLED</div>

      {/* KPI cards */}
      <div style={{display:"flex",gap:7,marginBottom:14}}>
        <StatCard label="CELKEM HODIN" value={`${grandHrs}h`} color="#909090" sub={`${activeCount} aktivních klientů`}/>
        <StatCard label="ZAPLACENO" value={grandPaid>0?`${fmtKc(grandPaid)} Kč`:"—"} color="#3FD48A"
          sub={grandTotal>0?`z celk. ${fmtKc(grandTotal)} Kč`:undefined}/>
        <StatCard label="ČEKÁ NA PLATBU" value={grandInvoiced>0?`${fmtKc(grandInvoiced)} Kč`:"—"} color="#E8A03F"
          warn={grandInvoiced>0}
          sub={invoicedUnpaidList.length>0?`${invoicedUnpaidList.length} ${invoicedUnpaidList.length===1?"klient":"klientů"}`:undefined}/>
        <StatCard label="NEFAKTUROVÁNO" value={grandOpen>0?`${fmtKc(grandOpen)} Kč`:"—"} color="#888888"
          sub={grandOpen>0?"připraveno k fakturaci":undefined}/>
      </div>

      {/* Alert: invoiced but unpaid */}
      {invoicedUnpaidList.length>0&&(
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,color:"#A07030",fontWeight:700,letterSpacing:1.5,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
            <span>&#9888;</span> VYFAKTUROVÁNO — ČEKÁ NA ZAPLACENÍ
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            {invoicedUnpaidList.map(c=>(
              <div key={c.name} onClick={()=>onSelectClient(c.name)}
                style={{background:"#1A1408",border:"1px solid #3A2510",borderRadius:7,padding:"6px 11px",display:"flex",alignItems:"center",gap:9,cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="#6A4020"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="#3A2510"}
              >
                <div style={{width:22,height:22,borderRadius:5,background:c.color+"22",color:c.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,flexShrink:0}}>{getInitials(c.name)}</div>
                <div style={{flex:1,fontSize:12,fontWeight:600,color:"#C89050"}}>{c.name}</div>
                <div style={{fontSize:11,color:"#806040"}}>{c.invoicedUnpaidCount} {c.invoicedUnpaidCount===1?"skupina":"skupiny"} · {c.invoicedH}h</div>
                {c.invoicedKc!=null&&<div style={{fontSize:12,fontWeight:700,color:"#E8A03F"}}>{fmtKc(c.invoicedKc)} Kč</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-client rows */}
      <div style={{fontSize:10,fontWeight:700,letterSpacing:1.5,color:"#404040",marginBottom:7}}>KLIENTI</div>
      <div style={{display:"flex",flexDirection:"column",gap:3}}>
        {stats.filter(s=>s.entries>0).sort((a,b)=>b.totalH-a.totalH).map(c=>{
          // Progress bar segments as % of client's own totalH — shows breakdown clearly
          const base=c.totalH||1;
          const paidPct=(c.paidH/base)*100;
          const invPct=(c.invoicedH/base)*100;
          const openPct=(c.openH/base)*100;
          return(
            <div key={c.name} onClick={()=>onSelectClient(c.name)}
              style={{background:"#141414",border:"1px solid #202020",borderRadius:7,padding:"7px 11px",cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#2A2A2A"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#202020"}
            >
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <div style={{width:20,height:20,borderRadius:4,background:c.color+"22",color:c.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,flexShrink:0}}>{getInitials(c.name)}</div>
                <div style={{flex:1,fontSize:12,fontWeight:600,color:"#B0B0B0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                  <span style={{fontSize:11,color:"#505050"}}>{c.totalH}h</span>
                  {c.paidKc!=null&&c.paidKc>0&&<span style={{fontSize:11,fontWeight:700,color:"#3FD48A"}}>{fmtKc(c.paidKc)} Kč</span>}
                  {c.invoicedKc!=null&&c.invoicedKc>0&&<span style={{fontSize:11,fontWeight:600,color:"#E8A03F"}}>{fmtKc(c.invoicedKc)} Kč &#9203;</span>}
                  {!c.paidKc&&!c.invoicedKc&&c.openKc!=null&&c.openKc>0&&<span style={{fontSize:11,color:"#606060"}}>{fmtKc(c.openKc)} Kč</span>}
                </div>
              </div>
              <div style={{height:3,borderRadius:2,background:"#202020",overflow:"hidden",display:"flex"}}>
                {paidPct>0&&<div style={{width:`${paidPct}%`,background:"#3FD48A"}}/>}
                {invPct>0&&<div style={{width:`${invPct}%`,background:"#E8A03F"}}/>}
                {openPct>0&&<div style={{width:`${openPct}%`,background:"#505050"}}/>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:14,marginTop:11,paddingTop:10,borderTop:"1px solid #1A1A1A"}}>
        {[["#3FD48A","Zaplaceno"],["#E8A03F","Vyfakturováno (čeká)"],["#505050","Nefakturováno"]].map(([c,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:8,height:8,borderRadius:2,background:c}}/>
            <span style={{fontSize:10,color:"#505050"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
// Inject dark scrollbar styles once
const SCROLLBAR_STYLE=`
  ::-webkit-scrollbar{width:6px;height:6px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:#333333;border-radius:3px}
  ::-webkit-scrollbar-thumb:hover{background:#484848}
  *{scrollbar-width:thin;scrollbar-color:#333333 transparent}
`;

export default function WorkTracker(){
  useEffect(()=>{
    if(document.getElementById("wfw-scrollbar-style"))return;
    const s=document.createElement("style");
    s.id="wfw-scrollbar-style";
    s.textContent=SCROLLBAR_STYLE;
    document.head.appendChild(s);
  },[]);

  const[loaded,setLoaded]=useState(false);
  const[clients,setClients]=useState(INITIAL_CLIENTS);
  const[selected,setSelected]=useState(INITIAL_SELECTED);

  // Načtení dat ze Supabase při startu
  useEffect(()=>{
    async function init(){
      const [c,s]=await Promise.all([loadData("wfw-clients"),loadData("wfw-selected")]);
      if(c)setClients(c);
      if(s)setSelected(s);
      setLoaded(true);
    }
    init();
  },[]);

  // Persist to Supabase on every change (only after initial load)
  useEffect(()=>{if(loaded)saveData("wfw-clients",clients);},[clients,loaded]);
  useEffect(()=>{if(loaded)saveData("wfw-selected",selected);},[selected,loaded]);

  if(!loaded)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#111",color:"#888",fontSize:14}}>Načítám data…</div>;
  const[view,setView]=useState("client");
  const[newTask,setNewTask]=useState("");
  const[newTime,setNewTime]=useState("");
  const[newClientName,setNewClientName]=useState("");
  const[showAddClient,setShowAddClient]=useState(false);
  const[search,setSearch]=useState("");
  const[addingNote,setAddingNote]=useState(false);
  const[sortMode,setSortMode]=useState("manual");
  const[colorPickerFor,setColorPickerFor]=useState(null);

  const sortedNames=useMemo(()=>{
    const names=Object.keys(clients).filter(n=>n.toLowerCase().includes(search.toLowerCase()));
    if(sortMode==="alpha")names.sort((a,b)=>a.localeCompare(b,"cs"));
    if(sortMode==="recent")names.sort((a,b)=>(clients[b].lastChanged||0)-(clients[a].lastChanged||0));
    return names;
  },[clients,search,sortMode]);

  const client=clients[selected];
  const color=client?.color||"#3F7DE8";
  const rate=client?.rate||"";
  const boxes=useMemo(()=>client?.boxes||[],[client]);
  const totalHrs=useMemo(()=>rnd(boxes.reduce((s,bx)=>s+sumH(bx.blocks),0)),[boxes]);
  const totalEntries=useMemo(()=>boxes.reduce((s,bx)=>s+bx.blocks.filter(b=>b.type==="entry").length,0),[boxes]);
  const rateNum=ph(String(rate));
  const totalPrice=rateNum>0&&totalHrs>0?rateNum*totalHrs:null;
  const addBtnTextColor=useMemo(()=>btnTextColor(color),[color]);
  const isDash=view==="dashboard";

  // Reset add-bar state when switching clients
  useEffect(()=>{ setAddingNote(false); setNewTask(""); setNewTime(""); },[selected]);

  const upClient=useCallback((fn)=>{setClients(prev=>({...prev,[selected]:{...prev[selected],boxes:fn(prev[selected].boxes),lastChanged:Date.now()}}));},[selected]);
  function getOrCreateOpenBox(bxs){
    if(!bxs.length)return[mkBox("Skupina 1")];
    const last=bxs[bxs.length-1];
    if(last.invoiced)return[...bxs,mkBox(`Skupina ${bxs.length+1}`)];
    return bxs;
  }
  function addEntry(){
    if(!newTask.trim())return;
    upClient(bxs=>{const r=getOrCreateOpenBox(bxs);const c=[...r];c[c.length-1]={...c[c.length-1],blocks:[...c[c.length-1].blocks,mkEntry(newTime,newTask.trim())]};return c;});
    setNewTask("");setNewTime("");
  }
  function addNoteToLast(text){
    if(!text.trim())return;
    upClient(bxs=>{const r=getOrCreateOpenBox(bxs);const c=[...r];c[c.length-1]={...c[c.length-1],blocks:[...c[c.length-1].blocks,mkNote(text.trim())]};return c;});
    setAddingNote(false);
  }
  function addBox(){upClient(bxs=>[...bxs,mkBox(`Skupina ${bxs.length+1}`)]);}
  function updateBox(boxId,patch){upClient(bxs=>bxs.map(bx=>bx.id===boxId?{...bx,...patch}:bx));}
  function updateBlock(boxId,blockId,patch){upClient(bxs=>bxs.map(bx=>bx.id!==boxId?bx:{...bx,blocks:bx.blocks.map(b=>b.id===blockId?{...b,...patch}:b)}));}
  function deleteBlock(boxId,blockId){upClient(bxs=>bxs.map(bx=>bx.id!==boxId?bx:{...bx,blocks:bx.blocks.filter(b=>b.id!==blockId)}));}
  function deleteBox(boxId){upClient(bxs=>bxs.filter(bx=>bx.id!==boxId));}
  function moveBlock(srcBoxId,blockId,dstBoxId,dstIdx){
    upClient(bxs=>{
      let block=null;
      const after=bxs.map(bx=>{if(bx.id===srcBoxId){block=bx.blocks.find(b=>b.id===blockId);return{...bx,blocks:bx.blocks.filter(b=>b.id!==blockId)};}return bx;});
      if(!block)return bxs;
      return after.map(bx=>{if(bx.id!==dstBoxId)return bx;const bs=[...bx.blocks];bs.splice(dstIdx,0,block);return{...bx,blocks:bs};});
    });
  }
  function addClient(){
    const name=newClientName.trim();
    if(!name||clients[name])return;
    setClients(prev=>({...prev,[name]:{boxes:[mkBox("Skupina 1")],lastChanged:Date.now(),color:PALETTE[Math.floor(Math.random()*16)],rate:""}}));
    setSelected(name);setNewClientName("");setShowAddClient(false);setView("client");
  }
  function deleteClient(name){
    const u={...clients};delete u[name];
    setClients(u);
    const remaining=Object.keys(u);
    if(remaining.length>0){setSelected(remaining[0]);}
    else{setSelected("");setView("dashboard");}
  }
  function setClientColor(name,c){setClients(prev=>({...prev,[name]:{...prev[name],color:c}}));}
  function setClientRate(name,r){setClients(prev=>({...prev,[name]:{...prev[name],rate:r}}));}
  function exportData(){
    const payload=JSON.stringify({version:1,clients},null,2);
    const uri="data:application/json;charset=utf-8,"+encodeURIComponent(payload);
    const a=document.createElement("a");
    a.href=uri;
    a.download=`wfw-cfw-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  function importData(e){
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const parsed=JSON.parse(ev.target.result);
        if(parsed.version===1&&parsed.clients&&typeof parsed.clients==="object"){
          if(window.confirm("Importovat data? Stávající data budou nahrazena.")){setClients(parsed.clients);setSelected(Object.keys(parsed.clients)[0]||"");}
        }else alert("Neplatný formát souboru.");
      }catch{alert("Soubor nelze načíst.");}
    };
    reader.readAsText(file);e.target.value="";
  }

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans','Segoe UI',sans-serif",background:"#111111",color:"#E8E8E8",overflow:"hidden"}}>

      {/* ── SIDEBAR ── */}
      <div style={{width:224,minWidth:180,background:"#161616",display:"flex",flexDirection:"column",borderRight:"1px solid #202020"}}>

        {/* Sidebar top */}
        <div style={{padding:"10px 10px 9px",borderBottom:"1px solid #202020"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:7}}>
            {/* Dashboard button — icon + title together */}
            <button onClick={()=>setView(isDash?"client":"dashboard")} title="Dashboard"
              style={{flex:1,display:"flex",alignItems:"center",gap:6,background:isDash?"#222222":"none",border:`1px solid ${isDash?"#3A3A3A":"#202020"}`,borderRadius:6,color:isDash?"#C8C8C8":"#505050",cursor:"pointer",padding:"4px 8px",textAlign:"left",minWidth:0}}
              onMouseEnter={e=>{if(!isDash){e.currentTarget.style.borderColor="#333333";e.currentTarget.style.color="#888888";}}}
              onMouseLeave={e=>{if(!isDash){e.currentTarget.style.borderColor="#202020";e.currentTarget.style.color="#505050";}}}
            >
              <svg width="13" height="12" viewBox="0 0 14 13" fill="none" style={{flexShrink:0}}>
                <path d="M1 6.5L7 1l6 5.5V12a.5.5 0 0 1-.5.5H9V9H5v3.5H1.5A.5.5 0 0 1 1 12V6.5z"
                  stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
                  fill={isDash?"currentColor":"none"}/>
              </svg>
              <span style={{fontSize:10,fontWeight:800,letterSpacing:1.5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>wfw/cfw v2</span>
            </button>
            {/* Export */}
            <button onClick={exportData} title="Export JSON"
              style={{background:"none",border:"1px solid #202020",borderRadius:6,color:"#505050",cursor:"pointer",padding:"4px 6px",display:"flex",alignItems:"center",flexShrink:0}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#333333";e.currentTarget.style.color="#808080";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#202020";e.currentTarget.style.color="#505050";}}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 0 0 3.5 13h7a1.5 1.5 0 0 0 1.5-1.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {/* Import */}
            <label title="Import JSON"
              style={{background:"none",border:"1px solid #202020",borderRadius:6,color:"#505050",cursor:"pointer",padding:"4px 6px",display:"flex",alignItems:"center",flexShrink:0}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#333333";e.currentTarget.style.color="#808080";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#202020";e.currentTarget.style.color="#505050";}}
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M7 13V5M4 8l3-3 3 3M2 4V2.5A1.5 1.5 0 0 1 3.5 1h7A1.5 1.5 0 0 1 12 2.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input type="file" accept=".json" onChange={importData} style={{display:"none"}}/>
            </label>
          </div>
          <input placeholder="Hledat…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{width:"100%",boxSizing:"border-box",padding:"5px 8px",background:"#0E0E0E",border:"1px solid #1A1A1A",borderRadius:6,color:"#E8E8E8",fontSize:12,outline:"none",marginBottom:6}}
          />
          <div style={{display:"flex",gap:3}}>
            {[["manual","—"],["alpha","A–Z"],["recent","Nedávné"]].map(([mode,label])=>(
              <button key={mode} onClick={()=>setSortMode(mode)}
                style={{flex:1,padding:"3px 0",fontSize:10,fontWeight:600,background:sortMode===mode?"#222222":"transparent",border:`1px solid ${sortMode===mode?"#333333":"#1A1A1A"}`,borderRadius:5,color:sortMode===mode?"#888888":"#505050",cursor:"pointer"}}
              >{label}</button>
            ))}
            <button onClick={()=>setShowAddClient(!showAddClient)} title="Přidat klienta"
              style={{padding:"3px 10px",fontSize:14,fontWeight:700,background:showAddClient?"#222222":"transparent",border:`1px solid ${showAddClient?"#333333":"#1A1A1A"}`,borderRadius:5,color:showAddClient?"#888888":"#505050",cursor:"pointer",lineHeight:1}}>+</button>
          </div>
          {showAddClient&&(
            <div style={{display:"flex",gap:5,marginTop:6}}>
              <input autoFocus placeholder="Název klienta…" value={newClientName}
                onChange={e=>setNewClientName(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")addClient();if(e.key==="Escape")setShowAddClient(false);}}
                style={{flex:1,padding:"5px 8px",background:"#0E0E0E",border:"1px solid #333333",borderRadius:5,color:"#E8E8E8",fontSize:12,outline:"none"}}
              />
              <button onClick={addClient} style={{padding:"5px 10px",background:"#3F7DE8",border:"none",borderRadius:5,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>+</button>
              <button onClick={()=>setShowAddClient(false)} style={{padding:"5px 7px",background:"#222222",border:"none",borderRadius:5,color:"#888",cursor:"pointer",fontSize:12}}>&#10005;</button>
            </div>
          )}
        </div>

        {/* Client list */}
        <div style={{flex:1,overflowY:"auto",padding:"3px 0"}}>
          {sortedNames.map(name=>{
            const isActive=selected===name&&view==="client";
            const c=clients[name]?.color||"#888";
            const hrs=rnd(clients[name]?.boxes?.reduce((s,bx)=>s+sumH(bx.blocks),0)||0);
            const cnt=clients[name]?.boxes?.reduce((s,bx)=>s+bx.blocks.filter(b=>b.type==="entry").length,0)||0;
            const r=ph(String(clients[name]?.rate||""));
            return(
              <div key={name}
                style={{position:"relative",display:"flex",alignItems:"center",gap:7,padding:"5px 10px",cursor:"pointer",background:isActive?"#1C1C1C":"transparent",borderLeft:`3px solid ${isActive?c:"transparent"}`}}
                onClick={()=>{setSelected(name);setView("client");}}
              >
                <div style={{position:"relative",flexShrink:0}}>
                  <div onClick={e=>{e.stopPropagation();setColorPickerFor(colorPickerFor===name?null:name);}} title="Změnit barvu"
                    style={{width:24,height:24,borderRadius:6,background:c+"22",color:c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:900,cursor:"pointer",border:`1px solid ${colorPickerFor===name?c:"transparent"}`}}
                  >{getInitials(name)}</div>
                  {colorPickerFor===name&&<ColorPicker current={c} onSelect={col=>setClientColor(name,col)} onClose={()=>setColorPickerFor(null)}/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:isActive?600:400,color:isActive?"#E8E8E8":"#888888",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
                  <div style={{fontSize:10,color:"#404040"}}>
                    {cnt} zázn.{hrs>0?` · ${hrs}h`:""}
                    {r>0&&hrs>0?` · ${fmtKc(r*hrs)} Kč`:""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {isDash?(
          <Dashboard clients={clients} onSelectClient={name=>{setSelected(name);setView("client");}}/>
        ):selected&&client?(
          <>
            {/* Client header */}
            <div style={{padding:"10px 20px 9px",borderBottom:"1px solid #202020",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:30,height:30,borderRadius:8,background:color+"1C",color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900}}>{getInitials(selected)}</div>
                <div>
                  <h1 style={{margin:0,fontSize:15,fontWeight:700,color:"#fff"}}>{selected}</h1>
                  <div style={{fontSize:11,color:"#505050",marginTop:1,display:"flex",gap:8}}>
                    <span>{totalEntries} zázn.</span>
                    {totalHrs>0&&<span style={{color}}>&#8721; {totalHrs}h</span>}
                    {totalPrice&&<span style={{color:"#909070"}}>&#8721; {fmtKc(totalPrice)} Kč</span>}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{display:"flex",alignItems:"center",gap:5,background:"#181818",border:"1px solid #252525",borderRadius:6,padding:"4px 8px"}}>
                  <span style={{fontSize:11,color:"#606060",whiteSpace:"nowrap"}}>Kč/h</span>
                  <input value={rate} onChange={e=>setClientRate(selected,e.target.value)} placeholder="0"
                    style={{width:52,background:"transparent",border:"none",outline:"none",color:"#C8C8C8",fontSize:13,fontWeight:600,textAlign:"right"}}
                  />
                </div>
                <button onClick={addBox} title="Přidat skupinu"
                  style={{width:27,height:27,background:"#1C1C1C",border:"1px solid #2A2A2A",borderRadius:6,color:"#686868",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>+</button>
                <TrashIcon onClick={()=>deleteClient(selected)} style={{color:"#5A3333"}}/>
              </div>
            </div>

            {/* Box list */}
            <div style={{flex:1,overflowY:"auto",padding:"10px 20px 4px"}}>
              {boxes.length===0&&<div style={{textAlign:"center",color:"#282828",marginTop:50,fontSize:13}}>Zatím žádné skupiny.</div>}
              {boxes.map(bx=>(
                <BoxBlock key={bx.id}
                  box={bx} color={color} rate={rateNum}
                  onUpdate={p=>updateBox(bx.id,p)}
                  onUpdateBlock={(bid,p)=>updateBlock(bx.id,bid,p)}
                  onDeleteBlock={bid=>deleteBlock(bx.id,bid)}
                  onMoveBlock={moveBlock}
                  canDelete={boxes.length>1}
                  onDelete={()=>deleteBox(bx.id)}
                />
              ))}
            </div>

            {/* Add entry bar */}
            <div style={{padding:"8px 20px 13px",borderTop:"1px solid #202020"}}>
              {addingNote?(
                <NoteInputRow onAdd={addNoteToLast} onCancel={()=>setAddingNote(false)}/>
              ):(
                <div style={{display:"flex",gap:6}}>
                  <input value={newTime} onChange={e=>setNewTime(e.target.value)}
                    placeholder="h" id="wt-time-input"
                    onKeyDown={e=>{if(e.key==="Enter")document.getElementById("wt-task-input")?.focus();}}
                    style={{width:48,padding:"7px 6px",background:"#181818",border:"1px solid #202020",borderRadius:7,color:"#E8E8E8",fontSize:13,outline:"none",textAlign:"center"}}
                  />
                  <input id="wt-task-input" value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addEntry()}
                    placeholder="Popis práce…"
                    style={{flex:1,padding:"7px 11px",background:"#181818",border:"1px solid #202020",borderRadius:7,color:"#E8E8E8",fontSize:13,outline:"none"}}
                  />
                  <button onClick={()=>setAddingNote(true)} title="Vložit poznámku"
                    style={{padding:"7px 12px",background:"#181818",border:"1px solid #202020",borderRadius:7,color:"#606060",cursor:"pointer",fontSize:14}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#333333";e.currentTarget.style.color="#888888";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#202020";e.currentTarget.style.color="#606060";}}
                  >&#9998;</button>
                  <button onClick={addEntry}
                    style={{padding:"7px 17px",background:color,border:"none",borderRadius:7,color:addBtnTextColor,cursor:"pointer",fontSize:13,fontWeight:700}}
                  >Přidat</button>
                </div>
              )}
            </div>
          </>
        ):(
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#282828"}}>Vyber nebo přidej klienta.</div>
        )}
      </div>
    </div>
  );
}

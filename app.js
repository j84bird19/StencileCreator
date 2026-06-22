/* StencilForge v2 - flat GitHub Pages build */
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

const state = {
  img:null, imgData:null, mask:null, layers:[], svgLayers:[],
  tool:"none", scale:1, offsetX:0, offsetY:0, drawing:false,
  colors:["#050505","#2f2f2f","#6d6d6d","#aaa9a7","#dedede","#7b4dff","#d6a13b","#66ccff","#ff6bc2","#64e572"]
};

const editCanvas = $("#editCanvas");
const ctx = editCanvas.getContext("2d", { willReadFrequently:true });
const statusEl = $("#status");

function setStatus(t){ statusEl.textContent = t; }

function fitCanvasToImage(img){
  const max = 1100;
  let w = img.width, h = img.height;
  const r = Math.min(max/w, max/h, 1);
  editCanvas.width = Math.max(320, Math.round(w*r));
  editCanvas.height = Math.max(320, Math.round(h*r));
  state.scale = r;
  state.mask = new Int8Array(editCanvas.width*editCanvas.height);
  drawEdit();
}

function drawEdit(){
  ctx.clearRect(0,0,editCanvas.width,editCanvas.height);
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,editCanvas.width,editCanvas.height);
  if(state.img) ctx.drawImage(state.img,0,0,editCanvas.width,editCanvas.height);
  if(state.mask){
    const image = ctx.getImageData(0,0,editCanvas.width,editCanvas.height);
    for(let i=0;i<state.mask.length;i++){
      const m=state.mask[i], p=i*4;
      if(m===1){ image.data[p]=40; image.data[p+1]=230; image.data[p+2]=95; image.data[p+3]=165; }
      if(m===-1){ image.data[p]=255; image.data[p+1]=60; image.data[p+2]=60; image.data[p+3]=175; }
    }
    ctx.putImageData(image,0,0);
  }
}

function loadImageFromFile(file){
  const img = new Image();
  img.onload=()=>{ state.img=img; fitCanvasToImage(img); setStatus("Image loaded. Paint green to keep or red to remove, then make stencil layers."); };
  img.src = URL.createObjectURL(file);
}

$("#imageInput").addEventListener("change", e=>{
  const f=e.target.files?.[0]; if(f) loadImageFromFile(f);
});

$$(".tab").forEach(btn=>btn.onclick=()=>{
  $$(".tab").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
  $$(".tabPanel").forEach(p=>p.classList.remove("show"));
  (btn.dataset.tab==="photo"?$("#photoTab"):$("#ideaTab")).classList.add("show");
});

$$(".tool").forEach(btn=>btn.onclick=()=>{
  if(!btn.dataset.tool) return;
  $$(".tool").forEach(b=>b.classList.remove("active")); btn.classList.add("active");
  state.tool=btn.dataset.tool;
});
$("#clearMaskBtn").onclick=()=>{ if(state.mask) state.mask.fill(0); drawEdit(); };

function pointerPos(e){
  const r=editCanvas.getBoundingClientRect();
  const t=e.touches?e.touches[0]:e;
  return {x:Math.floor((t.clientX-r.left)*editCanvas.width/r.width), y:Math.floor((t.clientY-r.top)*editCanvas.height/r.height)};
}
function paintMask(e){
  if(!state.mask || state.tool==="none") return;
  e.preventDefault();
  const {x,y}=pointerPos(e), rad=+$("#brushSize").value;
  const val=state.tool==="keep"?1:-1;
  const w=editCanvas.width,h=editCanvas.height;
  for(let yy=Math.max(0,y-rad); yy<Math.min(h,y+rad); yy++){
    for(let xx=Math.max(0,x-rad); xx<Math.min(w,x+rad); xx++){
      const dx=xx-x,dy=yy-y;
      if(dx*dx+dy*dy<=rad*rad) state.mask[yy*w+xx]=val;
    }
  }
  drawEdit();
}
["mousedown","touchstart"].forEach(ev=>editCanvas.addEventListener(ev,e=>{state.drawing=true;paintMask(e)}));
["mousemove","touchmove"].forEach(ev=>editCanvas.addEventListener(ev,e=>{if(state.drawing)paintMask(e)}));
["mouseup","mouseleave","touchend"].forEach(ev=>editCanvas.addEventListener(ev,()=>state.drawing=false));

$("#makeIdeaBtn").onclick=()=>{
  const text=$("#ideaText").value.trim() || "stencil concept";
  const c=document.createElement("canvas"); c.width=900; c.height=900;
  const g=c.getContext("2d");
  g.fillStyle="#f5f2eb"; g.fillRect(0,0,900,900);
  g.translate(450,450);
  g.fillStyle="#111"; g.beginPath(); g.ellipse(0,-40,210,270,0,0,Math.PI*2); g.fill();
  g.fillStyle="#eee"; g.beginPath(); g.ellipse(-55,-75,35,22,0,0,Math.PI*2); g.ellipse(75,-75,35,22,0,0,Math.PI*2); g.fill();
  g.strokeStyle="#111"; g.lineWidth=18; g.beginPath(); g.moveTo(-150,145); g.quadraticCurveTo(0,235,160,145); g.stroke();
  g.rotate(-.25); g.fillStyle="#7b4dff"; for(let i=0;i<18;i++){g.beginPath();g.ellipse(-190+i*24,-270+Math.sin(i)*16,18,110,.25,0,Math.PI*2);g.fill();}
  g.setTransform(1,0,0,1,0,0);
  g.fillStyle="#222"; g.font="bold 34px system-ui"; g.textAlign="center"; g.fillText("Local concept sketch",450,820);
  g.font="20px system-ui"; g.fillText(text.slice(0,60),450,855);
  const img=new Image(); img.onload=()=>{state.img=img;fitCanvasToImage(img);setStatus("Concept image created locally. Edit, then make stencil layers.");}; img.src=c.toDataURL();
};

function getWorkingImageData(){
  if(!state.img) return null;
  const temp=document.createElement("canvas"); temp.width=editCanvas.width; temp.height=editCanvas.height;
  const g=temp.getContext("2d",{willReadFrequently:true});
  g.drawImage(state.img,0,0,temp.width,temp.height);
  const d=g.getImageData(0,0,temp.width,temp.height);
  const w=temp.width,h=temp.height;
  if($("#autoBg").checked){
    // simple background fade: compare pixels to average border color
    let br=[0,0,0], n=0;
    for(let x=0;x<w;x+=8){ for(const y of [0,h-1]){let p=(y*w+x)*4;br[0]+=d.data[p];br[1]+=d.data[p+1];br[2]+=d.data[p+2];n++;}}
    for(let y=0;y<h;y+=8){ for(const x of [0,w-1]){let p=(y*w+x)*4;br[0]+=d.data[p];br[1]+=d.data[p+1];br[2]+=d.data[p+2];n++;}}
    br=br.map(v=>v/n);
    for(let i=0;i<w*h;i++){
      const p=i*4, dist=Math.abs(d.data[p]-br[0])+Math.abs(d.data[p+1]-br[1])+Math.abs(d.data[p+2]-br[2]);
      if(dist<55 && state.mask?.[i]!==1){ d.data[p]=255;d.data[p+1]=255;d.data[p+2]=255; }
    }
  }
  if(state.mask){
    for(let i=0;i<state.mask.length;i++){
      const p=i*4;
      if(state.mask[i]===-1){ d.data[p]=255; d.data[p+1]=255; d.data[p+2]=255; d.data[p+3]=0; }
      if(state.mask[i]===1){ /* keep as is */ }
    }
  }
  return d;
}

function grayscaleArray(imgData){
  const {data,width:w,height:h}=imgData; const gray=new Float32Array(w*h);
  const style=$("#styleMode").value;
  let contrast = style==="logo"?1.55:style==="airbrush"?1.18:style==="laser"?1.35:1.28;
  for(let i=0;i<w*h;i++){
    const p=i*4, a=data[p+3]/255;
    let v = .299*data[p]+.587*data[p+1]+.114*data[p+2];
    v = 128+(v-128)*contrast;
    if(a<.2) v=255;
    gray[i]=Math.max(0,Math.min(255,v));
  }
  return gray;
}

function blur(src,w,h,r=1){
  if(r<=0) return src.slice();
  let out=new Float32Array(src.length), tmp=new Float32Array(src.length);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    let s=0,n=0; for(let k=-r;k<=r;k++){let xx=Math.min(w-1,Math.max(0,x+k));s+=src[y*w+xx];n++;} tmp[y*w+x]=s/n;
  }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    let s=0,n=0; for(let k=-r;k<=r;k++){let yy=Math.min(h-1,Math.max(0,y+k));s+=tmp[yy*w+x];n++;} out[y*w+x]=s/n;
  }
  return out;
}

function edgeArray(gray,w,h){
  const e=new Float32Array(w*h);
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
    const i=y*w+x;
    const gx=-gray[i-w-1]-2*gray[i-1]-gray[i+w-1]+gray[i-w+1]+2*gray[i+1]+gray[i+w+1];
    const gy=-gray[i-w-1]-2*gray[i-w]-gray[i-w+1]+gray[i+w-1]+2*gray[i+w]+gray[i+w+1];
    e[i]=Math.min(255,Math.hypot(gx,gy));
  }
  return e;
}

function cleanBinary(bin,w,h,passes){
  if(passes<=0) return bin;
  let a=bin.slice(), b=new Uint8Array(a.length);
  const reps=Math.max(1,Math.floor(passes/7));
  for(let r=0;r<reps;r++){
    for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
      let n=0; for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++) n+=a[(y+yy)*w+x+xx];
      b[y*w+x]= n>=5 ? 1 : 0;
    }
    [a,b]=[b,a]; b.fill(0);
  }
  return a;
}

function connectComponents(bin,w,h,bridge){
  if(bridge<=0) return bin;
  const total=w*h, seen=new Uint8Array(total), comps=[];
  const qx=new Int32Array(total), qy=new Int32Array(total);
  for(let i=0;i<total;i++){
    if(!bin[i]||seen[i]) continue;
    let qs=0,qe=0; qx[qe]=i%w;qy[qe++]=Math.floor(i/w); seen[i]=1;
    let count=0,sx=0,sy=0,minx=w,miny=h,maxx=0,maxy=0;
    while(qs<qe){
      const x=qx[qs],y=qy[qs++], idx=y*w+x; count++; sx+=x; sy+=y;
      if(x<minx)minx=x;if(y<miny)miny=y;if(x>maxx)maxx=x;if(y>maxy)maxy=y;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
        const nx=x+dx,ny=y+dy,ni=ny*w+nx;
        if(nx>=0&&ny>=0&&nx<w&&ny<h&&bin[ni]&&!seen[ni]){seen[ni]=1;qx[qe]=nx;qy[qe++]=ny;}
      });
    }
    if(count>20) comps.push({count,cx:sx/count,cy:sy/count,minx,miny,maxx,maxy});
  }
  if(comps.length<2) return bin;
  comps.sort((a,b)=>b.count-a.count);
  const main=comps[0];
  const out=bin.slice();
  function drawLine(x0,y0,x1,y1,rad){
    const dx=x1-x0,dy=y1-y0,steps=Math.max(Math.abs(dx),Math.abs(dy),1);
    for(let s=0;s<=steps;s++){
      const x=Math.round(x0+dx*s/steps),y=Math.round(y0+dy*s/steps);
      for(let yy=y-rad;yy<=y+rad;yy++)for(let xx=x-rad;xx<=x+rad;xx++){
        if(xx>=0&&yy>=0&&xx<w&&yy<h&&(xx-x)**2+(yy-y)**2<=rad*rad) out[yy*w+xx]=1;
      }
    }
  }
  for(let c=1;c<comps.length;c++){
    const comp=comps[c];
    if(comp.count<18) continue;
    // connect small/floating island to nearest edge of main bounding box
    const tx=Math.max(main.minx,Math.min(main.maxx,comp.cx));
    const ty=Math.max(main.miny,Math.min(main.maxy,comp.cy));
    drawLine(Math.round(comp.cx),Math.round(comp.cy),Math.round(tx),Math.round(ty),Math.max(1,Math.floor(bridge/3)));
  }
  return out;
}

function makeLayers(){
  const imgData=getWorkingImageData(); if(!imgData){setStatus("Add an image first.");return;}
  const w=imgData.width,h=imgData.height;
  let gray=grayscaleArray(imgData);
  const style=$("#styleMode").value;
  gray=blur(gray,w,h,style==="airbrush"?2:style==="logo"?0:1);
  const edges=edgeArray(gray,w,h);
  const n=+$("#layerCount").value;
  const cleanup=+$("#cleanupSize").value, bridge=+$("#bridgeSize").value;
  const invert=$("#invertOutput").checked;
  state.layers=[]; state.svgLayers=[];
  for(let l=0;l<n;l++){
    const low=255-(l+1)*(255/n), high=255-l*(255/n);
    let bin=new Uint8Array(w*h);
    for(let i=0;i<w*h;i++){
      let tone = gray[i];
      let hit = invert ? (tone>=low && tone<high) : (tone<=high && tone>low);
      if($("#edgeBoost").checked && edges[i] > (style==="logo"?45:65) && l < Math.ceil(n*.45)) hit=true;
      bin[i]=hit?1:0;
    }
    bin=cleanBinary(bin,w,h,cleanup);
    if($("#connectIslands").checked) bin=connectComponents(bin,w,h,bridge);
    state.layers.push({bin,w,h,color:state.colors[l%state.colors.length],name:`Layer ${l+1}`});
  }
  renderLayerControls();
  renderPreviews();
  makeSvgLayers();
  setStatus(`Made ${n} improved stencil layers. Floating islands ${$("#connectIslands").checked?"auto-connected":"not connected"}.`);
}

function renderLayerControls(){
  const box=$("#layerControls"); box.innerHTML="";
  state.layers.forEach((ly,i)=>{
    const row=document.createElement("div"); row.className="layerRow";
    row.innerHTML=`<div class="swatch" style="background:${ly.color}"></div>
      <b>${ly.name}</b>
      <input type="color" value="${ly.color}">
      <input type="checkbox" checked>`;
    const color=row.querySelector("input[type=color]");
    color.oninput=()=>{ ly.color=color.value; row.querySelector(".swatch").style.background=ly.color; renderPreviews(); makeSvgLayers(); };
    const on=row.querySelector("input[type=checkbox]");
    on.onchange=()=>{ ly.disabled=!on.checked; renderPreviews(); makeSvgLayers(); };
    box.appendChild(row);
  });
}

function renderPreviews(){
  const box=$("#previews"); box.innerHTML="";
  state.layers.forEach((ly,i)=>{
    if(ly.disabled) return;
    const card=document.createElement("div"); card.className="previewCard";
    const c=document.createElement("canvas"); c.width=ly.w; c.height=ly.h;
    const g=c.getContext("2d"); const im=g.createImageData(ly.w,ly.h);
    const rgb=hexToRgb(ly.color);
    for(let p=0;p<ly.bin.length;p++){
      const k=p*4;
      if(ly.bin[p]){ im.data[k]=rgb.r; im.data[k+1]=rgb.g; im.data[k+2]=rgb.b; im.data[k+3]=255; }
      else { im.data[k]=255; im.data[k+1]=255; im.data[k+2]=255; im.data[k+3]=$("#transparentBg").checked?0:255; }
    }
    g.putImageData(im,0,0);
    if($("#registrationMarks").checked) drawRegMarks(g,ly.w,ly.h);
    card.appendChild(c); const p=document.createElement("p"); p.textContent=ly.name; card.appendChild(p); box.appendChild(card);
  });
}

function drawRegMarks(g,w,h){
  g.strokeStyle="#000"; g.lineWidth=Math.max(3,Math.round(w/250));
  const s=Math.max(18,Math.round(w/35)); const pts=[[s,s],[w-s,s],[s,h-s],[w-s,h-s]];
  pts.forEach(([x,y])=>{g.beginPath();g.moveTo(x-s/2,y);g.lineTo(x+s/2,y);g.moveTo(x,y-s/2);g.lineTo(x,y+s/2);g.stroke();});
}

function hexToRgb(hex){ const n=parseInt(hex.slice(1),16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }

function binToSvgPaths(bin,w,h,color){
  // Rect-run vectorization: laser-safe filled rectangles. Opens in Inkscape/Illustrator/XCS.
  let parts=[];
  for(let y=0;y<h;y++){
    let x=0;
    while(x<w){
      while(x<w && !bin[y*w+x]) x++;
      if(x>=w) break;
      const x0=x;
      while(x<w && bin[y*w+x]) x++;
      parts.push(`<rect x="${x0}" y="${y}" width="${x-x0}" height="1"/>`);
    }
  }
  let regs="";
  if($("#registrationMarks").checked){
    const s=Math.max(18,Math.round(w/35));
    [[s,s],[w-s,s],[s,h-s],[w-s,h-s]].forEach(([x,y])=>{
      regs+=`<path d="M ${x-s/2} ${y} L ${x+s/2} ${y} M ${x} ${y-s/2} L ${x} ${y+s/2}" stroke="#000" stroke-width="${Math.max(3,Math.round(w/250))}" fill="none"/>`;
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <title>StencilForge layer</title>
  <g fill="${color}" stroke="none">${parts.join("")}</g>
  ${regs}
</svg>`;
}

function makeSvgLayers(){
  state.svgLayers=state.layers.filter(l=>!l.disabled).map((ly,i)=>({name:`layer_${i+1}.svg`,svg:binToSvgPaths(ly.bin,ly.w,ly.h,ly.color)}));
}

function safeName(){
  return ($("#projectName").value||"stencilforge_project").toLowerCase().replace(/[^a-z0-9_-]+/g,"_").replace(/^_+|_+$/g,"") || "stencilforge_project";
}
function download(filename,text,type="image/svg+xml"){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type}));
  a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

$("#generateBtn").onclick=makeLayers;
$("#layerCount").oninput=e=>$("#layerCountText").textContent=e.target.value;
$("#bridgeSize").oninput=e=>$("#bridgeText").textContent=e.target.value;
$("#cleanupSize").oninput=e=>$("#cleanupText").textContent=e.target.value;
$("#transparentBg").onchange=renderPreviews;
$("#registrationMarks").onchange=()=>{renderPreviews();makeSvgLayers();};

$("#downloadCombinedBtn").onclick=()=>{
  if(!state.svgLayers.length){setStatus("Make layers first.");return;}
  const w=state.layers[0].w,h=state.layers[0].h;
  let body=state.layers.filter(l=>!l.disabled).map((ly,i)=>`<g id="${ly.name.replace(/\s+/g,"_")}" opacity=".9">${binToSvgPaths(ly.bin,ly.w,ly.h,ly.color).replace(/^[\s\S]*?<g fill="[^"]+" stroke="none">/,"").replace(/<\/g>[\s\S]*$/,"")}</g>`).join("\n");
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
  download(`${safeName()}_combined.svg`,svg);
};

$("#downloadZipBtn").onclick=()=>{
  if(!state.svgLayers.length){setStatus("Make layers first.");return;}
  // Browser-only no zip lib: download each SVG individually.
  state.svgLayers.forEach((l,i)=>setTimeout(()=>download(`${safeName()}_${l.name}`,l.svg),i*180));
  setStatus("Downloaded SVG layer files individually. GitHub build keeps app flat/no external zip library.");
};

$("#saveProjectBtn").onclick=()=>{
  localStorage.setItem("stencilforge_v2_project", JSON.stringify({
    projectName:$("#projectName").value, settings:{
      layers:$("#layerCount").value, bridge:$("#bridgeSize").value, cleanup:$("#cleanupSize").value, style:$("#styleMode").value
    }
  }));
  setStatus("Project settings saved on this device.");
};
$("#loadProjectBtn").onclick=()=>{
  const p=JSON.parse(localStorage.getItem("stencilforge_v2_project")||"null");
  if(!p){setStatus("No saved project found.");return;}
  $("#projectName").value=p.projectName||"stencilforge_project";
  if(p.settings){$("#layerCount").value=p.settings.layers;$("#layerCountText").textContent=p.settings.layers;$("#bridgeSize").value=p.settings.bridge;$("#bridgeText").textContent=p.settings.bridge;$("#cleanupSize").value=p.settings.cleanup;$("#cleanupText").textContent=p.settings.cleanup;$("#styleMode").value=p.settings.style;}
  setStatus("Project settings loaded.");
};

let deferredInstall=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").hidden=false;});
$("#installBtn").onclick=async()=>{ if(deferredInstall){ deferredInstall.prompt(); deferredInstall=null; $("#installBtn").hidden=true; } };
if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{})); }

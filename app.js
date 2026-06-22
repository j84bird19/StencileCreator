
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const cvs=$("#mainCanvas"), ctx=cvs.getContext("2d",{willReadFrequently:true});
const state={img:null,baseData:null,mask:null,tool:"move",history:[],layers:[],crop:null,cropping:false,magic:false,colors:["#151331","#3d32a5","#7358d8","#b493f2","#ed8dff","#2b255c","#5146c8","#9980ee"]};
function status(t){$("#status").textContent=t}
function pushHistory(){if(!state.baseData)return;state.history.push({data:ctx.getImageData(0,0,cvs.width,cvs.height),mask:state.mask?new Int8Array(state.mask):null});if(state.history.length>18)state.history.shift()}
function restoreLast(){const h=state.history.pop();if(!h){status("Nothing to undo.");return}cvs.width=h.data.width;cvs.height=h.data.height;ctx.putImageData(h.data,0,0);state.baseData=ctx.getImageData(0,0,cvs.width,cvs.height);state.mask=h.mask;drawOverlay();status("Undo complete.")}
function loadImg(src){const img=new Image();img.onload=()=>{state.img=img;let max=1200,r=Math.min(max/img.width,max/img.height,1);cvs.width=Math.max(360,Math.round(img.width*r));cvs.height=Math.max(360,Math.round(img.height*r));ctx.fillStyle="#fff";ctx.fillRect(0,0,cvs.width,cvs.height);ctx.drawImage(img,0,0,cvs.width,cvs.height);state.baseData=ctx.getImageData(0,0,cvs.width,cvs.height);state.mask=new Int8Array(cvs.width*cvs.height);state.layers=[];renderLayers();status("Image loaded. Crop or Magic Select before generating.")};img.src=src}
$("#imageInput").onchange=e=>{const f=e.target.files?.[0];if(f)loadImg(URL.createObjectURL(f))};
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");["photoPanel","ideaPanel","settingsPanel"].forEach(id=>$("#"+id).classList.add("hidden"));$("#"+b.dataset.panel).classList.remove("hidden")});
$$(".mask").forEach(b=>b.onclick=()=>{$$(".mask").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.tool=b.dataset.tool;state.magic=false;state.cropping=false});
["brushSize","contrast","brightness","smoothing","detailBoost","minIsland","bridgeThickness","shapeSimplify","regionStrength","bgSuppress","portraitBias"].forEach(id=>{$("#"+id).oninput=e=>{const m={brushSize:"brushVal",contrast:"contrastVal",brightness:"brightVal",smoothing:"smoothVal",detailBoost:"detailVal",minIsland:"islandVal",bridgeThickness:"bridgeVal",shapeSimplify:"shapeSimplifyVal",regionStrength:"regionStrengthVal",bgSuppress:"bgSuppressVal",portraitBias:"portraitBiasVal"};$("#"+m[id]).textContent=e.target.value}});
$("#undoBtn").onclick=restoreLast; $("#resetBtn").onclick=()=>{if(state.img)loadImg(state.img.src)};
$("#cropToolBtn").onclick=()=>{state.cropping=true;state.magic=false;state.crop=null;$("#applyCropBtn").classList.remove("hidden");$("#cancelCropBtn").classList.remove("hidden");status("Drag a box around the area to keep, then tap Apply Crop.")};
$("#cancelCropBtn").onclick=()=>{state.cropping=false;state.crop=null;drawOverlay();$("#applyCropBtn").classList.add("hidden");$("#cancelCropBtn").classList.add("hidden")};
$("#applyCropBtn").onclick=applyCrop; $("#magicToolBtn").onclick=()=>{state.magic=true;state.cropping=false;status("Tap the subject or area you want to keep. Magic Select works best with simple backgrounds.")};
function pos(e){const r=cvs.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:Math.round((t.clientX-r.left)*cvs.width/r.width),y:Math.round((t.clientY-r.top)*cvs.height/r.height)}}
let down=false,start=null;
function pointerDown(e){if(!state.baseData)return;e.preventDefault();down=true;start=pos(e);if(state.cropping){state.crop={x:start.x,y:start.y,w:1,h:1};drawOverlay();return}if(state.magic){pushHistory();magicSelect(start.x,start.y);state.magic=false;drawOverlay();return}if(state.tool!=="move"){pushHistory();paintMask(start.x,start.y,state.tool==="keep"?1:-1)}}
function pointerMove(e){if(!down||!state.baseData)return;e.preventDefault();const p=pos(e);if(state.cropping&&state.crop){state.crop={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(p.x-start.x),h:Math.abs(p.y-start.y)};drawOverlay();return}if(state.tool!=="move")paintMask(p.x,p.y,state.tool==="keep"?1:-1)}
function pointerUp(){down=false}
cvs.addEventListener("mousedown",pointerDown);cvs.addEventListener("touchstart",pointerDown,{passive:false});cvs.addEventListener("mousemove",pointerMove);cvs.addEventListener("touchmove",pointerMove,{passive:false});["mouseup","mouseleave","touchend"].forEach(ev=>cvs.addEventListener(ev,pointerUp));
function paintMask(x,y,val){const r=+$("#brushSize").value,w=cvs.width,h=cvs.height;for(let yy=Math.max(0,y-r);yy<Math.min(h,y+r);yy++)for(let xx=Math.max(0,x-r);xx<Math.min(w,x+r);xx++)if((xx-x)**2+(yy-y)**2<=r*r)state.mask[yy*w+xx]=val;drawOverlay()}
function drawOverlay(){if(!state.baseData)return;ctx.putImageData(state.baseData,0,0);const img=ctx.getImageData(0,0,cvs.width,cvs.height);if(state.mask){for(let i=0;i<state.mask.length;i++){const p=i*4;if(state.mask[i]===1){img.data[p]=25;img.data[p+1]=220;img.data[p+2]=90;img.data[p+3]=170}else if(state.mask[i]===-1){img.data[p]=255;img.data[p+1]=45;img.data[p+2]=55;img.data[p+3]=160}}ctx.putImageData(img,0,0)}if(state.crop){ctx.save();ctx.strokeStyle="#8a55ff";ctx.lineWidth=4;ctx.setLineDash([10,8]);ctx.strokeRect(state.crop.x,state.crop.y,state.crop.w,state.crop.h);ctx.restore()}}
function applyCrop(){if(!state.crop||state.crop.w<20||state.crop.h<20){status("Crop box too small.");return}pushHistory();const c=state.crop;const data=ctx.getImageData(c.x,c.y,c.w,c.h);cvs.width=c.w;cvs.height=c.h;ctx.putImageData(data,0,0);state.baseData=ctx.getImageData(0,0,cvs.width,cvs.height);state.mask=new Int8Array(cvs.width*cvs.height);state.crop=null;state.cropping=false;$("#applyCropBtn").classList.add("hidden");$("#cancelCropBtn").classList.add("hidden");status("Crop applied.")}
function magicSelect(sx,sy){const data=state.baseData.data,w=cvs.width,h=cvs.height,idx=(sy*w+sx)*4,seed=[data[idx],data[idx+1],data[idx+2]],q=[sx,sy],seen=new Uint8Array(w*h);let qi=0,tol=80,count=0;while(qi<q.length&&count<w*h*.72){const x=q[qi++],y=q[qi++];if(x<0||y<0||x>=w||y>=h)continue;const id=y*w+x;if(seen[id])continue;seen[id]=1;const p=id*4,d=Math.abs(data[p]-seed[0])+Math.abs(data[p+1]-seed[1])+Math.abs(data[p+2]-seed[2]);if(d>tol)continue;state.mask[id]=1;count++;q.push(x+1,y,x-1,y,x,y+1,x,y-1)}status("Magic selection added. Use Keep/Remove brush to refine.")}
function adjustedGray(){const d=state.baseData,w=cvs.width,h=cvs.height,out=new Float32Array(w*h),con=1+(+$("#contrast").value/80),bri=+$("#brightness").value;for(let i=0;i<w*h;i++){const p=i*4;let v=.299*d.data[p]+.587*d.data[p+1]+.114*d.data[p+2];v=(v-128)*con+128+bri;if(state.mask?.[i]===-1)v=255;out[i]=Math.max(0,Math.min(255,v))}return out}
function blur(src,w,h,r){if(r<=0)return src.slice();let tmp=new Float32Array(src.length),out=new Float32Array(src.length);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let k=-r;k<=r;k++){let xx=Math.max(0,Math.min(w-1,x+k));s+=src[y*w+xx];n++}tmp[y*w+x]=s/n}for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let k=-r;k<=r;k++){let yy=Math.max(0,Math.min(h-1,y+k));s+=tmp[yy*w+x];n++}out[y*w+x]=s/n}return out}
function edges(gray,w,h){let e=new Float32Array(w*h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let i=y*w+x,gx=-gray[i-w-1]-2*gray[i-1]-gray[i+w-1]+gray[i-w+1]+2*gray[i+1]+gray[i+w+1],gy=-gray[i-w-1]-2*gray[i-w]-gray[i-w+1]+gray[i+w-1]+2*gray[i+w]+gray[i+w+1];e[i]=Math.min(255,Math.hypot(gx,gy))}return e}
function clean(bin,w,h,reps){let a=bin,b=new Uint8Array(bin.length);for(let r=0;r<reps;r++){for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let n=0;for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)n+=a[(y+yy)*w+x+xx];b[y*w+x]=n>=5?1:0}[a,b]=[b,a];b.fill(0)}return a}
function processIslands(bin,w,h){const min=+$("#minIsland").value,bridge=+$("#bridgeThickness").value,seen=new Uint8Array(w*h),comps=[];for(let i=0;i<w*h;i++){if(!bin[i]||seen[i])continue;let q=[i],qi=0,pix=[],sx=0,sy=0,minx=w,miny=h,maxx=0,maxy=0;seen[i]=1;while(qi<q.length){let id=q[qi++],x=id%w,y=Math.floor(id/w);pix.push(id);sx+=x;sy+=y;minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y);[1,-1,w,-w].forEach(o=>{let ni=id+o,nx=ni%w,ny=Math.floor(ni/w);if(ni>=0&&ni<w*h&&Math.abs(nx-x)+Math.abs(ny-y)===1&&bin[ni]&&!seen[ni]){seen[ni]=1;q.push(ni)}})}comps.push({pix,count:pix.length,cx:sx/pix.length,cy:sy/pix.length,minx,miny,maxx,maxy})}if(!comps.length)return bin;comps.sort((a,b)=>b.count-a.count);let out=new Uint8Array(bin.length);comps.forEach((c,i)=>{if(i===0||!$("#removeSmall").checked||c.count>=min)c.pix.forEach(p=>out[p]=1)});if(bridge>0&&comps.length>1){let main=comps[0];for(let i=1;i<comps.length;i++){let c=comps[i];if(c.count<min)continue;let tx=Math.max(main.minx,Math.min(main.maxx,c.cx)),ty=Math.max(main.miny,Math.min(main.maxy,c.cy));drawLine(out,w,h,c.cx,c.cy,tx,ty,Math.max(1,Math.round(bridge/3)))}}return out}
function drawLine(bin,w,h,x0,y0,x1,y1,r){let steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);for(let s=0;s<=steps;s++){let x=Math.round(x0+(x1-x0)*s/steps),y=Math.round(y0+(y1-y0)*s/steps);for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++)if(xx>=0&&yy>=0&&xx<w&&yy<h&&(xx-x)**2+(yy-y)**2<=r*r)bin[yy*w+xx]=1}}

function imageComplexityScore(){
  if(!state.baseData) return {score:0,recommended:3,msg:"Upload an image first."};
  const w=cvs.width,h=cvs.height;
  const gray=adjustedGray();
  const ed=edges(gray,w,h);
  let edgeSum=0,dark=0,samples=0;
  for(let i=0;i<gray.length;i+=4){
    edgeSum+=ed[i];
    if(gray[i]<150) dark++;
    samples++;
  }
  const edgeAvg=edgeSum/Math.max(1,samples);
  const darkRatio=dark/Math.max(1,samples);
  const score=Math.min(100,Math.round(edgeAvg*1.1+darkRatio*35));
  let recommended=3;
  if(score<25) recommended=1;
  else if(score<40) recommended=2;
  else if(score<58) recommended=3;
  else if(score<76) recommended=4;
  else recommended=5;
  return {score,recommended,msg:`Complexity ${score}/100 → recommended ${recommended} stencil${recommended>1?"s":""}.`};
}
function analyzeAndRecommend(){
  const r=imageComplexityScore();
  const box=$("#recommendText");
  if(box) box.textContent=r.msg;
  const auto=$("#autoRecommend");
  if(state.baseData && auto && auto.checked) $("#layerCount").value=String(r.recommended);
  return r;
}
function toneLayerData(){
  const w=cvs.width,h=cvs.height,n=+$("#layerCount").value;
  let gray=adjustedGray();
  const conversion=$("#conversionMode")?.value||"grayscale";
  const detail=$("#toneDetail")?.value||"standard";
  let smoothPx=Math.round(+$("#smoothing").value/(detail==="detailed"?28:detail==="major"?12:18));
  gray=blur(gray,w,h,smoothPx);
  const ed=edges(gray,w,h);
  let detailBoost=+$("#detailBoost").value;
  if(detail==="major") detailBoost*=0.45;
  if(detail==="detailed") detailBoost*=1.35;
  const layers=[];
  for(let l=0;l<n;l++){
    const low=255-(l+1)*255/n, high=255-l*255/n;
    let bin=new Uint8Array(w*h);
    for(let i=0;i<w*h;i++){
      let v=gray[i];
      if(conversion==="bw") v=v<128?0:255;
      let hit=n===1 ? v<210 : (v>=low&&v<high);
      if(detailBoost&&ed[i]>(105-detailBoost)&&l<Math.ceil(n*.55)) hit=true;
      if(state.mask?.[i]===-1) hit=false;
      bin[i]=hit?1:0;
    }
    if($("#edgeClean").checked) bin=clean(bin,w,h,Math.max(1,Math.round(+$("#smoothing").value/25)));
    bin=processIslands(bin,w,h);
    layers.push({name:`Tone Layer ${l+1}`,color:state.colors[l%state.colors.length],bin,w,h,visible:true});
  }
  return layers;
}
function colorLayerData(){
  const d=state.baseData,w=cvs.width,h=cvs.height,n=+$("#layerCount").value;
  const buckets=[];
  for(let i=0;i<n;i++) buckets.push({r:0,g:0,b:0,count:0,bin:new Uint8Array(w*h)});
  for(let i=0;i<w*h;i++){
    if(state.mask?.[i]===-1) continue;
    const p=i*4;
    const r=d.data[p],g=d.data[p+1],b=d.data[p+2];
    const max=Math.max(r,g,b),min=Math.min(r,g,b),light=(max+min)/2;
    let hue=0;
    if(max!==min){
      const diff=max-min;
      if(max===r) hue=(60*((g-b)/diff)+360)%360;
      else if(max===g) hue=60*((b-r)/diff)+120;
      else hue=60*((r-g)/diff)+240;
    }
    let idx=Math.floor(((hue/360)*0.65+((255-light)/255)*0.35)*n);
    idx=Math.max(0,Math.min(n-1,idx));
    buckets[idx].r+=r; buckets[idx].g+=g; buckets[idx].b+=b; buckets[idx].count++;
    buckets[idx].bin[i]=1;
  }
  return buckets.map((b,i)=>{
    let color=state.colors[i%state.colors.length];
    if(b.count>0){
      const r=Math.round(b.r/b.count),g=Math.round(b.g/b.count),bb=Math.round(b.b/b.count);
      color="#"+[r,g,bb].map(x=>x.toString(16).padStart(2,"0")).join("");
    }
    let bin=b.bin;
    if($("#edgeClean").checked) bin=clean(bin,w,h,Math.max(1,Math.round(+$("#smoothing").value/32)));
    bin=processIslands(bin,w,h);
    return {name:`Color Layer ${i+1}`,color,bin,w,h,visible:true};
  });
}
function mixedLayerData(){
  const n=+$("#layerCount").value;
  if(n===1) return toneLayerData();
  const tone=toneLayerData();
  const color=colorLayerData();
  const tCount=Math.ceil(n/2);
  const cCount=n-tCount;
  return [...tone.slice(0,tCount),...color.slice(0,cCount)].slice(0,n).map((l,i)=>({...l,name:`Mixed Layer ${i+1}`}));
}



/* ---------- V6 Portrait / Airbrush Stencil Engine ---------- */
function v6Settings(){
  return {
    strategy: $("#stencilStrategy")?.value || "portrait",
    mode: $("#layerMode")?.value || "tone",
    n: +($("#layerCount")?.value || 5),
    simplify: +($("#shapeSimplify")?.value || 55),
    region: +($("#regionStrength")?.value || 62),
    smoothing: +($("#smoothing")?.value || 42),
    detail: +($("#detailBoost")?.value || 22),
    cleanup: $("#subjectCleanup")?.value || "soft",
    bgSuppress: +($("#bgSuppress")?.value || 55),
    portraitBias: +($("#portraitBias")?.value || 62)
  };
}
function clamp255(v){ return Math.max(0, Math.min(255, v)); }
function v6SourceData(settings){
  const d=state.baseData, w=cvs.width, h=cvs.height;
  const out=new ImageData(w,h);
  const src=d.data, dst=out.data;
  // Estimate border/background color from edges
  let br=0,bg=0,bb=0,n=0;
  const step=Math.max(4,Math.floor(Math.min(w,h)/120));
  for(let x=0;x<w;x+=step){
    for(const y of [0,h-1]){
      const p=(y*w+x)*4; br+=src[p]; bg+=src[p+1]; bb+=src[p+2]; n++;
    }
  }
  for(let y=0;y<h;y+=step){
    for(const x of [0,w-1]){
      const p=(y*w+x)*4; br+=src[p]; bg+=src[p+1]; bb+=src[p+2]; n++;
    }
  }
  br/=n; bg/=n; bb/=n;
  const cx=w*.52, cy=h*.46;
  const rx=w*.43, ry=h*.52;
  for(let i=0;i<w*h;i++){
    const p=i*4, x=i%w, y=Math.floor(i/w);
    let r=src[p], g=src[p+1], b=src[p+2], a=src[p+3];
    const bgDist=Math.abs(r-br)+Math.abs(g-bg)+Math.abs(b-bb);
    const dx=(x-cx)/rx, dy=(y-cy)/ry;
    const centerWeight=Math.max(0, 1 - (dx*dx+dy*dy));
    const skinScore=v6SkinScore(r,g,b);
    const darkScore=(255-(.299*r+.587*g+.114*b))/255;
    let keep = 1;
    if(settings.cleanup!=="off"){
      const suppress=settings.bgSuppress;
      const bgLike = bgDist < (settings.cleanup==="strong" ? 75+suppress*.9 : 55+suppress*.65);
      const farFromSubject = centerWeight < (settings.cleanup==="strong" ? .08 : .02);
      const weakSubject = skinScore < .18 && darkScore < .28;
    }
    // JS does not have Python's "and"; keep logic below intentionally explicit.
    let bgLike = bgDist < (settings.cleanup==="strong" ? 75+settings.bgSuppress*.9 : 55+settings.bgSuppress*.65);
    let farFromSubject = centerWeight < (settings.cleanup==="strong" ? .08 : .02);
    let weakSubject = skinScore < .18 && darkScore < .28;
    if(settings.cleanup!=="off" && bgLike && farFromSubject && weakSubject) keep=.18;
    if(settings.cleanup==="strong" && centerWeight<.015 && bgDist<145) keep=.05;
    if(state.mask?.[i]===1) keep=1;
    if(state.mask?.[i]===-1) keep=0;
    // brighten suppressed background so it doesn't become stencil detail
    if(keep<.35){ r=245;g=245;b=245;a=255; }
    dst[p]=r; dst[p+1]=g; dst[p+2]=b; dst[p+3]=a;
  }
  return out;
}
function v6SkinScore(r,g,b){
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  const skin = (r>75 && g>40 && b>25 && r>g && r>b && max-min>15) ? 1 : 0;
  const lightSkin = (r>120 && g>85 && b>65 && r>=g && g>=b-10) ? .75 : 0;
  return Math.max(skin, lightSkin);
}
function v6GrayFromData(imgData, settings){
  const w=imgData.width,h=imgData.height,src=imgData.data;
  let gray=new Float32Array(w*h);
  const con=1+(+($("#contrast")?.value||28)/80), bri=+($("#brightness")?.value||0);
  for(let i=0;i<w*h;i++){
    const p=i*4, r=src[p], g=src[p+1], b=src[p+2];
    let v=.299*r+.587*g+.114*b;
    const skin=v6SkinScore(r,g,b);
    const dark=(255-v)/255;
    // Portrait bias preserves face/hair/tattoo/shadow information while dumping flat background.
    if(settings.strategy==="portrait" || settings.cleanup!=="off"){
      if(skin>.3) v = v - settings.portraitBias*.10;
      if(dark>.46) v = v - settings.portraitBias*.16;
    }
    v=(v-128)*con+128+bri;
    gray[i]=clamp255(v);
  }
  return gray;
}
function v6Dilate(bin,w,h,rad=1){
  let out=new Uint8Array(bin.length);
  for(let y=rad;y<h-rad;y++)for(let x=rad;x<w-rad;x++){
    let hit=0;
    for(let yy=-rad;yy<=rad;yy++)for(let xx=-rad;xx<=rad;xx++){
      if(bin[(y+yy)*w+x+xx]) hit=1;
    }
    out[y*w+x]=hit;
  }
  return out;
}
function v6Erode(bin,w,h,rad=1){
  let out=new Uint8Array(bin.length);
  const need=(rad*2+1)*(rad*2+1)*.48;
  for(let y=rad;y<h-rad;y++)for(let x=rad;x<w-rad;x++){
    let n=0;
    for(let yy=-rad;yy<=rad;yy++)for(let xx=-rad;xx<=rad;xx++) n+=bin[(y+yy)*w+x+xx];
    out[y*w+x]=n>=need?1:0;
  }
  return out;
}
function v6CleanRegion(bin,w,h,settings,layerIndex){
  let a=bin;
  const baseRad = settings.strategy==="cartoon" ? 2 : 1;
  const reps = Math.max(1, Math.round(settings.simplify/32));
  for(let i=0;i<reps;i++) a=v6Dilate(a,w,h,baseRad);
  for(let i=0;i<reps;i++) a=v6Erode(a,w,h,baseRad);
  if(settings.simplify>25) a=clean(a,w,h,Math.max(1,Math.round(settings.simplify/28)));
  a=v6RemoveComponents(a,w,h,Math.round(settings.region*(layerIndex<=1?1.8:1.15)));
  a=processIslands(a,w,h);
  return a;
}
function v6RemoveComponents(bin,w,h,minSize){
  const seen=new Uint8Array(w*h), out=new Uint8Array(w*h);
  for(let i=0;i<w*h;i++){
    if(!bin[i]||seen[i]) continue;
    let q=[i], pix=[], qi=0, minx=w,miny=h,maxx=0,maxy=0; seen[i]=1;
    while(qi<q.length){
      let id=q[qi++], x=id%w, y=Math.floor(id/w);
      pix.push(id); minx=Math.min(minx,x); maxx=Math.max(maxx,x); miny=Math.min(miny,y); maxy=Math.max(maxy,y);
      [1,-1,w,-w].forEach(o=>{
        let ni=id+o, nx=ni%w, ny=Math.floor(ni/w);
        if(ni>=0&&ni<w*h&&Math.abs(nx-x)+Math.abs(ny-y)===1&&bin[ni]&&!seen[ni]){
          seen[ni]=1; q.push(ni);
        }
      });
    }
    const width=maxx-minx+1, height=maxy-miny+1;
    const keep = pix.length>=minSize || (width>Math.min(w,h)*.18 && height>Math.min(w,h)*.18);
    if(keep) pix.forEach(p=>out[p]=1);
  }
  return out;
}
function v6EdgeMap(gray,w,h,settings){
  const e=edges(gray,w,h);
  let bin=new Uint8Array(w*h);
  const threshold = settings.strategy==="portrait" ? 92-settings.detail*.55 : 105-settings.detail*.45;
  for(let i=0;i<w*h;i++){
    if(e[i]>threshold) bin[i]=1;
    if(state.mask?.[i]===-1) bin[i]=0;
  }
  return v6CleanRegion(bin,w,h,{...settings,simplify:Math.min(settings.simplify,45),region:settings.region*.6},2);
}
function v6ToneLayers(){
  const settings=v6Settings(), src=v6SourceData(settings), w=src.width,h=src.height,n=settings.n;
  let gray=v6GrayFromData(src,settings);
  const smoothPx=Math.max(1,Math.round(settings.smoothing/(settings.strategy==="portrait"?20:16)));
  gray=blur(gray,w,h,smoothPx);
  const edgeLayer=v6EdgeMap(gray,w,h,settings);
  let layers=[];
  for(let l=0;l<n;l++){
    const low=255-(l+1)*255/n, high=255-l*255/n;
    let bin=new Uint8Array(w*h);
    for(let i=0;i<w*h;i++){
      let v=gray[i];
      let hit = n===1 ? v<220 : (v>=low && v<high);
      if(l===0 && edgeLayer[i]) hit=true;
      if(l===1 && edgeLayer[i] && settings.strategy==="portrait") hit=true;
      if(state.mask?.[i]===-1) hit=false;
      bin[i]=hit?1:0;
    }
    bin=v6CleanRegion(bin,w,h,settings,l);
    layers.push(bin);
  }
  return {bins:layers,w,h};
}
function v6ColorLayers(){
  const settings=v6Settings(), src=v6SourceData(settings), w=src.width,h=src.height,n=settings.n;
  const bins=Array.from({length:n},()=>new Uint8Array(w*h));
  const data=src.data;
  for(let i=0;i<w*h;i++){
    if(state.mask?.[i]===-1) continue;
    const p=i*4,r=data[p],g=data[p+1],b=data[p+2];
    const max=Math.max(r,g,b),min=Math.min(r,g,b),light=(max+min)/2;
    let hue=0;
    if(max!==min){
      const diff=max-min;
      if(max===r) hue=(60*((g-b)/diff)+360)%360;
      else if(max===g) hue=60*((b-r)/diff)+120;
      else hue=60*((r-g)/diff)+240;
    }
    const skin=v6SkinScore(r,g,b);
    let idx=Math.floor(((hue/360)*.42+((255-light)/255)*.48+skin*.10)*n);
    idx=Math.max(0,Math.min(n-1,idx));
    bins[idx][i]=1;
  }
  return {bins:bins.map((b,i)=>v6CleanRegion(b,w,h,settings,i)),w,h};
}
function v6GenerateLayers(){
  if(!state.baseData){status("Upload image first.");return}
  if($("#autoRecommend")?.checked) analyzeAndRecommend();
  const settings=v6Settings();
  let result;
  if(settings.mode==="color") result=v6ColorLayers();
  else if(settings.mode==="both"){
    const tone=v6ToneLayers();
    const color=v6ColorLayers();
    const half=Math.ceil(settings.n/2);
    result={bins:[...tone.bins.slice(0,half),...color.bins.slice(0,settings.n-half)],w:tone.w,h:tone.h};
  } else result=v6ToneLayers();
  const names=["Base Silhouette","Deep Shadows","Mid Shadows","Light Details","Highlights"];
  state.layers=result.bins.slice(0,settings.n).map((bin,i)=>({
    name:names[i]||`Stencil ${i+1}`,
    color:state.colors[i%state.colors.length],
    bin,w:result.w,h:result.h,visible:true
  }));
  renderLayers();
  status(`V6 generated ${state.layers.length} portrait-clean stencil${state.layers.length>1?"s":""}.`);
}
function v6SvgRegions(ly){
  const w=ly.w,h=ly.h,bin=ly.bin;
  const simplify=+($("#shapeSimplify")?.value||55);
  const step=Math.max(2,Math.round(simplify/22));
  const rx=Math.max(1,simplify/48);
  let rects=[];
  for(let y=0;y<h;y+=step){
    let x=0;
    while(x<w){
      while(x<w&&!bin[y*w+x]) x+=step;
      if(x>=w) break;
      let x0=x;
      while(x<w&&bin[y*w+x]) x+=step;
      rects.push(`<rect x="${x0}" y="${y}" width="${x-x0}" height="${step}" rx="${rx}" ry="${rx}"/>`);
    }
  }
  return `<g fill="${ly.color}" stroke="none">${rects.join("")}</g>`;
}
function svgFor(ly){
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ly.w} ${ly.h}" width="${ly.w}" height="${ly.h}"><title>${ly.name}</title>${v6SvgRegions(ly)}${$("#registration").checked?regSvg(ly.w,ly.h):""}</svg>`;
}
function generate(){ v6GenerateLayers(); }
$("#generateBtn").onclick=generate;


if($("#recommendBtn")) $("#recommendBtn").onclick=()=>{const r=analyzeAndRecommend();status(r.msg);};
function renderLayers(){const lc=$("#layerControls"),pr=$("#previews");lc.innerHTML="";pr.innerHTML="";state.layers.forEach((ly,i)=>{let row=document.createElement("div");row.className="layerRow";row.innerHTML=`<div class="swatch" style="background:${ly.color}"></div><div><b>${ly.name}</b><br><small>${i===0?"Darkest":i===state.layers.length-1?"Lightest":"Tone"}</small></div><button class="eye">${ly.visible?"◉":"○"}</button>`;row.querySelector(".swatch").onclick=()=>{let inp=document.createElement("input");inp.type="color";inp.value=ly.color;inp.oninput=()=>{ly.color=inp.value;renderLayers()};inp.click()};row.querySelector(".eye").onclick=()=>{ly.visible=!ly.visible;renderLayers()};lc.appendChild(row);if(ly.visible){let card=document.createElement("div");card.className="preview";let c=document.createElement("canvas");c.width=ly.w;c.height=ly.h;drawLayerCanvas(c,ly);card.appendChild(c);let p=document.createElement("p");p.textContent=ly.name;card.appendChild(p);pr.appendChild(card)}})}
function drawLayerCanvas(c,ly){let g=c.getContext("2d");g.clearRect(0,0,c.width,c.height);if($("#showBg").checked){g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height)}g.fillStyle=ly.color;g.filter=`blur(${Math.max(0,+$("#smoothing").value/45)}px)`;let path=new Path2D();for(let y=0;y<ly.h;y++){let x=0;while(x<ly.w){while(x<ly.w&&!ly.bin[y*ly.w+x])x++;if(x>=ly.w)break;let x0=x;while(x<ly.w&&ly.bin[y*ly.w+x])x++;path.rect(x0,y,x-x0,1)}}g.fill(path);g.filter="none";if($("#registration").checked)drawReg(g,ly.w,ly.h)}
function drawReg(g,w,h){g.strokeStyle="#111";g.lineWidth=Math.max(3,w/250);let s=Math.max(20,w/32);[[s,s],[w-s,s],[s,h-s],[w-s,h-s]].forEach(([x,y])=>{g.beginPath();g.moveTo(x-s/2,y);g.lineTo(x+s/2,y);g.moveTo(x,y-s/2);g.lineTo(x,y+s/2);g.stroke()})}
function svgRects(ly){let rects=[],step=2,rx=Math.max(.5,+$("#smoothing").value/80);for(let y=0;y<ly.h;y+=step){let x=0;while(x<ly.w){while(x<ly.w&&!ly.bin[y*ly.w+x])x+=step;if(x>=ly.w)break;let x0=x;while(x<ly.w&&ly.bin[y*ly.w+x])x+=step;rects.push(`<rect x="${x0}" y="${y}" width="${x-x0}" height="${step}" rx="${rx}" ry="${rx}"/>`)}}return rects.join("")}
function regSvg(w,h){let s=Math.max(20,w/32),sw=Math.max(3,w/250),o="";[[s,s],[w-s,s],[s,h-s],[w-s,h-s]].forEach(([x,y])=>{o+=`<path d="M${x-s/2} ${y}L${x+s/2} ${y}M${x} ${y-s/2}L${x} ${y+s/2}" stroke="#111" stroke-width="${sw}" fill="none"/>`});return o}
function svgFor(ly){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ly.w} ${ly.h}" width="${ly.w}" height="${ly.h}"><title>${ly.name}</title>${traceBoundarySvg(ly)}${$("#registration").checked?regSvg(ly.w,ly.h):""}</svg>`}
function safe(){return ($("#projectName").value||"stencilforge_project").toLowerCase().replace(/[^a-z0-9_-]+/g,"_")}
function dl(name,text,type="image/svg+xml"){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$("#downloadLayersBtn").onclick=()=>{let ls=state.layers.filter(l=>l.visible);if(!ls.length){status("Generate layers first.");return}ls.forEach((l,i)=>setTimeout(()=>dl(`${safe()}_${l.name.replace(/\s+/g,"_").toLowerCase()}.svg`,svgFor(l)),i*220));status("Downloading individual SVG layer files.")}
$("#downloadCombinedBtn").onclick=()=>{let ls=state.layers.filter(l=>l.visible);if(!ls.length){status("Generate layers first.");return}let w=ls[0].w,h=ls[0].h,body=ls.map(l=>`<g id="${l.name.replace(/\s+/g,"_")}">${v6SvgRegions(l)}</g>`).join("\n");dl(`${safe()}_combined.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}${$("#registration").checked?regSvg(w,h):""}</svg>`)}
$("#saveBtn").onclick=()=>{localStorage.setItem("stencilforge_v3",JSON.stringify({name:$("#projectName").value,settings:{layerCount:$("#layerCount").value,preset:$("#preset").value,contrast:$("#contrast").value,brightness:$("#brightness").value,smoothing:$("#smoothing").value,detailBoost:$("#detailBoost").value,minIsland:$("#minIsland").value,bridgeThickness:$("#bridgeThickness").value,layerMode:$("#layerMode")?.value,conversionMode:$("#conversionMode")?.value,toneDetail:$("#toneDetail")?.value,autoRecommend:$("#autoRecommend")?.checked}}));status("Project settings saved.")}
$("#loadBtn").onclick=()=>{let p=JSON.parse(localStorage.getItem("stencilforge_v3")||"null");if(!p){status("No saved project found.");return}$("#projectName").value=p.name||"stencilforge_project";Object.entries(p.settings||{}).forEach(([k,v])=>{let el=$("#"+k);if(el){el.value=v;el.dispatchEvent(new Event("input"))}});status("Project settings loaded.")}
$("#ideaBtn").onclick=()=>{let text=$("#ideaText").value||"cute stencil creature";let c=document.createElement("canvas");c.width=900;c.height=900;let g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,900,900);g.fillStyle="#d97cff";g.beginPath();g.arc(185,185,32,0,7);g.fill();g.fillStyle="#4d3fb7";g.beginPath();g.ellipse(455,455,185,245,0,0,7);g.fill();g.fillStyle="#8f6bff";g.beginPath();g.ellipse(455,330,150,115,0,0,7);g.fill();g.fillStyle="#4d3fb7";g.beginPath();g.moveTo(335,280);g.lineTo(285,120);g.lineTo(410,245);g.moveTo(575,280);g.lineTo(625,120);g.lineTo(500,245);g.fill();g.fillStyle="#fff";g.beginPath();g.arc(405,330,28,0,7);g.arc(505,330,28,0,7);g.fill();g.fillStyle="#21183f";g.beginPath();g.arc(405,330,12,0,7);g.arc(505,330,12,0,7);g.fill();g.strokeStyle="#21183f";g.lineWidth=18;g.beginPath();g.moveTo(325,500);g.quadraticCurveTo(180,380,140,620);g.moveTo(585,500);g.quadraticCurveTo(730,380,770,620);g.stroke();g.fillStyle="#4d3fb7";g.font="bold 32px system-ui";g.textAlign="center";g.fillText(text.slice(0,48),450,840);loadImg(c.toDataURL())}
let deferred=null;window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#installBtn").hidden=false});$("#installBtn").onclick=()=>{if(deferred){deferred.prompt();deferred=null;$("#installBtn").hidden=true}};if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));

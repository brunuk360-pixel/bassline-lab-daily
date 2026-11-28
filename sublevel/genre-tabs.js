/* One editorial tab contract across all native genre rooms. Preserve native handlers/content. */
(()=>{
"use strict";
const app=document.getElementById("app"),D=window.__slDiscovery;
if(!app||!D)return;
const norm=s=>(s||"").toLowerCase().replace(/[^a-z0-9]/g,"");
const standard=[["discover10","Discover · 10"],["top10","Top 10"],["newreleases","New releases"],["abletontips","Ableton tips"],["bassculture","Bass culture"]];
const aliases={discover:"discover10",archivepicks:"top10",topten:"top10",newmusic:"newreleases",latestreleases:"newreleases",productiontips:"abletontips",production:"abletontips",ableton:"abletontips",culture:"bassculture",sceneculture:"bassculture"};
const key=b=>aliases[norm(b.textContent)]||norm(b.textContent);
const notes={
 "drumbass":["Program a broken kick/snare pattern, then shape bass movement around the snare. Keep the sub in mono and audition it with the drums.","Listen to the relationship between breakbeats, sub-bass and the dancefloor; compare liquid, jungle and heavier styles.","drum|d&b|jungle|neurofunk|techstep"],
 "ukgarage":["Use a two-step drum pattern, Groove Pool swing on hats and a short syncopated bass line. Compare straight and swung versions.","Explore how shuffled percussion, vocal chops and bassline movement distinguish garage from straight four-on-the-floor house.","garage|uk bass|bassline"],
 "house":["Start with a four-on-the-floor kick, offbeat hats and a short chord stab. Use subtle velocity changes and sidechain compression.","Compare the role of repetition, groove and vocal samples across deep, soulful and club-oriented house.","house"],
 "techhouse":["Build a rolling percussion loop with space for a short bass motif; automate small changes over eight or sixteen bars.","Focus on long-form club arrangements and the interplay between minimal hooks and percussion.","tech house"],
 "techno":["Use a repeating synth pulse, automate filter cutoff slowly and compare dry percussion with a restrained send reverb.","Explore the contrast between hypnotic repetition, machine-like percussion and evolving texture.","techno"],
 "trance":["Layer an arpeggio with a sustained pad, automate a high-pass filter during the build, and preserve headroom for the drop.","Listen for tension and release through melody, rising texture and extended club arrangements.","trance"],
 "dubstep":["Write a half-time drum groove, use a clean sub and automate a separate mid-bass patch. Check phase in mono.","Compare spacious 140 BPM sound-system music with more aggressive bass-driven approaches.","dubstep|140"],
 "breakbeatbigbeat":["Chop a drum loop in Simpler, rearrange its slices and audition different swing settings before adding bass.","Explore how sampled breaks and syncopation drive breakbeat and big beat records.","breakbeat|big beat|breaks"],
 "hiphop":["Slice a sample you have permission to use, lay a pocketed kick/snare groove and vary hat velocity. Leave space for a vocal.","Listen for how sampling, rhythm and wordplay interact with production and performance.","hip hop|hip-hop"],
 "grime":["Try a sparse half-time 140 BPM beat with sharp percussion, a simple sub and short synth stabs. Leave room for MCs.","Explore the interaction of pirate-radio-style sets, MC performances and stripped-back instrumentals.","grime"],
 "rb":["Build a soft chord progression with a Rhodes-style instrument, offset percussion slightly and leave space for vocal phrases.","Compare vocal phrasing, harmony and rhythmic feel across contemporary R&B.","r&b|rhythm and blues"],
 "soul":["Record or program a warm keyboard progression, vary note timing and use gentle compression rather than quantising every note.","Focus on expressive vocals, live-feeling rhythm sections and harmonic movement.","soul"],
 "funkdisco":["Program a syncopated bass line and muted chord stabs; adjust note length and velocity until the groove locks with the kick.","Compare bass-led funk grooves and extended disco arrangements.","funk|disco"],
 "rock":["Record guitar and bass on separate tracks, balance against the drums and use EQ to make room for the vocal.","Explore how guitar texture, riffs and live-band dynamics shape rock recordings.","rock"],
 "indiealternative":["Layer a clean guitar or synth motif with contrasting texture and use automation to shape verse-to-chorus dynamics.","Listen for unconventional arrangements, distinctive timbres and independent production approaches.","indie|alternative"],
 "metal":["Double-track a guitar part, pan the takes, and use high-pass EQ carefully to leave space for bass and kick.","Compare riff structure, changes in intensity and the interaction between drums and guitars.","metal"],
 "pop":["Build a clear verse/chorus arrangement, layer the hook sparingly and compare vocal levels against the instrumental.","Study memorable hooks, melodic repetition and contrasts between sections.","pop"],
 "afrobeats":["Use interlocking percussion, a melodic bass motif and short chord accents; experiment with syncopation rather than filling every beat.","Listen to the relationship between percussion, melodic patterns and vocal phrasing.","afrobeats|afrobeat"],
 "reggaedub":["Place chord chops on offbeats and automate a return-track delay or spring-style reverb. Keep feedback levels under control.","Explore sound-system bass, rhythmic space and creative use of echo and mixing.","reggae|dub(?!step)"],
 "triphopdowntempo":["Slow a breakbeat, add a textured pad and experiment with saturation and long, low-level delay sends.","Compare spacious arrangements, smoky textures and slower grooves across trip-hop and downtempo.","trip-hop|downtempo|ambient"]
};
const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!=null)n.textContent=txt;return n};
const button=(txt,fn,cls)=>{const b=make("button",cls,txt);b.type="button";b.addEventListener("click",fn);return b};
let extra=null,previous=[],room="",tabBar=null;
const title=()=>app.querySelector(".roomhead .roomcopy h1")?.textContent.trim()||app.querySelector(".roomhead h1")?.textContent.trim()||"";
function clear(){
 if(!extra)return;
 extra.remove();extra=null;delete app.dataset.slGenreExtra;
 for(const [b,cls,selected,pressed] of previous){if(!b.isConnected)continue;b.className=cls;for(const [attr,val] of [["aria-selected",selected],["aria-pressed",pressed]]){if(val===null)b.removeAttribute(attr);else b.setAttribute(attr,val)}}
 previous=[];
}
function show(b,id,name,tabs){
 clear();
 previous=[...tabs.querySelectorAll("button")].map(n=>[n,n.className,n.getAttribute("aria-selected"),n.getAttribute("aria-pressed")]);
 for(const [n] of previous){n.classList.remove("active","on","selected","current");n.setAttribute("aria-pressed",String(n===b))}
 b.classList.add("active");app.dataset.slGenreExtra=id;
 const panel=make("section","sl-genre-extra");panel.dataset.genre=name;panel.dataset.section=id;panel.setAttribute("aria-label",name+" "+b.textContent);
 const info=notes[norm(name)]||["Build a short loop, compare timing and balance, then arrange contrasting sections.","Listen closely to groove, arrangement and production choices.","^$"];
 const header=make("header","sl-genre-editorial");const photo=make("img");photo.src="section-art/"+(id==="abletontips"?"warehouse":id==="bassculture"?"underground":"genres")+".jpg";photo.alt="";photo.addEventListener("error",()=>photo.remove(),{once:true});
 const copy=make("div");copy.append(make("span","sl-genre-kicker","SUBLEVEL / "+name.toUpperCase()),make("h2",null,b.textContent));header.append(photo,copy);panel.append(header);
 if(id==="abletontips"){
  panel.append(make("h3",null,"Production exercise"),make("p",null,info[0]),make("p","sl-genre-muted","Original practice exercise, not a reconstruction or measured analysis of a published track."));
  const a=make("a","sl-genre-source","Ableton Live manual ↗");a.href="https://www.ableton.com/en/live-manual/";a.target="_blank";a.rel="noopener noreferrer";panel.append(a)
 }else if(id==="bassculture"){
  panel.append(make("h3",null,"Inside the scene"),make("p",null,info[1]),make("p","sl-genre-muted","An editorial listening prompt for this genre."));
 }else if(id==="newreleases"){
  const now=new Date().toISOString().slice(0,10),cutoff=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  const re=new RegExp(info[2],"i"),matches=D.items.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r[3])&&r[3]>=cutoff&&r[3]<=now&&re.test(r[4])).sort((a,b)=>b[3].localeCompare(a[3]));
  panel.append(make("p","sl-genre-muted","Verified dated catalogue releases from the last seven days."));
  const records=matches.map(([id,title,artist,date,genre,tag,url])=>({id,title,artist,date,genre,url,art:D.artwork?.[id]||""}));
  if(!records.length)panel.append(make("p",null,"No verified new releases in this edition. Check Discover 10 or Top 10 while this section is refreshed."));
  for(const r of records){const row=make("article","sl-genre-release");if(r.art){const img=make("img");img.src=r.art;img.alt=r.title+" release artwork";img.loading="lazy";img.addEventListener("error",()=>img.remove(),{once:true});row.append(img)}const text=make("div");text.append(make("strong",null,r.title),make("small",null,r.artist+" · "+r.date));row.append(text);if(window.SUBLEVELPlayer)row.append(window.SUBLEVELPlayer.action(r,records));panel.append(row)}
 }
 if(id!=="newreleases"){
  const re=new RegExp(info[2],"i"),picks=D.items.filter(r=>re.test(r[4])&&D.artwork?.[r[0]]).slice(0,2).map(([id,title,artist,date,genre,tag,url])=>({id,title,artist,url,art:D.artwork[id]}));
  if(picks.length){panel.append(make("h3",null,"Listening reference"));for(const r of picks){const row=make("article","sl-genre-release"),img=make("img");img.src=r.art;img.alt=r.title+" release artwork";img.addEventListener("error",()=>img.remove(),{once:true});const text=make("div");text.append(make("strong",null,r.title),make("small",null,r.artist));row.append(img,text);if(window.SUBLEVELPlayer)row.append(window.SUBLEVELPlayer.action(r,picks));panel.append(row)}}
 }
 panel.append(button("← Back to Discover 10",()=>{const d=[...tabs.querySelectorAll("button")].find(n=>key(n)==="discover10");if(d)d.click()},"sl-genre-back"));
 tabs.after(panel);extra=panel;
}
app.addEventListener("click",e=>{const b=e.target.closest?.(".tabs button");if(b&&!b.dataset.slGenreExtraTab)clear()},true);
const genrePalettes={"drumbass":["#112c2a","#c6ed75"],"ukgarage":["#38203e","#dda2ef"],"house":["#3b3022","#f0c68c"],"techhouse":["#302f23","#79c9b7"],"techno":["#252b3a","#9eb7fa"],"trance":["#30263e","#bca5ff"],"dubstep":["#392a22","#ffb277"],"breakbeatbigbeat":["#342c20","#e8cc81"],"hiphop":["#3a2a24","#edb28a"],"grime":["#25352b","#b9da91"],"rb":["#392538","#efa8cd"],"soul":["#3d2e25","#eac18c"],"funkdisco":["#402d35","#ffb0c9"],"rock":["#382b28","#efaa94"],"indiealternative":["#2c3430","#b7d2a9"],"metal":["#362526","#f5a5a0"],"pop":["#392c42","#e8bafa"],"afrobeats":["#3d3220","#f2cd76"],"reggaedub":["#253627","#e4d28b"],"triphopdowntempo":["#29313b","#a9c8de"]};
// Keep original credited scene assets where discoverable; a local licensed
// editorial photograph is a visible fallback, never substituted as record art.
const sceneFallback={
 drumbass:"warehouse",ukgarage:"underground",house:"afterhours",techhouse:"underground",techno:"warehouse",trance:"genres",dubstep:"warehouse",breakbeatbigbeat:"underground",hiphop:"late-drive",grime:"late-drive",rb:"afterhours",soul:"afterhours",funkdisco:"genres",rock:"warehouse",indiealternative:"late-drive",metal:"warehouse",pop:"genres",afrobeats:"genres",reggaedub:"afterhours",triphopdowntempo:"late-drive"
};
const sceneCredits={genres:["Pixels and Blue Skies","https://unsplash.com/photos/MN_P-C0CXb4"],underground:["Emmanuel Black","https://unsplash.com/photos/vuZOquKODGs"],warehouse:["Colton Sturgeon","https://unsplash.com/photos/YViBSFfKubI"],afterhours:["Ramin Talebi","https://unsplash.com/photos/2_KldkmLkzQ"],"late-drive":["MChe Lee","https://unsplash.com/photos/DHwy7bYDmhk"]};
const dedicatedScenes={rock:["scene-rock","Adam Gritco","https://unsplash.com/photos/A33Dif_TpII"],hiphop:["scene-hiphop","David Vilches","https://unsplash.com/photos/iSWb2dnkEW4"],indiealternative:["scene-indie","Brooke Balentine","https://unsplash.com/photos/Wx66pPYvdjk"]};
function nativeScene(head){
 const valid=raw=>{if(!raw||typeof raw!=="string")return null;try{const u=new URL(raw,document.baseURI);return (u.protocol==="https:"&&!u.username&&!u.password)||u.origin===location.origin||/^data:image\/(?:jpeg|png|webp);base64,/.test(raw)?raw:null}catch{return null}};
 // Original hero may use a CSS background, pseudo-element or a scene image.
 const nodes=[head,...head.querySelectorAll(":scope > :not(.roomcopy)")];
 for(const n of nodes){
  if(n.matches("img")&&valid(n.getAttribute("src")))return valid(n.getAttribute("src"));
  for(const pseudo of [null,"::before","::after"]){
   const value=getComputedStyle(n,pseudo).backgroundImage;
   const match=value.match(/url\(["']?(.*?)["']?\)/);
   if(match&&valid(match[1]))return valid(match[1])
  }
  for(const img of n.querySelectorAll("img"))if(!img.closest(".roomcopy")&&valid(img.getAttribute("src")))return valid(img.getAttribute("src"))
 }
 return null
}
function decorateGenre(name){
 const head=app.querySelector(".roomhead"),copy=head?.querySelector(".roomcopy"),h=copy?.querySelector("h1");
 if(!head||!copy||!h)return;
 const k=norm(name),p=genrePalettes[k];if(!p)return;
 app.style.setProperty("--sl-genre-panel",p[0]);
 app.style.setProperty("--sl-genre-accent",p[1]);
 if(head.dataset.slGenreTheme===k&&head.querySelector(".sl-genre-scene"))return;
 // Reusing a native header must not retain a previous genre's artwork.
 head.querySelectorAll(".sl-genre-scene,.sl-genre-banner-credit").forEach(n=>n.remove());
 head.classList.remove("sl-genre-angled");
 // Read the original public visual layer before applying our scoped CSS.
 const original=nativeScene(head),fallback=sceneFallback[k]||"genres";
 head.classList.add("sl-genre-angled");head.dataset.slGenreTheme=k;
 head.style.setProperty("--sl-genre-panel",p[0]);head.style.setProperty("--sl-genre-accent",p[1]);
 app.style.setProperty("--sl-genre-accent",p[1]);
 let kicker=copy.querySelector(".sl-genre-banner-kicker");
 if(!kicker){kicker=make("div","sl-genre-banner-kicker");h.before(kicker)}
 kicker.textContent="SUBLEVEL / "+name.toUpperCase();
 const photo=make("img","sl-genre-scene");photo.alt="";photo.decoding="async";
 const credit=make("a","sl-genre-banner-credit");credit.target="_blank";credit.rel="noopener noreferrer";credit.hidden=true;
 const useFallback=()=>{if(photo.dataset.sceneOrigin==="fallback")return;photo.dataset.sceneOrigin="fallback";photo.src="section-art/"+fallback+".jpg";credit.href=sceneCredits[fallback][1];credit.textContent="Banner photo: "+sceneCredits[fallback][0]+" ↗";credit.hidden=false};
 photo.addEventListener("error",useFallback);
 head.prepend(photo);head.append(credit);
 const dedicated=dedicatedScenes[k];
 if(dedicated){photo.dataset.sceneOrigin="dedicated";credit.href=dedicated[2];credit.textContent="Banner photo: "+dedicated[1]+" ↗";credit.hidden=false;photo.src="section-art/"+dedicated[0]+".jpg"}
 else if(original){photo.dataset.sceneOrigin="original";photo.src=original}else useFallback();
}
function mount(){
 const name=title(),tabs=app.querySelector(".roomhead")&&app.querySelector(".tabs");
 if(name&&tabs)decorateGenre(name);else{app.style.removeProperty("--sl-genre-accent");app.style.removeProperty("--sl-genre-panel")}
 if(!name||!tabs){clear();room="";tabBar=null;return}
 if(name!==room||tabs!==tabBar){clear();room=name;tabBar=tabs}
 const all=[...tabs.querySelectorAll("button")];
 for(const [id,label] of standard){
  let b=all.find(n=>key(n)===id);
  if(b){if(id!=="discover10"&&b.textContent.trim()!==label)b.textContent=label;continue}
  if(!["newreleases","abletontips","bassculture"].includes(id))continue;
  b=button(label,()=>show(b,id,name,tabs),"");b.dataset.slGenreExtraTab=id;tabs.append(b);all.push(b)
 }
 // Same five core tab order, without deleting extra native sections.
 let previous=null;
 for(const [id] of standard){const b=all.find(n=>key(n)===id);if(!b)continue;if(previous&&previous.nextElementSibling!==b)previous.after(b);previous=b}
 tabs.classList.add("sl-unified-genre-tabs")
}
let pending=false;const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;mount()})}};
new MutationObserver(schedule).observe(app,{childList:true,subtree:true});schedule();
})();

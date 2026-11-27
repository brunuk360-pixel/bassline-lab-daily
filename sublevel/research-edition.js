(()=>{
"use strict";
const app=document.getElementById("app");if(!app)return;
const entries=[
{title:"All Night",artist:/camo\s*&\s*krooked|camo and krooked/i,summary:"A disco-influenced departure from the duo's heavier earlier Hospital material, ahead of their third studio album.",facts:[["Vocal performance","Pat Fulgoni",0],["Album version","4:31",1],["Album release","30 September 2013",1]],timeline:[["2011","Cross the Line — earlier Hospital album",0],["2012","Between the Lines — remix album",0],["2013","All Night introduced the new direction before Zeitgeist",0],["30 Sep 2013","Zeitgeist released on Hospital Records",1]],listen:"Notice the restrained opening, rising noise, piano and vocal hook. Compare its disco and house influences with the more forceful sound of Cross the Line.",connections:[["Cross the Line","Camo & Krooked Cross the Line","Earlier album"],["Move Around","Camo & Krooked Move Around","Same album"],["Metrik","Metrik","Zeitgeist collaborator"]],sources:[["Artist Bandcamp — single and vocalist","https://camoandkrooked.bandcamp.com/track/all-night"],["Hospital Records — Zeitgeist tracklist","https://hospitalrecords.bandcamp.com/album/zeitgeist"],["Hospital Records — album background","https://www.hospitalrecords.com/products/camo-krooked-zeitgeist"]]},
{title:"Firestarter",artist:/(?:the\s+)?prodigy/i,summary:"A defining crossover between electronic rave music and punk attitude, released in 1996 and revisited by drum & bass producers decades later.",facts:[["Original release","18 March 1996",0],["UK Singles Chart peak","#1",1],["Label","XL Recordings",1]],timeline:[["1996","Original single released",0],["2022","Andy C remix for The Fat of the Land anniversary",2],["2023","Andy C remix included on anniversary remix EP",3],["13 Mar 2026","30th-anniversary vinyl: original, Empirion, Andy C and instrumental versions",4]],samples:[["The Breeders — S.O.S.","Guitar sample",0],["Art of Noise — Close (to the Edit)","Vocal sample",0]],listen:"Compare the original's abrasive guitar texture and vocal attitude with the drum & bass interpretation by Andy C.",connections:[["Andy C remix","The Prodigy Firestarter Andy C Remix","Remix"],["Empirion Mix","The Prodigy Firestarter Empirion Mix","Remix"],["The Breeders — S.O.S.","The Breeders SOS","Sample source"],["Art of Noise — Close (to the Edit)","Art of Noise Close to the Edit","Sample source"]],sources:[["Release discography — date and sample credits","https://theprodigy.info/discography/official/firestarter/"],["Official Charts — Firestarter","https://www.officialcharts.com/songs/prodigy-firestarter/"],["The Prodigy — 25th anniversary reissue","https://theprodigy.com/2022/10/27/fat-of-the-land-25th-anniversary-re-issue/"],["The Prodigy — 2023 remix EP","https://theprodigy.com/2023/06/27/the-fat-of-the-land-25th-anniversary-remix-e-p/"],["The Prodigy — 30th anniversary vinyl","https://theprodigy.com/2026/01/29/firestarter-30th-anniversary-vinyl-re-release/"]]},
{title:"Gold Dust",artist:/\bdj\s*fresh\b/i,summary:"A release that evolved across several versions, from a 2008 vinyl appearance to a dancehall-vocal crossover and a later Shy FX re-edit.",facts:[["2010 version vocals","Ce'Cile",0],["UK Singles Chart peak (combined chart entry)","#22",1],["Album","Kryptonite",0]],timeline:[["2008","Early 12-inch release",0],["2010","Vocal version released with Ce'Cile; reached #24 in the UK",0],["2012","Shy FX re-edit reached #22 in the UK",0],["2022","Anniversary remix collection",0]],listen:"Compare the vocal version and Shy FX re-edit: listen to how the rhythmic treatment changes the feel of the same hook.",connections:[["Shy FX re-edit","DJ Fresh Gold Dust Shy FX Re Edit","Alternate version"],["Kryptonite","DJ Fresh Kryptonite","Album"],["Gold Dust remixes","DJ Fresh Gold Dust remixes","Remix search"]],sources:[["DJ Mag — release history and remix collection","https://djmag.com/news/dj-fresh-drops-10th-anniversary-gold-dust-remix-package-listen"],["Official Charts — Gold Dust","https://www.officialcharts.com/songs/dj-fresh-gold-dust/"]]}
];
const clean=n=>n?.textContent?.trim().replace(/\s+/g," ")||"";
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
function node(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt)n.textContent=txt;return n}
function link(label,url){const a=node("a",null,label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
function mark(parent,i,data){if(!data.sources[i])return;const a=link("["+(i+1)+"]",data.sources[i][1]);a.className="sl-r-ref";a.setAttribute("aria-label","Source "+(i+1)+": "+data.sources[i][0]);parent.append(" ",a)}
function heading(parent,txt){parent.append(node("h3","sl-r-heading",txt))}
function enrich(detail){
 const track=detail.closest(".track");if(!track)return;
 const title=clean(track.querySelector(".tracktitle strong,.tracktitle b"));
 const artist=clean(track.querySelector(".tracktitle small"))||clean(detail.querySelector(".sl-dossier-artist"));
 if(!title||!artist)return;
 const story=Array.from(detail.querySelectorAll(".record-panel")).find(p=>p.querySelector(".story-copy"));
 if(!story||story.querySelector(".sl-research-edition"))return;
 const data=entries.find(e=>norm(title)===norm(e.title)&&e.artist.test(artist));
 const panel=node("section","sl-research-edition");
 if(data){
 panel.append(node("div","sl-r-kicker","SUBLEVEL / RESEARCH NOTES"),node("p","sl-r-lead",data.summary));
 heading(panel,"Credits & release facts");const grid=node("dl","sl-r-facts");
 data.facts.forEach(([k,v,i])=>{const cell=node("div");const val=node("dd",null,v);mark(val,i,data);cell.append(node("dt",null,k),val);grid.append(cell)});panel.append(grid);
 heading(panel,"Release timeline");const timeline=node("ol","sl-r-timeline");
 data.timeline.forEach(([year,description,i])=>{const li=node("li");const p=node("p",null,description);mark(p,i,data);li.append(node("time",null,year),p);timeline.append(li)});panel.append(timeline);
 if(data.samples){heading(panel,"Documented sample origins");data.samples.forEach(([name,role,i])=>{const row=node("p","sl-r-sample",name+" — "+role);mark(row,i,data);panel.append(row)})}
 heading(panel,"Listening guide");panel.append(node("p","sl-r-note",data.listen));
 heading(panel,"Follow the connections");data.connections.forEach(([name,q,kind])=>{const a=link(name,"https://open.spotify.com/search/"+encodeURIComponent(q));a.className="sl-r-connection";a.append(node("small",null,kind+" ↗"));panel.append(a)});
 const refs=node("details","sl-r-sources");refs.append(node("summary",null,"Research sources ("+data.sources.length+")"));const ol=node("ol");data.sources.forEach(([label,url])=>{const li=node("li");li.append(link(label,url));ol.append(li)});refs.append(ol);panel.append(refs);
 }else{
 heading(panel,"Research further");panel.append(node("p","sl-r-note","Extended editorial research has not yet been added for this track. Explore catalogues for more information."));
 const q=artist.replace(/\b(?:19|20)\d{2}\s*$/,"").trim()+" "+title;
 [["MusicBrainz — recording search","https://musicbrainz.org/search?type=recording&query="+encodeURIComponent(q)],["Discogs — release search","https://www.discogs.com/search/?type=release&q="+encodeURIComponent(q)]].forEach(([label,url])=>{const a=link(label,url);a.className="sl-r-connection";a.append(node("small",null,"Search ↗"));panel.append(a)});
 }
 story.append(panel);
}
let pending=false;function scan(){pending=false;app.querySelectorAll(".editorial-detail:not([hidden])").forEach(d=>{if(d.getClientRects().length)enrich(d)})}
function schedule(){if(!pending){pending=true;requestAnimationFrame(scan)}}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden","class"]});schedule();
})()

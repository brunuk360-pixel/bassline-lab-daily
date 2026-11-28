"use strict";
const fs=require("node:fs"),vm=require("node:vm"),a=require("node:assert/strict"),path=require("node:path");
const src=fs.readFileSync(path.join(__dirname,"charts.js"),"utf8");
const feed=JSON.parse(fs.readFileSync(path.join(__dirname,"charts.json"),"utf8"));
const start=src.indexOf("function status("),end=src.indexOf("function chartPanel(",start);
const f=vm.runInNewContext("const norm=s=>(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');const alias={drumbass:'dnb'};"+src.slice(start,end)+";({status,sourceFor})",{feed});
a.equal(f.status(feed.charts.find(c=>c.id==="uk-dance"),"2026-11-27"),"Current published chart period");
a.equal(f.status(feed.charts.find(c=>c.id==="uk-dance"),"2026-12-04"),"Past chart period");
a.match(f.status({status:"snapshot",checked:"2026-11-27"},"2026-11-27"),/not confirmed current/);
a.match(f.status({status:"verified",checked:"2026-11-27"},"2026-11-28"),/refresh needed/);
a.equal(f.sourceFor("Drum & Bass")[2],"dnb");
a.equal(f.sourceFor("Unknown genre"),undefined);
a.equal(f.sourceFor("Techno")[2],"techno");
a.equal(f.sourceFor("Garage")[2],"garage");
a.equal(f.sourceFor("House")[2],"house");
a.equal(feed.rooms.length,20);a.equal(new Set(feed.rooms.map(r=>r[0])).size,20);
for(const r of feed.rooms){if(r[1])a.equal(f.sourceFor(r[0])[0],r[1]);else {a.equal(f.sourceFor(r[0]),undefined);a.ok(r[2])}}
a.equal(f.sourceFor("Rock")[0],"UK Rock & Metal");a.equal(f.sourceFor("Soul")[0],"Soul / Funk / Disco");
a.equal(f.sourceFor("Funk & Disco")[2],"soul-funk");
a.equal(f.sourceFor("Reggae & Dub")[2],"dj-reggae");
for(const id of ["dj-reggae","dj-trance","dj-breaks","dj-downtempo","dj-dubstep"]){const c=feed.charts.find(x=>x.id===id);a.match(f.status(c,"2026-11-28"),/Latest checked weekly DJ report/);a.match(f.status(c,"2026-11-29"),/last checked/);a.equal(c.published,"2026-11-23");}
for(const c of feed.charts){a.equal(c.rows.length,10);a.deepEqual(c.rows.map(r=>r.rank),Array.from({length:10},(_,i)=>i+1));a.equal(new Set(c.rows.map(r=>r.title+'|'+r.artist)).size,10)}
console.log("Chart checks passed: source matching and honest freshness labels.");

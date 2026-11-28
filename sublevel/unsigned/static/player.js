"use strict";
document.querySelectorAll("button[data-player-src]").forEach(button=>{
 button.addEventListener("click",()=>{
  const container=button.closest(".unsigned-player")?.querySelector(".unsigned-player-frame");if(!container)return;
  if(container.firstElementChild){container.replaceChildren();button.textContent="Load "+button.dataset.playerName+" player";return}
  let u;try{u=new URL(button.dataset.playerSrc)}catch{return}
  if(u.protocol!=="https:"||!["w.soundcloud.com","www.youtube-nocookie.com","bandcamp.com"].includes(u.hostname))return;
  const frame=document.createElement("iframe");frame.src=u.href;frame.title=button.dataset.playerName+" music player";frame.height=button.dataset.playerHeight;frame.allow="autoplay; encrypted-media; fullscreen; picture-in-picture";frame.allowFullscreen=true;frame.referrerPolicy="strict-origin-when-cross-origin";container.append(frame);button.textContent="Stop and close player";
 })
});

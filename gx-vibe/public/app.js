const $ = (s) => document.querySelector(s);
const views = {home:$("#homeView"),watch:$("#watchView"),studio:$("#studioView"),upload:$("#uploadView")};
let authMode = "register";
function showView(name){Object.entries(views).forEach(([k,v])=>v.classList.toggle("hidden",k!==name));document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===name));if(name==="watch")loadVideos($("#watchFeed"));}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
const dialog=$("#authDialog");
$("#openAuth").addEventListener("click",()=>dialog.showModal());
$("#closeAuth").addEventListener("click",()=>dialog.close());
function setAuthMode(mode){authMode=mode;$("#authTitle").textContent=mode==="register"?"Create your account":"Welcome back";$("#registerFields").classList.toggle("hidden",mode==="login");$("#loginLabel").classList.toggle("hidden",mode!=="login");$("#authSubmit").textContent=mode==="register"?"Create account":"Sign in";$("#toggleAuth").textContent=mode==="register"?"Already have an account? Sign in":"Need an account? Register";}
$("#toggleAuth").addEventListener("click",()=>setAuthMode(authMode==="register"?"login":"register"));
async function api(url, options = {}) {
  const r = await fetch(url, {
    credentials: "same-origin",
    ...options
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(
      `HTTP ${r.status}: ${data.error || "Request failed"}`
    );
  }

  return data;
}

$("#authForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());const endpoint=authMode==="register"?"/api/auth/register":"/api/auth/login";$("#authMessage").textContent="Please wait…";try{await api(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});$("#authMessage").textContent="Signed in successfully.";$("#openAuth").textContent="Account";setTimeout(()=>dialog.close(),500);}catch(err){$("#authMessage").textContent=err.message;}});
function videoCard(v) {
  const card = document.createElement("article");
  card.className = "video-card";

  const video = document.createElement("video");
  video.controls = true;
  video.preload = "metadata";
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.style.width = "100%";

  const debug = document.createElement("p");
  debug.style.padding = "10px";
  debug.style.color = "white";
  debug.textContent = "Loading video...";

  const info = document.createElement("div");
  info.className = "video-info";

  const title = document.createElement("h3");
  title.textContent = v.title || "";

  const by = document.createElement("p");
  by.textContent = `${v.display_name || ""} · @${v.username || ""}`;

  video.addEventListener("loadedmetadata", () => {
    debug.textContent = "Video metadata loaded.";
  });

  video.addEventListener("canplay", () => {
    debug.textContent = "Video ready to play.";
  });

  video.addEventListener("error", () => {
    debug.textContent =
      "Playback error: " +
      (video.error ? video.error.code : "unknown") +
      " — " +
      (video.error ? video.error.message : "No details");
  });

  try {
    const url = new URL(v.storage_url, location.origin);

    if (
      url.protocol !== "https:" &&
      url.origin !== location.origin
    ) {
      throw new Error("Unsupported video URL.");
    }

    if (
      url.hostname !== "res.cloudinary.com" &&
      url.origin !== location.origin
    ) {
      throw new Error("Video host is not allowed.");
    }

    const source = document.createElement("source");
    source.src = url.href;
    source.type = v.mime_type || "video/mp4";

    video.appendChild(source);
    video.load();
  } catch (e) {
    debug.textContent = e.message;
  }

  const likeButton = document.createElement("button");
likeButton.textContent = "♡ Like";
likeButton.type = "button";

likeButton.addEventListener("click", async () => {
  likeButton.disabled = true;

  try {
    const result = await api(`/api/videos/${v.id}/like`, {
      method: "POST"
    });

    likeButton.textContent = result.liked ? "♥ Liked" : "♡ Like";
  } catch (e) {
    alert(e.message);
  } finally {
    likeButton.disabled = false;
  }
});

info.append(title, by, likeButton);
  card.append(video, debug, info);

  return card;
}
async function loadVideos(target){target.innerHTML="";try{const data=await api("/api/videos");if(!data.videos.length){target.innerHTML='<div class="empty"><div class="empty-icon">▶</div><h3>No videos yet</h3><p>Be the first to share a video.</p></div>';return;}data.videos.forEach(v=>target.append(videoCard(v)));}catch(e){target.innerHTML=`<div class="empty">${e.message}</div>`;}}
$("#uploadForm").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget;const button=form.querySelector("button");button.disabled=true;$("#uploadMessage").textContent="Uploading…";try{const data=await api("/api/videos",{method:"POST",body:new FormData(form)});$("#uploadMessage").textContent="Video uploaded successfully.";form.reset();showView("home");await loadVideos($("#videoFeed"));}catch(err){$("#uploadMessage").textContent=err.message;}finally{button.disabled=false;}});
$("#openSearch").addEventListener("click",()=>{const q=prompt("Search is being prepared. Enter a creator or video title to note what you want to find:");if(q)alert("Search feature will be added in a later milestone.");});
loadVideos($("#videoFeed"));
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));

/* Xe Điện Nghiêm Studio - 100% Client-Side iPhone/Mobile Video Editor (0đ/tháng) */

const SAMPLE_BEATS = [
  { t0: 0.0, t1: 1.5, sub: "Bỏ vào cốp", key: "ÁO MƯA", color: "gold", anim: "pop_in" },
  { t0: 1.5, t1: 3.0, sub: "Bỏ vào cốp", key: "ÁO KHOÁC", color: "gold", anim: "slide_up" },
  { t0: 3.0, t1: 5.0, sub: "Bỏ cốp luôn", key: "MŨ BẢO HIỂM", color: "ruby", anim: "typewriter" },
  { t0: 5.0, t1: 6.5, sub: "Đóng yên gọn gàng", key: "ĐỰNG ĐỦ 3 MÓN", color: "gold", anim: "fade_in" },
  { t0: 6.5, t1: 9.8, sub: "Một mẫu xe chở được", key: "CẢ THẾ GIỚI", color: "cyan", anim: "slide_left" },
  { t0: 9.8, t1: 15.0, sub: "Bỏ đồ trong cốp rất tiện", key: "ĐI MÙA MƯA", color: "gold", anim: "pop_in" },
  { t0: 15.0, t1: 19.5, sub: "Học sinh dưới 16 tuổi", key: "KHÔNG CẦN BẰNG LÁI", color: "ruby", anim: "scale_up" },
  { t0: 19.5, t1: 24.5, sub: "Chị em phụ nữ", key: "THÍCH SỰ SANG CHẢNH", color: "gold", anim: "slide_up" },
  { t0: 24.5, t1: 28.0, sub: "2 phiên bản tùy chọn", key: "5 BÌNH · BẢN PIN", color: "cyan", anim: "pop_in" },
  { t0: 28.0, t1: 32.0, sub: "Quãng đường di chuyển", key: "80 – 90 KM", color: "cyan", anim: "scale_up" },
  { t0: 32.0, t1: 33.5, sub: "Đến xem xe trực tiếp", key: "XE ĐIỆN NGHIÊM", color: "gold", anim: "pop_in" },
];

let beats = JSON.parse(JSON.stringify(SAMPLE_BEATS));
let isPlaying = false;
let isExporting = false;
let rafId = null;
let exportedBlob = null;
let exportedExt = "mp4";

const srcVideo = document.getElementById("srcVideo");
const canvas = document.getElementById("previewCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const emptyState = document.getElementById("emptyState");
const btnPlayPause = document.getElementById("btnPlayPause");
const seekBar = document.getElementById("seekBar");
const timeLabel = document.getElementById("timeLabel");
const btnExport = document.getElementById("btnExport");
const beatList = document.getElementById("beatList");
const resSelect = document.getElementById("resSelect");

const logoImg = new Image();
logoImg.src = "./assets/png/logo_xdn.png";

// Register Service Worker for Offline PWA
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

document.getElementById("btnInstallTip").addEventListener("click", () => {
  alert("Trên iPhone Safari: bấm nút Chia sẻ (ô vuông mũi tên lên ở dưới) → chọn 'Thêm vào Màn hình chính' (Add to Home Screen) để dùng như App thật!");
});

document.getElementById("bgmVol").addEventListener("input", (e) => {
  document.getElementById("bgmVolVal").textContent = `${e.target.value}%`;
});

resSelect.addEventListener("change", () => {
  const [w, h] = resSelect.value.split("x").map(Number);
  canvas.width = w;
  canvas.height = h;
  drawFrame(srcVideo.currentTime || 0);
});

function handleVideoFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  srcVideo.src = url;
  srcVideo.load();
  srcVideo.onloadedmetadata = () => {
    emptyState.classList.add("hidden");
    btnPlayPause.disabled = false;
    btnExport.disabled = false;
    seekBar.disabled = false;
    seekBar.max = srcVideo.duration || 40;
    srcVideo.currentTime = 0.01;
    updateTimeLabel();
  };
  srcVideo.onseeked = () => drawFrame(srcVideo.currentTime);
}

document.getElementById("videoInput").addEventListener("change", (e) => handleVideoFile(e.target.files[0]));
document.getElementById("videoInput2").addEventListener("change", (e) => handleVideoFile(e.target.files[0]));

function updateTimeLabel() {
  const cur = srcVideo.currentTime || 0;
  const dur = srcVideo.duration || 0;
  timeLabel.textContent = `${cur.toFixed(1)}s / ${dur.toFixed(1)}s`;
  seekBar.value = cur;
}

seekBar.addEventListener("input", () => {
  if (isPlaying) togglePlay();
  srcVideo.currentTime = Number(seekBar.value);
  updateTimeLabel();
});

btnPlayPause.addEventListener("click", togglePlay);

function togglePlay() {
  if (isPlaying) {
    srcVideo.pause();
    isPlaying = false;
    btnPlayPause.textContent = "▶ Xem thử";
    cancelAnimationFrame(rafId);
  } else {
    srcVideo.muted = false;
    srcVideo.play();
    isPlaying = true;
    btnPlayPause.textContent = "⏸ Tạm dừng";
    const loop = () => {
      if (!isPlaying || srcVideo.paused || srcVideo.ended) {
        isPlaying = false;
        btnPlayPause.textContent = "▶ Xem thử";
        return;
      }
      drawFrame(srcVideo.currentTime);
      updateTimeLabel();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }
}

function easeOutBack(x) {
  x = Math.max(0, Math.min(1, x));
  const c1 = 1.72;
  return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeOutCubic(x) {
  x = Math.max(0, Math.min(1, x));
  return 1 - Math.pow(1 - x, 3);
}

function getFillColor(colorKey) {
  if (colorKey === "gold") return "#ffd40a";
  if (colorKey === "cyan") return "#1cd7ff";
  if (colorKey === "ruby") return "#ff3b5c";
  return "#ffffff";
}

function drawOutlinedText(text, x, y, fontPx, fontFamily, fillCol, scale = 1.0, alpha = 1.0, maxW = 600) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `800 ${fontPx}px "${fontFamily}", "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const measured = ctx.measureText(text).width;
  const fitScale = measured > maxW ? maxW / measured : 1.0;
  ctx.translate(x, y);
  ctx.scale(scale * fitScale, scale * fitScale);

  // Soft shadow + thick black stroke + crisp fill (Zero box!)
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(8, fontPx * 0.22);
  ctx.strokeStyle = "#0a0c10";
  ctx.strokeText(text, 0, 0);

  ctx.shadowColor = "transparent";
  ctx.fillStyle = fillCol;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawFrame(t) {
  const W = canvas.width;
  const H = canvas.height;
  const scaleFactor = W / 1080;

  ctx.save();
  if (document.getElementById("chkColor").checked) {
    // Clear/Fresh color grading (+8% brightness, +10% contrast, +10% saturation)
    ctx.filter = "brightness(1.06) contrast(1.08) saturate(1.10)";
  } else {
    ctx.filter = "none";
  }

  // Cover crop 9:16
  if (srcVideo.readyState >= 2) {
    const vw = srcVideo.videoWidth || W;
    const vh = srcVideo.videoHeight || H;
    const r = Math.max(W / vw, H / vh);
    const dw = vw * r;
    const dh = vh * r;
    ctx.drawImage(srcVideo, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#111520";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  // Top soft spotlight gradient for crisp text contrast (below iPhone notch Y=230px)
  const grad = ctx.createLinearGradient(0, 0, 0, H * 0.34);
  grad.addColorStop(0, "rgba(0,0,0,0.34)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H * 0.34);

  const CX = W / 2;
  const useShowroom = document.getElementById("chkShowroom").checked;
  const finStart = parseFloat(document.getElementById("finStart").value) || 33.5;

  // Unified Showroom Finale Lockup
  if (useShowroom && t >= finStart) {
    const dt = t - finStart;
    const brand = document.getElementById("shopName").value.trim() || "XE ĐIỆN NGHIÊM";
    const addr = document.getElementById("shopAddr").value.trim() || "357 TRẦN PHÚ";
    const city = document.getElementById("shopCity").value.trim() || "TUY PHƯỚC · GIA LAI";
    const zalo = document.getElementById("shopZalo").value.trim() || "ZALO: 0818 553 368";

    const sc = dt < 0.25 ? 0.55 + 0.45 * easeOutBack(dt / 0.25) : 1.0;
    const alpha = Math.min(1, dt / 0.15);

    if (logoImg.complete && logoImg.naturalWidth > 0) {
      const lh = 64 * scaleFactor;
      const lw = (logoImg.naturalWidth / logoImg.naturalHeight) * lh;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(0,0,0,0.75)";
      ctx.shadowBlur = 8;
      ctx.drawImage(logoImg, CX - 220 * scaleFactor - lw * 0.3, 240 * scaleFactor, lw, lh);
      ctx.restore();
    }

    drawOutlinedText(brand, CX + 28 * scaleFactor, 272 * scaleFactor, 56 * scaleFactor, "MontserratEB", "#ffd40a", sc, alpha, 560 * scaleFactor);
    drawOutlinedText("📍 " + addr, CX, 344 * scaleFactor, 68 * scaleFactor, "MontserratEB", "#ffffff", sc, Math.min(1, Math.max(0, (dt - 0.15) / 0.2)), 640 * scaleFactor);
    drawOutlinedText(city, CX, 410 * scaleFactor, 42 * scaleFactor, "BeVietnamEB", "#ffd40a", 1, Math.min(1, Math.max(0, (dt - 0.3) / 0.2)), 600 * scaleFactor);
    drawOutlinedText(zalo, CX, 464 * scaleFactor, 42 * scaleFactor, "MontserratEB", "#1cd7ff", 1, Math.min(1, Math.max(0, (dt - 0.45) / 0.2)), 600 * scaleFactor);
    return;
  }

  // Active Beat Text in Top 1/3 Safe Zone (Y = 235..390px on 1080x1920)
  const b = beats.find((item) => t >= item.t0 && t < item.t1);
  if (!b) return;
  const dt = t - b.t0;
  const fade = Math.min(1.0, (b.t1 - t) / 0.12);

  let sc = 1.0;
  let yOff = 0;
  let xOff = 0;
  if (b.anim === "pop_in" || b.anim === "scale_up") {
    sc = dt < 0.22 ? 0.52 + 0.48 * easeOutBack(dt / 0.22) : 1.0;
  } else if (b.anim === "slide_up") {
    const p = dt < 0.25 ? easeOutCubic(dt / 0.25) : 1;
    yOff = (1 - p) * 55 * scaleFactor;
  } else if (b.anim === "slide_left") {
    const p = dt < 0.25 ? easeOutCubic(dt / 0.25) : 1;
    xOff = (1 - p) * 120 * scaleFactor;
  }

  // Main Keyword (Large) + Supporting Sub-line (White)
  const keyText = b.anim === "typewriter" && dt < 0.45
    ? b.key.slice(0, Math.max(1, Math.floor(b.key.length * easeOutCubic(dt / 0.45))))
    : b.key;

  drawOutlinedText(keyText, CX + xOff, 275 * scaleFactor + yOff, 64 * scaleFactor, "MontserratEB", getFillColor(b.color), sc, fade, 720 * scaleFactor);
  if (b.sub) {
    drawOutlinedText(b.sub, CX + xOff, 342 * scaleFactor + yOff, 40 * scaleFactor, "BeVietnamEB", "#ffffff", 1.0, fade * Math.min(1, dt / 0.18), 660 * scaleFactor);
  }
}

// Render Beat Editor Cards
function renderBeatsUI() {
  beatList.innerHTML = "";
  beats.forEach((b, idx) => {
    const div = document.createElement("div");
    div.className = "beat-card";
    div.innerHTML = `
      <div class="beat-top">
        <span>Từ</span>
        <input type="number" step="0.1" value="${b.t0}" data-idx="${idx}" data-field="t0" />
        <span>đến</span>
        <input type="number" step="0.1" value="${b.t1}" data-idx="${idx}" data-field="t1" />
        <select data-idx="${idx}" data-field="color">
          <option value="gold" ${b.color === "gold" ? "selected" : ""}>Vàng</option>
          <option value="cyan" ${b.color === "cyan" ? "selected" : ""}>Xanh Cyan</option>
          <option value="ruby" ${b.color === "ruby" ? "selected" : ""}>Đỏ Ruby</option>
          <option value="white" ${b.color === "white" ? "selected" : ""}>Trắng</option>
        </select>
        <button class="btn-del" data-del="${idx}" type="button">Xóa</button>
      </div>
      <div class="grid-2">
        <input type="text" value="${b.key}" placeholder="Từ khóa lớn" data-idx="${idx}" data-field="key" />
        <input type="text" value="${b.sub}" placeholder="Dòng phụ ngắn" data-idx="${idx}" data-field="sub" />
      </div>
    `;
    beatList.appendChild(div);
  });

  beatList.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("change", (e) => {
      const i = Number(e.target.dataset.idx);
      const f = e.target.dataset.field;
      beats[i][f] = (f === "t0" || f === "t1") ? parseFloat(e.target.value) || 0 : e.target.value;
      drawFrame(srcVideo.currentTime || 0);
    });
  });

  beatList.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      beats.splice(Number(e.target.dataset.del), 1);
      renderBeatsUI();
      drawFrame(srcVideo.currentTime || 0);
    });
  });
}

document.getElementById("btnAddBeat").addEventListener("click", () => {
  const lastEnd = beats.length ? beats[beats.length - 1].t1 : 0;
  beats.push({ t0: lastEnd, t1: lastEnd + 3, sub: "Thông tin chi tiết", key: "NỔI BẬT", color: "gold", anim: "pop_in" });
  renderBeatsUI();
});

document.getElementById("btnLoadSample").addEventListener("click", () => {
  beats = JSON.parse(JSON.stringify(SAMPLE_BEATS));
  renderBeatsUI();
  drawFrame(srcVideo.currentTime || 0);
});

renderBeatsUI();

// ---------------------------------------------------------------------------
// 100% Client-Side Export (Canvas Video + Web Audio Voice/BGM/SFX -> MP4/WebM)
// ---------------------------------------------------------------------------
async function loadAudioBuffer(audioCtx, url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return audioCtx.decodeAudioData(buf);
}

btnExport.addEventListener("click", async () => {
  if (isExporting || !srcVideo.src) return;
  if (isPlaying) togglePlay();

  isExporting = true;
  btnExport.disabled = true;
  document.getElementById("progressBox").classList.remove("hidden");
  document.getElementById("downloadBox").classList.add("hidden");

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();

  // Connect original video audio
  let vidSource = null;
  try {
    vidSource = audioCtx.createMediaElementSource(srcVideo);
    vidSource.connect(dest);
  } catch (e) {}

  // Preload SFX buffers
  const useSfx = document.getElementById("chkSfx").checked;
  const sfxBuffers = {};
  if (useSfx) {
    for (const [k, u] of [["pop", "./assets/audio/pop.mp3"], ["whoosh", "./assets/audio/whoosh.mp3"], ["ding", "./assets/audio/ding.mp3"]]) {
      try { sfxBuffers[k] = await loadAudioBuffer(audioCtx, u); } catch (e) {}
    }
  }

  // Synthesize gentle 116 BPM Electronic Pop BGM directly in Web Audio (0 network!)
  let bgmTimer = null;
  if (document.getElementById("chkBgm").checked) {
    const vol = (parseInt(document.getElementById("bgmVol").value, 10) || 14) / 100 * 0.25;
    const chords = [
      [174.61, 220.0, 261.63],
      [196.0, 246.94, 293.66],
      [164.81, 196.0, 246.94],
      [220.0, 261.63, 329.63],
    ];
    let step = 0;
    bgmTimer = setInterval(() => {
      if (!isExporting) return;
      const now = audioCtx.currentTime;
      const notes = chords[Math.floor(step / 4) % chords.length];
      notes.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(vol, now + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.connect(g).connect(dest);
        osc.start(now);
        osc.stop(now + 0.44);
      });
      step++;
    }, 517); // 116 BPM
  }

  const canvasStream = canvas.captureStream(30);
  const combined = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mime = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
    ? "video/mp4;codecs=avc1"
    : MediaRecorder.isTypeSupported("video/mp4")
    ? "video/mp4"
    : "video/webm";
  exportedExt = mime.includes("mp4") ? "mp4" : "webm";

  const chunks = [];
  const recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const playedSfx = new Set();
  srcVideo.muted = false;
  srcVideo.currentTime = 0;

  recorder.onstop = () => {
    clearInterval(bgmTimer);
    isExporting = false;
    btnExport.disabled = false;
    exportedBlob = new Blob(chunks, { type: mime });
    const outUrl = URL.createObjectURL(exportedBlob);
    const dlLink = document.getElementById("dlLink");
    dlLink.href = outUrl;
    dlLink.download = `xe_dien_nghiem_review.${exportedExt}`;
    document.getElementById("progressFill").style.width = "100%";
    document.getElementById("progressPct").textContent = "100%";
    document.getElementById("progressLabel").textContent = "Hoàn tất!";
    document.getElementById("downloadBox").classList.remove("hidden");
  };

  recorder.start(200);
  await srcVideo.play();

  const renderLoop = () => {
    if (!isExporting) return;
    const t = srcVideo.currentTime;
    const dur = srcVideo.duration || 1;
    const pct = Math.min(99, Math.round((t / dur) * 100));
    document.getElementById("progressFill").style.width = `${pct}%`;
    document.getElementById("progressPct").textContent = `${pct}%`;

    // Trigger SFX on beat entry
    if (useSfx) {
      beats.forEach((b, idx) => {
        if (!playedSfx.has(idx) && t >= b.t0) {
          playedSfx.add(idx);
          const sKey = b.anim === "slide_left" ? "whoosh" : b.color === "cyan" ? "ding" : "pop";
          const buf = sfxBuffers[sKey];
          if (buf) {
            const src = audioCtx.createBufferSource();
            const g = audioCtx.createGain();
            g.gain.value = 0.28;
            src.buffer = buf;
            src.connect(g).connect(dest);
            src.start();
          }
        }
      });
    }

    drawFrame(t);
    if (srcVideo.ended || t >= dur - 0.05) {
      recorder.stop();
      return;
    }
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);
});

document.getElementById("btnShareSave").addEventListener("click", async () => {
  if (!exportedBlob) return;
  const file = new File([exportedBlob], `xe_dien_nghiem_review.${exportedExt}`, { type: exportedBlob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Video Review Xe Điện Nghiêm" });
      return;
    } catch (e) {}
  }
  document.getElementById("dlLink").click();
});

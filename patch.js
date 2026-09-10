const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.join(__dirname, 'public', 'index.html'),
  path.join(__dirname, 'index.html')
];

const cleanBlock = `function createObjectFabricTile(color, size, type) {
    const tile = document.createElement('canvas');
    const s = Math.max(4, Math.round(size));
    tile.width = s;
    tile.height = s;
    const tc = tile.getContext('2d');

    if (type === 'denim') {
      tc.fillStyle = 'rgba(255,255,255,0.18)';
      tc.fillRect(0, 0, s / 2, s / 2);
      tc.fillRect(s / 2, s / 2, s / 2, s / 2);
      tc.fillStyle = 'rgba(0,0,0,0.3)';
      tc.fillRect(s / 2, 0, s / 2, s / 2);
      tc.fillRect(0, s / 2, s / 2, s / 2);
    } else if (type === 'grain') {
      const imgData = tc.createImageData(s, s);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const isLight = Math.random() > 0.5;
        imgData.data[i] = isLight ? 255 : 0;
        imgData.data[i + 1] = isLight ? 255 : 0;
        imgData.data[i + 2] = isLight ? 255 : 0;
        imgData.data[i + 3] = Math.round(Math.random() * 120);
      }
      tc.putImageData(imgData, 0, 0);
    } else if (type === 'carbon') {
      tc.fillStyle = 'rgba(0,0,0,0.55)';
      tc.fillRect(0, 0, s, s);
      tc.fillStyle = 'rgba(255,255,255,0.12)';
      tc.fillRect(0, 0, s / 2, s / 2);
      tc.fillRect(s / 2, s / 2, s / 2, s / 2);
      tc.fillStyle = 'rgba(255,255,255,0.2)';
      tc.fillRect(0, 0, s / 2, 1);
      tc.fillRect(s / 2, s / 2, s / 2, 1);
    } else {
      tc.fillStyle = 'rgba(255,255,255,0.16)';
      tc.fillRect(0, 0, s, s / 2);
      tc.fillStyle = 'rgba(0,0,0,0.25)';
      tc.fillRect(0, s / 2, s / 2, s / 2);
      tc.fillStyle = 'rgba(255,255,255,0.12)';
      tc.fillRect(0, 0, s / 2, s);
      tc.fillStyle = 'rgba(0,0,0,0.2)';
      tc.fillRect(s / 2, 0, s / 2, s);
    }
    return tile;
  }

  function applyLayerFX(src, layer){
    if(!layer.fx || !layer.fx.type || layer.fx.type === 'none') return src;
    const fx = layer.fx;
    const w = src.w, h = src.h;
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const c = off.getContext('2d');
    c.drawImage(src.canvas, 0, 0);

    const t = (typeof currentAnimTime !== 'undefined' ? currentAnimTime : 0) * (fx.speed != null ? fx.speed : 1);
    const scale = Math.max(4, fx.scale || 20);
    const intensity = Math.max(1, fx.intensity != null ? fx.intensity : 80);
    const bevel = Math.max(0, fx.bevel != null ? fx.bevel : 3);
    const col1 = fx.color1 || '#00ffcc';
    const col2 = fx.color2 || '#0a1518';
    const col3 = fx.color3 || '#ff0055';
    const col4 = fx.color4 || '#ffffff';
    const rgb1 = hexToRgb(col1);
    const rgb2 = hexToRgb(col2);
    const rgb3 = hexToRgb(col3);

    const fxCanvas = document.createElement('canvas');
    fxCanvas.width = w; fxCanvas.height = h;
    const fc = fxCanvas.getContext('2d');

    if(fx.type === 'fabric' || fx.type === 'denim' || fx.type === 'grain' || fx.type === 'carbon'){
      const tileScale = Math.max(4, Math.round(scale / 2));
      const tile = createObjectFabricTile(col1, tileScale, fx.type);
      const pat = fc.createPattern(tile, 'repeat');
      if(pat){
        fc.fillStyle = pat;
        fc.fillRect(0, 0, w, h);
      }
      c.save();
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = Math.min(1, intensity / 100);
      c.drawImage(fxCanvas, 0, 0);
      c.restore();
      return { canvas: off, w, h };
    } else if(fx.type === 'honeycomb'){
      fc.fillStyle = col2;
      fc.fillRect(0, 0, w, h);

      const r = scale;
      const deltaX = r * Math.sqrt(3);
      const deltaY = r * 1.5;
      const cols = Math.ceil(w / deltaX) + 2;
      const rows = Math.ceil(h / deltaY) + 2;

      fc.lineWidth = Math.max(1, r * 0.08);
      fc.strokeStyle = col1;

      let hexIdx = 0;
      for(let row = -1; row <= rows; row++){
        const cy = row * deltaY;
        const xOffset = (Math.abs(row) % 2 === 1) ? (deltaX / 2) : 0;
        for(let col = -1; col <= cols; col++){
          hexIdx++;
          const cx = col * deltaX + xOffset;

          fc.beginPath();
          for(let a = 0; a < 6; a++){
            const rad = (Math.PI / 180) * (60 * a + 30);
            const px = cx + r * Math.cos(rad);
            const py = cy + r * Math.sin(rad);
            if(a === 0) fc.moveTo(px, py); else fc.lineTo(px, py);
          }
          fc.closePath();
          fc.stroke();

          const randPhase = (hexIdx * 137.5) % 100;
          const pulse = Math.sin(t * 3 + randPhase * 0.1);
          if(pulse > 0.35){
            fc.save();
            fc.fillStyle = col3;
            fc.globalAlpha = Math.min(1, (pulse - 0.35) * 1.5);
            fc.fill();
            fc.restore();
          }
        }
      }
    } else if(fx.type === 'chrome'){
      const angle = (t * 0.4) % (Math.PI * 2);
      const grad = fc.createLinearGradient(0, 0, w * Math.cos(angle), h * Math.sin(angle));
      grad.addColorStop(0.0, '#111111');
      grad.addColorStop(0.2, col1);
      grad.addColorStop(0.48, col4);
      grad.addColorStop(0.5, '#000000');
      grad.addColorStop(0.52, '#222222');
      grad.addColorStop(0.75, col3);
      grad.addColorStop(1.0, col4);
      fc.fillStyle = grad;
      fc.fillRect(0, 0, w, h);
    } else if(fx.type === 'liquid'){
      const imgData = fc.createImageData(w, h);
      const d = imgData.data;
      const invScale = 1 / scale;
      for(let y = 0; y < h; y += 2){
        for(let x = 0; x < w; x += 2){
          const v1 = Math.sin(x * invScale + t * 2);
          const v2 = Math.cos(y * invScale - t * 1.5);
          const v3 = Math.sin((x + y) * invScale * 0.5 + t);
          const factor = (v1 + v2 + v3 + 3) / 6;
          const r = Math.round(rgb1.r + (rgb3.r - rgb1.r) * factor);
          const g = Math.round(rgb1.g + (rgb3.g - rgb1.g) * factor);
          const b = Math.round(rgb1.b + (rgb3.b - rgb1.b) * factor);
          const idx = (y * w + x) * 4;
          d[idx] = r; d[idx+1] = g; d[idx+2] = b; d[idx+3] = 255;
          d[idx+4] = r; d[idx+5] = g; d[idx+6] = b; d[idx+7] = 255;
          const nextRow = idx + w * 4;
          d[nextRow] = r; d[nextRow+1] = g; d[nextRow+2] = b; d[nextRow+3] = 255;
          d[nextRow+4] = r; d[nextRow+5] = g; d[nextRow+6] = b; d[nextRow+7] = 255;
        }
      }
      fc.putImageData(imgData, 0, 0);
    } else if(fx.type === 'fire'){
      const grad = fc.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, col1);
      grad.addColorStop(0.6, col3);
      grad.addColorStop(1, col2);
      fc.fillStyle = grad;
      fc.fillRect(0, 0, w, h);
      fc.globalCompositeOperation = 'lighter';
      const sparkCount = Math.max(10, Math.round(intensity * 0.6));
      for(let i = 0; i < sparkCount; i++){
        const seed = (i * 997) % 1000 / 1000;
        const speedFactor = 0.5 + (i % 5) * 0.2;
        const py = h - ((t * 80 * speedFactor + seed * h) % h);
        const px = (seed * w + Math.sin(t * 6 + i) * scale) % w;
        const rad = Math.max(3, (1 - py / h) * scale * 0.8);
        const g2 = fc.createRadialGradient(px, py, 0, px, py, rad);
        g2.addColorStop(0, col1);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        fc.fillStyle = g2;
        fc.beginPath();
        fc.arc(px, py, rad, 0, Math.PI * 2);
        fc.fill();
      }
    } else if(fx.type === 'embroidery'){
      fc.fillStyle = col2;
      fc.fillRect(0, 0, w, h);
      fc.strokeStyle = 'rgba(0,0,0,0.35)';
      fc.lineWidth = 1;
      for(let y = 0; y < h; y += 4){
        fc.beginPath(); fc.moveTo(0, y); fc.lineTo(w, y); fc.stroke();
      }
      for(let x = 0; x < w; x += 4){
        fc.beginPath(); fc.moveTo(x, 0); fc.lineTo(x, h); fc.stroke();
      }
      fc.strokeStyle = col1;
      fc.lineWidth = Math.max(2, scale * 0.15);
      fc.setLineDash([Math.max(3, scale * 0.25), Math.max(3, scale * 0.2)]);
      for(let diag = -h; diag < w + h; diag += scale * 0.4){
        fc.beginPath();
        fc.moveTo(diag, 0);
        fc.lineTo(diag + h, h);
        fc.stroke();
      }
      fc.setLineDash([]);
    } else if(fx.type === 'lunar'){
      fc.fillStyle = col2;
      fc.fillRect(0, 0, w, h);
      const craterCount = Math.max(12, Math.round(intensity * 0.8));
      for(let i = 0; i < craterCount; i++){
        const cx = ((i * 389) % w);
        const cy = ((i * 701) % h);
        const cr = Math.max(3, ((i * 131) % Math.round(scale)));
        fc.save();
        fc.beginPath();
        fc.arc(cx, cy, cr, 0, Math.PI * 2);
        fc.fillStyle = 'rgba(0,0,0,0.45)';
        fc.fill();
        fc.lineWidth = Math.max(1, cr * 0.25);
        fc.strokeStyle = col1;
        fc.stroke();
        fc.restore();
      }
    } else if(fx.type === 'glitch'){
      const split = Math.max(2, Math.round(intensity * 0.25));
      const glitchOff = document.createElement('canvas');
      glitchOff.width = w; glitchOff.height = h;
      const gc = glitchOff.getContext('2d');

      const rCanvas = document.createElement('canvas');
      rCanvas.width = w; rCanvas.height = h;
      const rc = rCanvas.getContext('2d');
      rc.drawImage(src.canvas, 0, 0);
      rc.globalCompositeOperation = 'source-in';
      rc.fillStyle = col1;
      rc.fillRect(0, 0, w, h);

      const cCanvas = document.createElement('canvas');
      cCanvas.width = w; cCanvas.height = h;
      const cc = cCanvas.getContext('2d');
      cc.drawImage(src.canvas, 0, 0);
      cc.globalCompositeOperation = 'source-in';
      cc.fillStyle = col3;
      cc.fillRect(0, 0, w, h);

      const jitter = Math.sin(t * 12) * split;
      gc.globalAlpha = 0.8;
      gc.drawImage(rCanvas, -jitter, 0);
      gc.globalCompositeOperation = 'lighter';
      gc.drawImage(cCanvas, jitter, 0);

      const sliceCount = Math.max(2, Math.round(intensity * 0.15));
      for(let i = 0; i < sliceCount; i++){
        const sliceY = (Math.sin(t * 5 + i * 2.3) * 0.5 + 0.5) * h;
        const sliceH = Math.max(2, (Math.cos(t * 7 + i) * 0.5 + 0.5) * 16);
        const shiftX = Math.sin(t * 20 + i * 5) * split * 2;
        gc.drawImage(src.canvas, 0, sliceY, w, sliceH, shiftX, sliceY, w, sliceH);
      }

      c.save();
      c.globalCompositeOperation = 'source-atop';
      c.drawImage(glitchOff, 0, 0);
      c.restore();
      return { canvas: off, w, h };
    } else if(fx.type === 'crystal'){
      fc.fillStyle = col2;
      fc.fillRect(0, 0, w, h);
      fc.strokeStyle = col1;
      fc.lineWidth = Math.max(1, scale * 0.05);
      fc.shadowColor = col1;
      fc.shadowBlur = 4;
      const points = [];
      const nodeCount = Math.max(8, Math.round(intensity * 0.4));
      for(let i = 0; i < nodeCount; i++){
        points.push({ x: (i * 433) % w, y: (i * 617) % h });
      }
      for(let i = 0; i < points.length; i++){
        for(let j = i + 1; j < points.length; j++){
          const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
          if(dist < scale * 3.5){
            fc.beginPath();
            fc.moveTo(points[i].x, points[i].y);
            fc.lineTo(points[j].x, points[j].y);
            fc.stroke();
          }
        }
      }
    }

    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.globalAlpha = Math.min(1, intensity / 100);
    c.drawImage(fxCanvas, 0, 0);
    c.restore();

    if(bevel > 0){
      const lightCanvas = document.createElement('canvas');
      lightCanvas.width = w; lightCanvas.height = h;
      const lc = lightCanvas.getContext('2d');
      lc.drawImage(src.canvas, -bevel, -bevel);
      lc.globalCompositeOperation = 'source-in';
      lc.fillStyle = col4;
      lc.fillRect(0, 0, w, h);

      const darkCanvas = document.createElement('canvas');
      darkCanvas.width = w; darkCanvas.height = h;
      const dc = darkCanvas.getContext('2d');
      dc.drawImage(src.canvas, bevel, bevel);
      dc.globalCompositeOperation = 'source-in';
      dc.fillStyle = '#000000';
      dc.fillRect(0, 0, w, h);

      c.save();
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = 0.55;
      c.drawImage(darkCanvas, 0, 0);
      c.globalAlpha = 0.75;
      c.drawImage(lightCanvas, 0, 0);
      c.restore();
    }

    return { canvas: off, w, h };
  }`;

targetFiles.forEach(fp => {
  if (!fs.existsSync(fp)) return;
  let html = fs.readFileSync(fp, 'utf8');

  const targetRegex = /(?:function\s+createObjectFabricTile[\s\S]*?)?function\s+applyLayerFX\s*\([\s\S]*?(?=\s*function\s+renderLayerToCanvas)/;
  if (targetRegex.test(html)) {
    html = html.replace(targetRegex, cleanBlock + '\n\n  ');
    fs.writeFileSync(fp, html, 'utf8');
    console.log('Naprawiono funkcje w:', fp);
  }
});
// Extends the existing canvas, playback, recording and editor engine.
(() => {
  const previousFrame = PresentationApp.prototype.drawFrame;
  const images = new Map();
  const colors = ['#5933a9', '#2b8a6e', '#df7d4b', '#6c78b0'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = v => 1-Math.pow(1-Math.max(0,Math.min(1,v)),3);
  const isFileProtocol = (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:');
  const MOTION_SETTLE_SEC = 10.0;

  // Motion runs for 10 seconds then settles cleanly (used by all slides except Slide 12 & Slide 14)
  function getCappedMotion(app) {
    const rawT = app.v3MotionEnabled !== false
      ? Math.max(app._v3motionSeconds || 0, app.slideElapsed || 0)
      : MOTION_SETTLE_SEC;
    return {
      rawT,
      isSettled: rawT >= MOTION_SETTLE_SEC,
      t: Math.min(MOTION_SETTLE_SEC, rawT)
    };
  }

  function loadImage(src) {
    if (!src) return null;
    if (!images.has(src)) {
      const im = new Image();
      if (!isFileProtocol) {
        im.crossOrigin = 'anonymous';
      }
      im.src = src;
      images.set(src, im);
    }
    return images.get(src);
  }

  function enter(app,y,delay) {
    const p=app.v3MotionEnabled===false?1:ease(((app._v3time||0)-(delay??Math.max(0,(y-280)/240)))/1.25);
    app.ctx.save();app.ctx.globalAlpha*=p;app.ctx.translate(0,reduceMotion?0:22*(1-p));
  }
  function picture(app, src, x, y, w, h) {
    if (!src) return;
    const im = loadImage(src);
    enter(app,y,0.8);
    if(app.v3MotionEnabled!==false) app.ctx.translate(0,Math.sin((app._v3motionSeconds||0)*1.1)*8);
    if (im && im.complete && im.naturalWidth) app.drawMediaContain(app.ctx, im, im.naturalWidth, im.naturalHeight, x, y, w, h);
    app.ctx.restore();
  }
  function text(app, value, x, y, width, size=28, color='#243c34', weight='500') {
    enter(app,y);
    app.ctx.fillStyle = color;
    app.fillFittedText(app.ctx, value, x, y, width, size, weight, '"Prompt", "Tahoma", sans-serif', 'left', size-2);
    app.ctx.restore();
  }
  function paragraph(app, value, x, y, width, size=27, color='#60756b') {
    enter(app,y);
    const ctx=app.ctx; ctx.fillStyle=color; ctx.font=`400 ${size}px "Prompt", "Tahoma", sans-serif`;
    const segments = typeof Intl.Segmenter === 'function' ? Array.from(new Intl.Segmenter('th',{granularity:'word'}).segment(value || ''), s=>s.segment) : Array.from(value || '');
    let line='', cy=y;
    for (const word of segments) {
      if (line && ctx.measureText(line+word).width>width) {ctx.fillText(line,x,cy); cy+=size*1.65; line='';}
      line+=word;
    }
    if(line) ctx.fillText(line,x,cy);
    ctx.restore();
    return cy+size*1.65;
  }
  function rule(ctx,x,y,w,color='#d1e0d7') {ctx.fillStyle=color;ctx.fillRect(x,y,w,2);}
  function motion(app,s) {
    const ctx=app.ctx,t=app._v3motionSeconds||0;
    const moving=app.v3MotionEnabled!==false;
    const phase=moving?(t%6)/6:0.5;
    ctx.save();
    if(s.layout==='cover') { ctx.restore(); return; }
    // Process ribbon keeps motion visible for the whole speaking interval.
    if(s.layout!=='team') {
      const labels=['DESIGN INPUT','AUTOMATION','PRODUCTION OUTPUT'];
      const xs=[108,790,1472];
      for(let i=0;i<3;i++) {
        ctx.fillStyle=colors[i];ctx.fillRect(xs[i],932,14,14);
        ctx.font='600 18px "Prompt", sans-serif';ctx.fillText(labels[i],xs[i]+28,947);
        if(i<2){
          const start=xs[i]+290,end=xs[i+1]-24;
          ctx.fillStyle='#cbded2';ctx.fillRect(start,938,end-start,3);
          for(let k=0;k<3;k++) {const p=(phase+k/3)%1;ctx.globalAlpha=0.35+0.65*p;ctx.fillStyle=colors[i];ctx.fillRect(start+p*(end-start-16),932,16,14);}
          ctx.globalAlpha=1;
        }
      }
    }
    // Moving emphasis follows the visible groups without hiding their content.
    const nodes=s.nodes||[];
    const selected=moving?Math.floor(t/4)%Math.max(1,nodes.length):0;
    const grow=moving?ease((t%4)/1.4):1;
    if(s.layout==='cover'||s.layout==='pillars') {
      const x=108+selected*(s.layout==='cover'?285:580);
      ctx.fillStyle=colors[selected%4];ctx.fillRect(x,s.layout==='cover'?746:477,(s.layout==='cover'?235:510)*grow,7);
    }else if(s.layout==='compare'){
      const y=452+selected*118;ctx.fillStyle='#df7d4b';ctx.fillRect(850+phase*60,y-24,12,24);ctx.fillStyle='#2b8a6e';ctx.fillRect(976,y+42,790*grow,6);
    }else if(s.layout==='results'){
      const i=moving?Math.floor(t/4)%3:0;ctx.fillStyle=colors[i];ctx.fillRect(108+i*580,678,490*grow,7);
    }else if(s.layout==='team'){
      const x=108+(selected%2)*880,y=546+Math.floor(selected/2)*240;ctx.fillStyle=colors[selected%4];ctx.fillRect(x,y,780*grow,6);
    }else if(nodes.length){
      const y=393+selected*(nodes.length>3?143:190);ctx.fillStyle=colors[selected%4];ctx.fillRect(172,y-28,6,76);
      // Scan accent stays outside the evidence image, never covers its labels.
      ctx.fillStyle='#b7d6c6';ctx.fillRect(1806,360,4,525);ctx.fillStyle='#2b8a6e';ctx.fillRect(1802,360+phase*465,12,60);
    }
    ctx.restore();
  }
  function drawCoverScene(app, s) {
    const ctx = app.ctx;
    const { isSettled, t } = getCappedMotion(app);
    
    // 1. Pristine Clean Background (Pure gradient + 3D Villa House & Fountain, 0 ghost boxes, 0 artifacts)
    const bgSrc = 'assets/ver3/slide_01_clean_bg.png';
    const bg = loadImage(bgSrc);
    if (bg && bg.complete && bg.naturalWidth) {
      if (typeof ctx.drawImage === 'function') ctx.drawImage(bg, 0, 0, 1920, 1080);
    } else {
      ctx.fillStyle = '#8ecfbd';
      ctx.fillRect(0, 0, 1920, 1080);
    }

    // 1b. Clean Transparent SCG HEIM Logo (เล็กลง พร้อมเรืองแสงสีรอบ บางๆ)
    const logoSrc = 'assets/ver3/scg_heim_logo_transparent.png';
    const logo = loadImage(logoSrc);
    if (logo && logo.complete && logo.naturalWidth) {
      const logoW = 126;
      const logoH = 84;
      const logoX = 1724;
      const logoY = 36;

      ctx.save();
      // Soft ambient radial glow behind logo
      if (typeof ctx.createRadialGradient === 'function') {
        const glow = ctx.createRadialGradient(logoX + logoW / 2, logoY + logoH / 2, logoW * 0.15, logoX + logoW / 2, logoY + logoH / 2, logoW * 0.85);
        glow.addColorStop(0, 'rgba(168, 240, 220, 0.42)');
        glow.addColorStop(0.5, 'rgba(110, 215, 185, 0.18)');
        glow.addColorStop(1, 'rgba(110, 215, 185, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(logoX + logoW / 2, logoY + logoH / 2, logoW * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      // Transparent PNG outline soft glow
      ctx.shadowColor = 'rgba(168, 240, 220, 0.75)';
      ctx.shadowBlur = 12;
      if (typeof ctx.drawImage === 'function') ctx.drawImage(logo, logoX, logoY, logoW, logoH);
      ctx.restore();
    }

    // 2. Rectangular Green Banners
    // TOP BANNER (Title): Starts at x=65, extends to the right edge (x=1920), fading out gradually ("จางลงไปเรื่อยๆ")
    ctx.save();
    if (typeof ctx.createLinearGradient === 'function') {
      const topGrad = ctx.createLinearGradient(65, 0, 1920, 0);
      topGrad.addColorStop(0, 'rgba(138, 206, 180, 0.95)');
      topGrad.addColorStop(1140 / 1920, 'rgba(138, 206, 180, 0.95)');
      topGrad.addColorStop(1440 / 1920, 'rgba(138, 206, 180, 0.65)');
      topGrad.addColorStop(1740 / 1920, 'rgba(138, 206, 180, 0.25)');
      topGrad.addColorStop(1.0, 'rgba(138, 206, 180, 0.0)');
      ctx.fillStyle = topGrad;
    } else {
      ctx.fillStyle = 'rgba(138, 206, 180, 0.95)';
    }
    ctx.fillRect(65, 114, 1855, 182);

    // BOTTOM BANNER (Subtitle): Starts at x=65, extends past full subtitle text ("Installation") with clean right padding
    const subText = ':: End-to-End Value Creation from Design to Production & Installation';
    ctx.font = '600 31px "Prompt", "Segoe UI", sans-serif';
    const subTextW = (typeof ctx.measureText === 'function' ? ctx.measureText(subText).width : 1110) || 1110;
    const subBannerW = Math.max(1205, Math.round((115 + subTextW + 38) - 65));
    ctx.fillStyle = 'rgba(142, 211, 185, 0.95)';
    ctx.fillRect(65, 330, subBannerW, 68);
    ctx.restore();

    // 3. Real Native Typography for Title and Subtitle
    // Line 1: INTEGRATED DESIGN (Baseline y=196)
    const p1 = Math.min(1, Math.max(0, (t - 0.2) / 0.55));
    const ease1 = 1 - Math.pow(1 - p1, 3);
    const x1 = 115 - (1 - ease1) * 36;
    ctx.save();
    ctx.font = '900 84px "Prompt", "Artifakt Element Black", "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, ' + (0.35 * p1) + ')';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    ctx.globalAlpha = p1;
    ctx.fillText('INTEGRATED DESIGN', x1, 196);
    ctx.restore();

    // Line 2: & BOM AUTOMATION (Baseline y=280)
    const p2 = Math.min(1, Math.max(0, (t - 0.45) / 0.55));
    const ease2 = 1 - Math.pow(1 - p2, 3);
    const x2 = 115 - (1 - ease2) * 36;
    ctx.save();
    ctx.font = '900 84px "Prompt", "Artifakt Element Black", "Arial Black", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, ' + (0.35 * p2) + ')';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    ctx.globalAlpha = p2;
    ctx.fillText('& BOM AUTOMATION', x2, 280);
    ctx.restore();

    // Subtitle: :: End-to-End Value Creation from Design to Production & Installation (Baseline y=376)
    const p3 = Math.min(1, Math.max(0, (t - 0.72) / 0.5));
    const ease3 = 1 - Math.pow(1 - p3, 3);
    const x3 = 115 - (1 - ease3) * 24;
    ctx.save();
    ctx.font = '600 31px "Prompt", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, ' + (0.30 * p3) + ')';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.globalAlpha = p3;
    ctx.fillText(subText, x3, 376);
    ctx.restore();

    // Animated orange accent underline rule under subtitle (y=404, spanning the full subtitle width)
    const pRule = Math.min(1, Math.max(0, (t - 0.9) / 0.65));
    const easeRule = 1 - Math.pow(1 - pRule, 3);
    const ruleW = Math.max(1125, Math.round(subTextW + 16));
    ctx.fillStyle = '#ff9557';
    ctx.fillRect(115, 404, ruleW * easeRule, 3.5);

    // 4. Circuit Lines from 3D House Fountain to the Stack (เส้นประสีเขียวและจุดแสง: จัดแนวโค้งมุม แบบเดิม)
    const pCirc = Math.min(1, Math.max(0, (t - 1.0) / 1.2));
    if (pCirc > 0) {
      ctx.save();
      // White circular anchor node on the carport roof
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(770, 735, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(41, 175, 140, ' + (0.9 * pCirc) + ')';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(41, 175, 140, ' + (0.85 * pCirc) + ')';
      ctx.lineWidth = 2.4;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = isSettled ? 0 : -t * 18;
      if (typeof ctx.beginPath === 'function') {
        // Curve 1 (Top branch): From anchor (770, 735) to BOM (1320, 495) with smooth rounded fillet corners
        ctx.beginPath();
        ctx.moveTo(770, 735);
        if (typeof ctx.arcTo === 'function') {
          ctx.arcTo(770, 545, 1200, 545, 55);
          ctx.arcTo(1200, 545, 1320, 495, 65);
          ctx.lineTo(1320, 495);
        } else {
          ctx.lineTo(770, 545);
          ctx.lineTo(1200, 545);
          ctx.lineTo(1320, 495);
        }
        ctx.stroke();

        // Curve 2 (Bottom branch): From (788, 750) to Data Base (1320, 635) with smooth rounded fillet corners
        ctx.beginPath();
        ctx.moveTo(788, 750);
        if (typeof ctx.arcTo === 'function') {
          ctx.arcTo(788, 565, 1220, 565, 55);
          ctx.arcTo(1220, 565, 1320, 635, 65);
          ctx.lineTo(1320, 635);
        } else {
          ctx.lineTo(788, 565);
          ctx.lineTo(1220, 565);
          ctx.lineTo(1320, 635);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Moving energy pulse dot along curved circuit (stops after 10s)
      if (!isSettled) {
        const pulseT = ((t * 0.9) % 1);
        let pulseX, pulseY;
        if (pulseT < 0.28) {
          const segP = pulseT / 0.28;
          pulseX = 770;
          pulseY = 735 - segP * (735 - 545);
        } else if (pulseT < 0.72) {
          const segP = (pulseT - 0.28) / 0.44;
          pulseX = 770 + segP * (1200 - 770);
          pulseY = 545;
        } else {
          const segP = (pulseT - 0.72) / 0.28;
          pulseX = 1200 + segP * (1320 - 1200);
          pulseY = 545 + segP * (495 - 545);
        }
        ctx.save();
        ctx.fillStyle = '#ff9557';
        ctx.shadowColor = 'rgba(255, 149, 87, 0.85)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 5. Vertical Stack Guide Wires (แบบเดิม)
    const pWire = Math.min(1, Math.max(0, (t - 1.2) / 3.8));
    if (pWire > 0) {
      const wireH = 720 * pWire;
      ctx.save();
      ctx.strokeStyle = 'rgba(41, 175, 140, 0.75)';
      ctx.lineWidth = 1.5;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(1281, 240); ctx.lineTo(1281, 240 + wireH);
        ctx.moveTo(1618, 240); ctx.lineTo(1618, 240 + wireH);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6. The 5 Isometric Diamond Layers (ตำแหน่งแบบเดิม: cy = 355, 495, 635, 775, 930)
    const layers = [
      { id: 'floorplan', name: 'Floorplan', start: 1.2, cx: 1450, cy: 355, fill: 'rgba(235, 246, 242, 0.95)', stroke: '#ff9557' },
      { id: 'bom', name: 'BOM', start: 2.1, cx: 1450, cy: 495, fill: 'rgba(185, 222, 210, 0.95)', stroke: '#ff9557' },
      { id: 'database', name: 'Data Base', start: 3.0, cx: 1450, cy: 635, fill: 'rgba(235, 246, 242, 0.95)', stroke: '#ff9557' },
      { id: 'dwg', name: 'DWG', start: 3.9, cx: 1450, cy: 775, fill: 'rgba(235, 246, 242, 0.95)', stroke: '#ff9557' },
      { id: 'production', name: 'Production', start: 4.8, cx: 1452, cy: 930, fill: 'rgba(52, 58, 62, 0.96)', stroke: '#ff9557' }
    ];

    const activeIdx = (!isSettled && t >= 5.8) ? Math.floor((t - 5.8) / 1.6) % 5 : -1;

    for (let i = 0; i < layers.length; i++) {
      const lay = layers[i];
      const tRel = t - lay.start;
      if (tRel < 0) continue;

      const pEnter = Math.min(1, tRel / 0.55);
      const easeEnter = 1 - Math.pow(1 - pEnter, 3);
      const dropY = (1 - easeEnter) * -60;
      const alpha = pEnter;
      const isActive = i === activeIdx;
      const bobY = (isActive && !isSettled) ? Math.sin(t * 3.5) * 3 : 0;
      const curCy = lay.cy + dropY + bobY;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (isActive) {
        ctx.shadowColor = 'rgba(255, 149, 87, 0.75)';
        ctx.shadowBlur = 18;
      }

      if (lay.id !== 'production') {
        const hw = 168.0;
        const hh = 95.0;
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.moveTo(lay.cx, curCy - hh);
          ctx.lineTo(lay.cx + hw, curCy);
          ctx.lineTo(lay.cx, curCy + hh);
          ctx.lineTo(lay.cx - hw, curCy);
          ctx.closePath();
          ctx.fillStyle = lay.fill;
          ctx.fill();
          ctx.strokeStyle = lay.stroke;
          ctx.lineWidth = isActive ? 5 : 3.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = lay.fill;
          ctx.fillRect(lay.cx - hw, curCy - hh, hw * 2, hh * 2);
        }
      } else {
        const poly = [
          [1284.5, 930.6], [1375.3, 984.7], [1379.0, 1011.2],
          [1450.2, 1053.3], [1620.7, 951.1], [1556.9, 913.8],
          [1552.0, 886.2], [1463.7, 834.5], [1452.6, 828.5],
          [1283.3, 927.0]
        ];
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          for (let k = 0; k < poly.length; k++) {
            const px = poly[k][0];
            const py = poly[k][1] + dropY + bobY;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = lay.fill;
          ctx.fill();
          ctx.strokeStyle = lay.stroke;
          ctx.lineWidth = isActive ? 5 : 3.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = lay.fill;
          ctx.fillRect(1284, 828 + dropY + bobY, 336, 225);
        }
      }

      // Draw real text on each layer tilted at -30 deg
      ctx.save();
      ctx.translate(lay.cx, curCy);
      if (typeof ctx.rotate === 'function') ctx.rotate(-30 * Math.PI / 180);

      if (lay.id === 'floorplan') {
        ctx.font = 'italic 900 32px "Prompt", "Artifakt Element Black", "Arial Black", sans-serif';
        ctx.fillStyle = '#3a3e40';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Floorplan', 0, 0);
      } else if (lay.id === 'bom') {
        ctx.font = 'italic 900 42px "Prompt", "Artifakt Element Black", "Arial Black", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BOM', 0, 0);
      } else if (lay.id === 'database') {
        ctx.font = 'italic 900 30px "Prompt", "Artifakt Element Black", "Arial Black", sans-serif';
        ctx.fillStyle = '#3a3e40';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Data Base', 0, 0);
      } else if (lay.id === 'dwg') {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'italic 900 28px "Prompt", "Artifakt Element Black", "Arial Black", sans-serif';
        ctx.fillStyle = '#1c2423';
        ctx.fillText('DWG', -58, -25);

        ctx.font = 'italic 600 20px "Prompt", sans-serif';
        ctx.fillStyle = '#2a3230';
        ctx.fillText('> Assembly', -20, 2);
        ctx.fillText('> Detail', -8, 28);
      } else if (lay.id === 'production') {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'italic 900 26px "Prompt", "Artifakt Element Black", "Arial Black", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Purchasing', -75, -42);
        ctx.font = 'italic 600 18.5px "Prompt", sans-serif';
        ctx.fillStyle = '#dddddd';
        ctx.fillText('> Vendor', -45, -18);

        ctx.font = 'italic 900 26px "Prompt", "Artifakt Element Black", "Arial Black", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Production', -50, 12);
        ctx.font = 'italic 600 17px "Prompt", sans-serif';
        ctx.fillStyle = '#dddddd';
        ctx.fillText('> Smart Board Punching', -20, 35);
        ctx.fillText('> Picking Part to Assembly', -5, 57);
      }

      ctx.restore();
      ctx.restore();
    }
  }
  function drawPageBadge(ctx, app) {
    const pageNum = String(app.activeSlideIndex + 1).padStart(2, '0');
    const totalPages = String(app.slides.length).padStart(2, '0');
    const badgeText = `${pageNum} / ${totalPages}`;

    const x = 1715;
    const y = 35;
    const w = 164;
    const h = 42;
    const r = 10;

    ctx.save();
    // Rounded rect badge matching #E0EEE6 with crisp border
    ctx.fillStyle = '#e0eee6';
    if (typeof ctx.beginPath === 'function') {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(43, 138, 110, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, w, h);
    }

    ctx.font = '700 22px "Prompt", "JetBrains Mono", sans-serif';
    ctx.fillStyle = '#1b382d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, x + w / 2, y + h / 2 + 1);
    ctx.restore();
  }

  function drawBackgroundScene(app, s) {
    const ctx = app.ctx;
    const { isSettled, t } = getCappedMotion(app);

    // 1. Draw Clean Pure Background Graphic WITHOUT text or baked pills (1920x1080)
    const pal = (typeof app.getCustomBackgroundPalette === 'function' && app.bgPreset && app.bgPreset !== 'default')
      ? app.getCustomBackgroundPalette('mint')
      : null;
    const isDark = Boolean(pal && pal.isDark);

    if (pal && pal.stops) {
      const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
      pal.stops.forEach((col, i) => bgGrad.addColorStop(i / Math.max(1, pal.stops.length - 1), col));
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1920, 1080);

      // Original purple teardrop motif in dark/custom preset
      ctx.save();
      ctx.fillStyle = '#5F3AB4';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(100, 38, 324, 308, [160, 0, 160, 160]);
      else ctx.rect(100, 38, 324, 308);
      ctx.fill();
      ctx.restore();
    } else {
      const bgSrc = 'assets/ver3/slide_02_pure_bg.png';
      const bg = loadImage(bgSrc);
      if (bg && bg.complete && bg.naturalWidth) {
        if (typeof ctx.drawImage === 'function') {
          ctx.drawImage(bg, 0, 0, 1920, 1080);
          // Seamlessly extend left backdrop gradient (x < 1034, y: 395..869 -> 395..1080) to eliminate bottom cut-off band
          ctx.drawImage(bg, 0, 395, 1034, 474, 0, 395, 1034, 685);
          ctx.save();
          ctx.fillStyle = 'rgba(255, 149, 87, 0.72)';
          ctx.fillRect(1038, 870, 1.5, 96);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = '#8ecfbd';
        ctx.fillRect(0, 0, 1920, 1080);
      }
    }

    // Helper: Rounded Rectangle / Capsule Pill
    function drawPill(x, y, w, h, r, fillColor, strokeColor, lineWidth) {
      ctx.save();
      ctx.fillStyle = fillColor;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        const rad = Math.min(r, Math.min(w, h) / 2);
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, rad);
        } else {
          ctx.moveTo(x + rad, y);
          ctx.lineTo(x + w - rad, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
          ctx.lineTo(x + w, y + h - rad);
          ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
          ctx.lineTo(x + rad, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
          ctx.lineTo(x, y + rad);
          ctx.quadraticCurveTo(x, y, x + rad, y);
        }
        ctx.closePath();
        ctx.fill();
        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth || 2;
          ctx.stroke();
        }
      } else {
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();
    }

    if (pal && pal.stops) {
      drawPill(28, 368, 1004, 588, 0, isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(130, 120, 175, 0.25)', null, 0);
    }

    // Helper: Spring Ease & Scaling
    function popScale(progress) {
      const p = Math.min(1, Math.max(0, progress));
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      return Math.sin(p * Math.PI / 2) * (1 + 0.08 * (1 - p));
    }

    function drawScaled(cx, cy, scale, drawFn) {
      if (scale <= 0) return;
      if (scale >= 0.999) {
        drawFn();
        return;
      }
      ctx.save();
      ctx.translate(cx, cy);
      if (typeof ctx.scale === 'function') ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      drawFn();
      ctx.restore();
    }

    // Helper: Animated Arrow
    function drawArrow(x1, y1, x2, y2, progress, headSize, strokeColor, fillColor) {
      if (progress <= 0) return;
      const p = Math.min(1, Math.max(0, progress));
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;
      const curLen = len * p;
      const angle = Math.atan2(dy, dx);
      const curX = x1 + Math.cos(angle) * curLen;
      const curY = y1 + Math.sin(angle) * curLen;

      ctx.save();
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(curX, curY);
        ctx.strokeStyle = strokeColor || '#e07a3f';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (p > 0.35) {
          const hs = (headSize || 14) * Math.min(1, (p - 0.35) / 0.35);
          ctx.beginPath();
          ctx.moveTo(curX, curY);
          ctx.lineTo(curX - hs * Math.cos(angle - Math.PI / 6), curY - hs * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(curX - hs * Math.cos(angle + Math.PI / 6), curY - hs * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fillStyle = fillColor || '#ff9557';
          ctx.fill();
          ctx.strokeStyle = strokeColor || '#404040';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      } else {
        ctx.fillRect(Math.min(x1, curX), Math.min(y1, curY), Math.abs(curX - x1) || 4, Math.abs(curY - y1) || 4);
      }
      ctx.restore();
    }

    // Helper: Energy Pulse Packet along Arrow
    function drawArrowPulse(x1, y1, x2, y2, tOffset) {
      const cycle = ((t * 0.85 + (tOffset || 0)) % 1);
      const px = x1 + (x2 - x1) * cycle;
      const py = y1 + (y2 - y1) * cycle;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff9557';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        ctx.fillRect(px - 4, py - 4, 8, 8);
      }
      ctx.restore();
    }

    // 2. REAL TEXT: Title & Header
    const pTitle = Math.min(1, Math.max(0, t / 0.45));
    const easeTitle = 1 - Math.pow(1 - pTitle, 3);
    const titleX = 143 - (1 - easeTitle) * 25;
    ctx.save();
    ctx.globalAlpha = pTitle;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#85dcc9';
    ctx.font = '900 48px "Prompt", "Arial Black", sans-serif';
    ctx.fillText('[1]', titleX, 195);
    ctx.font = '900 68px "Prompt", "Arial Black", sans-serif';
    ctx.fillText('BACKGROUND', titleX, 275);
    ctx.fillStyle = '#f48c56';
    ctx.fillRect(titleX + 20, 311, 246, 6);
    ctx.restore();

    // 3. REAL TEXT: 3 Pain Points on Left (Original Transparent Style fitted cleanly within y = 375..945)
    const p1 = Math.min(1, Math.max(0, (t - 0.3) / 0.45));
    const p2 = Math.min(1, Math.max(0, (t - 0.7) / 0.45));
    const p3 = Math.min(1, Math.max(0, (t - 1.1) / 0.45));
    const numColor = isDark ? '#F8FAFC' : '#1c262d';
    const bodyColor = isDark ? '#E2E8F0' : '#142922';

    const leftPoints = [
      { p: p1, num: '01 |', key: 'Manpower Skill', pillW: 520, desc: '• ลดพึ่งพาทักษะเฉพาะคน ➔ สร้างมาตรฐานระบบ' },
      { p: p2, num: '02 |', key: 'Loss Cost & Rework', pillW: 630, desc: '• ลด Error และแก้ไขแบบ ➔ ลดต้นทุนความสูญเสีย' },
      { p: p3, num: '03 |', key: 'Reduce Time', pillW: 460, desc: '• ลดเวลาทำ BOM & DWG ➔ ทำงานเร็วขึ้น 7 เท่า' }
    ];

    leftPoints.forEach((lp, idx) => {
      if (lp.p <= 0) return;
      ctx.save();
      ctx.globalAlpha = lp.p;
      const offX = (1 - Math.pow(1 - lp.p, 3)) * 24;
      const startX = 64 + offX;
      const pillY = 382 + idx * 194;
      const pillH = 88;
      const midY = pillY + pillH / 2;

      // Bold Index Number (01 |, 02 |, 03 |)
      ctx.font = '900 54px "Prompt", sans-serif';
      ctx.fillStyle = numColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(lp.num, startX, midY);

      // Original Mint Capsule with Orange Accent Border + Bold Emphasized Keyword
      const pillX = startX + 122;
      drawPill(pillX, pillY, lp.pillW, pillH, 44, 'rgba(185, 226, 213, 0.95)', '#f48c56', 2.8);
      ctx.font = '900 46px "Prompt", sans-serif';
      ctx.fillStyle = '#182422';
      ctx.textAlign = 'center';
      ctx.fillText(lp.key, pillX + lp.pillW / 2, midY + 2);

      // Crisp Bullet Explanation Directly Below Capsule (stops at y = 904..922 inside Left Frame)
      ctx.font = '800 34px "Prompt", sans-serif';
      ctx.fillStyle = bodyColor;
      ctx.textAlign = 'left';
      ctx.fillText(lp.desc, startX, pillY + pillH + 46);
      ctx.restore();
    });

    // 4. RIGHT-SIDE FLOWCHART ANIMATION (Balanced & fitted cleanly inside Right Frame y = 90..968)
    const pContainer = Math.min(1, Math.max(0, (t - 1.2) / 0.55));
    if (pContainer > 0) {
      ctx.save();
      ctx.globalAlpha = pContainer;
      drawPill(1205, 224, 500, 742, 32, 'rgba(255, 255, 255, 0.05)', '#ff9557', 3);
      ctx.restore();
    }

    // 4b. 3D Architectural Blueprint Tablet Visual
    const pTablet = Math.min(1, Math.max(0, (t - 1.3) / 0.55));
    if (pTablet > 0) {
      const tabSrc = 'assets/ver3/slide_02_tablet.png';
      const tabImg = loadImage(tabSrc);
      if (tabImg && tabImg.complete && tabImg.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = pTablet;
        const hoverDamp = isSettled ? 0 : Math.max(0, 1 - t / 10);
        const hoverY = 90 + Math.sin(t * 2) * 5 * hoverDamp;
        if (typeof ctx.drawImage === 'function') {
          ctx.drawImage(tabImg, 1075, hoverY, 320, 332);
        }
        ctx.restore();
      }
    }

    // --- STAGE 1: Inputs (House Floorplan & Planning Rule) ---
    const s1Scale = popScale((t - 1.6) / 0.5);
    if (s1Scale > 0) {
      drawScaled(1045 + 69, 400 + 72, s1Scale, () => {
        drawPill(1045, 400, 138, 144, 72, '#b1c2ff', '#8dd4c2', 2.5);
        ctx.save();
        ctx.font = '800 20px "Prompt", sans-serif';
        ctx.fillStyle = '#1c2423';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('House', 1045 + 69, 400 + 58);
        ctx.fillText('Floorplan', 1045 + 69, 400 + 86);
        ctx.restore();
      });

      drawScaled(1045 + 69, 576 + 150, s1Scale, () => {
        drawPill(1045, 576, 138, 300, 48, '#b1c2ff', '#8dd4c2', 2.5);
        ctx.save();
        ctx.font = '800 18.5px "Prompt", sans-serif';
        ctx.fillStyle = '#1c2423';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Planning', 1045 + 69, 576 + 88);
        ctx.fillText('Rule', 1045 + 69, 576 + 118);
        ctx.fillText('&', 1045 + 69, 576 + 148);
        ctx.fillText('Standard', 1045 + 69, 576 + 178);
        ctx.fillText('Variation', 1045 + 69, 576 + 208);
        ctx.restore();
      });
    }

    // --- ARROW 1: Stage 1 -> Stage 2 ---
    const pArr1 = Math.min(1, Math.max(0, (t - 2.2) / 0.35));
    drawArrow(1045 + 138, 472, 1225, 472, pArr1);

    // --- STAGE 2: BOM & Processing Capsule ---
    const s2Scale = popScale((t - 2.4) / 0.55);
    if (s2Scale > 0) {
      drawScaled(1225 + 69, 375 + 255, s2Scale, () => {
        drawPill(1225, 375, 138, 510, 50, '#ff9557', null);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '800 21px "Prompt", sans-serif';
        ctx.fillStyle = '#1c2423';
        ctx.fillText('BOM', 1225 + 69, 375 + 72);
        ctx.fillText('Floorplan', 1225 + 69, 375 + 102);

        ctx.fillText('DWG', 1225 + 69, 375 + 234);
        ctx.fillText('Detail', 1225 + 69, 375 + 264);

        ctx.font = '700 18px "Prompt", sans-serif';
        ctx.fillText('Data', 1225 + 69, 375 + 392);
        ctx.fillText('Material', 1225 + 69, 375 + 420);
        ctx.fillText('Information', 1225 + 69, 375 + 448);
        ctx.restore();
      });
    }

    // --- ARROW 2: Stage 2 -> Stage 3 (PO) ---
    const pArr2 = Math.min(1, Math.max(0, (t - 3.0) / 0.35));
    drawArrow(1225 + 138, 472, 1388, 472, pArr2);

    // --- STAGE 3: Orders, Picking, and Production DWG ---
    const s3Scale = popScale((t - 3.2) / 0.5);
    if (s3Scale > 0) {
      drawScaled(1388 + 69, 400 + 72, s3Scale, () => {
        drawPill(1388, 400, 138, 144, 72, '#ff9557', null);
        ctx.save();
        ctx.font = '900 26px "Prompt", sans-serif';
        ctx.fillStyle = '#1c2423';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PO', 1388 + 69, 400 + 72);
        ctx.restore();
      });

      drawScaled(1388 + 69, 568 + 72, s3Scale, () => {
        drawPill(1388, 568, 138, 144, 72, '#ff9557', null);
        ctx.save();
        ctx.font = '800 20px "Prompt", sans-serif';
        ctx.fillStyle = '#1c2423';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Picking', 1388 + 69, 568 + 58);
        ctx.fillText('Data', 1388 + 69, 568 + 86);
        ctx.restore();
      });

      drawScaled(1388 + 69, 736 + 106, s3Scale, () => {
        drawPill(1388, 736, 138, 212, 48, '#ff9557', null);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 21px "Prompt", sans-serif';
        ctx.fillStyle = '#1c2423';
        ctx.fillText('DWG', 1388 + 69, 736 + 68);
        ctx.font = '700 17.5px "Prompt", sans-serif';
        ctx.fillText('Detail for', 1388 + 69, 736 + 102);
        ctx.fillText('Production', 1388 + 69, 736 + 130);
        ctx.restore();
      });
    }

    // --- ARROWS from Stage 3 ---
    const pArr3 = Math.min(1, Math.max(0, (t - 4.0) / 0.35));
    drawArrow(1388 + 138, 472, 1548, 472, pArr3);

    const pArr4 = Math.min(1, Math.max(0, (t - 4.0) / 0.35));
    drawArrow(1388 + 138, 640, 1548, 640, pArr4);

    const pArr5 = Math.min(1, Math.max(0, (t - 5.0) / 0.45));
    drawArrow(1388 + 138, 842, 1722, 842, pArr5);

    // --- STAGE 4: Vendor & Store ---
    const s4Scale = popScale((t - 4.2) / 0.5);
    if (s4Scale > 0) {
      drawScaled(1548 + 69, 285 + 120, s4Scale, () => {
        drawPill(1548, 285, 138, 240, 48, '#ff9557', null);
        ctx.save();
        ctx.font = '900 24px "Prompt", sans-serif';
        ctx.fillStyle = '#1c2423';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Vendor', 1548 + 69, 285 + 120);
        ctx.restore();
      });

      drawScaled(1548 + 69, 555 + 120, s4Scale, () => {
        drawPill(1548, 555, 138, 240, 48, '#ff9557', null);
        ctx.save();
        ctx.font = '900 24px "Prompt", sans-serif';
        ctx.fillStyle = '#1c2423';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Store', 1548 + 69, 555 + 120);
        ctx.restore();
      });
    }

    // --- ARROW 6: Downward Arrow from Vendor to Store ---
    const pArr6 = Math.min(1, Math.max(0, (t - 4.5) / 0.35));
    drawArrow(1548 + 69, 525, 1548 + 69, 555, pArr6);

    // --- ARROW 7: Store -> Stage 5 ---
    const pArr7 = Math.min(1, Math.max(0, (t - 5.0) / 0.35));
    drawArrow(1548 + 138, 675, 1722, 675, pArr7);

    // --- STAGE 5: Production Process & Customer Hero Capsule ---
    const s5Scale = popScale((t - 5.2) / 0.55);
    if (s5Scale > 0) {
      drawScaled(1722 + 74, 325 + 295, s5Scale, () => {
        drawPill(1722, 325, 148, 590, 58, '#2d353b', '#8dd4c2', 2.5);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        ctx.font = '600 21px "Prompt", sans-serif';
        ctx.fillText('Production', 1722 + 74, 325 + 186);
        ctx.font = '900 26px "Prompt", sans-serif';
        ctx.fillText('Process', 1722 + 74, 325 + 220);

        ctx.font = '700 22px "Prompt", sans-serif';
        ctx.fillStyle = '#8dd4c2';
        ctx.fillText('–', 1722 + 74, 325 + 252);

        ctx.fillStyle = '#ffffff';
        ctx.font = '800 18.5px "Prompt", sans-serif';
        ctx.fillText('PACKING', 1722 + 74, 325 + 300);
        ctx.fillText('TO', 1722 + 74, 325 + 330);
        ctx.fillText('CUSTOMER', 1722 + 74, 325 + 360);
        ctx.restore();
      });
    }

    // --- 5. ACTIVE FLOW ENERGY PARTICLES (Runs from 6.0s -> 10.0s, then stops cleanly) ---
    if (t >= 6.0 && !isSettled) {
      drawArrowPulse(1045 + 138, 472, 1225, 472, 0.0);
      drawArrowPulse(1225 + 138, 472, 1388, 472, 0.2);
      drawArrowPulse(1388 + 138, 472, 1548, 472, 0.4);
      drawArrowPulse(1548 + 69, 525, 1548 + 69, 555, 0.55);
      drawArrowPulse(1388 + 138, 640, 1548, 640, 0.45);
      drawArrowPulse(1548 + 138, 675, 1722, 675, 0.7);
      drawArrowPulse(1388 + 138, 842, 1722, 842, 0.5);
    }

    // --- 6. PAGE NUMBER BADGE -> 03 / 16 ---
    drawPageBadge(ctx, app);
  }

  function drawExistingWorkflowScene(app, s) {
    const ctx = app.ctx;
    const { isSettled, t } = getCappedMotion(app);

    // 1. Draw Clean Pure Background Graphic (1920x1080)
    const bgSrc = 'assets/ver3/slide_03_pure_bg.png';
    const bg = loadImage(bgSrc);
    if (bg && bg.complete && bg.naturalWidth) {
      if (typeof ctx.drawImage === 'function') ctx.drawImage(bg, 0, 0, 1920, 1080);
    } else {
      ctx.fillStyle = '#8ecfbd';
      ctx.fillRect(0, 0, 1920, 1080);
    }

    // Helper: Rounded Rectangle / Capsule Pill
    function drawPill(x, y, w, h, r, fillColor, strokeColor, lineWidth) {
      ctx.save();
      ctx.fillStyle = fillColor;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        const rad = Math.min(r, Math.min(w, h) / 2);
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, rad);
        } else {
          ctx.moveTo(x + rad, y);
          ctx.lineTo(x + w - rad, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
          ctx.lineTo(x + w, y + h - rad);
          ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
          ctx.lineTo(x + rad, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
          ctx.lineTo(x, y + rad);
          ctx.quadraticCurveTo(x, y, x + rad, y);
        }
        ctx.closePath();
        ctx.fill();
        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth || 2;
          ctx.stroke();
        }
      } else {
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();
    }

    // Helper: Spring Ease & Scaling
    function popScale(progress) {
      const p = Math.min(1, Math.max(0, progress));
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      return Math.sin(p * Math.PI / 2) * (1 + 0.08 * (1 - p));
    }

    function drawScaled(cx, cy, scale, drawFn) {
      if (scale <= 0) return;
      if (scale >= 0.999) {
        drawFn();
        return;
      }
      ctx.save();
      ctx.translate(cx, cy);
      if (typeof ctx.scale === 'function') ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      drawFn();
      ctx.restore();
    }

    // Helper: Animated Arrow
    function drawArrow(x1, y1, x2, y2, progress, headSize, strokeColor, fillColor) {
      if (progress <= 0) return;
      const p = Math.min(1, Math.max(0, progress));
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;
      const curLen = len * p;
      const angle = Math.atan2(dy, dx);
      const curX = x1 + Math.cos(angle) * curLen;
      const curY = y1 + Math.sin(angle) * curLen;

      ctx.save();
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(curX, curY);
        ctx.strokeStyle = strokeColor || '#e07a3f';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        if (p > 0.35) {
          const hs = (headSize || 13) * Math.min(1, (p - 0.35) / 0.35);
          ctx.beginPath();
          ctx.moveTo(curX, curY);
          ctx.lineTo(curX - hs * Math.cos(angle - Math.PI / 6), curY - hs * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(curX - hs * Math.cos(angle + Math.PI / 6), curY - hs * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fillStyle = fillColor || '#ff9557';
          ctx.fill();
          ctx.strokeStyle = strokeColor || '#404040';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else {
        ctx.fillRect(Math.min(x1, curX), Math.min(y1, curY), Math.abs(curX - x1) || 4, Math.abs(curY - y1) || 4);
      }
      ctx.restore();
    }

    // Helper: Bidirectional Arrow
    function drawBiArrow(x, y1, y2, progress, strokeColor) {
      if (progress <= 0) return;
      ctx.save();
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.strokeStyle = strokeColor || '#ff9557';
        ctx.lineWidth = 3;
        ctx.stroke();

        const hs = 11;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x - 7, y1 + hs);
        ctx.lineTo(x + 7, y1 + hs);
        ctx.closePath();
        ctx.fillStyle = strokeColor || '#ff9557';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x, y2);
        ctx.lineTo(x - 7, y2 - hs);
        ctx.lineTo(x + 7, y2 - hs);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(x - 2, y1, 4, y2 - y1);
      }
      ctx.restore();
    }

    // Helper: Number Callout Badge [ 1 ], [ 2 ], [ 3 ], [ 4 ]
    function drawCalloutBadge(x, y, num, scale) {
      drawScaled(x, y, scale, () => {
        ctx.save();
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.moveTo(x - 22, y - 8);
          ctx.lineTo(x - 12, y);
          ctx.lineTo(x - 22, y + 8);
          ctx.closePath();
          ctx.fillStyle = '#1c2423';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(x, y, 19, 0, Math.PI * 2);
          ctx.fillStyle = '#ff9557';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else {
          ctx.fillRect(x - 19, y - 19, 38, 38);
        }
        ctx.font = '900 20px "Prompt", sans-serif';
        ctx.fillStyle = '#1b2423';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(num), x, y + 1);
        ctx.restore();
      });
    }

    // Helper: Energy Pulse Packet along Arrow
    function drawArrowPulse(x1, y1, x2, y2, tOffset) {
      const cycle = ((t * 0.85 + (tOffset || 0)) % 1);
      const px = x1 + (x2 - x1) * cycle;
      const py = y1 + (y2 - y1) * cycle;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff9557';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        ctx.fillRect(px - 4, py - 4, 8, 8);
      }
      ctx.restore();
    }

    // 2. REAL TEXT: Title & Header ("ไม่ใช่รูปน่ะ เป็นตัวหนังสือ เท่านั้น")
    const pTitle = Math.min(1, Math.max(0, t / 0.45));
    const easeTitle = 1 - Math.pow(1 - pTitle, 3);
    const titleX = 143 - (1 - easeTitle) * 25;
    ctx.save();
    ctx.globalAlpha = pTitle;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#85dcc9';
    ctx.font = '900 48px "Prompt", "Arial Black", sans-serif';
    ctx.fillText('[2]', titleX, 110);
    ctx.font = '900 68px "Prompt", "Arial Black", sans-serif';
    ctx.fillText('Existing Work Flow', titleX, 188);
    ctx.fillStyle = '#f48c56';
    ctx.fillRect(titleX + 20, 228, 246, 6);
    ctx.restore();

    // 3. OUTER CONTAINER (Full-bleed balanced frame: x=24..1896, y=254..1044)
    const pContainer = Math.min(1, Math.max(0, (t - 0.3) / 0.5));
    if (pContainer > 0) {
      ctx.save();
      ctx.globalAlpha = pContainer;
      drawPill(24, 254, 1872, 790, 32, 'rgba(255, 255, 255, 0.04)', '#ff9557', 2.5);
      ctx.restore();
    }

    // Key Horizontal Row Centerlines (100% Orthogonal / Zero slanted arrows)
    const Y_BOM = 516;   // Track 1: (1) BOM -> Menu Select / Free Input
    const Y_DWG = 894;   // Track 2: (2) Drawing -> CAD 2D Assembly DWG -> Production
    const Y_A   = 358;   // Stream A: Part Items -> (4) -> PO / Email - Manual -> Production
    const Y_B   = 528;   // Stream B: Job Order / Picking - List -> Production
    const Y_C   = 668;   // Stream C: Smart Board - List -> (3) -> Punching -> Lantex -> Production

    // 4. PHASE 1: OTF (Order To Factory) & Blueprint Tablet (t >= 0.5s)
    const pOTF = Math.min(1, Math.max(0, (t - 0.5) / 0.5));
    if (pOTF > 0) {
      ctx.save();
      ctx.globalAlpha = pOTF;
      // 3D Blueprint Tablet
      const tabSrc = 'assets/ver3/slide_02_tablet.png';
      const tabImg = loadImage(tabSrc);
      if (tabImg && tabImg.complete && tabImg.naturalWidth) {
        const hoverDamp = isSettled ? 0 : Math.max(0, 1 - t / 10);
        const hoverY = 445 + Math.sin(t * 2) * 4 * hoverDamp;
        if (typeof ctx.drawImage === 'function') ctx.drawImage(tabImg, 36, hoverY, 195, 202);
      }

      // OTF Typography
      ctx.textAlign = 'center';
      ctx.font = '900 58px "Prompt", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('OTF', 132, 686);

      ctx.font = '800 21px "Prompt", sans-serif';
      ctx.fillStyle = '#162e26';
      ctx.fillText('Order to Factory', 132, 724);

      ctx.font = '600 18px "Prompt", sans-serif';
      ctx.fillStyle = '#243c34';
      ctx.fillText('(For Construction DWG)', 132, 752);
      ctx.restore();
    }

    // 5. PHASE 1 SPLIT ARROWS: OTF -> BOM (Track 1) & Drawing (Track 2) (t >= 0.9s)
    const pSplit = Math.min(1, Math.max(0, (t - 0.9) / 0.45));
    if (pSplit > 0) {
      ctx.save();
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        // Horizontal from OTF to split junction (208 to 246 at y=686)
        ctx.moveTo(208, 686);
        ctx.lineTo(246, 686);
        // Vertical branch up to Y_BOM and down to Y_DWG
        ctx.moveTo(246, Y_BOM);
        ctx.lineTo(246, Y_DWG);
        ctx.strokeStyle = '#ff9557';
        ctx.lineWidth = 3.2;
        ctx.stroke();
      }
      ctx.restore();

      // Straight horizontal branch arrow to Callout (1) BOM
      drawArrow(246, Y_BOM, 272, Y_BOM, pSplit);
      // Straight horizontal branch arrow to Callout (2) Drawing
      drawArrow(246, Y_DWG, 272, Y_DWG, pSplit);
    }

    // 6. PHASE 2: TRACK 1 (BOM) & TRACK 2 (Drawing) (t >= 1.2s)
    const sTrack1 = popScale((t - 1.2) / 0.5);
    if (sTrack1 > 0) {
      // Callout 1
      drawCalloutBadge(296, Y_BOM, 1, sTrack1);

      // BOM Pill Box + 2 Floorplan Markup Previews above
      drawScaled(402, Y_BOM, sTrack1, () => {
        drawPill(328, Y_BOM - 42, 148, 84, 22, '#ff9557', '#e07a3f', 2.5);
        ctx.save();
        ctx.font = '900 32px "Prompt", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BOM', 402, Y_BOM + 1);
        ctx.restore();

        // 2 Blueprint Thumbnails above BOM
        drawPill(328, Y_BOM - 118, 70, 62, 8, '#ffffff', '#8dd4c2', 1.8);
        drawPill(406, Y_BOM - 118, 70, 62, 8, '#ffffff', '#8dd4c2', 1.8);
        const fp1 = loadImage('assets/ver3/slide_04_floorplan_markup.png');
        const fp2 = loadImage('assets/ver3/slide_05_floorplan_paper.png');
        if (fp1 && fp1.complete && fp1.naturalWidth && typeof ctx.drawImage === 'function') {
          ctx.drawImage(fp1, 332, Y_BOM - 114, 62, 54);
        } else {
          ctx.save();
          ctx.font = '700 15px "Prompt", sans-serif';
          ctx.fillStyle = '#2b8a6e';
          ctx.textAlign = 'center';
          ctx.fillText('PLAN', 363, Y_BOM - 84);
          ctx.restore();
        }
        if (fp2 && fp2.complete && fp2.naturalWidth && typeof ctx.drawImage === 'function') {
          ctx.drawImage(fp2, 410, Y_BOM - 114, 62, 54);
        } else {
          ctx.save();
          ctx.font = '700 15px "Prompt", sans-serif';
          ctx.fillStyle = '#2b8a6e';
          ctx.textAlign = 'center';
          ctx.fillText('SCHED', 441, Y_BOM - 84);
          ctx.restore();
        }
      });
    }

    const sTrack2 = popScale((t - 1.3) / 0.5);
    if (sTrack2 > 0) {
      // Callout 2
      drawCalloutBadge(296, Y_DWG, 2, sTrack2);

      // Drawing Pill Box
      drawScaled(402, Y_DWG, sTrack2, () => {
        drawPill(328, Y_DWG - 42, 148, 84, 22, '#ff9557', '#e07a3f', 2.5);
        ctx.save();
        ctx.font = '900 26px "Prompt", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Drawing', 402, Y_DWG + 1);
        ctx.restore();
      });

      // Bidirectional Vertical Sync Arrow between BOM and Drawing
      drawBiArrow(402, Y_BOM + 46, Y_DWG - 46, sTrack2);
    }

    // 7. STRAIGHT HORIZONTAL ARROWS: BOM -> Menu Select Hub & Drawing -> CAD Hub (t >= 1.8s)
    const pArrToHubs = Math.min(1, Math.max(0, (t - 1.8) / 0.4));
    drawArrow(476, Y_BOM, 514, Y_BOM, pArrToHubs);
    drawArrow(476, Y_DWG, 514, Y_DWG, pArrToHubs);

    // 8. PHASE 3: CENTRAL PROCESSING HUBS (t >= 2.0s)
    // Hub 1: Menu Select / Free Input (x=516..1062, y=286..746, w=546, h=460)
    const sHub1 = popScale((t - 2.0) / 0.55);
    if (sHub1 > 0) {
      drawScaled(789, 516, sHub1, () => {
        drawPill(516, 286, 546, 460, 38, 'rgba(224, 238, 230, 0.96)', '#8dd4c2', 2.8);

        // Header Title
        ctx.save();
        ctx.font = '800 25px "Prompt", sans-serif';
        ctx.fillStyle = '#183027';
        ctx.textAlign = 'center';
        ctx.fillText('Menu Select / Free Input', 789, 326);

        // LEFT RED-BOX AREA: Live Web Menu Select / Free Input Video & Interactive Screen Simulator
        // (Ready for external video clip via s.webVideoSrc or procedural live web simulation)
        const vBoxX = 530, vBoxY = 344, vBoxW = 326, vBoxH = 380;
        drawPill(vBoxX, vBoxY, vBoxW, vBoxH, 16, '#ffffff', '#ff9557', 2.5);

        ctx.save();
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(vBoxX + 2, vBoxY + 2, vBoxW - 4, vBoxH - 4, 14);
          } else {
            ctx.rect(vBoxX + 2, vBoxY + 2, vBoxW - 4, vBoxH - 4);
          }
          ctx.clip();
        }

        // Top Browser Header Bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(vBoxX, vBoxY, vBoxW, 30);
        ctx.fillStyle = '#ef4444';
        if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(vBoxX + 16, vBoxY + 15, 4.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#f59e0b';
        if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(vBoxX + 30, vBoxY + 15, 4.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#10b981';
        if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(vBoxX + 44, vBoxY + 15, 4.5, 0, Math.PI * 2); ctx.fill(); }

        ctx.fillStyle = '#e2e8f0';
        app.fillFittedText(ctx, 'WEB BOM · Menu Select / Free Input', vBoxX + 54, vBoxY + 19, vBoxW - 118, 12.5, '700', '"Prompt", sans-serif', 'left');

        // Live REC indicator (settles to calm steady dot after 10s)
        const blink = !isSettled && Math.sin(t * 5) > 0;
        ctx.fillStyle = isSettled ? '#10b981' : (blink ? '#ef4444' : '#94a3b8');
        if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(vBoxX + vBoxW - 54, vBoxY + 15, 4, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 12px "Prompt", sans-serif';
        ctx.fillText(isSettled ? 'DONE' : 'LIVE', vBoxX + vBoxW - 44, vBoxY + 19);

        // Check if user provided a custom video clip for the web workflow
        const customWebVdoSrc = s.webVideoSrc || '';
        const customVid = customWebVdoSrc && typeof app.getOrCreateVideo === 'function' ? app.getOrCreateVideo(customWebVdoSrc) : null;
        if (customVid && customVid.readyState >= 2 && typeof app.drawMediaCover === 'function') {
          app.drawMediaCover(ctx, customVid, customVid.videoWidth || 640, customVid.videoHeight || 480, vBoxX + 2, vBoxY + 30, vBoxW - 4, vBoxH - 32);
        } else {
          // Procedural Live Simulation of Legacy Web Menu Select / Free Input (runs for 10s, then stops cleanly on Menu Select)
          const tabsImg = loadImage('assets/ver3/slide_04_tabs.png');
          if (tabsImg && tabsImg.complete && tabsImg.naturalWidth && typeof ctx.drawImage === 'function') {
            ctx.drawImage(tabsImg, vBoxX + 8, vBoxY + 36, vBoxW - 16, 30);
          }

          let webPhase = 0;
          let subP = 0;
          if (!isSettled) {
            if (t < 5.2) {
              webPhase = 0;
              subP = Math.max(0, (t - 2.0) / 3.2);
            } else if (t < 7.4) {
              webPhase = 1;
              subP = (t - 5.2) / 2.2;
            } else if (t < 9.3) {
              webPhase = 2;
              subP = (t - 7.4) / 1.9;
            } else {
              webPhase = 0;
              subP = 0.5;
            }
          }

          // Active Tab Highlight Box on top tabs
          const tabHighlightX = webPhase === 0 ? vBoxX + 200 : (webPhase === 1 ? vBoxX + 136 : vBoxX + 260);
          ctx.strokeStyle = '#ff9557';
          ctx.lineWidth = 2.2;
          ctx.strokeRect(tabHighlightX, vBoxY + 36, 60, 28);

          const contentY = vBoxY + 72;
          const contentH = vBoxH - 104;

          if (webPhase === 0) {
            // Screen 1: Menu Select Cascading Categories (Windows -> Window Tostem -> Sliding -> Hi-K 900 S2)
            const menuImg = loadImage('assets/ver3/slide_05_menu_select_table.png');
            if (menuImg && menuImg.complete && menuImg.naturalWidth && typeof ctx.drawImage === 'function') {
              ctx.drawImage(menuImg, vBoxX + 6, contentY, vBoxW - 12, contentH);
            }
            if (!isSettled) {
              const colIdx = Math.min(3, Math.floor(subP * 4));
              const scanX = vBoxX + 14 + colIdx * 76;
              const scanY = contentY + 62 + Math.sin(subP * Math.PI * 2) * 18;
              ctx.fillStyle = 'rgba(255, 149, 87, 0.24)';
              ctx.fillRect(scanX, scanY, 72, 22);
              ctx.strokeStyle = '#ff9557';
              ctx.lineWidth = 1.8;
              ctx.strokeRect(scanX, scanY, 72, 22);
            }
          } else if (webPhase === 1) {
            // Screen 2: Dropdown Parameters (Top Size / Opening Type / Size / Position Matrix)
            const compImg = loadImage('assets/ver3/slide_04_station3_composite.png');
            if (compImg && compImg.complete && compImg.naturalWidth && typeof ctx.drawImage === 'function') {
              ctx.drawImage(compImg, vBoxX + 6, contentY, vBoxW - 12, contentH);
            }
            const rowIdx = Math.min(7, Math.floor(subP * 8));
            const ry = contentY + 46 + rowIdx * 22;
            ctx.fillStyle = 'rgba(37, 99, 235, 0.18)';
            ctx.fillRect(vBoxX + 166, ry, 148, 20);
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(vBoxX + 166, ry, 148, 20);
          } else {
            // Screen 3: Free Input Multi-Row Data Table
            const freeImg = loadImage('assets/ver3/slide_05_free_input_table.png');
            if (freeImg && freeImg.complete && freeImg.naturalWidth && typeof ctx.drawImage === 'function') {
              ctx.drawImage(freeImg, vBoxX + 6, contentY, vBoxW - 12, contentH);
            }
            const rowIdx = Math.min(9, Math.floor(subP * 10));
            const ry = contentY + 58 + rowIdx * 18;
            ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
            ctx.fillRect(vBoxX + 10, ry, vBoxW - 20, 16);
            ctx.strokeStyle = '#059669';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(vBoxX + 10, ry, vBoxW - 20, 16);
          }

          // Animated Mouse Pointer inside the Web Simulator (stops & hides cleanly at 10s)
          if (!isSettled) {
            const curX = vBoxX + 65 + ((Math.sin(t * 1.7) + 1) * 0.5) * 200;
            const curY = contentY + 45 + ((Math.cos(t * 2.3) + 1) * 0.5) * (contentH - 70);
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            if (typeof ctx.beginPath === 'function') {
              ctx.beginPath();
              ctx.moveTo(curX, curY);
              ctx.lineTo(curX, curY + 16);
              ctx.lineTo(curX + 4.5, curY + 12.5);
              ctx.lineTo(curX + 8.5, curY + 19);
              ctx.lineTo(curX + 11, curY + 17.5);
              ctx.lineTo(curX + 7, curY + 11);
              ctx.lineTo(curX + 12, curY + 11);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          }

          // Bottom Status Caption Bar inside Web Box
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(vBoxX, vBoxY + vBoxH - 30, vBoxW, 30);
          ctx.fillStyle = '#34d399';
          const stepCaptions = [
            '1/3 · Selecting Category: Windows > Tostem > Hi-K',
            '2/3 · Manual Dropdown: Top Size / Opening / Grid Size',
            '3/3 · Free Input Table: Manual Coding One-by-One'
          ];
          app.fillFittedText(ctx, stepCaptions[webPhase], vBoxX + vBoxW / 2, vBoxY + vBoxH - 9, vBoxW - 14, 13, '700', '"Prompt", sans-serif', 'center');
        }
        ctx.restore();

        // RIGHT PARAMETER LIST inside Menu Select / Free Input (cleanly inset from right border x=1062)
        ctx.textAlign = 'left';
        ctx.font = '800 16.5px "Prompt", sans-serif';
        ctx.fillStyle = '#142922';
        ctx.fillText('Menu 1', 864, 488);
        ctx.fillText('Menu 2', 864, 524);
        ctx.fillText('Menu 3', 864, 560);

        // Curly Bracket { spanning the 6 parameters
        ctx.strokeStyle = '#2b8a6e';
        ctx.lineWidth = 2.8;
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.moveTo(944, 428);
          ctx.quadraticCurveTo(935, 428, 935, 442);
          ctx.lineTo(935, 508);
          ctx.quadraticCurveTo(935, 520, 926, 520);
          ctx.quadraticCurveTo(935, 520, 935, 532);
          ctx.lineTo(935, 598);
          ctx.quadraticCurveTo(935, 612, 944, 612);
          ctx.stroke();
        }

        // Parameter Items
        ctx.fillStyle = '#183027';
        app.fillFittedText(ctx, 'CODE', 950, 434, 106, 16, '700', '"Prompt", sans-serif', 'left');
        app.fillFittedText(ctx, 'Amount / Unit', 950, 468, 106, 16, '700', '"Prompt", sans-serif', 'left');
        app.fillFittedText(ctx, 'Position', 950, 502, 106, 16, '700', '"Prompt", sans-serif', 'left');
        app.fillFittedText(ctx, 'Size (Grid Line)', 950, 536, 106, 16, '700', '"Prompt", sans-serif', 'left');
        app.fillFittedText(ctx, 'Bottom Win', 950, 570, 106, 16, '700', '"Prompt", sans-serif', 'left');
        app.fillFittedText(ctx, 'Top Win', 950, 604, 106, 16, '700', '"Prompt", sans-serif', 'left');

        ctx.restore();
      });
    }

    // Hub 2: CAD 2D Assembly DWG (x=516..1062, y=774..1014, w=546, h=240, center y=894)
    const sHub2 = popScale((t - 2.2) / 0.55);
    if (sHub2 > 0) {
      drawScaled(789, Y_DWG, sHub2, () => {
        drawPill(516, 774, 546, 240, 32, 'rgba(224, 238, 230, 0.96)', '#8dd4c2', 2.8);
        ctx.save();

        // Left Side inside Hub 2: Animated 2D CAD Assembly DWG & Manual Code Simulator Clip
        const cadX = 534;
        const cadY = 788;
        const cadW = 330;
        const cadH = 212;
        drawPill(cadX, cadY, cadW, cadH, 16, '#0f172a', '#ff9557', 2.4);

        // Top CAD Window Header
        drawPill(cadX + 2, cadY + 2, cadW - 4, 24, 13, '#1e293b', null, 0);
        const cadDots = ['#ef4444', '#f59e0b', '#22c55e'];
        cadDots.forEach((dc, di) => {
          if (typeof ctx.beginPath === 'function') {
            ctx.beginPath();
            ctx.arc(cadX + 14 + di * 11, cadY + 14, 3.6, 0, Math.PI * 2);
            ctx.fillStyle = dc;
            ctx.fill();
          }
        });
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '800 12px "Prompt", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('AUTOCAD 2D · ASSEMBLY_DWG.DWG', cadX + 46, cadY + 17);

        const cadPulse = isSettled ? 1 : (0.5 + 0.5 * Math.sin(t * 5.2));
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.arc(cadX + cadW - 48, cadY + 14, 3.6, 0, Math.PI * 2);
          ctx.fillStyle = isSettled ? '#22c55e' : `rgba(34, 197, 94, ${0.65 + 0.35 * cadPulse})`;
          ctx.fill();
        }
        ctx.fillStyle = '#86efac';
        ctx.font = '800 11px "Prompt", sans-serif';
        ctx.fillText(isSettled ? 'DONE' : 'LIVE', cadX + cadW - 39, cadY + 17);

        let drewCustomCadVideo = false;
        if (s && s.cadVideoSrc && typeof document !== 'undefined') {
          if (!window.__slide4CadVideoEl) {
            const vc = document.createElement('video');
            vc.src = s.cadVideoSrc;
            vc.muted = true;
            vc.loop = true;
            vc.playsInline = true;
            vc.autoplay = true;
            vc.play().catch(() => {});
            window.__slide4CadVideoEl = vc;
          }
          const vCadEl = window.__slide4CadVideoEl;
          if (vCadEl && vCadEl.readyState >= 2 && typeof ctx.drawImage === 'function') {
            ctx.save();
            ctx.beginPath();
            ctx.rect(cadX + 4, cadY + 28, cadW - 8, cadH - 32);
            ctx.clip();
            ctx.drawImage(vCadEl, cadX + 4, cadY + 28, cadW - 8, cadH - 32);
            ctx.restore();
            drewCustomCadVideo = true;
          }
        }

        if (!drewCustomCadVideo) {
          const vpX = cadX + 6;
          const vpY = cadY + 28;
          const vpW = cadW - 12;
          const vpH = cadH - 54;

          ctx.save();
          if (typeof ctx.beginPath === 'function') {
            ctx.beginPath();
            ctx.rect(vpX, vpY, vpW, vpH);
            ctx.clip();
          }

          // CAD Blueprint Grid
          ctx.strokeStyle = 'rgba(51, 65, 85, 0.55)';
          ctx.lineWidth = 0.8;
          for (let gx = vpX + 24; gx < vpX + vpW; gx += 28) {
            if (typeof ctx.beginPath === 'function') {
              ctx.beginPath();
              ctx.moveTo(gx, vpY);
              ctx.lineTo(gx, vpY + vpH);
              ctx.stroke();
            }
          }
          for (let gy = vpY + 20; gy < vpY + vpH; gy += 24) {
            if (typeof ctx.beginPath === 'function') {
              ctx.beginPath();
              ctx.moveTo(vpX, gy);
              ctx.lineTo(vpX + vpW, gy);
              ctx.stroke();
            }
          }

          // Grid Axis Bubbles (A, B, C, D) along top
          const gridCols = [
            { lbl: 'A', x: vpX + 44 },
            { lbl: 'B', x: vpX + 124 },
            { lbl: 'C', x: vpX + 204 },
            { lbl: 'D', x: vpX + 284 }
          ];
          gridCols.forEach((gc) => {
            if (typeof ctx.beginPath === 'function') {
              ctx.save();
              ctx.setLineDash([3, 3]);
              ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
              ctx.beginPath();
              ctx.moveTo(gc.x, vpY + 18);
              ctx.lineTo(gc.x, vpY + vpH - 6);
              ctx.stroke();
              ctx.restore();

              ctx.beginPath();
              ctx.arc(gc.x, vpY + 12, 9, 0, Math.PI * 2);
              ctx.fillStyle = '#1e293b';
              ctx.fill();
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }
            ctx.fillStyle = '#38bdf8';
            ctx.font = '800 11px "Prompt", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(gc.lbl, gc.x, vpY + 16);
          });

          // 2D Wall & Window Assembly Panels (3 bays between A-B, B-C, C-D)
          // Runs sequentially across 2.2s -> 9.8s, then shows all 3 completed cleanly after 10s
          const cadProgress = Math.max(0, t - 2.2) / 2.55;
          const activeBay = Math.min(2, Math.floor(cadProgress));
          const bays = [
            { x: vpX + 44, w: 80, y: vpY + 34, h: 96, code: 'ST-12B-W1', dim: '900', type: 'wall-win' },
            { x: vpX + 124, w: 80, y: vpY + 34, h: 96, code: 'FT-24A-D2', dim: '1800', type: 'door' },
            { x: vpX + 204, w: 80, y: vpY + 34, h: 96, code: 'PN-09C-E1', dim: '900', type: 'punch' }
          ];

          bays.forEach((bay, bIdx) => {
            const isCurr = !isSettled && bIdx === activeBay;
            const isDone = isSettled || bIdx < activeBay;

            // Outer 2D CAD Panel Frame
            ctx.strokeStyle = isCurr ? '#facc15' : (isDone ? '#22c55e' : '#38bdf8');
            ctx.lineWidth = isCurr ? 2.2 : 1.5;
            ctx.strokeRect(bay.x, bay.y, bay.w, bay.h);

            // Inner CAD details per panel type
            if (bay.type === 'wall-win') {
              ctx.strokeStyle = '#67e8f9';
              ctx.lineWidth = 1.2;
              ctx.strokeRect(bay.x + 14, bay.y + 18, bay.w - 28, 42);
              ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
              ctx.fillRect(bay.x + 14, bay.y + 18, bay.w - 28, 42);
            } else if (bay.type === 'door') {
              ctx.strokeStyle = '#fb923c';
              ctx.lineWidth = 1.2;
              ctx.strokeRect(bay.x + 18, bay.y + 16, bay.w - 36, bay.h - 16);
              if (typeof ctx.beginPath === 'function') {
                ctx.beginPath();
                ctx.moveTo(bay.x + 18, bay.y + 16);
                ctx.lineTo(bay.x + bay.w / 2, bay.y + bay.h / 2);
                ctx.lineTo(bay.x + 18, bay.y + bay.h);
                ctx.stroke();
              }
            } else {
              // Smart Board Punching holes
              ctx.strokeStyle = '#a78bfa';
              ctx.lineWidth = 1.2;
              ctx.strokeRect(bay.x + 12, bay.y + 22, 22, 16);
              ctx.strokeRect(bay.x + 44, bay.y + 58, 22, 16);
            }

            // Dimension line at bottom of panel
            ctx.fillStyle = '#94a3b8';
            ctx.font = '700 11px "Prompt", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`◄ ${bay.dim} ►`, bay.x + bay.w / 2, bay.y + bay.h + 15);

            // Manual Code Tag inside panel
            const typedLen = isCurr
              ? Math.max(2, Math.floor(((cadProgress - bIdx) / 0.85) * bay.code.length))
              : bay.code.length;
            const shownCode = isCurr ? bay.code.slice(0, typedLen) + (Math.sin(t * 9) > 0 ? '|' : '') : bay.code;

            drawPill(
              bay.x + 4,
              bay.y + bay.h - 26,
              bay.w - 8,
              21,
              4,
              isCurr ? 'rgba(250, 204, 21, 0.22)' : 'rgba(15, 23, 42, 0.88)',
              isCurr ? '#facc15' : '#22c55e',
              1.1
            );
            ctx.fillStyle = isCurr ? '#fef08a' : '#86efac';
            app.fillFittedText(ctx, shownCode, bay.x + bay.w / 2, bay.y + bay.h - 11.5, bay.w - 14, 11, '800', '"Consolas", "Prompt", monospace', 'center');
          });

          // Animated AutoCAD Crosshair Cursor (+) with Pickbox (stops after 10s)
          if (!isSettled) {
            const targetBay = bays[activeBay];
            const chX = targetBay.x + targetBay.w / 2 + Math.sin(t * 3.8) * 14;
            const chY = targetBay.y + 42 + Math.cos(t * 3.8) * 10;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.1;
            if (typeof ctx.beginPath === 'function') {
              ctx.beginPath();
              ctx.moveTo(chX - 14, chY);
              ctx.lineTo(chX + 14, chY);
              ctx.moveTo(chX, chY - 14);
              ctx.lineTo(chX, chY + 14);
              ctx.stroke();
            }
            ctx.strokeStyle = '#facc15';
            ctx.strokeRect(chX - 4, chY - 4, 8, 8);
          }

          ctx.restore();

          // Bottom AutoCAD Command Line Bar
          drawPill(cadX + 4, cadY + cadH - 25, cadW - 8, 21, 8, '#1e293b', null, 0);
          ctx.fillStyle = '#38bdf8';
          const activeCodeStr = isSettled ? '3/3 Completed' : bays[activeBay].code;
          app.fillFittedText(ctx, `Command: _TEXT Manual Code ➔ ${activeCodeStr}`, cadX + 10, cadY + cadH - 10.5, cadW - 20, 11, '800', '"Consolas", "Prompt", monospace', 'left');
        }

        // Right Side inside Hub 2: Typography (x=870..1054, center x=962)
        const rightCx = 964;
        ctx.textAlign = 'center';
        ctx.font = '900 42px "Prompt", sans-serif';
        ctx.fillStyle = '#183027';
        ctx.fillText('CAD', rightCx, 858);

        ctx.font = '800 20px "Prompt", sans-serif';
        ctx.fillStyle = '#213d33';
        ctx.fillText('2D Assembly DWG.', rightCx, 906);
        ctx.fillText('Manual Code', rightCx, 940);

        drawPill(rightCx - 88, 956, 176, 32, 16, 'rgba(24, 48, 39, 0.12)', '#2b8a6e', 1.4);
        ctx.font = '800 15.5px "Prompt", sans-serif';
        ctx.fillStyle = '#14532d';
        ctx.fillText('● Manual DWG Input', rightCx, 977);

        ctx.restore();
      });
    }

    // 9. PHASE 4: OUTPUT STREAMS (t >= 2.8s) — ALL 100% STRAIGHT HORIZONTAL LINES
    // Connectors from Hub 1 (x=1062) to Stream A (Y_A=358), Stream B (Y_B=528), Stream C (Y_C=668)
    const pHub1Out = Math.min(1, Math.max(0, (t - 2.6) / 0.4));
    if (pHub1Out > 0) {
      drawArrow(1062, Y_A, 1106, Y_A, pHub1Out);
      drawArrow(1062, Y_B, 1106, Y_B, pHub1Out);
      drawArrow(1062, Y_C, 1106, Y_C, pHub1Out);
    }

    // Stream A (Y_A = 358): Part Items -> Callout (4) -> PO / Email - Manual -> Straight to Production
    const sStreamA = popScale((t - 2.8) / 0.5);
    if (sStreamA > 0) {
      drawScaled(1180, Y_A, sStreamA, () => {
        ctx.save();
        ctx.font = '700 17px "Prompt", sans-serif';
        ctx.fillStyle = '#e2f1ea';
        ctx.textAlign = 'left';
        ctx.fillText('Create IM   Create MPS   Create PS', 1108, 308);

        drawPill(1108, Y_A - 32, 148, 64, 14, '#e0eee6', '#8dd4c2', 2.2);
        ctx.font = '800 20px "Prompt", sans-serif';
        ctx.fillStyle = '#142922';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Part Items', 1108 + 74, Y_A);
        ctx.restore();
      });

      drawArrow(1256, Y_A, 1288, Y_A, pSplit);
      drawCalloutBadge(1312, Y_A, 4, sStreamA);

      drawScaled(1476, Y_A + 36, sStreamA, () => {
        // Vertical link between PO / Email - Manual and Purchase / Supplier / Supply
        ctx.save();
        ctx.strokeStyle = '#ff9557';
        ctx.lineWidth = 2.5;
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.moveTo(1476, Y_A + 32);
          ctx.lineTo(1476, Y_A + 44);
          ctx.stroke();
        }
        ctx.restore();

        drawPill(1346, Y_A - 32, 260, 64, 14, '#ffffff', '#ff9557', 2.5);
        ctx.save();
        ctx.font = '800 20px "Prompt", sans-serif';
        ctx.fillStyle = '#1b2423';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PO / Email - Manual', 1476, Y_A);
        ctx.restore();

        drawPill(1346, Y_A + 44, 260, 56, 14, '#e0eee6', '#8dd4c2', 2.2);
        ctx.save();
        ctx.fillStyle = '#162e26';
        app.fillFittedText(ctx, 'Purchase / Supplier / Supply', 1476, Y_A + 72 + 6, 244, 18.5, '700', '"Prompt", sans-serif', 'center');
        ctx.restore();
      });
    }

    // Stream B (Y_B = 528): Job Order / Picking - List -> Straight to Production
    const sStreamB = popScale((t - 3.1) / 0.5);
    if (sStreamB > 0) {
      drawScaled(1308, Y_B, sStreamB, () => {
        drawPill(1108, Y_B - 36, 400, 72, 16, '#ffffff', '#ff9557', 2.5);
        ctx.save();
        ctx.font = '800 22px "Prompt", sans-serif';
        ctx.fillStyle = '#1b2423';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Job Order / Picking - List', 1308, Y_B);
        ctx.restore();
      });
    }

    // Stream C (Y_C = 668): Smart Board - List -> Callout (3) -> Smart Board Punching -> Lantex -> Straight to Production
    const sStreamC = popScale((t - 3.4) / 0.5);
    if (sStreamC > 0) {
      drawScaled(1196, Y_C, sStreamC, () => {
        drawPill(1108, Y_C - 32, 176, 64, 14, '#e0eee6', '#8dd4c2', 2.2);
        ctx.save();
        ctx.fillStyle = '#142922';
        app.fillFittedText(ctx, 'Smart Board - List', 1196, Y_C + 6, 162, 19, '800', '"Prompt", sans-serif', 'center');
        ctx.restore();
      });

      drawArrow(1284, Y_C, 1310, Y_C, pSplit);
      drawCalloutBadge(1332, Y_C, 3, sStreamC);

      drawScaled(1442, Y_C, sStreamC, () => {
        drawPill(1362, Y_C - 56, 160, 112, 16, '#ffffff', '#ff9557', 2.5);
        ctx.save();
        ctx.font = '700 17.5px "Prompt", sans-serif';
        ctx.fillStyle = '#1b2423';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Smart Board', 1442, Y_C - 28);
        ctx.font = '800 20px "Prompt", sans-serif';
        ctx.fillText('Punching', 1442, Y_C + 1);
        ctx.font = '700 17.5px "Prompt", sans-serif';
        ctx.fillText('Code DWG', 1442, Y_C + 30);
        ctx.restore();
      });

      drawArrow(1522, Y_C, 1546, Y_C, pSplit);

      drawScaled(1628, Y_C, sStreamC, () => {
        drawPill(1548, Y_C - 56, 160, 112, 16, '#8dd4c2', '#2b8a6e', 2.2);
        ctx.save();
        ctx.fillStyle = '#142922';
        app.fillFittedText(ctx, '(Lantex)', 1628, Y_C - 27, 146, 16.5, '700', '"Prompt", sans-serif', 'center');
        app.fillFittedText(ctx, 'Cutting / Punching', 1628, Y_C - 4, 146, 16.5, '700', '"Prompt", sans-serif', 'center');
        app.fillFittedText(ctx, 'Smart Board', 1628, Y_C + 19, 146, 16.5, '700', '"Prompt", sans-serif', 'center');
        app.fillFittedText(ctx, 'Machine', 1628, Y_C + 42, 146, 16.5, '700', '"Prompt", sans-serif', 'center');
        ctx.restore();
      });
    }

    // 10. STRAIGHT HORIZONTAL ARROWS TO PRODUCTION (t >= 3.8s) — ZERO SLANT!
    const pArrToProd = Math.min(1, Math.max(0, (t - 3.8) / 0.45));
    drawArrow(1606, Y_A,   1740, Y_A,   pArrToProd); // Stream A -> Production (y=358)
    drawArrow(1508, Y_B,   1740, Y_B,   pArrToProd); // Stream B -> Production (y=528)
    drawArrow(1708, Y_C,   1740, Y_C,   pArrToProd); // Stream C -> Production (y=668)
    drawArrow(1062, Y_DWG, 1740, Y_DWG, pArrToProd); // Stream D (CAD) -> Production (y=894)

    // 11. FINAL DESTINATION: PRODUCTION FULL-HEIGHT HERO CAPSULE (t >= 4.2s)
    // Spans y=296..1006 (h=710) so all 4 horizontal arrows land squarely on its left edge
    const sDest = popScale((t - 4.2) / 0.55);
    if (sDest > 0) {
      drawScaled(1804, 651, sDest, () => {
        drawPill(1742, 296, 124, 710, 62, '#2d353b', '#ff9557', 3.5);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 40px "Prompt", sans-serif';
        if (typeof ctx.rotate === 'function') {
          ctx.translate(1804, 651);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText('Production', 0, 0);
        } else {
          ctx.fillText('Production', 1804, 651);
        }
        ctx.restore();
      });
    }

    // 12. ACTIVE FLOW ENERGY PARTICLES (Runs during 5.0s -> 10.0s, then stops cleanly to prevent viewer fatigue)
    if (t >= 5.0 && !isSettled) {
      drawArrowPulse(208, 686,   246, 686,   0.0);
      drawArrowPulse(246, Y_BOM, 328, Y_BOM, 0.15);
      drawArrowPulse(246, Y_DWG, 328, Y_DWG, 0.15);
      drawArrowPulse(476, Y_BOM, 516, Y_BOM, 0.3);
      drawArrowPulse(476, Y_DWG, 516, Y_DWG, 0.3);
      drawArrowPulse(1062, Y_A,  1346, Y_A,  0.45);
      drawArrowPulse(1062, Y_B,  1108, Y_B,  0.45);
      drawArrowPulse(1062, Y_C,  1548, Y_C,  0.45);
      drawArrowPulse(1606, Y_A,   1740, Y_A,   0.7);
      drawArrowPulse(1508, Y_B,   1740, Y_B,   0.7);
      drawArrowPulse(1708, Y_C,   1740, Y_C,   0.7);
      drawArrowPulse(1062, Y_DWG, 1740, Y_DWG, 0.6);
    }

    // 13. PAGE NUMBER BADGE -> 04 / 16
    drawPageBadge(ctx, app);
  }


  function drawSlide4ExistingDetailScene(app, s) {
    const ctx = app.ctx;
    const { isSettled, t } = getCappedMotion(app);

    // Helper functions
    function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }
    function easeOutCubic(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }
    function popScale(progress) {
      const p = clamp(progress, 0, 1);
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      return Math.sin(p * Math.PI / 2) * (1 + 0.08 * (1 - p));
    }

    function drawPill(x, y, w, h, r, fillColor, strokeColor, lineWidth) {
      ctx.save();
      ctx.fillStyle = fillColor;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        const rad = Math.min(r, Math.min(w, h) / 2);
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, rad);
        } else {
          ctx.moveTo(x + rad, y);
          ctx.lineTo(x + w - rad, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
          ctx.lineTo(x + w, y + h - rad);
          ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
          ctx.lineTo(x + rad, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
          ctx.lineTo(x, y + rad);
          ctx.quadraticCurveTo(x, y, x + rad, y);
        }
        ctx.closePath();
        ctx.fill();
        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth || 2;
          ctx.stroke();
        }
      } else {
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();
    }

    function drawScaled(cx, cy, scale, drawFn) {
      if (scale <= 0) return;
      if (scale >= 0.999) {
        drawFn();
        return;
      }
      ctx.save();
      ctx.translate(cx, cy);
      if (typeof ctx.scale === 'function') ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      drawFn();
      ctx.restore();
    }

    function getImage(src) {
      return loadImage(src);
    }

    // 1. Background Graphic (1920x1080)
    const bgSrc = 'assets/ver3/slide_04_pure_bg.png';
    const bg = getImage(bgSrc);
    if (bg && bg.complete && bg.naturalWidth) {
      if (typeof ctx.drawImage === 'function') ctx.drawImage(bg, 0, 0, 1920, 1080);
    } else {
      ctx.fillStyle = '#122c24';
      ctx.fillRect(0, 0, 1920, 1080);
    }

    // Dynamic Top-Right Page Badge (04 / 12)
    drawPageBadge(ctx, app);

    // 2. Header: Title & Underline
    const headAlpha = easeOutCubic(t / 0.5);
    const headShift = (1 - headAlpha) * 20;
    ctx.save();
    ctx.globalAlpha = headAlpha;
    ctx.fillStyle = '#85dcc9';
    ctx.font = '900 48px "Prompt", -apple-system, sans-serif';
    ctx.fillText('[2]', 136 - headShift, 100);

    ctx.font = '900 68px "Prompt", -apple-system, sans-serif';
    ctx.fillText('Existing Work Flow', 136 - headShift, 180);

    // Underline
    const lineW = 240 * easeOutCubic(t / 0.7);
    ctx.fillStyle = '#ff9557';
    ctx.fillRect(154, 228, lineW, 6);
    ctx.restore();

    // 3. Outer Container (expanded to y=262..1054 to house the 4 bottom stage clips cleanly)
    const boxAlpha = easeOutCubic((t - 0.2) / 0.5);
    if (boxAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = boxAlpha;
      drawPill(24, 262, 1872, 792, 32, 'rgba(18, 48, 40, 0.45)', '#ff9557', 2.5);
      ctx.restore();
    }

    // 4. Station 1: Coding Manual
    const s1Scale = popScale((t - 0.5) / 0.6);
    if (s1Scale > 0) {
      drawScaled(42 + 465 / 2, 295 + 480 / 2, s1Scale, () => {
        // Station Box
        drawPill(42, 295, 465, 480, 24, 'rgba(224, 238, 230, 0.22)', '#ff9557', 2);

        // Visual 1: Manual drawing
        const imgDraw = getImage('assets/ver3/slide_04_manual_drawing.png');
        if (imgDraw && imgDraw.complete && imgDraw.naturalWidth && typeof ctx.drawImage === 'function') {
          ctx.drawImage(imgDraw, 56, 312, 215, 145);
          drawPill(56, 312, 215, 145, 10, 'transparent', 'rgba(255, 149, 87, 0.5)', 1.5);
        }

        // Visual 2: Floorplan markup
        const imgMarkup = getImage('assets/ver3/slide_04_floorplan_markup.png');
        if (imgMarkup && imgMarkup.complete && imgMarkup.naturalWidth && typeof ctx.drawImage === 'function') {
          ctx.drawImage(imgMarkup, 280, 312, 215, 145);
          drawPill(280, 312, 215, 145, 10, 'transparent', 'rgba(255, 149, 87, 0.5)', 1.5);
        }

        // Text List (Vector Typography with font "Prompt")
        const items = [
          'Single / Double',
          'Wall Type (ST/FT)',
          'Window',
          'Grid Line'
        ];
        items.forEach((item, idx) => {
          const itemP = clamp((t - 0.9 - idx * 0.1) / 0.35, 0, 1);
          if (itemP > 0) {
            ctx.save();
            ctx.globalAlpha = itemP;
            const yy = 498 + idx * 40;
            // Cyan accent bullet
            ctx.fillStyle = '#85dcc9';
            ctx.font = '900 24px "Prompt", sans-serif';
            ctx.fillText('•', 92, yy);
            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = '800 22px "Prompt", sans-serif';
            ctx.fillText(item, 116, yy);
            ctx.restore();
          }
        });

        // Bottom Pill: Coding Manual
        const pillP = popScale((t - 1.3) / 0.4);
        if (pillP > 0) {
          drawScaled(85 + 380 / 2, 685 + 64 / 2, pillP, () => {
            drawPill(85, 685, 380, 64, 32, '#9ab8f7', 'rgba(255, 255, 255, 0.6)', 1.5);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 27px "Prompt", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Coding Manual', 85 + 380 / 2, 685 + 42);
            ctx.textAlign = 'start';
          });
        }
      });
    }

    // Connector 1 -> 2
    const c12P = clamp((t - 1.5) / 0.4, 0, 1);
    if (c12P > 0) {
      ctx.save();
      ctx.strokeStyle = '#ff9557';
      ctx.lineWidth = 2.5;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(507, 535);
        ctx.lineTo(507 + 18 * c12P, 535);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Station 2: Web Menu Select / Input Data & Export
    const s2Scale = popScale((t - 1.6) / 0.6);
    if (s2Scale > 0) {
      drawScaled(525 + 565 / 2, 295 + 480 / 2, s2Scale, () => {
        // Station Box
        drawPill(525, 295, 565, 480, 24, 'rgba(224, 238, 230, 0.22)', '#ff9557', 2);

        // Top Tab Bar visual
        const imgTabs = getImage('assets/ver3/slide_04_tabs.png');
        if (imgTabs && imgTabs.complete && imgTabs.naturalWidth && typeof ctx.drawImage === 'function') {
          ctx.drawImage(imgTabs, 540, 312, 535, 44);
        }

        // Left Menu List
        const menus = ['Menu 1', 'Menu 2', 'Menu 3'];
        menus.forEach((m, idx) => {
          const mP = clamp((t - 1.9 - idx * 0.1) / 0.3, 0, 1);
          if (mP > 0) {
            ctx.save();
            ctx.globalAlpha = mP;
            ctx.fillStyle = '#85dcc9';
            ctx.font = '800 23px "Prompt", sans-serif';
            ctx.fillText(m, 555, 410 + idx * 58);
            ctx.restore();
          }
        });

        // Curly Brace {
        const braceP = clamp((t - 2.0) / 0.35, 0, 1);
        if (braceP > 0) {
          ctx.save();
          ctx.globalAlpha = braceP;
          ctx.fillStyle = '#ff9557';
          ctx.font = '300 110px "Prompt", sans-serif';
          ctx.fillText('{', 665, 490);
          ctx.restore();
        }

        // Middle Parameters List
        const params = [
          'CODE',
          'Amount / Unit',
          'Position',
          'Size (Grid Line)',
          'Bottom Win',
          'Top Win'
        ];
        params.forEach((param, idx) => {
          const pP = clamp((t - 2.1 - idx * 0.08) / 0.3, 0, 1);
          if (pP > 0) {
            ctx.save();
            ctx.globalAlpha = pP;
            ctx.fillStyle = '#f0fbf7';
            ctx.font = '700 19px "Prompt", sans-serif';
            ctx.fillText(param, 715, 388 + idx * 37);
            ctx.restore();
          }
        });

        // Right Tags (Create IM, Create MPS, Create PS)
        const tags = ['Create IM', 'Create MPS', 'Create PS'];
        tags.forEach((tag, idx) => {
          const tP = popScale((t - 2.2 - idx * 0.1) / 0.35);
          if (tP > 0) {
            drawScaled(940 + 140 / 2, (400 + idx * 60) + 42 / 2, tP, () => {
              drawPill(940, 400 + idx * 60, 140, 42, 10, 'rgba(20, 50, 42, 0.75)', '#85dcc9', 1.5);
              ctx.fillStyle = '#ffffff';
              ctx.font = '800 19px "Prompt", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(tag, 940 + 140 / 2, 400 + idx * 60 + 27);
              ctx.textAlign = 'start';
            });
          }
        });

        // Bottom Pills: Input Data & Export Error & Data
        const pInput = popScale((t - 2.5) / 0.4);
        if (pInput > 0) {
          drawScaled(545 + 240 / 2, 685 + 64 / 2, pInput, () => {
            drawPill(545, 685, 240, 64, 32, '#9ab8f7', 'rgba(255, 255, 255, 0.6)', 1.5);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 24px "Prompt", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Input Data', 545 + 240 / 2, 685 + 41);
            ctx.textAlign = 'start';
          });
        }

        const pExport = popScale((t - 2.6) / 0.4);
        if (pExport > 0) {
          drawScaled(810 + 265 / 2, 685 + 64 / 2, pExport, () => {
            drawPill(810, 685, 265, 64, 32, '#9ab8f7', 'rgba(255, 255, 255, 0.6)', 1.5);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = '800 20px "Prompt", sans-serif';
            ctx.fillText('Export', 810 + 265 / 2, 685 + 28);
            ctx.font = '900 22px "Prompt", sans-serif';
            ctx.fillText('Error & Data', 810 + 265 / 2, 685 + 54);
            ctx.textAlign = 'start';
          });
        }
      });
    }

    // Connector 2 -> 3
    const c23P = clamp((t - 2.6) / 0.4, 0, 1);
    if (c23P > 0) {
      ctx.save();
      ctx.strokeStyle = '#ff9557';
      ctx.lineWidth = 2.5;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(1090, 535);
        ctx.lineTo(1090 + 20 * c23P, 535);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6. Station 3: Upload BOM Data
    const s3Scale = popScale((t - 2.7) / 0.6);
    if (s3Scale > 0) {
      drawScaled(1110 + 370 / 2, 295 + 480 / 2, s3Scale, () => {
        // Station Box
        drawPill(1110, 295, 370, 480, 24, 'rgba(224, 238, 230, 0.22)', '#ff9557', 2);

        // Animated Clip: File Upload (Excel) & Parameter Selection Simulator
        const clip3X = 1122;
        const clip3Y = 308;
        const clip3W = 346;
        const clip3H = 232;
        drawPill(clip3X, clip3Y, clip3W, clip3H, 14, '#ffffff', '#ff8c42', 2.2);

        // Top Browser / App Window Header
        drawPill(clip3X + 2, clip3Y + 2, clip3W - 4, 24, 12, '#1e293b', null, 0);
        const s3Dots = ['#ef4444', '#f59e0b', '#22c55e'];
        s3Dots.forEach((dc, di) => {
          if (typeof ctx.beginPath === 'function') {
            ctx.beginPath();
            ctx.arc(clip3X + 14 + di * 11, clip3Y + 14, 3.6, 0, Math.PI * 2);
            ctx.fillStyle = dc;
            ctx.fill();
          }
        });
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '800 11.5px "Prompt", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('FILE UPLOAD · EXCEL BOM DATA', clip3X + 46, clip3Y + 18);

        // Pulsing LIVE indicator (settles to steady DONE after 10s)
        const s3Pulse = isSettled ? 1 : (0.5 + 0.5 * Math.sin(t * 5.2));
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.arc(clip3X + clip3W - 46, clip3Y + 14, 3.6, 0, Math.PI * 2);
          ctx.fillStyle = isSettled ? '#22c55e' : `rgba(34, 197, 94, ${0.65 + 0.35 * s3Pulse})`;
          ctx.fill();
        }
        ctx.fillStyle = '#86efac';
        ctx.font = '800 10.5px "Prompt", sans-serif';
        ctx.fillText(isSettled ? 'DONE' : 'LIVE', clip3X + clip3W - 38, clip3Y + 18);

        let drewCustomVideo3 = false;
        if (s && s.station3VideoSrc && typeof document !== 'undefined') {
          if (!window.__slide5Station3VideoEl) {
            const v3 = document.createElement('video');
            v3.src = s.station3VideoSrc;
            v3.muted = true;
            v3.loop = true;
            v3.playsInline = true;
            v3.autoplay = true;
            v3.play().catch(() => {});
            window.__slide5Station3VideoEl = v3;
          }
          const vEl3 = window.__slide5Station3VideoEl;
          if (vEl3 && vEl3.readyState >= 2 && typeof ctx.drawImage === 'function') {
            ctx.save();
            ctx.beginPath();
            ctx.rect(clip3X + 4, clip3Y + 28, clip3W - 8, clip3H - 32);
            ctx.clip();
            ctx.drawImage(vEl3, clip3X + 4, clip3Y + 28, clip3W - 8, clip3H - 32);
            ctx.restore();
            drewCustomVideo3 = true;
          }
        }

        if (!drewCustomVideo3) {
          ctx.save();
          if (typeof ctx.beginPath === 'function') {
            ctx.beginPath();
            ctx.rect(clip3X + 3, clip3Y + 27, clip3W - 6, clip3H - 51);
            ctx.clip();
          }

          // Animated cycle across 4 steps: 0=Top Size, 1=Opening Type, 2=Size, 3=Excel Upload
          const s3Step = isSettled ? 3 : ((t * 0.85) % 4);
          const activeCol3 = Math.floor(s3Step);

          // Column 1: Top Size
          const c1X = clip3X + 8;
          const c1Y = clip3Y + 31;
          const c1W = 54;
          drawPill(c1X, c1Y, c1W, 178, 4, '#f8fafc', activeCol3 === 0 ? '#2563eb' : '#cbd5e1', activeCol3 === 0 ? 1.5 : 1);
          drawPill(c1X + 2, c1Y + 2, c1W - 4, 15, 2, '#e2e8f0', null, 0);
          ctx.fillStyle = '#1e293b';
          app.fillFittedText(ctx, 'Top Size', c1X + c1W / 2, c1Y + 12.5, c1W - 6, 9.5, '800', '"Prompt", sans-serif', 'center');
          drawPill(c1X + 2, c1Y + 19, c1W - 4, 14, 2, '#ffffff', '#94a3b8', 0.8);
          ctx.fillStyle = '#0f172a';
          app.fillFittedText(ctx, 'Hi', c1X + 5, c1Y + 29, c1W - 18, 9.5, '700', '"Prompt", sans-serif', 'left');
          ctx.fillText('▾', c1X + c1W - 11, c1Y + 29);
          const col1Items = ['Round', 'Hi', 'C4', 'Hi', 'T1', 'C2', 'T2', 'N/A', 'Hi-2'];
          col1Items.forEach((it, idx) => {
            const iy = c1Y + 36 + idx * 15;
            const isSel = idx === 1;
            if (isSel) {
              drawPill(c1X + 2, iy, c1W - 4, 14, 2, activeCol3 === 0 ? '#1d4ed8' : '#2563eb', null, 0);
            }
            ctx.fillStyle = isSel ? '#ffffff' : '#475569';
            app.fillFittedText(ctx, it, c1X + 5, iy + 10, c1W - 10, 9.5, isSel ? '800' : '600', '"Prompt", sans-serif', 'left');
          });

          // Column 2: Opening Type
          const c2X = c1X + c1W + 4;
          const c2Y = clip3Y + 31;
          const c2W = 76;
          drawPill(c2X, c2Y, c2W, 178, 4, '#f8fafc', activeCol3 === 1 ? '#2563eb' : '#cbd5e1', activeCol3 === 1 ? 1.5 : 1);
          drawPill(c2X + 2, c2Y + 2, c2W - 4, 15, 2, '#e2e8f0', null, 0);
          ctx.fillStyle = '#1e293b';
          app.fillFittedText(ctx, 'Opening Type', c2X + c2W / 2, c2Y + 12.5, c2W - 6, 9.5, '800', '"Prompt", sans-serif', 'center');
          drawPill(c2X + 2, c2Y + 19, c2W - 4, 14, 2, '#ffffff', '#94a3b8', 0.8);
          ctx.fillStyle = '#0f172a';
          app.fillFittedText(ctx, 'Full Wall', c2X + 4, c2Y + 29, c2W - 16, 9.5, '700', '"Prompt", sans-serif', 'left');
          ctx.fillText('▾', c2X + c2W - 11, c2Y + 29);
          const col2Items = ['N/A', 'Full Wall', 'D-2', 'W-2', 'W-Double', 'W-Sash', 'D-3.25M', 'Bay-1', 'Wall-2'];
          col2Items.forEach((it, idx) => {
            const iy = c2Y + 36 + idx * 15;
            const isSel = idx === 1;
            if (isSel) {
              drawPill(c2X + 2, iy, c2W - 4, 14, 2, activeCol3 === 1 ? '#1d4ed8' : '#2563eb', null, 0);
            }
            ctx.fillStyle = isSel ? '#ffffff' : '#475569';
            app.fillFittedText(ctx, it, c2X + 4, iy + 10, c2W - 8, 9.5, isSel ? '800' : '600', '"Prompt", sans-serif', 'left');
          });

          // Column 3: Size
          const c3X = c2X + c2W + 4;
          const c3Y = clip3Y + 31;
          const c3W = 46;
          drawPill(c3X, c3Y, c3W, 178, 4, '#f8fafc', activeCol3 === 2 ? '#2563eb' : '#cbd5e1', activeCol3 === 2 ? 1.5 : 1);
          drawPill(c3X + 2, c3Y + 2, c3W - 4, 15, 2, '#e2e8f0', null, 0);
          ctx.fillStyle = '#1e293b';
          app.fillFittedText(ctx, 'Size', c3X + c3W / 2, c3Y + 12.5, c3W - 6, 9.5, '800', '"Prompt", sans-serif', 'center');
          drawPill(c3X + 2, c3Y + 19, c3W - 4, 14, 2, '#ffffff', '#94a3b8', 0.8);
          ctx.fillStyle = '#0f172a';
          app.fillFittedText(ctx, '2700', c3X + 4, c3Y + 29, c3W - 15, 9.5, '700', '"Prompt", sans-serif', 'left');
          ctx.fillText('▾', c3X + c3W - 10, c3Y + 29);
          const col3Items = ['3600', '1200', '450', '300', '600', '900', '1800', '2700', '5400'];
          col3Items.forEach((it, idx) => {
            const iy = c3Y + 36 + idx * 15;
            const isSel = idx === 7;
            if (isSel) {
              drawPill(c3X + 2, iy, c3W - 4, 14, 2, activeCol3 === 2 ? '#1d4ed8' : '#2563eb', null, 0);
            }
            ctx.fillStyle = isSel ? '#ffffff' : '#475569';
            app.fillFittedText(ctx, it, c3X + 4, iy + 10, c3W - 8, 9.5, isSel ? '800' : '600', '"Prompt", sans-serif', 'left');
          });

          // Column 4: Excel BOM Sheet Table + Excel Badge
          const exX = c3X + c3W + 5;
          const exY = clip3Y + 31;
          const exW = clip3X + clip3W - exX - 7;
          drawPill(exX, exY, exW, 178, 4, '#ffffff', activeCol3 === 3 ? '#16a34a' : '#cbd5e1', activeCol3 === 3 ? 1.6 : 1);
          drawPill(exX + 2, exY + 2, exW - 4, 15, 2, '#dcfce7', null, 0);
          ctx.fillStyle = '#166534';
          app.fillFittedText(ctx, 'Size (Inner)', exX + 5, exY + 12.5, 50, 9, '800', '"Prompt", sans-serif', 'left');
          app.fillFittedText(ctx, 'Position', exX + 58, exY + 12.5, 42, 9, '800', '"Prompt", sans-serif', 'left');

          const scanRow3 = isSettled ? -1 : Math.floor((t * 2.6) % 9);
          const exRows = [
            ['04-07-02', 'A  4  -  A  8', 'C'],
            ['04-07-02', 'A  8  -  B  8', 'C'],
            ['04-07-02', 'B  8  -  B  4', 'C'],
            ['04-07-02', 'B  4  -  A  4', 'C'],
            ['04-07-02', 'A  1  -  B  1', 'C'],
            ['04-07-02', 'B  1  -  C  1', 'C'],
            ['04-07-02', 'C  1  -  D  1', 'C'],
            ['04-07-02', 'D  1  -  E  1', 'C'],
            ['04-07-02', 'E  1  -  F  1', 'C'],
          ];
          exRows.forEach((r, rIdx) => {
            const ry = exY + 20 + rIdx * 17;
            const isRowActive = rIdx === scanRow3;
            drawPill(
              exX + 2,
              ry,
              exW - 4,
              15,
              2,
              isRowActive ? 'rgba(34, 197, 94, 0.22)' : rIdx % 2 === 0 ? '#f8fafc' : '#ffffff',
              isRowActive ? '#16a34a' : '#e2e8f0',
              0.7
            );
            ctx.fillStyle = isRowActive ? '#14532d' : '#334155';
            app.fillFittedText(ctx, r[0], exX + 5, ry + 11, 44, 9, isRowActive ? '800' : '600', '"Prompt", sans-serif', 'left');
            app.fillFittedText(ctx, r[1], exX + 52, ry + 11, Math.max(36, exW - 72), 9, isRowActive ? '800' : '600', '"Prompt", sans-serif', 'left');
            app.fillFittedText(ctx, r[2], exX + exW - 14, ry + 11, 14, 9, isRowActive ? '800' : '600', '"Prompt", sans-serif', 'left');
          });

          // Floating Excel Logo Badge (top-right of table, stops floating after 10s)
          const badgeBounce = isSettled ? 0 : Math.sin(t * 4.2) * 2;
          const bx = exX + exW - 52;
          const by = exY + 6 + badgeBounce;
          drawPill(bx, by, 48, 42, 6, '#ffffff', '#15803d', 1.5);
          // Grid lines inside right half of Excel icon
          drawPill(bx + 22, by + 5, 21, 32, 2, '#f0fdf4', '#166534', 1);
          for (let gi = 1; gi <= 3; gi++) {
            ctx.fillStyle = '#166534';
            ctx.fillRect(bx + 23, by + 5 + gi * 8, 19, 1);
          }
          // Dark green X shield on left half
          drawPill(bx + 3, by + 3, 24, 36, 4, '#15803d', null, 0);
          ctx.fillStyle = '#ffffff';
          ctx.font = '900 18px "Prompt", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('X', bx + 15, by + 27);

          // Animated Mouse Cursor moving across the 4 targets (stops & hides cleanly after 10s)
          if (!isSettled) {
            const targets3 = [
              { x: c1X + 32, y: c1Y + 58 },
              { x: c2X + 42, y: c2Y + 58 },
              { x: c3X + 26, y: c3Y + 148 },
              { x: bx + 24, y: by + 24 },
            ];
            const tIdx3 = Math.floor(s3Step) % 4;
            const tNext3 = (tIdx3 + 1) % 4;
            const frac3 = s3Step - Math.floor(s3Step);
            const moveP3 = clamp(frac3 / 0.55, 0, 1);
            const cur3X = targets3[tIdx3].x + (targets3[tNext3].x - targets3[tIdx3].x) * moveP3;
            const cur3Y = targets3[tIdx3].y + (targets3[tNext3].y - targets3[tIdx3].y) * moveP3;

            if (frac3 > 0.58 && typeof ctx.beginPath === 'function') {
              const rip3 = (frac3 - 0.58) / 0.42;
              ctx.beginPath();
              ctx.arc(targets3[tNext3].x, targets3[tNext3].y, 4 + rip3 * 13, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(37, 99, 235, ${1 - rip3})`;
              ctx.lineWidth = 1.8;
              ctx.stroke();
            }
            if (typeof ctx.beginPath === 'function') {
              ctx.beginPath();
              ctx.moveTo(cur3X, cur3Y);
              ctx.lineTo(cur3X + 12, cur3Y + 5);
              ctx.lineTo(cur3X + 7, cur3Y + 8);
              ctx.lineTo(cur3X + 10, cur3Y + 14);
              ctx.lineTo(cur3X + 7, cur3Y + 15);
              ctx.lineTo(cur3X + 4, cur3Y + 9);
              ctx.lineTo(cur3X, cur3Y + 13);
              ctx.closePath();
              ctx.fillStyle = '#0f172a';
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }
          }

          ctx.restore();

          // Bottom Status Bar inside Clip 3
          drawPill(clip3X + 3, clip3Y + clip3H - 23, clip3W - 6, 20, 8, '#0f172a', null, 0);
          const progW3 = isSettled ? 105 : Math.round(((t * 45) % 100) * 1.05);
          drawPill(clip3X + 8, clip3Y + clip3H - 18, 105, 10, 5, '#1e293b', null, 0);
          drawPill(clip3X + 8, clip3Y + clip3H - 18, Math.max(18, progW3), 10, 5, '#22c55e', null, 0);
          ctx.fillStyle = '#86efac';
          app.fillFittedText(ctx, isSettled ? 'Uploaded BOM_Data.xlsx ✓' : 'Uploading BOM_Data.xlsx ➔ Web System', clip3X + 120, clip3Y + clip3H - 9.5, clip3W - 128, 10.5, '800', '"Prompt", sans-serif', 'left');
        }

        // Pure Vector Typography
        const txt3P = clamp((t - 3.1) / 0.35, 0, 1);
        if (txt3P > 0) {
          ctx.save();
          ctx.globalAlpha = txt3P;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#85dcc9';
          ctx.font = '900 26px "Prompt", sans-serif';
          ctx.fillText('File Upload', 1110 + 370 / 2, 574);
          ctx.fillStyle = '#ffffff';
          ctx.font = '800 23px "Prompt", sans-serif';
          ctx.fillText('(Excel)', 1110 + 370 / 2, 614);
          ctx.textAlign = 'start';
          ctx.restore();
        }

        // Bottom Pill: Upload BOM Data
        const pUpload = popScale((t - 3.3) / 0.4);
        if (pUpload > 0) {
          drawScaled(1130 + 330 / 2, 685 + 64 / 2, pUpload, () => {
            drawPill(1130, 685, 330, 64, 32, '#9ab8f7', 'rgba(255, 255, 255, 0.6)', 1.5);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 24px "Prompt", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Upload BOM Data', 1130 + 330 / 2, 685 + 41);
            ctx.textAlign = 'start';
          });
        }
      });
    }

    // Connector 3 -> 4
    const c34P = clamp((t - 3.6) / 0.4, 0, 1);
    if (c34P > 0) {
      ctx.save();
      ctx.strokeStyle = '#ff9557';
      ctx.lineWidth = 2.5;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(1480, 535);
        ctx.lineTo(1480 + 20 * c34P, 535);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 7. Station 4: Generate Final BOM Data
    const s4Scale = popScale((t - 3.7) / 0.6);
    if (s4Scale > 0) {
      drawScaled(1500 + 380 / 2, 295 + 480 / 2, s4Scale, () => {
        // Station Box
        drawPill(1500, 295, 380, 480, 24, 'rgba(224, 238, 230, 0.22)', '#ff9557', 2);

        // Animated Clip: Recheck Matrix & Final BOM List Simulator
        const clip4X = 1517;
        const clip4Y = 308;
        const clip4W = 346;
        const clip4H = 232;
        drawPill(clip4X, clip4Y, clip4W, clip4H, 14, '#ffffff', '#ff8c42', 2.2);

        // Top Browser / App Window Header
        drawPill(clip4X + 2, clip4Y + 2, clip4W - 4, 24, 12, '#1e293b', null, 0);
        const s4Dots = ['#ef4444', '#f59e0b', '#22c55e'];
        s4Dots.forEach((dc, di) => {
          if (typeof ctx.beginPath === 'function') {
            ctx.beginPath();
            ctx.arc(clip4X + 14 + di * 11, clip4Y + 14, 3.6, 0, Math.PI * 2);
            ctx.fillStyle = dc;
            ctx.fill();
          }
        });
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '800 11.5px "Prompt", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('RECHECK MATRIX · FINAL BOM LIST', clip4X + 46, clip4Y + 18);

        // Pulsing LIVE indicator (settles cleanly after 10s)
        const s4Pulse = isSettled ? 1 : (0.5 + 0.5 * Math.sin(t * 5.2 + 1.2));
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.arc(clip4X + clip4W - 46, clip4Y + 14, 3.6, 0, Math.PI * 2);
          ctx.fillStyle = isSettled ? '#22c55e' : `rgba(34, 197, 94, ${0.65 + 0.35 * s4Pulse})`;
          ctx.fill();
        }
        ctx.fillStyle = '#86efac';
        ctx.font = '800 10.5px "Prompt", sans-serif';
        ctx.fillText(isSettled ? 'DONE' : 'LIVE', clip4X + clip4W - 38, clip4Y + 18);

        let drewCustomVideo4 = false;
        if (s && s.station4VideoSrc && typeof document !== 'undefined') {
          if (!window.__slide5Station4VideoEl) {
            const v4 = document.createElement('video');
            v4.src = s.station4VideoSrc;
            v4.muted = true;
            v4.loop = true;
            v4.playsInline = true;
            v4.autoplay = true;
            v4.play().catch(() => {});
            window.__slide5Station4VideoEl = v4;
          }
          const vEl4 = window.__slide5Station4VideoEl;
          if (vEl4 && vEl4.readyState >= 2 && typeof ctx.drawImage === 'function') {
            ctx.save();
            ctx.beginPath();
            ctx.rect(clip4X + 4, clip4Y + 28, clip4W - 8, clip4H - 32);
            ctx.clip();
            ctx.drawImage(vEl4, clip4X + 4, clip4Y + 28, clip4W - 8, clip4H - 32);
            ctx.restore();
            drewCustomVideo4 = true;
          }
        }

        if (!drewCustomVideo4) {
          ctx.save();
          if (typeof ctx.beginPath === 'function') {
            ctx.beginPath();
            ctx.rect(clip4X + 3, clip4Y + 27, clip4W - 6, clip4H - 51);
            ctx.clip();
          }

          // Top Half: 4-Row Rule Validation Matrix (✓ / ✕ circles + = result)
          const matY = clip4Y + 30;
          const colCentersX = [clip4X + 58, clip4X + 132, clip4X + 200, clip4X + 272];
          const resCenterX = clip4X + 324;

          // Vertical dashed guide lines from matrix columns down to parameter tables
          colCentersX.forEach((cx) => {
            if (typeof ctx.beginPath === 'function') {
              ctx.save();
              ctx.setLineDash([2, 2]);
              ctx.strokeStyle = '#cbd5e1';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(cx, matY + 4);
              ctx.lineTo(cx, clip4Y + 114);
              ctx.stroke();
              ctx.restore();
            }
          });

          const ruleRows = [
            { checks: [true, true, false, true], ok: false },
            { checks: [true, false, true, true], ok: false },
            { checks: [false, true, true, true], ok: false },
            { checks: [true, true, true, true], ok: true },
          ];
          const activeRuleIdx = isSettled ? 3 : Math.min(3, Math.floor(((t * 1.15) % 4.8)));

          ruleRows.forEach((row, rIdx) => {
            const ry = matY + 10 + rIdx * 20;
            const isScanning = rIdx === activeRuleIdx;

            if (isScanning) {
              drawPill(
                clip4X + 8,
                ry - 8,
                clip4W - 16,
                17,
                8,
                row.ok ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.12)',
                row.ok ? '#16a34a' : '#f87171',
                1.2
              );
            }

            // Black arrow on Row 3 (or currently scanned row)
            if (rIdx === 3 || isScanning) {
              ctx.fillStyle = rIdx === 3 ? '#0f172a' : '#64748b';
              ctx.font = '900 13px "Prompt", sans-serif';
              ctx.textAlign = 'left';
              ctx.fillText('➔', clip4X + 12, ry + 4.5);
            }

            row.checks.forEach((isOk, cIdx) => {
              const cx = colCentersX[cIdx];
              if (typeof ctx.beginPath === 'function') {
                ctx.beginPath();
                ctx.arc(cx, ry, 7.5, 0, Math.PI * 2);
                ctx.fillStyle = isOk ? '#dcfce7' : '#fee2e2';
                ctx.fill();
                ctx.strokeStyle = isOk ? '#16a34a' : '#ef4444';
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }
              ctx.fillStyle = isOk ? '#15803d' : '#dc2626';
              ctx.font = '900 10.5px "Prompt", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(isOk ? '✓' : '✕', cx, ry + 3.5);
            });

            // Equals sign
            ctx.fillStyle = '#334155';
            ctx.font = '900 12.5px "Prompt", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('=', clip4X + 300, ry + 4);

            // Result icon
            if (typeof ctx.beginPath === 'function') {
              ctx.beginPath();
              ctx.arc(resCenterX, ry, 8, 0, Math.PI * 2);
              ctx.fillStyle = row.ok ? '#22c55e' : '#fee2e2';
              ctx.fill();
              ctx.strokeStyle = row.ok ? '#15803d' : '#ef4444';
              ctx.lineWidth = 1.5;
              ctx.stroke();
            }
            ctx.fillStyle = row.ok ? '#ffffff' : '#dc2626';
            ctx.font = '900 11px "Prompt", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(row.ok ? '✓' : '✕', resCenterX, ry + 3.5);
          });

          // Bottom Half: 4 Parameter Columns matching the 4 Matrix Columns
          const pTopY = clip4Y + 112;
          const pBoxH = 95;

          // Param 1: Window Type
          const p1X = clip4X + 18;
          const p1W = 76;
          drawPill(p1X, pTopY, p1W, pBoxH, 4, '#f8fafc', '#94a3b8', 1);
          drawPill(p1X + 2, pTopY + 2, p1W - 4, 13, 2, '#e2e8f0', null, 0);
          ctx.fillStyle = '#1e293b';
          app.fillFittedText(ctx, 'Window Type', p1X + p1W / 2, pTopY + 11.5, p1W - 6, 9, '800', '"Prompt", sans-serif', 'center');
          const p1Items = ['Tostem WE ▾', 'Windsor', 'Single Glass', 'Double Glass', 'Tostem WE'];
          p1Items.forEach((it, idx) => {
            const iy = pTopY + 17 + idx * 15;
            const isSel = idx === 4;
            if (isSel) drawPill(p1X + 2, iy, p1W - 4, 14, 2, '#2563eb', null, 0);
            ctx.fillStyle = isSel ? '#ffffff' : '#334155';
            app.fillFittedText(ctx, it, p1X + 4, iy + 10.5, p1W - 8, 9, (isSel || idx === 0) ? '800' : '600', '"Prompt", sans-serif', 'left');
          });

          // Param 2: Bottom Size
          const p2X = p1X + p1W + 6;
          const p2W = 66;
          drawPill(p2X, pTopY, p2W, pBoxH, 4, '#f8fafc', '#94a3b8', 1);
          drawPill(p2X + 2, pTopY + 2, p2W - 4, 13, 2, '#e2e8f0', null, 0);
          ctx.fillStyle = '#1e293b';
          app.fillFittedText(ctx, 'Bottom Size', p2X + p2W / 2, pTopY + 11.5, p2W - 6, 9, '800', '"Prompt", sans-serif', 'center');
          const p2Items = ['Kitchen ▾', 'N/A', 'F1+800', 'Kitchen', 'Up Beam'];
          p2Items.forEach((it, idx) => {
            const iy = pTopY + 17 + idx * 15;
            const isSel = idx === 3;
            if (isSel) drawPill(p2X + 2, iy, p2W - 4, 14, 2, '#2563eb', null, 0);
            ctx.fillStyle = isSel ? '#ffffff' : '#334155';
            app.fillFittedText(ctx, it, p2X + 4, iy + 10.5, p2W - 8, 9, (isSel || idx === 0) ? '800' : '600', '"Prompt", sans-serif', 'left');
          });

          // Param 3: Top Size
          const p3X = p2X + p2W + 6;
          const p3W = 54;
          drawPill(p3X, pTopY, p3W, pBoxH, 4, '#f8fafc', '#94a3b8', 1);
          drawPill(p3X + 2, pTopY + 2, p3W - 4, 13, 2, '#e2e8f0', null, 0);
          ctx.fillStyle = '#1e293b';
          app.fillFittedText(ctx, 'Top Size', p3X + p3W / 2, pTopY + 11.5, p3W - 6, 9, '800', '"Prompt", sans-serif', 'center');
          const p3Items = ['Hi ▾', 'Round', 'Hi', 'C4', 'T1'];
          p3Items.forEach((it, idx) => {
            const iy = pTopY + 17 + idx * 15;
            const isSel = idx === 2;
            if (isSel) drawPill(p3X + 2, iy, p3W - 4, 14, 2, '#2563eb', null, 0);
            ctx.fillStyle = isSel ? '#ffffff' : '#334155';
            app.fillFittedText(ctx, it, p3X + 4, iy + 10.5, p3W - 8, 9, (isSel || idx === 0) ? '800' : '600', '"Prompt", sans-serif', 'left');
          });

          // Param 4: Wide | Frame Type Table
          const p4X = p3X + p3W + 6;
          const p4W = clip4X + clip4W - p4X - 8;
          drawPill(p4X, pTopY, p4W, pBoxH, 4, '#ffffff', '#16a34a', 1.2);
          drawPill(p4X + 2, pTopY + 2, p4W - 4, 13, 2, '#dcfce7', null, 0);
          ctx.fillStyle = '#166534';
          app.fillFittedText(ctx, 'Wide', p4X + 5, pTopY + 11.5, 24, 9, '800', '"Prompt", sans-serif', 'left');
          app.fillFittedText(ctx, 'Frame Type', p4X + 32, pTopY + 11.5, Math.max(40, p4W - 36), 9, '800', '"Prompt", sans-serif', 'left');
          const p4Scan = isSettled ? -1 : Math.floor((t * 2.4) % 5);
          for (let r = 0; r < 5; r++) {
            const iy = pTopY + 17 + r * 15;
            const isR = r === p4Scan;
            drawPill(p4X + 2, iy, p4W - 4, 14, 2, isR ? 'rgba(34, 197, 94, 0.22)' : '#f8fafc', null, 0);
            ctx.fillStyle = isR ? '#14532d' : '#334155';
            app.fillFittedText(ctx, '3', p4X + 10, iy + 10.5, 16, 9, isR ? '800' : '600', '"Prompt", sans-serif', 'left');
            app.fillFittedText(ctx, 'F  -  F', p4X + 36, iy + 10.5, Math.max(36, p4W - 40), 9, isR ? '800' : '600', '"Prompt", sans-serif', 'left');
          }

          ctx.restore();

          // Bottom Status Bar inside Clip 4
          drawPill(clip4X + 3, clip4Y + clip4H - 23, clip4W - 6, 20, 8, '#0f172a', null, 0);
          const isMatchedNow = activeRuleIdx === 3;
          drawPill(
            clip4X + 8,
            clip4Y + clip4H - 20,
            82,
            14,
            7,
            isMatchedNow ? '#16a34a' : '#d97706',
            null,
            0
          );
          ctx.fillStyle = '#ffffff';
          app.fillFittedText(ctx, isMatchedNow ? 'MATCHED ✓' : `CHECK #${activeRuleIdx + 1}`, clip4X + 49, clip4Y + clip4H - 10, 74, 9.5, '800', '"Prompt", sans-serif', 'center');

          ctx.fillStyle = '#86efac';
          app.fillFittedText(ctx, 'Rule Verified ➔ Generate Final BOM Excel', clip4X + 96, clip4Y + clip4H - 9.5, clip4W - 104, 10.5, '800', '"Prompt", sans-serif', 'left');
        }

        // Pure Vector Typography
        const txt4P = clamp((t - 4.1) / 0.35, 0, 1);
        if (txt4P > 0) {
          ctx.save();
          ctx.globalAlpha = txt4P;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#85dcc9';
          ctx.font = '900 26px "Prompt", sans-serif';
          ctx.fillText('Recheck', 1500 + 380 / 2, 574);
          ctx.fillStyle = '#ffffff';
          ctx.font = '800 23px "Prompt", sans-serif';
          ctx.fillText('>>>  Excel List', 1500 + 380 / 2, 614);
          ctx.textAlign = 'start';
          ctx.restore();
        }

        // Bottom Pill: Generate Final BOM Data
        const pGen = popScale((t - 4.3) / 0.4);
        if (pGen > 0) {
          drawScaled(1525 + 330 / 2, 685 + 64 / 2, pGen, () => {
            drawPill(1525, 685, 330, 64, 32, '#9ab8f7', 'rgba(255, 255, 255, 0.6)', 1.5);
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 24px "Prompt", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Generate Final BOM Data', 1525 + 330 / 2, 685 + 41);
            ctx.textAlign = 'start';
          });
        }
      });
    }

    // =========================================================================
    // 8. REDESIGNED MODERN PROCESS FLOW RUNNER + 4 STAGE CLIPS BELOW CHIPS
    // =========================================================================
    const runnerX = 42;
    const runnerY = 786;
    const runnerW = 1836;
    const runnerH = 66;
    const runnerR = 33;

    const arrowP = clamp((t - 4.5) / 0.6, 0, 1);
    if (arrowP > 0) {
      ctx.save();
      ctx.globalAlpha = arrowP;

      // 8.1 Outer Glass Capsule Track
      const gradBg = typeof ctx.createLinearGradient === 'function'
        ? ctx.createLinearGradient(runnerX, runnerY, runnerX + runnerW, runnerY)
        : null;
      if (gradBg) {
        gradBg.addColorStop(0, 'rgba(10, 32, 25, 0.94)');
        gradBg.addColorStop(0.4, 'rgba(15, 46, 37, 0.90)');
        gradBg.addColorStop(1, 'rgba(18, 54, 43, 0.95)');
      }

      const gradBorder = typeof ctx.createLinearGradient === 'function'
        ? ctx.createLinearGradient(runnerX, runnerY, runnerX + runnerW, runnerY)
        : null;
      if (gradBorder) {
        gradBorder.addColorStop(0, '#85dcc9');
        gradBorder.addColorStop(0.65, '#5ec4ad');
        gradBorder.addColorStop(1, '#ff9557');
      }

      // Draw Glass Capsule with smooth gradient stroke
      drawPill(runnerX, runnerY, runnerW, runnerH, runnerR, gradBg || 'rgba(10, 32, 25, 0.92)', gradBorder || '#85dcc9', 2.4);

      // 8.2 Left Category Pill: WORKFLOW
      const badgeW = 156;
      const badgeH = 44;
      const badgeX = runnerX + 16;
      const badgeY = runnerY + (runnerH - badgeH) / 2;

      const gradBadge = typeof ctx.createLinearGradient === 'function'
        ? ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH)
        : null;
      if (gradBadge) {
        gradBadge.addColorStop(0, '#ff9557');
        gradBadge.addColorStop(1, '#ff6e2e');
      }
      drawPill(badgeX, badgeY, badgeW, badgeH, 22, gradBadge || '#ff9557', 'rgba(255, 255, 255, 0.4)', 1.5);

      // Pulsing LED dot (settles steady after 10s)
      const ledPulse = isSettled ? 1 : (Math.sin(t * 5) * 0.35 + 0.65);
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${ledPulse})`;
      if (typeof ctx.beginPath === 'function' && typeof ctx.arc === 'function') {
        ctx.beginPath();
        ctx.arc(badgeX + 20, badgeY + badgeH / 2, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Badge Text
      ctx.fillStyle = '#ffffff';
      app.fillFittedText(ctx, 'WORKFLOW', badgeX + 76, badgeY + 29, 118, 18.5, '900', '"Prompt", sans-serif', 'center');

      // 8.3 Main Title: Existing Menu Select BOM on WEB
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 23px "Prompt", sans-serif';
      ctx.textAlign = 'start';
      ctx.fillText('Existing Menu Select BOM on WEB', runnerX + 188, runnerY + 41);

      // Vertical Divider
      ctx.save();
      ctx.strokeStyle = 'rgba(133, 220, 201, 0.4)';
      ctx.lineWidth = 1.5;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(runnerX + 648, runnerY + 12);
        ctx.lineTo(runnerX + 648, runnerY + runnerH - 12);
        ctx.stroke();
      }
      ctx.restore();

      // 8.4 Four Connected Process Stage Chips + 4 Live Clips Directly Below Each Chip
      const activeStageIdx = isSettled ? -1 : Math.floor((t * 0.7) % 4);
      const stages = [
        { label: '01 Coding Manual', w: 236, icon: 'ICON/Interior/CODE.png', tag: 'DWG MARKUP · CODE' },
        { label: '02 Web Input / Data', w: 236, icon: 'ICON/Interior/Manaul Tab-IW.png', tag: 'MENU SELECT · IM/MPS' },
        { label: '03 Upload BOM Data', w: 236, icon: 'ICON/Interior/csvfileup.png', tag: 'EXCEL CSV UPLOAD' },
        { label: '04 Final BOM Data', w: 236, icon: 'ICON/Interior/csvfilecheck.png', tag: 'RECHECK · FINAL BOM' }
      ];

      let chipX = runnerX + 668;
      const chipY = runnerY + (runnerH - 42) / 2;
      const chipH = 42;
      const stagePositions = [];

      stages.forEach((st, idx) => {
        const isStageAct = idx === activeStageIdx;
        stagePositions.push({ x: chipX, w: st.w, st, idx, isStageAct });

        // Stage Chip
        drawPill(
          chipX,
          chipY,
          st.w,
          chipH,
          12,
          isStageAct ? 'rgba(34, 197, 94, 0.28)' : 'rgba(20, 52, 42, 0.85)',
          isStageAct ? '#bbff6c' : 'rgba(133, 220, 201, 0.55)',
          isStageAct ? 2.0 : 1.5
        );

        // Accent bullet
        ctx.save();
        ctx.fillStyle = isStageAct ? '#bbff6c' : '#85dcc9';
        ctx.font = '900 16px "Prompt", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('•', chipX + 10, chipY + 26);

        // Chip label
        ctx.fillStyle = '#ffffff';
        app.fillFittedText(ctx, st.label, chipX + 24, chipY + 27, st.w - 32, 17.5, '800', '"Prompt", sans-serif', 'left');
        ctx.restore();

        chipX += st.w + 12;

        // Connector Chevron
        if (idx < stages.length - 1) {
          ctx.save();
          ctx.fillStyle = '#ff9557';
          ctx.font = '900 20px "Prompt", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('❯', chipX - 3, runnerY + 41);
          ctx.restore();
          chipX += 14;
        }
      });

      // 8.5 Far Right Circular Forward Action Badge (➔)
      const arrowCx = runnerX + runnerW - 36;
      const arrowCy = runnerY + runnerH / 2;
      const arrowR = 21;

      drawPill(arrowCx - arrowR, arrowCy - arrowR, arrowR * 2, arrowR * 2, arrowR, '#85dcc9', '#ffffff', 2);
      ctx.fillStyle = '#0d241d';
      ctx.font = '900 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('➔', arrowCx, arrowCy + 7);
      ctx.textAlign = 'start';

      // 8.6 Living Energy Pulse (runs 4.8s -> 10.0s, then stops cleanly)
      if (t >= 4.8 && !isSettled) {
        ctx.save();
        const loopT = ((t - 4.8) % 2.5) / 2.5;
        const pStartX = runnerX + 668;
        const pEndX = arrowCx - arrowR;
        const px = pStartX + loopT * (pEndX - pStartX);
        const py = chipY + chipH / 2;

        ctx.fillStyle = '#ffffff';
        if (typeof ctx.beginPath === 'function' && typeof ctx.arc === 'function') {
          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(133, 220, 201, 0.6)';
          ctx.beginPath();
          ctx.arc(px - 10, py, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // =======================================================================
      // 8.7 FOUR ANIMATED STAGE CLIPS DIRECTLY UNDER 01..04 + LEFT ICON STRIP
      // =======================================================================
      const clipRowY = 862;
      const clipRowH = 176;

      // Left Panel under WORKFLOW title: SCG HEIM Interior & BOM Plugin Icons Strip
      const leftCardX = runnerX;
      const leftCardW = 648;
      drawPill(leftCardX, clipRowY, leftCardW, clipRowH, 16, 'rgba(12, 34, 27, 0.88)', 'rgba(133, 220, 201, 0.45)', 1.6);
      drawPill(leftCardX + 2, clipRowY + 2, leftCardW - 4, 26, 14, '#1e293b', null, 0);
      ctx.fillStyle = '#85dcc9';
      app.fillFittedText(ctx, 'SCG HEIM · INTERIOR & BOM AUTOMATION TOOLKIT ICONS (LIVE PIPELINE)', leftCardX + 14, clipRowY + 19, leftCardW - 28, 13.5, '800', '"Prompt", sans-serif', 'left');

      const pluginIcons = [
        { src: 'ICON/Interior/all-process-interior.png', lbl: 'All Process' },
        { src: 'ICON/Interior/One Command.png', lbl: 'One Cmd' },
        { src: 'ICON/Interior/3dwall.png', lbl: '3D Wall' },
        { src: 'ICON/Interior/CODE.png', lbl: 'Auto Code' },
        { src: 'ICON/Interior/door-win.png', lbl: 'Door/Win' },
        { src: 'ICON/Interior/buildpartition.png', lbl: 'Partition' },
        { src: 'ICON/Interior/Punching - Gen2D-SB.png', lbl: 'Punch 2D' },
        { src: 'ICON/Interior/uploaddb.png', lbl: 'Upload DB' }
      ];
      const activeIconIdx = isSettled ? -1 : Math.floor((t * 1.6) % pluginIcons.length);
      pluginIcons.forEach((ic, iIdx) => {
        const ix = leftCardX + 14 + iIdx * 78;
        const iy = clipRowY + 36;
        const isIcAct = iIdx === activeIconIdx;
        drawPill(
          ix,
          iy,
          70,
          96,
          10,
          isIcAct ? 'rgba(34, 197, 94, 0.22)' : 'rgba(255, 255, 255, 0.92)',
          isIcAct ? '#bbff6c' : '#cbd5e1',
          isIcAct ? 2.0 : 1.0
        );
        const icImg = getImage(ic.src);
        if (icImg && icImg.complete && icImg.naturalWidth && typeof ctx.drawImage === 'function') {
          ctx.drawImage(icImg, ix + 11, iy + 8, 48, 48);
        }
        ctx.fillStyle = isIcAct ? '#ffffff' : '#1e293b';
        app.fillFittedText(ctx, ic.lbl, ix + 35, iy + 78, 64, 12, '800', '"Prompt", sans-serif', 'center');
      });
      ctx.fillStyle = '#cbd5e1';
      app.fillFittedText(ctx, '▶ เปรียบเทียบขั้นตอน Manual เดิม (01–04 ด้านขวา) ก่อนยกระดับสู่ระบบ Plug-in อัตโนมัติ', leftCardX + 16, clipRowY + clipRowH - 13, leftCardW - 32, 14, '700', '"Prompt", sans-serif', 'left');

      // 4 Live Animated Stage Clips directly under 01, 02, 03, 04
      stagePositions.forEach((sp) => {
        const cx = sp.x;
        const cy = clipRowY;
        const cw = sp.w;
        const ch = clipRowH;
        const isAct = sp.isStageAct;

        // Vertical glowing link from stage chip down to clip
        if (typeof ctx.beginPath === 'function') {
          ctx.save();
          ctx.strokeStyle = isAct ? '#bbff6c' : '#ff9557';
          ctx.lineWidth = isAct ? 2.5 : 1.6;
          ctx.beginPath();
          ctx.moveTo(cx + cw / 2, chipY + chipH);
          ctx.lineTo(cx + cw / 2, cy);
          ctx.stroke();
          ctx.restore();
        }

        // Clip Window Frame
        drawPill(
          cx,
          cy,
          cw,
          ch,
          14,
          '#ffffff',
          isAct ? '#bbff6c' : '#ff9557',
          isAct ? 2.4 : 1.8
        );

        // Top Window Header
        drawPill(cx + 2, cy + 2, cw - 4, 22, 11, '#1e293b', null, 0);
        const mDots = ['#ef4444', '#f59e0b', '#22c55e'];
        mDots.forEach((dc, di) => {
          if (typeof ctx.beginPath === 'function') {
            ctx.beginPath();
            ctx.arc(cx + 11 + di * 9, cy + 13, 3, 0, Math.PI * 2);
            ctx.fillStyle = dc;
            ctx.fill();
          }
        });
        ctx.fillStyle = '#e2e8f0';
        app.fillFittedText(ctx, sp.st.tag, cx + 38, cy + 16.5, cw - 92, 10.5, '800', '"Prompt", sans-serif', 'left');

        // LIVE dot
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.arc(cx + cw - 38, cy + 13, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#22c55e';
          ctx.fill();
        }
        ctx.fillStyle = '#86efac';
        ctx.font = '800 9.5px "Prompt", sans-serif';
        ctx.fillText(isSettled ? 'DONE' : 'LIVE', cx + cw - 32, cy + 16.5);

        // Body content per stage (0, 1, 2, 3)
        const bx = cx + 6;
        const by = cy + 27;
        const bw = cw - 12;
        const bh = ch - 50;

        if (sp.idx === 0) {
          // 01 Coding Manual Clip: Floorplan markup + CODE icon + live grid tag scanning
          const fpImg = getImage('assets/ver3/slide_04_floorplan_markup.png');
          if (fpImg && fpImg.complete && fpImg.naturalWidth && typeof ctx.drawImage === 'function') {
            ctx.drawImage(fpImg, bx, by, bw - 58, bh);
          } else {
            drawPill(bx, by, bw - 58, bh, 6, '#f1f5f9', '#cbd5e1', 1);
          }
          // Animated scanning box over floorplan (stops cleanly at 10s)
          const scan01 = isSettled ? 0 : ((t * 0.9) % 3);
          const spots01 = [
            { x: bx + 14, y: by + 18, code: 'ST-12B' },
            { x: bx + 68, y: by + 48, code: 'FT-24A' },
            { x: bx + 32, y: by + 76, code: 'W-K900' }
          ];
          const curSpot = spots01[Math.floor(scan01)];
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(curSpot.x, curSpot.y, 44, 22);
          drawPill(curSpot.x, curSpot.y - 16, 54, 15, 3, '#dc2626', null, 0);
          ctx.fillStyle = '#ffffff';
          ctx.font = '800 10px "Prompt", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(curSpot.code, curSpot.x + 27, curSpot.y - 4.5);

          // Right icon badge from ICON/Interior/CODE.png
          drawPill(bx + bw - 54, by, 54, bh, 6, '#f8fafc', '#cbd5e1', 1);
          const icCode = getImage('ICON/Interior/CODE.png');
          if (icCode && icCode.complete && icCode.naturalWidth && typeof ctx.drawImage === 'function') {
            ctx.drawImage(icCode, bx + bw - 48, by + 6, 42, 42);
          }
          ctx.fillStyle = '#0f172a';
          app.fillFittedText(ctx, 'Manual', bx + bw - 27, by + 64, 50, 10, '800', '"Prompt", sans-serif', 'center');
          app.fillFittedText(ctx, 'Coding', bx + bw - 27, by + 77, 50, 10, '800', '"Prompt", sans-serif', 'center');
          ctx.fillStyle = '#16a34a';
          app.fillFittedText(ctx, curSpot.code, bx + bw - 27, by + 95, 50, 10, '800', '"Prompt", sans-serif', 'center');
        } else if (sp.idx === 1) {
          // 02 Web Input / Data Clip: Menu 1/2/3 + Create IM/MPS/PS + Manaul Tab-IW icon
          drawPill(bx, by, bw, bh, 6, '#f8fafc', '#cbd5e1', 1);
          const icTab = getImage('ICON/Interior/Manaul Tab-IW.png');
          if (icTab && icTab.complete && icTab.naturalWidth && typeof ctx.drawImage === 'function') {
            ctx.drawImage(icTab, bx + 4, by + 4, 68, 22);
          }
          const mRows = ['Menu 1: Wall ST/FT', 'Menu 2: Grid A1-B1', 'Menu 3: Win Hi-K900'];
          const actM = isSettled ? 0 : Math.floor((t * 1.5) % 3);
          mRows.forEach((mr, mi) => {
            const my = by + 30 + mi * 22;
            const isM = mi === actM;
            drawPill(bx + 4, my, 134, 18, 4, isM ? '#2563eb' : '#ffffff', '#cbd5e1', 0.8);
            ctx.fillStyle = isM ? '#ffffff' : '#334155';
            app.fillFittedText(ctx, mr, bx + 8, my + 12.5, 126, 10, '700', '"Prompt", sans-serif', 'left');
          });
          const btns2 = ['Create IM', 'Create MPS', 'Create PS'];
          btns2.forEach((bt, bi) => {
            const by2 = by + 30 + bi * 22;
            const isB = bi === actM;
            drawPill(bx + 144, by2, 74, 18, 5, isB ? '#16a34a' : '#1e3a2f', null, 0);
            ctx.fillStyle = '#ffffff';
            app.fillFittedText(ctx, bt, bx + 181, by2 + 12.5, 68, 10, '800', '"Prompt", sans-serif', 'center');
          });
        } else if (sp.idx === 2) {
          // 03 Upload BOM Data Clip: Excel table rows + csvfileup.png & uploaddb.png
          drawPill(bx, by, bw, bh, 6, '#f8fafc', '#cbd5e1', 1);
          const uRows = [
            '04-07-02 | A1-B1 | IM',
            '04-07-02 | B1-C1 | MPS',
            '04-07-02 | C1-D1 | PS',
            '04-07-02 | D1-E1 | BOM'
          ];
          const actU = isSettled ? 3 : Math.floor((t * 2.2) % 4);
          uRows.forEach((ur, ui) => {
            const uy = by + 6 + ui * 23;
            const isU = ui === actU;
            drawPill(bx + 4, uy, 146, 19, 4, isU ? '#dcfce7' : '#ffffff', isU ? '#16a34a' : '#e2e8f0', 0.9);
            ctx.fillStyle = isU ? '#166534' : '#334155';
            app.fillFittedText(ctx, ur, bx + 7, uy + 13, 140, 10, '700', '"Consolas", "Prompt", sans-serif', 'left');
          });
          const icUp = getImage('ICON/Interior/csvfileup.png');
          if (icUp && icUp.complete && icUp.naturalWidth && typeof ctx.drawImage === 'function') {
            ctx.drawImage(icUp, bx + 160, by + 10, 52, 52);
          }
          ctx.fillStyle = '#15803d';
          app.fillFittedText(ctx, 'CSV Upload', bx + 186, by + 80, 62, 10.5, '800', '"Prompt", sans-serif', 'center');
        } else {
          // 04 Final BOM Data Clip: Recheck matrix + csvfilecheck.png & all-process-interior.png
          drawPill(bx, by, bw, bh, 6, '#f8fafc', '#cbd5e1', 1);
          const chkRows = [
            { txt: 'Rule 1: Window WE', ok: true },
            { txt: 'Rule 2: Bottom Kitchen', ok: true },
            { txt: 'Rule 3: Top Size Hi', ok: true },
            { txt: 'Result: BOM Verified ✓', ok: true }
          ];
          const actC = isSettled ? 3 : Math.floor((t * 1.8) % 4);
          chkRows.forEach((cr, ci) => {
            const cy2 = by + 6 + ci * 23;
            const isC = ci === actC;
            drawPill(bx + 4, cy2, 146, 19, 4, isC ? '#dcfce7' : '#ffffff', '#16a34a', isC ? 1.3 : 0.7);
            ctx.fillStyle = '#15803d';
            app.fillFittedText(ctx, '✓ ' + cr.txt, bx + 7, cy2 + 13, 140, 10, '800', '"Prompt", sans-serif', 'left');
          });
          const icChk = getImage('ICON/Interior/csvfilecheck.png');
          if (icChk && icChk.complete && icChk.naturalWidth && typeof ctx.drawImage === 'function') {
            ctx.drawImage(icChk, bx + 160, by + 10, 52, 52);
          }
          ctx.fillStyle = '#15803d';
          app.fillFittedText(ctx, 'Final BOM OK', bx + 186, by + 80, 62, 10.5, '800', '"Prompt", sans-serif', 'center');
        }

        // Bottom Status Bar inside each of the 4 stage clips
        drawPill(cx + 3, cy + ch - 20, cw - 6, 18, 7, '#0f172a', null, 0);
        ctx.fillStyle = isAct ? '#bbff6c' : '#85dcc9';
        app.fillFittedText(ctx, isSettled ? `● ${sp.st.label} · Ready` : `● ${sp.st.label} · Active Simulation`, cx + cw / 2, cy + ch - 8, cw - 12, 10.5, '800', '"Prompt", sans-serif', 'center');
      });

      ctx.restore();
    }

    // Micro pulses along connectors 1->2, 2->3, 3->4 (runs up to 10s, then stops cleanly)
    if (t >= 4.8 && !isSettled) {
      ctx.save();
      const connT = ((t * 1.5) % 1);
      const connSpots = [
        { x1: 507, x2: 525, y: 535 },
        { x1: 1090, x2: 1110, y: 535 },
        { x1: 1480, x2: 1500, y: 535 }
      ];
      ctx.fillStyle = '#ff9557';
      connSpots.forEach(conn => {
        const cx = conn.x1 + connT * (conn.x2 - conn.x1);
        if (typeof ctx.beginPath === 'function' && typeof ctx.arc === 'function') {
          ctx.beginPath();
          ctx.arc(cx, conn.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }
  }

  
  // ============================================================================
  // SHARED MASTER HELPER FOR SLIDES 06, 07, 08, 09 (BEFORE vs AFTER PPTX LAYOUT)
  // ============================================================================
  function drawBeforeAfterMaster(ctx, app, t, title1, title2, title2Size) {
    function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
    function easeOutCubic(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }

    // 1. PPTX Master Background: Sage-Charcoal to Mint-Teal Gradient (1920x1080)
    if (typeof ctx.createLinearGradient === 'function') {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1080);
      bgGrad.addColorStop(0.00, '#3d5048');
      bgGrad.addColorStop(0.28, '#536d62');
      bgGrad.addColorStop(0.62, '#6fa08f');
      bgGrad.addColorStop(1.00, '#8dd1be');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1920, 1080);

      // Subtle diagonal vignette matching PPTX Rectangle 2 (rot=180)
      const diagGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
      diagGrad.addColorStop(0.00, 'rgba(28, 38, 34, 0.35)');
      diagGrad.addColorStop(0.45, 'rgba(60, 82, 73, 0.08)');
      diagGrad.addColorStop(1.00, 'rgba(141, 209, 190, 0.18)');
      ctx.fillStyle = diagGrad;
      ctx.fillRect(0, 0, 1920, 1080);

      // VISUAL HIERARCHY: Dim/tone down the BEFORE side (x=0..960) & spotlight the AFTER side (x=960..1920)
      const beforeDimGrad = ctx.createLinearGradient(0, 0, 960, 0);
      beforeDimGrad.addColorStop(0.00, 'rgba(12, 18, 20, 0.38)');
      beforeDimGrad.addColorStop(0.85, 'rgba(12, 18, 20, 0.32)');
      beforeDimGrad.addColorStop(1.00, 'rgba(12, 18, 20, 0.18)');
      ctx.fillStyle = beforeDimGrad;
      ctx.fillRect(0, 0, 960, 1080);

      const afterGlowGrad = ctx.createLinearGradient(960, 0, 1920, 1080);
      afterGlowGrad.addColorStop(0.00, 'rgba(187, 255, 108, 0.12)');
      afterGlowGrad.addColorStop(0.50, 'rgba(133, 220, 201, 0.10)');
      afterGlowGrad.addColorStop(1.00, 'rgba(187, 255, 108, 0.16)');
      ctx.fillStyle = afterGlowGrad;
      ctx.fillRect(960, 0, 960, 1080);
    } else {
      ctx.fillStyle = '#5c7c70';
      ctx.fillRect(0, 0, 1920, 1080);
    }

    // 2. Top-Left Fading Banner Rectangle 16 (0, 65.6, 460.1, 101.1)
    const pHead = easeOutCubic(t / 0.45);
    ctx.save();
    ctx.globalAlpha = pHead;
    if (typeof ctx.createLinearGradient === 'function') {
      const banGrad = ctx.createLinearGradient(0, 65.6, 460.1, 65.6);
      banGrad.addColorStop(0.00, 'rgba(72, 98, 88, 0.95)');
      banGrad.addColorStop(0.65, 'rgba(82, 110, 99, 0.72)');
      banGrad.addColorStop(1.00, 'rgba(95, 126, 114, 0.0)');
      ctx.fillStyle = banGrad;
    } else {
      ctx.fillStyle = 'rgba(72, 98, 88, 0.85)';
    }
    ctx.fillRect(0, 65.6, 460.1, 101.1);

    // Top-Left Title TextBox 17
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = '800 45px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText(title1, 24, 110);
    const sz2 = title2Size || 45;
    ctx.font = `800 ${sz2}px "Prompt", "Segoe UI", sans-serif`;
    ctx.fillText(title2, 24, sz2 >= 40 ? 164 : 152);
    ctx.restore();

    // Helper: PPTX Teardrop (rot=0 -> circle with top-right sharp corner)
    function drawTeardropBadge(bx, by, bw, bh, fillHex, strokeHex, mainLabel, subLabel, barX, barY, barW, barH, delay, isAfterBadge) {
      const p = easeOutCubic((t - delay) / 0.5);
      if (p <= 0) return;
      const r = bw / 2;
      const cx = bx + r;
      const cy = by + r;

      ctx.save();
      ctx.globalAlpha = isAfterBadge ? p : p * 0.62;
      ctx.shadowColor = isAfterBadge ? 'rgba(187, 255, 108, 0.45)' : 'rgba(0, 0, 0, 0.18)';
      ctx.shadowBlur = isAfterBadge ? 24 : 8;
      ctx.shadowOffsetY = isAfterBadge ? 5 : 2;

      ctx.fillStyle = isAfterBadge ? fillHex : 'rgba(70, 52, 112, 0.78)';
      ctx.strokeStyle = strokeHex;
      ctx.lineWidth = isAfterBadge ? 3.2 : 1.4;

      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(cx, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 1.5, false);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
      } else {
        ctx.fillRect(bx, by, bw, bh);
      }

      // Main label (Before / After)
      ctx.fillStyle = strokeHex;
      ctx.textAlign = 'center';
      ctx.font = `${isAfterBadge ? '900 58px' : '800 52px'} "Prompt", "Segoe UI", sans-serif`;
      ctx.fillText(mainLabel, cx, by + 114);

      // Sub label ((Existing Work Flow) / (Improved Work Flow))
      ctx.font = `${isAfterBadge ? '700 20px' : '500 19px'} "Prompt", "Segoe UI", sans-serif`;
      ctx.fillText(subLabel, cx, by + 150);

      // Horizontal accent bar (006 Frame)
      ctx.fillStyle = strokeHex;
      ctx.fillRect(barX, barY, barW, isAfterBadge ? barH + 1.5 : barH);
      ctx.textAlign = 'left';
      ctx.restore();
    }

    // 3. Before Teardrop Group 7 (430.3, 27.2, 272.4, 272.4) - Dimmed / Muted
    drawTeardropBadge(
      430.3, 27.2, 272.4, 272.4,
      '#5a33aa', '#fe9457',
      'Before', '(Existing Work Flow)',
      478.4, 204.1, 177.7, 7.6,
      0.08,
      false
    );

    // 4. After Teardrop Group 8 (1211.6, 27.2, 272.4, 272.4) - Highlighted / Emphasized
    drawTeardropBadge(
      1211.6, 27.2, 272.4, 272.4,
      '#6128d8', '#bbff6c',
      'After', '(Improved Work Flow)',
      1259.7, 204.1, 177.7, 7.6,
      0.16,
      true
    );

    // 5. Center Vertical Dash-Dot Divider Line (x=960.0, y=40.9..1039.8)
    const pLine = easeOutCubic((t - 0.1) / 0.5);
    if (pLine > 0) {
      ctx.save();
      ctx.globalAlpha = pLine;
      ctx.strokeStyle = '#fe9457';
      ctx.lineWidth = 2.4;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([18, 8, 4, 8]);
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(960.0, 40.9);
        ctx.lineTo(960.0, 40.9 + 998.9 * pLine);
        ctx.stroke();
      }
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
      ctx.restore();
    }

    // 6. Top-Right Page Badge
    drawPageBadge(ctx, app);
  }

  function drawPptxImage(ctx, src, x, y, w, h, borderColor, borderWidth, alpha) {
    const im = loadImage(src);
    // ONLY dim the Before side on Before/After slides (Slides 06, 07, 08, 09) — NEVER on Slide 10 or Slide 11!
    const isBeforeAfterSlide = /slide0[6789]_/.test(String(src || ''));
    const isBeforeSide = isBeforeAfterSlide && x < 920;
    const baseAlpha = alpha !== undefined ? alpha : 1;
    ctx.save();
    ctx.globalAlpha = isBeforeSide ? baseAlpha * 0.56 : baseAlpha;
    ctx.shadowColor = isBeforeSide ? 'rgba(0, 0, 0, 0.16)' : (borderColor === '#bbff6c' ? 'rgba(187, 255, 108, 0.35)' : 'rgba(0, 0, 0, 0.30)');
    ctx.shadowBlur = isBeforeSide ? 8 : (isBeforeAfterSlide ? 20 : 14);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = isBeforeSide ? 3 : 5;
    if (im && im.complete && im.naturalWidth) {
      if (typeof ctx.drawImage === 'function') ctx.drawImage(im, x, y, w, h);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x, y, w, h);
    }
    // Extra subtle dark-slate tint over Before images on Slides 06-09 only
    if (isBeforeSide) {
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(15, 23, 28, 0.22)';
      ctx.fillRect(x, y, w, h);
    }
    ctx.shadowColor = 'transparent';
    if (borderColor && borderWidth) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isBeforeSide ? Math.max(1.5, borderWidth * 0.75) : (borderColor === '#bbff6c' ? borderWidth + 0.8 : borderWidth);
      ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
  }

  function drawAspectImage(ctx, src, x, y, w, h, opts) {
    const o = opts || {};
    const im = loadImage(src);
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    const rad = o.radius || 0;
    const pad = o.pad || 0;

    if (o.bgColor) {
      ctx.fillStyle = o.bgColor;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        if (rad > 0 && typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, rad);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.fill();
      } else {
        ctx.fillRect(x, y, w, h);
      }
    }

    if (im && im.complete && im.naturalWidth > 0 && im.naturalHeight > 0 && typeof ctx.drawImage === 'function') {
      const maxW = Math.max(2, w - pad * 2);
      const maxH = Math.max(2, h - pad * 2);
      const sc = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight);
      const dw = im.naturalWidth * sc;
      const dh = im.naturalHeight * sc;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      if (rad > 0 && typeof ctx.beginPath === 'function' && typeof ctx.clip === 'function') {
        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(x + 1, y + 1, w - 2, h - 2, Math.max(0, rad - 1));
        else ctx.rect(x + 1, y + 1, w - 2, h - 2);
        ctx.clip();
        ctx.drawImage(im, dx, dy, dw, dh);
        ctx.restore();
      } else {
        ctx.drawImage(im, dx, dy, dw, dh);
      }
    } else {
      ctx.fillStyle = o.placeholderColor || 'rgba(148, 163, 184, 0.14)';
      ctx.fillRect(x + pad, y + pad, Math.max(2, w - pad * 2), Math.max(2, h - pad * 2));
    }

    if (o.borderColor && o.borderWidth) {
      ctx.strokeStyle = o.borderColor;
      ctx.lineWidth = o.borderWidth;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        if (rad > 0 && typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, rad);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, w, h);
      }
    }
    ctx.restore();
  }

  function drawPptxCapsulePill(ctx, x, y, w, h, isAfter, line1, line2, alpha) {
    const baseAlpha = alpha !== undefined ? alpha : 1;
    ctx.save();
    ctx.globalAlpha = isAfter ? baseAlpha : baseAlpha * 0.64;
    const r = h / 2;
    ctx.shadowColor = isAfter ? 'rgba(187, 255, 108, 0.38)' : 'rgba(0, 0, 0, 0.14)';
    ctx.shadowBlur = isAfter ? 16 : 6;
    ctx.shadowOffsetY = isAfter ? 4 : 2;

    ctx.fillStyle = isAfter ? 'rgba(228, 255, 188, 0.96)' : 'rgba(228, 198, 166, 0.78)';
    ctx.strokeStyle = isAfter ? '#bbff6c' : 'rgba(254, 148, 87, 0.65)';
    ctx.lineWidth = isAfter ? 2.6 : 1.5;

    if (typeof ctx.beginPath === 'function') {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else {
      ctx.fillRect(x, y, w, h);
    }

    ctx.fillStyle = isAfter ? '#0b1410' : '#26302c';
    ctx.textAlign = 'center';
    if (!line2) {
      ctx.font = `${isAfter ? '900 26.5px' : '700 25px'} "Prompt", "Segoe UI", sans-serif`;
      ctx.fillText(line1, x + w / 2, y + h / 2 + 9);
    } else {
      ctx.font = `${isAfter ? '900 25.5px' : '700 24px'} "Prompt", "Segoe UI", sans-serif`;
      ctx.fillText(line1, x + w / 2, y + 31);
      ctx.fillStyle = isAfter ? '#14241c' : '#33413b';
      ctx.font = `${isAfter ? '600 19.5px' : '500 18.5px'} "Prompt", "Segoe UI", sans-serif`;
      ctx.fillText(line2, x + w / 2, y + 56);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ============================================================================
  // SLIDE 06 (v3-standard): Long Lead-time Parts (Matches ppt/slides/slide6.xml)
  // ============================================================================
  function drawSlide5BeforeAfterScene(app, s) {
    const ctx = app.ctx;
    const { isSettled, t } = getCappedMotion(app);
    function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
    function easeOut(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }

    drawBeforeAfterMaster(ctx, app, t, 'Long Lead-time', 'Parts', 45);

    // Subheaders: Manual (Left, dimmed) & Automate (Right, emphasized)
    const pSub = easeOut((t - 0.15) / 0.45);
    ctx.save();
    ctx.globalAlpha = pSub * 0.58;
    ctx.textAlign = 'center';

    // TextBox 12: Manual | On WEB Program (692.2, 257.3, 254.5, 106.6)
    ctx.fillStyle = '#fe9457';
    ctx.font = '800 45px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Manual', 819.5, 292);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 26px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('On WEB Program', 819.5, 332);

    // TextBox 13: Automate | 2D CAD (Imported) | 3D SketchUp (+Plug-in Ruby)
    ctx.globalAlpha = pSub;
    ctx.shadowColor = 'rgba(187, 255, 108, 0.35)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#bbff6c';
    ctx.font = '900 47px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Automate', 1690.8, 282);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 26px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('2D CAD (Imported)', 1690.8, 318);
    ctx.fillText('3D SketchUp (+Plug-in Ruby)', 1690.8, 351);
    ctx.textAlign = 'left';
    ctx.restore();

    // Left (Before) Pictures & Pills in exact PPTX z-order
    const pLeft1 = easeOut((t - 0.22) / 0.5);
    drawPptxImage(ctx, 'assets/ver3/slide06_llt/pic_19_image18.png', 47.7, 299.1, 423.2, 294.8, '#fe9457', 3.2, pLeft1);
    drawPptxImage(ctx, 'assets/ver3/slide06_llt/pic_20_image19.png', 324.4, 380.9, 350.9, 263.1, null, 0, pLeft1);
    drawPptxCapsulePill(ctx, 450.7, 471.4, 538.0, 70.6, false, 'Manual Operate', null, pLeft1);

    const pLeft2 = easeOut((t - 0.34) / 0.5);
    drawPptxImage(ctx, 'assets/ver3/slide06_llt/pic_23_image20.png', 45.4, 681.2, 620.7, 336.4, '#fe9457', 3.2, pLeft2);
    drawPptxImage(ctx, 'assets/ver3/slide06_llt/pic_24_image21.png', 558.1, 830.4, 365.4, 218.0, '#334155', 1.5, pLeft2);
    drawPptxCapsulePill(ctx, 450.7, 748.5, 538.0, 70.6, false, 'Selecting - One by One', null, pLeft2);

    // Right (After) Animated Clip & Pill in exact PPTX z-order
    const pRight = easeOut((t - 0.44) / 0.55);
    const rBoxX = 1044.3;
    const rBoxY = 407.4;
    const rBoxW = 820.2;
    const rBoxH = 481.0;

    // Base image + green border
    drawPptxImage(ctx, 'assets/ver3/slide06_llt/pic_26_image22.png', rBoxX, rBoxY, rBoxW, rBoxH, '#bbff6c', 3.5, pRight);

    if (pRight > 0) {
      ctx.save();
      ctx.globalAlpha = pRight;

      // Optional custom video override if s.afterVideoSrc is set
      let drewCustomAfterVid6 = false;
      if (s && s.afterVideoSrc && typeof document !== 'undefined') {
        if (!window.__slide6AfterVideoEl) {
          const v6 = document.createElement('video');
          v6.src = s.afterVideoSrc;
          v6.muted = true;
          v6.loop = true;
          v6.playsInline = true;
          v6.autoplay = true;
          v6.play().catch(() => {});
          window.__slide6AfterVideoEl = v6;
        }
        const vEl6 = window.__slide6AfterVideoEl;
        if (vEl6 && vEl6.readyState >= 2 && typeof ctx.drawImage === 'function') {
          ctx.save();
          ctx.beginPath();
          ctx.rect(rBoxX + 3, rBoxY + 28, rBoxW - 6, rBoxH - 31);
          ctx.clip();
          ctx.drawImage(vEl6, rBoxX + 3, rBoxY + 28, rBoxW - 6, rBoxH - 31);
          ctx.restore();
          drewCustomAfterVid6 = true;
        }
      }

      // Top Live Clip Header Bar (right half of top edge so it sits cleanly alongside the pill)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.fillRect(rBoxX + 418, rBoxY + 2, rBoxW - 420, 24);
      const s6Pulse = isSettled ? 1 : (0.5 + 0.5 * Math.sin(t * 5.4));
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.arc(rBoxX + 432, rBoxY + 14, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = isSettled ? '#22c55e' : `rgba(34, 197, 94, ${0.65 + 0.35 * s6Pulse})`;
        ctx.fill();
      }
      ctx.fillStyle = '#86efac';
      app.fillFittedText(ctx, isSettled ? 'DONE · SKETCHUP 3D + RUBY AUTO-DETECT PART' : 'LIVE CLIP · SKETCHUP 3D + RUBY AUTO-DETECT PART', rBoxX + 444, rBoxY + 18.5, rBoxW - 454, 12, '800', '"Prompt", sans-serif', 'left');

      if (!drewCustomAfterVid6) {
        const cyc6 = isSettled ? 5.99 : ((t * 0.72) % 6); // 6-unit animation cycle, holds complete at 10s

        // 1. Animated Toolbar Highlight (CAD -> 1234 -> TBOX -> Door -> Layer -> CSV -> Check)
        const tbIconsX = [1124, 1154, 1185, 1216, 1245, 1304, 1336];
        const activeTbIdx = isSettled ? 2 : Math.floor((t * 1.8) % tbIconsX.length);
        const tbHx = tbIconsX[activeTbIdx];
        ctx.save();
        ctx.strokeStyle = '#16a34a';
        ctx.fillStyle = 'rgba(34, 197, 94, 0.20)';
        ctx.lineWidth = 2;
        ctx.fillRect(tbHx - 13, 439, 26, 26);
        ctx.strokeRect(tbHx - 13, 439, 26, 26);
        ctx.restore();

        // 2. Sweeping 3D Laser Scan Line across the SketchUp 3D Floorplan (hidden once settled)
        const scanProgress = (t * 0.42) % 1;
        const scanY = 475 + scanProgress * 340;
        ctx.save();
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.rect(rBoxX + 6, 470, 535, 360);
          ctx.clip();
        }
        const scanGrad = (!isSettled && typeof ctx.createLinearGradient === 'function')
          ? ctx.createLinearGradient(rBoxX + 10, scanY - 18, rBoxX + 10, scanY + 6)
          : null;
        if (scanGrad) {
          scanGrad.addColorStop(0, 'rgba(34, 197, 94, 0)');
          scanGrad.addColorStop(0.8, 'rgba(34, 197, 94, 0.22)');
          scanGrad.addColorStop(1, 'rgba(22, 163, 74, 0.75)');
          ctx.fillStyle = scanGrad;
          ctx.fillRect(rBoxX + 12, scanY - 18, 520, 24);
        }

        // 3. Animated 3D Component Detection Boxes on the House Model
        const parts3D = [
          { x: 1182, y: 506, w: 68, h: 108, code: 'Hi-K30092LAM', ok: true, step: 0.5 },
          { x: 1412, y: 454, w: 92, h: 112, code: 'DC1-A00(W)LCSUL', ok: true, step: 1.4 },
          { x: 1474, y: 632, w: 72, h: 98, code: 'Hi-C1800S2-F2', ok: true, step: 2.3 },
          { x: 1204, y: 694, w: 116, h: 118, code: 'Hi-K900S2LAM', ok: true, step: 3.1 },
          { x: 1264, y: 534, w: 62, h: 110, code: 'Hi-Z900(P)LAM [NO IM!]', ok: false, step: 3.8 }
        ];

        parts3D.forEach((pt) => {
          const isDetected = cyc6 >= pt.step;
          if (!isDetected) return;
          const pulseP = isSettled ? 0.85 : (0.55 + 0.45 * Math.sin(t * 6));
          ctx.save();
          ctx.strokeStyle = pt.ok ? '#16a34a' : `rgba(220, 38, 38, ${0.75 + 0.25 * pulseP})`;
          ctx.fillStyle = pt.ok ? 'rgba(34, 197, 94, 0.14)' : `rgba(239, 68, 68, ${0.18 + 0.12 * pulseP})`;
          ctx.lineWidth = pt.ok ? 2 : 2.8;
          ctx.fillRect(pt.x, pt.y, pt.w, pt.h);
          ctx.strokeRect(pt.x, pt.y, pt.w, pt.h);

          // Tag label above detected 3D part
          const tagW = pt.ok ? 118 : 162;
          ctx.fillStyle = pt.ok ? 'rgba(21, 128, 61, 0.92)' : 'rgba(185, 28, 28, 0.95)';
          ctx.fillRect(pt.x, pt.y - 19, tagW, 18);
          ctx.fillStyle = '#ffffff';
          ctx.font = '800 10.5px "Prompt", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText((pt.ok ? '✓ ' : '⚠ ') + pt.code, pt.x + 4, pt.y - 6.5);
          ctx.restore();
        });
        ctx.restore();

        // 4. Live Scrolling Ruby Console Overlay (Right Panel inside pic_26)
        const rcX = 1588;
        const rcY = 434;
        const rcW = 266;
        const rcH = 420;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rcX, rcY, rcW, rcH);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(rcX, rcY, rcW, rcH);

        // Ruby Console Header
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(rcX + 1, rcY + 1, rcW - 2, 24);
        ctx.fillStyle = '#dc2626';
        ctx.font = '900 12.5px "Prompt", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(isSettled ? '◆ Ruby Console · Scan Complete' : '◆ Ruby Console · Live Scan', rcX + 8, rcY + 17);

        const rubyLines = [
          { txt: '"lefromdb--------------------"', col: '#64748b' },
          { txt: '"AJFUSH20GN0AAAA"', col: '#0f172a' },
          { txt: '"C:/QHeim/LongLeadtime/Component.skp"', col: '#475569' },
          { txt: '"dir=Left"  "Hi-K30092LAM-IGU"', col: '#15803d', bold: true },
          { txt: '"Status => IM Found ✓"', col: '#16a34a', bold: true },
          { txt: '"lefromdb--------------------"', col: '#64748b' },
          { txt: '"AJFUSH20GN0AAAA"', col: '#0f172a' },
          { txt: '"dir=Left"  "DC1-A00(W)LCSUL"', col: '#15803d', bold: true },
          { txt: '"Status => IM Found ✓"', col: '#16a34a', bold: true },
          { txt: '"lefromdb--------------------"', col: '#64748b' },
          { txt: '"AKBDC100WLLCSU_"', col: '#0f172a' },
          { txt: '"dir=Bot"   "Hi-C1800S2-F2(P)LAM"', col: '#15803d', bold: true },
          { txt: '"Status => IM Found ✓"', col: '#16a34a', bold: true },
          { txt: '"lefromdb--------------------"', col: '#64748b' },
          { txt: '"AJDUSH20AN0AAAA"', col: '#0f172a' },
          { txt: '"dir=Right" "Hi-K900S2LAM-IGU"', col: '#15803d', bold: true },
          { txt: '"Status => IM Found ✓"', col: '#16a34a', bold: true },
          { txt: '"lefromdb--------------------"', col: '#64748b' },
          { txt: '"AJFUSH20GN0AAAA"', col: '#0f172a' },
          { txt: '"dir=Right"', col: '#334155' },
          { txt: '"Hi-Z900(P)LAM(TerraceDoor)(Frost)L"', col: '#b91c1c', bold: true },
          { txt: '">>> ERROR: Don\'t have IM! <<<"', col: '#dc2626', bold: true, alert: true },
          { txt: 'nil', col: '#64748b' }
        ];

        const visibleLineCount = isSettled
          ? rubyLines.length
          : Math.min(rubyLines.length, Math.max(4, Math.floor((cyc6 / 4.6) * rubyLines.length)));
        for (let li = 0; li < visibleLineCount; li++) {
          const ln = rubyLines[li];
          const ly = rcY + 36 + li * 16.2;
          if (ln.alert) {
            ctx.fillStyle = 'rgba(254, 226, 226, 0.9)';
            ctx.fillRect(rcX + 4, ly - 11, rcW - 8, 15);
          }
          ctx.fillStyle = ln.col;
          app.fillFittedText(ctx, ln.txt, rcX + 8, ly, rcW - 14, 11.2, ln.bold ? '800' : '500', '"Consolas", "Prompt", monospace', 'left');
        }

        // Blinking terminal cursor at the bottom of Ruby Console (stops after 10s)
        if (!isSettled && Math.sin(t * 7) > 0) {
          const curY = rcY + 36 + visibleLineCount * 16.2;
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(rcX + 8, curY - 9, 7, 11);
        }
        ctx.restore();

        // 5. Center SketchUp Alert Popup inside 3D Viewport
        if (cyc6 >= 3.6) {
          const popPulse = isSettled ? 0.9 : (0.5 + 0.5 * Math.sin(t * 6.5));
          ctx.save();
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.65 + 0.35 * popPulse})`;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(1303, 578, 240, 68);

          // Dashed zoom callout lines connecting small popup to large bottom popup
          if (typeof ctx.beginPath === 'function') {
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = 'rgba(254, 148, 87, 0.85)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(1303, 646);
            ctx.lineTo(1161.3, 822.7);
            ctx.moveTo(1543, 646);
            ctx.lineTo(1755.6, 822.7);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.restore();
        }
      }
      ctx.restore();
    }

    // Bottom Zoomed SketchUp Alert Dialog (pic_27_image22.png + live animated warning overlay)
    drawPptxImage(ctx, 'assets/ver3/slide06_llt/pic_27_image22.png', 1161.3, 822.7, 594.3, 177.3, '#334155', 2.0, pRight);
    if (pRight > 0) {
      ctx.save();
      ctx.globalAlpha = pRight;
      const warnPulse = isSettled ? 0.85 : (0.5 + 0.5 * Math.sin(t * 5.8));

      // Glowing border around the zoomed alert dialog
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.55 + 0.45 * warnPulse})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(1161.3, 822.7, 594.3, 177.3);

      // Top-right LIVE ALERT badge on the dialog title bar
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(1522, 829, 182, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 12.5px "Prompt", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ AUTO-DETECTED NO IM', 1613, 845.5);

      // Pulsing highlight ring around the yellow warning triangle (hidden once settled)
      if (!isSettled && typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.arc(1203, 912, 26 + warnPulse * 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 158, 11, ${0.7 - warnPulse * 0.4})`;
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      // Highlight & animated cursor on the [ OK ] button (cursor hides after 10s)
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(1642, 950, 88, 30);

      if (!isSettled) {
        const cur6X = 1686 + Math.sin(t * 3.2) * 14;
        const cur6Y = 966 + Math.cos(t * 3.2) * 8;
        if (typeof ctx.beginPath === 'function') {
          ctx.beginPath();
          ctx.moveTo(cur6X, cur6Y);
          ctx.lineTo(cur6X + 14, cur6Y + 6);
          ctx.lineTo(cur6X + 8, cur6Y + 9);
          ctx.lineTo(cur6X + 11, cur6Y + 16);
          ctx.lineTo(cur6X + 8, cur6Y + 17);
          ctx.lineTo(cur6X + 5, cur6Y + 10);
          ctx.lineTo(cur6X, cur6Y + 15);
          ctx.closePath();
          ctx.fillStyle = '#0f172a';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    drawPptxCapsulePill(ctx, 920.4, 369.5, 538.0, 70.6, true, 'Automate Detecting Part', null, pRight);
  }

  // ============================================================================
  // SLIDE 07 (v3-database): Interior Wall / Partition (Matches ppt/slides/slide7.xml
  // and user-uploaded reference media_1794743668035_fc3bda96.jpg)
  // ============================================================================
  function drawSlide6WallPartitionScene(app, s) {
    const ctx = app.ctx;
    const { t } = getCappedMotion(app);
    function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
    function easeOut(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }

    drawBeforeAfterMaster(ctx, app, t, 'Interior', 'Wall / Partition', 45);

    // Subheaders: Manual (Left, dimmed) & Automate (Right, emphasized)
    const pSub = easeOut((t - 0.15) / 0.45);
    ctx.save();
    ctx.globalAlpha = pSub * 0.58;
    ctx.textAlign = 'center';

    // TextBox 12 (692.2, 190.6, 254.5, 106.6)
    ctx.fillStyle = '#fe9457';
    ctx.font = '800 45px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Manual', 819.5, 224);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 26px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('On WEB Program', 819.5, 262);

    // TextBox 13 (1469.0, 190.6, 443.6, 140.6)
    ctx.globalAlpha = pSub;
    ctx.shadowColor = 'rgba(187, 255, 108, 0.35)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#bbff6c';
    ctx.font = '900 47px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Automate', 1690.8, 224);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 26px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('2D CAD (Imported)', 1690.8, 260);
    ctx.fillText('3D SketchUp (+Plug-in Ruby)', 1690.8, 293);
    ctx.textAlign = 'left';
    ctx.restore();

    // Left (Before) Pictures & Pills in exact PPTX z-order
    const pLeft1 = easeOut((t - 0.22) / 0.5);
    drawPptxImage(ctx, 'assets/ver3/slide07_wall/pic_31_image23.png', 66.2, 300.6, 405.7, 304.0, '#fe9457', 3.2, pLeft1);
    drawPptxImage(ctx, 'assets/ver3/slide07_wall/pic_30_image24.png', 357.4, 387.1, 329.8, 247.3, null, 0, pLeft1);
    drawPptxCapsulePill(ctx, 450.7, 450.0, 538.0, 70.6, false, 'Selecting - One by One', 'Interior Wall / Partition', pLeft1);

    const pLeft2 = easeOut((t - 0.34) / 0.5);
    drawPptxImage(ctx, 'assets/ver3/slide07_wall/pic_28_image19.png', 66.2, 707.9, 405.7, 304.0, '#fe9457', 3.2, pLeft2);
    drawPptxImage(ctx, 'assets/ver3/slide07_wall/pic_32_image25.png', 357.4, 806.8, 329.8, 253.9, null, 0, pLeft2);
    drawPptxCapsulePill(ctx, 450.7, 720.2, 538.0, 70.6, false, 'Detail DWG.', 'Interior Wall / Partition', pLeft2);

    // Right (After) Pictures & Pills in exact PPTX z-order
    const pRight = easeOut((t - 0.44) / 0.55);
    drawPptxImage(ctx, 'assets/ver3/slide07_wall/pic_33_image26.png', 1031.8, 347.2, 705.9, 424.7, '#bbff6c', 3.5, pRight);
    drawPptxImage(ctx, 'assets/ver3/slide07_wall/pic_34_image27.png', 1073.8, 689.0, 375.4, 264.2, '#64748b', 1.2, pRight);
    drawPptxImage(ctx, 'assets/ver3/slide07_wall/pic_35_image28.png', 1497.1, 689.0, 380.4, 264.2, '#64748b', 1.2, pRight);
    drawPptxCapsulePill(ctx, 920.4, 590.0, 538.0, 70.6, true, 'Automate Detecting Wall', 'Interior Wall / Partition', pRight);
    drawPptxCapsulePill(ctx, 920.4, 981.5, 538.0, 70.6, true, 'Automate Create Code for Assembly', 'Interior Wall / Partition', pRight);
  }

  // ============================================================================
  // SLIDE 08 (v3-punching): Punching Smart Board Interior Wall (Matches ppt/slides/slide8.xml)
  // ============================================================================
  function drawSlide7PunchingScene(app, s) {
    const ctx = app.ctx;
    const { t } = getCappedMotion(app);
    function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
    function easeOut(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }

    drawBeforeAfterMaster(ctx, app, t, 'Punching', 'Smart Board Interior Wall', 28);

    // Subheaders: Manual (Left, dimmed) & Automate (Right, emphasized)
    const pSub = easeOut((t - 0.15) / 0.45);
    ctx.save();
    ctx.globalAlpha = pSub * 0.58;
    ctx.textAlign = 'center';

    // TextBox 12 (692.2, 190.6, 254.5, 189.0)
    ctx.fillStyle = '#fe9457';
    ctx.font = '800 45px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Manual', 819.5, 222);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 22px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Coding Knowledge', 819.5, 252);
    ctx.fillText('Matching Data', 819.5, 280);
    ctx.fillText('CAD DWG.', 819.5, 308);
    ctx.fillText('Punching Detail', 819.5, 336);

    // TextBox 13 (1469.0, 190.6, 443.6, 140.6)
    ctx.globalAlpha = pSub;
    ctx.shadowColor = 'rgba(187, 255, 108, 0.35)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#bbff6c';
    ctx.font = '900 47px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Automate', 1690.8, 224);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 25px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Auto Select Smart Board', 1690.8, 258);
    ctx.fillText('Punching (for Electric System)', 1690.8, 290);
    ctx.textAlign = 'left';
    ctx.restore();

    // Left (Before) Pictures & Pills in exact PPTX z-order
    const pLeft1 = easeOut((t - 0.22) / 0.5);
    drawPptxImage(ctx, 'assets/ver3/slide08_punch/pic_38_image30.png', 70.3, 330.2, 611.4, 315.5, '#fe9457', 3.2, pLeft1);
    drawPptxCapsulePill(ctx, 450.7, 450.0, 538.0, 70.6, false, 'Manual CAD File', 'Interior Wall / Partition', pLeft1);

    const pLeft2 = easeOut((t - 0.34) / 0.5);
    drawPptxImage(ctx, 'assets/ver3/slide08_punch/pic_27_image29.png', 70.4, 698.1, 252.3, 336.3, '#fe9457', 3.2, pLeft2);
    drawPptxImage(ctx, 'assets/ver3/slide08_punch/pic_36_image31.png', 292.7, 622.4, 470.9, 384.4, null, 0, pLeft2);
    drawPptxCapsulePill(ctx, 547.0, 831.3, 442.2, 70.6, false, 'Matching Code / DWG', 'Smart Board - Size', pLeft2);

    // Right (After) Pictures & Pills in exact PPTX z-order
    const pRight = easeOut((t - 0.44) / 0.55);
    drawPptxImage(ctx, 'assets/ver3/slide08_punch/pic_43_image34.png', 1070.3, 366.8, 431.9, 311.2, '#bbff6c', 3.5, pRight);
    drawPptxImage(ctx, 'assets/ver3/slide08_punch/pic_41_image32.png', 1521.2, 367.4, 347.9, 311.2, '#1e293b', 1.5, pRight);
    drawPptxCapsulePill(ctx, 920.4, 333.5, 405.5, 70.6, true, '2D / 3D Selecting Part', 'Interior Wall / Partition', pRight);

    drawPptxImage(ctx, 'assets/ver3/slide08_punch/pic_42_image33.png', 1070.6, 697.5, 431.7, 316.6, '#1e293b', 1.5, pRight);
    drawPptxCapsulePill(ctx, 929.5, 726.6, 538.0, 70.6, true, 'CAD Punching DWG. To CSV. Data Base', 'to Machine', pRight);
    drawPptxImage(ctx, 'assets/ver3/slide08_punch/pic_40_image35.png', 1469.0, 771.3, 347.9, 149.4, '#1e293b', 1.5, pRight);
    drawPptxImage(ctx, 'assets/ver3/slide08_punch/pic_39_image36.png', 1521.2, 867.8, 347.9, 149.4, '#1e293b', 1.5, pRight);
  }

  // ============================================================================
  // SLIDE 09 (v3-database-mgmt): Data Base Create / Management (Matches ppt/slides/slide9.xml)
  // ============================================================================
  function drawSlide8DatabaseMgmtScene(app, s) {
    const ctx = app.ctx;
    const { t } = getCappedMotion(app);
    function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
    function easeOut(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }

    drawBeforeAfterMaster(ctx, app, t, 'Data Base', 'Create / Management', 28);

    // Subheaders: Manual (Left, dimmed) & Automate (Right, emphasized)
    const pSub = easeOut((t - 0.15) / 0.45);
    ctx.save();
    ctx.globalAlpha = pSub * 0.58;

    // TextBox 44 (460.0, 313.5, 369.8, 121.2) - Left aligned at x=468
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fe9457';
    ctx.font = '800 45px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Manual', 468, 355);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 28px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('CSV. Data Base', 468, 395);

    // TextBox 13 (1469.0, 190.6, 443.6, 106.6)
    ctx.globalAlpha = pSub;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(187, 255, 108, 0.35)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#bbff6c';
    ctx.font = '900 47px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Automate', 1690.8, 228);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 25px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('GENERATE PART', 1690.8, 266);
    ctx.textAlign = 'left';
    ctx.restore();

    // Left (Before) Visuals in exact PPTX z-order
    const pLeft = easeOut((t - 0.25) / 0.5);
    // 1. Large Excel CSV Screenshot (123.2, 559.3, 784.5, 462.2)
    drawPptxImage(ctx, 'assets/ver3/slide09_db/pic_28_image37.png', 123.2, 559.3, 784.5, 462.2, '#fe9457', 3.2, pLeft);

    // 2. Peach Pill: Manual Create Data base | Excel CSV. Upload data
    drawPptxCapsulePill(ctx, 345.2, 450.0, 637.6, 70.6, false, 'Manual Create Data base', 'Excel CSV. Upload data', pLeft);

    // 3. Group 29: 3 Isometric Parallelograms (CSV Stack at 53.2, 338.8, 245.4, 293.8)
    ctx.save();
    ctx.globalAlpha = pLeft * 0.58;
    function drawIsoSheet(ox, oy) {
      if (typeof ctx.beginPath !== 'function') return;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + 185.8, oy + 107.2);
      ctx.lineTo(ox + 185.8, oy + 250.0);
      ctx.lineTo(ox, oy + 142.8);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#0f1714';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    drawIsoSheet(112.8, 338.8);
    drawIsoSheet(83.1, 362.8);
    drawIsoSheet(53.2, 382.5);

    // Black isometric header inside front sheet (68.1, 416.4, 56.6, 84.0)
    if (typeof ctx.beginPath === 'function') {
      ctx.beginPath();
      ctx.moveTo(68.1, 416.4);
      ctx.lineTo(124.7, 449.1);
      ctx.lineTo(124.7, 500.4);
      ctx.lineTo(68.1, 467.7);
      ctx.closePath();
      ctx.fillStyle = '#0f1714';
      ctx.fill();

      // 2 angled lines on front sheet
      ctx.strokeStyle = '#0f1714';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(144.6, 508.3);
      ctx.lineTo(200.8, 539.9);
      ctx.moveTo(144.6, 531.6);
      ctx.lineTo(223.0, 575.7);
      ctx.stroke();

      // Orange elbow arrow (SP id=2) from sheet stack to Manual text
      ctx.strokeStyle = '#fe9457';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(192.9, 409.2);
      ctx.lineTo(253.5, 366.8);
      ctx.lineTo(452.0, 366.8);
      ctx.stroke();

      ctx.fillStyle = '#fe9457';
      ctx.beginPath();
      ctx.moveTo(459.7, 366.8);
      ctx.lineTo(445.0, 359.5);
      ctx.lineTo(445.0, 374.1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 4. Excel Icon on Left Stack (171.4, 438.6, 120.5, 120.5)
    drawPptxImage(ctx, 'assets/ver3/slide09_db/pic_46_image38.png', 171.4, 438.6, 120.5, 120.5, null, 0, pLeft);

    // Right (After) Visuals in exact PPTX z-order
    const pRight = easeOut((t - 0.38) / 0.55);
    // 1. Top-Right 3D SketchUp View (1396.5, 313.5, 499.4, 347.2)
    drawPptxImage(ctx, 'assets/ver3/slide09_db/pic_49_image39.png', 1396.5, 313.5, 499.4, 347.2, '#bbff6c', 3.5, pRight);

    // 2. Center-Right L-Shape Door PT View (1035.2, 516.3, 551.3, 451.4)
    drawPptxImage(ctx, 'assets/ver3/slide09_db/pic_48_image40.png', 1035.2, 516.3, 551.3, 451.4, '#bbff6c', 3.5, pRight);

    // 3. Pointer Line (SP id=50: 1384.1, 669.7 -> 1581.5, 462.3 -> 1704.2, 462.3)
    ctx.save();
    ctx.globalAlpha = pRight;
    if (typeof ctx.beginPath === 'function') {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(1384.1, 669.7);
      ctx.lineTo(1581.5, 462.3);
      ctx.lineTo(1704.2, 462.3);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(1384.1, 669.7, 6.5, 0, Math.PI * 2);
      ctx.arc(1704.2, 462.3, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. Lime Pill: Create from Logic to 3D - Part
    drawPptxCapsulePill(ctx, 920.4, 345.6, 548.6, 70.6, true, 'Create from Logic to 3D - Part', 'Interior Wall / Partition', pRight);

    // 5. Lime Pill: Generate from 3D to CSV. Data Base
    drawPptxCapsulePill(ctx, 929.5, 932.3, 538.0, 70.6, true, 'Generate from 3D to CSV. Data Base', null, pRight);

    // 6. Bottom-Right Rounded Lime Card (SP id=51: 1551.7, 612.8, 338.0, 394.9)
    ctx.save();
    ctx.globalAlpha = pRight;
    const rx = 1551.7, ry = 612.8, rw = 342.0, rh = 394.9, rr = 58;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = 'rgba(223, 255, 185, 0.92)';
    ctx.strokeStyle = '#bbff6c';
    ctx.lineWidth = 2.4;
    if (typeof ctx.beginPath === 'function') {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(rx, ry, rw, rh, rr);
      } else {
        ctx.rect(rx, ry, rw, rh);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
    } else {
      ctx.fillRect(rx, ry, rw, rh);
    }

    // Ruby Hash Code Snippet (TextBox 53)
    const codeLines = [
      '$iwframe = {',
      '  "DOWN-C"=>{\'e\'=>180, \'height\'=>546,\'code\'=>\'DOWN-C\'},',
      '  "HI-Z"=>{\'e\'=>0, \'height\'=>2290,\'code\'=>\'HI-Z\'},',
      '  "TALL-Z"=>{\'e\'=>0, \'height\'=>2138,\'code\'=>\'TALL-Z\'},',
      '  "HI-C"=>{\'e\'=>180, \'height\'=>2110,\'code\'=>\'HI-C\'},',
      '  "HI-WAIST"=>{\'e\'=>722, \'height\'=>1518,\'code\'=>\'HI-W\'},',
      '  "MIDDLE-K"=>{\'e\'=>963, \'height\'=>546,\'code\'=>\'MIDDLE-K\'},',
      '  "HI-K"=>{\'e\'=>963, \'height\'=>1327,\'code\'=>\'HI-K\'},',
      '  "HI-S"=>{\'e\'=>1744, \'height\'=>546,\'code\'=>\'HI-S\'},',
      '  "TOP2-Z"=>{\'e\'=>0, \'height\'=>2500,\'code\'=>\'T2-Z\'},',
      '  "TOP3-Z"=>{\'e\'=>0, \'height\'=>2698,\'code\'=>\'T3-Z\'},',
      '  "TATAKI"=>{\'e\'=>0,\'height\'=>2206,\'code\'=>\'ENT\'},',
      '  "NOTATAKI"=>{\'e\'=>0,\'height\'=>2383,\'code\'=>\'ENT\'} }'
    ];
    ctx.fillStyle = '#1e2923';
    codeLines.forEach((ln, idx) => {
      app.fillFittedText(ctx, ln, rx + 16, ry + 42 + idx * 16.5, rw - 32, 12.2, '600', '"Consolas", "JetBrains Mono", monospace', 'left');
    });

    // Bottom Bold Text: CREATE / NEW Database / to / System
    ctx.fillStyle = '#0f1714';
    ctx.textAlign = 'center';
    ctx.font = '800 26px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('CREATE', rx + rw / 2, ry + 245);
    ctx.fillText('NEW Database', rx + rw / 2, ry + 279);
    ctx.font = '700 24px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('to', rx + rw / 2, ry + 313);
    ctx.font = '800 26px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('System', rx + rw / 2, ry + 347);
    ctx.textAlign = 'left';
    ctx.restore();

    // 7. Bottom Excel Icon (1447.0, 908.7, 120.5, 120.5)
    drawPptxImage(ctx, 'assets/ver3/slide09_db/pic_55_image38.png', 1447.0, 908.7, 120.5, 120.5, null, 0, pRight);
  }

  // ============================================================================
  // SLIDE 10 (v3-automate-process): NEW Automate Process — IW & PT (STD.)
  // (Matches ppt/slides/slide10.xml & assets/ver3/slide_09_automate.jpg)
  // ============================================================================
  function drawSlide9AutomateProcessScene(app, s) {
    const ctx = app.ctx;
    const { isSettled, t } = getCappedMotion(app);
    const elapsed = Math.max(0.8, t);
    function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
    function easeOut(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }
    function rrect(x, y, w, h, r) {
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
        else ctx.rect(x, y, w, h);
        ctx.closePath();
      }
    }

    // 0. Clickable background theme swatches directly on canvas for Slide 10
    const bgPresets = [
      { id: 'default', label: 'Mint', sw: '#528271' },
      { id: 'washi', label: 'Washi', sw: '#f3efe2' },
      { id: 'white', label: 'White', sw: '#ffffff' },
      { id: 'sage', label: 'Sage', sw: '#cce5d8' },
      { id: 'emerald-dark', label: 'Dark', sw: '#132720' },
      { id: 'blueprint', label: 'Navy', sw: '#10243e' }
    ];
    if (app.canvas && !app.canvas._v3Slide10BgAttached) {
      app.canvas._v3Slide10BgAttached = true;
      app.canvas.addEventListener('click', (e) => {
        const cur = app.slides && app.slides[app.activeSlideIndex];
        if (!cur || cur.id !== 'v3-automate-process') return;
        const rect = app.canvas.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return;
        const cx = (e.clientX - rect.left) * (1920 / rect.width);
        const cy = (e.clientY - rect.top) * (1080 / rect.height);
        if (cy >= 32 && cy <= 78) {
          bgPresets.forEach((p, i) => {
            const bx = 92 + i * 32;
            if (cx >= bx - 14 && cx <= bx + 14 && typeof app.setBackgroundTheme === 'function') {
              app.setBackgroundTheme(p.id);
            }
          });
        }
      });
    }

    // 1. Adjustable Background Palette
    const pal = (typeof app.getCustomBackgroundPalette === 'function')
      ? app.getCustomBackgroundPalette('mint')
      : {
          preset: 'default', isDark: false,
          stops: ['#141a18', '#466157', '#72ab99', '#8dd1be'],
          cardFill: 'rgba(255, 255, 255, 0.96)', cardBorder: '#fe9457',
          titleColor: '#ffffff', ink: '#0f172a', muted: '#475569',
          gridColor: 'rgba(255, 255, 255, 0.06)', accent: '#059669', accent2: '#ef4444'
        };

    if (typeof ctx.createLinearGradient === 'function') {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1080);
      const stops = pal.stops || ['#141a18', '#466157', '#72ab99'];
      stops.forEach((col, i) => bgGrad.addColorStop(i / Math.max(1, stops.length - 1), col));
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1920, 1080);
    } else {
      ctx.fillStyle = (pal.stops && pal.stops[0]) || '#466157';
      ctx.fillRect(0, 0, 1920, 1080);
    }

    // Subtle architectural grid texture on outer backdrop
    if (typeof ctx.beginPath === 'function') {
      ctx.save();
      ctx.strokeStyle = pal.gridColor || 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 0; gx < 1920; gx += 48) { ctx.moveTo(gx, 0); ctx.lineTo(gx, 1080); }
      for (let gy = 0; gy < 1080; gy += 48) { ctx.moveTo(0, gy); ctx.lineTo(1920, gy); }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Top Header Banner (adaptive contrast for light/dark themes)
    const pHead = easeOut(elapsed / 0.45);
    ctx.save();
    ctx.globalAlpha = pHead;
    if (typeof ctx.createLinearGradient === 'function') {
      const topBan = ctx.createLinearGradient(0, 12, 1920, 12);
      if (pal.preset === 'washi' || pal.preset === 'white' || pal.preset === 'sage' || (pal.preset === 'custom' && !pal.isDark)) {
        topBan.addColorStop(0.00, 'rgba(255, 255, 255, 0.90)');
        topBan.addColorStop(0.50, 'rgba(241, 248, 245, 0.94)');
        topBan.addColorStop(1.00, 'rgba(255, 255, 255, 0.78)');
      } else {
        topBan.addColorStop(0.00, 'rgba(18, 42, 34, 0.92)');
        topBan.addColorStop(0.65, 'rgba(30, 68, 56, 0.88)');
        topBan.addColorStop(1.00, 'rgba(30, 68, 56, 0.35)');
      }
      ctx.fillStyle = topBan;
    } else {
      ctx.fillStyle = pal.isDark ? '#1a382e' : '#f1f5f9';
    }
    ctx.fillRect(0, 12, 1920, 84);

    // Top-left interactive Background Swatch Pill (clear of center title)
    ctx.fillStyle = (pal.preset === 'default' || pal.isDark) ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.08)';
    rrect(24, 34, 266, 42, 21);
    if (typeof ctx.beginPath === 'function') ctx.fill();
    else ctx.fillRect(24, 34, 266, 42);
    ctx.fillStyle = pal.titleColor;
    ctx.font = '700 16px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('BG:', 38, 61);
    bgPresets.forEach((p, idx) => {
      const bx = 92 + idx * 32;
      const by = 55;
      const actBg = pal.preset === p.id;
      if (typeof ctx.arc === 'function') {
        ctx.beginPath();
        ctx.arc(bx, by, actBg ? 11.5 : 9.5, 0, Math.PI * 2);
        ctx.fillStyle = p.sw;
        ctx.fill();
        ctx.strokeStyle = actBg ? '#10b981' : 'rgba(148, 163, 184, 0.75)';
        ctx.lineWidth = actBg ? 2.5 : 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = p.sw;
        ctx.fillRect(bx - 8, by - 8, 16, 16);
      }
    });

    // Centered Slide Title + Live Status Pill
    ctx.fillStyle = pal.titleColor;
    ctx.textAlign = 'center';
    ctx.font = '800 42px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('NEW Automate Process', 960, 50);
    ctx.font = '700 21px "Prompt", "Segoe UI", sans-serif';
    ctx.globalAlpha = pHead * 0.9;
    ctx.fillText('Automate of Interior wall & Partition (STD.)', 960, 82);

    ctx.globalAlpha = pHead;
    ctx.textAlign = 'left';
    const pulseDot = isSettled ? 1.0 : (0.55 + 0.45 * Math.sin(t * 4.5));
    ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
    rrect(1426, 35, 262, 40, 20);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    if (typeof ctx.arc === 'function') {
      ctx.beginPath();
      ctx.arc(1446, 55, 6, 0, Math.PI * 2);
      ctx.fillStyle = isSettled ? '#10b981' : `rgba(16, 185, 129, ${pulseDot.toFixed(2)})`;
      ctx.fill();
    }
    ctx.fillStyle = (pal.preset === 'default' || pal.isDark) ? '#6ee7b7' : '#065f46';
    app.fillFittedText(ctx, isSettled ? 'AUTOMATED · STEP 01-06 OK' : 'LIVE WORKFLOW • GIF 60FPS', 1460, 61, 218, 16, '700', '"Prompt", "Segoe UI", sans-serif', 'left');
    ctx.restore();

    drawPageBadge(ctx, app);

    // 3. Outer Stage Card (Responsive to background preset & custom color)
    const isCardDark = pal.preset === 'emerald-dark' || pal.preset === 'blueprint' || (pal.preset === 'custom' && pal.isDark);
    const stageInk = isCardDark ? '#f1f5f9' : '#0f172a';
    const stageSubInk = isCardDark ? '#cbd5e1' : '#334155';
    const pCard = easeOut((elapsed - 0.05) / 0.4);
    ctx.save();
    ctx.globalAlpha = pCard;
    if (typeof ctx.createLinearGradient === 'function') {
      const cardGrad = ctx.createLinearGradient(16, 102, 1904, 1062);
      if (pal.preset === 'washi') {
        cardGrad.addColorStop(0, '#faf7ee');
        cardGrad.addColorStop(1, '#f3efe2');
      } else if (pal.preset === 'sage') {
        cardGrad.addColorStop(0, '#e2f3ea');
        cardGrad.addColorStop(1, '#eef8f3');
      } else if (pal.preset === 'emerald-dark') {
        cardGrad.addColorStop(0, '#10241d');
        cardGrad.addColorStop(1, '#17342a');
      } else if (pal.preset === 'blueprint') {
        cardGrad.addColorStop(0, '#0f2238');
        cardGrad.addColorStop(1, '#163150');
      } else if (pal.preset === 'custom') {
        cardGrad.addColorStop(0, pal.stops[0] || '#f8fafc');
        cardGrad.addColorStop(1, pal.stops[pal.stops.length - 1] || '#eef2f6');
      } else if (pal.preset === 'white') {
        cardGrad.addColorStop(0, '#ffffff');
        cardGrad.addColorStop(1, '#f8fafc');
      } else {
        cardGrad.addColorStop(0.00, '#e6f5ef');
        cardGrad.addColorStop(0.14, '#ffffff');
        cardGrad.addColorStop(1.00, '#ffffff');
      }
      ctx.fillStyle = cardGrad;
    } else {
      ctx.fillStyle = isCardDark ? '#142a22' : '#ffffff';
    }
    ctx.strokeStyle = pal.preset === 'default' ? '#fe9457' : (pal.cardBorder || '#10b981');
    ctx.lineWidth = 2;
    rrect(16, 102, 1888, 962, 34);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(16, 102, 1888, 962);
    }
    ctx.restore();

    // Animation Cycle Timers (runs across 0..10s, then settles calmly)
    const activeIWStep = isSettled ? 5 : Math.min(5, Math.floor(t / 1.65));
    const iwStepProgress = isSettled ? 1.0 : ((t / 1.65) % 1);
    const activeIWTool = isSettled ? 7 : Math.floor((t * 2.2) % 9);
    const activePTTool = isSettled ? -1 : Math.floor((t * 2.0 + 3) % 11);
    const activePRule = isSettled ? 3 : Math.floor((t / 2.45) % 4);
    const pIW = easeOut((elapsed - 0.1) / 0.4);
    const pMid = easeOut((elapsed - 0.2) / 0.4);
    const pPT = easeOut((elapsed - 0.25) / 0.45);

    // =========================================================================
    // 4. TOP SECTION: IW (Interior Wall) (x=36..1884, y=118..498)
    // =========================================================================
    ctx.save();
    ctx.globalAlpha = pIW;
    ctx.fillStyle = isCardDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(248, 250, 252, 0.62)';
    rrect(36, 118, 1848, 380, 20);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.strokeStyle = isCardDark ? 'rgba(148, 163, 184, 0.35)' : '#94a3b8';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    } else {
      ctx.strokeRect(36, 118, 1848, 380);
    }

    // Left Section Title Pill: IW (Interior Wall)
    ctx.fillStyle = stageInk;
    ctx.font = '800 44px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('IW', 56, 260);
    ctx.fillStyle = stageSubInk;
    ctx.font = '700 19px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('(Interior Wall)', 56, 290);
    const iwStepColors = ['#059669', '#0284c7', '#ea580c', '#10b981', '#16a34a', '#0d9488'];
    const curStepColor = iwStepColors[activeIWStep];
    ctx.fillStyle = curStepColor;
    rrect(48, 312, 168, 34, 17);
    if (typeof ctx.beginPath === 'function') ctx.fill();
    else ctx.fillRect(48, 312, 168, 34);
    ctx.fillStyle = '#ffffff';
    app.fillFittedText(ctx, isSettled ? 'STEP 06 / 06 OK' : `STEP 0${activeIWStep + 1} / 06 LIVE`, 132, 335, 152, 16, '800', '"Prompt", "Segoe UI", sans-serif', 'center');

    // 6 Top Step Diagrams (01..06) — Exact aspect-ratio preserved cards with living spotlight!
    const iwCards = [
      { num: '01', label: 'CODING', img: 'assets/ver3/slide10_auto/pic_7_image41.png', col: '#059669' },
      { num: '02', label: 'GRID LINE', img: 'assets/ver3/slide10_auto/pic_8_image41.png', col: '#0284c7' },
      { num: '03', label: 'TSUMA / KETA', img: 'assets/ver3/slide10_auto/pic_9_image41.png', col: '#ea580c' },
      { num: '04', label: 'BASE FRAME', img: 'assets/ver3/slide10_auto/pic_11_image41.png', col: '#10b981' },
      { num: '05', label: 'SMART BOARD', img: 'assets/ver3/slide10_auto/pic_12_image41.png', col: '#16a34a' },
      { num: '06', label: 'WINDOW', img: 'assets/ver3/slide10_auto/pic_13_image41.png', col: '#0d9488' }
    ];
    const iwStartX = 232;
    const iwCardW = 258;
    const iwCardGap = 14;
    const iwCardY = 128;
    const iwCardH = 196;

    // Animated connecting progress rail behind cards
    if (typeof ctx.beginPath === 'function') {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(iwStartX + iwCardW / 2, iwCardY + iwCardH / 2);
      ctx.lineTo(iwStartX + 5 * (iwCardW + iwCardGap) + iwCardW / 2, iwCardY + iwCardH / 2);
      ctx.stroke();

      const beamX = iwStartX + iwCardW / 2 + (activeIWStep + clamp(iwStepProgress, 0, 1)) * (iwCardW + iwCardGap);
      ctx.strokeStyle = curStepColor;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(iwStartX + iwCardW / 2, iwCardY + iwCardH / 2);
      ctx.lineTo(Math.min(iwStartX + 5 * (iwCardW + iwCardGap) + iwCardW / 2, beamX), iwCardY + iwCardH / 2);
      ctx.stroke();
    }

    iwCards.forEach((cd, idx) => {
      const isActive = idx === activeIWStep;
      const pop = (isActive && !isSettled) ? (2.5 * Math.sin(iwStepProgress * Math.PI)) : 0;
      const cx = iwStartX + idx * (iwCardW + iwCardGap) - pop * 0.5;
      const cy = iwCardY - pop;
      const cw = iwCardW + pop;
      const ch = iwCardH + pop;

      ctx.save();
      ctx.shadowColor = isActive ? cd.col : 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = isActive ? 18 : 8;
      ctx.shadowOffsetY = 3;
      drawAspectImage(ctx, cd.img, cx, cy, cw, ch, {
        alpha: pIW,
        radius: 14,
        pad: 8,
        bgColor: '#ffffff',
        borderColor: isActive ? cd.col : '#cbd5e1',
        borderWidth: isActive ? 3.2 : 1.2
      });
      ctx.restore();

      ctx.fillStyle = isActive ? cd.col : '#1e293b';
      rrect(cx + 8, cy + 8, 128, 25, 6);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      else ctx.fillRect(cx + 8, cy + 8, 128, 25);
      ctx.fillStyle = '#ffffff';
      app.fillFittedText(ctx, `${cd.num} ${cd.label}`, cx + 72, cy + 25, 118, 13.5, '800', '"Prompt", "Segoe UI", sans-serif', 'center');

      if (isActive && !isSettled && typeof ctx.arc === 'function') {
        ctx.beginPath();
        ctx.arc(cx + cw - 16, cy + 19, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      }
      ctx.textAlign = 'left';
    });

    // IW Toolbar Group (#1..#9) — ZERO STRETCH! Crisp 1:1 Square Icons from ICON/Interior/
    const iwIcons = [
      { n: '#1', src: 'ICON/Interior/3d-wall.png' },
      { n: '#2', src: 'ICON/Interior/sw-frame.png' },
      { n: '#3', src: 'ICON/Interior/sp-frame.png' },
      { n: '#4', src: 'ICON/Interior/CODE.png' },
      { n: '#5', src: 'ICON/Interior/sw-board.png' },
      { n: '#6', src: 'ICON/Interior/SB-IW.png' },
      { n: '#7', src: 'ICON/Interior/SB-Joint.png' },
      { n: '#8', src: 'ICON/Interior/One Command.png', hero: true },
      { n: '#9', src: 'ICON/Interior/uploaddb.png' }
    ];
    const iwBarX = 232, iwBarY = 338, iwBarW = 876, iwBarH = 148;
    ctx.fillStyle = '#e5e7eb';
    rrect(iwBarX, iwBarY, iwBarW, iwBarH, 18);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    } else {
      ctx.fillRect(iwBarX, iwBarY, iwBarW, iwBarH);
    }

    const iwTileSize = 82;
    const iwTileGap = 11.5;
    const iwFirstX = iwBarX + (iwBarW - (9 * iwTileSize + 8 * iwTileGap)) / 2;
    iwIcons.forEach((ic, idx) => {
      const ix = iwFirstX + idx * (iwTileSize + iwTileGap);
      const iy = iwBarY + 14;
      const isLit = (idx === activeIWTool) || (ic.hero && (activeIWTool === 7 || activeIWStep === 5));
      const pop = isLit ? 3 : 0;

      ctx.save();
      if (isLit) {
        ctx.shadowColor = ic.hero ? '#ef4444' : '#10b981';
        ctx.shadowBlur = 14;
      }
      drawAspectImage(ctx, ic.src, ix, iy - pop, iwTileSize, iwTileSize, {
        alpha: pIW,
        radius: 12,
        pad: 5,
        bgColor: '#e2e2e2',
        borderColor: isLit ? (ic.hero ? '#ef4444' : '#059669') : '#ffffff',
        borderWidth: isLit ? 3 : 1.5
      });
      ctx.restore();

      if (isLit) {
        ctx.fillStyle = ic.hero ? '#dc2626' : '#059669';
        rrect(ix + 16, iwBarY + 106, iwTileSize - 32, 28, 8);
        if (typeof ctx.beginPath === 'function') ctx.fill();
      }
      ctx.fillStyle = isLit ? '#ffffff' : '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = '800 22px "Prompt", "Segoe UI", sans-serif';
      ctx.fillText(ic.n, ix + iwTileSize / 2, iwBarY + 128);
      ctx.textAlign = 'left';
    });

    // 3D Isometric Wall Preview Card (aspect-ratio preserved + live scan sweep + GIF loop badge)
    const isoX = 1130, isoY = 338, isoW = 330, isoH = 148;
    drawAspectImage(ctx, 'assets/ver3/slide10_auto/pic_26_image44.png', isoX, isoY, isoW, isoH, {
      alpha: pIW,
      radius: 14,
      pad: 6,
      bgColor: '#ffffff',
      borderColor: '#059669',
      borderWidth: 2
    });
    if (!isSettled && typeof ctx.clip === 'function' && typeof ctx.beginPath === 'function') {
      ctx.save();
      rrect(isoX + 2, isoY + 2, isoW - 4, isoH - 4, 12);
      ctx.clip();
      const scanPos = ((t * 0.42) % 1) * (isoW + 60) - 30;
      if (typeof ctx.createLinearGradient === 'function') {
        const scGrad = ctx.createLinearGradient(isoX + scanPos - 26, isoY, isoX + scanPos + 26, isoY);
        scGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
        scGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.24)');
        scGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = scGrad;
        ctx.fillRect(isoX + scanPos - 26, isoY, 52, isoH);
      }
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    rrect(isoX + 8, isoY + 8, 146, 26, 6);
    if (typeof ctx.beginPath === 'function') ctx.fill();
    ctx.fillStyle = '#34d399';
    app.fillFittedText(ctx, isSettled ? '✓ 3D AUTO BUILD' : '▶ 3D GIF BUILD', isoX + 81, isoY + 25.5, 134, 13.5, '800', '"JetBrains Mono", "Prompt", sans-serif', 'center');
    ctx.textAlign = 'left';

    // Right 100% Animated Gauges (IW — stop stably at 100% after 10s)
    const iwBarXs = [1508, 1632, 1756];
    const iwFillProg = clamp((elapsed - 0.25) / 0.85, 0.2, 1);
    iwBarXs.forEach((bx, bi) => {
      const trackX = bx, trackY = 342, trackW = 36, trackH = 88;
      ctx.fillStyle = '#e2e8f0';
      rrect(trackX, trackY, trackW, trackH, 8);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      const wave = isSettled ? 1 : (1 - 0.04 * Math.abs(Math.sin(t * 2.2 + bi * 1.1)));
      const fh = trackH * iwFillProg * wave;
      ctx.fillStyle = bi === 0 ? '#38bdf8' : (bi === 1 ? '#0ea5e9' : '#10b981');
      rrect(trackX, trackY + trackH - fh, trackW, fh, 6);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      rrect(trackX, trackY, trackW, trackH, 8);
      if (typeof ctx.beginPath === 'function') ctx.stroke();
      ctx.fillStyle = stageInk;
      ctx.textAlign = 'center';
      ctx.font = '800 20px "Prompt", "Segoe UI", sans-serif';
      ctx.fillText('100%', trackX + trackW / 2, 456);
    });
    ctx.fillStyle = stageInk;
    ctx.textAlign = 'center';
    ctx.font = '800 20px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Implement (from AUG, 2024)', 1650, 486);
    ctx.textAlign = 'left';
    ctx.restore();

    // =========================================================================
    // 5. MIDDLE PIPELINE: Import CAD >>> SketchUp ──▶ BOM  MRP  DWG
    // =========================================================================
    ctx.save();
    ctx.globalAlpha = pMid;
    ctx.fillStyle = stageInk;
    ctx.font = '800 22px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Import CAD >>> SketchUp', 48, 529);

    const pipeStart = 350, pipeEnd = 1435, pipeY = 521;
    if (typeof ctx.beginPath === 'function') {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(pipeStart, pipeY);
      ctx.lineTo(pipeEnd - 18, pipeY);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(pipeEnd + 6, pipeY);
      ctx.lineTo(pipeEnd - 18, pipeY - 12);
      ctx.lineTo(pipeEnd - 18, pipeY + 12);
      ctx.closePath();
      ctx.fill();

      if (!isSettled) {
        for (let pk = 0; pk < 6; pk++) {
          const phase = ((t * 0.48 + pk / 6) % 1);
          const px = pipeStart + phase * (pipeEnd - 24 - pipeStart);
          if (typeof ctx.arc === 'function') {
            ctx.beginPath();
            ctx.arc(px, pipeY, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = '#fef08a';
            ctx.fill();
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 1.6;
            ctx.stroke();
          }
        }
      }
    }

    const outLabels = ['BOM', 'MRP', 'DWG'];
    const outXs = [1526, 1650, 1774];
    outLabels.forEach((lbl, li) => {
      const pulse = isSettled ? 0.7 : (0.5 + 0.5 * Math.sin(t * 3.8 - li * 0.9));
      ctx.fillStyle = `rgba(16, 185, 129, ${(0.12 + 0.14 * pulse).toFixed(2)})`;
      rrect(outXs[li] - 46, 503, 92, 34, 10);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      ctx.fillStyle = stageInk;
      ctx.textAlign = 'center';
      ctx.font = '800 24px "Prompt", "Segoe UI", sans-serif';
      ctx.fillText(lbl, outXs[li], 529);
    });
    ctx.textAlign = 'left';
    ctx.restore();

    // =========================================================================
    // 6. BOTTOM SECTION: PT (Partition) (x=36..1884, y=544..1048)
    // =========================================================================
    ctx.save();
    ctx.globalAlpha = pPT;
    ctx.fillStyle = isCardDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(248, 250, 252, 0.62)';
    rrect(36, 544, 1848, 504, 20);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.strokeStyle = isCardDark ? 'rgba(148, 163, 184, 0.45)' : '#334155';
      ctx.lineWidth = 1.5;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([7, 4]);
      ctx.stroke();
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
    } else {
      ctx.strokeRect(36, 544, 1848, 504);
    }

    // Left Label: PT (Partition)
    ctx.fillStyle = stageInk;
    ctx.font = '800 44px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('PT', 56, 616);
    ctx.fillStyle = stageSubInk;
    ctx.font = '700 19px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('(Partition)', 56, 646);

    // PT Toolbar Rounded Box (#1..#11 — ZERO STRETCH! Crisp 1:1 Square Icons!)
    const ptBarX = 232, ptBarY = 556, ptBarW = 1228, ptBarH = 142;
    ctx.fillStyle = '#e5e7eb';
    rrect(ptBarX, ptBarY, ptBarW, ptBarH, 18);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.6;
      ctx.stroke();
    } else {
      ctx.fillRect(ptBarX, ptBarY, ptBarW, ptBarH);
    }

    const ptIcons = [
      { n: '#1', src: 'ICON/Interior/level.png' },
      { n: '#2', src: 'ICON/Interior/door-spec.png' },
      { n: '#3', src: 'ICON/Interior/spframe.png' },
      { n: '#4', src: 'ICON/Interior/door-speddc.png' },
      { n: '#5', src: 'assets/ver3/slide10_auto/icon_pt_05_codept.png' },
      { n: '#6', src: 'ICON/Interior/Change partition code.png' },
      { n: '#7', src: 'ICON/Interior/buildpartition.png' },
      { n: '#8', src: 'ICON/Interior/SB-joint pt.png' },
      { n: '#9', src: 'assets/ver3/slide10_auto/icon_pt_09_voidstair.png' },
      { n: '#10', src: 'ICON/Interior/PSpanel.png' },
      { n: '#11', src: 'ICON/Interior/Regen Tag.png' }
    ];
    const ptTileSize = 80;
    const ptTileGap = 26;
    const ptFirstX = ptBarX + (ptBarW - (11 * ptTileSize + 10 * ptTileGap)) / 2;
    ptIcons.forEach((ic, idx) => {
      const ix = ptFirstX + idx * (ptTileSize + ptTileGap);
      const iy = ptBarY + 13;
      const isLit = idx === activePTTool;
      const pop = isLit ? 3 : 0;

      ctx.save();
      if (isLit) {
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 14;
      }
      drawAspectImage(ctx, ic.src, ix, iy - pop, ptTileSize, ptTileSize, {
        alpha: pPT,
        radius: 12,
        pad: 4,
        bgColor: '#e2e2e2',
        borderColor: isLit ? '#0284c7' : '#ffffff',
        borderWidth: isLit ? 3 : 1.5
      });
      ctx.restore();

      if (isLit) {
        ctx.fillStyle = '#0284c7';
        rrect(ix + 14, ptBarY + 102, ptTileSize - 28, 28, 8);
        if (typeof ctx.beginPath === 'function') ctx.fill();
      }
      ctx.fillStyle = isLit ? '#ffffff' : '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = '800 22px "Prompt", "Segoe UI", sans-serif';
      ctx.fillText(ic.n, ix + ptTileSize / 2, ptBarY + 124);
      ctx.textAlign = 'left';
    });

    // Right 100% Animated Gauges (PT)
    const ptBarXs = [1508, 1632, 1756];
    const ptFillProg = clamp((elapsed - 0.35) / 0.85, 0.2, 1);
    ptBarXs.forEach((bx, bi) => {
      const trackX = bx, trackY = 582, trackW = 36, trackH = 82;
      ctx.fillStyle = '#e2e8f0';
      rrect(trackX, trackY, trackW, trackH, 8);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      const wave = isSettled ? 1 : (1 - 0.04 * Math.abs(Math.cos(t * 2.1 + bi)));
      const fh = trackH * ptFillProg * wave;
      ctx.fillStyle = '#38bdf8';
      rrect(trackX, trackY + trackH - fh, trackW, fh, 6);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      rrect(trackX, trackY, trackW, trackH, 8);
      if (typeof ctx.beginPath === 'function') ctx.stroke();
      ctx.fillStyle = stageInk;
      ctx.textAlign = 'center';
      ctx.font = '800 20px "Prompt", "Segoe UI", sans-serif';
      ctx.fillText('100%', trackX + trackW / 2, 570);
    });
    ctx.fillStyle = stageInk;
    ctx.textAlign = 'center';
    ctx.font = '800 19.5px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Standard P-Rule (Run Test > OK)', 1650, 694);
    ctx.textAlign = 'left';

    // Bottom-Left Green Dashed Box (Standard P-Rule) — Aspect Ratio Preserved + Live Cycle!
    const pBoxX = 56, pBoxY = 712, pBoxW = 1264, pBoxH = 290;
    ctx.fillStyle = isCardDark ? 'rgba(255, 255, 255, 0.94)' : '#ffffff';
    rrect(pBoxX, pBoxY, pBoxW, pBoxH, 18);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([6, 4]);
      ctx.stroke();
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 21px "Prompt", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Standard P-Rule (Run Test > OK)', pBoxX + pBoxW / 2, pBoxY + 30);

    const okPulse = isSettled ? 1.0 : (0.72 + 0.28 * Math.sin(t * 4));
    ctx.fillStyle = `rgba(16, 185, 129, ${okPulse.toFixed(2)})`;
    rrect(pBoxX + pBoxW - 178, pBoxY + 9, 160, 28, 14);
    if (typeof ctx.beginPath === 'function') ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 14.5px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('RUN TEST > OK ✓', pBoxX + pBoxW - 98, pBoxY + 28);
    ctx.textAlign = 'left';

    const pRuleCards = [
      { img: 'assets/ver3/slide10_auto/pic_34_image45.png', cap: 'Coding & Gridline', w: 344, x: pBoxX + 18 },
      { img: 'assets/ver3/slide10_auto/pic_47_image48.png', cap: 'Run Object Component', w: 286, x: pBoxX + 378 },
      { img: 'assets/ver3/slide10_auto/pic_46_image47.png', cap: 'Single / Double Partition', w: 274, x: pBoxX + 680 },
      { img: 'assets/ver3/slide10_auto/pic_51_image49.png', cap: 'SketchUp 3D Model', w: 274, x: pBoxX + 970 }
    ];
    pRuleCards.forEach((rc, rIdx) => {
      const isPRLit = rIdx === activePRule;
      drawAspectImage(ctx, rc.img, rc.x, pBoxY + 46, rc.w, 206, {
        alpha: pPT,
        radius: 10,
        pad: 4,
        bgColor: '#ffffff',
        borderColor: isPRLit ? '#10b981' : '#cbd5e1',
        borderWidth: isPRLit ? 2.8 : 1.2
      });
      ctx.fillStyle = isPRLit ? (isCardDark ? '#34d399' : '#047857') : stageInk;
      ctx.textAlign = 'center';
      ctx.font = '800 19.5px "Prompt", "Segoe UI", sans-serif';
      ctx.fillText(rc.cap, rc.x + rc.w / 2, pBoxY + pBoxH + 26);
      ctx.textAlign = 'left';
    });

    // Bottom-Right Red Dashed Box (Out P rule – Detail DWG) — Aspect Ratio Preserved
    const outBoxX = 1344, outBoxY = 712, outBoxW = 520, outBoxH = 290;
    ctx.fillStyle = isCardDark ? 'rgba(255, 255, 255, 0.94)' : '#ffffff';
    rrect(outBoxX, outBoxY, outBoxW, outBoxH, 18);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([6, 4]);
      ctx.stroke();
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
    }

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = '800 22px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('Out P rule – Detail DWG', outBoxX + outBoxW / 2, outBoxY + 32);
    ctx.textAlign = 'left';

    drawAspectImage(ctx, 'assets/ver3/slide10_auto/pic_44_image46.png', outBoxX + 18, outBoxY + 46, outBoxW - 36, 108, {
      alpha: pPT, radius: 8, pad: 4, bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1
    });
    drawAspectImage(ctx, 'assets/ver3/slide10_auto/pic_45_image46.png', outBoxX + 18, outBoxY + 164, outBoxW - 36, 114, {
      alpha: pPT, radius: 8, pad: 4, bgColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1
    });

    ctx.restore();
  }

  // ============================================================================
  // SLIDE 11 (v3-holeplug-automate): NEW Automate Process — Hole Plug & Switch_Hood
  // (Matches ppt/slides/slide11.xml & assets/ver3/slide_10_holeplug.jpg)
  // ============================================================================
  function drawSlide10HolePlugAutomateScene(app, s) {
    const ctx = app.ctx;
    const { isSettled, t } = getCappedMotion(app);
    function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, v)); }
    function easeOut(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }
    function rrect(x, y, w, h, r) {
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        const rad = Math.min(r, Math.min(w, h) / 2);
        if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, rad);
        else ctx.rect(x, y, w, h);
        ctx.closePath();
      }
    }
    const fit = (txt, x, y, maxW, size, weight, family, align = 'left') => {
      if (typeof app.fillFittedText === 'function') {
        app.fillFittedText(ctx, txt, x, y, maxW, size, weight, family, align);
      } else {
        ctx.textAlign = align;
        ctx.font = `${weight} ${size}px ${family}`;
        ctx.fillText(txt, x, y);
        ctx.textAlign = 'left';
      }
    };

    const slideId = (s && s.id) || 'v3-holeplug-automate';
    if (app._v3HpLastSlideId !== slideId) {
      app._v3HpLastSlideId = slideId;
      app._v3HpManualFocus = null;
    }
    if (app.isPlaying) app._v3HpManualFocus = null;

    app._v3HpHits = [];
    if (app.canvas && !app.canvas._v3Slide11ClickAttached) {
      app.canvas._v3Slide11ClickAttached = true;
      app.canvas.addEventListener('click', (e) => {
        const cur = app.slides && app.slides[app.activeSlideIndex];
        if (!cur || (cur.id !== 'v3-holeplug-automate' && cur.layout !== 'holeplug-automate-full') || !Array.isArray(app._v3HpHits)) return;
        const rect = app.canvas.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return;
        const cx = (e.clientX - rect.left) * (1920 / rect.width);
        const cy = (e.clientY - rect.top) * (1080 / rect.height);
        for (const hit of app._v3HpHits) {
          if (cx >= hit.x && cx <= hit.x + hit.w && cy >= hit.y && cy <= hit.y + hit.h) {
            app._v3HpManualFocus = (app._v3HpManualFocus === hit.idx) ? null : hit.idx;
            if (app.isPlaying && typeof app.seekTo === 'function' && hit.seekT !== undefined) {
              const slideStart = typeof app.getSlideStartTime === 'function' ? app.getSlideStartTime(app.activeSlideIndex) : 0;
              app.seekTo(slideStart + hit.seekT);
            } else if (typeof app.render === 'function') {
              app.render();
            }
            return;
          }
        }
      });
    }

    // 1. Theme-Aware Studio Canvas & Architectural Grid (Matches V4 Slide 10 Aesthetic)
    const pal = (typeof app.getCustomBackgroundPalette === 'function')
      ? app.getCustomBackgroundPalette('mint')
      : {
          preset: 'default', isDark: false,
          stops: ['#141a18', '#466157', '#72ab99', '#8dd1be'],
          cardFill: 'rgba(255, 255, 255, 0.96)', cardBorder: '#fe9457',
          titleColor: '#ffffff', ink: '#0f172a', muted: '#475569',
          gridColor: 'rgba(255, 255, 255, 0.06)'
        };
    const isCardDark = pal.preset === 'emerald-dark' || pal.preset === 'blueprint' || (pal.preset === 'custom' && pal.isDark);

    if (typeof ctx.createLinearGradient === 'function') {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1080);
      const stops = pal.stops || ['#141a18', '#466157', '#72ab99'];
      stops.forEach((col, i) => bgGrad.addColorStop(i / Math.max(1, stops.length - 1), col));
      ctx.fillStyle = bgGrad;
    } else {
      ctx.fillStyle = (pal.stops && pal.stops[0]) || '#466157';
    }
    ctx.fillRect(0, 0, 1920, 1080);

    if (typeof ctx.beginPath === 'function') {
      ctx.save();
      ctx.strokeStyle = pal.gridColor || 'rgba(255, 255, 255, 0.055)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 0; gx < 1920; gx += 48) { ctx.moveTo(gx, 0); ctx.lineTo(gx, 1080); }
      for (let gy = 0; gy < 1080; gy += 48) { ctx.moveTo(0, gy); ctx.lineTo(1920, gy); }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Clean Top Header Bar (y = 8..94)
    const pHead = easeOut(t / 0.45);
    ctx.save();
    ctx.globalAlpha = pHead;
    if (typeof ctx.createLinearGradient === 'function') {
      const topBan = ctx.createLinearGradient(0, 10, 1920, 10);
      if (pal.preset === 'washi' || pal.preset === 'white' || pal.preset === 'sage' || (pal.preset === 'custom' && !pal.isDark)) {
        topBan.addColorStop(0.00, 'rgba(255, 255, 255, 0.92)');
        topBan.addColorStop(0.55, 'rgba(241, 248, 245, 0.94)');
        topBan.addColorStop(1.00, 'rgba(255, 255, 255, 0.80)');
      } else {
        topBan.addColorStop(0.00, 'rgba(15, 38, 30, 0.94)');
        topBan.addColorStop(0.65, 'rgba(28, 63, 52, 0.90)');
        topBan.addColorStop(1.00, 'rgba(28, 63, 52, 0.38)');
      }
      ctx.fillStyle = topBan;
    } else {
      ctx.fillStyle = isCardDark ? '#1a382e' : '#0f261e';
    }
    ctx.fillRect(0, 10, 1920, 84);

    // Left Topic Tag Pill
    const isLightHeader = (pal.preset === 'washi' || pal.preset === 'white' || pal.preset === 'sage' || (pal.preset === 'custom' && !pal.isDark));
    ctx.fillStyle = isLightHeader ? 'rgba(15, 118, 110, 0.12)' : 'rgba(133, 220, 201, 0.14)';
    rrect(28, 32, 272, 38, 19);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.strokeStyle = isLightHeader ? 'rgba(15, 118, 110, 0.45)' : 'rgba(133, 220, 201, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.fillStyle = isLightHeader ? '#0F5E4E' : '#85DCC9';
    fit('PLUG & SWITCH · AUTO 7 STEPS', 164, 57, 252, 15.5, '800', '"Prompt", sans-serif', 'center');

    // Centered Main Title & Subtitle
    ctx.fillStyle = pal.titleColor || '#FFFFFF';
    fit('NEW Automate Process', 960, 46, 760, 40, '800', '"Prompt", "Segoe UI", sans-serif', 'center');
    ctx.fillStyle = isLightHeader ? '#0F5E4E' : '#85DCC9';
    fit('Automate of Hole Plug & Switch_Hood [Interior Wall / Partition]', 960, 77, 940, 20, '600', '"Prompt", "Segoe UI", sans-serif', 'center');

    // Right Status Pill (left of Page Badge, settles to calm steady emerald after 10s)
    const pulseDot = isSettled ? 1 : (0.5 + 0.5 * Math.sin(t * 4.5));
    ctx.fillStyle = isLightHeader ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.18)';
    rrect(1446, 33, 232, 36, 18);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    if (typeof ctx.arc === 'function') {
      ctx.beginPath();
      ctx.arc(1468, 51, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = isSettled ? '#10b981' : `rgba(16, 185, 129, ${pulseDot.toFixed(2)})`;
      ctx.fill();
    }
    ctx.fillStyle = isLightHeader ? '#065F46' : '#6EE7B7';
    fit(isSettled ? '7-STEP AUTOMATION ✓' : 'LIVE 7-STEP AUTOMATION', 1572, 57, 196, 15, '800', '"Prompt", sans-serif', 'center');
    ctx.restore();

    drawPageBadge(ctx, app);

    // 3. Outer Studio Stage Container (x=24..1896, y=104..1060)
    const pStage = easeOut((t - 0.05) / 0.4);
    ctx.save();
    ctx.globalAlpha = pStage;
    ctx.save();
    ctx.shadowColor = isCardDark ? 'rgba(0, 0, 0, 0.36)' : 'rgba(15, 23, 42, 0.14)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    if (typeof ctx.createLinearGradient === 'function') {
      const cardGrad = ctx.createLinearGradient(24, 104, 1896, 1060);
      if (pal.preset === 'washi') {
        cardGrad.addColorStop(0, '#faf7ee'); cardGrad.addColorStop(1, '#f3efe2');
      } else if (pal.preset === 'sage') {
        cardGrad.addColorStop(0, '#e2f3ea'); cardGrad.addColorStop(1, '#eef8f3');
      } else if (pal.preset === 'emerald-dark') {
        cardGrad.addColorStop(0, '#0f231c'); cardGrad.addColorStop(1, '#163128');
      } else if (pal.preset === 'blueprint') {
        cardGrad.addColorStop(0, '#0f2238'); cardGrad.addColorStop(1, '#163150');
      } else if (pal.preset === 'custom') {
        cardGrad.addColorStop(0, pal.stops[0] || '#f8fafc');
        cardGrad.addColorStop(1, pal.stops[pal.stops.length - 1] || '#eef2f6');
      } else if (pal.preset === 'white') {
        cardGrad.addColorStop(0, '#ffffff'); cardGrad.addColorStop(1, '#f8fafc');
      } else {
        cardGrad.addColorStop(0.0, '#eaf6f1');
        cardGrad.addColorStop(0.2, '#ffffff');
        cardGrad.addColorStop(1.0, '#f5faf8');
      }
      ctx.fillStyle = cardGrad;
    } else {
      ctx.fillStyle = isCardDark ? '#132820' : '#ffffff';
    }
    rrect(24, 104, 1872, 956, 28);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.strokeStyle = pal.preset === 'default' ? '#FE9457' : (pal.cardBorder || '#10B981');
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillRect(24, 104, 1872, 956);
    }
    ctx.restore();
    ctx.restore();

    // Active spotlight walks #1..#7 across the first 10s, then rests cleanly (manual clicks still work)
    const activeStep = (typeof app._v3HpManualFocus === 'number')
      ? app._v3HpManualFocus
      : (isSettled ? -1 : Math.min(6, Math.floor(Math.max(0, t - 0.6) / 1.3)));

    // Shared 4-Column Swiss Grid Metrics (x=48..1870 -> total 1822px)
    const colGap = 18;
    const colW = 442;
    const colX = (i) => 48 + i * (colW + colGap); // [48, 508, 968, 1428]

    // Helper: Mint-Green Step Pill Badge with Coral Outline
    function drawStepPill(bx, by, bw, bh, labelText, alpha, isLit) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = isLit ? '#059669' : '#B9E2D5';
      ctx.strokeStyle = isLit ? '#34D399' : '#FE9457';
      ctx.lineWidth = isLit ? 2.4 : 1.8;
      rrect(bx, by, bw, bh, bh / 2);
      if (typeof ctx.beginPath === 'function') {
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(bx, by, bw, bh);
      }
      ctx.fillStyle = isLit ? '#FFFFFF' : '#10241E';
      fit(labelText, bx + bw / 2, by + bh / 2 + 6, bw - 24, 19.5, '800', '"Prompt", "Segoe UI", sans-serif', 'center');
      ctx.restore();
    }

    // Helper: Outer Uniform Step Card Frame
    function drawCardShell(cx, cy, cw, ch, isLit, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = isLit ? 'rgba(5, 150, 105, 0.25)' : 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = isLit ? 20 : 12;
      ctx.shadowOffsetY = isLit ? 6 : 4;
      ctx.fillStyle = isCardDark ? 'rgba(30, 41, 59, 0.88)' : '#FFFFFF';
      ctx.strokeStyle = isLit ? '#10B981' : (isCardDark ? 'rgba(148, 163, 184, 0.28)' : '#CBD5E1');
      ctx.lineWidth = isLit ? 2.6 : 1.3;
      rrect(cx, cy, cw, ch, 18);
      if (typeof ctx.beginPath === 'function') {
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(cx, cy, cw, ch);
      }
      ctx.restore();
    }

    // =========================================================================
    // 4. ROW 1: BALANCED 50/50 TOP BAR (Toolbar Left [48..950] + Goals Right [968..1870])
    // =========================================================================
    const topY = 118;
    const topH = 114;
    const pTop = easeOut((t - 0.12) / 0.42);
    const barW = colW * 2 + colGap; // 902px exact!

    ctx.save();
    ctx.globalAlpha = pTop;

    // 4A. Left Command Bar (48..950)
    const tbX = colX(0);
    ctx.fillStyle = isCardDark ? 'rgba(255, 255, 255, 0.06)' : '#EEF2F6';
    ctx.strokeStyle = isCardDark ? 'rgba(148, 163, 184, 0.30)' : '#CBD5E1';
    ctx.lineWidth = 1.6;
    rrect(tbX, topY, barW, topH, 20);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(tbX, topY, barW, topH);
    }

    const tbIcons = [
      { n: '#1', src: 'assets/ver3/slide11_holeplug/pic_28_image60.png', seekT: 14.0 },
      { n: '#2', src: 'assets/ver3/slide11_holeplug/pic_21_image53.png', seekT: 18.5 },
      { n: '#3', src: 'assets/ver3/slide11_holeplug/pic_22_image54.png', seekT: 23.0 },
      { n: '#4', src: 'assets/ver3/slide11_holeplug/pic_23_image55.png', seekT: 27.5 },
      { n: '#5', src: 'assets/ver3/slide11_holeplug/pic_24_image56.png', seekT: 32.5 },
      { n: '#6', src: 'assets/ver3/slide11_holeplug/pic_27_image59.png', seekT: 38.0 },
      { n: '#7', src: 'assets/ver3/slide11_holeplug/pic_25_image57.png', seekT: 43.5 }
    ];

    const tileW = 74;
    const tileH = 66;
    const tileStep = 96;
    const tileStartX = tbX + 28;
    const tileY = topY + 10;

    tbIcons.forEach((ic, idx) => {
      const ix = tileStartX + idx * tileStep;
      const isLit = activeStep === idx;
      drawAspectImage(ctx, ic.src, ix, tileY, tileW, tileH, {
        alpha: pTop,
        radius: 12,
        pad: 6,
        bgColor: '#FFFFFF',
        borderColor: isLit ? '#10B981' : '#CBD5E1',
        borderWidth: isLit ? 2.6 : 1.2
      });

      ctx.fillStyle = isLit ? '#059669' : (isCardDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0');
      rrect(ix + 10, topY + 81, tileW - 20, 24, 12);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      ctx.fillStyle = isLit ? '#FFFFFF' : (isCardDark ? '#E2E8F0' : '#0F172A');
      fit(ic.n, ix + tileW / 2, topY + 99, 46, 17, '800', '"Prompt", sans-serif', 'center');

      app._v3HpHits.push({ x: ix, y: topY + 4, w: tileW, h: topH - 8, idx, seekT: ic.seekT });
    });

    // Flow arrow from #7 -> Final File Upload icon
    const arrStartX = tileStartX + 6 * tileStep + tileW + 12;
    const uploadX = arrStartX + 76;
    if (typeof ctx.beginPath === 'function') {
      ctx.strokeStyle = isCardDark ? '#94A3B8' : '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(arrStartX, topY + 44);
      ctx.lineTo(uploadX - 18, topY + 44);
      ctx.stroke();
      ctx.fillStyle = isCardDark ? '#94A3B8' : '#475569';
      ctx.beginPath();
      ctx.moveTo(uploadX - 8, topY + 44);
      ctx.lineTo(uploadX - 22, topY + 37);
      ctx.lineTo(uploadX - 22, topY + 51);
      ctx.closePath();
      ctx.fill();
    }

    drawAspectImage(ctx, 'assets/ver3/slide11_holeplug/pic_26_image58.png', uploadX, tileY, 86, tileH, {
      alpha: pTop,
      radius: 12,
      pad: 6,
      bgColor: '#FFFFFF',
      borderColor: activeStep === 6 ? '#EF4444' : '#FCA5A5',
      borderWidth: activeStep === 6 ? 2.4 : 1.4
    });
    ctx.fillStyle = isCardDark ? '#FCA5A5' : '#991B1B';
    fit('File Upload', uploadX + 43, topY + 100, 92, 16, '800', '"Prompt", sans-serif', 'center');

    // 4B. Right Impact Goals Capsule (968..1870, exact same 902 x 114 size)
    const capX = colX(2);
    if (typeof ctx.createLinearGradient === 'function') {
      const capGrad = ctx.createLinearGradient(capX, topY, capX + barW, topY + topH);
      capGrad.addColorStop(0.0, '#6B7FD4');
      capGrad.addColorStop(1.0, '#8598DF');
      ctx.fillStyle = capGrad;
    } else {
      ctx.fillStyle = '#7C90D6';
    }
    ctx.strokeStyle = '#FE9457';
    ctx.lineWidth = 2.2;
    rrect(capX, topY, barW, topH, 57);
    if (typeof ctx.beginPath === 'function') {
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(capX, topY, barW, topH);
    }

    // Two Clean Goal Rows inside Right Capsule
    const goals = [
      { n: '1', text: 'ลด Loss เนื่องจาก Human Error', tag: 'เจาะตรงตำแหน่ง & ขนาดแม่นยำ' },
      { n: '2', text: 'ลดเวลาทำงานจาก Manual', tag: 'Automation 7 ขั้นตอนครบวงจร' }
    ];
    goals.forEach((g, gi) => {
      const gy = topY + 34 + gi * 46;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      rrect(capX + 38, gy - 16, 30, 30, 15);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      fit(g.n, capX + 53, gy + 6, 24, 18, '900', '"Prompt", sans-serif', 'center');
      fit(g.text, capX + 82, gy + 7, 456, 24, '700', '"Prompt", "Segoe UI", sans-serif', 'left');

      ctx.fillStyle = 'rgba(15, 23, 42, 0.20)';
      rrect(capX + barW - 302, gy - 16, 260, 30, 15);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      ctx.fillStyle = '#E0F2FE';
      fit(g.tag, capX + barW - 172, gy + 5, 244, 15.5, '600', '"Prompt", sans-serif', 'center');
    });
    ctx.restore();

    // =========================================================================
    // 5. ROW 2: 4 EQUAL PROPORTION CARDS (#1, #2, #3, #4) (y=246..614, h=368)
    // =========================================================================
    const midY = 246;
    const midH = 368;
    const pMid = easeOut((t - 0.24) / 0.48);

    const midCards = [
      { idx: 0, title: '#1 Set up CAD layers', img: 'assets/ver3/slide11_holeplug/pic_3_image50.png', wellBg: '#0F172A', seekT: 14.0 },
      { idx: 1, title: '#2 Import CAD into SketchUp', img: 'assets/ver3/slide11_holeplug/pic_31_image63.png', wellBg: '#FFFFFF', seekT: 18.5 },
      { idx: 2, title: '#3 Auto-detect Height', img: 'assets/ver3/slide11_holeplug/pic_8_image51.png', wellBg: '#FFFFFF', seekT: 23.0, highlightH700: true },
      { idx: 3, title: '#4 Auto Punching', img: 'assets/ver3/slide11_holeplug/pic_11_image52.png', wellBg: '#FFFFFF', seekT: 27.5 }
    ];

    midCards.forEach((mc, i) => {
      const cx = colX(i);
      const isLit = activeStep === mc.idx;
      drawCardShell(cx, midY, colW, midH, isLit, pMid);

      const frameX = cx + 12;
      const frameY = midY + 12;
      const frameW = colW - 24; // 418
      const frameH = 290;

      drawAspectImage(ctx, mc.img, frameX, frameY, frameW, frameH, {
        alpha: pMid,
        radius: 12,
        pad: 6,
        bgColor: mc.wellBg,
        borderColor: isLit ? '#10B981' : '#E2E8F0',
        borderWidth: 1.4
      });

      // Exact aligned orange callout boxes over H=700 inside #3
      if (mc.highlightH700) {
        const im3 = loadImage(mc.img);
        if (im3 && im3.complete && im3.naturalWidth > 0 && im3.naturalHeight > 0) {
          const maxW = frameW - 12;
          const maxH = frameH - 12;
          const sc = Math.min(maxW / im3.naturalWidth, maxH / im3.naturalHeight);
          const dw = im3.naturalWidth * sc;
          const dh = im3.naturalHeight * sc;
          const dx = frameX + (frameW - dw) / 2;
          const dy = frameY + (frameH - dh) / 2;
          ctx.save();
          ctx.globalAlpha = isSettled ? pMid : pMid * (0.75 + 0.25 * Math.sin(t * 3.5));
          ctx.strokeStyle = '#EA580C';
          ctx.lineWidth = 2.4;
          ctx.strokeRect(dx + dw * 0.115, dy + dh * 0.055, dw * 0.115, dh * 0.095);
          ctx.strokeRect(dx + dw * 0.115, dy + dh * 0.770, dw * 0.115, dh * 0.095);
          ctx.restore();
        }
      }

      drawStepPill(cx + 16, midY + 314, colW - 32, 40, mc.title, pMid, isLit);
      app._v3HpHits.push({ x: cx, y: midY, w: colW, h: midH, idx: mc.idx, seekT: mc.seekT });
    });

    // =========================================================================
    // 6. ROW 3: GRID-ALIGNED BOTTOM CARDS (#5, #6, #7) (y=628..1044, h=416)
    // =========================================================================
    const botY = 628;
    const botH = 416;
    const pBot = easeOut((t - 0.36) / 0.50);

    function drawLabeledFrame(fx, fy, fw, fh, opts) {
      const { img, bgColor = '#FFFFFF', headerBg = '#F1F5F9', title = '', pill = '', pillColor = '#0F766E', centerPill = false } = opts;
      ctx.save();
      ctx.globalAlpha = pBot;
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.2;
      rrect(fx, fy, fw, fh, 12);
      if (typeof ctx.beginPath === 'function') { ctx.fill(); ctx.stroke(); } else { ctx.fillRect(fx, fy, fw, fh); }

      ctx.fillStyle = headerBg;
      rrect(fx + 2, fy + 2, fw - 4, 28, 9);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      if (title) {
        ctx.fillStyle = '#334155';
        fit(title, fx + 10, fy + 20, fw - 120, 14, '700', '"Prompt", "Segoe UI", sans-serif', 'left');
      }
      if (pill) {
        const pw = centerPill ? Math.min(fw - 16, 110) : 104;
        const px = centerPill ? fx + (fw - pw) / 2 : fx + fw - pw - 6;
        ctx.fillStyle = pillColor;
        rrect(px, fy + 5, pw, 21, 6);
        if (typeof ctx.beginPath === 'function') ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        fit(pill, px + pw / 2, fy + 20, pw - 10, 13, '700', '"Prompt", sans-serif', 'center');
      }
      ctx.restore();
      drawAspectImage(ctx, img, fx + 4, fy + 32, fw - 8, fh - 36, { alpha: pBot, radius: 8, pad: 2 });
    }

    // 6A. Card #5: Generate 2D Auto Rotate (x=48..490, aligned under #1!)
    {
      const cx = colX(0);
      const isLit = activeStep === 4;
      drawCardShell(cx, botY, colW, botH, isLit, pBot);

      drawLabeledFrame(cx + 12, botY + 12, 192, 342, {
        img: 'assets/ver3/slide11_holeplug/pic_38_image67.png',
        bgColor: '#F8FAFC', pill: '3D Panel', pillColor: '#0F172A', centerPill: true
      });
      ctx.save();
      ctx.globalAlpha = pBot;
      // Rotate Arrow badge between 3D -> 2D
      ctx.fillStyle = '#059669';
      rrect(cx + 207, botY + 178, 18, 28, 9);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      fit('➔', cx + 216, botY + 197, 14, 13, '900', '"Prompt", sans-serif', 'center');
      ctx.restore();

      drawLabeledFrame(cx + 228, botY + 12, 202, 342, {
        img: 'assets/ver3/slide11_holeplug/pic_37_image66.png',
        bgColor: '#FFFFFF', pill: '2D Auto', pillColor: '#0369A1', centerPill: true
      });

      drawStepPill(cx + 16, botY + 364, colW - 32, 38, '#5 Generate 2D Auto Rotate', pBot, isLit);
      app._v3HpHits.push({ x: cx, y: botY, w: colW, h: botH, idx: 4, seekT: 32.5 });
    }

    // 6B. Card #6: Generate 3D Auto (Check Accuracy) (x=508..1410, w=902 aligned under #2+#3!)
    {
      const cx = colX(1);
      const cw = colW * 2 + colGap; // 902px exact!
      const isLit = activeStep === 5;
      drawCardShell(cx, botY, cw, botH, isLit, pBot);

      // Left Hero 3D Model (zero overlap!)
      drawAspectImage(ctx, 'assets/ver3/slide11_holeplug/pic_29_image61.png', cx + 12, botY + 12, 492, 342, {
        alpha: pBot, radius: 12, pad: 6, bgColor: '#FFFFFF', borderColor: isLit ? '#10B981' : '#CBD5E1', borderWidth: 1.4
      });

      // Right Clean Verification Stack (zero collision!)
      const subX = cx + 516;
      const subW = cw - 528; // 374px
      // Top: Punching Boards UI list
      drawAspectImage(ctx, 'assets/ver3/slide11_holeplug/pic_32_image64.png', subX, botY + 12, subW, 190, {
        alpha: pBot, radius: 12, pad: 4, bgColor: '#F8FAFC', borderColor: '#CBD5E1', borderWidth: 1.2
      });
      // Bottom Left: 3D Punching Zoom
      drawAspectImage(ctx, 'assets/ver3/slide11_holeplug/pic_30_image62.png', subX, botY + 212, 174, 142, {
        alpha: pBot, radius: 12, pad: 4, bgColor: '#F8FAFC', borderColor: '#CBD5E1', borderWidth: 1.2
      });
      // Bottom Right: 2D IW-UNIT01 Detail
      drawAspectImage(ctx, 'assets/ver3/slide11_holeplug/pic_33_image65.png', subX + 184, botY + 212, subW - 184, 142, {
        alpha: pBot, radius: 12, pad: 4, bgColor: '#FFFFFF', borderColor: '#CBD5E1', borderWidth: 1.2
      });

      drawStepPill(cx + 150, botY + 364, cw - 300, 38, '#6 Generate 3D Auto (Check Accuracy)', pBot, isLit);
      app._v3HpHits.push({ x: cx, y: botY, w: cw, h: botH, idx: 5, seekT: 38.0 });
    }

    // 6C. Card #7: Export Cad & File Up (x=1428..1870, aligned under #4!)
    {
      const cx = colX(3);
      const isLit = activeStep === 6;
      drawCardShell(cx, botY, colW, botH, isLit, pBot);

      // Top Panel: DWG File Output List
      drawLabeledFrame(cx + 12, botY + 12, colW - 24, 146, {
        img: 'assets/ver3/slide11_holeplug/pic_17_image35.png',
        title: 'DWG Files Output', pill: '.DWG Batch', pillColor: '#0F766E'
      });

      // Subtle connector badge between DWG -> CSV Database
      ctx.save();
      ctx.globalAlpha = pBot;
      ctx.fillStyle = '#059669';
      rrect(cx + colW / 2 - 14, botY + 159, 28, 16, 8);
      if (typeof ctx.beginPath === 'function') ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      fit('▼', cx + colW / 2, botY + 171, 18, 10, '900', '"Prompt", sans-serif', 'center');
      ctx.restore();

      // Bottom Panel: File Upload CSV Table
      drawLabeledFrame(cx + 12, botY + 176, colW - 24, 178, {
        img: 'assets/ver3/slide11_holeplug/pic_15_image36.png',
        title: 'Database Upload', pill: 'CSV Upload', pillColor: '#DC2626'
      });

      drawStepPill(cx + 16, botY + 364, colW - 32, 38, '#7 Export Cad & File Up', pBot, isLit);
      app._v3HpHits.push({ x: cx, y: botY, w: colW, h: botH, idx: 6, seekT: 43.5 });
    }
  }

  function drawSlide7NewWorkflowAllInOne(app, s) {
    const ctx = app.ctx;
    const nowSec = (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
    const animSec = app.slideElapsed || 0;
    const v2Slides = (typeof window !== 'undefined' && window.VER2_SLIDES) ? window.VER2_SLIDES : (app._v2SlidesCache || []);

    // 1. Master Background adapting to adjustable background theme
    const pal12 = (typeof app.getCustomBackgroundPalette === 'function')
      ? app.getCustomBackgroundPalette('dark-emerald')
      : {
          preset: 'default', isDark: true,
          stops: ['#0d1613', '#13231e', '#19332a', '#1f4035'],
          gridColor: 'rgba(52, 211, 153, 0.05)'
        };
    if (typeof ctx.createLinearGradient === 'function') {
      const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
      const stops12 = pal12.stops || ['#0d1613', '#13231e', '#19332a', '#1f4035'];
      stops12.forEach((col, i) => bgGrad.addColorStop(i / Math.max(1, stops12.length - 1), col));
      ctx.fillStyle = bgGrad;
    } else {
      ctx.fillStyle = (pal12.stops && pal12.stops[0]) || '#0d1613';
    }
    ctx.fillRect(0, 0, 1920, 1080);

    // Subtle Architectural Grid Mesh
    ctx.save();
    ctx.strokeStyle = pal12.gridColor || 'rgba(52, 211, 153, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx < 1920; gx += 48) { ctx.moveTo(gx, 0); ctx.lineTo(gx, 1080); }
    for (let gy = 0; gy < 1080; gy += 48) { ctx.moveTo(0, gy); ctx.lineTo(1920, gy); }
    ctx.stroke();
    ctx.restore();

    // Determine Active Ver 2 SubStep:
    // Auto progression per user request:
    // Step 0: 0..10s (holds for 10s)
    // Step 1: 10..130s (plays 2 minutes / 120s)
    // Step 2: 130..150s (holds for 20s · 5 deliverables x 4s)
    // Preload Step 02 sequential plugin videos once Slide 12 opens so they are ready without stalling
    if (v2Slides && v2Slides[1] && Array.isArray(v2Slides[1].videoPlaylist) && typeof app.getOrCreateVideo === 'function') {
      v2Slides[1].videoPlaylist.forEach((vp) => { if (vp && vp.src) app.getOrCreateVideo(vp.src); });
    }

    if (app.canvas && !app.canvas._v3TabListenerAttached) {
      app.canvas._v3TabListenerAttached = true;
      app.canvas.addEventListener('click', (e) => {
        const rect = app.canvas.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return;
        const cx = (e.clientX - rect.left) * (1920 / rect.width);
        const cy = (e.clientY - rect.top) * (1080 / rect.height);
        const curSlide = app.slides && app.slides[app.activeSlideIndex];
        if (curSlide && (curSlide.id === 'v3-new-workflow' || curSlide.layout === 'new-workflow-allinone')) {
          const slideStart = typeof app.getSlideStartTime === 'function' ? app.getSlideStartTime(app.activeSlideIndex) : 0;
          const jumpSlideElapsed = (targetSec, subStepIdx) => {
            if (typeof app.seekTo === 'function') app.seekTo(slideStart + targetSec);
            else app.slideElapsed = targetSec;
            if (!app.isPlaying) app._ver2SubStep = subStepIdx;
            if (typeof app.render === 'function') app.render();
          };

          if (cy >= 16 && cy <= 54) {
            if (cx >= 475 && cx <= 735) { jumpSlideElapsed(0.1, 0); return; }
            if (cx >= 745 && cx <= 1035) { jumpSlideElapsed(14.1, 1); return; }
            if (cx >= 1045 && cx <= 1275) { jumpSlideElapsed(130.1, 2); return; }
            if (cx >= 1310 && cx <= 1510) {
              app.parallelBranchStyle = 'clean-minimal';
              if (typeof app.render === 'function') app.render();
              return;
            }
            if (cx >= 1520 && cx <= 1700) {
              app.parallelBranchStyle = 'ver2-dark';
              if (typeof app.render === 'function') app.render();
              return;
            }
          }

          // Clickable Step 02 Sequential Video Clip Pills ([1 · IW Plugin] / [2 · EE Plugin]) & VDO Monitor Play/Pause
          if (app._ver2ActiveStep === 1) {
            if (Array.isArray(app._step2VdoClipHits)) {
              for (const vh of app._step2VdoClipHits) {
                if (cx >= vh.x && cx <= vh.x + vh.w && cy >= vh.y && cy <= vh.y + vh.h) {
                  jumpSlideElapsed(10.0 + vh.stepDelaySec + vh.clipStartSec + 0.08, 1);
                  return;
                }
              }
            }
            if (app.vdoMonitorRect) {
              const vr = app.vdoMonitorRect;
              if (cx >= vr.x && cx <= vr.x + vr.w && cy >= vr.y && cy <= vr.y + vr.h) {
                if (app.isPlaying) app.pause();
                else app.play(false);
                return;
              }
            }
          }
        }
      });
    }
    let activeStep = 0;
    if (!app.isPlaying && typeof app._ver2SubStep === 'number') {
      activeStep = app._ver2SubStep;
    } else {
      activeStep = animSec < 10 ? 0 : (animSec < 130 ? 1 : 2);
    }

    // 2. Top Navigation Bar (NO SIDEBAR - FULL WIDTH LAYOUT)
    const topBarY = 16;
    const topBarH = 38;

    // Top-Left Chapter Pill Badge
    ctx.save();
    const lBadgeX = 28, lBadgeW = 420;
    ctx.fillStyle = 'rgba(15, 38, 30, 0.92)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(lBadgeX, topBarY, lBadgeW, topBarH, 19);
    } else {
      ctx.rect(lBadgeX, topBarY, lBadgeW, topBarH);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

      ctx.fillStyle = '#85dcc9';
      app.fillFittedText(ctx, '01 • NEW WORKFLOW: 4 PARALLEL BRANCHES', lBadgeX + lBadgeW / 2, topBarY + 25, lBadgeW - 28, 16.5, '800', '"Prompt", sans-serif', 'center');
    ctx.restore();

    // Center 3 Horizontal Stepper Tabs (Sleek, low-profile, clean)
    const tabs = [
      { id: 0, label: '01 | ภาพรวม New Flow (4 สายงาน)', w: 260 },
      { id: 1, label: '02 | ต้นน้ำ: แปลนสถาปัตย์ & P-Rule', w: 290 },
      { id: 2, label: '03 | สรุปผลผลิต 5 สายงาน', w: 230 }
    ];
    let tabStartX = 475;
    const tabGap = 10;

    tabs.forEach((tab) => {
      const isAct = activeStep === tab.id;
      ctx.save();
      ctx.fillStyle = isAct ? '#10b981' : 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(tabStartX, topBarY, tab.w, topBarH, 19);
      } else {
        ctx.rect(tabStartX, topBarY, tab.w, topBarH);
      }
      ctx.fill();
      ctx.strokeStyle = isAct ? '#34d399' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = isAct ? 1.8 : 1;
      ctx.stroke();

      ctx.fillStyle = isAct ? '#0f1714' : '#cbd5e1';
      app.fillFittedText(ctx, tab.label, tabStartX + tab.w / 2, topBarY + 25, tab.w - 18, isAct ? 15.5 : 15, isAct ? '800' : '600', '"Prompt", sans-serif', 'center');
      ctx.restore();

      tabStartX += tab.w + tabGap;
    });

    // Top-Right Style Toggle Buttons (Only when on Step 0)
    if (activeStep === 0) {
      const isClean = app.parallelBranchStyle !== 'ver2-dark';
      const b1X = 1310, b1W = 200;
      const b2X = 1520, b2W = 180;

      // Clean Minimal Button
      ctx.save();
      ctx.fillStyle = isClean ? '#10b981' : 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(b1X, topBarY, b1W, topBarH, 19);
      } else {
        ctx.rect(b1X, topBarY, b1W, topBarH);
      }
      ctx.fill();
      ctx.strokeStyle = isClean ? '#34d399' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = isClean ? '#0f1714' : '#e2e8f0';
      app.fillFittedText(ctx, '✨ สไตล์ 1: Clean Minimal', b1X + b1W / 2, topBarY + 24.5, b1W - 18, 15, isClean ? '700' : '500', '"Prompt", sans-serif', 'center');

      // Ver 2 Dark Button
      ctx.fillStyle = !isClean ? '#10b981' : 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(b2X, topBarY, b2W, topBarH, 19);
      } else {
        ctx.rect(b2X, topBarY, b2W, topBarH);
      }
      ctx.fill();
      ctx.strokeStyle = !isClean ? '#34d399' : 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = !isClean ? '#0f1714' : '#e2e8f0';
      app.fillFittedText(ctx, '🌙 สไตล์ 2: Ver 2 Dark', b2X + b2W / 2, topBarY + 24.5, b2W - 18, 15, !isClean ? '700' : '500', '"Prompt", sans-serif', 'center');
      ctx.restore();
    }

    // Top-Right Page Counter Badge (12 / 16)
    drawPageBadge(ctx, app);

    // 3. Stage Container (FULL WIDTH 1864px x 996px - ZERO SIDEBAR)
    const stageBox = { x: 28, y: 64, w: 1864, h: 996 };

    // Outer Stage Border & Backdrop
    ctx.save();
    ctx.fillStyle = 'rgba(12, 22, 18, 0.88)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(stageBox.x, stageBox.y, stageBox.w, stageBox.h, 20);
    } else {
      ctx.rect(stageBox.x, stageBox.y, stageBox.w, stageBox.h);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Inner Clip Stage
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(stageBox.x + 2, stageBox.y + 2, stageBox.w - 4, stageBox.h - 4, 18);
    } else {
      ctx.rect(stageBox.x + 2, stageBox.y + 2, stageBox.w - 4, stageBox.h - 4);
    }
    ctx.clip();

    // 4. Render Active Ver 2 Scene inside full-width stageBox
    app._ver2ActiveStep = activeStep;
    if (activeStep !== 1 && app.videoCache && v2Slides && v2Slides[1] && Array.isArray(v2Slides[1].videoPlaylist)) {
      v2Slides[1].videoPlaylist.forEach((vp) => {
        const cachedVid = vp && vp.src ? app.videoCache.get(vp.src) : null;
        if (cachedVid && !cachedVid.paused) {
          try { cachedVid.pause(); } catch (e) {}
        }
      });
    }
    const activeSlide = (v2Slides && v2Slides[activeStep]) ? v2Slides[activeStep] : s;
    if (activeStep === 0) {
      if (typeof app.drawParallelBranchSplitScene === 'function') {
        app.drawParallelBranchSplitScene(ctx, stageBox, activeSlide, animSec, nowSec);
      }
    } else if (activeStep === 1) {
      if (typeof app.drawBoqSkuExtrusionScene === 'function') {
        app.drawBoqSkuExtrusionScene(ctx, stageBox, activeSlide, animSec - 10, nowSec);
      }
    } else if (activeStep === 2) {
      if (typeof app.drawDeliverablesShowcaseScene === 'function') {
        app.drawDeliverablesShowcaseScene(ctx, stageBox, activeSlide, animSec - 130, nowSec);
      } else if (typeof app.drawAutomationDeliverablesSummaryScene === 'function') {
        app.drawAutomationDeliverablesSummaryScene(ctx, stageBox, activeSlide, animSec - 130, nowSec);
      }
    }
    ctx.restore();
  }

  function drawSlide12ProcessImprovementScene(app, s) {
    const ctx = app.ctx;
    const { isSettled, t } = getCappedMotion(app);

    function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }
    function easeOutCubic(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }

    // Coordinate mapping from PPTX slide14.xml (x in 308..1611, y in 19..1020)
    // to full widescreen 1920x1080 canvas matching reference image
    const SX = 1.28;
    const X = (px) => (px - 960) * SX + 940;
    const Y = (py) => py + 8;
    const W = (pw) => pw * SX;
    const H = (ph) => ph;
    const isoAngle = Math.atan2(-100.6, 173.1 * SX); // ~ -24.4 deg parallel to diamond edge

    function drawRoundedBox(x, y, w, h, r, fillColor, strokeColor, lineWidth, dashArr) {
      ctx.save();
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        const rad = Math.min(r, Math.min(w, h) / 2);
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, rad);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.closePath();
        if (fillColor) {
          ctx.fillStyle = fillColor;
          ctx.fill();
        }
        if (strokeColor && lineWidth) {
          if (dashArr && typeof ctx.setLineDash === 'function') ctx.setLineDash(dashArr);
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      } else if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();
    }

    function drawPoly(pts, fillColor, strokeColor, lineWidth, dashArr) {
      if (typeof ctx.beginPath !== 'function' || !pts || !pts.length) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
      }
      ctx.closePath();
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (strokeColor && lineWidth) {
        if (dashArr && typeof ctx.setLineDash === 'function') ctx.setLineDash(dashArr);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawDownTriangle(cx, topY, w, h, fillCol, strokeCol, lw, rotDeg) {
      if (typeof ctx.beginPath !== 'function') return;
      ctx.save();
      if (rotDeg && typeof ctx.translate === 'function' && typeof ctx.rotate === 'function') {
        ctx.translate(cx, topY + h / 2);
        ctx.rotate((rotDeg * Math.PI) / 180);
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(w / 2, h / 2);
        ctx.lineTo(-w / 2, h / 2);
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, topY);
        ctx.lineTo(cx + w / 2, topY);
        ctx.lineTo(cx, topY + h);
        ctx.closePath();
      }
      if (fillCol) {
        ctx.fillStyle = fillCol;
        ctx.fill();
      }
      if (strokeCol && lw) {
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawArrowHead(tipX, tipY, angleRad, size, color) {
      if (typeof ctx.beginPath !== 'function') return;
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - size * Math.cos(angleRad - 0.45), tipY - size * Math.sin(angleRad - 0.45));
      ctx.lineTo(tipX - size * Math.cos(angleRad + 0.45), tipY - size * Math.sin(angleRad + 0.45));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawArrowLine(pts, color, lineWidth, headSize, dashArr, pulseColor, speed) {
      if (typeof ctx.beginPath !== 'function' || pts.length < 2) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth || 2.5;
      if (dashArr && typeof ctx.setLineDash === 'function') ctx.setLineDash(dashArr);
      ctx.beginPath();
      ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
      }
      ctx.stroke();
      ctx.restore();

      if (headSize) {
        const n = pts.length;
        const x1 = X(pts[n - 2][0]), y1 = Y(pts[n - 2][1]);
        const x2 = X(pts[n - 1][0]), y2 = Y(pts[n - 1][1]);
        const ang = Math.atan2(y2 - y1, x2 - x1);
        drawArrowHead(x2, y2, ang, headSize, color);
      }

      // Animated traveling energy orb along the path (runs up to 10s, then stops cleanly)
      if (!isSettled && pulseColor && typeof ctx.arc === 'function') {
        const segs = [];
        let totalLen = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const x1 = X(pts[i][0]), y1 = Y(pts[i][1]);
          const x2 = X(pts[i + 1][0]), y2 = Y(pts[i + 1][1]);
          const len = Math.hypot(x2 - x1, y2 - y1);
          segs.push({ x1, y1, x2, y2, len, start: totalLen });
          totalLen += len;
        }
        if (totalLen > 1) {
          const prog = ((t * (speed || 110)) % totalLen);
          for (let i = 0; i < segs.length; i++) {
            const sg = segs[i];
            if (prog >= sg.start && prog <= sg.start + sg.len) {
              const u = (prog - sg.start) / (sg.len || 1);
              const px = sg.x1 + (sg.x2 - sg.x1) * u;
              const py = sg.y1 + (sg.y2 - sg.y1) * u;
              ctx.save();
              ctx.fillStyle = pulseColor;
              ctx.shadowColor = pulseColor;
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(px, py, 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
              break;
            }
          }
        }
      }
    }

    // Isometric 3-layered Spreadsheet Stack Icon (Group 49 & Group 66)
    function drawIsoSpreadsheetStack(baseX, baseY) {
      if (typeof ctx.beginPath !== 'function') return;
      const offsets = [
        [20, -14],
        [10, -7],
        [0, 0]
      ];
      offsets.forEach(([ox, oy], idx) => {
        const x0 = baseX + ox;
        const y0 = baseY + oy;
        // Isometric card leaning right-down (30 deg)
        const p = [
          [x0, y0],
          [x0 + 52, y0 + 28],
          [x0 + 52, y0 + 82],
          [x0, y0 + 54]
        ];
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p[0][0], p[0][1]);
        ctx.lineTo(p[1][0], p[1][1]);
        ctx.lineTo(p[2][0], p[2][1]);
        ctx.lineTo(p[3][0], p[3][1]);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.8;
        ctx.stroke();

        if (idx === 2) {
          // Small inner table cell & lines on front card
          ctx.beginPath();
          ctx.moveTo(x0 + 6, y0 + 10);
          ctx.lineTo(x0 + 24, y0 + 20);
          ctx.lineTo(x0 + 24, y0 + 38);
          ctx.lineTo(x0 + 6, y0 + 28);
          ctx.closePath();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x0 + 28, y0 + 34); ctx.lineTo(x0 + 46, y0 + 44);
          ctx.moveTo(x0 + 24, y0 + 42); ctx.lineTo(x0 + 46, y0 + 54);
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    // -------------------------------------------------------------
    // 1. Background (Sage-Charcoal to Mint-Teal Gradient matching PPTX slide14)
    // -------------------------------------------------------------
    const bgGrad = (typeof ctx.createLinearGradient === 'function')
      ? ctx.createLinearGradient(0, 0, 0, 1080)
      : null;
    if (bgGrad) {
      bgGrad.addColorStop(0.00, '#445c53');
      bgGrad.addColorStop(0.28, '#587c70');
      bgGrad.addColorStop(0.58, '#74b09d');
      bgGrad.addColorStop(0.89, '#8dd1be');
      bgGrad.addColorStop(0.90, '#84cbb7');
      bgGrad.addColorStop(1.00, '#88d0bc');
      ctx.fillStyle = bgGrad;
    } else {
      ctx.fillStyle = '#6da693';
    }
    ctx.fillRect(0, 0, 1920, 1080);

    // Top-right dark charcoal radial shading matching PPTX master background
    if (typeof ctx.createRadialGradient === 'function') {
      const radGrad = ctx.createRadialGradient(1750, 60, 40, 1650, 180, 980);
      radGrad.addColorStop(0.0, 'rgba(26, 33, 33, 0.72)');
      radGrad.addColorStop(0.5, 'rgba(38, 50, 48, 0.35)');
      radGrad.addColorStop(1.0, 'rgba(68, 92, 83, 0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, 1920, 1080);
    }

    // Bottom horizontal horizon band (y = 978..1080)
    ctx.save();
    ctx.fillStyle = 'rgba(132, 206, 185, 0.55)';
    ctx.fillRect(0, Y(970), 1920, 110);
    ctx.restore();

    // Top-Right Page Counter Badge (13 / 16)
    drawPageBadge(ctx, app);

    // -------------------------------------------------------------
    // 2. Top Header: Purple Teardrop + Title + "7 days ▷ 1 day" Pill
    // -------------------------------------------------------------
    const headP = easeOutCubic(t / 0.45);
    ctx.save();
    ctx.globalAlpha = headP;

    // Purple Teardrop (Teardrop 9: circle with sharp top-right corner)
    const tdX = X(308.6);
    const tdY = Y(37.6);
    const tdSize = 172;
    const tdR = tdSize / 2;
    const tdCx = tdX + tdR;
    const tdCy = tdY + tdR;
    if (typeof ctx.beginPath === 'function' && typeof ctx.arc === 'function') {
      ctx.save();
      ctx.fillStyle = '#5a33aa';
      ctx.beginPath();
      // Start at top-center, go to top-right sharp corner, down to right-center, then arc around bottom, left, top
      ctx.moveTo(tdCx, tdY);
      ctx.lineTo(tdX + tdSize, tdY);
      ctx.lineTo(tdX + tdSize, tdCy);
      ctx.arc(tdCx, tdCy, tdR, 0, Math.PI * 1.5, false);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      drawRoundedBox(tdX, tdY, tdSize, tdSize, 60, '#5933a9', null, 0);
    }

    // Main Title: EXISTING PROCESS & IMPROVEMENT
    ctx.fillStyle = '#85c7ae';
    ctx.font = '800 37px "Prompt", sans-serif';
    ctx.fillText('EXISTING PROCESS & IMPROVEMENT', X(339.7), Y(112));

    // Top-Right Pill: 7 days ▷ 1 day (Group 123)
    const pill7X = X(1225.5);
    const pill7Y = Y(10.0);
    const pill7W = W(330.0);
    const pill7H = 40;
    drawRoundedBox(pill7X, pill7Y, pill7W, pill7H, 20, '#e2e2e2', null, 0);

    // Orange Pill for "1 day"
    const pill1X = X(1476.0);
    const pill1W = W(108.0);
    const pulse1 = isSettled ? 0.55 : (Math.sin(t * 3.5) * 0.5 + 0.5);
    ctx.save();
    if (pulse1 > 0.1) {
      ctx.shadowColor = 'rgba(255, 149, 87, 0.6)';
      ctx.shadowBlur = 8 + pulse1 * 8;
    }
    drawRoundedBox(pill1X, pill7Y, pill1W, pill7H, 20, '#f08c4b', null, 0);
    ctx.restore();

    ctx.fillStyle = '#0f172a';
    ctx.font = '700 22px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('7 days', pill7X + W(125), pill7Y + 28);
    ctx.fillText('1 day', pill1X + pill1W / 2, pill7Y + 28);
    ctx.textAlign = 'left';

    // Hollow Black Triangle Arrow between "7 days" and "1 day"
    const triX = X(1455.0);
    const triY = pill7Y + 9;
    if (typeof ctx.beginPath === 'function') {
      ctx.save();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(triX, triY);
      ctx.lineTo(triX + 32, triY + 11);
      ctx.lineTo(triX, triY + 22);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // -------------------------------------------------------------
    // 3. Left Column: Existing Process (Step 01, Step 02, Step 03)
    // -------------------------------------------------------------
    const leftP = easeOutCubic((t - 0.1) / 0.5);
    ctx.save();
    ctx.globalAlpha = leftP;

    // Label: Existing Process
    ctx.fillStyle = '#ff9557';
    ctx.font = '700 20px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Existing Process', X(518.0), Y(172));

    // Pill 1: Create DWG & Coding Assembly Part
    drawRoundedBox(X(385.5), Y(180.0), W(264.5), H(41.0), 20, '#f2eeee', '#ff9557', 2);
    ctx.fillStyle = '#0f172a';
    app.fillFittedText(ctx, 'Create DWG & Coding Assembly Part', X(517.8), Y(197), W(244), 16, '700', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = '#334155';
    app.fillFittedText(ctx, 'Wall, Partition, Frame, Stud, Smart Board, Window', X(517.8), Y(212), W(244), 13, '400', '"Prompt", sans-serif', 'center');

    // Card 01: Manual BOM on DWG
    drawRoundedBox(X(385.5), Y(240.1), W(265.3), H(366.5), 34, '#f2eeee', '#334155', 1.5);

    // Badge 01
    drawRoundedBox(X(486.0), Y(221.9), W(48.0), H(35.2), 9, '#f2eeee', '#ff9557', 2);
    ctx.fillStyle = '#ff9557';
    ctx.font = '700 21px "Prompt", sans-serif';
    ctx.fillText('01', X(510.0), Y(246.5));

    // Card 01 Title: Manual BOM on DWG
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 21px "Prompt", sans-serif';
    ctx.fillText('Manual BOM on DWG', X(518.0), Y(273));
    ctx.textAlign = 'left';

    // Step 01 Composite DWG Markup Image
    const imStep01 = loadImage('assets/ver3/slide13_imp/step01_dwg_markup.png');
    const s1ImgX = X(407.1), s1ImgY = Y(282.4), s1ImgW = W(222.0), s1ImgH = H(295.4);
    drawRoundedBox(s1ImgX - 1, s1ImgY - 1, s1ImgW + 2, s1ImgH + 2, 2, '#ffffff', '#0f172a', 1.5);
    if (imStep01 && imStep01.complete && imStep01.naturalWidth) {
      ctx.drawImage(imStep01, s1ImgX, s1ImgY, s1ImgW, s1ImgH);
    }

    // 4 Red Dashed Rounded-Rect Callouts + Green Ovals + 4 Downward Orange Arrows on Step 01
    const s1Callouts = [
      { x: 398.8, y: 406.8, w: 58.6, h: 22.8, ax: 420.3, ay1: 429.6, ay2: 595.0 },
      { x: 410.0, y: 459.9, w: 58.6, h: 22.8, ax: 441.5, ay1: 482.7, ay2: 595.0 },
      { x: 450.1, y: 526.1, w: 58.6, h: 22.8, ax: 486.1, ay1: 548.9, ay2: 595.0 },
      { x: 530.5, y: 526.1, w: 58.6, h: 22.8, ax: 565.4, ay1: 548.9, ay2: 595.0 }
    ];
    s1Callouts.forEach((c, idx) => {
      const pulseC = isSettled ? 0.5 : (Math.sin(t * 3 + idx) * 0.5 + 0.5);
      // Green inner oval
      drawRoundedBox(X(c.x + 3), Y(c.y + 2), W(c.w - 6), H(c.h - 4), 10, null, '#16a34a', 1.8);
      // Red dashed outer callout
      drawRoundedBox(X(c.x), Y(c.y), W(c.w), H(c.h), 11, `rgba(239, 68, 68, ${0.04 + pulseC * 0.08})`, '#ef4444', 1.8, [4, 3]);
      // Downward orange arrow
      drawArrowLine([[c.ax, c.ay1], [c.ax, c.ay2]], '#ff9557', 2.2, 10, null, null, 0);
    });

    // Pill 2: Input Data from DWG > to BOM
    ctx.textAlign = 'center';
    drawRoundedBox(X(384.9), Y(616.0), W(267.6), H(41.0), 20, '#f2eeee', '#ff9557', 2);
    ctx.fillStyle = '#0f172a';
    app.fillFittedText(ctx, 'Input Data from DWG > to BOM', X(518.7), Y(633), W(246), 16, '700', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = '#334155';
    app.fillFittedText(ctx, 'Menu Select', X(518.7), Y(648), W(246), 13, '400', '"Prompt", sans-serif', 'center');

    // Card 02: Input Data (Menu Select) — Live Animated Simulator Clip
    drawRoundedBox(X(384.9), Y(675.7), W(267.6), H(243.5), 36, '#ffffff', '#ff9557', 5.5);

    // Badge 02
    drawRoundedBox(X(493.2), Y(657.3), W(51.4), H(36.8), 9, '#f2eeee', '#ff9557', 2);
    ctx.fillStyle = '#ff9557';
    ctx.font = '700 20px "Prompt", sans-serif';
    ctx.fillText('02', X(518.9), Y(682.5));

    // Card 02 Title: Input Data (Menu Select)
    ctx.fillStyle = '#1e293b';
    ctx.font = '700 20px "Prompt", sans-serif';
    ctx.fillText('Input Data (Menu Select)', X(518.7), Y(712));

    // Step 02 Animated Menu Select UI Clip (replaces static step02_menu_select_ui.png)
    const c2X = X(392.0);
    const c2Y = Y(719.0);
    const c2W = W(253.5);
    const c2H = H(168.0);
    drawRoundedBox(c2X, c2Y, c2W, c2H, 12, '#f8fafc', '#cbd5e1', 1.5);

    // Top Browser Window Header
    drawRoundedBox(c2X + 1.5, c2Y + 1.5, c2W - 3, 19, 10, '#1e293b', null, 0);
    const s13Dots = ['#ef4444', '#f59e0b', '#22c55e'];
    s13Dots.forEach((dc, di) => {
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.arc(c2X + 11 + di * 9, c2Y + 11, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = dc;
        ctx.fill();
      }
    });
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '800 10px "Prompt", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WEB BOM · MENU SELECT INPUT', c2X + 39, c2Y + 14.5);

    // Pulsing LIVE dot (settles calmly to DONE after 10s)
    const s13Pulse = isSettled ? 1 : (0.5 + 0.5 * Math.sin(t * 5.4));
    if (typeof ctx.beginPath === 'function') {
      ctx.beginPath();
      ctx.arc(c2X + c2W - 40, c2Y + 11, 3, 0, Math.PI * 2);
      ctx.fillStyle = isSettled ? '#22c55e' : `rgba(34, 197, 94, ${0.65 + 0.35 * s13Pulse})`;
      ctx.fill();
    }
    ctx.fillStyle = '#86efac';
    ctx.font = '800 9.5px "Prompt", sans-serif';
    ctx.fillText(isSettled ? 'DONE' : 'LIVE', c2X + c2W - 33, c2Y + 14.5);

    // 5 Top Menu Tabs inside Clip
    const tab13Labels = [
      { txt: 'HAPPS Import', col: '#ef4444', bg: '#ffffff' },
      { txt: 'File Upload', col: '#334155', bg: '#ffffff' },
      { txt: 'Free Input', col: '#f59e0b', bg: '#ffffff' },
      { txt: 'Menu Select', col: '#ffffff', bg: '#2563eb' },
      { txt: 'BOM Generator', col: '#16a34a', bg: '#ffffff' }
    ];
    const tab13W = (c2W - 16) / 5;
    tab13Labels.forEach((tb, ti) => {
      const tx = c2X + 6 + ti * (tab13W + 1);
      const ty = c2Y + 23;
      drawRoundedBox(tx, ty, tab13W - 1, 15, 3, tb.bg, tb.bg === '#2563eb' ? '#1d4ed8' : tb.col, 0.9);
      ctx.fillStyle = tb.col;
      app.fillFittedText(ctx, tb.txt, tx + (tab13W - 1) / 2, ty + 11, tab13W - 6, 8.5, '800', '"Prompt", sans-serif', 'center');
    });

    // Animated step cycle across the 3 dropdown columns + table (settles cleanly at 10s)
    const step13 = isSettled ? 3 : ((t * 0.9) % 4);
    const actCol13 = Math.floor(step13);
    const body13Y = c2Y + 41;
    const body13H = c2H - 45;

    // Dropdown 1: Top Size
    const d1X = c2X + 6, d1W = 46;
    drawRoundedBox(d1X, body13Y, d1W, body13H, 3, '#ffffff', actCol13 === 0 ? '#2563eb' : '#cbd5e1', actCol13 === 0 ? 1.4 : 0.8);
    ctx.fillStyle = '#0f172a';
    app.fillFittedText(ctx, 'Top Size', d1X + d1W / 2, body13Y + 9.5, d1W - 5, 8.5, '800', '"Prompt", sans-serif', 'center');
    drawRoundedBox(d1X + 2, body13Y + 12, d1W - 4, 11, 2, '#f1f5f9', '#94a3b8', 0.6);
    app.fillFittedText(ctx, 'Hi ▾', d1X + 4, body13Y + 20, d1W - 8, 8.5, '700', '"Prompt", sans-serif', 'left');
    ['Round', 'Hi', 'C4', 'T1', 'C2', 'T2', 'N/A'].forEach((it, idx) => {
      const iy = body13Y + 26 + idx * 13;
      const isS = idx === 1;
      if (isS) drawRoundedBox(d1X + 2, iy, d1W - 4, 12, 2, '#2563eb', null, 0);
      ctx.fillStyle = isS ? '#ffffff' : '#475569';
      app.fillFittedText(ctx, it, d1X + 4, iy + 9, d1W - 8, 8.5, isS ? '800' : '600', '"Prompt", sans-serif', 'left');
    });

    // Dropdown 2: Opening Type
    const d2X = d1X + d1W + 4, d2W = 64;
    drawRoundedBox(d2X, body13Y, d2W, body13H, 3, '#ffffff', actCol13 === 1 ? '#2563eb' : '#cbd5e1', actCol13 === 1 ? 1.4 : 0.8);
    ctx.fillStyle = '#0f172a';
    app.fillFittedText(ctx, 'Opening Type', d2X + d2W / 2, body13Y + 9.5, d2W - 5, 8.5, '800', '"Prompt", sans-serif', 'center');
    drawRoundedBox(d2X + 2, body13Y + 12, d2W - 4, 11, 2, '#f1f5f9', '#94a3b8', 0.6);
    app.fillFittedText(ctx, 'Full Wall ▾', d2X + 4, body13Y + 20, d2W - 8, 8.5, '700', '"Prompt", sans-serif', 'left');
    ['N/A', 'Full Wall', 'D-2', 'W-2', 'W-Double', 'W-Sash', 'Bay-1'].forEach((it, idx) => {
      const iy = body13Y + 26 + idx * 13;
      const isS = idx === 1;
      if (isS) drawRoundedBox(d2X + 2, iy, d2W - 4, 12, 2, '#2563eb', null, 0);
      ctx.fillStyle = isS ? '#ffffff' : '#475569';
      app.fillFittedText(ctx, it, d2X + 4, iy + 9, d2W - 8, 8.5, isS ? '800' : '600', '"Prompt", sans-serif', 'left');
    });

    // Dropdown 3: Size
    const d3X = d2X + d2W + 4, d3W = 42;
    drawRoundedBox(d3X, body13Y, d3W, body13H, 3, '#ffffff', actCol13 === 2 ? '#2563eb' : '#cbd5e1', actCol13 === 2 ? 1.4 : 0.8);
    ctx.fillStyle = '#0f172a';
    app.fillFittedText(ctx, 'Size', d3X + d3W / 2, body13Y + 9.5, d3W - 5, 8.5, '800', '"Prompt", sans-serif', 'center');
    drawRoundedBox(d3X + 2, body13Y + 12, d3W - 4, 11, 2, '#f1f5f9', '#94a3b8', 0.6);
    app.fillFittedText(ctx, '2700 ▾', d3X + 4, body13Y + 20, d3W - 8, 8.5, '700', '"Prompt", sans-serif', 'left');
    ['300', '450', '600', '900', '1800', '2700', '3600'].forEach((it, idx) => {
      const iy = body13Y + 26 + idx * 13;
      const isS = idx === 5;
      if (isS) drawRoundedBox(d3X + 2, iy, d3W - 4, 12, 2, '#2563eb', null, 0);
      ctx.fillStyle = isS ? '#ffffff' : '#475569';
      app.fillFittedText(ctx, it, d3X + 4, iy + 9, d3W - 8, 8.5, isS ? '800' : '600', '"Prompt", sans-serif', 'left');
    });

    // Right Table: Size (Inner) | Position | Amount + Isometric Sheet Stack + Excel X Badge
    const tb13X = d3X + d3W + 4;
    const tb13W = c2X + c2W - tb13X - 6;
    drawRoundedBox(tb13X, body13Y, tb13W, body13H, 3, '#ffffff', actCol13 === 3 ? '#16a34a' : '#cbd5e1', actCol13 === 3 ? 1.4 : 0.8);
    ctx.fillStyle = '#0f172a';
    app.fillFittedText(ctx, 'Size (Inner)', tb13X + 4, body13Y + 9.5, 42, 7.8, '800', '"Prompt", sans-serif', 'left');
    app.fillFittedText(ctx, 'Position', tb13X + 48, body13Y + 9.5, 36, 7.8, '800', '"Prompt", sans-serif', 'left');
    app.fillFittedText(ctx, 'Amount', tb13X + 86, body13Y + 9.5, 32, 7.8, '800', '"Prompt", sans-serif', 'left');

    const scan13Row = isSettled ? -1 : Math.floor((t * 2.5) % 7);
    for (let r = 0; r < 7; r++) {
      const ry = body13Y + 14 + r * 14.5;
      const isActR = r === scan13Row;
      drawRoundedBox(
        tb13X + 2,
        ry,
        tb13W - 4,
        13,
        2,
        isActR ? 'rgba(34, 197, 94, 0.20)' : r % 2 === 0 ? '#f8fafc' : '#ffffff',
        isActR ? '#16a34a' : '#e2e8f0',
        0.6
      );
      ctx.fillStyle = isActR ? '#14532d' : '#334155';
      app.fillFittedText(ctx, '04-07-02', tb13X + 4, ry + 9.5, 42, 7.8, isActR ? '800' : '600', '"Consolas", "Prompt", sans-serif', 'left');
      app.fillFittedText(ctx, `A${r + 1}-B${r + 1}`, tb13X + 48, ry + 9.5, 36, 7.8, isActR ? '800' : '600', '"Consolas", "Prompt", sans-serif', 'left');
      app.fillFittedText(ctx, '12', tb13X + 90, ry + 9.5, 20, 7.8, isActR ? '800' : '600', '"Consolas", "Prompt", sans-serif', 'left');
    }

    // Floating Isometric 3-Sheet Stack + Green Excel Badge (tucked cleanly bottom-right clear of data)
    const isoFloat13 = isSettled ? 0 : Math.sin(t * 3.8) * 2;
    drawIsoSpreadsheetStack(c2X + c2W - 42, body13Y + 76 + isoFloat13);
    const ex13X = c2X + c2W - 22;
    const ex13Y = body13Y + 90 + isoFloat13;
    drawRoundedBox(ex13X, ex13Y, 20, 22, 4, '#15803d', '#ffffff', 1.2);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13.5px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('X', ex13X + 10, ex13Y + 16);

    // Animated Mouse Cursor inside Card 02 Clip (hides after 10s)
    if (!isSettled) {
      const cur13Targets = [
        { x: d1X + 24, y: body13Y + 44 },
        { x: d2X + 34, y: body13Y + 44 },
        { x: d3X + 22, y: body13Y + 94 },
        { x: tb13X + 65, y: body13Y + 58 }
      ];
      const t13Idx = actCol13 % 4;
      const t13Next = (t13Idx + 1) % 4;
      const frac13 = step13 - Math.floor(step13);
      const move13P = clamp(frac13 / 0.55, 0, 1);
      const cur13X = cur13Targets[t13Idx].x + (cur13Targets[t13Next].x - cur13Targets[t13Idx].x) * move13P;
      const cur13Y = cur13Targets[t13Idx].y + (cur13Targets[t13Next].y - cur13Targets[t13Idx].y) * move13P;
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.moveTo(cur13X, cur13Y);
        ctx.lineTo(cur13X + 10, cur13Y + 4);
        ctx.lineTo(cur13X + 6, cur13Y + 7);
        ctx.lineTo(cur13X + 8, cur13Y + 12);
        ctx.lineTo(cur13X + 6, cur13Y + 13);
        ctx.lineTo(cur13X + 3, cur13Y + 8);
        ctx.lineTo(cur13X, cur13Y + 11);
        ctx.closePath();
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Bottom Warning inside Card 02: *** High Change of Human Error
    ctx.fillStyle = '#dc2626';
    ctx.font = '700 16px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('*** High Change of Human Error', X(518.7), Y(907));
    ctx.textAlign = 'left';

    // Step 03 (Bottom-Left): Floorplan thumbnail + Badge 03 + AutoCAD icon + Manual labels
    const imStep03 = loadImage('assets/ver3/slide13_imp/pic_137_image73.png');
    const s3X = X(462.7), s3Y = Y(929.6), s3W = W(104.3), s3H = H(89.7);
    drawRoundedBox(s3X - 1, s3Y - 1, s3W + 2, s3H + 2, 2, '#ffffff', '#ff9557', 1.5);
    if (imStep03 && imStep03.complete && imStep03.naturalWidth) {
      ctx.drawImage(imStep03, s3X, s3Y, s3W, s3H);
    }

    // Badge 03
    drawRoundedBox(X(431.2), Y(954.0), W(46.0), H(42.0), 9, '#f2eeee', '#ff9557', 2);
    ctx.fillStyle = '#ff9557';
    ctx.font = '700 19px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('03', X(454.2), Y(982));
    ctx.textAlign = 'left';

    // AutoCAD Icon (Bottom-Left)
    const imCad = loadImage('assets/ver3/slide13_imp/pic_133_image72.png');
    if (imCad && imCad.complete && imCad.naturalWidth) {
      ctx.drawImage(imCad, X(572.0), Y(948.0), 48, 48);
    }

    // Step 03 Labels: Manual Assembly DWG / Manual Plug Switch Smart Board / Manual PO
    ctx.font = '700 19px "Prompt", sans-serif';
    ctx.fillStyle = '#ff9557';
    ctx.fillText('Manual', X(616.0), Y(935));
    ctx.font = '400 19px "Prompt", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('Assembly DWG', X(616.0), Y(957));

    ctx.font = '700 19px "Prompt", sans-serif';
    ctx.fillStyle = '#ff9557';
    ctx.fillText('Manual', X(616.0), Y(987));
    ctx.font = '400 19px "Prompt", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('Plug Switch Smart Board', X(616.0), Y(1009));

    ctx.font = '700 19px "Prompt", sans-serif';
    ctx.fillStyle = '#ff9557';
    ctx.fillText('Manual', X(766.0), Y(935));
    ctx.fillStyle = '#0f172a';
    ctx.fillText('PO', X(778.0), Y(957));

    ctx.restore();

    // -------------------------------------------------------------
    // 4. Center Column: Isometric Layered Process Stack
    // -------------------------------------------------------------
    const stackP = easeOutCubic((t - 0.18) / 0.5);
    ctx.save();
    ctx.globalAlpha = stackP;

    // Helper for rotated isometric text parallel to diamond edges
    function drawIsoText(lines, px, py) {
      ctx.save();
      if (typeof ctx.translate === 'function' && typeof ctx.rotate === 'function') {
        ctx.translate(X(px), Y(py));
        ctx.rotate(isoAngle);
        lines.forEach((ln) => {
          ctx.font = ln.font || '600 16px "Prompt", sans-serif';
          ctx.fillStyle = ln.color || '#0f172a';
          ctx.fillText(ln.text, ln.dx || 0, ln.dy || 0);
        });
      } else {
        lines.forEach((ln) => {
          ctx.font = ln.font || '600 16px "Prompt", sans-serif';
          ctx.fillStyle = ln.color || '#0f172a';
          ctx.fillText(ln.text, X(px) + (ln.dx || 0), Y(py) + (ln.dy || 0));
        });
      }
      ctx.restore();
    }

    // Layer 5 (Bottom-most polygon): Sourcing & Production (Dark Charcoal #3b3838)
    const poly5 = [
      [784.6, 853.4], [882.4, 911.7], [886.4, 940.2], [963.1, 985.5],
      [1146.8, 875.4], [1078.1, 835.3], [1072.8, 805.5], [977.6, 749.8],
      [965.7, 743.3], [783.3, 849.5]
    ];
    drawPoly(poly5, '#3b3838', '#ff9557', 3.5);

    // PO Document Scroll Icon on Sourcing Wing
    const imPoDoc = loadImage('assets/ver3/slide13_imp/pic_141_image74.png');
    if (imPoDoc && imPoDoc.complete && imPoDoc.naturalWidth) {
      ctx.drawImage(imPoDoc, X(807.3), Y(850.0), 50, 60);
    }

    // Text on Layer 5: Sourcing > Vendor / Production > Smart Board Machine > Picking Part to Assembly
    drawIsoText([
      { text: 'Sourcing', font: '700 20px "Prompt", sans-serif', color: '#ffffff', dx: 0, dy: 0 },
      { text: '> Vendor', font: '400 16.5px "Prompt", sans-serif', color: '#e2e8f0', dx: 18, dy: 21 },
      { text: 'Production', font: '700 20px "Prompt", sans-serif', color: '#ffffff', dx: 44, dy: 54 },
      { text: '> Smart Board Machine', font: '400 16px "Prompt", sans-serif', color: '#e2e8f0', dx: 52, dy: 74 },
      { text: '> Picking Part to Assembly', font: '400 16px "Prompt", sans-serif', color: '#e2e8f0', dx: 56, dy: 93 }
    ], 868, 856);

    // Layer 4: DWG > Assembly > Detail > Smart Board Cutting Machine
    const poly4 = [
      [969.1, 834.0], [790.3, 730.7], [963.4, 630.1], [1142.2, 733.4]
    ];
    drawPoly(poly4, 'rgba(226, 224, 223, 0.90)', '#ff9557', 3.5);
    drawIsoText([
      { text: 'DWG', font: '700 21px "Prompt", sans-serif', color: '#0f172a', dx: 0, dy: 0 },
      { text: '> Assembly', font: '500 19.5px "Prompt", sans-serif', color: '#0f172a', dx: 22, dy: 22 },
      { text: '> Detail', font: '500 19.5px "Prompt", sans-serif', color: '#0f172a', dx: 36, dy: 44 },
      { text: '> Smart Board', font: '500 18.5px "Prompt", sans-serif', color: '#0f172a', dx: 50, dy: 66 },
      { text: 'Cutting Machine', font: '700 16.5px "Prompt", sans-serif', color: '#0f172a', dx: 74, dy: 86 }
    ], 885, 725);

    // Layer 3b: Upload New*Data Base (Lower-Right Half-Diamond)
    const poly3b = [
      [945.8, 699.5], [865.3, 653.0], [1038.4, 552.4], [1118.9, 598.9]
    ];
    drawPoly(poly3b, 'rgba(226, 224, 223, 0.90)', '#ff9557', 3.5);
    drawIsoText([
      { text: 'Upload', font: '400 18px "Prompt", sans-serif', color: '#1e293b', dx: 0, dy: 0 },
      { text: 'New*Data Base', font: '700 22px "Prompt", sans-serif', color: '#0f172a', dx: 12, dy: 24 }
    ], 926, 646);

    // Layer 3a: Generate Exiting Data Base (Upper-Left Half-Diamond)
    const poly3a = [
      [868.6, 636.1], [788.1, 589.6], [961.2, 489.0], [1041.7, 535.5]
    ];
    drawPoly(poly3a, 'rgba(226, 224, 223, 0.90)', '#ff9557', 3.5);
    drawIsoText([
      { text: 'Generate Exiting', font: '400 15.5px "Prompt", sans-serif', color: '#1e293b', dx: 0, dy: 0 },
      { text: 'Data Base', font: '700 22.5px "Prompt", sans-serif', color: '#0f172a', dx: 4, dy: 24 }
    ], 858, 576);

    // Layer 2: BOM (Translucent Diamond)
    const poly2 = [
      [969.1, 522.4], [790.3, 419.1], [963.4, 318.5], [1142.2, 421.8]
    ];
    drawPoly(poly2, 'rgba(148, 189, 177, 0.42)', '#ff9557', 3.5);
    drawIsoText([
      { text: 'BOM', font: '700 25px "Prompt", sans-serif', color: '#0f172a', dx: 0, dy: 0 }
    ], 942, 438);

    // Layer 1 (Top-most Diamond): Floorplan
    const poly1 = [
      [969.1, 389.7], [790.3, 286.4], [963.4, 185.8], [1142.2, 289.1]
    ];
    drawPoly(poly1, '#d6d3d2', '#ff9557', 3.5);
    drawIsoText([
      { text: 'Floorplan', font: '700 25px "Prompt", sans-serif', color: '#0f172a', dx: 0, dy: 0 }
    ], 915, 308);

    // Top-Left Isometric Header: SALE TEAM (Account Executive)
    drawIsoText([
      { text: 'SALE TEAM', font: '700 23px "Prompt", sans-serif', color: '#0f172a', dx: 0, dy: 0 },
      { text: '(Account Executive)', font: '700 18px "Prompt", sans-serif', color: '#0f172a', dx: 12, dy: 23 }
    ], 790, 224);

    // Bottom Tip Label: Customer
    drawIsoText([
      { text: 'Customer', font: '700 23px "Prompt", sans-serif', color: '#0f172a', dx: 0, dy: 0 }
    ], 1020, 978);

    // Isometric Document Icon on Right Corner of Floorplan (Group 58)
    if (typeof ctx.beginPath === 'function') {
      const dx0 = X(1095.8), dy0 = Y(281.0);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(dx0, dy0 + 8);
      ctx.lineTo(dx0 + 14, dy0 + 14);
      ctx.lineTo(dx0 + 12, dy0);
      ctx.lineTo(dx0 + 40, dy0 + 14);
      ctx.lineTo(dx0 + 40, dy0 + 82);
      ctx.lineTo(dx0, dy0 + 62);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Isometric 3-Spreadsheet Stack + Excel Icon on BOM (Group 49) & Step 02 (Group 66)
    const imExcel = loadImage('assets/ver3/slide13_imp/pic_78_image38.png');
    drawIsoSpreadsheetStack(X(1061.0), Y(435.0));
    if (imExcel && imExcel.complete && imExcel.naturalWidth) {
      ctx.drawImage(imExcel, X(1105.0), Y(432.0), 44, 44);
    }

    drawIsoSpreadsheetStack(X(607.7), Y(795.0));
    if (imExcel && imExcel.complete && imExcel.naturalWidth) {
      ctx.drawImage(imExcel, X(647.0), Y(812.0), 44, 44);
    }
    ctx.font = '700 19px "Prompt", sans-serif';
    ctx.fillStyle = '#ff9557';
    ctx.fillText('Manual', X(687.0), Y(791));
    ctx.font = '700 16px "Prompt", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('CSV. Data Base', X(687.0), Y(813));

    // 6 Orange Downward Triangles (▼ with black borders) connecting the stack
    const stackTriangles = [
      [1025.8, 372.3],
      [835.4,  540.2],
      [1025.8, 536.1],
      [1049.3, 660.5],
      [1047.5, 769.5],
      [1065.4, 920.3]
    ];
    stackTriangles.forEach(([tx, ty], idx) => {
      const bounce = isSettled ? 0 : (Math.sin(t * 3.2 - idx * 0.6) * 2.5);
      drawDownTriangle(X(tx), Y(ty) + bounce, 20, 32, '#ff9557', '#0f172a', 2.8, 0);
    });

    ctx.restore();

    // -------------------------------------------------------------
    // 5. Right Column: Improvement (Logic Ruby SketchUp + 3D SMART BOARD)
    // -------------------------------------------------------------
    const rightP = easeOutCubic((t - 0.25) / 0.5);
    ctx.save();
    ctx.globalAlpha = rightP;

    // Label: Improvement
    ctx.fillStyle = '#bbff6c';
    ctx.font = '700 20.5px "Prompt", sans-serif';
    ctx.fillText('Improvement', X(1105.0), Y(172));

    // Right-aligned text left of Green Box: Automate / Gridline / Panel / Frame / Smart Board
    ctx.fillStyle = '#1e293b';
    ctx.font = '400 20px "Prompt", sans-serif';
    ctx.textAlign = 'right';
    const autoListX = X(1264.0);
    ctx.fillText('Automate', autoListX, Y(232));
    ctx.fillText('Gridline', autoListX, Y(257));
    ctx.fillText('Panel', autoListX, Y(282));
    ctx.fillText('Frame', autoListX, Y(307));
    ctx.fillText('Smart Board', autoListX, Y(332));
    ctx.textAlign = 'left';

    // Rounded Translucent Teal-Green Container (Rectangle: Rounded Corners 2)
    drawRoundedBox(X(1277.2), Y(56.0), W(304.6), H(584.7), 38, 'rgba(41, 175, 140, 0.30)', '#29af8c', 2);

    // Inside Left Label: Logic / Ruby / SketchUp
    ctx.fillStyle = '#bbff6c';
    ctx.textAlign = 'center';
    ctx.font = '700 19px "Prompt", sans-serif';
    ctx.fillText('Logic', X(1318.0), Y(258));
    ctx.font = '600 15.5px "Prompt", sans-serif';
    ctx.fillText('Ruby', X(1318.0), Y(278));
    ctx.font = '600 16.5px "Prompt", sans-serif';
    ctx.fillText('SketchUp', X(1318.0), Y(298));
    ctx.textAlign = 'left';

    // Top 3-Column Rule Diagram (pic_81_image70.png)
    const imRuleTop = loadImage('assets/ver3/slide13_imp/pic_81_image70.png');
    if (imRuleTop && imRuleTop.complete && imRuleTop.naturalWidth) {
      ctx.drawImage(imRuleTop, X(1364.0), Y(162.1), W(179.5), H(163.5));
    }

    // Middle 3-Column Wall/Window Diagram (pic_82_image70.png)
    const imRuleBot = loadImage('assets/ver3/slide13_imp/pic_82_image70.png');
    if (imRuleBot && imRuleBot.complete && imRuleBot.naturalWidth) {
      ctx.drawImage(imRuleBot, X(1363.6), Y(420.1), W(181.3), H(163.5));
    }

    // Vertical (-90 deg) Column Headers above Top & Middle Diagrams
    function drawVerticalHeader(lines, px, py) {
      ctx.save();
      if (typeof ctx.translate === 'function' && typeof ctx.rotate === 'function') {
        ctx.translate(X(px), Y(py));
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '500 13.5px "Prompt", sans-serif';
        lines.forEach((txt, i) => {
          ctx.fillText(txt, 0, i * 15);
        });
      }
      ctx.restore();
    }

    // Top Vertical Headers
    drawVerticalHeader(['Detecting', 'Wall / Panel'], 1390, 154);
    drawVerticalHeader(['Gridline'], 1455, 154);
    drawVerticalHeader(['Coding'], 1510, 154);

    // Middle Vertical Headers
    drawVerticalHeader(['Frame DWG', 'for Assembly'], 1390, 415);
    drawVerticalHeader(['GEN', 'Smart Board'], 1450, 415);
    drawVerticalHeader(['Window', 'Panel'], 1510, 415);

    // Isometric DATA Document Icon (Group 84) + "DATA" Label
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 16.5px "Prompt", sans-serif';
    ctx.fillText('DATA', X(1294.0), Y(412));

    if (typeof ctx.beginPath === 'function') {
      const dx = X(1293.1), dy = Y(422.0), dw = W(59.2), dh = H(124.0);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx + dw, dy + 32);
      ctx.lineTo(dx + dw, dy + dh);
      ctx.lineTo(dx, dy + dh - 32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 8 Isometric horizontal lines inside DATA document
      ctx.lineWidth = 2.2;
      const lineLens = [0.55, 0.35, 0.55, 0.78, 0.78, 0.62, 0.62, 0.78];
      lineLens.forEach((ratio, idx) => {
        const ly = dy + 16 + idx * 10.5;
        ctx.beginPath();
        ctx.moveTo(dx + 9, ly);
        ctx.lineTo(dx + 9 + (dw - 16) * ratio, ly + 32 * ratio);
        ctx.stroke();
      });
      ctx.restore();

      // Thick bright lime-green arrow pointing from DATA into Middle Diagram
      ctx.save();
      ctx.fillStyle = '#bbff6c';
      ctx.beginPath();
      ctx.moveTo(X(1312), Y(428));
      ctx.lineTo(X(1352), Y(406));
      ctx.lineTo(X(1345), Y(400));
      ctx.lineTo(X(1375), Y(406));
      ctx.lineTo(X(1366), Y(426));
      ctx.lineTo(X(1359), Y(420));
      ctx.lineTo(X(1322), Y(444));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Bottom Label inside Green Container: Auto Generate Item Part (Data Base)
    ctx.fillStyle = '#f8fafc';
    ctx.font = '400 18.5px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Auto Generate Item Part', X(1441.0), Y(606));
    ctx.fillText('(Data Base)', X(1441.0), Y(629));
    ctx.textAlign = 'left';

    // Bottom-Right 3D Cutaway Wall Assembly (Group 97: pic_99_image71.png)
    const im3dWall = loadImage('assets/ver3/slide13_imp/pic_99_image71.png');
    if (im3dWall && im3dWall.complete && im3dWall.naturalWidth) {
      ctx.drawImage(im3dWall, X(1265.3), Y(647.2), W(346.1), H(324.2));
    }

    // Vertical white text "SMART BOARD" on the gray floating slab inside Group 97
    ctx.save();
    if (typeof ctx.translate === 'function' && typeof ctx.rotate === 'function') {
      ctx.translate(X(1396.0), Y(808.0));
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 16px "Prompt", sans-serif';
      ctx.fillText('SMART BOARD', 0, 0);
    }
    ctx.restore();

    // Red & Green Callout Triangles on 3D Wall Cutaway (stops bouncing at 10s)
    const triPulse = isSettled ? 0 : (Math.sin(t * 4) * 2);
    drawDownTriangle(X(1394.6), Y(643.5) - triPulse, 14, 18, '#ff0000', '#0f172a', 1.5, 240);
    drawDownTriangle(X(1431.2), Y(661.9) - triPulse, 14, 18, '#ff0000', '#0f172a', 1.5, 240);
    drawDownTriangle(X(1360.6), Y(733.2), 14, 18, '#ff0000', '#0f172a', 1.5, 240);
    drawDownTriangle(X(1311.4), Y(753.9), 14, 18, '#ff0000', '#0f172a', 1.5, 60);
    drawDownTriangle(X(1294.8), Y(863.9) + triPulse, 14, 18, '#00b050', null, 0, 60);
    drawDownTriangle(X(1371.6), Y(908.9) + triPulse, 14, 18, '#00b050', null, 0, 60);
    drawDownTriangle(X(1449.1), Y(955.9) + triPulse, 14, 18, '#00b050', null, 0, 60);

    // Group 4: Isometric Gray/Orange Switch Panel to the left of 3D Cutaway
    if (typeof ctx.beginPath === 'function') {
      const gx = X(1233.2), gy = Y(696.0), gw = W(35.0), gh = H(167.9);
      ctx.save();
      ctx.fillStyle = '#808080';
      ctx.strokeStyle = '#ff9557';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + gw, gy + 22);
      ctx.lineTo(gx + gw, gy + gh);
      ctx.lineTo(gx, gy + gh - 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3 small orange switch boxes inside Group 4
      [0, 12, 24].forEach((oy) => {
        const bx = gx + gw * 0.35;
        const by = gy + 48 + oy;
        ctx.fillStyle = '#ff9557';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + 12, by + 6);
        ctx.lineTo(bx + 12, by + 14);
        ctx.lineTo(bx, by + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }

    // Label above Group 4: Easy 3D CHECK
    ctx.textAlign = 'center';
    ctx.font = '700 18.5px "Prompt", sans-serif';
    ctx.fillStyle = '#bbff6c';
    ctx.fillText('Easy', X(1265.0), Y(666));
    ctx.font = '400 18.5px "Prompt", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('3D', X(1265.0), Y(688));
    ctx.fillText('CHECK', X(1265.0), Y(710));

    // AutoCAD Icon (Right Side) + Labels: Automate Assembly DWG 2D / Automate Plug Switch Smart Board / Auto Generate PO
    if (imCad && imCad.complete && imCad.naturalWidth) {
      ctx.drawImage(imCad, X(1157.3), Y(702.3), 48, 48);
    }

    ctx.font = '700 19px "Prompt", sans-serif';
    ctx.fillStyle = '#bbff6c';
    ctx.fillText('Automate', X(1165.0), Y(666));
    ctx.font = '400 18px "Prompt", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('Assembly DWG 2D', X(1165.0), Y(688));

    ctx.font = '700 18.5px "Prompt", sans-serif';
    ctx.fillStyle = '#bbff6c';
    ctx.fillText('Automate', X(1165.0), Y(768));
    ctx.font = '400 18px "Prompt", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('Plug Switch', X(1165.0), Y(790));
    ctx.fillText('Smart Board', X(1165.0), Y(812));

    ctx.font = '700 19.5px "Prompt", sans-serif';
    ctx.fillStyle = '#bbff6c';
    ctx.fillText('Auto Generate', X(1185.0), Y(882));
    ctx.fillStyle = '#0f172a';
    ctx.fillText('PO', X(1185.0), Y(906));
    ctx.textAlign = 'left';

    ctx.restore();

    // -------------------------------------------------------------
    // 6. All Connecting Arrows & Animated Energy Pathways
    // -------------------------------------------------------------
    ctx.save();
    // --- LEFT (ORANGE / MANUAL) ARROWS ---
    // 1. Floorplan -> Step 01 Manual BOM on DWG (Solid Orange Arrow)
    drawArrowLine([[870.6, 310.5], [659.1, 310.5]], '#ff9557', 3.5, 14, null, '#ff9557', 95);

    // 2. Step 02 Input Data -> BOM (Dashed Orange Elbow Connector)
    drawArrowLine([[673.9, 620.9], [697.7, 620.9], [697.7, 451.4], [895.9, 451.4]], '#ff9557', 2.8, 13, [4, 4], '#ff9557', 85);

    // 3. Manual CSV. Data Base -> Generate Exiting Data Base (Dashed Orange Diagonal)
    drawArrowLine([[672.6, 801.0], [672.6, 772.4], [907.5, 645.2]], '#ff9557', 2.8, 13, [4, 4], '#ff9557', 80);

    // 4. Manual Assembly DWG -> DWG Diamond (Dashed Orange Diagonal)
    drawArrowLine([[724.6, 936.5], [724.6, 860.3], [911.4, 759.0]], '#ff9557', 2.8, 13, [4, 4], '#ff9557', 80);

    // 5. Sourcing > Vendor -> Manual PO (Dashed Orange Short Line)
    drawArrowLine([[885.0, 882.0], [835.0, 912.0]], '#ff9557', 2.8, 12, [4, 4], null, 0);

    // --- RIGHT (LIME-GREEN / AUTOMATE) ARROWS ---
    // 1. Floorplan -> Improvement Logic Box (Solid Bright Lime-Green Arrow)
    drawArrowLine([[966.2, 203.2], [966.2, 194.0], [1318.2, 194.0]], '#bbff6c', 3.8, 15, null, '#bbff6c', 150);

    // 2. Top Rule Diagram -> Middle Wall/Window Diagram (Solid Downward Lime-Green Arrow)
    drawArrowLine([[1460.0, 326.0], [1460.0, 416.0]], '#bbff6c', 3.2, 13, null, '#bbff6c', 120);

    // 3. Auto Generate Item Part -> BOM Excel Icon (Dotted Lime-Green V-Connector + Tilted Label)
    drawArrowLine([[1285.8, 535.0], [1202.0, 588.0], [1118.0, 515.0]], '#bbff6c', 2.8, 13, [4, 4], '#bbff6c', 130);

    // Tilted (+24.4 deg) Label: Automate / CSV Database
    ctx.save();
    if (typeof ctx.translate === 'function' && typeof ctx.rotate === 'function') {
      ctx.translate(X(1182.0), Y(498.0));
      ctx.rotate(-isoAngle);
      ctx.fillStyle = '#bbff6c';
      ctx.font = '700 19px "Prompt", sans-serif';
      ctx.fillText('Automate', 0, 0);
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 16px "Prompt", sans-serif';
      ctx.fillText('CSV Database', -6, 20);
    }
    ctx.restore();

    // 4. BOM Excel Icon -> Upload New*Data Base (Dotted Lime-Green Elbow)
    drawArrowLine([[1108.0, 526.0], [1057.0, 526.0], [1057.0, 578.0]], '#bbff6c', 2.8, 12, [4, 4], '#bbff6c', 110);

    // 5. Green Box Bottom -> 3D Wall Cutaway (Solid Downward Lime-Green Arrow)
    drawArrowLine([[1468.0, 640.7], [1468.0, 692.0]], '#bbff6c', 3.2, 13, null, '#bbff6c', 120);

    // 6. 3D Wall Cutaway -> Easy 3D CHECK -> A CAD -> DWG Diamond (3 Solid Leftward Lime-Green Arrows)
    drawArrowLine([[1402.3, 722.9], [1262.5, 722.9]], '#bbff6c', 3.2, 13, null, '#bbff6c', 140);
    drawArrowLine([[1233.0, 723.5], [1198.0, 723.5]], '#bbff6c', 3.2, 12, null, null, 0);
    drawArrowLine([[1154.4, 722.9], [1086.8, 722.9]], '#bbff6c', 3.2, 13, null, '#bbff6c', 140);

    // 7. Auto Generate PO -> Production (Dotted Lime-Green V-Connector)
    drawArrowLine([[1205.1, 867.5], [1081.3, 791.0], [990.8, 843.6]], '#bbff6c', 2.8, 13, [4, 4], '#bbff6c', 130);

    ctx.restore();
  }

  function drawSlide13ResultClips(ctx, app, x, y, w, h, clipT, nowSec, pal, helpers) {
    const { clamp, easeOutCubic, drawRoundedRect, fit } = helpers;
    const clipIdx = clipT < 5.0 ? 0 : (clipT < 10.0 ? 1 : 2);
    const localT = clamp(clipT - clipIdx * 5.0, 0, 5.0);
    const fadeIn = easeOutCubic(localT / 0.28);
    const fadeOut = localT > 4.72 ? clamp((5.0 - localT) / 0.28, 0, 1) : 1;
    const stageAlpha = Math.min(fadeIn, fadeOut);

    const metaList = [
      { code: 'CLIP 01 / 03', title: 'LEAD TIME COMPRESSION : 7 DAYS MANUAL ➔ 1 DAY ENGINE', accent: '#059669', soft: '#ECFDF5', pillFg: '#065F46', pill: '7d ➔ 1d' },
      { code: 'CLIP 02 / 03', title: 'CYCLE TIME SAVER : ลดเวลาทำงานออกแบบ & BOM รวม 86%', accent: '#D97706', soft: '#FFFBEB', pillFg: '#B45309', pill: '86% Saved' },
      { code: 'CLIP 03 / 03', title: 'ANNUAL COST REDUCTION : ประหยัดต้นทุนรวม 1.2M THB / YEAR', accent: '#059669', soft: '#ECFDF5', pillFg: '#065F46', pill: '1.2M THB' }
    ];
    const meta = metaList[clipIdx];

    ctx.save();
    // Clip Viewport Outer Shell (Clean White Studio Theme)
    ctx.shadowColor = 'rgba(15, 23, 42, 0.09)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    const shellGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    shellGrad.addColorStop(0.0, '#FFFFFF');
    shellGrad.addColorStop(0.65, '#FFFFFF');
    shellGrad.addColorStop(1.0, '#F8FAFC');
    drawRoundedRect(x, y, w, h, 18, shellGrad, meta.accent + '88', 1.6);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Clip Inner CAD Grid
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, 18);
    else ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = x + 32; gx < x + w; gx += 44) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
    for (let gy = y + 32; gy < y + h; gy += 44) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
    ctx.stroke();

    // Top Chrome Bar (h = 54)
    const barH = 54;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(x, y, w, barH);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(x, y + barH - 1, w, 1);

    // Left Live Pill + Animated Dot
    const pulseDot = 0.45 + 0.55 * Math.sin(nowSec * 6.5);
    drawRoundedRect(x + 20, y + 13, 134, 28, 14, meta.soft, meta.accent + '88', 1.1);
    ctx.fillStyle = meta.accent;
    ctx.beginPath();
    ctx.arc(x + 35, y + 27, 4.2 + pulseDot * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = meta.pillFg;
    fit(meta.code, x + 95, y + 31.5, 96, 13.5, '800', '"JetBrains Mono", monospace', 'center');

    // Clip Title
    ctx.fillStyle = '#0F172A';
    fit(meta.title, x + 168, y + 32.5, 548, 17.5, '800', '"Prompt", sans-serif', 'left');

    // Right Countdown + Clickable Phase Tabs
    const remSec = Math.max(0, 5.0 - localT).toFixed(1);
    drawRoundedRect(x + 730, y + 13, 86, 28, 14, '#FFFFFF', '#CBD5E1', 1);
    ctx.fillStyle = '#047857';
    fit(`⏱ ${remSec}s`, x + 773, y + 31.5, 74, 14, '800', '"JetBrains Mono", monospace', 'center');

    const tabs = [
      { label: '01 · 7→1d', targetT: 0.05, idx: 0, w: 78 },
      { label: '02 · 86%', targetT: 5.05, idx: 1, w: 74 },
      { label: '03 · 1.2M', targetT: 10.05, idx: 2, w: 78 },
      { label: 'รูปที่ 2 ▶', targetT: 15.05, idx: 3, w: 96 }
    ];
    let tx = x + 826;
    tabs.forEach((tb) => {
      const active = clipIdx === tb.idx;
      drawRoundedRect(tx, y + 13, tb.w, 28, 14, active ? meta.accent : '#FFFFFF', active ? meta.accent : '#CBD5E1', 1);
      ctx.fillStyle = active ? '#FFFFFF' : '#475569';
      fit(tb.label, tx + tb.w / 2, y + 31.5, tb.w - 10, 13.5, '800', '"Prompt", sans-serif', 'center');
      app._v3ResultsHits.push({ x: tx, y: y + 13, w: tb.w, h: 28, targetT: tb.targetT });
      tx += tb.w + 6;
    });

    // Main Clip Canvas Area (y + 62 .. y + h - 46)
    const stageX = x + 24;
    const stageY = y + 66;
    const stageW = w - 48;
    const stageH = h - 118;

    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * stageAlpha;

    if (clipIdx === 0) {
      // === CLIP 1 (0..5s): LEAD TIME COMPRESSION 7 DAYS -> 1 DAY ===
      const p1 = clamp(localT / 5.0, 0, 1);
      const waveP = easeOutCubic(clamp((localT - 1.0) / 2.3, 0, 1));

      // Section Label Top
      drawRoundedRect(stageX, stageY, 412, 30, 8, '#FEF2F2', '#FCA5A5', 1);
      ctx.fillStyle = '#B91C1C';
      fit('BEFORE · MANUAL WORKFLOW (7 WORK DAYS · 56 HRS)', stageX + 206, stageY + 19.5, 392, 13.5, '800', '"Prompt", sans-serif', 'center');

      drawRoundedRect(stageX + stageW - 244, stageY, 244, 30, 8, waveP > 0.5 ? '#ECFDF5' : '#FFFBEB', waveP > 0.5 ? '#10B981' : '#F59E0B', 1);
      ctx.fillStyle = waveP > 0.5 ? '#047857' : '#B45309';
      fit(waveP > 0.5 ? '✓ -6 DAYS ELIMINATED' : '⚡ ANALYZING BOTTLENECKS', stageX + stageW - 122, stageY + 19.5, 224, 13.5, '800', '"Prompt", sans-serif', 'center');

      const days = [
        { d: 'DAY 1', l1: 'แปลนสถาปัตย์', l2: '& กฎ P-Rule' },
        { d: 'DAY 2', l1: 'ขึ้นโมเดล C75', l2: 'ทีละผนังเอง' },
        { d: 'DAY 3', l1: 'วัดเจาะช่อง EE', l2: 'ปลั๊ก/สวิตช์' },
        { d: 'DAY 4', l1: 'ถอด BOM เหล็ก', l2: 'ลง Excel เอง' },
        { d: 'DAY 5', l1: 'เขียน 2D Shop', l2: 'Drawing แยกแผง' },
        { d: 'DAY 6', l1: 'ออก Job Order', l2: '& CNC .DXF' },
        { d: 'DAY 7', l1: 'Cross-Check', l2: '& แก้แบบซ้ำ' }
      ];
      const dayGap = 12;
      const dayW = (stageW - dayGap * 6) / 7;
      const dayY = stageY + 38;
      const dayH = 122;

      // Glowing compression sweep x position (Day 7 -> Day 1)
      const sweepIdx = 6 - waveP * 5.2;

      days.forEach((item, idx) => {
        const dx = stageX + idx * (dayW + dayGap);
        const appearP = easeOutCubic(clamp((localT - idx * 0.11) / 0.35, 0, 1));
        const eliminated = idx > 0 && idx >= sweepIdx;
        ctx.save();
        ctx.globalAlpha *= appearP * (eliminated ? 0.65 : 1);
        const bgCol = idx === 0 ? '#ECFDF5' : (eliminated ? '#F8FAFC' : '#FEF2F2');
        const brCol = idx === 0 ? '#10B981' : (eliminated ? '#CBD5E1' : '#FCA5A5');
        drawRoundedRect(dx, dayY, dayW, dayH, 12, bgCol, brCol, idx === 0 ? 1.8 : 1.1);

        drawRoundedRect(dx + 10, dayY + 10, 62, 22, 6, idx === 0 ? '#059669' : (eliminated ? '#E2E8F0' : '#FEE2E2'), null, 0);
        ctx.fillStyle = idx === 0 ? '#FFFFFF' : (eliminated ? '#475569' : '#991B1B');
        fit(item.d, dx + 41, dayY + 25.5, 54, 13, '800', '"JetBrains Mono", monospace', 'center');

        if (idx > 0 && !eliminated) {
          ctx.fillStyle = '#DC2626';
          fit('MANUAL', dx + dayW - 10, dayY + 25.5, 62, 12.5, '700', '"JetBrains Mono", monospace', 'right');
        } else if (idx === 0) {
          ctx.fillStyle = '#047857';
          fit('TARGET', dx + dayW - 10, dayY + 25.5, 62, 12.5, '700', '"JetBrains Mono", monospace', 'right');
        }

        ctx.fillStyle = eliminated ? '#475569' : '#0F172A';
        fit(item.l1, dx + 10, dayY + 65, dayW - 20, 16.5, '700', '"Prompt", sans-serif', 'left');
        ctx.fillStyle = eliminated ? '#64748B' : '#475569';
        fit(item.l2, dx + 10, dayY + 90, dayW - 20, 15.5, '500', '"Prompt", sans-serif', 'left');

        if (eliminated) {
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(dx + 12, dayY + dayH - 16);
          ctx.lineTo(dx + dayW - 12, dayY + 40);
          ctx.stroke();
        }
        ctx.restore();
      });

      // Compression Wave Beam across Days 2..7
      if (waveP > 0.04 && waveP < 0.96) {
        const beamX = stageX + (sweepIdx + 0.5) * (dayW + dayGap);
        const beamGrad = ctx.createLinearGradient(beamX - 24, 0, beamX + 24, 0);
        beamGrad.addColorStop(0, 'rgba(16,185,129,0)');
        beamGrad.addColorStop(0.5, 'rgba(16,185,129,0.45)');
        beamGrad.addColorStop(1, 'rgba(16,185,129,0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(Math.max(stageX, beamX - 24), dayY - 4, 48, dayH + 8);
      }

      // Middle Conduit: OTF Input -> AutoBOM Ruby Engine
      const midY = stageY + 178;
      drawRoundedRect(stageX + 218, midY, stageW - 436, 46, 23, '#ECFDF5', '#10B981', 1.4);
      ctx.fillStyle = '#065F46';
      fit('⚡  QHeim_AutoBOM.rb Engine  ·  Single Model 5-Stream Parallel Execution', stageX + stageW / 2, midY + 29, stageW - 476, 15, '800', '"Prompt", sans-serif', 'center');

      // Animated Particle Flow into Bottom Box
      for (let pi = 0; pi < 5; pi++) {
        const py = midY + 46 + ((nowSec * 36 + pi * 9) % 24);
        ctx.fillStyle = 'rgba(5, 150, 105, 0.85)';
        ctx.beginPath();
        ctx.arc(stageX + stageW / 2 + (pi - 2) * 86, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bottom Hero Box: AFTER DAY 1 AUTOMATED ENGINE
      const aftY = stageY + 244;
      const aftH = stageH - 244;
      drawRoundedRect(stageX, aftY, stageW, aftH, 16, '#F8FAFC', '#10B981', 1.8);

      // Left Hero Metric inside After Box
      const heroW = 340;
      drawRoundedRect(stageX + 20, aftY + 18, heroW, aftH - 36, 14, '#ECFDF5', '#10B98188', 1.3);
      drawRoundedRect(stageX + 38, aftY + 34, 214, 28, 14, '#059669', null, 0);
      ctx.fillStyle = '#FFFFFF';
      fit('AFTER · DAY 1 READY', stageX + 145, aftY + 52.5, 194, 13.5, '900', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#0F172A';
      fit('1 DAY', stageX + 38, aftY + 124, 190, 56, '900', '"Prompt", sans-serif', 'left');
      ctx.fillStyle = '#047857';
      fit('Engine Run ≤ 2 Min', stageX + 38, aftY + 160, 290, 19.5, '800', '"JetBrains Mono", monospace', 'left');
      ctx.fillStyle = '#334155';
      fit('ขึ้นโมเดล C75 + ถอด BOM + 2D + CNC พร้อมกัน', stageX + 38, aftY + 190, 304, 15.5, '500', '"Prompt", sans-serif', 'left');
      ctx.fillStyle = '#047857';
      fit('ความเร็วเพิ่มขึ้น 7 เท่า  ·  Zero Human Wait', stageX + 38, aftY + 216, 304, 15, '700', '"Prompt", sans-serif', 'left');

      // Right 5 Automated Streams Completing in Parallel
      const streams = [
        { code: '01', name: '3D Visualization (.SKP)', desc: 'C75 Structural Wall + EE Boxes', col: '#059669' },
        { code: '02', name: 'Part Items BOM (.XLSX)', desc: 'Auto Material Take-Off -> MRP PO', col: '#D97706' },
        { code: '03', name: 'Job Order Sheet (.PDF)', desc: 'Production Line Picking List S238', col: '#2563EB' },
        { code: '04', name: '2D Shop Drawing (.DWG)', desc: 'Auto Wall Assembly Layout (±1mm)', col: '#0D9488' },
        { code: '05', name: 'SB List & CNC (.DXF)', desc: 'CAD EE Punching & Bending Path', col: '#9333EA' }
      ];
      const stX = stageX + heroW + 38;
      const stW = stageW - heroW - 58;
      const rowH = (aftH - 36 - 24) / 5;

      streams.forEach((st, idx) => {
        const sy = aftY + 18 + idx * (rowH + 6);
        const prog = easeOutCubic(clamp((localT - 1.15 - idx * 0.32) / 1.15, 0, 1));
        drawRoundedRect(stX, sy, stW, rowH, 10, '#FFFFFF', prog >= 0.98 ? st.col : '#E2E8F0', 1.2);

        drawRoundedRect(stX + 10, sy + (rowH - 26) / 2, 34, 26, 7, st.col + '18', st.col, 1);
        ctx.fillStyle = st.col;
        fit(st.code, stX + 27, sy + rowH / 2 + 5.5, 28, 14, '900', '"JetBrains Mono", monospace', 'center');

        ctx.fillStyle = '#0F172A';
        fit(st.name, stX + 54, sy + rowH / 2 + 5.5, 240, 16.5, '700', '"Prompt", sans-serif', 'left');

        // Animated progress bar
        const barX = stX + 306;
        const barW = stW - 432;
        const barY = sy + rowH / 2 - 4;
        drawRoundedRect(barX, barY, barW, 8, 4, '#E2E8F0', null, 0);
        if (prog > 0.01) {
          drawRoundedRect(barX, barY, Math.max(8, barW * prog), 8, 4, st.col, null, 0);
        }

        if (prog >= 0.98) {
          drawRoundedRect(stX + stW - 110, sy + (rowH - 26) / 2, 96, 26, 8, '#ECFDF5', '#10B981', 1);
          ctx.fillStyle = '#047857';
          fit('✓ READY', stX + stW - 62, sy + rowH / 2 + 5.5, 84, 13.5, '800', '"JetBrains Mono", monospace', 'center');
        } else {
          ctx.fillStyle = '#475569';
          fit(`${Math.round(prog * 100)}%`, stX + stW - 62, sy + rowH / 2 + 5.5, 84, 14, '700', '"JetBrains Mono", monospace', 'center');
        }
      });

    } else if (clipIdx === 1) {
      // === CLIP 2 (5..10s): 86% CYCLE TIME SAVER ===
      const gaugeP = easeOutCubic(clamp(localT / 2.4, 0, 1));
      const gW = 414;
      drawRoundedRect(stageX, stageY, gW, stageH, 16, '#FFFFFF', '#F59E0B88', 1.5);

      drawRoundedRect(stageX + gW / 2 - 122, stageY + 20, 244, 28, 14, '#FEF3C7', '#F59E0B88', 1);
      ctx.fillStyle = '#B45309';
      fit('OVERALL EFFICIENCY GAIN', stageX + gW / 2, stageY + 38.5, 224, 13.5, '800', '"Prompt", sans-serif', 'center');

      // Radial Speedometer Arc (cx, cy)
      const cx = stageX + gW / 2;
      const cy = stageY + 202;
      const rad = 122;
      const startAng = 0.75 * Math.PI;
      const spanAng = 1.50 * Math.PI;
      const fillAng = startAng + spanAng * (0.86 * gaugeP);

      // Subtle dashed tick ring
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.14)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 10]);
      ctx.beginPath();
      ctx.arc(cx, cy, rad + 22, startAng, startAng + spanAng);
      ctx.stroke();
      ctx.setLineDash([]);

      // Track Arc
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, rad, startAng, startAng + spanAng);
      ctx.stroke();

      // Active Gradient Arc
      const arcGrad = ctx.createLinearGradient(cx - rad, cy, cx + rad, cy - rad);
      arcGrad.addColorStop(0.0, '#F59E0B');
      arcGrad.addColorStop(0.55, '#10B981');
      arcGrad.addColorStop(1.0, '#059669');
      ctx.strokeStyle = arcGrad;
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, startAng, fillAng);
      ctx.stroke();

      // Crisp Tip Dot
      const tipX = cx + Math.cos(fillAng) * rad;
      const tipY = cy + Math.sin(fillAng) * rad;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(5, 150, 105, 0.35)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();

      // Gauge Center Readout
      ctx.fillStyle = '#0F172A';
      fit(`${Math.round(86 * gaugeP)}%`, cx, cy + 12, 170, 62, '900', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#059669';
      fit('CYCLE TIME SAVED', cx, cy + 46, 178, 14.5, '800', '"JetBrains Mono", monospace', 'center');
      ctx.fillStyle = '#475569';
      fit('ประหยัดเวลากระบวนการออกแบบรวม', cx, cy + 118, 286, 15.5, '600', '"Prompt", sans-serif', 'center');

      // Bottom Before/After Comparison Boxes inside Gauge Panel
      const boxY = stageY + stageH - 134;
      drawRoundedRect(stageX + 20, boxY, 168, 110, 12, '#FEF2F2', '#FCA5A5', 1.1);
      ctx.fillStyle = '#B91C1C';
      fit('MANUAL BASELINE', stageX + 104, boxY + 26, 152, 13.5, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#0F172A';
      fit('56.0 hrs', stageX + 104, boxY + 64, 150, 26, '900', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#475569';
      fit('7 วัน / หลัง (ทำมือทั้งหมด)', stageX + 104, boxY + 92, 154, 13.5, '500', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#059669';
      fit('➔', stageX + gW / 2, boxY + 62, 26, 20, '900', '"Prompt", sans-serif', 'center');

      drawRoundedRect(stageX + gW - 188, boxY, 168, 110, 12, '#ECFDF5', '#10B981', 1.2);
      ctx.fillStyle = '#047857';
      fit('AUTO BOM SYSTEM', stageX + gW - 104, boxY + 26, 152, 13.5, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#0F172A';
      fit('7.8 hrs', stageX + gW - 104, boxY + 64, 150, 26, '900', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#065F46';
      fit('1 วัน / หลัง (-86% รวม QC)', stageX + gW - 104, boxY + 92, 154, 13.5, '500', '"Prompt", sans-serif', 'center');

      // Right Side: 5 Process Workstream Race Bars
      const rX = stageX + gW + 20;
      const rW = stageW - gW - 20;
      drawRoundedRect(rX, stageY, rW, stageH, 16, '#FFFFFF', '#CBD5E1', 1.3);
      ctx.fillStyle = '#0F172A';
      fit('TIME SAVED BY WORKSTREAM — เปรียบเทียบเวลาต่อแบบบ้าน 1 หลัง', rX + 24, stageY + 35, rW - 48, 18, '800', '"Prompt", sans-serif', 'left');

      const tracks = [
        { name: '01 · อ่านแปลน OTF & ตรวจกฎ P-Rule', before: '8.0 hrs', after: '0.5 min', ratio: 0.02, save: '-99%', col: '#059669' },
        { name: '02 · ขึ้นโครง 3D C75 & เจาะช่องไฟ EE', before: '16.0 hrs', after: '1.2 min', ratio: 0.03, save: '-99%', col: '#10B981' },
        { name: '03 · ถอดรายการ Part Items (BOM)', before: '12.0 hrs', after: '0.3 min', ratio: 0.02, save: '-99%', col: '#D97706' },
        { name: '04 · สร้างแบบประกอบ 2D Assembly DWG', before: '12.0 hrs', after: '2.5 hrs (Auto+QC)', ratio: 0.21, save: '-79%', col: '#0284C7' },
        { name: '05 · ออก Job Order & SB List (.DXF CNC)', before: '8.0 hrs', after: '0.5 hrs (Auto+QC)', ratio: 0.06, save: '-94%', col: '#7C3AED' }
      ];
      const trackGap = 12;
      const trackStartY = stageY + 54;
      const trackH = (stageH - 74 - trackGap * 4) / 5;

      tracks.forEach((tr, idx) => {
        const ty = trackStartY + idx * (trackH + trackGap);
        const rowP = easeOutCubic(clamp((localT - 0.35 - idx * 0.35) / 1.35, 0, 1));
        drawRoundedRect(rX + 20, ty, rW - 40, trackH, 12, '#F8FAFC', '#E2E8F0', 1);

        ctx.fillStyle = '#0F172A';
        fit(tr.name, rX + 36, ty + 29, rW - 216, 17, '700', '"Prompt", sans-serif', 'left');

        drawRoundedRect(rX + rW - 118, ty + 11, 82, 24, 12, tr.col + '18', tr.col, 1);
        ctx.fillStyle = tr.col;
        fit(tr.save, rX + rW - 77, ty + 27.5, 68, 14, '900', '"JetBrains Mono", monospace', 'center');

        // Full Before Track vs Dynamic Compressed Auto Track
        const tbX = rX + 36;
        const tbW = rW - 310;
        const tbY = ty + 48;
        drawRoundedRect(tbX, tbY, tbW, 12, 6, '#FEE2E2', '#FCA5A5', 0.8);
        const curRatio = 1 - (1 - tr.ratio) * rowP;
        drawRoundedRect(tbX, tbY, Math.max(12, tbW * curRatio), 12, 6, tr.col, null, 0);

        // Racing photon inside bar
        const rDotX = tbX + Math.max(8, tbW * curRatio) * ((nowSec * 1.1 + idx * 0.2) % 1);
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = tr.col;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rDotX, tbY + 6, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#334155';
        fit(`${tr.before} ➔ ${tr.after}`, rX + rW - 36, tbY + 11.5, 224, 15, '700', '"JetBrains Mono", monospace', 'right');
      });

    } else {
      // === CLIP 3 (10..15s): 1.2M THB / YEAR COST REDUCTION ===
      const curveP = easeOutCubic(clamp(localT / 3.0, 0, 1));
      const cW = 678;
      drawRoundedRect(stageX, stageY, cW, stageH, 16, '#FFFFFF', '#10B98188', 1.5);

      ctx.fillStyle = '#0F172A';
      fit('CUMULATIVE COST REDUCTION TRAJECTORY (12 MONTHS · 0 ➔ 1.2M THB)', stageX + 24, stageY + 34, cW - 190, 15.5, '800', '"Prompt", sans-serif', 'left');
      drawRoundedRect(stageX + cW - 160, stageY + 16, 138, 26, 13, '#ECFDF5', '#10B981', 1);
      ctx.fillStyle = '#047857';
      fit('TARGET: 1.2M/YR', stageX + cW - 91, stageY + 33, 122, 11, '800', '"JetBrains Mono", monospace', 'center');

      // Chart Plot Geometry
      const px = stageX + 76;
      const py = stageY + 84;
      const pw = cW - 136;
      const ph = stageH - 168;

      const yLevels = ['1.2M', '0.9M', '0.6M', '0.3M', '0 THB'];
      yLevels.forEach((lbl, i) => {
        const gy = py + (ph / 4) * i;
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, gy);
        ctx.lineTo(px + pw, gy);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        fit(lbl, px - 12, gy + 4.5, 62, 13.5, '700', '"JetBrains Mono", monospace', 'right');
      });

      const xLabels = ['START', 'Q1 (M1-M3)', 'Q2 (M4-M6)', 'Q3 (M7-M9)', 'Q4 (M10-M12)'];
      xLabels.forEach((lbl, i) => {
        const gx = px + (pw / 4) * i;
        ctx.fillStyle = '#475569';
        fit(lbl, gx, py + ph + 25, 118, 13.5, '700', '"JetBrains Mono", monospace', 'center');
      });

      // Smooth Cumulative Curve Path
      const steps = 40;
      const drawSteps = Math.max(1, Math.round(steps * curveP));
      const getPt = (u) => {
        // Gentle acceleration S-like ROI curve reaching 1.0 at u=1
        const val = Math.pow(u, 0.92) * 0.92 + Math.sin(u * Math.PI) * 0.08;
        return {
          x: px + pw * u,
          y: py + ph * (1 - clamp(val, 0, 1))
        };
      };

      // Area Gradient Fill underneath curve
      const areaGrad = ctx.createLinearGradient(0, py, 0, py + ph);
      areaGrad.addColorStop(0.0, 'rgba(16, 185, 129, 0.22)');
      areaGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.07)');
      areaGrad.addColorStop(1.0, 'rgba(16, 185, 129, 0.00)');

      ctx.beginPath();
      ctx.moveTo(px, py + ph);
      for (let i = 0; i <= drawSteps; i++) {
        const pt = getPt(i / steps);
        ctx.lineTo(pt.x, pt.y);
      }
      const tipPt = getPt(drawSteps / steps);
      ctx.lineTo(tipPt.x, py + ph);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Curve Line Stroke
      const lineGrad = ctx.createLinearGradient(px, py + ph, px + pw, py);
      lineGrad.addColorStop(0, '#059669');
      lineGrad.addColorStop(0.65, '#10B981');
      lineGrad.addColorStop(1, '#D97706');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= drawSteps; i++) {
        const pt = getPt(i / steps);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();

      // Quarter Milestones along Curve
      [0.25, 0.50, 0.75, 1.0].forEach((mU, mi) => {
        if (curveP >= mU - 0.02) {
          const mp = getPt(mU);
          ctx.fillStyle = mi === 3 ? '#D97706' : '#059669';
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, mi === 3 ? 7 : 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = mi === 3 ? '#B45309' : '#047857';
          const lblX = mi === 3 ? mp.x - 6 : mp.x;
          const lblY = mi === 3 ? mp.y + 22 : mp.y - 14;
          fit(['+0.3M', '+0.6M', '+0.9M', '1.2M ✓'][mi], lblX, lblY, 78, 14, '800', '"JetBrains Mono", monospace', 'center');
        }
      });

      // Live Tracking Marker Badge at tipPt
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.6;
      ctx.shadowColor = 'rgba(217, 119, 6, 0.35)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(tipPt.x, tipPt.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();

      const callX = clamp(tipPt.x - 154, px + 8, px + pw - 154);
      const callY = clamp(tipPt.y - 38, stageY + 50, py + ph - 38);
      drawRoundedRect(callX, callY, 138, 32, 8, '#FFFFFF', '#059669', 1.6);
      ctx.fillStyle = '#047857';
      fit(`${(1.2 * curveP).toFixed(2)}M THB`, callX + 69, callY + 21.5, 124, 15, '900', '"JetBrains Mono", monospace', 'center');

      // Chart Footnote Strip
      drawRoundedRect(stageX + 20, stageY + stageH - 54, cW - 40, 36, 10, '#ECFDF5', '#A7F3D0', 1);
      ctx.fillStyle = '#065F46';
      fit('✓ ลดต้นทุนแรงงานซ้ำซ้อน  ·  ตัดของเสียหน้างานจากผิดแบบ  ·  คืนทุนทันทีตั้งแต่งวดแรก', stageX + cW / 2, stageY + stageH - 30, cW - 52, 15.5, '600', '"Prompt", sans-serif', 'center');

      // Right Column: Hero Total + 3 Breakdown Drivers
      const bX = stageX + cW + 20;
      const bW = stageW - cW - 20;
      const heroGrad = ctx.createLinearGradient(bX, stageY, bX + bW, stageY + 132);
      heroGrad.addColorStop(0, '#FFFFFF');
      heroGrad.addColorStop(1, '#ECFDF5');
      drawRoundedRect(bX, stageY, bW, 132, 16, heroGrad, '#10B981', 1.6);

      ctx.fillStyle = '#047857';
      fit('ANNUAL COST REDUCTION TOTAL', bX + 24, stageY + 30, bW - 48, 14, '800', '"Prompt", sans-serif', 'left');
      ctx.fillStyle = '#0F172A';
      fit(`${(1.2 * curveP).toFixed(1)}M`, bX + 24, stageY + 90, 174, 52, '900', '"Prompt", sans-serif', 'left');
      drawRoundedRect(bX + 206, stageY + 54, 158, 34, 10, '#FFFBEB', '#F59E0B', 1.2);
      ctx.fillStyle = '#B45309';
      fit('THB / YEAR', bX + 285, stageY + 76.5, 144, 16, '900', '"JetBrains Mono", monospace', 'center');
      ctx.fillStyle = '#334155';
      fit('มูลค่าที่ประหยัดได้จริงต่อปีจาก Auto BOM', bX + 24, stageY + 119, bW - 48, 15, '500', '"Prompt", sans-serif', 'left');

      const drivers = [
        { code: '01', title: 'MAN-HOUR EFFICIENCY', val: 650, pct: 0.54, sub: 'ลดชั่วโมงเขียนแบบ & ถอด BOM ซ้ำซ้อน', col: '#059669' },
        { code: '02', title: 'REWORK & SCRAP ZEROING', val: 350, pct: 0.29, sub: 'ลดปัญหาสั่งเหล็กผิด / เจาะ EE คลาดเคลื่อน', col: '#D97706' },
        { code: '03', title: 'STANDARDIZATION SPEED', val: 200, pct: 0.17, sub: 'ลดเวลารอตรวจ Cross-Check ก่อนผลิต', col: '#0284C7' }
      ];
      const dStartY = stageY + 148;
      const dGap = 12;
      const dH = (stageH - 148 - dGap * 2) / 3;

      drivers.forEach((dr, di) => {
        const dy = dStartY + di * (dH + dGap);
        const dp = easeOutCubic(clamp((localT - 0.5 - di * 0.45) / 1.5, 0, 1));
        drawRoundedRect(bX, dy, bW, dH, 14, '#FFFFFF', dr.col + '66', 1.3);

        drawRoundedRect(bX + 16, dy + 14, 34, 24, 6, dr.col + '18', dr.col, 1);
        ctx.fillStyle = dr.col;
        fit(dr.code, bX + 33, dy + 30.5, 26, 13.5, '900', '"JetBrains Mono", monospace', 'center');

        ctx.fillStyle = '#0F172A';
        fit(dr.title, bX + 58, dy + 31.5, bW - 196, 15.5, '800', '"Prompt", sans-serif', 'left');

        ctx.fillStyle = dr.col;
        fit(`+${Math.round(dr.val * dp)}K`, bX + bW - 18, dy + 32, 114, 19, '900', '"JetBrains Mono", monospace', 'right');

        ctx.fillStyle = '#475569';
        fit(dr.sub, bX + 18, dy + 61, bW - 36, 15.5, '500', '"Prompt", sans-serif', 'left');

        const dbW = bW - 36;
        const dbY = dy + dH - 22;
        drawRoundedRect(bX + 18, dbY, dbW, 8, 4, '#E2E8F0', null, 0);
        drawRoundedRect(bX + 18, dbY, Math.max(8, dbW * dr.pct * dp), 8, 4, dr.col, null, 0);
      });
    }

    ctx.restore(); // restore stageAlpha

    // Bottom 3 x 5s Segment Progress Strip
    const footY = y + h - 38;
    const segLabels = ['01 · 7 Days → 1 Day (5s)', '02 · 86% Cycle Time (5s)', '03 · 1.2M Cost Saving (5s)'];
    const segW = 296;
    const segGap = 14;
    segLabels.forEach((lbl, si) => {
      const sx = x + 22 + si * (segW + segGap);
      const isCur = clipIdx === si;
      const isDone = clipIdx > si;
      const segFill = isDone ? 1 : (isCur ? clamp(localT / 5.0, 0, 1) : 0);

      ctx.fillStyle = isCur ? '#0F172A' : (isDone ? '#059669' : '#64748B');
      fit(lbl, sx, footY + 6, segW, 13.5, isCur ? '800' : '600', '"Prompt", sans-serif', 'left');
      drawRoundedRect(sx, footY + 13, segW, 7, 3.5, '#E2E8F0', null, 0);
      if (segFill > 0) {
        drawRoundedRect(sx, footY + 13, Math.max(6, segW * segFill), 7, 3.5, isCur ? meta.accent : '#10B981', null, 0);
      }
      app._v3ResultsHits.push({ x: sx, y: footY - 8, w: segW, h: 32, targetT: si * 5.0 + 0.05 });
    });

    // Destination Pill: 5 OUTPUTS (รูปที่ 2)
    const destX = x + w - 224;
    drawRoundedRect(destX, footY - 4, 202, 28, 14, clipT >= 13.5 ? '#059669' : '#ECFDF5', '#10B981', 1.1);
    ctx.fillStyle = clipT >= 13.5 ? '#FFFFFF' : '#047857';
    fit('NEXT ➔ 5 OUTPUTS (รูปที่ 2)', destX + 101, footY + 14, 186, 11.5, '800', '"Prompt", sans-serif', 'center');
    app._v3ResultsHits.push({ x: destX, y: footY - 4, w: 202, h: 28, targetT: 15.05 });

    ctx.restore();
    ctx.restore();
  }

  function drawSlide13ResultsScene(app, s) {
    const ctx = app.ctx;
    const nowSec = (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
    const slideId = (s && s.id) || 'v3-results';
    if (app._v3ResLastSlideId !== slideId) {
      app._v3ResLastSlideId = slideId;
      app._v3ResLastElapsed = app.slideElapsed || 0;
    }
    const curElapsed = app.slideElapsed || 0;
    if (!app.isPlaying && app._v3ResLastElapsed !== undefined && Math.abs(curElapsed - app._v3ResLastElapsed) > 0.35) {
      app._v3motionSeconds = curElapsed;
    }
    app._v3ResLastElapsed = curElapsed;

    const rawMotion = app._v3motionSeconds || 0;
    const t = app.v3MotionEnabled !== false
      ? (app.isPlaying ? curElapsed : Math.max(rawMotion, curElapsed))
      : (curElapsed > 0 ? curElapsed : 18);

    app._v3ResultsHits = [];

    if (app.canvas && !app.canvas._v3ResultsClickAttached) {
      app.canvas._v3ResultsClickAttached = true;
      app.canvas.addEventListener('click', (e) => {
        const cur = app.slides && app.slides[app.activeSlideIndex];
        if (!cur || cur.id !== 'v3-results' || !Array.isArray(app._v3ResultsHits)) return;
        const rect = app.canvas.getBoundingClientRect();
        if (!rect || !rect.width || !rect.height) return;
        const cx = (e.clientX - rect.left) * (1920 / rect.width);
        const cy = (e.clientY - rect.top) * (1080 / rect.height);
        for (const hit of app._v3ResultsHits) {
          if (cx >= hit.x && cx <= hit.x + hit.w && cy >= hit.y && cy <= hit.y + hit.h) {
            const slideStart = typeof app.getSlideStartTime === 'function' ? app.getSlideStartTime(app.activeSlideIndex) : 0;
            const targetT = hit.targetT;
            const nSec = (typeof performance !== 'undefined' && performance.now) ? performance.now() / 1000 : Date.now() / 1000;
            app._v3motionSeconds = targetT;
            app._v3lastMotion = nSec;
            app._v3ResLastElapsed = targetT;
            if (app.isPlaying && typeof app.seekTo === 'function') {
              app.seekTo(slideStart + targetT);
            } else {
              app.slideElapsed = targetT;
              if (typeof app.render === 'function') app.render();
            }
            return;
          }
        }
      });
    }

    function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }
    function easeOutCubic(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }

    function drawRoundedRect(x, y, w, h, r, fillColor, strokeColor, lineWidth) {
      ctx.save();
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      const rad = Math.min(r, Math.min(w, h) / 2);
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, rad);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.closePath();
      ctx.fill();
      if (strokeColor && lineWidth) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
      ctx.restore();
    }

    const fit = (txt, x, y, maxW, size, weight, family, align = 'left') => {
      if (typeof app.fillFittedText === 'function') {
        app.fillFittedText(ctx, txt, x, y, maxW, size, weight, family, align);
      } else {
        ctx.textAlign = align;
        ctx.font = `${weight} ${size}px ${family}`;
        ctx.fillText(txt, x, y);
        ctx.textAlign = 'left';
      }
    };

    const drawWrappedThai = (value, x, y, maxW, size, lineH, color, weight = '400') => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = `${weight} ${size}px "Prompt", "Segoe UI", sans-serif`;
      const rawTokens = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
        ? Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(value || ''), seg => seg.segment)
        : Array.from(value || '');
      // Keep opening/closing punctuation, numbers, and '%' attached so e.g. "(~86%)" never splits mid-token
      const tokens = [];
      for (const rt of rawTokens) {
        if (tokens.length && (/^[%)\]}.,:;!?]+$/.test(rt) || /^[(\[{[~]+$/.test(tokens[tokens.length - 1]))) {
          tokens[tokens.length - 1] += rt;
        } else {
          tokens.push(rt);
        }
      }
      const lines = [];
      let line = '';
      for (const tok of tokens) {
        if (line && ctx.measureText(line + tok).width > maxW) {
          lines.push(line.trimEnd());
          line = tok.trimStart();
        } else {
          line += tok;
        }
      }
      if (line) lines.push(line.trimEnd());
      lines.forEach((ln, idx) => ctx.fillText(ln, x, y + idx * lineH));
      ctx.restore();
      return y + lines.length * lineH;
    };

    // 1. Background (Supports Studio BG Picker + Default Clean SCG HEIM Two-Surface Layout)
    const pal = (typeof app.getCustomBackgroundPalette === 'function' && app.bgPreset && app.bgPreset !== 'default')
      ? app.getCustomBackgroundPalette('mint')
      : null;

    const hdrH = 132;
    if (pal && pal.stops) {
      const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
      pal.stops.forEach((col, i) => bgGrad.addColorStop(i / Math.max(1, pal.stops.length - 1), col));
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1920, 1080);

      const topBand = ctx.createLinearGradient(0, 0, 1920, 0);
      if (pal.isDark) {
        topBand.addColorStop(0, 'rgba(7, 15, 26, 0.56)');
        topBand.addColorStop(1, 'rgba(11, 24, 38, 0.48)');
      } else {
        topBand.addColorStop(0, 'rgba(14, 38, 31, 0.96)');
        topBand.addColorStop(1, 'rgba(22, 58, 47, 0.94)');
      }
      ctx.fillStyle = topBand;
      ctx.fillRect(0, 0, 1920, hdrH);
    } else {
      const lowGrad = ctx.createLinearGradient(0, hdrH, 1920, 1080);
      lowGrad.addColorStop(0.00, '#EEF5F2');
      lowGrad.addColorStop(0.55, '#E5F0EB');
      lowGrad.addColorStop(1.00, '#DCEAE4');
      ctx.fillStyle = lowGrad;
      ctx.fillRect(0, 0, 1920, 1080);

      const topGrad = ctx.createLinearGradient(0, 0, 1920, 0);
      topGrad.addColorStop(0.00, '#0E261F');
      topGrad.addColorStop(0.60, '#163A2F');
      topGrad.addColorStop(1.00, '#182C26');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, 1920, hdrH);
    }

    // Subtle Architectural CAD Grid Mesh
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx < 1920; gx += 48) { ctx.moveTo(gx, 0); ctx.lineTo(gx, hdrH); }
    for (let gy = 0; gy < hdrH; gy += 48) { ctx.moveTo(0, gy); ctx.lineTo(1920, gy); }
    ctx.stroke();

    ctx.strokeStyle = (pal && pal.isDark) ? 'rgba(255, 255, 255, 0.04)' : 'rgba(16, 62, 48, 0.045)';
    ctx.beginPath();
    for (let gx = 0; gx < 1920; gx += 48) { ctx.moveTo(gx, hdrH); ctx.lineTo(gx, 1080); }
    for (let gy = hdrH; gy < 1080; gy += 48) { ctx.moveTo(0, gy); ctx.lineTo(1920, gy); }
    ctx.stroke();
    ctx.restore();

    // Crisp Emerald Accent Divider below Header
    const hLine = ctx.createLinearGradient(0, hdrH, 1920, hdrH);
    hLine.addColorStop(0, '#F59E0B');
    hLine.addColorStop(0.4, '#10B981');
    hLine.addColorStop(1, '#2563EB');
    ctx.fillStyle = hLine;
    ctx.fillRect(0, hdrH - 4, 1920, 4);

    // Top-Right Page Counter Badge
    drawPageBadge(ctx, app);

    // 2. Top Header Banner
    const marginX = 56;
    const titleP = easeOutCubic(t / 0.45);
    ctx.save();
    ctx.globalAlpha = titleP;
    ctx.fillStyle = '#FFFFFF';
    fit('RESULT  |  Auto BOM System Development', marginX, 68, 1380, 42, '800', '"Prompt", sans-serif', 'left');

    ctx.fillStyle = '#A7F3D0';
    fit(':: End-to-End Value Creation from Design to Production & Installation', marginX, 105, 1380, 21, '500', '"Prompt", sans-serif', 'left');
    ctx.restore();

    // 3. Left Column: 4 Clean Executive Value Pillar Cards (x = 56..644, y = 164..1008)
    const pilP = easeOutCubic((t - 0.12) / 0.5);
    const leftX = marginX;
    const leftW = 588;
    const pilStartY = 164;
    const pilH = 196;
    const pilGap = 20;

    const pillars = [
      {
        code: '01',
        title: 'TIME REDUCTION',
        badge: '7 Days ➔ 1 Day (-86%)',
        accent: '#D97706',
        soft: '#FFFBEB',
        bullets: [
          'ลดเวลา BOM & DWG 7 วัน ➔ 1 วัน',
          'คำนวณ & ขึ้นโมเดล C75 อัตโนมัติ'
        ]
      },
      {
        code: '02',
        title: 'SKILL & KNOWLEDGE STANDARD',
        badge: 'Logic Standard',
        accent: '#059669',
        soft: '#ECFDF5',
        bullets: [
          'เปลี่ยนทักษะคน ➔ Logic มาตรฐาน',
          'ลดการพึ่งพาบุคคล ทำงานเป็นระบบ'
        ]
      },
      {
        code: '03',
        title: 'ERROR & LOSS REDUCTION',
        badge: 'Zero Rework',
        accent: '#2563EB',
        soft: '#EFF6FF',
        bullets: [
          'ตัดงาน Manual ซ้ำซ้อนด้วย Auto',
          'ข้อมูลแม่นยำ 100% ลดของเสีย'
        ]
      },
      {
        code: '04',
        title: 'AUTO OUTPUT & DATA SYNC',
        badge: 'Single Model Sync',
        accent: '#4F46E5',
        soft: '#EEF2FF',
        bullets: [
          'เชื่อม 3D · 2D · CNC · BOM จุดเดียว',
          'ส่งตรงโรงงานผลิตทันทีในคลิกเดียว'
        ]
      }
    ];

    pillars.forEach((p, idx) => {
      const pAnim = easeOutCubic((t - 0.10 - idx * 0.08) / 0.45);
      const py = pilStartY + idx * (pilH + pilGap) + (1 - pAnim) * 16;
      ctx.save();
      ctx.globalAlpha = pilP * pAnim;

      // Soft Shadow + Clean White Card
      ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      drawRoundedRect(leftX, py, leftW, pilH, 16, '#FFFFFF', '#CBD5E1', 1.2);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Left Color Spine Accent Bar
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(leftX, py + 18, 5, pilH - 36, [0, 4, 4, 0]);
      else ctx.rect(leftX, py + 18, 5, pilH - 36);
      ctx.fill();

      // Index Badge
      drawRoundedRect(leftX + 24, py + 19, 48, 30, 8, p.soft, p.accent, 1.2);
      ctx.fillStyle = p.accent;
      fit(p.code, leftX + 48, py + 40, 40, 16.5, '900', '"Prompt", sans-serif', 'center');

      // Right Meta Pill
      const bW = p.badge.length > 16 ? 206 : 164;
      drawRoundedRect(leftX + leftW - 22 - bW, py + 20, bW, 28, 14, p.soft, p.accent + '55', 1);
      ctx.fillStyle = p.accent;
      fit(p.badge, leftX + leftW - 22 - bW / 2, py + 39.5, bW - 14, 15.5, '800', '"Prompt", sans-serif', 'center');

      // Pillar Title (Big Bold Heading)
      ctx.fillStyle = '#0F172A';
      fit(p.title, leftX + 24, py + 84, leftW - 48, 26, '900', '"Prompt", sans-serif', 'left');

      // Subtle Hairline Divider
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(leftX + 24, py + 99, leftW - 48, 1.2);

      // 2 Punchy Key-Topic Bullets (Big & Clear!)
      p.bullets.forEach((bLine, bi) => {
        const by = py + 133 + bi * 38;
        ctx.fillStyle = p.accent;
        ctx.font = '900 25px "Prompt", sans-serif';
        ctx.fillText('•', leftX + 24, by);
        ctx.fillStyle = '#0F172A';
        fit(bLine, leftX + 48, by, leftW - 72, 24, '700', '"Prompt", sans-serif', 'left');
      });

      ctx.restore();
    });

    // 4. Right Main Zone (x = 680..1864, width = 1184)
    const rightX = 680;
    const rightGap = 22;
    const colW = (1184 - rightGap * 2) / 3; // 380px exact
    const kpiY = 164;
    const kpiH = 178;

    const kpiP = easeOutCubic((t - 0.22) / 0.5);
    const inClipSequence = t < 15.0;
    const clipPhaseIdx = t < 5.0 ? 0 : (t < 10.0 ? 1 : 2);
    const activeKpi = inClipSequence ? clipPhaseIdx : Math.floor((nowSec / 2.6) % 3);
    const pulseWave = (nowSec * 0.72) % 1;
    ctx.save();
    ctx.globalAlpha = kpiP;

    const drawKpiPlayTag = (cardX, liftY, idx, badgeRightEdge, isDarkCard, activeColor) => {
      const slotX = Math.max(cardX + badgeRightEdge + 10, cardX + colW - 134);
      const slotW = cardX + colW - 18 - slotX;
      if (slotW < 68) return;
      const isPlayingThis = inClipSequence && clipPhaseIdx === idx;
      if (isPlayingThis) {
        const rem = Math.max(0, (idx + 1) * 5.0 - t).toFixed(1);
        const tagBg = activeColor === '#F59E0B' ? '#D97706' : '#059669';
        drawRoundedRect(slotX, kpiY + liftY + 18, slotW, 26, 13, tagBg, tagBg, 1.1);
        ctx.fillStyle = '#FFFFFF';
        fit(`▶ CLIP · ${rem}s`, slotX + slotW / 2, kpiY + liftY + 35.5, slotW - 10, 13, '900', '"JetBrains Mono", monospace', 'center');
      } else {
        drawRoundedRect(slotX, kpiY + liftY + 18, slotW, 26, 13, isDarkCard ? 'rgba(255,255,255,0.08)' : '#F1F5F9', isDarkCard ? 'rgba(255,255,255,0.2)' : '#CBD5E1', 1);
        ctx.fillStyle = isDarkCard ? '#A7F3D0' : '#64748B';
        fit(`▶ Clip 0${idx + 1}`, slotX + slotW / 2, kpiY + liftY + 35.5, slotW - 10, 13, '700', '"Prompt", sans-serif', 'center');
      }
    };

    // KPI Card 1: Lead Time Reduction (7 Days -> 1 Day · Running Compression)
    const k1X = rightX;
    const k1Lift = activeKpi === 0 ? -3 : 0;
    ctx.shadowColor = activeKpi === 0 ? 'rgba(5, 150, 105, 0.22)' : 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = activeKpi === 0 ? 22 : 16;
    ctx.shadowOffsetY = activeKpi === 0 ? 8 : 6;
    drawRoundedRect(k1X, kpiY + k1Lift, colW, kpiH, 16, '#FFFFFF', activeKpi === 0 ? '#10B981' : '#CBD5E1', activeKpi === 0 ? 2.0 : 1.2);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    drawRoundedRect(k1X + 24, kpiY + k1Lift + 18, 198, 26, 13, '#ECFDF5', '#05966955', 1);
    ctx.fillStyle = '#047857';
    fit('LEAD TIME REDUCTION', k1X + 123, kpiY + k1Lift + 35.5, 182, 13.5, '800', '"Prompt", sans-serif', 'center');
    drawKpiPlayTag(k1X, k1Lift, 0, 222, false, '#10B981');
    app._v3ResultsHits.push({ x: k1X, y: kpiY, w: colW, h: kpiH, targetT: 0.05 });

    // Rolling countdown 7 -> 1 on slide entrance
    const dayRollP = easeOutCubic((t - 0.25) / 1.25);
    const curDayVal = Math.max(1, Math.round(7 - 6 * dayRollP));
    const strikeP = easeOutCubic((t - 0.35) / 0.75);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 26px "Prompt", sans-serif';
    ctx.fillText('7 Days', k1X + 24, kpiY + k1Lift + 106);
    const w7 = ctx.measureText('7 Days').width;
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(k1X + 22, kpiY + k1Lift + 96, (w7 + 4) * strikeP, 2.5);

    // Animated sequential triple chevrons ▸ ▸ ▸
    const chevBaseX = k1X + 34 + w7;
    for (let ci = 0; ci < 3; ci++) {
      const chA = 0.28 + 0.72 * Math.max(0, Math.sin((nowSec * 5.2) - ci * 1.1));
      ctx.fillStyle = `rgba(5, 150, 105, ${chA.toFixed(2)})`;
      ctx.font = '900 18px "Prompt", sans-serif';
      ctx.fillText('▸', chevBaseX + ci * 12, kpiY + k1Lift + 104);
    }

    ctx.fillStyle = '#059669';
    ctx.font = '900 44px "Prompt", sans-serif';
    ctx.fillText(`${curDayVal} Day`, chevBaseX + 44, kpiY + k1Lift + 110);

    // Continuous time-compression track (7d -> 1d racing pulse)
    const barW1 = colW - 48;
    const barY1 = kpiY + k1Lift + 132;
    drawRoundedRect(k1X + 24, barY1, barW1, 8, 4, '#E2E8F0', null, 0);
    const fill1W = barW1 * (1 - 0.86 * dayRollP);
    drawRoundedRect(k1X + 24, barY1, Math.max(24, fill1W), 8, 4, '#059669', null, 0);
    const run1X = k1X + 24 + barW1 * (1 - pulseWave * 0.86);
    ctx.save();
    ctx.fillStyle = '#34D399';
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(run1X, barY1 + 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#475569';
    fit('ลดระยะเวลาจัดทำ BOM & Drawing', k1X + 24, kpiY + k1Lift + 162, barW1, 19, '700', '"Prompt", sans-serif', 'left');

    // KPI Card 2: Cycle Time Saved (0% -> 86% · Live Photon Runner + Floating Arrow)
    const k2X = rightX + colW + rightGap;
    const k2Lift = activeKpi === 1 ? -3 : 0;
    ctx.shadowColor = activeKpi === 1 ? 'rgba(217, 119, 6, 0.20)' : 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = activeKpi === 1 ? 22 : 16;
    ctx.shadowOffsetY = activeKpi === 1 ? 8 : 6;
    drawRoundedRect(k2X, kpiY + k2Lift, colW, kpiH, 16, '#FFFFFF', activeKpi === 1 ? '#F59E0B' : '#CBD5E1', activeKpi === 1 ? 2.0 : 1.2);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    drawRoundedRect(k2X + 24, kpiY + k2Lift + 18, 184, 26, 13, '#FFFBEB', '#D9770655', 1);
    ctx.fillStyle = '#B45309';
    fit('CYCLE TIME SAVED', k2X + 116, kpiY + k2Lift + 35.5, 168, 13.5, '800', '"Prompt", sans-serif', 'center');
    drawKpiPlayTag(k2X, k2Lift, 1, 208, false, '#F59E0B');
    app._v3ResultsHits.push({ x: k2X, y: kpiY, w: colW, h: kpiH, targetT: 5.05 });

    const pctRollP = easeOutCubic((t - 0.30) / 1.35);
    const pctVal = Math.round(86 * pctRollP);
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 54px "Prompt", sans-serif';
    ctx.fillText(`${pctVal}%`, k2X + 24, kpiY + k2Lift + 112);

    // Live bobbing Faster Output pill beside 86%
    const bobY = Math.sin(nowSec * 5.0) * 2.2;
    drawRoundedRect(k2X + 188, kpiY + k2Lift + 72, 166, 36, 10, '#ECFDF5', '#10B98166', 1.1);
    ctx.fillStyle = '#059669';
    fit('▼ Faster Output', k2X + 271, kpiY + k2Lift + 95 + bobY * 0.4, 150, 15.5, '800', '"Prompt", sans-serif', 'center');

    // Efficiency Progress Bar (0 -> 86%) + racing photon runner
    const barY2 = kpiY + k2Lift + 132;
    const target86W = barW1 * 0.86 * pctRollP;
    drawRoundedRect(k2X + 24, barY2, barW1, 8, 4, '#E2E8F0', null, 0);
    const p2Grad = ctx.createLinearGradient(k2X + 24, 0, k2X + 24 + barW1 * 0.86, 0);
    p2Grad.addColorStop(0, '#059669');
    p2Grad.addColorStop(1, '#34D399');
    drawRoundedRect(k2X + 24, barY2, Math.max(8, target86W), 8, 4, p2Grad, null, 0);

    const run2X = k2X + 24 + target86W * ((nowSec * 0.85) % 1);
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(run2X, barY2 + 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#475569';
    fit('ประหยัดเวลากระบวนการออกแบบรวม', k2X + 24, kpiY + k2Lift + 162, barW1, 19, '700', '"Prompt", sans-serif', 'left');

    // KPI Card 3: Annual Cost Reduction (0.0M -> 1.2M · Clean White & Mint Sheen)
    const k3X = rightX + (colW + rightGap) * 2;
    const k3Lift = activeKpi === 2 ? -3 : 0;
    ctx.shadowColor = activeKpi === 2 ? 'rgba(5, 150, 105, 0.22)' : 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = activeKpi === 2 ? 22 : 16;
    ctx.shadowOffsetY = activeKpi === 2 ? 8 : 6;
    const costGrad = ctx.createLinearGradient(k3X, kpiY + k3Lift, k3X + colW, kpiY + k3Lift + kpiH);
    costGrad.addColorStop(0, '#FFFFFF');
    costGrad.addColorStop(1, '#F0FDF4');
    drawRoundedRect(k3X, kpiY + k3Lift, colW, kpiH, 16, costGrad, activeKpi === 2 ? '#10B981' : '#CBD5E1', activeKpi === 2 ? 2.0 : 1.2);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Subtle diagonal sheen sweep inside Cost Reduction card
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(k3X, kpiY + k3Lift, colW, kpiH, 16);
    else ctx.rect(k3X, kpiY + k3Lift, colW, kpiH);
    ctx.clip();
    const sheenProg = (nowSec * 0.42) % 1;
    const sheenX = k3X - 140 + (colW + 280) * sheenProg;
    const sGrad = ctx.createLinearGradient(sheenX, kpiY, sheenX + 110, kpiY + kpiH);
    sGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
    sGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.08)');
    sGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = sGrad;
    ctx.fillRect(k3X, kpiY + k3Lift, colW, kpiH);
    ctx.restore();

    drawRoundedRect(k3X + 24, kpiY + k3Lift + 18, 224, 26, 13, '#ECFDF5', '#05966955', 1);
    ctx.fillStyle = '#047857';
    fit('ANNUAL COST REDUCTION', k3X + 136, kpiY + k3Lift + 35.5, 208, 13.5, '800', '"Prompt", sans-serif', 'center');
    drawKpiPlayTag(k3X, k3Lift, 2, 248, false, '#059669');
    app._v3ResultsHits.push({ x: k3X, y: kpiY, w: colW, h: kpiH, targetT: 10.05 });

    // Rolling counter 0.0M -> 1.2M
    const costRollP = easeOutCubic((t - 0.35) / 1.40);
    const costValStr = `${(1.2 * costRollP).toFixed(1)}M`;
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 54px "Prompt", sans-serif';
    ctx.fillText(costValStr, k3X + 24, kpiY + k3Lift + 112);

    // Inline THB / YEAR pill matching Card 2 layout rhythm
    const costBob = Math.sin(nowSec * 4.5 + 1.2) * 2.0;
    drawRoundedRect(k3X + 190, kpiY + k3Lift + 72, 164, 36, 10, '#ECFDF5', '#10B98166', 1.1);
    ctx.fillStyle = '#047857';
    fit('THB / YEAR', k3X + 272, kpiY + k3Lift + 95 + costBob * 0.35, 148, 15.5, '800', '"JetBrains Mono", monospace', 'center');

    // Continuous ROI energy track with glowing gold-mint photon
    const barY3 = kpiY + k3Lift + 132;
    drawRoundedRect(k3X + 24, barY3, barW1, 8, 4, '#E2E8F0', null, 0);
    const roiGrad = ctx.createLinearGradient(k3X + 24, 0, k3X + 24 + barW1, 0);
    roiGrad.addColorStop(0, '#059669');
    roiGrad.addColorStop(1, '#10B981');
    drawRoundedRect(k3X + 24, barY3, Math.max(10, barW1 * costRollP), 8, 4, roiGrad, null, 0);

    const run3X = k3X + 24 + barW1 * costRollP * ((nowSec * 0.95) % 1);
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(217, 119, 6, 0.45)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(run3X, barY3 + 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#475569';
    fit('ลดต้นทุนแรงงานและการแก้ไขแบบต่อปี', k3X + 24, kpiY + k3Lift + 162, barW1, 19, '700', '"Prompt", sans-serif', 'left');
    ctx.restore();

    // 5. Right Lower Section: Synchronized 3x5s Animated Clips (0..15s) -> Pinned 5 Deliverable Gallery (>= 15s)
    if (inClipSequence) {
      // Connector beam linking the active KPI Card (7->1d / 86% / 1.2M) into the large clip viewport
      const connCols = ['#059669', '#D97706', '#059669'];
      const connCol = connCols[clipPhaseIdx];
      const connX = rightX + clipPhaseIdx * (colW + rightGap) + colW / 2;
      ctx.save();
      ctx.globalAlpha = kpiP;
      ctx.strokeStyle = connCol;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(connX, kpiY + kpiH - 3);
      ctx.lineTo(connX, 356);
      ctx.stroke();
      ctx.fillStyle = connCol;
      ctx.beginPath();
      ctx.moveTo(connX - 8, 354);
      ctx.lineTo(connX + 8, 354);
      ctx.lineTo(connX, 364);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const clipIntroP = easeOutCubic((t - 0.18) / 0.45);
      ctx.save();
      ctx.globalAlpha = clipIntroP;
      drawSlide13ResultClips(ctx, app, rightX, 364, 1184, 644, t, nowSec, pal, { clamp, easeOutCubic, drawRoundedRect, fit });
      ctx.restore();
      return;
    }

    const docP = easeOutCubic((t - 15.0) / 0.45);
    ctx.save();
    ctx.globalAlpha = docP;

    const hdrTxtCol = (pal && pal.isDark) ? '#E2E8F0' : '#0F2922';
    ctx.fillStyle = hdrTxtCol;
    fit('AUTOMATED OUTPUT DELIVERABLES — 5 ผลผลิตอัตโนมัติจาก Single Model', rightX, 383, 790, 20, '800', '"Prompt", sans-serif', 'left');

    // Clickable Replay 15s Clips button beside 100% MODEL SYNC badge
    drawRoundedRect(rightX + 804, 362, 168, 26, 13, (pal && pal.isDark) ? 'rgba(56, 189, 248, 0.16)' : '#E0F2FE', '#0284C766', 1);
    ctx.fillStyle = (pal && pal.isDark) ? '#7DD3FC' : '#0369A1';
    fit('↻ เล่นคลิป 15s ซ้ำ', rightX + 888, 379.5, 152, 13.5, '800', '"Prompt", sans-serif', 'center');
    app._v3ResultsHits.push({ x: rightX + 804, y: 358, w: 168, h: 34, targetT: 0.05 });

    drawRoundedRect(rightX + 984, 362, 200, 26, 13, (pal && pal.isDark) ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5', '#05966955', 1);
    ctx.fillStyle = (pal && pal.isDark) ? '#6EE7B7' : '#065F46';
    fit('✓ 100% MODEL SYNC', rightX + 1084, 379.5, 184, 13.5, '800', '"Prompt", sans-serif', 'center');

    function drawCleanOutputCard(x, y, w, h, code, labelText, subTag, imgList, accent) {
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 5;
      drawRoundedRect(x, y, w, h, 14, '#FFFFFF', '#CBD5E1', 1.2);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      const footerH = 48;
      const imgBoxH = h - footerH - 12;

      // Clean white preview canvas
      if (imgList.length === 1) {
        const im = loadImage(imgList[0]);
        if (im && im.complete && im.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + 10, y + 8, w - 20, imgBoxH);
          ctx.clip();
          app.drawMediaContain(ctx, im, im.naturalWidth, im.naturalHeight, x + 10, y + 8, w - 20, imgBoxH);
          ctx.restore();
        }
      } else if (imgList.length === 2) {
        const halfW = (w - 28) / 2;
        imgList.forEach((src, i) => {
          const im = loadImage(src);
          const ix = x + 10 + i * (halfW + 8);
          if (im && im.complete && im.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(ix, y + 8, halfW, imgBoxH);
            ctx.clip();
            app.drawMediaContain(ctx, im, im.naturalWidth, im.naturalHeight, ix, y + 8, halfW, imgBoxH);
            ctx.restore();
          }
        });
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(x + w / 2 - 0.5, y + 14, 1, imgBoxH - 12);
      }

      // Clean integrated Card Footer Bar
      const fy = y + h - footerH;
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(x, fy, w, footerH, [0, 0, 14, 14]);
      else ctx.rect(x, fy, w, footerH);
      ctx.fillStyle = '#F8FAFC';
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(x + 1, fy, w - 2, 1.2);

      // Step Code Pill
      drawRoundedRect(x + 12, fy + 10, 38, 28, 7, accent + '1A', accent + '66', 1);
      ctx.fillStyle = accent;
      fit(code, x + 31, fy + 29.5, 32, 14, '900', '"Prompt", sans-serif', 'center');

      // Title
      ctx.fillStyle = '#0F172A';
      fit(labelText, x + 58, fy + 30, w - (subTag ? 184 : 74), 20, '800', '"Prompt", sans-serif', 'left');

      // Subtle Format Sub-Tag on Right
      if (subTag) {
        ctx.fillStyle = '#64748B';
        fit(subTag, x + w - 12, fy + 29, 118, 13.5, '700', '"JetBrains Mono", monospace', 'right');
      }
      ctx.restore();
    }

    const thXs = [rightX, rightX + colW + rightGap, rightX + (colW + rightGap) * 2];
    const row1Y = 398;
    const row1H = 294;
    const row2Y = 714;
    const row2H = 294;
    const w2dWide = colW * 2 + rightGap;

    // Row 1 (3 Output Cards)
    drawCleanOutputCard(thXs[0], row1Y, colW, row1H, '01', '3D Visualization', '.SKP / C75', ['assets/design_stages/boq_3d_walls.png'], '#059669');
    drawCleanOutputCard(thXs[1], row1Y, colW, row1H, '02', 'Part Items (BOM)', '.XLSX BOM', ['assets/design_stages/doc_part_items.png'], '#D97706');
    drawCleanOutputCard(thXs[2], row1Y, colW, row1H, '03', 'Job Order', 'PRODUCTION', ['assets/design_stages/doc_job_order.png'], '#2563EB');

    // Row 2 (2D Assembly Drawing Wide + CAD Punching Board)
    drawCleanOutputCard(thXs[0], row2Y, w2dWide, row2H, '04', '2D Assembly Drawing Auto', 'SHOP DWG · ±1mm', ['assets/ver3/slide_06_cad_wall_layout.png', 'assets/ver3/slide_06_cad_detail_dwg.png'], '#0F766E');
    drawCleanOutputCard(thXs[2], row2Y, colW, row2H, '05', 'CAD Punching Board', '.DXF / CNC', ['assets/design_stages/doc_sb_list.png'], '#7C3AED');

    ctx.restore();
  }

  function drawSlide14NextStepScene(app, s) {
    const ctx = app.ctx;
    const { isSettled, t } = getCappedMotion(app);

    function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }
    function easeOutCubic(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }

    function drawRoundedRect(x, y, w, h, r, fillColor, strokeColor, lineWidth) {
      ctx.save();
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      const rad = Math.min(r, Math.min(w, h) / 2);
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, rad);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.closePath();
      ctx.fill();
      if (strokeColor && lineWidth) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Helper for crisp, multi-line Thai typography with natural linguistic word-breaks
    function wrapThaiText(ctx, text, x, y, maxWidth, lineHeight, fontStr, fillStyle) {
      if (!text) return y;
      ctx.save();
      if (fontStr) ctx.font = fontStr;
      if (fillStyle) ctx.fillStyle = fillStyle;
      
      let words = [];
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
        words = Array.from(segmenter.segment(text), s => s.segment);
      } else {
        words = text.split(' ');
      }

      let curLine = '';
      let curY = y;

      for (let i = 0; i < words.length; i++) {
        const test = curLine + words[i];
        if (ctx.measureText(test).width > maxWidth && curLine !== '') {
          ctx.fillText(curLine, x, curY);
          curLine = words[i].trimStart();
          curY += lineHeight;
        } else {
          curLine = test;
        }
      }
      if (curLine) {
        ctx.fillText(curLine, x, curY);
        curY += lineHeight;
      }
      ctx.restore();
      return curY;
    }

    // 1. Background (Mint-Teal Gradient matching Reference)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1080);
    bgGrad.addColorStop(0.00, '#2e493f');
    bgGrad.addColorStop(0.35, '#4f786a');
    bgGrad.addColorStop(0.70, '#7bab97');
    bgGrad.addColorStop(1.00, '#98d2be');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Subtle Architectural Grid Mesh
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx < 1920; gx += 40) { ctx.moveTo(gx, 0); ctx.lineTo(gx, 1080); }
    for (let gy = 0; gy < 1080; gy += 40) { ctx.moveTo(0, gy); ctx.lineTo(1920, gy); }
    ctx.stroke();
    ctx.restore();

    // Top-Right Page Counter Badge (15 / 16)
    drawPageBadge(ctx, app);

    // 2. Top Header: Next Step
    const titleP = easeOutCubic(t / 0.45);
    ctx.save();
    ctx.globalAlpha = titleP;
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 58px "Prompt", sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.fillText('Next Step', 45, 80);
    ctx.shadowColor = 'transparent';

    ctx.fillStyle = '#bde6d7';
    ctx.font = '700 24px "Prompt", sans-serif';
    ctx.fillText('::', 48, 125);
    ctx.restore();

    // 3. Left White Container Card (x = 32, y = 145, w = 1385, h = 905)
    const cardP = easeOutCubic((t - 0.15) / 0.5);
    ctx.save();
    ctx.globalAlpha = cardP;

    const cardLX = 32, cardLY = 145, cardLW = 1385, cardLH = 905;
    drawRoundedRect(cardLX, cardLY, cardLW, cardLH, 36, '#ffffff', 'rgba(0,0,0,0.06)', 1);

    // Header inside Left Card (100% Vector Typography - Exact match)
    ctx.fillStyle = '#0f1714';
    ctx.font = 'italic 700 28px "Prompt", sans-serif';
    ctx.fillText('Sketch up BOM', cardLX + 45, cardLY + 46);

    // Underline below Sketch up BOM
    ctx.strokeStyle = '#0f1714';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardLX + 45, cardLY + 52);
    ctx.lineTo(cardLX + 245, cardLY + 52);
    ctx.stroke();

    // Objective: Concise Key Headings (big bold & clear)
    ctx.font = '800 21px "Prompt", sans-serif';
    ctx.fillStyle = '#0f1714';
    ctx.fillText('Objective:', cardLX + 45, cardLY + 82);
    ctx.fillStyle = '#1e293b';
    app.fillFittedText(ctx, 'Auto BOM & DWG · 3D · Job Order · Lantex CNC & Check Conflict', cardLX + 165, cardLY + 82, 1150, 20.5, '600', '"Prompt", sans-serif', 'left');

    // Pain Point: Concise Key Heading
    ctx.fillStyle = '#0f1714';
    ctx.font = '800 21px "Prompt", sans-serif';
    ctx.fillText('Pain Point:', cardLX + 45, cardLY + 116);
    ctx.fillStyle = '#b91c1c';
    app.fillFittedText(ctx, 'ระบบเดิมกรอก Manual ช้า และเสี่ยงผิดพลาดสูง', cardLX + 168, cardLY + 116, 1140, 20.5, '700', '"Prompt", sans-serif', 'left');

    // Action: Concise Key Heading
    ctx.fillStyle = '#0f1714';
    ctx.font = '800 21px "Prompt", sans-serif';
    ctx.fillText('Action:', cardLX + 45, cardLY + 150);
    ctx.fillStyle = '#047857';
    app.fillFittedText(ctx, 'วาง Logic / Database / Object เขียนโปรแกรมบน SketchUp', cardLX + 132, cardLY + 150, 1180, 20.5, '700', '"Prompt", sans-serif', 'left');

    // 6 Modules Grid
    const mods = [
      { img: 'assets/ver3/next_step/mod1_interior.png', t1: 'Interior & Partition', t2: '(High Unit)', x: 70, y: 350, w: 380, h: 220 },
      { img: 'assets/ver3/next_step/mod2_stair.png', t1: 'Part Install V2 & Stair', t2: '', x: 500, y: 350, w: 410, h: 220 },
      { img: 'assets/ver3/next_step/mod3_air.png', t1: 'Electrical & Air Factory', t2: '', x: 960, y: 350, w: 390, h: 220 },
      { img: 'assets/ver3/next_step/mod4_bath.png', t1: 'Bathroom System', t2: '', x: 70, y: 670, w: 380, h: 220 },
      { img: 'assets/ver3/next_step/mod5_structure.png', t1: 'Structure V2 Automation', t2: '(Out P-Rule & Drawing )', x: 500, y: 670, w: 410, h: 220 },
      { img: 'assets/ver3/next_step/mod6_exterior.png', t1: 'Exterior, Balcony, C3', t2: '(Out P-Rule & Drawing )', x: 960, y: 670, w: 390, h: 220 }
    ];

    mods.forEach(m => {
      const im = loadImage(m.img);
      if (im && im.complete && im.naturalWidth) {
        app.drawMediaContain(ctx, im, im.naturalWidth, im.naturalHeight, m.x, m.y, m.w, m.h);
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = '#111827';
      ctx.font = '700 19px "Prompt", sans-serif';
      ctx.fillText(m.t1, m.x + m.w / 2, m.y + m.h + 24);
      if (m.t2) {
        ctx.fillStyle = '#4b5563';
        ctx.font = '500 18px "Prompt", sans-serif';
        ctx.fillText(m.t2, m.x + m.w / 2, m.y + m.h + 50);
      }
      ctx.textAlign = 'left';
    });
    ctx.restore();

    // 4. Right White Container Card (x = 1445, y = 145, w = 445, h = 905)
    // 100% Vector Typography + 2 Live Animated Video Clips for 01 & 02
    const rCardP = easeOutCubic((t - 0.25) / 0.5);
    ctx.save();
    ctx.globalAlpha = rCardP;

    const cardRX = 1445, cardRY = 145, cardRW = 445, cardRH = 905;
    drawRoundedRect(cardRX, cardRY, cardRW, cardRH, 36, '#ffffff', 'rgba(0,0,0,0.06)', 1);

    // =========================================================================
    // Pillar 1: 01 | Smart Estimation for Sales
    // =========================================================================
    const p1Y = cardRY + 56;
    ctx.fillStyle = '#0f1714';
    ctx.font = '800 28px "Prompt", sans-serif';
    ctx.fillText('01 | Smart Estimation', cardRX + 32, p1Y);
    ctx.fillText('for Sales', cardRX + 32, p1Y + 35);

    // Pillar 1 Key Topic Bullets (Big & Clear)
    ctx.fillStyle = '#059669';
    ctx.font = '900 23px "Prompt", sans-serif';
    ctx.fillText('•', cardRX + 32, p1Y + 86);
    ctx.fillText('•', cardRX + 32, p1Y + 124);
    ctx.fillStyle = '#0f172a';
    app.fillFittedText(ctx, 'ประเมินราคา (Estimate) อัตโนมัติ', cardRX + 54, p1Y + 86, cardRW - 86, 22.5, '700', '"Prompt", sans-serif', 'left');
    app.fillFittedText(ctx, 'เสนอราคาไว ตอบโจทย์ลูกค้าทันที', cardRX + 54, p1Y + 124, cardRW - 86, 22.5, '700', '"Prompt", sans-serif', 'left');

    // --- CLIP 1: Live Animated Smart Estimation for Sales Screen (y = 352, h = 176) ---
    const clip1X = cardRX + 28, clip1Y = cardRY + 206, clip1W = cardRW - 56, clip1H = 176;
    drawRoundedRect(clip1X, clip1Y, clip1W, clip1H, 16, '#0f172a', '#10b981', 2);
    ctx.save();
    if (typeof ctx.beginPath === 'function') {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(clip1X + 2, clip1Y + 2, clip1W - 4, clip1H - 4, 14);
      else ctx.rect(clip1X + 2, clip1Y + 2, clip1W - 4, clip1H - 4);
      ctx.clip();
    }
    // Header bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(clip1X, clip1Y, clip1W, 26);
    ctx.fillStyle = '#ef4444';
    if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(clip1X + 14, clip1Y + 13, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f59e0b';
    if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(clip1X + 26, clip1Y + 13, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#10b981';
    if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(clip1X + 38, clip1Y + 13, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#e2e8f0';
    app.fillFittedText(ctx, 'SMART ESTIMATION · SALES QUOTATION', clip1X + 48, clip1Y + 17.5, clip1W - 110, 12.5, '700', '"Prompt", sans-serif', 'left');
    const blink1 = isSettled || Math.sin(t * 5) > 0;
    ctx.fillStyle = blink1 ? '#10b981' : '#64748b';
    if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(clip1X + clip1W - 50, clip1Y + 13, 3.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#34d399';
    ctx.font = '700 12px "Prompt", sans-serif';
    ctx.fillText(isSettled ? 'DONE' : 'LIVE', clip1X + clip1W - 41, clip1Y + 17.5);

    // Left: 3D Floorplan / Model Preview with animated laser scan (scan stops at 10s)
    const fpBoxX = clip1X + 10, fpBoxY = clip1Y + 34, fpBoxW = 148, fpBoxH = 132;
    drawRoundedRect(fpBoxX, fpBoxY, fpBoxW, fpBoxH, 10, '#162436', '#334155', 1.2);
    const mod1Img = loadImage('assets/ver3/next_step/mod1_interior.png');
    if (mod1Img && mod1Img.complete && mod1Img.naturalWidth && typeof ctx.drawImage === 'function') {
      ctx.drawImage(mod1Img, fpBoxX + 6, fpBoxY + 6, fpBoxW - 12, fpBoxH - 32);
    }
    if (!isSettled) {
      const scan1Y = fpBoxY + 10 + ((t * 45) % (fpBoxH - 42));
      ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
      ctx.fillRect(fpBoxX + 4, scan1Y - 6, fpBoxW - 8, 8);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(fpBoxX + 4, scan1Y, fpBoxW - 8, 2);
    }
    ctx.fillStyle = '#94a3b8';
    app.fillFittedText(ctx, 'Model: HEIM-285 sqm', fpBoxX + 8, fpBoxY + fpBoxH - 8.5, fpBoxW - 16, 12, '600', '"Prompt", sans-serif', 'left');

    // Right: Real-time Cost Breakdown & Instant Quote Total
    const estX = fpBoxX + fpBoxW + 10, estW = clip1W - fpBoxW - 30;
    const estItems = [
      { label: 'Structure & Wall', val: '2,450,000', pct: 0.88, col: '#38bdf8' },
      { label: 'Interior & Stair', val: '1,680,000', pct: 0.72, col: '#a78bfa' },
      { label: 'MEP, Air & Bath',  val: '1,390,000', pct: 0.64, col: '#34d399' }
    ];
    estItems.forEach((it, idx) => {
      const iy = fpBoxY + 4 + idx * 30;
      const animP = isSettled ? 1 : (0.75 + 0.25 * Math.sin(t * 2.5 + idx));
      ctx.fillStyle = '#cbd5e1';
      app.fillFittedText(ctx, it.label, estX, iy + 10.5, estW - 76, 12.5, '600', '"Prompt", sans-serif', 'left');
      ctx.fillStyle = '#f8fafc';
      app.fillFittedText(ctx, '฿' + it.val, estX + estW, iy + 10.5, 74, 12.5, '700', '"Prompt", sans-serif', 'right');
      // Progress bar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(estX, iy + 15, estW, 5);
      ctx.fillStyle = it.col;
      ctx.fillRect(estX, iy + 15, estW * it.pct * animP, 5);
    });

    // Instant Total Quote Badge
    const totBoxY = fpBoxY + 94;
    drawRoundedRect(estX, totBoxY, estW, 40, 8, 'rgba(16, 185, 129, 0.18)', '#10b981', 1.5);
    ctx.fillStyle = '#6ee7b7';
    app.fillFittedText(ctx, 'INSTANT ESTIMATE (≤ 5 MIN)', estX + 8, totBoxY + 14, estW - 16, 11.5, '700', '"Prompt", sans-serif', 'left');
    const livePrice = isSettled ? 5520000 : (5520000 + Math.floor(((t * 1.2) % 3) * 10000));
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 17px "Prompt", sans-serif';
    ctx.fillText('฿ ' + livePrice.toLocaleString('en-US'), estX + 8, totBoxY + 34);
    ctx.restore();

    // Elegant Divider Line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    if (typeof ctx.beginPath === 'function') {
      ctx.beginPath();
      ctx.moveTo(cardRX + 32, cardRY + 398);
      ctx.lineTo(cardRX + cardRW - 32, cardRY + 398);
      ctx.stroke();
    }

    // =========================================================================
    // Pillar 2: 02 | Design-to-Production Automation
    // =========================================================================
    const p2Y = cardRY + 436;
    ctx.fillStyle = '#0f1714';
    ctx.font = '800 28px "Prompt", sans-serif';
    ctx.fillText('02 | Design-to-Production', cardRX + 32, p2Y);
    ctx.fillText('Automation', cardRX + 32, p2Y + 35);

    // Pillar 2 Key Topic Bullets (Big & Clear)
    ctx.fillStyle = '#d97706';
    ctx.font = '900 23px "Prompt", sans-serif';
    ctx.fillText('•', cardRX + 32, p2Y + 86);
    ctx.fillText('•', cardRX + 32, p2Y + 124);
    ctx.fillStyle = '#0f172a';
    app.fillFittedText(ctx, 'เชื่อม 3D ➔ BOM ➔ DWG ➔ ผลิต', cardRX + 54, p2Y + 86, cardRW - 86, 22.5, '700', '"Prompt", sans-serif', 'left');
    app.fillFittedText(ctx, 'ตรวจ Design Conflict ตั้งแต่ต้นทาง', cardRX + 54, p2Y + 124, cardRW - 86, 22.5, '700', '"Prompt", sans-serif', 'left');

    // --- CLIP 2: Live Animated Design-to-Production & Conflict Check Screen (y = 774, h = 248) ---
    const clip2X = cardRX + 28, clip2Y = cardRY + 628, clip2W = cardRW - 56, clip2H = 250;
    drawRoundedRect(clip2X, clip2Y, clip2W, clip2H, 16, '#0f172a', '#f59e0b', 2);
    ctx.save();
    if (typeof ctx.beginPath === 'function') {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(clip2X + 2, clip2Y + 2, clip2W - 4, clip2H - 4, 14);
      else ctx.rect(clip2X + 2, clip2Y + 2, clip2W - 4, clip2H - 4);
      ctx.clip();
    }
    // Header bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(clip2X, clip2Y, clip2W, 26);
    ctx.fillStyle = '#ef4444';
    if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(clip2X + 14, clip2Y + 13, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f59e0b';
    if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(clip2X + 26, clip2Y + 13, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#10b981';
    if (typeof ctx.beginPath === 'function') { ctx.beginPath(); ctx.arc(clip2X + 38, clip2Y + 13, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#e2e8f0';
    app.fillFittedText(ctx, 'DESIGN ➔ BOM ➔ DWG ➔ PRODUCTION', clip2X + 48, clip2Y + 17.5, clip2W - 102, 12.5, '700', '"Prompt", sans-serif', 'left');
    ctx.fillStyle = '#fbbf24';
    ctx.font = '800 12px "Prompt", sans-serif';
    ctx.fillText('AUTO', clip2X + clip2W - 44, clip2Y + 17.5);

    // Top Row inside Clip 2: 4-Stage Pipeline Flow with Moving Orb (stops cleanly at 10s)
    const stgLabels = ['3D Design', 'Auto BOM', '2D DWG', 'Production'];
    const stgCols = ['#38bdf8', '#10b981', '#a78bfa', '#f59e0b'];
    const stgW = 80, stgGap = 15, stgStartX = clip2X + 12, stgY = clip2Y + 36;
    const activeStg = isSettled ? 3 : Math.floor((t * 1.4) % 4);

    // Connecting line behind stages
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    if (typeof ctx.beginPath === 'function') {
      ctx.beginPath();
      ctx.moveTo(stgStartX + 40, stgY + 16);
      ctx.lineTo(stgStartX + 3 * (stgW + stgGap) + 40, stgY + 16);
      ctx.stroke();
    }
    // Traveling data pulse across the 4 stages (hidden after 10s)
    if (!isSettled) {
      const orbX = stgStartX + 20 + (((t * 0.65) % 1) * (3 * (stgW + stgGap) + 40));
      ctx.fillStyle = '#34d399';
      if (typeof ctx.beginPath === 'function') {
        ctx.beginPath();
        ctx.arc(orbX, stgY + 16, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    stgLabels.forEach((lb, i) => {
      const sx = stgStartX + i * (stgW + stgGap);
      const isAct = i === activeStg;
      drawRoundedRect(sx, stgY, stgW, 32, 8, isAct ? stgCols[i] : '#1e293b', stgCols[i], isAct ? 2 : 1.2);
      ctx.fillStyle = isAct ? '#0f172a' : '#e2e8f0';
      app.fillFittedText(ctx, lb, sx + stgW / 2, stgY + 20.5, stgW - 8, 12.5, isAct ? '800' : '600', '"Prompt", sans-serif', 'center');
    });

    // Middle-Bottom inside Clip 2: Live 6-Module Conflict Check & 3D Preview (stops on mod 0 after 10s)
    const cycIdx = isSettled ? 0 : Math.floor((t * 0.8) % mods.length);
    const curMod = mods[cycIdx];
    const modPreviewX = clip2X + 12, modPreviewY = clip2Y + 78, modPreviewW = 162, modPreviewH = 132;
    drawRoundedRect(modPreviewX, modPreviewY, modPreviewW, modPreviewH, 10, '#f8fafc', '#38bdf8', 1.5);
    const curModIm = loadImage(curMod.img);
    if (curModIm && curModIm.complete && curModIm.naturalWidth) {
      app.drawMediaContain(ctx, curModIm, curModIm.naturalWidth, curModIm.naturalHeight, modPreviewX + 6, modPreviewY + 6, modPreviewW - 12, modPreviewH - 30);
    }
    ctx.fillStyle = '#0f172a';
    app.fillFittedText(ctx, curMod.t1, modPreviewX + modPreviewW / 2, modPreviewY + modPreviewH - 7.5, modPreviewW - 12, 12.5, '700', '"Prompt", sans-serif', 'center');

    // Right side of Clip 2: 6 Module Sync Checklist
    const chkX = modPreviewX + modPreviewW + 10, chkW = clip2W - modPreviewW - 34;
    const shortMods = [
      '1. Interior High Unit',
      '2. Part Install & Stair',
      '3. Electrical & Air',
      '4. Bathroom System',
      '5. Structure V2 Auto',
      '6. Exterior & Balcony'
    ];
    shortMods.forEach((sm, idx) => {
      const my = modPreviewY + 2 + idx * 22;
      const isCur = idx === cycIdx;
      if (isCur) {
        drawRoundedRect(chkX, my, chkW, 20, 5, 'rgba(16, 185, 129, 0.22)', '#10b981', 1);
      }
      ctx.fillStyle = '#10b981';
      ctx.font = '800 12.5px "Prompt", sans-serif';
      ctx.fillText('✓', chkX + 5, my + 14.5);
      ctx.fillStyle = isCur ? '#ffffff' : '#cbd5e1';
      app.fillFittedText(ctx, sm, chkX + 20, my + 14.5, chkW - 24, 12.5, isCur ? '700' : '500', '"Prompt", sans-serif', 'left');
    });

    // Bottom Status Bar inside Clip 2
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(clip2X, clip2Y + clip2H - 28, clip2W, 28);
    ctx.fillStyle = '#6ee7b7';
    app.fillFittedText(ctx, '✓ Design Conflict: 0  ·  BOM & DWG Synced 100%', clip2X + clip2W / 2, clip2Y + clip2H - 9.5, clip2W - 16, 12.5, '700', '"Prompt", sans-serif', 'center');
    ctx.restore();

    ctx.restore();
  }

  function drawSlide15TeamScene(app, s) {
    const ctx = app.ctx;
    const { t } = getCappedMotion(app);

    function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }
    function easeOutCubic(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }

    // 1. Background Split:
    // Top background (y = 0 to 425): Linear gradient from sage green (#4d6e63) on left to charcoal black (#171918) on right
    const topH = 425;
    const topGrad = ctx.createLinearGradient(0, 0, 1920, 0);
    topGrad.addColorStop(0.0, '#4d6e63');
    topGrad.addColorStop(0.4, '#384d45');
    topGrad.addColorStop(0.7, '#242f2b');
    topGrad.addColorStop(1.0, '#171918');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, 1920, topH);

    // Bottom background (y = 425 to 1080): Solid Mint green (#9bd5bf)
    ctx.fillStyle = '#9bd5bf';
    ctx.fillRect(0, topH, 1920, 1080 - topH);

    // Dynamic Top-Right Page Counter Badge
    drawPageBadge(ctx, app);

    // 2. Coral Orange Line & "MEET OUR TEAM" at y = 414
    const titleP = easeOutCubic(t / 0.4);
    ctx.save();
    ctx.globalAlpha = titleP;

    const orangeCol = '#fc9459';
    const lineY = 414;
    ctx.strokeStyle = orangeCol;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(16, lineY);
    ctx.lineTo(275, lineY);
    ctx.stroke();

    ctx.fillStyle = orangeCol;
    ctx.font = '800 30px "Prompt", "Segoe UI", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('MEET OUR TEAM', 295, lineY + 9);
    ctx.letterSpacing = '0px';

    // 3. Giant Bold "M E M B E R" crossing the boundary
    ctx.fillStyle = '#1c201e';
    ctx.font = '900 156px "Prompt", Impact, "Segoe UI", sans-serif';
    ctx.letterSpacing = '18px';
    ctx.fillText('MEMBER', 830, 485);
    ctx.letterSpacing = '0px';

    // "By SCG HEIM" in red positioned directly above the first 'M' of MEMBER
    ctx.fillStyle = '#ef4444';
    ctx.font = '700 24px "Prompt", "Segoe UI", sans-serif';
    ctx.fillText('By SCG HEIM', 832, 342);
    ctx.restore();

    // 4. Team Columns on lower left (x = 16 to 1040)
    const members = [
      {
        name1: 'Kritsana',
        name2: 'Pongphal',
        role: 'Project Leader',
        photo: 'assets/ver3/team/card_kritsana.png'
      },
      {
        name1: 'Pat',
        name2: 'Booranasanti',
        role: 'Staff',
        photo: 'assets/ver3/team/card_pat.png'
      },
      {
        name1: 'Peeradol',
        name2: 'Tongpubes',
        role: 'Staff',
        photo: 'assets/ver3/team/card_peeradol.png'
      },
      {
        name1: 'Sutee',
        name2: 'Chuyram',
        role: 'Staff',
        photo: 'assets/ver3/team/card_sutee.png'
      }
    ];

    const colW = 252;
    const gap = 4;
    const xStart = 16;
    const yNames = 535;
    const yPhoto = 620;
    const photoH = 1080 - yPhoto;

    members.forEach((m, idx) => {
      const colP = easeOutCubic((t - 0.2 - idx * 0.1) / 0.45);
      const colShift = (1 - colP) * 16;
      ctx.save();
      ctx.globalAlpha = colP;

      const cx = xStart + idx * (colW + gap);

      // Names & Role (Centered above photo)
      ctx.textAlign = 'center';
      ctx.fillStyle = '#20382e';
      ctx.font = '700 21px "Prompt", "Segoe UI", sans-serif';
      ctx.fillText(m.name1, cx + colW / 2, yNames + colShift);
      ctx.fillText(m.name2, cx + colW / 2, yNames + 26 + colShift);

      ctx.fillStyle = '#4d6e63';
      ctx.font = '600 17px "Prompt", "Segoe UI", sans-serif';
      ctx.fillText(m.role, cx + colW / 2, yNames + 54 + colShift);
      ctx.textAlign = 'left';

      // Photo
      const im = loadImage(m.photo);
      if (im && im.complete && im.naturalWidth) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, yPhoto, colW, photoH);
        ctx.clip();
        
        const iw = im.naturalWidth;
        const ih = im.naturalHeight;
        const targetRatio = colW / photoH;
        const imgRatio = iw / ih;
        let sx = 0, sy = 0, sw = iw, sh = ih;
        if (imgRatio > targetRatio) {
          sw = ih * targetRatio;
          sx = (iw - sw) / 2;
        } else {
          sh = iw / targetRatio;
          sy = 0;
        }
        ctx.drawImage(im, sx, sy, sw, sh, cx, yPhoto, colW, photoH);
        ctx.restore();
      }

      // Architectural crisp corner extension lines ("สไตร Artq มีเส้นเลยไปนิดหน่อย")
      const ext = 12;
      ctx.strokeStyle = 'rgba(32, 56, 46, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - ext, yPhoto);
      ctx.lineTo(cx + colW + ext, yPhoto);
      ctx.moveTo(cx, yPhoto - ext);
      ctx.lineTo(cx, yPhoto + photoH);
      ctx.moveTo(cx + colW, yPhoto - ext);
      ctx.lineTo(cx + colW, yPhoto + photoH);
      ctx.stroke();

      ctx.restore();
    });
  }

  function drawSlide16ClosingScene(app, s) {
    const ctx = app.ctx;
    const { t } = getCappedMotion(app);

    function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }
    function easeOutCubic(p) { return 1 - Math.pow(1 - clamp(p, 0, 1), 3); }

    function drawRoundedRect(x, y, w, h, r, fillColor, strokeColor, lineWidth) {
      ctx.save();
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      const rad = Math.min(r, Math.min(w, h) / 2);
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, rad);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.closePath();
      ctx.fill();
      if (strokeColor && lineWidth) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawPill(x, y, w, h, r, fillColor, strokeColor, lineWidth) {
      drawRoundedRect(x, y, w, h, r, fillColor, strokeColor, lineWidth);
    }

    // 1. Background: Deep Charcoal to Mint-Teal Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1920, 1080);
    bgGrad.addColorStop(0.00, '#1c2522');
    bgGrad.addColorStop(0.35, '#354d44');
    bgGrad.addColorStop(0.70, '#5e8f7e');
    bgGrad.addColorStop(1.00, '#85c2ac');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1920, 1080);

    // Subtle Architectural Grid Mesh
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = 0; gx < 1920; gx += 40) { ctx.moveTo(gx, 0); ctx.lineTo(gx, 1080); }
    for (let gy = 0; gy < 1080; gy += 40) { ctx.moveTo(0, gy); ctx.lineTo(1920, gy); }
    ctx.stroke();
    ctx.restore();

    // Page Badge (16 / 16)
    drawPageBadge(ctx, app);

    // 2. Header
    const titleP = easeOutCubic(t / 0.45);
    ctx.save();
    ctx.globalAlpha = titleP;

    drawPill(60, 40, 290, 26, 13, 'rgba(52, 211, 153, 0.15)', '#34d399', 1.2);
    ctx.fillStyle = '#34d399';
    ctx.font = '800 12.5px "Prompt", sans-serif';
    ctx.fillText('[ 16 ] CLOSING & Q/A SESSION', 76, 58);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 48px "Prompt", sans-serif';
    ctx.fillText('ปิดการนำเสนอและเข้าสู่ช่วงคำถาม', 60, 115);

    ctx.fillStyle = '#d2f2e5';
    ctx.font = '500 20px "Prompt", sans-serif';
    ctx.fillText('Integrated Design & BOM Automation · SCG HEIM', 60, 150);
    ctx.restore();

    // 3. Card Container on Left (Thank You to Team & Listeners)
    const cardP = easeOutCubic((t - 0.15) / 0.5);
    ctx.save();
    ctx.globalAlpha = cardP;

    const cardX = 60, cardY = 185, cardW = 1180, cardH = 820;
    drawRoundedRect(cardX, cardY, cardW, cardH, 24, 'rgba(15, 38, 32, 0.88)', '#34d399', 1.5);

    // Orange accent line & Header
    ctx.strokeStyle = '#fc9459';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cardX + 45, cardY + 55);
    ctx.lineTo(cardX + 115, cardY + 55);
    ctx.stroke();

    ctx.fillStyle = '#fc9459';
    ctx.font = '800 31px "Prompt", sans-serif';
    ctx.fillText('ขอบคุณทีมงานและผู้ฟังทุกท่าน', cardX + 130, cardY + 66);

    // Thank you key headings (big & clean)
    ctx.fillStyle = '#ffffff';
    app.fillFittedText(ctx, 'ขอขอบคุณทีมงานทุกท่านที่ร่วมพัฒนา Integrated Design & BOM Automation ครับ', cardX + 45, cardY + 135, cardW - 90, 26, '700', '"Prompt", sans-serif', 'left');

    const closingPoints = [
      'เชื่อม Architectural Logic + กฎการทำงาน (Coding & P-Rule)',
      'ผสานข้อมูล BOM & Shop Drawing เป็นหนึ่งเดียวอัตโนมัติ',
      'เพิ่มความเร็ว แม่นยำ ลดข้อผิดพลาดจากต้นทางสู่โรงงานผลิต'
    ];
    closingPoints.forEach((pt, pi) => {
      const cy = cardY + 195 + pi * 46;
      ctx.fillStyle = '#34d399';
      ctx.font = '900 24px "Prompt", sans-serif';
      ctx.fillText('•', cardX + 48, cy);
      ctx.fillStyle = '#e2f5ec';
      app.fillFittedText(ctx, pt, cardX + 76, cy, cardW - 120, 22.5, '600', '"Prompt", sans-serif', 'left');
    });

    ctx.fillStyle = '#34d399';
    ctx.font = '800 24px "Prompt", sans-serif';
    ctx.fillText('ขอขอบคุณทุกท่านที่รับฟัง และยินดีตอบทุกข้อซักถามครับ', cardX + 45, cardY + 365);

    // 4 Achievement Badges
    const badges = [
      { icon: '⏱️', title: 'Time Reduction', val: '86% Faster (7d ➔ 1d)' },
      { icon: '💡', title: 'Standardization', val: 'Ruby Logic & DB' },
      { icon: '🛡️', title: 'Error & Loss', val: 'Zero Repeat Markup' },
      { icon: '💰', title: 'Cost Reduction', val: '1.2M THB / Year' }
    ];

    const bW = 250;
    const bGap = 20;
    const bStartX = cardX + 45;
    const bY = cardY + 430;

    badges.forEach((b, idx) => {
      const bx = bStartX + idx * (bW + bGap);
      drawRoundedRect(bx, bY, bW, 130, 16, 'rgba(24, 60, 50, 0.75)', 'rgba(52, 211, 153, 0.45)', 1.2);
      ctx.font = '32px sans-serif';
      ctx.fillText(b.icon, bx + 20, bY + 48);
      ctx.fillStyle = '#ffffff';
      app.fillFittedText(ctx, b.title, bx + 65, bY + 46, bW - 76, 18.5, '700', '"Prompt", sans-serif', 'left');
      ctx.fillStyle = '#34d399';
      app.fillFittedText(ctx, b.val, bx + 20, bY + 96, bW - 36, 17.5, '800', '"Prompt", sans-serif', 'left');
    });

    // 4 Studio portraits preview mini strip
    const miniPhotos = [
      { name: 'Kritsana P.', role: 'Project Leader', img: 'assets/ver3/team/card_kritsana.png' },
      { name: 'Pat B.', role: 'Staff / Developer', img: 'assets/ver3/team/card_pat.png' },
      { name: 'Peeradol T.', role: 'Staff / Developer', img: 'assets/ver3/team/card_peeradol.png' },
      { name: 'Sutee C.', role: 'Staff / Developer', img: 'assets/ver3/team/card_sutee.png' }
    ];
    const mY = cardY + 595;
    const mW = 250;
    miniPhotos.forEach((mp, idx) => {
      const mx = bStartX + idx * (mW + bGap);
      drawRoundedRect(mx, mY, mW, 175, 12, 'rgba(12, 30, 25, 0.85)', 'rgba(52, 211, 153, 0.3)', 1);
      const im = loadImage(mp.img);
      if (im && im.complete && im.naturalWidth) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(mx + 8, mY + 8, 100, 159);
        ctx.clip();
        app.drawMediaContain(ctx, im, im.naturalWidth, im.naturalHeight, mx + 8, mY + 8, 100, 159);
        ctx.restore();
      }
      ctx.fillStyle = '#ffffff';
      app.fillFittedText(ctx, mp.name, mx + 116, mY + 70, mW - 124, 18.5, '700', '"Prompt", sans-serif', 'left');
      ctx.fillStyle = '#78a695';
      app.fillFittedText(ctx, mp.role, mx + 116, mY + 99, mW - 124, 15.5, '500', '"Prompt", sans-serif', 'left');
    });
    ctx.restore();

    // 4. Q & A Hero Graphic Box on Right
    const qP = easeOutCubic((t - 0.25) / 0.5);
    ctx.save();
    ctx.globalAlpha = qP;

    const qX = 1270, qY = 185, qW = 590, qH = 820;
    drawRoundedRect(qX, qY, qW, qH, 24, 'rgba(18, 42, 36, 0.92)', '#fc9459', 2);

    ctx.fillStyle = '#fc9459';
    ctx.font = '900 110px "Prompt", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Q & A', qX + qW / 2, qY + 160);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px "Prompt", sans-serif';
    ctx.fillText('QUESTIONS & ANSWERS', qX + qW / 2, qY + 225);

    // Coral Pill: ช่วงถาม - ตอบ
    drawPill(qX + 130, qY + 265, qW - 260, 48, 24, '#fc9459', null, 0);
    ctx.fillStyle = '#14201b';
    ctx.font = '800 22px "Prompt", sans-serif';
    ctx.fillText('ช่วงถาม - ตอบ', qX + qW / 2, qY + 298);

    ctx.textAlign = 'left';
    const qaItems = [
      '● สอบถามรายละเอียดเชิงเทคนิคและ Logic Ruby',
      '● ระบบถอดปริมาณชิ้นส่วนและ 2D Drawing อัตโนมัติ',
      '● แนวทางการต่อยอดขยายผลสู่โมดูลถัดไป',
      '● ข้อเสนอแนะเพื่อการพัฒนาร่วมกัน'
    ];
    let itY = qY + 380;
    qaItems.forEach(item => {
      drawRoundedRect(qX + 45, itY - 26, qW - 90, 52, 12, 'rgba(30, 68, 58, 0.65)', 'rgba(52, 211, 153, 0.25)', 1);
      ctx.fillStyle = '#d8f2e7';
      app.fillFittedText(ctx, item, qX + 62, itY + 7, qW - 118, 19.5, '600', '"Prompt", sans-serif', 'left');
      itY += 70;
    });

    // Footer info
    ctx.textAlign = 'center';
    ctx.fillStyle = '#78a695';
    ctx.font = '600 19px "Prompt", sans-serif';
    ctx.fillText('SCG HEIM · R&D & TOI DEPARTMENT', qX + qW / 2, qY + qH - 55);
    ctx.restore();
  }

  PresentationApp.prototype.drawFrame = function(now) {
    const s=this.slides[this.activeSlideIndex];
    const isExempt12or14 = !!(s && (s.id === 'v3-new-workflow' || s.layout === 'new-workflow-allinone' || s.id === 'v3-results' || s.layout === 'results-full' || s.layout === 'results'));
    if(s) {
      if(this.v3MotionEnabled===undefined)this.v3MotionEnabled=!reduceMotion;
      if(this._v3motionSlide!==s.id){this._v3motionSlide=s.id;this._v3motionSeconds=0;this._v3lastMotion=now;}
      if(this.v3MotionEnabled) {
        this._v3motionSeconds+=Math.max(0,now-(this._v3lastMotion??now));
        if(!isExempt12or14 && this._v3motionSeconds > MOTION_SETTLE_SEC) {
          this._v3motionSeconds = MOTION_SETTLE_SEC;
        }
      }
      this._v3lastMotion=now;
      this._v3time=this._v3motionSeconds||0;
      updateSpeaker(this,s);
    }
    if (!s || s.sceneType !== 'ver3-editorial') return previousFrame.call(this,now);
    const ctx=this.ctx;
    ctx.save();
    if(s.layout==='cover') {
      drawCoverScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-background' || s.layout==='background') {
      drawBackgroundScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-existing' || s.layout==='existing') {
      drawExistingWorkflowScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-comparison' || s.layout==='existing-detail') {
      drawSlide4ExistingDetailScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-standard' || s.layout==='before-after') {
      drawSlide5BeforeAfterScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-database' || s.layout==='before-after-wall') {
      drawSlide6WallPartitionScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-punching' || s.layout==='before-after-punching') {
      drawSlide7PunchingScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-database-mgmt' || s.layout==='before-after-database') {
      drawSlide8DatabaseMgmtScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-automate-process' || s.layout==='automate-process-full' || s.layout==='before-after-automate') {
      drawSlide9AutomateProcessScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-holeplug-automate' || s.layout==='holeplug-automate-full') {
      drawSlide10HolePlugAutomateScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-new-workflow' || s.layout==='new-workflow-allinone') {
      drawSlide7NewWorkflowAllInOne(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-process-improvement' || s.layout==='process-improvement-full') {
      drawSlide12ProcessImprovementScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-results' || s.layout==='results-full' || s.layout==='results') {
      drawSlide13ResultsScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-next' || s.layout==='next-step-full' || s.layout==='image') {
      drawSlide14NextStepScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-closing' || s.layout==='closing-qa') {
      drawSlide16ClosingScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    if(s.id==='v3-team' || s.layout==='team-full' || s.layout==='team') {
      drawSlide15TeamScene(this, s);
      const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
      ctx.fillStyle='#2b8a6e';ctx.fillRect(0,1074,1920*progress,6);
      ctx.restore();
      if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
      return;
    }
    ctx.fillStyle='#f4f8f5'; ctx.fillRect(0,0,1920,1080);
    ctx.fillStyle='#e0eee6'; ctx.fillRect(1380,0,540,1080);
    ctx.fillStyle='#dc8454'; ctx.fillRect(96,72,52,6);
    text(this,'SCG HEIM  /  INTEGRATED DESIGN & BOM AUTOMATION',168,81,1500,19,'#60776a','500');
    drawPageBadge(ctx, this);
    {
      text(this,s.title,104,187,1660,59,'#203d32','600');
      text(this,s.subtitle,108,244,1660,28,'#60756b','400');
      rule(ctx,108,285,1704);
      const nodes=s.nodes||[];
      if(s.layout==='results') {
        (s.metrics||[]).forEach((m,i)=>{const x=108+i*580;const p=reduceMotion?1:ease((this._v3time-0.8-i*0.22)/1.7);const value=i===1?`${Math.round(86*p)}%`:i===2?`${(1.2*p).toFixed(1)}M`:m.value;text(this,value,x,480,540,118,colors[i],'600');text(this,m.label,x,547,510,34,'#243c34','600');paragraph(this,m.detail,x,605,490,24);});
        rule(ctx,108,706,1704);
        nodes.forEach((n,i)=>{const x=108+i*580;text(this,n.label,x,786,520,29,colors[i],'600');paragraph(this,n.sub,x,838,490,25);});
      } else if(s.layout==='pillars') {
        nodes.forEach((n,i)=>{const x=108+i*580;text(this,`0${i+1}`,x,431,510,82,colors[i],'500');rule(ctx,x,477,510);text(this,n.label,x,553,520,37,'#243c34','600');paragraph(this,n.sub,x,625,475,30);});
      } else if(s.layout==='compare') {
        text(this,'BEFORE / MANUAL',108,365,720,27,'#8b7165','600');text(this,'AFTER / AUTOMATION',976,365,760,27,'#2b8a6e','600');
        nodes.forEach((n,i)=>{const y=452+i*118;text(this,n.label,108,y,720,31,'#65746b');text(this,'→',875,y,60,32,'#df7d4b');text(this,n.sub,976,y,790,31,'#243c34','600');rule(ctx,108,y+42,1704);});
      } else if(s.layout==='team') {
        nodes.forEach((n,i)=>{const x=108+(i%2)*880,y=444+Math.floor(i/2)*240;text(this,`0${i+1}`,x,y,120,48,colors[i]);text(this,n.label,x+130,y,680,37,'#243c34','600');text(this,n.sub,x+130,y+58,650,26,'#65796e');rule(ctx,x,y+102,780);});
      } else {
        const step=nodes.length>3?143:190;
        nodes.forEach((n,i)=>{const y=393+i*step;text(this,`0${i+1}`,108,y,70,23,colors[i%4],'600');text(this,n.label,195,y,660,34,'#243c34','600');paragraph(this,n.sub,195,y+53,630,26);});
        ctx.fillStyle='#fff';ctx.fillRect(910,332,902,584);
        picture(this,s.sourceImage,940,360,842,525);
      }
    }
    motion(this,s);
    rule(ctx,108,985,1704);
    // A quiet progress line and moving cue marker follow the actual slide clock.
    const progress=Math.min(1,Math.max(0,this.slideElapsed/Math.max(1,s.duration)));
    ctx.fillStyle='#2b8a6e';ctx.fillRect(108,983,1704*progress,4);
    if(s.nodes?.length && s.layout!=='results' && s.layout!=='cover' && s.layout!=='team') {
      const n=Math.min(s.nodes.length-1,Math.floor(progress*s.nodes.length));
      const x=s.layout==='pillars'?108+n*580:108;
      const y=s.layout==='pillars'?474:s.layout==='compare'?486+n*118:413+n*(s.nodes.length>3?143:190);
      ctx.fillStyle=colors[n%4];ctx.fillRect(x,y,60,4);
    }
    text(this,s.footerNote||'',108,1025,1300,18,'#6b7f73');
    text(this,`PPT ${(s.sourceSlides||[]).join(', ')}`,1580,1025,230,18,'#6b7f73');
    ctx.restore();
    if(this.subtitleOverlay && s.narration) this.drawSubtitleOverlay(ctx,1920,1080,s.narration);
  };
  function updateSpeaker(app,s) {
    const key=`${app.activeSlideIndex}:${Math.floor(app.slideElapsed)}:${app.isPlaying}`;
    if(app._v3speakerKey===key)return;
    app._v3speakerKey=key;
    const clock=document.getElementById('v3SpeakerClock'),cues=document.getElementById('v3SpeakerCues'),script=document.getElementById('v3SpeakerScript');
    if(!clock)return;
    clock.textContent=`ฉาก ${app.activeSlideIndex+1}/${app.slides.length} · ${app.formatTime(app.slideElapsed)} / ${app.formatTime(s.duration)} · รวม ${app.formatTime(app.getTotalDuration())}`;
    const list=s.speakerCues||[];const active=Math.min(list.length-1,Math.floor(app.slideElapsed/Math.max(1,s.duration)*list.length));
    cues.replaceChildren(...list.map((cue,i)=>{const el=document.createElement('li');el.textContent=cue;if(i===active)el.className='current';return el;}));
    script.textContent=s.narration||'';
  }
  window.addEventListener('DOMContentLoaded',()=>{
    const app=window.app;
    if(!app)return; // Running in Ver4 or canvas initialized dynamically
    // Migrate only the requested pacing/script fields, preserving edited visuals.
    const pacingKey = '14m57s-v4-16slides-voice-sync-v7';
    let needsTiming = true;
    try {
      needsTiming = (localStorage.getItem('dbpa_ver3_pacing') !== pacingKey) ||
                    (app.slides.length !== DEFAULT_SLIDES.length) ||
                    (app.slides[1] && app.slides[1].layout !== 'team-full') ||
                    (app.getTotalDuration && app.getTotalDuration() !== 897);
    } catch(e) {}
    if (needsTiming) {
      app.slides = JSON.parse(JSON.stringify(DEFAULT_SLIDES));
      try {
        app.saveSlides();
        localStorage.setItem('dbpa_ver3_pacing', pacingKey);
      } catch(e) {}
      if (typeof app.renderSlideList === 'function') app.renderSlideList();
      if (typeof app.updateTimelineUI === 'function') app.updateTimelineUI();
    }
    const label=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    const brandTitle=document.querySelector('.brand-title');
    if(brandTitle)brandTitle.textContent='Integrated Design & BOM Automation';
    const brandSub=document.querySelector('.brand-sub');
    if(brandSub)brandSub.textContent='Ver3 · Design to Production & Installation';
    const hanko=document.querySelector('.hanko-stamp');
    if(hanko)hanko.innerHTML='<span>V3</span><span>BOM</span>';
    const toolbar=document.querySelector('.toolbar-actions');
    if(toolbar){
      const edit=document.createElement('button');edit.className='btn v3-mode';edit.id='btnV3Editor';edit.textContent='แก้ไข / ตั้งค่า';edit.setAttribute('aria-expanded','false');
      edit.addEventListener('click',()=>{const active=document.body.classList.toggle('edit-mode');edit.textContent=active?'ปิดแผงแก้ไข':'แก้ไข / ตั้งค่า';edit.setAttribute('aria-expanded',String(active));});
      toolbar.prepend(edit);
      const replay=document.createElement('button');replay.className='btn v3-mode';replay.id='btnV3Replay';replay.textContent='↻ เล่นแอนิเมชันซ้ำ';
      replay.addEventListener('click',()=>{app.seekTo(app.getSlideStartTime(app.activeSlideIndex));app.v3MotionEnabled=true;app._v3motionSeconds=0;app._v3lastMotion=performance.now()/1000;app.slidePreviewStart=performance.now()/1000;motionToggle.textContent='แอนิเมชัน: เปิด';motionToggle.setAttribute('aria-pressed','true');});
      const motionToggle=document.createElement('button');motionToggle.className='btn';motionToggle.id='btnV3Motion';motionToggle.textContent=reduceMotion?'แอนิเมชัน: ปิด':'แอนิเมชัน: เปิด';motionToggle.setAttribute('aria-pressed',String(!reduceMotion));
      motionToggle.addEventListener('click',()=>{app.v3MotionEnabled=!app.v3MotionEnabled;motionToggle.textContent=app.v3MotionEnabled?'แอนิเมชัน: เปิด':'แอนิเมชัน: ปิด';motionToggle.setAttribute('aria-pressed',String(app.v3MotionEnabled));});
      toolbar.prepend(motionToggle);toolbar.prepend(replay);
      const back=document.createElement('a');back.href='index.html';back.className='v3-back';back.textContent='Ver2';toolbar.append(back);
    }
    const stagePanel=document.querySelector('.stage-panel');
    if(stagePanel){
      const speaker=document.createElement('details');speaker.id='v3Speaker';speaker.innerHTML='<summary>บทบรรยายและคิวพูด · 14:57 นาที</summary><div id="v3SpeakerClock"></div><ol id="v3SpeakerCues"></ol><p id="v3SpeakerScript"></p><small>เวลาแต่ละฉากรวมการอธิบาย ชี้ภาพ และสาธิตวิดีโอ กด Pause เพื่อหยุดอธิบายเพิ่มเติมได้</small>';
      stagePanel.append(speaker);
    }
    app._v3speakerKey=null;updateSpeaker(app,app.slides[app.activeSlideIndex]);
    label('btnThemeToggle','สีพื้นหลัง Ver2 / Ver1');
    const edScene=document.getElementById('edSceneTypeSelect');
    if(edScene){
      const opt=document.createElement('option');opt.value='ver3-editorial';opt.textContent='Ver3 · เนื้อหาจาก PowerPoint';edScene.append(opt);
    }
    if(typeof app.loadSlideIntoEditor === 'function') app.loadSlideIntoEditor(app.activeSlideIndex);
    label('slideCountHeader', `เนื้อหานำเสนอ · ${app.slides.length} ฉาก`);

    const canvas = document.getElementById('stageCanvas');
    if (canvas && !canvas._v3TabListenerAttached) {
      canvas._v3TabListenerAttached = true;
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = 1920 / rect.width;
        const scaleY = 1080 / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;

        const curSlide = app.slides[app.activeSlideIndex];
        if (curSlide && (curSlide.id === 'v3-new-workflow' || curSlide.layout === 'new-workflow-allinone')) {
          // Top bar tabs (y: 16..54)
          if (cy >= 16 && cy <= 54) {
            // Tab 0: 475..735
            if (cx >= 475 && cx <= 735) {
              app._ver2SubStep = 0;
              if (typeof app.render === 'function') app.render();
              return;
            }
            // Tab 1: 745..1035
            if (cx >= 745 && cx <= 1035) {
              app._ver2SubStep = 1;
              if (typeof app.render === 'function') app.render();
              return;
            }
            // Tab 2: 1045..1275
            if (cx >= 1045 && cx <= 1275) {
              app._ver2SubStep = 2;
              if (typeof app.render === 'function') app.render();
              return;
            }
            // Style toggles when on Step 0
            if (cx >= 1310 && cx <= 1510) {
              app.parallelBranchStyle = 'clean-minimal';
              if (typeof app.render === 'function') app.render();
              return;
            }
            if (cx >= 1520 && cx <= 1700) {
              app.parallelBranchStyle = 'ver2-dark';
              if (typeof app.render === 'function') app.render();
              return;
            }
          }
        }
      });
    }
  });

  // ==============================================================================
  // ENHANCED PROCEDURAL ANIMATION: NEW WORKFLOW 4-BRANCH PARALLEL PIPELINE
  // Balanced full-canvas SCG HEIM Japanese Architectural layout + zero overlaps
  // ==============================================================================
  PresentationApp.prototype.drawCleanMinimalNewFlowchart = function(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    const bgPal = (typeof this.getCustomBackgroundPalette === 'function')
      ? this.getCustomBackgroundPalette('washi')
      : { preset: 'default', isDark: false };

    const isDarkSurface = bgPal.preset === 'emerald-dark' || bgPal.preset === 'blueprint' || (bgPal.preset === 'custom' && bgPal.isDark);
    const cardX = box.x + 8;
    const cardY = box.y + 6;
    const cardW = box.w - 16;
    const cardH = box.h - 12;

    // 1. SCG HEIM / Japanese Architectural Stage Backdrop Surface
    if (typeof ctx.createLinearGradient === 'function') {
      const surf = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
      if (bgPal.preset === 'washi') {
        surf.addColorStop(0, '#fcfbf6');
        surf.addColorStop(1, '#f3efe3');
      } else if (bgPal.preset === 'white') {
        surf.addColorStop(0, '#ffffff');
        surf.addColorStop(1, '#f8fafc');
      } else if (bgPal.preset === 'emerald-dark') {
        surf.addColorStop(0, '#0f221b');
        surf.addColorStop(1, '#142c24');
      } else if (bgPal.preset === 'blueprint') {
        surf.addColorStop(0, '#0d1e33');
        surf.addColorStop(1, '#132a46');
      } else if (bgPal.preset === 'custom') {
        surf.addColorStop(0, bgPal.stops[0] || '#f6f8f7');
        surf.addColorStop(1, bgPal.stops[bgPal.stops.length - 1] || '#eaf2ee');
      } else {
        // Default SCG HEIM Mint-Washi surface matching the rest of the deck
        surf.addColorStop(0, '#f5faf7');
        surf.addColorStop(0.5, '#ffffff');
        surf.addColorStop(1, '#eef6f2');
      }
      ctx.fillStyle = surf;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = isDarkSurface ? 'rgba(52, 211, 153, 0.35)' : '#b8d5c8';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Subtle Architectural Dot Grid
    ctx.save();
    ctx.fillStyle = isDarkSurface ? 'rgba(52, 211, 153, 0.08)' : 'rgba(6, 95, 70, 0.05)';
    for (let gx = cardX + 32; gx < cardX + cardW - 20; gx += 32) {
      for (let gy = cardY + 32; gy < cardY + cardH - 20; gy += 32) {
        if (typeof ctx.arc === 'function') {
          ctx.beginPath();
          ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    const inkMain = isDarkSurface ? '#f8fafc' : '#0f172a';
    const inkMuted = isDarkSurface ? '#cbd5e1' : '#475569';
    const nodeFill = isDarkSurface ? '#152e25' : '#ffffff';
    const nodeBorderMuted = isDarkSurface ? '#2e5949' : '#cbd5e1';

    // 2. TIMELINE ANIMATION PHASES (10-Second Complete Story Cycle)
    const cycleT = (animSec || 0) % 10.0;
    let activePhase = 1;
    if (cycleT < 2.0) activePhase = 1;
    else if (cycleT < 4.5) activePhase = 2;
    else if (cycleT < 7.5) activePhase = 3;
    else activePhase = 4;

    // 3. TOP ARCHITECTURAL HEADER & KPI STRIP (uses upper canvas space cleanly!)
    const hdrX = cardX + 28, hdrY = cardY + 18, hdrW = cardW - 56, hdrH = 104;
    ctx.save();
    ctx.fillStyle = isDarkSurface ? 'rgba(15, 36, 28, 0.85)' : '#102820';
    this.roundRect(ctx, hdrX, hdrY, hdrW, hdrH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Header Kicker Pill
    ctx.fillStyle = '#059669';
    this.roundRect(ctx, hdrX + 20, hdrY + 12, 276, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    this.fillFittedText(ctx, 'NEW INTEGRATED DESIGN ENGINE', hdrX + 158, hdrY + 29, 258, 13.5, '800', '"Prompt", sans-serif', 'center');

    // Header Title & Subtitle
    ctx.fillStyle = '#ffffff';
    this.fillFittedText(ctx, 'สถาปัตยกรรมระบบออกแบบอัตโนมัติ (4 สายงานคู่ขนาน)', hdrX + 20, hdrY + 65, 860, 27, '800', '"Prompt", sans-serif');
    ctx.fillStyle = '#a7f3d0';
    this.fillFittedText(ctx, '1 โมเดลกลาง OTF + Database & P-Rule ➔ แตกไฟล์ผลิตครบทุกแผนกในคลิกเดียว', hdrX + 20, hdrY + 93, 860, 17, '600', '"Prompt", sans-serif');

    // Top-Right 3 KPI Summary Pills
    const kpis = [
      { badge: '⚡ ≤ 2 นาที', label: 'Auto Processing Time', sub: 'ลดจาก Manual 5-7 วัน', col: '#10b981' },
      { badge: '🔀 4 Streams', label: 'Parallel Outputs Ready', sub: 'ไม่มี Key-in ซ้ำซ้อน', col: '#38bdf8' },
      { badge: '🎯 100% / ±1mm', label: 'BOQ & CNC Precision', sub: 'ตรงแบบจริงหน้างาน', col: '#f59e0b' }
    ];
    kpis.forEach((kp, ki) => {
      const kw = 248, kh = 84, kx = hdrX + hdrW - (3 - ki) * (kw + 12), ky = hdrY + 10;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      this.roundRect(ctx, kx, ky, kw, kh, 12);
      ctx.fill();
      ctx.strokeStyle = kp.col;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = kp.col;
      this.fillFittedText(ctx, kp.badge, kx + 14, ky + 27, kw - 28, 20, '800', '"Prompt", sans-serif');
      ctx.fillStyle = '#f8fafc';
      this.fillFittedText(ctx, kp.label, kx + 14, ky + 51, kw - 28, 15.5, '700', '"Prompt", sans-serif');
      ctx.fillStyle = '#cbd5e1';
      this.fillFittedText(ctx, kp.sub, kx + 14, ky + 72, kw - 28, 14, '600', '"Prompt", sans-serif');
    });
    ctx.restore();

    // 4. CORE PREREQUISITES FOUNDATION STRIP feeding down into Auto BOM Hub
    const otfBoxX = cardX + 46;
    const otfBoxW = 204;
    const hubBoxX = otfBoxX + otfBoxW + 62;
    const hubBoxW = 296;

    const preW = 266, preH = 68, preGap = 18;
    const preTotalW = preW * 3 + preGap * 2;
    const preStartX = Math.max(cardX + 340, hubBoxX - preW + 40);
    const preY = hdrY + hdrH + 18;

    const prereqs = [
      { title: '1. Database (MIM / IM)', sub: 'คลัง Spec ผนัง & วัสดุมาตรฐาน', col: '#059669' },
      { title: '2. Coding Rule', sub: 'รหัสอัจฉริยะ C / L / S / J / M / E', col: '#0284c7' },
      { title: '3. Planing Rule (P-Rule)', sub: 'กติกาจัดแนว Grid ประตู & รอยต่ออัตโนมัติ', col: '#7c3aed' }
    ];
    prereqs.forEach((pr, pi) => {
      const px = preStartX + pi * (preW + preGap);
      ctx.save();
      ctx.fillStyle = nodeFill;
      this.roundRect(ctx, px, preY, preW, preH, 12);
      ctx.fill();
      ctx.strokeStyle = pr.col;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = pr.col;
      this.roundRect(ctx, px + 10, preY + 10, 6, preH - 20, 3);
      ctx.fill();

      ctx.fillStyle = inkMain;
      this.fillFittedText(ctx, pr.title, px + 24, preY + 29, preW - 32, 17.5, '800', '"Prompt", sans-serif');
      ctx.fillStyle = inkMuted;
      this.fillFittedText(ctx, pr.sub, px + 24, preY + 54, preW - 32, 14.5, '600', '"Prompt", sans-serif');
      ctx.restore();
    });

    // 5. MAIN 4-BRANCH FLOW COORDINATES (Spacious, well-proportioned!)
    const flowCenterY = cardY + 462;
    const branchGap = 102;
    const bY1 = flowCenterY - 1.5 * branchGap;
    const bY2 = flowCenterY - 0.5 * branchGap;
    const bY3 = flowCenterY + 0.5 * branchGap;
    const bY4 = flowCenterY + 1.5 * branchGap;

    // HELPER: Animated Flow Pipe with Traveling Glowing Data Orbs
    function drawAnimatedFlowPipe(ctx, pts, color, nowSec, speed, hasArrow, numOrbs, trailColor, branchGlow) {
      if (!pts || pts.length < 2) return;
      let totalLen = 0;
      const segs = [];
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        segs.push({ p1: pts[i - 1], p2: pts[i], dx, dy, len, accum: totalLen });
        totalLen += len;
      }
      if (totalLen <= 0) return;

      function getPointAt(d) {
        d = Math.max(0, Math.min(totalLen, d));
        for (let i = 0; i < segs.length; i++) {
          const s = segs[i];
          if (d <= s.accum + s.len || i === segs.length - 1) {
            const t = s.len > 0 ? (d - s.accum) / s.len : 0;
            return { x: s.p1.x + s.dx * t, y: s.p1.y + s.dy * t, angle: Math.atan2(s.dy, s.dx) };
          }
        }
        return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, angle: 0 };
      }

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([8, 9]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (branchGlow) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.globalAlpha = 0.12 + 0.05 * Math.sin(nowSec * 1.6);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      const count = numOrbs || 2;
      const partSpacing = totalLen / Math.max(1, count);
      // Calm, slow data orb speed so viewers can follow flows easily without eye strain
      const flowSpeed = (speed || 1.0) * 28;
      const baseOffset = (nowSec * flowSpeed) % totalLen;

      for (let p = 0; p < count; p++) {
        const curDist = (baseOffset + p * partSpacing) % totalLen;
        const curPt = getPointAt(curDist);

        for (let t = 1; t <= 4; t++) {
          const tailDist = curDist - t * 6;
          if (tailDist >= 0) {
            const tailPt = getPointAt(tailDist);
            ctx.fillStyle = trailColor || color;
            ctx.globalAlpha = 0.36 / t;
            if (typeof ctx.arc === 'function') {
              ctx.beginPath();
              ctx.arc(tailPt.x, tailPt.y, Math.max(1.5, 4.0 - t * 0.7), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        ctx.globalAlpha = 1.0;

        if (typeof ctx.createRadialGradient === 'function' && typeof ctx.arc === 'function') {
          const grad = ctx.createRadialGradient(curPt.x, curPt.y, 0, curPt.x, curPt.y, 11);
          grad.addColorStop(0, '#FFFFFF');
          grad.addColorStop(0.45, color);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(curPt.x, curPt.y, 11, 0, Math.PI * 2);
          ctx.fill();
        }
        if (typeof ctx.arc === 'function') {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(curPt.x, curPt.y, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (hasArrow && pts.length >= 2) {
        const endPt = pts[pts.length - 1];
        const prevPt = pts[pts.length - 2];
        const angle = Math.atan2(endPt.y - prevPt.y, endPt.x - prevPt.x);
        const headLen = 12;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(endPt.x, endPt.y);
        ctx.lineTo(endPt.x - headLen * Math.cos(angle - Math.PI / 6), endPt.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endPt.x - headLen * 0.5 * Math.cos(angle), endPt.y - headLen * 0.5 * Math.sin(angle));
        ctx.lineTo(endPt.x - headLen * Math.cos(angle + Math.PI / 6), endPt.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Helper for clean pill nodes along each branch (eliminates floating text overlap)
    const drawBranchNode = (x, y, text, accentCol, bgCol, widthPad = 28) => {
      ctx.save();
      ctx.font = '800 17px "Prompt", sans-serif';
      const w = Math.max(88, ctx.measureText(text).width + widthPad);
      const h = 38;
      ctx.fillStyle = bgCol || nodeFill;
      ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      this.roundRect(ctx, x, y - h / 2, w, h, 10);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = accentCol;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = bgCol && bgCol !== '#ffffff' && bgCol !== nodeFill ? '#ffffff' : inkMain;
      ctx.textAlign = 'center';
      ctx.fillText(text, x + w / 2, y + 6);
      ctx.textAlign = 'left';
      ctx.restore();
      return w;
    };

    // 6. NODE 1: OTF (Forcon.) INPUT BOX (Widened so badge fits cleanly!)
    const otfBoxH = 124;
    const otfBoxY = flowCenterY - otfBoxH / 2;
    const isOtfActive = activePhase === 1;

    ctx.save();
    ctx.shadowColor = isOtfActive ? 'rgba(59, 130, 246, 0.45)' : 'rgba(59, 130, 246, 0.14)';
    ctx.shadowBlur = isOtfActive ? 18 + 4 * Math.sin(nowSec * 2) : 10;
    ctx.fillStyle = nodeFill;
    this.roundRect(ctx, otfBoxX, otfBoxY, otfBoxW, otfBoxH, 18);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = isOtfActive ? '#2563EB' : '#60A5FA';
    ctx.lineWidth = isOtfActive ? 3.2 : 2.2;
    ctx.stroke();

    // Widened Pill Badge above Box (fit 100% cleanly without overflow!)
    ctx.fillStyle = isOtfActive ? '#2563EB' : '#DBEAFE';
    this.roundRect(ctx, otfBoxX + 6, otfBoxY - 15, otfBoxW - 12, 26, 13);
    ctx.fill();
    ctx.fillStyle = isOtfActive ? '#FFFFFF' : '#1E40AF';
    this.fillFittedText(ctx, '📥 ARCHITECTURAL INPUT', otfBoxX + otfBoxW / 2, otfBoxY + 2.5, otfBoxW - 22, 13.5, '800', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = inkMain;
    this.fillFittedText(ctx, 'OTF', otfBoxX + otfBoxW / 2, otfBoxY + 54, otfBoxW - 24, 28, '800', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = inkMuted;
    this.fillFittedText(ctx, '(Forcon.)', otfBoxX + otfBoxW / 2, otfBoxY + 84, otfBoxW - 24, 18.5, '600', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = '#2563EB';
    this.fillFittedText(ctx, '2D Plan & Wall Spec', otfBoxX + otfBoxW / 2, otfBoxY + 110, otfBoxW - 20, 14.5, '700', '"Prompt", sans-serif', 'center');
    ctx.restore();

    // 7. NODE 2: CORE HUB BOX — Auto BOM & Drawing (Gear cleanly separated!)
    const hubBoxH = 132;
    const hubBoxY = flowCenterY - hubBoxH / 2;
    const isHubActive = activePhase === 2;

    // Animated feed pipes from Prerequisites down into Auto BOM Hub
    prereqs.forEach((pr, pi) => {
      const startX = preStartX + pi * (preW + preGap) + preW / 2;
      const targetX = hubBoxX + 60 + pi * 88;
      drawAnimatedFlowPipe(ctx, [
        { x: startX, y: preY + preH },
        { x: startX, y: preY + preH + 18 },
        { x: targetX, y: preY + preH + 18 },
        { x: targetX, y: hubBoxY - 16 }
      ], pr.col, nowSec, 0.9, true, 1, pr.col, isHubActive);
    });

    // Animated Pipe: OTF -> Auto BOM
    drawAnimatedFlowPipe(ctx, [
      { x: otfBoxX + otfBoxW, y: flowCenterY },
      { x: hubBoxX, y: flowCenterY }
    ], '#059669', nowSec, 1.25, true, 2, '#34D399', isOtfActive || isHubActive);

    ctx.save();
    ctx.shadowColor = isHubActive ? 'rgba(16, 185, 129, 0.52)' : 'rgba(16, 185, 129, 0.18)';
    ctx.shadowBlur = isHubActive ? 20 + 4 * Math.sin(nowSec * 2) : 12;
    ctx.fillStyle = nodeFill;
    this.roundRect(ctx, hubBoxX, hubBoxY, hubBoxW, hubBoxH, 18);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = isHubActive ? '#10B981' : '#059669';
    ctx.lineWidth = isHubActive ? 3.4 : 2.6;
    ctx.stroke();

    // Top Auto Engine Pill (clearly separated from gear!)
    ctx.fillStyle = isHubActive ? '#10B981' : '#D1FAE5';
    this.roundRect(ctx, hubBoxX + 14, hubBoxY - 16, hubBoxW - 56, 26, 13);
    ctx.fill();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = isHubActive ? '#FFFFFF' : '#065F46';
    this.fillFittedText(ctx, '⚡ AUTO ENGINE (≤ 2 นาที)', hubBoxX + 14 + (hubBoxW - 56) / 2, hubBoxY + 2, hubBoxW - 68, 14, '800', '"Prompt", sans-serif', 'center');

    // Animated Gear safely positioned top-right corner clear of pill!
    ctx.save();
    ctx.translate(hubBoxX + hubBoxW - 22, hubBoxY + 26);
    ctx.rotate(nowSec * 0.55);
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    if (typeof ctx.arc === 'function') {
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = inkMain;
    this.fillFittedText(ctx, 'Auto BOM & Drawing', hubBoxX + hubBoxW / 2, hubBoxY + 54, hubBoxW - 36, 23, '800', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = isDarkSurface ? '#6ee7b7' : '#047857';
    this.fillFittedText(ctx, '(SketchUp Automation)', hubBoxX + hubBoxW / 2, hubBoxY + 84, hubBoxW - 32, 18.5, '700', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = inkMuted;
    this.fillFittedText(ctx, '✓ Logic & P-Rule Synced 100%', hubBoxX + hubBoxW / 2, hubBoxY + 114, hubBoxW - 28, 14.5, '700', '"Prompt", sans-serif', 'center');
    ctx.restore();

    // 8. FAN-OUT BUS FROM AUTO BOM TO 4 BRANCHES
    const trunkX = hubBoxX + hubBoxW + 38;
    ctx.save();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hubBoxX + hubBoxW, flowCenterY);
    ctx.lineTo(trunkX, flowCenterY);
    ctx.moveTo(trunkX, bY1);
    ctx.lineTo(trunkX, bY4);
    ctx.stroke();

    ctx.fillStyle = '#10B981';
    [bY1, bY2, bY3, bY4].forEach(by => {
      if (typeof ctx.arc === 'function') {
        ctx.beginPath();
        ctx.arc(trunkX, by, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();

    // 9. DESTINATION: Production BOX
    const destBoxW = 248;
    const destBoxH = 128;
    const destBoxX = cardX + cardW - destBoxW - 44;
    const destBoxY = flowCenterY - destBoxH / 2;
    const isDestActive = activePhase === 4;

    ctx.save();
    if (isDestActive) {
      const ripT = (nowSec * 1.0) % 1.5;
      ctx.strokeStyle = 'rgba(16, 185, 129, ' + Math.max(0, 0.45 - ripT * 0.3) + ')';
      ctx.lineWidth = 2.5;
      this.roundRect(ctx, destBoxX - ripT * 10, destBoxY - ripT * 10, destBoxW + ripT * 20, destBoxH + ripT * 20, 22);
      ctx.stroke();
    }
    ctx.shadowColor = isDestActive ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.16)';
    ctx.shadowBlur = isDestActive ? 22 : 12;
    ctx.fillStyle = isDarkSurface ? '#064e3b' : '#D1FAE5';
    this.roundRect(ctx, destBoxX, destBoxY, destBoxW, destBoxH, 18);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.fillStyle = isDestActive ? '#059669' : '#10B981';
    this.roundRect(ctx, destBoxX + 12, destBoxY - 16, destBoxW - 24, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, '🏭 FACTORY ASSEMBLY', destBoxX + destBoxW / 2, destBoxY + 2, destBoxW - 36, 14, '800', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = isDarkSurface ? '#FFFFFF' : '#0F172A';
    this.fillFittedText(ctx, 'Production', destBoxX + destBoxW / 2, destBoxY + 62, destBoxW - 28, 28, '800', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = isDarkSurface ? '#6ee7b7' : '#047857';
    this.fillFittedText(ctx, '✓ พร้อมผลิต & ประกอบ ±1mm', destBoxX + destBoxW / 2, destBoxY + 98, destBoxW - 20, 16, '700', '"Prompt", sans-serif', 'center');
    ctx.restore();

    // 10. FOUR PARALLEL BRANCHES (Clean Pill Nodes + Floating Tag CLEARLY above at -38px)
    const bStartX = trunkX + 42;
    const isFanActive = activePhase === 3 || activePhase === 4;

    const drawBranchTag = (x, y, label, col, tint) => {
      ctx.save();
      ctx.font = '700 13.5px "Prompt", sans-serif';
      const w = Math.max(146, ctx.measureText(label).width + 22);
      ctx.fillStyle = tint;
      this.roundRect(ctx, x, y - 3, w, 24, 12);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y + 14);
      ctx.textAlign = 'left';
      ctx.restore();
    };

    // ----- BRANCH 1: PartItems -> Purchase -> Production -----
    const colB1 = '#0284C7';
    drawAnimatedFlowPipe(ctx, [{ x: trunkX, y: bY1 }, { x: bStartX, y: bY1 }], colB1, nowSec, 1.25, false, 1, '#38BDF8', isFanActive);
    const wPart = drawBranchNode(bStartX, bY1, 'PartItems', colB1);
    drawBranchTag(bStartX, bY1 - 42, '📦 BOM Auto Export (.XLSX)', colB1, 'rgba(2, 132, 199, 0.14)');

    const pToPStart = bStartX + wPart;
    const pToPEnd = pToPStart + 74;
    drawAnimatedFlowPipe(ctx, [{ x: pToPStart, y: bY1 }, { x: pToPEnd, y: bY1 }], colB1, nowSec, 1.25, true, 1, '#38BDF8', isFanActive);
    const wPurch = drawBranchNode(pToPEnd + 4, bY1, 'Purchase & MRP', colB1);

    const turnDownX = destBoxX + destBoxW * 0.65;
    drawAnimatedFlowPipe(ctx, [
      { x: pToPEnd + 4 + wPurch, y: bY1 },
      { x: turnDownX, y: bY1 },
      { x: turnDownX, y: destBoxY - 15 }
    ], colB1, nowSec, 1.3, true, 2, '#38BDF8', isFanActive);

    // ----- BRANCH 2: Job Order / Picking List -> Production -----
    const colB2 = '#D97706';
    drawAnimatedFlowPipe(ctx, [{ x: trunkX, y: bY2 }, { x: bStartX, y: bY2 }], colB2, nowSec, 1.25, false, 1, '#FBBF24', isFanActive);
    const wJob = drawBranchNode(bStartX, bY2, 'Job Order / Picking List', colB2);
    drawBranchTag(bStartX, bY2 - 42, '📋 Picking Sheet S230 (.PDF)', colB2, 'rgba(217, 119, 6, 0.14)');
    drawAnimatedFlowPipe(ctx, [
      { x: bStartX + wJob, y: bY2 },
      { x: destBoxX, y: bY2 }
    ], colB2, nowSec, 1.3, true, 2, '#FBBF24', isFanActive);

    // ----- BRANCH 3: SB List -> CAD EE Punching -> Lantek -> Cutting BP -> Production -----
    const colB3 = '#7C3AED';
    drawAnimatedFlowPipe(ctx, [{ x: trunkX, y: bY3 }, { x: bStartX, y: bY3 }], colB3, nowSec, 1.25, false, 1, '#A78BFA', isFanActive);
    const wSB = drawBranchNode(bStartX, bY3, 'SB List', colB3);
    drawBranchTag(bStartX, bY3 - 42, '⚡ CNC Punching DXF + EE', colB3, 'rgba(124, 58, 237, 0.14)');

    const cadX = bStartX + wSB + 46;
    drawAnimatedFlowPipe(ctx, [{ x: bStartX + wSB, y: bY3 }, { x: cadX, y: bY3 }], colB3, nowSec, 1.25, true, 1, '#A78BFA', isFanActive);
    const wCad = drawBranchNode(cadX, bY3, '⚡ CAD EE Punching', colB3, '#6D28D9', 32);

    const lanX = cadX + wCad + 46;
    drawAnimatedFlowPipe(ctx, [{ x: cadX + wCad, y: bY3 }, { x: lanX, y: bY3 }], colB3, nowSec, 1.25, true, 1, '#A78BFA', isFanActive);
    const wLan = drawBranchNode(lanX, bY3, 'Lantek', colB3);

    const cutX = lanX + wLan + 46;
    drawAnimatedFlowPipe(ctx, [{ x: lanX + wLan, y: bY3 }, { x: cutX, y: bY3 }], colB3, nowSec, 1.25, true, 1, '#A78BFA', isFanActive);
    const wCut = drawBranchNode(cutX, bY3, 'Cutting BP', colB3);

    const b3TurnUpX = destBoxX - 24;
    drawAnimatedFlowPipe(ctx, [
      { x: cutX + wCut, y: bY3 },
      { x: b3TurnUpX, y: bY3 },
      { x: b3TurnUpX, y: destBoxY + destBoxH - 22 },
      { x: destBoxX, y: destBoxY + destBoxH - 22 }
    ], colB3, nowSec, 1.3, true, 2, '#A78BFA', isFanActive);

    // ----- BRANCH 4: 2D & 3D Drawing -> Production -----
    const colB4 = '#059669';
    drawAnimatedFlowPipe(ctx, [{ x: trunkX, y: bY4 }, { x: bStartX, y: bY4 }], colB4, nowSec, 1.25, false, 1, '#34D399', isFanActive);
    const wDwg = drawBranchNode(bStartX, bY4, '2D & 3D Drawing', colB4);
    drawBranchTag(bStartX, bY4 - 42, '📐 Shop DWG & 3D Model (.DWG/.SKP)', colB4, 'rgba(5, 150, 105, 0.14)');

    const b4TurnUpX = destBoxX - 10;
    drawAnimatedFlowPipe(ctx, [
      { x: bStartX + wDwg, y: bY4 },
      { x: b4TurnUpX, y: bY4 },
      { x: b4TurnUpX, y: destBoxY + destBoxH - 4 },
      { x: destBoxX, y: destBoxY + destBoxH - 4 }
    ], colB4, nowSec, 1.3, true, 2, '#34D399', isFanActive);

    // 11. BOTTOM LIVE DELIVERABLE THUMBNAIL STRIP (uses lower canvas space cleanly!)
    const stripY = cardY + cardH - 270;
    const stripH = 198;
    const stripX = cardX + 28;
    const stripW = cardW - 56;

    ctx.save();
    ctx.fillStyle = isDarkSurface ? 'rgba(15, 36, 28, 0.72)' : 'rgba(241, 248, 245, 0.92)';
    this.roundRect(ctx, stripX, stripY, stripW, stripH, 16);
    ctx.fill();
    ctx.strokeStyle = isDarkSurface ? 'rgba(52, 211, 153, 0.28)' : '#cbd5e1';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = inkMain;
    this.fillFittedText(ctx, '📄 OUTPUT DELIVERABLES PREVIEW — ผลผลิตจริงที่สร้างอัตโนมัติพร้อมส่งทุกสายงาน', stripX + 18, stripY + 26, stripW - 36, 17, '800', '"Prompt", sans-serif');

    const docs = this.factoryDocs || {};
    const thumbCards = [
      { title: '00 • 3D Model (.SKP)', sub: 'โครงสร้างผนังทั้งหลัง', img: docs.model3d, col: '#059669' },
      { title: '01 • PartItems (BOM)', sub: 'ถอดปริมาณ PO Auto (.XLSX)', img: docs.partItems, col: '#0284C7' },
      { title: '02 • Job Order (S230)', sub: 'ใบสั่งผลิต & Picking (.PDF)', img: docs.jobOrder, col: '#D97706' },
      { title: '03 • SB List & EE', sub: 'CAD Punching + Lantek (.DXF)', img: docs.sbList, col: '#7C3AED' },
      { title: '04 • Shop Drawing', sub: 'แบบประกอบ ±1mm (.DWG)', img: docs.drawingAssembly, col: '#10B981' }
    ];
    const tcGap = 14;
    const tcW = (stripW - 36 - tcGap * 4) / 5;
    const tcY = stripY + 38;
    const tcH = 148;

    thumbCards.forEach((tc, ti) => {
      const tx = stripX + 18 + ti * (tcW + tcGap);
      const isLit = (activePhase === 3 && ti > 0) || (activePhase === 4);
      ctx.save();
      ctx.fillStyle = nodeFill;
      this.roundRect(ctx, tx, tcY, tcW, tcH, 12);
      ctx.fill();
      ctx.strokeStyle = isLit ? tc.col : nodeBorderMuted;
      ctx.lineWidth = isLit ? 2.2 : 1.2;
      ctx.stroke();

      // Thumbnail frame
      const imBoxX = tx + 8, imBoxY = tcY + 8, imBoxW = tcW - 16, imBoxH = 92;
      ctx.fillStyle = isDarkSurface ? '#0f172a' : '#f1f5f9';
      this.roundRect(ctx, imBoxX, imBoxY, imBoxW, imBoxH, 8);
      ctx.fill();
      ctx.strokeStyle = isDarkSurface ? '#1e293b' : '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (tc.img && tc.img.complete && tc.img.naturalWidth > 0 && typeof this.drawMediaContain === 'function') {
        this.drawMediaContain(ctx, tc.img, tc.img.naturalWidth, tc.img.naturalHeight, imBoxX + 4, imBoxY + 4, imBoxW - 8, imBoxH - 8);
      }

      ctx.fillStyle = tc.col;
      this.fillFittedText(ctx, tc.title, tx + 10, tcY + 118, tcW - 20, 15.5, '800', '"Prompt", sans-serif');
      ctx.fillStyle = inkMuted;
      this.fillFittedText(ctx, tc.sub, tx + 10, tcY + 139, tcW - 20, 13.5, '600', '"Prompt", sans-serif');
      ctx.restore();
    });
    ctx.restore();

    // 12. BOTTOM STORYLINE PIPELINE PROGRESS BAR
    const bBarY = cardY + cardH - 52;
    const bBarX = cardX + 28;
    const bBarW = cardW - 56;

    ctx.save();
    ctx.fillStyle = '#0F172A';
    this.roundRect(ctx, bBarX, bBarY, bBarW, 38, 19);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    const stages = [
      { num: '01', title: '1. นำเข้าแบบแปลน OTF', phase: 1, color: '#3B82F6' },
      { num: '02', title: '2. Auto BOM & Drawing (≤ 2 นาที)', phase: 2, color: '#10B981' },
      { num: '03', title: '3. แยก 4 สายงานคู่ขนานพร้อมกัน', phase: 3, color: '#F59E0B' },
      { num: '04', title: '4. ส่งตรงสู่โรงงานฝ่ายผลิตทันที', phase: 4, color: '#10B981' }
    ];

    const sPillW = (bBarW - 40) / 4;
    stages.forEach((stg, i) => {
      const spX = bBarX + 16 + i * sPillW;
      const isCur = activePhase === stg.phase;
      ctx.fillStyle = isCur ? stg.color : 'rgba(255, 255, 255, 0.05)';
      this.roundRect(ctx, spX + 4, bBarY + 5, sPillW - 8, 28, 14);
      ctx.fill();
      ctx.fillStyle = isCur ? '#FFFFFF' : '#94A3B8';
      this.fillFittedText(ctx, stg.title, spX + sPillW / 2, bBarY + 24, sPillW - 24, isCur ? 15 : 14.5, isCur ? '800' : '600', '"Prompt", sans-serif', 'center');
    });
    ctx.restore();

    ctx.restore();
  };

})();

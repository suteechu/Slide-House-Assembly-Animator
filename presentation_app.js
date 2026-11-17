// Digital Blueprint to Physical Assembly — 100% Procedural Vector Animation & Live Simulation Engine
// Clean Japanese Architectural Style (Washi Paper #F6F5F0, Aizome Indigo #1B365D, Akane Vermilion #C84B31)
// Includes full-scale built-in procedural simulations for every process that has no video clip:
// 1. Isometric 3D Steel Stud + Insulation + Gypsum + Terracotta Wall Assembly Simulator
// 2. Live 4-Stage CAD/BIM Drafting-to-Blueprint Screen Simulator (Draft -> AutoCAD -> SketchUp -> Revit)
// 3. Live 3D Laser Data Parser & Parallel BOM/DXF Extractor (SketchUp+CAD -> 3 Parallel Streams)
// 4. Live ERP "PO Auto" Order Generator + Isometric Store Warehouse Rack Simulator (Route A)
// 5. Live "Lantek CAD/CAM Nesting & G-Code CNC Toolpath" Simulator + Factory CNC VDO (Route B)
// 6. 3-Input Convergence Isometric Assembler + Live 3D House Assembly Animator VDO

class PresentationApp {
  constructor(canvasEl = null) {
    if (typeof window !== 'undefined') {
      window.PresentationApp = PresentationApp;
    }
    if (typeof globalThis !== 'undefined') {
      globalThis.PresentationApp = PresentationApp;
    }
    this.storageKey = window.PRESENTATION_V3 ? 'dbpa_bom_studio_ver3_20261116_16slides_v7' : 'dbpa_japanese_sim_studio_v51';
    this.themeVersion = 'v2';
    this.flowchartViewMode = 'both'; // 'both' | 'new' | 'existing'
    this.parallelBranchStyle = 'clean-minimal'; // 'clean-minimal' (รูป New) | 'ver2-dark'
    this.bgPreset = 'default';
    this.bgCustomColor = '#eef5f1';
    this.activeDocPreview = null; // 'partItems' | 'jobOrder' | 'sbList' | 'drawingAssembly'
    this.hoveredCard = null;
    this.automationActiveTab = null; // null for auto-cycle, or 0..4 for manual pin
    this.showAutomationModal = false; // full image modal viewer
    this.automationCards = [];
    this.automationDocBox = null;
    let loadedSlides = null;
    const storage = (typeof localStorage !== 'undefined') ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null);
    try {
      if (storage) {
        this.bgPreset = storage.getItem('dbpa_bg_preset') || 'default';
        this.bgCustomColor = storage.getItem('dbpa_bg_custom_color') || '#eef5f1';
        // Clean up previous cached version keys so browser stays completely fresh
        ['dbpa_bom_studio_ver3_20261113', 'dbpa_bom_studio_ver3_20261113_10slides', 'dbpa_bom_studio_ver3_20261113_11slides', 'dbpa_bom_studio_ver3_20261114_12slides', 'dbpa_bom_studio_ver3_20261114_13slides', 'dbpa_bom_studio_ver3_20261114_14slides', 'dbpa_bom_studio_ver3_20261114_15slides', 'dbpa_bom_studio_ver3_20261114_15slides_v2', 'dbpa_bom_studio_ver3_20261114_15slides_v3', 'dbpa_bom_studio_ver3_20261115_16slides_v4', 'dbpa_japanese_sim_studio_v11', 'dbpa_japanese_sim_studio_v12', 'dbpa_japanese_sim_studio_v13', 'dbpa_japanese_sim_studio_v14', 'dbpa_japanese_sim_studio_v15', 'dbpa_japanese_sim_studio_v16', 'dbpa_japanese_sim_studio_v17', 'dbpa_japanese_sim_studio_v18', 'dbpa_japanese_sim_studio_v19', 'dbpa_japanese_sim_studio_v20', 'dbpa_japanese_sim_studio_v21', 'dbpa_japanese_sim_studio_v22', 'dbpa_japanese_sim_studio_v23', 'dbpa_japanese_sim_studio_v24', 'dbpa_japanese_sim_studio_v25', 'dbpa_japanese_sim_studio_v26', 'dbpa_japanese_sim_studio_v27', 'dbpa_japanese_sim_studio_v28', 'dbpa_japanese_sim_studio_v29', 'dbpa_japanese_sim_studio_v30', 'dbpa_japanese_sim_studio_v31', 'dbpa_japanese_sim_studio_v32', 'dbpa_japanese_sim_studio_v33', 'dbpa_japanese_sim_studio_v34', 'dbpa_japanese_sim_studio_v35', 'dbpa_japanese_sim_studio_v36', 'dbpa_japanese_sim_studio_v37', 'dbpa_japanese_sim_studio_v38', 'dbpa_japanese_sim_studio_v39', 'dbpa_japanese_sim_studio_v40', 'dbpa_japanese_sim_studio_v41', 'dbpa_japanese_sim_studio_v42', 'dbpa_japanese_sim_studio_v43', 'dbpa_japanese_sim_studio_v44', 'dbpa_japanese_sim_studio_v45', 'dbpa_japanese_sim_studio_v46', 'dbpa_japanese_sim_studio_v50'].forEach(k => {
          try { storage.removeItem(k); } catch (e) {}
        });
        const saved = storage.getItem(this.storageKey);
        if (saved) loadedSlides = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Storage read error:', e);
    }

    // Auto-migrate if stored slides are missing, count/order/duration/narration mismatch, or contain old schema
    const isOutdated = !loadedSlides ||
      !Array.isArray(loadedSlides) ||
      loadedSlides.length !== DEFAULT_SLIDES.length ||
      loadedSlides.some((s, idx) => {
        const def = DEFAULT_SLIDES[idx];
        return !s || !def || s.id !== def.id || s.duration !== def.duration || s.narration !== def.narration;
      });

    if (isOutdated) {
      this.slides = JSON.parse(JSON.stringify(DEFAULT_SLIDES));
      if (storage) {
        try {
          storage.setItem(this.storageKey, JSON.stringify(this.slides));
        } catch (e) {}
      }
    } else {
      this.slides = loadedSlides;
    }
    this.enforceMaxDuration();

    this.canvas = canvasEl || (typeof document !== 'undefined' ? document.getElementById('stageCanvas') : null);
    this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: false }) : null;

    if (typeof window !== 'undefined') {
      window.app = this;
    }

    // React / Headless lifecycle callbacks
    this.onTimeUpdate = null;
    this.onSlideChange = null;
    this.onPlayStateChange = null;
    this._lastTimeUpdate = 0;
    this._animFrameId = null;
    this._destroyed = false;

    // Playback state
    this.activeSlideIndex = 0;
    this.isPlaying = false;
    this.isRecording = false;
    this.recordSingleScene = false;
    this.singleSceneStartIndex = 0;
    this.globalElapsed = 0;
    this.slideElapsed = 0;
    this.slidePreviewStart = performance.now() / 1000;
    this.lastFrameTime = performance.now();

    // Audio & Voice state
    this.bgmEnabled = true;
    const savedTts = (typeof localStorage !== 'undefined') ? localStorage.getItem('dbpa_tts_enabled') : null;
    this.ttsEnabled = (savedTts !== null) ? (savedTts === 'true') : true; // Default ON so narration speaks!
    this.selectedVoiceURI = (typeof localStorage !== 'undefined') ? (localStorage.getItem('dbpa_tts_voice_uri') || '') : '';
    this.subtitleOverlay = false;
    this.customAudioFile = null;
    this.audioCtx = null;
    this.audioDest = null;
    this.bgmGain = null;
    this.bgmInterval = null;
    this.customAudioEl = new Audio();
    this.customAudioEl.loop = true;
    this.customAudioSourceCreated = false;
    this.lastSpokenSlideIndex = -1;

    // Video Cache & Matched-Angle Design Stage Images (Scene 02)
    this.videoCache = new Map();
    this.customVideos = [];
    const isFileProtocol = (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:');
    this.designStageImages = [
      'assets/design_stages/stage_01_draft_sketch.jpg',
      'assets/design_stages/stage_02_sketchup_render.jpg',
      'assets/design_stages/stage_03_autocad_drafting.jpg',
      'assets/design_stages/stage_04_construction_blueprint.jpg'
    ].map(src => {
      const img = new Image();
      if (!isFileProtocol) img.crossOrigin = 'anonymous';
      img.src = src;
      return img;
    });
    this.boq3dWallImg = new Image();
    if (!isFileProtocol) this.boq3dWallImg.crossOrigin = 'anonymous';
    this.boq3dWallImg.src = 'assets/design_stages/otf_prule_floorplan.jpg';

    // Architectural Line-Art & 3D Cutaway Illustration Assets
    const assetMap = {
      isoHero: 'assets/design_stages/scene01_iso_wall.png',
      steelFrame: 'assets/nodes/node_db1_steel_frame.png',
      explodedWall: 'assets/nodes/node_db6_exploded_wall.png',
      wall3d: 'assets/nodes/node_db5_wall3d.png',
      physWall: 'assets/nodes/node_db1_physical_wall.png',
      sku1: 'assets/nodes/node_apc6_sku1.jpg',
      sku2: 'assets/nodes/node_apc6_sku2.jpg',
      sku3: 'assets/nodes/node_apc6_sku3.jpg',
      manualBook: 'assets/nodes/node_db8_manual_book.png',
      routeAPart: 'assets/design_stages/route_a_part.png',
      routeAPo: 'assets/design_stages/route_a_po.png',
      routeAFactory: 'assets/design_stages/route_a_factory.png',
      routeAStore: 'assets/design_stages/route_a_store.png',
      punchAuto: 'assets/nodes/node_apc10_punch.jpg',
      cadBlocks: 'assets/nodes/node_db10_cad_blocks.png',
      lantekPc: 'assets/nodes/node_db10_lantek_pc.png',
      cncMachine: 'assets/nodes/node_db10_cnc_machine.png',
      r1Step1: 'assets/design_stages/route1_step1_manual.jpg',
      r1Step2: 'assets/design_stages/route1_step2_reading_plan.jpg',
      r1Step3: 'assets/design_stages/route1_step3_crew_assembly.jpg',
      r1Step4: 'assets/design_stages/route1_step4_dwg_inspect.jpg',
      r3Step1: 'assets/design_stages/route3_step1_punch.jpg',
      r3Step2: 'assets/design_stages/route3_step2_dxf_job.jpg',
      r3Step3: 'assets/design_stages/route3_step3_lantek_nesting.jpg',
      r3Step4: 'assets/design_stages/route3_step4_cnc_factory.jpg',
      convBlueprint: 'assets/nodes/node_db11_blueprint.png',
      convStoreParts: 'assets/nodes/node_db11_store_parts.png',
      convCutFrame: 'assets/nodes/node_db11_cut_frame.png',
      convActualAssembly: 'assets/nodes/node_db11_actual_assembly.png'
    };
    this.illus = {};
    Object.entries(assetMap).forEach(([k, src]) => {
      const im = new Image();
      if (!isFileProtocol) im.crossOrigin = 'anonymous';
      im.src = src;
      this.illus[k] = im;
    });

    // Real Factory Production Documents & Generated Visuals
    this.factoryDocs = {
      model3d: new Image(),
      partItems: new Image(),
      jobOrder: new Image(),
      sbList: new Image(),
      drawingAssembly: new Image(),
      cadPunchingEe: new Image(),
      gen01: new Image(),
      gen02: new Image(),
      gen03: new Image(),
      gen04: new Image(),
      gen05: new Image()
    };
    if (!isFileProtocol) {
      Object.values(this.factoryDocs).forEach(img => { img.crossOrigin = 'anonymous'; });
    }
    this.factoryDocs.model3d.src = 'assets/design_stages/boq_3d_walls.png';
    this.factoryDocs.partItems.src = 'assets/design_stages/doc_part_items.png';
    this.factoryDocs.jobOrder.src = 'assets/design_stages/doc_job_order.png';
    this.factoryDocs.sbList.src = 'assets/design_stages/doc_sb_list.png';
    this.factoryDocs.drawingAssembly.src = 'assets/design_stages/doc_drawing_assembly.png';
    this.factoryDocs.cadPunchingEe.src = 'assets/design_stages/doc_cad_punching_ee.png';
    this.factoryDocs.gen01.src = 'assets/design_stages/gen_deliverable_01_3d_model.jpg';
    this.factoryDocs.gen02.src = 'assets/design_stages/gen_deliverable_02_2d_drawing.jpg';
    this.factoryDocs.gen03.src = 'assets/design_stages/gen_deliverable_03_bom_table.jpg';
    this.factoryDocs.gen04.src = 'assets/design_stages/gen_deliverable_04_job_order.jpg';
    this.factoryDocs.gen05.src = 'assets/design_stages/gen_deliverable_05_sb_cnc.jpg';

    // Composite Automation Deliverables Summary Image (Uploaded by user)
    this.autoSummaryImg = new Image();
    if (!isFileProtocol) this.autoSummaryImg.crossOrigin = 'anonymous';
    this.autoSummaryImg.src = 'Pictures/automation_summary_deliverables.jpg';

    // MediaRecorder
    this.mediaRecorder = null;
    this.recordedChunks = [];

    this.init();
  }

  enforceMaxDuration() {
    // Unrestricted duration — "ตัดเรื่องเวลาออกไปก่อน"
  }

  getTotalDuration() {
    return this.slides.reduce((acc, s) => acc + (Number(s.duration) || 8), 0);
  }

  getSlideStartTime(index) {
    let t = 0;
    for (let i = 0; i < index; i++) {
      t += Number(this.slides[i].duration) || 8;
    }
    return t;
  }

  getSlideAtTime(globalSec) {
    let acc = 0;
    for (let i = 0; i < this.slides.length; i++) {
      const dur = Number(this.slides[i].duration) || 8;
      if (globalSec < acc + dur || i === this.slides.length - 1) {
        return { index: i, slide: this.slides[i], slideElapsed: Math.max(0, globalSec - acc), duration: dur };
      }
      acc += dur;
    }
    return { index: 0, slide: this.slides[0], slideElapsed: 0, duration: this.slides[0].duration };
  }

  init() {
    this.slides.forEach(s => {
      if (s.videoSrc) this.getOrCreateVideo(s.videoSrc);
    });

    this.bindUI();
    this.initTtsVoices();

    const chkTts = typeof document !== 'undefined' ? document.getElementById('chkTts') : null;
    if (chkTts) {
      chkTts.checked = this.ttsEnabled;
    }
    const btnTopTts = typeof document !== 'undefined' ? document.getElementById('btnTopTtsToggle') : null;
    if (btnTopTts) {
      btnTopTts.textContent = this.ttsEnabled ? '🗣️ เสียงพากย์: เปิด ✓' : '🗣️ เสียงพากย์: ปิด ✕';
      btnTopTts.style.opacity = this.ttsEnabled ? '1.0' : '0.65';
    }

    this.renderSlideList();
    this.loadSlideIntoEditor(this.activeSlideIndex);
    this.updateTimelineUI();
    this.syncActiveMedia(true);

    const loop = (now) => {
      if (this._destroyed) return;
      const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;
      this.tick(dt);
      this.drawFrame(now / 1000);
      if (!this._destroyed && typeof requestAnimationFrame === 'function') {
        this._animFrameId = requestAnimationFrame(loop);
      }
    };
    if (typeof requestAnimationFrame === 'function') {
      this._animFrameId = requestAnimationFrame(loop);
    }
  }

  destroy() {
    this._destroyed = true;
    this.pause();
    if (this._animFrameId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.customAudioEl) {
      try { this.customAudioEl.pause(); } catch(e) {}
    }
  }

  render() {
    if (this._destroyed) return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    this.drawFrame(now / 1000);
  }

  setBackgroundTheme(preset, customColor) {
    if (preset) this.bgPreset = preset;
    if (customColor) this.bgCustomColor = customColor;
    try {
      const storage = (typeof localStorage !== 'undefined') ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null);
      if (storage) {
        storage.setItem('dbpa_bg_preset', this.bgPreset);
        storage.setItem('dbpa_bg_custom_color', this.bgCustomColor);
      }
    } catch (e) {}
    this.render();
  }

  getCustomBackgroundPalette(defaultTheme = 'mint') {
    const parseHex = (hex) => {
      const m = String(hex || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (!m) return [238, 245, 241];
      let h = m[1];
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    const mixHex = (rgb, target, t) => {
      const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
      const r = clamp(rgb[0] + (target[0] - rgb[0]) * t);
      const g = clamp(rgb[1] + (target[1] - rgb[1]) * t);
      const b = clamp(rgb[2] + (target[2] - rgb[2]) * t);
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    };

    const preset = this.bgPreset || 'default';
    if (preset === 'washi') {
      return {
        preset, isDark: false,
        stops: ['#f7f5ee', '#efece2', '#e5e0d2'],
        cardFill: 'rgba(255, 255, 255, 0.94)', cardBorder: '#cbbca4',
        titleColor: '#1b365d', ink: '#1e293b', muted: '#475569',
        gridColor: 'rgba(27, 54, 93, 0.06)', accent: '#1b6d54', accent2: '#c84b31'
      };
    }
    if (preset === 'white') {
      return {
        preset, isDark: false,
        stops: ['#ffffff', '#f8fafc', '#eef2f6'],
        cardFill: 'rgba(255, 255, 255, 0.98)', cardBorder: '#cbd5e1',
        titleColor: '#0f172a', ink: '#0f172a', muted: '#475569',
        gridColor: 'rgba(15, 23, 42, 0.045)', accent: '#047857', accent2: '#ea580c'
      };
    }
    if (preset === 'sage') {
      return {
        preset, isDark: false,
        stops: ['#edf6f2', '#dfeee7', '#cde4da'],
        cardFill: 'rgba(255, 255, 255, 0.94)', cardBorder: '#9bc4b3',
        titleColor: '#134e3a', ink: '#142a22', muted: '#3b574c',
        gridColor: 'rgba(16, 185, 129, 0.08)', accent: '#047857', accent2: '#d97706'
      };
    }
    if (preset === 'emerald-dark') {
      return {
        preset, isDark: true,
        stops: ['#0c1713', '#132720', '#1b3b30'],
        cardFill: 'rgba(255, 255, 255, 0.94)', cardBorder: '#34d399',
        titleColor: '#f8fafc', ink: '#0f172a', muted: '#475569',
        gridColor: 'rgba(52, 211, 153, 0.07)', accent: '#10b981', accent2: '#f97316'
      };
    }
    if (preset === 'blueprint') {
      return {
        preset, isDark: true,
        stops: ['#091526', '#10243e', '#173558'],
        cardFill: 'rgba(248, 251, 255, 0.95)', cardBorder: '#60a5fa',
        titleColor: '#f8fafc', ink: '#0f172a', muted: '#475569',
        gridColor: 'rgba(96, 165, 250, 0.09)', accent: '#0284c7', accent2: '#f97316'
      };
    }
    if (preset === 'custom') {
      const rgb = parseHex(this.bgCustomColor);
      const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
      const isDark = lum < 0.45;
      return {
        preset, isDark,
        stops: isDark
          ? [mixHex(rgb, [0, 0, 0], 0.25), mixHex(rgb, [0, 0, 0], 0.0), mixHex(rgb, [255, 255, 255], 0.12)]
          : [mixHex(rgb, [255, 255, 255], 0.35), mixHex(rgb, [255, 255, 255], 0.0), mixHex(rgb, [0, 0, 0], 0.08)],
        cardFill: 'rgba(255, 255, 255, 0.94)',
        cardBorder: isDark ? mixHex(rgb, [255, 255, 255], 0.4) : mixHex(rgb, [0, 0, 0], 0.22),
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        ink: '#0f172a',
        muted: '#475569',
        gridColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.055)',
        accent: '#047857',
        accent2: '#ea580c'
      };
    }

    if (defaultTheme === 'dark-emerald') {
      return {
        preset: 'default', isDark: true,
        stops: ['#0d1613', '#13231e', '#19332a', '#1f4035'],
        cardFill: 'rgba(255, 255, 255, 0.96)', cardBorder: 'rgba(16, 185, 129, 0.35)',
        titleColor: '#ffffff', ink: '#0f172a', muted: '#475569',
        gridColor: 'rgba(52, 211, 153, 0.05)', accent: '#10b981', accent2: '#ea580c'
      };
    }

    // Default Slide 10 Mint-Emerald Architectural backdrop
    return {
      preset: 'default', isDark: false,
      stops: ['#141a18', '#466157', '#72ab99', '#8dd1be'],
      cardFill: 'rgba(248, 250, 249, 0.95)', cardBorder: '#065f46',
      titleColor: '#f8fafc', ink: '#0f172a', muted: '#334155',
      gridColor: 'rgba(255, 255, 255, 0.06)', accent: '#047857', accent2: '#dc2626'
    };
  }

  getOrCreateVideo(src) {
    if (!src) return null;
    if (this.videoCache.has(src)) return this.videoCache.get(src);
    const vid = document.createElement('video');
    vid.src = src;
    vid.muted = true;
    vid.playsInline = true;
    vid.preload = 'auto';
    vid.loop = true;

    // Attach to hidden DOM container so browser media engine keeps decoding and buffering active
    if (typeof document !== 'undefined' && document.body) {
      let host = document.getElementById('hiddenVideoHost');
      if (!host) {
        host = document.createElement('div');
        host.id = 'hiddenVideoHost';
        host.style.position = 'fixed';
        host.style.width = '1px';
        host.style.height = '1px';
        host.style.overflow = 'hidden';
        host.style.opacity = '0.01';
        host.style.pointerEvents = 'none';
        host.style.zIndex = '-9999';
        document.body.appendChild(host);
      }
      host.appendChild(vid);
    }

    vid.onerror = () => {
      try {
        const encoded = encodeURI(src);
        if (vid.src !== encoded && !vid.dataset.retried) {
          vid.dataset.retried = '1';
          vid.src = encoded;
          vid.load();
        }
      } catch (err) {}
    };

    try { vid.load(); } catch (e) {}

    const triggerPausedRepaint = () => {
      try {
        if (!this.isPlaying && typeof this.render === 'function') this.render();
      } catch (e) {}
    };
    if (typeof vid.addEventListener === 'function') {
      vid.addEventListener('loadeddata', triggerPausedRepaint);
      vid.addEventListener('canplay', triggerPausedRepaint);
      vid.addEventListener('seeked', triggerPausedRepaint);
    }

    this.videoCache.set(src, vid);
    return vid;
  }

  // ==================== JAPANESE MODERN AMBIENT SYNTH & AUDIO ====================
  ensureAudioContext() {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioCtx();
        if (typeof this.audioCtx.createMediaStreamDestination === 'function') {
          this.audioDest = this.audioCtx.createMediaStreamDestination();
        }
        if (typeof this.audioCtx.createGain === 'function') {
          this.bgmGain = this.audioCtx.createGain();
          this.bgmGain.gain.value = 0.2;
          this.bgmGain.connect(this.audioCtx.destination);
          if (this.audioDest) this.bgmGain.connect(this.audioDest);
        }
      } catch (e) {
        console.warn('Web Audio initialization error:', e);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try { this.audioCtx.resume(); } catch(e) {}
    }
  }

  startBGM() {
    this.stopBGM();
    if (!this.bgmEnabled) return;
    this.ensureAudioContext();
    if (!this.audioCtx || !this.bgmGain) return;

    if (this.customAudioFile) {
      if (!this.customAudioSourceCreated) {
        const srcNode = this.audioCtx.createMediaElementSource(this.customAudioEl);
        srcNode.connect(this.bgmGain);
        this.customAudioSourceCreated = true;
      }
      this.customAudioEl.currentTime = 0;
      this.customAudioEl.play().catch(() => {});
      return;
    }

    const chords = [
      [220.0, 246.94, 293.66, 329.63, 440.0],
      [196.0, 220.0, 261.63, 293.66, 392.0],
      [174.61, 220.0, 261.63, 329.63, 349.23],
      [164.81, 196.0, 246.94, 293.66, 329.63]
    ];
    let step = 0;

    const playStep = () => {
      if (!this.isPlaying || !this.bgmEnabled) return;
      const now = this.audioCtx.currentTime;
      const scale = chords[Math.floor(step / 8) % chords.length];

      if (step % 4 === 0) {
        [scale[0], scale[2], scale[3]].forEach((freq) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.036, now + 0.45);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.4);
          osc.connect(gain);
          gain.connect(this.bgmGain);
          osc.start(now);
          osc.stop(now + 2.5);
        });
      }

      const noteFreq = scale[(step * 2) % scale.length] * 2;
      const pluck = this.audioCtx.createOscillator();
      const pGain = this.audioCtx.createGain();
      pluck.type = 'triangle';
      pluck.frequency.setValueAtTime(noteFreq, now);
      pGain.gain.setValueAtTime(0.001, now);
      pGain.gain.linearRampToValueAtTime(0.024, now + 0.02);
      pGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.42);
      pluck.connect(pGain);
      pGain.connect(this.bgmGain);
      pluck.start(now);
      pluck.stop(now + 0.45);

      step++;
    };

    playStep();
    this.bgmInterval = setInterval(playStep, 480);
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.customAudioFile) {
      this.customAudioEl.pause();
    }
  }

  // ==================== THAI TTS PHONETIC NORMALIZER & VOICE ENGINE ====================
  toThaiPhonetic(raw) {
    if (!raw) return '';
    let t = String(raw);

    // 1. English Technical Words, Software & Brand Names to Natural Thai Phonetics
    const wordMap = [
      [/\bIntegrated\s+Design\b/gi, 'อินทิเกรเต็ด ดีไซน์'],
      [/\bBOM\s+Automation\b/gi, 'บีโอเอ็ม ออโตเมชัน'],
      [/\bAuto\s+BOM\b/gi, 'ออโต้ บีโอเอ็ม'],
      [/\bEnd-to-End\b/gi, 'เอนด์ ทู เอนด์'],
      [/\bValue\s+Creation\b/gi, 'แวลู ครีเอชัน'],
      [/\bProject\s+Leader\b/gi, 'โปรเจกต์ ลีดเดอร์'],
      [/\bSystem\s+Developer\b/gi, 'ซิสเต็ม ดีเวลลอปเปอร์'],
      [/\bManpower\s+Skill\b/gi, 'แมนพาวเวอร์ สกิล'],
      [/\bLoss\s+Cost\b/gi, 'ลอส คอสต์'],
      [/\bRework\b/gi, 'รีเวิร์ก'],
      [/\bReduce\s+Time\b/gi, 'รีดิวซ์ ไทม์'],
      [/\bPlanning\s+Rule\b/gi, 'แพลนนิ่ง รูล'],
      [/\bP-Rule\b/gi, 'พี รูล'],
      [/\bExisting\s+Work\s*Flow\b/gi, 'เอ็กซิสติ้ง เวิร์กโฟลว์'],
      [/\bExisting\s+Process\b/gi, 'เอ็กซิสติ้ง โปรเซส'],
      [/\bNew\s+Work\s*Flow\b/gi, 'นิว เวิร์กโฟลว์'],
      [/\bWork\s*Flow\b/gi, 'เวิร์กโฟลว์'],
      [/\bFor\s+Construction\b/gi, 'ฟอร์ คอนสตรัคชัน'],
      [/\bMenu\s+Select\b/gi, 'เมนู ซีเล็กต์'],
      [/\bSelecting\s+One\s+by\s+One\b/gi, 'ซีเล็กติ้ง วัน บาย วัน'],
      [/\bOne\s+by\s+One\b/gi, 'วัน บาย วัน'],
      [/\bSingle\s*\/\s*Double\b/gi, 'ซิงเกิล หรือ ดับเบิล'],
      [/\bSingle\b/gi, 'ซิงเกิล'],
      [/\bDouble\b/gi, 'ดับเบิล'],
      [/\bWall\s+Type\b/gi, 'วอลล์ ไทป์'],
      [/\bGrid\s*line\b/gi, 'กริดไลน์'],
      [/\bFinal\s+BOM\s+Data\b/gi, 'ไฟนอล บีโอเอ็ม ดาต้า'],
      [/\bLong\s+Lead-?time\s+Parts?\b/gi, 'ลอง ลีดไทม์ พาร์ท'],
      [/\bLong\s+Lead-?time\b/gi, 'ลอง ลีดไทม์'],
      [/\bBefore\b/gi, 'บีฟอร์'],
      [/\bAfter\b/gi, 'อาฟเตอร์'],
      [/\bManual\b/gi, 'แมนนวล'],
      [/\bAutomate\b/gi, 'ออโตเมต'],
      [/\bAutomation\b/gi, 'ออโตเมชัน'],
      [/\bPlug-?in\b/gi, 'ปลั๊กอิน'],
      [/\bRuby\b/gi, 'รูบี้'],
      [/\bInterior\s+Wall\b/gi, 'อินทีเรีย วอลล์'],
      [/\bPartition\b/gi, 'พาร์ทิชัน'],
      [/\bSmart\s*Board\b/gi, 'สมาร์ทบอร์ด'],
      [/\bDetail\s+DWG\b/gi, 'ดีเทล ดีดับเบิลยูจี'],
      [/\bAssembly\s+Code\b/gi, 'แอสเซมบลี โค้ด'],
      [/\bAssembly\b/gi, 'แอสเซมบลี'],
      [/\bCoding\s+Knowledge\b/gi, 'โค้ดดิ้ง นอลเลจ'],
      [/\bCoding\b/gi, 'โค้ดดิ้ง'],
      [/\bData\s*Base\s+Create\s+and\s+Management\b/gi, 'ดาต้าเบส ครีเอท แอนด์ แมเนจเมนต์'],
      [/\bData\s*Base\b/gi, 'ดาต้าเบส'],
      [/\bDatabase\b/gi, 'ดาต้าเบส'],
      [/\bExcel\b/gi, 'เอ็กเซล'],
      [/\bCSV\b/gi, 'ซีเอสวี'],
      [/\bLogic\b/gi, 'ลอจิก'],
      [/\bL-?Shape\s+Door\s+PT\b/gi, 'แอล เชป ดอร์ พีที'],
      [/\bGenerate\b/gi, 'เจเนอเรต'],
      [/\bOne\s+Command\b/gi, 'วัน คอมมานด์'],
      [/\bHole\s+Plug\b/gi, 'โฮล ปลั๊ก'],
      [/\bSwitch[_\s]+Hood\b/gi, 'สวิตช์ ฮูด'],
      [/\bHuman\s+Error\b/gi, 'ฮิวแมน เออร์เรอร์'],
      [/\bRotate\b/gi, 'โรเทต'],
      [/\bCheck\s+Accuracy\b/gi, 'เช็ก แอคคิวเรซี'],
      [/\bExport\b/gi, 'เอ็กซ์พอร์ต'],
      [/\bImport\b/gi, 'อิมพอร์ต'],
      [/\bFloorplan\b/gi, 'ฟลอร์แพลน'],
      [/\bTime\s+Reduction\b/gi, 'ไทม์ รีดักชัน'],
      [/\bCost\s+Reduction\b/gi, 'คอสต์ รีดักชัน'],
      [/\bSkill\s+and\s+Knowledge\s+Standardization\b/gi, 'สกิล แอนด์ นอลเลจ สแตนดาร์ดไดเซชัน'],
      [/\bError\s+and\s+Loss\s+Reduction\b/gi, 'เออร์เรอร์ แอนด์ ลอส รีดักชัน'],
      [/\bAutomated\s+Output\s+and\s+Data\s+Integration\b/gi, 'ออโตเมเต็ด เอาต์พุต แอนด์ ดาต้า อินทิเกรชัน'],
      [/\bVisualization\b/gi, 'วิชวลไลเซชัน'],
      [/\bNext\s+Step\b/gi, 'เน็กซ์ สเต็ป'],
      [/\bSmart\s+Estimation\s+for\s+Sales\b/gi, 'สมาร์ท เอสติเมชัน ฟอร์ เซลส์'],
      [/\bDesign-to-Production\b/gi, 'ดีไซน์ ทู โปรดักชัน'],
      [/\bDesign\s+Conflict\b/gi, 'ดีไซน์ คอนฟลิกต์'],
      [/\bInterior\s+High\s+Unit\b/gi, 'อินทีเรีย ไฮ ยูนิต'],
      [/\bPart\s+Install\b/gi, 'พาร์ท อินสตอล'],
      [/\bModular\s+Bathroom\s+System\b/gi, 'โมดูลาร์ บาธรูม ซิสเต็ม'],
      [/\bStructure\b/gi, 'สตรัคเจอร์'],
      [/\bExterior\b/gi, 'เอ็กซ์ทีเรีย'],
      [/\bBalcony\b/gi, 'บัลโคนี'],
      [/\bDrawing\b/gi, 'ดรออิ้ง'],
      [/\bModel\b/gi, 'โมเดล'],
      [/\bSystem\b/gi, 'ซิสเต็ม'],
      [/\bDevelopment\b/gi, 'ดีเวลลอปเมนต์'],
      [/\bImprovement\b/gi, 'อิมพรูฟเมนต์'],
      [/\bDeliverables?\b/gi, 'ดีลิเวอเรเบิลส์'],
      [/\bQ-?Heim\b/gi, 'คิวไฮม์'],
      [/\bPlugins?\b/gi, 'ปลั๊กอิน'],
      [/\bOutlets?\b/gi, 'เอาต์เลต รูปลั๊กไฟ'],
      [/\bAutoCAD\b/gi, 'ออโต้แคด'],
      [/\bSketchUp\b/gi, 'สเก็ตช์อัป'],
      [/\bRevit\b/gi, 'เรวิท'],
      [/\bDraft\b/gi, 'ดราฟต์'],
      [/\bBOQ\b/gi, 'บีโอคิว'],
      [/\bBOM\b/gi, 'บีโอเอ็ม'],
      [/\bOTF\b/gi, 'โอทีเอฟ'],
      [/\bForcon\.?\b/gi, 'ฟอร์คอน'],
      [/\bParItems\b/gi, 'พาร์ทไอเทมส์'],
      [/\bPart\s*Items?\b/gi, 'พาร์ทไอเทมส์'],
      [/\bPurchase\b/gi, 'เพอร์เชส'],
      [/\bSupplier\b/gi, 'ซัพพลายเออร์'],
      [/\bSupply\b/gi, 'ซัพพลาย'],
      [/\bProduction\b/gi, 'โปรดักชัน'],
      [/\bInstallation\b/gi, 'อินสตอลเลชัน'],
      [/\bPicking\s*List\b/gi, 'พิกกิ้งลิสต์'],
      [/\bSend\s*Email\b/gi, 'เซนด์ อีเมล'],
      [/\bMRP\b/gi, 'เอ็มอาร์พี'],
      [/\bMPS\b/gi, 'เอ็มพีเอส'],
      [/\bMIM\b/gi, 'เอ็มไอเอ็ม'],
      [/\bIM\b/gi, 'ไอเอ็ม'],
      [/\bPS\b/gi, 'พีเอส'],
      [/\bIW\b/gi, 'ไอดับเบิลยู'],
      [/\bPT\b/gi, 'พีที'],
      [/\bSB\s*List\b/gi, 'เอสบี ลิสต์'],
      [/\bPuning\b/gi, 'พันชิ่ง'],
      [/\bPunching\s+Board\b/gi, 'พันชิ่ง บอร์ด'],
      [/\bPunching\b/gi, 'พันชิ่ง'],
      [/\bLantex\b/gi, 'แลนเทก'],
      [/\bCutting\s+BP\b/gi, 'คัตติ้ง บีพี'],
      [/\bSKU\b/gi, 'เอสเคยู'],
      [/\bPO\s*Auto\b/gi, 'พีโอ ออโต้'],
      [/\bPO\b/gi, 'พีโอ'],
      [/\bPR\b/gi, 'พีอาร์'],
      [/\bElectric\s+Punch\b/gi, 'อิเล็กทริก พันช์'],
      [/\bPunch\b/gi, 'พันช์'],
      [/\bDXF\b/gi, 'ดีเอ็กซ์เอฟ'],
      [/\bJob\s+Order\b/gi, 'จ๊อบออร์เดอร์'],
      [/\bJob\b/gi, 'จ๊อบ'],
      [/\bLantek\b/gi, 'แลนเทก'],
      [/\bCNC\b/gi, 'ซีเอ็นซี'],
      [/\bBIM\b/gi, 'บิม'],
      [/\bCAD\b/gi, 'แคด'],
      [/\bCAM\b/gi, 'แคม'],
      [/\bDWG\b/gi, 'ดีดับเบิลยูจี'],
      [/\bMEP\b/gi, 'เอ็มอีพี'],
      [/\bParts?\b/gi, 'พาร์ท'],
      [/\bAuto\b/gi, 'ออโต้'],
      [/\bStep\b/gi, 'สเต็ป'],
      [/\bStage\b/gi, 'สเตจ'],
      [/\bStud\b/gi, 'สตัด'],
      [/\bTrack\b/gi, 'แทร็ก'],
      [/\bRockwool\b/gi, 'ร็อควูล'],
      [/\bKnauf\b/gi, 'คเนาฟ์'],
      [/\bSCG\s+HEIM\b/gi, 'เอสซีจี ไฮม์'],
      [/\bSCG\b/gi, 'เอสซีจี'],
      [/\bYield\b/gi, 'ยีลด์'],
      [/\bZero\s+Rework\b/gi, 'ซีโร่ รีเวิร์ก ไม่ต้องแก้งาน'],
      [/\bZero\s+Waste\b/gi, 'ซีโร่ เวสต์ ไม่เหลือเศษทิ้ง'],
      [/\bSingle\s+Source\s+of\s+Truth\b/gi, 'ซิงเกิล ซอร์ส ออฟ ทรูธ ศูนย์กลางข้อมูลเดียว'],
      [/\bReady-to-Assemble\b/gi, 'เรดดี้ ทู แอสเซมบลี พร้อมประกอบทันที'],
      [/\bToolpath\b/gi, 'ทูลพาท'],
      [/\bBatch\b/gi, 'แบทช์'],
      [/\bStore\b/gi, 'สโตร์'],
      [/\bApprove\b/gi, 'อนุมัติ'],
      [/\bApproved\b/gi, 'อนุมัติแล้ว'],
      [/\bCode\b/gi, 'โค้ด'],
      [/\bWeb\b/gi, 'เว็บ'],
      [/\bData\b/gi, 'ดาต้า'],
      [/\bFile\s+Up\b/gi, 'ไฟล์อัป'],
      [/\bLayer\b/gi, 'เลเยอร์'],
      [/\bHeight\b/gi, 'ไฮต์']
    ];

    for (const [regex, rep] of wordMap) {
      t = t.replace(regex, rep);
    }

    // 2. Technical units & codes (using safe replacer functions)
    t = t.replace(/C75\b/gi, 'ซี เจ็ดสิบห้า');
    t = t.replace(/\bV2\b/gi, 'เวอร์ชัน สอง');
    t = t.replace(/\bC3\b/gi, 'ซี สาม');
    t = t.replace(/±1(\.0)?\s*(mm|มม)\b/gi, 'บวกลบ หนึ่ง มิลลิเมตร');
    t = t.replace(/±/g, 'บวกลบ ');
    t = t.replace(/(\d+)\s*mm\b/gi, (m, n) => n + ' มิลลิเมตร');
    t = t.replace(/(\d+)\s*มม\b/gi, (m, n) => n + ' มิลลิเมตร');
    t = t.replace(/100%/g, 'หนึ่งร้อยเปอร์เซ็นต์');
    t = t.replace(/86%/g, 'แปดสิบหกเปอร์เซ็นต์');
    t = t.replace(/%/g, ' เปอร์เซ็นต์');
    t = t.replace(/\b3D\b/gi, 'สามมิติ');
    t = t.replace(/\b2D\b/gi, 'สองมิติ');
    t = t.replace(/3\s*มิติ/g, 'สามมิติ');
    t = t.replace(/2\s*มิติ/g, 'สองมิติ');
    t = t.replace(/1\s*มิติ/g, 'หนึ่งมิติ');
    t = t.replace(/➔|->/g, ' ไปยัง ');
    t = t.replace(/&/g, ' และ ');
    t = t.replace(/#/g, ' หมายเลข ');

    // 3. Spacing & pause punctuation
    t = t.replace(/,/g, ', ');
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }

  getBestThaiVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    if (this.selectedVoiceURI) {
      const match = voices.find(v => v.voiceURI === this.selectedVoiceURI);
      if (match) return match;
    }

    const thaiVoices = voices.filter(v => {
      const lang = (v.lang || '').toLowerCase();
      const name = (v.name || '').toLowerCase();
      return lang.includes('th') || name.includes('thai') || name.includes('ไทย') || name.includes('premwadee') || name.includes('niwat') || name.includes('kanya') || name.includes('achara');
    });

    if (thaiVoices.length === 0) return null;

    const naturalVoice = thaiVoices.find(v => {
      const n = v.name.toLowerCase();
      return n.includes('natural') || n.includes('online');
    });
    if (naturalVoice) return naturalVoice;

    const googleVoice = thaiVoices.find(v => v.name.includes('Google'));
    if (googleVoice) return googleVoice;

    return thaiVoices[0];
  }

  initTtsVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const populate = () => {
      const voices = window.speechSynthesis.getVoices();
      const sel = document.getElementById('selTtsVoice');
      if (!sel) return;

      const thaiVoices = voices.filter(v => {
        const lang = (v.lang || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        return lang.includes('th') || name.includes('thai') || name.includes('ไทย') || name.includes('premwadee') || name.includes('niwat') || name.includes('kanya');
      });

      sel.innerHTML = '';
      if (thaiVoices.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '🇹🇭 ระบบเสียงมาตรฐาน (Auto Thai)';
        sel.appendChild(opt);
        return;
      }

      thaiVoices.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        let cleanName = v.name.replace(/^Microsoft\s+/i, '').replace(/\s+Online\s+\(Natural\)/i, ' ✨').replace(/\s+-\s+Thai.*$/i, '');
        opt.textContent = `🗣️ ${cleanName}`;
        sel.appendChild(opt);
      });

      const savedURI = localStorage.getItem('dbpa_tts_voice_uri');
      if (savedURI && thaiVoices.some(v => v.voiceURI === savedURI)) {
        this.selectedVoiceURI = savedURI;
        sel.value = savedURI;
      } else {
        const best = this.getBestThaiVoice();
        if (best) {
          this.selectedVoiceURI = best.voiceURI;
          sel.value = best.voiceURI;
        }
      }
    };

    populate();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populate;
    }
  }

  stopNarration() {
    this._v3VoiceToken = (this._v3VoiceToken || 0) + 1;
    if (this._v3VoiceTimer) {
      clearTimeout(this._v3VoiceTimer);
      this._v3VoiceTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    this.currentUtterance = null;
  }

  speakNarration(text) {
    if (!this.ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined' || !text) return;
    
    this.stopNarration();

    const phoneticText = this.toThaiPhonetic(text);
    const utter = new SpeechSynthesisUtterance(phoneticText);
    utter.lang = 'th-TH';
    utter.rate = 1.0;
    utter.pitch = 1.0;

    const voice = this.getBestThaiVoice();
    if (voice) {
      utter.voice = voice;
    }

    // Keep reference so Chromium garbage collector doesn't drop the utterance mid-speech!
    this.currentUtterance = utter;
    utter.onend = () => {
      if (this.currentUtterance === utter) this.currentUtterance = null;
    };
    utter.onerror = (err) => {
      console.warn('TTS Speech error:', err);
      if (this.currentUtterance === utter) this.currentUtterance = null;
    };

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {}

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utter);
      } catch (err) {
        console.warn('speechSynthesis.speak failed:', err);
      }
    }, 40);
  }

  testTtsSpeech() {
    const slide = this.slides[this.activeSlideIndex] || this.slides[0];
    if (!slide || !slide.narration) return;
    const prevEnabled = this.ttsEnabled;
    this.ttsEnabled = true;
    this.speakNarration(slide.narration, { forceWhenPaused: true });
    this.ttsEnabled = prevEnabled;
  }

  // ==================== PLAYBACK & TIMELINE ====================
  play(fromStart = false) {
    const total = this.getTotalDuration();
    if (fromStart || this.globalElapsed >= total - 0.1) {
      this.globalElapsed = 0;
      this.activeSlideIndex = 0;
      this.slideElapsed = 0;
      this.lastSpokenSlideIndex = -1;
      this._ver2SubStep = null;
    }
    this.isPlaying = true;
    // Allow syncActiveMedia(true) to trigger time-synced narration cleanly once
    this.lastSpokenSlideIndex = -1;
    this.syncActiveMedia(true);
    this.startBGM();
    this.updatePlayControlsUI();
    if (this.onPlayStateChange) {
      try { this.onPlayStateChange(true); } catch(e) {}
    }
  }

  pause() {
    this.isPlaying = false;
    this.stopBGM();
    this.stopNarration();
    this.videoCache.forEach(v => v.pause());
    this.updatePlayControlsUI();
    if (this.onPlayStateChange) {
      try { this.onPlayStateChange(false); } catch(e) {}
    }
  }

  seekTo(globalSeconds) {
    const total = this.getTotalDuration();
    this.globalElapsed = Math.max(0, Math.min(total, globalSeconds));
    const info = this.getSlideAtTime(this.globalElapsed);
    const changedSlide = info.index !== this.activeSlideIndex;
    this.activeSlideIndex = info.index;
    this.slideElapsed = info.slideElapsed;
    this._ver2SubStep = null;

    if (this.isPlaying) {
      this.lastSpokenSlideIndex = -1;
    } else {
      this.stopNarration();
    }
    this.syncActiveMedia(changedSlide);
    this.renderSlideList();
    if (changedSlide) {
      this.loadSlideIntoEditor(this.activeSlideIndex);
      if (this.onSlideChange) {
        try { this.onSlideChange(this.activeSlideIndex); } catch(e) {}
      }
    }
    this.updateTimelineUI();
  }

  selectSlide(index) {
    if (index < 0 || index >= this.slides.length) return;
    this.activeSlideIndex = index;
    this.globalElapsed = this.getSlideStartTime(index);
    this.slideElapsed = 0;
    this.slidePreviewStart = performance.now() / 1000;
    this.lastSpokenSlideIndex = -1;
    this._ver2SubStep = null;
    this.activeDocPreview = null;
    this.showAutomationModal = false;
    this.automationActiveTab = null;
    if (!this.isPlaying) {
      this.stopNarration();
    }
    this.syncActiveMedia(true);
    this.renderSlideList();
    this.loadSlideIntoEditor(index);
    this.updateTimelineUI();
    if (this.onSlideChange) {
      try { this.onSlideChange(this.activeSlideIndex); } catch(e) {}
    }
  }

  syncActiveMedia(forceSeek = false) {
    const slide = this.slides[this.activeSlideIndex];
    if (!slide) return;

    if (slide.sceneType === 'automation-deliverables-summary' || slide.sceneType === 'new-workflow-allinone' || slide.layout === 'new-workflow-allinone') {
      this.videoCache.forEach((vid) => { vid.pause(); });
      return;
    }

    this.videoCache.forEach((vid, src) => {
      if (!slide.videoSrc || slide.videoSrc !== src || slide.vdoLayout === 'vector-only') {
        vid.pause();
      }
    });

    if (slide.videoSrc && slide.vdoLayout !== 'vector-only') {
      const vid = this.getOrCreateVideo(slide.videoSrc);
      if (vid) {
        const rate = Math.max(0.25, Math.min(4.0, Number(slide.videoRate) || 1.0));
        try {
          vid.playbackRate = rate;
        } catch (e) {
          try { vid.playbackRate = 1.0; } catch (e2) {}
        }
        const vdoDelay = (slide.sceneType === 'boq-sku-extrusion') ? 3.2 : 0;
        const targetElapsed = Math.max(0, this.slideElapsed - vdoDelay) * rate;
        if (forceSeek) {
          const targetTime = (Number(slide.videoStart) || 0) + targetElapsed;
          if (!isNaN(vid.duration) && vid.duration > 0) {
            vid.currentTime = targetTime % vid.duration;
          } else {
            vid.currentTime = Number(slide.videoStart) || 0;
          }
        }
        if (this.isPlaying) {
          vid.play().catch(() => {});
        } else {
          if (vid.readyState >= 1 && vid.paused && forceSeek) {
            vid.currentTime = Number(slide.videoStart) || 0;
          }
          vid.pause();
        }
      }
    }

    if (this.isPlaying && this.lastSpokenSlideIndex !== this.activeSlideIndex) {
      this.lastSpokenSlideIndex = this.activeSlideIndex;
      this.speakNarration(slide.narration);
    }
  }

  tick(dt) {
    if (!this.isPlaying) return;

    const total = this.getTotalDuration();
    this.globalElapsed += dt;

    if (this.isRecording) {
      this.updateExportTimerUI();
    }

    if (this.globalElapsed >= total) {
      this.globalElapsed = total;
      this.pause();
      if (this.isRecording) {
        this.stopVideoExport();
      }
      this.updateTimelineUI();
      return;
    }

    const info = this.getSlideAtTime(this.globalElapsed);
    // If recording only the current single scene, stop recording as soon as this scene finishes or transitions!
    if (this.isRecording && this.recordSingleScene) {
      const curSlideDur = Number(this.slides[this.singleSceneStartIndex]?.duration) || 10;
      if (info.index !== this.singleSceneStartIndex || this.slideElapsed >= curSlideDur) {
        this.pause();
        this.stopVideoExport();
        this.updateTimelineUI();
        return;
      }
    }

    if (info.index !== this.activeSlideIndex) {
      this.activeSlideIndex = info.index;
      this.slideElapsed = info.slideElapsed;
      this.syncActiveMedia(true);
      this.renderSlideList();
      this.loadSlideIntoEditor(this.activeSlideIndex);
      if (this.onSlideChange) {
        try { this.onSlideChange(this.activeSlideIndex); } catch(e) {}
      }
    } else {
      this.slideElapsed = info.slideElapsed;
    }

    if (this.onTimeUpdate) {
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      if (!this._lastTimeUpdate || (now - this._lastTimeUpdate) >= 100) {
        this._lastTimeUpdate = now;
        try {
          this.onTimeUpdate(this.globalElapsed, total, { globalElapsed: this.globalElapsed, totalDuration: total });
        } catch(e) {}
      }
    }

    this.updateTimelineUI();
  }

  // ==================== VIDEO EXPORT (WEBM / MP4) ====================
  async startVideoExport(singleSceneOnly = false) {
    if (this.isRecording) {
      this.stopVideoExport();
      return;
    }

    this.recordSingleScene = singleSceneOnly;
    this.singleSceneStartIndex = this.activeSlideIndex;
    this.enforceMaxDuration();
    this.ensureAudioContext();

    let mixedStream;
    try {
      const canvasStream = this.canvas.captureStream(60);
      const combinedTracks = [...canvasStream.getVideoTracks()];
      const audioChoice = document.getElementById('exportAudioChoice');
      const includeAudio = audioChoice ? audioChoice.value !== 'mute' : true;
      if (includeAudio && this.audioDest && this.audioDest.stream.getAudioTracks().length > 0) {
        combinedTracks.push(...this.audioDest.stream.getAudioTracks());
      }
      mixedStream = new MediaStream(combinedTracks);
    } catch (err) {
      console.error('Failed to capture canvas/audio stream:', err);
      alert('เบราว์เซอร์ไม่สามารถบันทึกวิดีโอจาก Canvas ได้: ' + err.message);
      this.isRecording = false;
      this.recordSingleScene = false;
      this.updateExportUI(false);
      return;
    }

    const mimeCandidates = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    let selectedMime = 'video/webm';
    for (const mime of mimeCandidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(mixedStream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 8000000
      });
    } catch (e) {
      try {
        this.mediaRecorder = new MediaRecorder(mixedStream);
      } catch (err2) {
        console.error('MediaRecorder initialization failed:', err2);
        alert('เบราว์เซอร์ไม่รองรับ MediaRecorder: ' + err2.message);
        this.isRecording = false;
        this.recordSingleScene = false;
        this.updateExportUI(false);
        return;
      }
    }

    this.mediaRecorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) this.recordedChunks.push(ev.data);
    };

    this.mediaRecorder.onstop = () => {
      const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(this.recordedChunks, { type: selectedMime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const curSlide = this.slides[this.singleSceneStartIndex];
      const safeTitle = (curSlide && curSlide.processCode)
        ? curSlide.processCode.replace(/[^\w\d-]/g, '_')
        : `Scene_0${this.singleSceneStartIndex + 1}`;
      const prefix = this.recordSingleScene
        ? `Scene_0${this.singleSceneStartIndex + 1}_${safeTitle}`
        : `Full_Process_Animation`;
      const filename = `${prefix}_${timestamp}.${ext}`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      const wasSingle = this.recordSingleScene;
      const finishedSceneIdx = this.singleSceneStartIndex;
      this.isRecording = false;
      this.recordSingleScene = false;
      this.updateExportUI(false, ext, wasSingle, finishedSceneIdx, filename);
    };

    this.isRecording = true;
    this.updateExportUI(true);
    this.mediaRecorder.start(250);
    if (singleSceneOnly) {
      this.selectSlide(this.activeSlideIndex);
      this.play(false);
    } else {
      this.play(true);
    }
  }

  stopVideoExport() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
      }
    }
    this.pause();
  }

  updateExportTimerUI() {
    const timerEl = document.getElementById('recLiveTimer');
    if (!timerEl) return;
    if (this.recordSingleScene) {
      timerEl.textContent = this.formatTime(this.slideElapsed);
    } else {
      timerEl.textContent = this.formatTime(this.globalElapsed);
    }
  }

  // ==================== 1920x1080 PROCEDURAL JAPANESE ARCHITECTURAL RENDERER ====================
  drawFrame(nowSec) {
    const ctx = this.ctx;
    const W = 1920;
    const H = 1080;

    const slide = this.slides[this.activeSlideIndex] || this.slides[0];
    const dur = Math.max(1, Number(slide.duration) || 12);
    let animSec = 0;
    if (this.isPlaying) {
      animSec = this.slideElapsed;
    } else if (this.slideElapsed > 0) {
      animSec = this.slideElapsed;
    } else {
      const pStart = this.slidePreviewStart || 0;
      animSec = (nowSec >= pStart) ? ((nowSec - pStart) % dur) : (nowSec % dur);
    }

    // 1. Pure Clean Japanese Washi Paper & Blueprint Grid Background (No slide headers/footers!)
    this.drawJapaneseBlueprintBackground(ctx, W, H, slide, nowSec);

    // 2. Check if VDO Fullscreen mode is active
    const hasVideo = Boolean(slide.videoSrc && slide.vdoLayout !== 'vector-only');
    if (hasVideo && slide.vdoLayout === 'vdo-fullscreen') {
      this.drawFullscreenVideoStage(ctx, W, H, slide, nowSec);
    } else {
      // Pure Full-Frame 1920x1080 Motion Graphics Stage (Centered vertically & horizontally, no slide title/footer clutter!)
      const isCustomSplit = slide.sceneType === 'boq-sku-extrusion' || slide.sceneType === 'automation-deliverables-summary';
      const isSplit = hasVideo && slide.vdoLayout === 'split-handoff' && !isCustomSplit;
      const stageBox = isSplit
        ? { x: 44, y: 44, w: 1080, h: 992 }
        : { x: 44, y: 44, w: W - 88, h: 992 };

      // 3. Draw Procedural Vector Scene + Built-in Simulation for parts without VDO
      this.drawProceduralVectorScene(ctx, stageBox, slide, animSec, nowSec);

      // 4. Draw Live VDO Slot (if split-handoff or pip-corner)
      if (isSplit) {
        this.drawSplitVideoMonitor(ctx, { x: 1144, y: 44, w: 732, h: 992 }, slide, nowSec);
      } else if (hasVideo && slide.vdoLayout === 'pip-corner') {
        this.drawPipVideoMonitor(ctx, { x: W - 560, y: H - 360, w: 485, h: 285 }, slide, nowSec);
      }
    }

    if (this.subtitleOverlay && slide.narration) {
      this.drawSubtitleOverlay(ctx, W, H, slide.narration);
    }
  }

  drawJapaneseBlueprintBackground(ctx, W, H, slide, nowSec) {
    if (this.themeVersion === 'v2') {
      // Ver 2 Presentation Gradient: Dark Charcoal-Slate (#24292A) to Mint-Seafoam Teal (#A9E4D2)
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0.00, '#232829');
      bgGrad.addColorStop(0.24, '#455351');
      bgGrad.addColorStop(0.52, '#6E948A');
      bgGrad.addColorStop(0.80, '#98D4C2');
      bgGrad.addColorStop(1.00, '#A8E4D2');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Soft Emerald Glow in Bottom-Right Corner (matching reference slide)
      const glow = ctx.createRadialGradient(W * 0.87, H * 0.86, 20, W * 0.87, H * 0.86, 380);
      glow.addColorStop(0, 'rgba(16, 158, 118, 0.50)');
      glow.addColorStop(1, 'rgba(16, 158, 118, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      const m = 28;
      ctx.strokeStyle = 'rgba(244, 140, 86, 0.50)';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, m, m, W - m * 2, H - m * 2, 18);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.fillStyle = '#F6F5F0';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = 'rgba(27, 54, 93, 0.045)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(27, 54, 93, 0.09)';
    for (let x = 0; x <= W; x += 150) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 150) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    const m = 34;
    ctx.strokeStyle = 'rgba(27, 54, 93, 0.38)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(m, m, W - m * 2, H - m * 2);

    const drawCross = (cx, cy) => {
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
      ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
      ctx.stroke();
    };
    drawCross(m, m);
    drawCross(W - m, m);
    drawCross(m, H - m);
    drawCross(W - m, H - m);
    drawCross(W / 2, m);
    drawCross(W / 2, H - m);
    ctx.restore();
  }

  drawJapaneseStageHeader(ctx, W, H, slide) {
    ctx.save();
    ctx.fillStyle = '#C84B31';
    ctx.fillRect(68, 58, 6, 86);

    ctx.fillStyle = '#C84B31';
    ctx.font = '700 16px "JetBrains Mono", monospace';
    ctx.fillText(slide.chapter || `PROCESS 0${this.activeSlideIndex + 1}`, 90, 76);

    ctx.fillStyle = '#7A8694';
    ctx.font = '500 16px "Noto Sans JP", sans-serif';
    ctx.fillText(slide.jpTitle || 'デジタル設計から実組立への工程連携', 360, 76);

    ctx.fillStyle = '#1B365D';
    ctx.font = '700 37px "Prompt", sans-serif';
    ctx.fillText(slide.title || '', 90, 120);

    ctx.fillStyle = '#4A5568';
    ctx.font = '500 19.5px "Prompt", sans-serif';
    ctx.fillText(slide.subtitle || '', 90, 152);

    const stepStr = `STEP 0${this.activeSlideIndex + 1} / 0${this.slides.length}`;
    ctx.fillStyle = '#1B365D';
    ctx.font = '600 17px "JetBrains Mono", monospace';
    const sw = ctx.measureText(stepStr).width;
    ctx.fillText(stepStr, W - 140 - sw, 82);

    const timeStr = `${this.formatTime(this.globalElapsed)} / ${this.formatTime(this.getTotalDuration())}`;
    ctx.fillStyle = '#64748B';
    ctx.font = '500 16px "JetBrains Mono", monospace';
    const tw = ctx.measureText(timeStr).width;
    ctx.fillText(timeStr, W - 140 - tw, 108);

    ctx.strokeStyle = '#C84B31';
    ctx.lineWidth = 2.5;
    this.roundRect(ctx, W - 122, 58, 56, 56, 8);
    ctx.stroke();
    ctx.fillStyle = '#C84B31';
    ctx.font = '700 17px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('精密', W - 94, 83);
    ctx.fillText('建築', W - 94, 104);
    ctx.textAlign = 'left';

    ctx.strokeStyle = 'rgba(27, 54, 93, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(68, 168);
    ctx.lineTo(W - 68, 168);
    ctx.stroke();
    ctx.restore();
  }

  drawJapaneseFooter(ctx, W, H, slide) {
    ctx.save();
    const fy = 972;

    ctx.fillStyle = '#ECEAE2';
    this.roundRect(ctx, 68, fy, W - 136, 48, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(27, 54, 93, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#1B365D';
    this.roundRect(ctx, 80, fy + 10, 140, 28, 5);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText('PROCESS NOTE', 96, fy + 29);

    ctx.fillStyle = '#1E293B';
    this.fillFittedText(ctx, slide.footerNote || slide.narration || '', 238, fy + 31, W - 136 - 260, 16.5, '500', '"Prompt", sans-serif');

    const total = Math.max(1, this.getTotalDuration());
    const px = 68;
    const py = 1034;
    const pw = W - 136;

    ctx.fillStyle = 'rgba(27, 54, 93, 0.14)';
    ctx.fillRect(px, py, pw, 5);

    ctx.fillStyle = '#C84B31';
    ctx.fillRect(px, py, (this.globalElapsed / total) * pw, 5);
    ctx.restore();
  }

  drawSubtitleOverlay(ctx, W, H, text) {
    ctx.save();
    ctx.fillStyle = 'rgba(27, 54, 93, 0.92)';
    this.roundRect(ctx, 180, 895, W - 360, 68, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '500 22px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, 937);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ==================== SEQUENTIAL ENTRANCE ANIMATION HELPER ====================
  getBoxEntrance(animSec, startSec, durSec = 0.45) {
    if (animSec < startSec) return { visible: false, p: 0, alpha: 0, scale: 0.9, yOffset: 24 };
    if (animSec >= startSec + durSec) return { visible: true, p: 1, alpha: 1, scale: 1, yOffset: 0 };
    const rawP = (animSec - startSec) / durSec;
    const p = this.easeOutCubic(rawP);
    return {
      visible: true,
      p,
      alpha: p,
      scale: 0.92 + 0.08 * p,
      yOffset: (1 - p) * 20
    };
  }

  getBounceEntrance(animSec, startSec, durSec = 0.5) {
    if (animSec < startSec) return { visible: false, p: 0, alpha: 0, scale: 0.2 };
    if (animSec >= startSec + durSec) return { visible: true, p: 1, alpha: 1, scale: 1 };
    const p = Math.max(0, Math.min(1, (animSec - startSec) / durSec));
    const s = 1.70158;
    const postFix = p - 1;
    const scale = postFix * postFix * ((s + 1) * postFix + s) + 1;
    return {
      visible: true,
      p,
      alpha: Math.min(1, p * 2.2),
      scale: Math.max(0.1, scale)
    };
  }

  // ==================== PROCEDURAL SCENE DISPATCHER ====================
  drawProceduralVectorScene(ctx, box, slide, animSec, nowSec) {
    const type = slide.sceneType || 'pipeline-route-a';
    if (type === 'ver2-intro-flowchart') {
      this.drawVer2IntroFlowchartScene(ctx, box, slide, animSec, nowSec);
    } else if (type === 'whiteboard-compare-flowchart') {
      this.drawWhiteboardCompareFlowchartScene(ctx, box, slide, animSec, nowSec);
    } else if (type === 'iso-wall-assembly') {
      this.drawIsoWallAssemblyScene(ctx, box, slide, animSec, nowSec);
    } else if (type === 'design-funnel-handoff') {
      this.drawDesignFunnelScene(ctx, box, slide, animSec, nowSec);
    } else if (type === 'boq-sku-extrusion') {
      this.drawBoqSkuExtrusionScene(ctx, box, slide, animSec, nowSec);
    } else if (type === 'parallel-branch-split') {
      this.drawParallelBranchSplitScene(ctx, box, slide, animSec, nowSec);
    } else if (type === 'automation-deliverables-summary') {
      this.drawDeliverablesShowcaseScene(ctx, box, slide, animSec, nowSec);
    } else if (type === 'pipeline-route-1') {
      this.drawPipelineRoute1Scene(ctx, box, slide, animSec, nowSec);
    } else if (type === 'pipeline-route-a') {
      this.drawPipelineRouteAScene(ctx, box, slide, animSec, nowSec);
    } else if (type === 'pipeline-route-b') {
      this.drawPipelineRouteBScene(ctx, box, slide, animSec, nowSec);
    } else if (type === 'convergence-assembly') {
      this.drawConvergenceAssemblyScene(ctx, box, slide, animSec, nowSec);
    } else {
      this.drawContinuitySummaryScene(ctx, box, slide, animSec, nowSec);
    }
  }

  // ==================== HELPER: VER 2 TEARDROP PURPLE BADGE & ORANGE BLOCK ARROWS ====================
  drawVer2PurpleCornerBadge(ctx, x, y, w, h, tagTxt, mainTxt, subLineW = 240) {
    ctx.save();
    // Teardrop / 3-rounded-corner + 1-small-top-right-corner shape matching reference slide
    const rBig = Math.min(h * 0.48, 110);
    const rSmall = 14;
    ctx.beginPath();
    ctx.moveTo(x + rBig, y);
    ctx.lineTo(x + w - rSmall, y);
    ctx.arcTo(x + w, y, x + w, y + rSmall, rSmall);
    ctx.lineTo(x + w, y + h - rBig);
    ctx.arcTo(x + w, y + h, x + w - rBig, y + h, rBig);
    ctx.lineTo(x + rBig, y + h);
    ctx.arcTo(x, y + h, x, y + h - rBig, rBig);
    ctx.lineTo(x, y + rBig);
    ctx.arcTo(x, y, x + rBig, y, rBig);
    ctx.closePath();

    ctx.fillStyle = '#5933A9';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.fillStyle = '#85DCC9';
    this.fillFittedText(ctx, tagTxt, x + 56, y + h * 0.40, w - 80, 42, '800', '"Prompt", sans-serif');
    this.fillFittedText(ctx, mainTxt, x + 56, y + h * 0.68, w - 80, 50, '800', '"Prompt", sans-serif');

    // Coral-Orange Underline Accent
    ctx.fillStyle = '#F48C56';
    this.roundRect(ctx, x + 56, y + h * 0.75, Math.min(subLineW, w - 96), 8, 4);
    ctx.fill();
    ctx.restore();
  }

  drawVer2BlockArrow(ctx, x1, y1, x2, y2, nowSec, thickness = 14) {
    ctx.save();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 8) {
      ctx.restore();
      return;
    }
    const ang = Math.atan2(dy, dx);
    const headLen = Math.min(24, len * 0.42);
    const headW = thickness * 1.95;
    const shaftW = thickness;

    ctx.translate(x1, y1);
    ctx.rotate(ang);

    ctx.beginPath();
    ctx.moveTo(0, -shaftW / 2);
    ctx.lineTo(len - headLen, -shaftW / 2);
    ctx.lineTo(len - headLen, -headW / 2);
    ctx.lineTo(len, 0);
    ctx.lineTo(len - headLen, headW / 2);
    ctx.lineTo(len - headLen, shaftW / 2);
    ctx.lineTo(0, shaftW / 2);
    ctx.closePath();

    ctx.fillStyle = '#F58245';
    ctx.fill();
    ctx.strokeStyle = '#6E2B14';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Animated traveling light bead inside the orange block arrow
    const p = (nowSec * 1.35) % 1;
    const bx = p * Math.max(4, len - headLen * 0.7);
    ctx.fillStyle = '#FFF7ED';
    ctx.beginPath();
    ctx.arc(bx, 0, Math.max(3, shaftW * 0.26), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ==================== SCENE 00A: VER 2 [1] INTRODUCTION & CAPSULE FLOWCHART SLIDE ====================
  drawVer2IntroFlowchartScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    const cycle = (animSec / Math.max(10, slide.duration || 18)) % 1;
    const activeBranch = Math.floor(cycle * 4);

    // -------------------- 1. LEFT COLUMN: [1] INTRODUCTION + 3 PILLARS (Matches Uploaded Slide) --------------------
    const leftEnt = this.getBoxEntrance(animSec, 0.05, 0.40);
    if (leftEnt.visible) {
      ctx.save();
      ctx.globalAlpha *= leftEnt.alpha;

      // Top-Left Purple Teardrop Badge
      this.drawVer2PurpleCornerBadge(ctx, box.x + 16, box.y + 8, 390, 250, '[1]', 'INTRODUCTION', 250);

      // 4 Faded Purple-Slate Horizontal Bars
      const bars = [
        'พัฒนาระบบ Auto BOM & Drawing (SketchUp)',
        'เพื่อยกระดับกระบวนการจัดทำ BOM และ Drawing',
        'จากการทำงานแบบ Manual (42 Hrs.) สู่ระบบ Automation (4.5 Hrs.)',
        'เพิ่มประสิทธิภาพ โดยมุ่งเน้น 3 ด้านหลัก (① + ② + ③ = ①)'
      ];
      const barX = box.x + 140;
      const barStartY = box.y + 286;
      const barW = 650;
      const barH = 38;
      const barGap = 11;

      bars.forEach((txt, idx) => {
        const by = barStartY + idx * (barH + barGap);
        const bGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        bGrad.addColorStop(0.0, 'rgba(98, 88, 152, 0.78)');
        bGrad.addColorStop(0.75, 'rgba(116, 108, 165, 0.55)');
        bGrad.addColorStop(1.0, 'rgba(116, 108, 165, 0.08)');
        ctx.fillStyle = bGrad;
        this.roundRect(ctx, barX, by, barW, barH, 6);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        this.fillFittedText(ctx, txt, barX + barW / 2 - 20, by + 25, barW - 40, 20, '600', '"Prompt", sans-serif', 'center');
      });

      // 3 Core Pillars (01 | Skill Manpower, 02 | Human Error & Loss Cost, 03 | Reduce Time)
      const pillars = [
        {
          num: '01 |',
          pill: 'Skill Manpower',
          pillW: 365,
          desc: 'ลดการพึ่งพาทักษะเฉพาะบุคคลเพียงอย่างเดียว สร้างมาตรฐานการทำงานที่เป็นระบบ (Database • Coding Rule • Planning Rule)'
        },
        {
          num: '02 |',
          pill: 'Human Error & Loss Cost',
          pillW: 510,
          desc: 'ลดข้อผิดพลาดจากการทำงาน Manual และลดต้นทุนความสูญเสีย (★ CAD EE Puning ➔ Lantex ➔ Cutting BP)'
        },
        {
          num: '03 |',
          pill: 'Reduce Time (42 ➔ 4.5 Hrs.)',
          pillW: 440,
          desc: 'ลดระยะเวลาจัดทำ BOM และ Drawing จาก 42 Hrs. เหลือ 4.5 Hrs. (Auto BOM 4 Hrs. + ★ PO Auto 0.5 Hrs.)'
        }
      ];

      const pStartX = box.x + 28;
      const pStartY = box.y + 516;
      const pStepY = 152;

      pillars.forEach((pl, idx) => {
        const py = pStartY + idx * pStepY;
        const pEnt = this.getBoxEntrance(animSec, 0.25 + idx * 0.18, 0.35);
        if (!pEnt.visible) return;

        ctx.save();
        ctx.globalAlpha *= pEnt.alpha;

        // Number "01 |"
        ctx.fillStyle = '#232829';
        ctx.font = '700 42px "Prompt", sans-serif';
        ctx.fillText(pl.num, pStartX, py + 44);

        // Mint Pill with Coral-Orange Border
        const pillX = pStartX + 92;
        const pillY = py + 2;
        const pillH = 56;
        ctx.fillStyle = '#84D3BD';
        this.roundRect(ctx, pillX, pillY, pl.pillW, pillH, 28);
        ctx.fill();
        ctx.strokeStyle = '#EB8B55';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        ctx.fillStyle = '#111827';
        this.fillFittedText(ctx, pl.pill, pillX + 26, pillY + 39, pl.pillW - 52, 33, '700', '"Prompt", sans-serif');

        // Thai Subtitle below pill
        ctx.fillStyle = '#1F2937';
        this.fillFittedText(ctx, pl.desc, pStartX, py + 94, 790, 22, '500', '"Prompt", sans-serif');
        ctx.restore();
      });

      ctx.restore();
    }

    // Vertical Coral-Orange Divider Line (matching reference slide)
    ctx.save();
    ctx.strokeStyle = '#EB8B55';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(box.x + 848, box.y + 150);
    ctx.lineTo(box.x + 848, box.y + box.h - 40);
    ctx.stroke();
    ctx.restore();

    // -------------------- 2. RIGHT COLUMN: VER 2 CAPSULE FLOWCHART (Matches Uploaded Slide + Whiteboard Nodes) --------------------
    const rightEnt = this.getBoxEntrance(animSec, 0.30, 0.45);
    if (rightEnt.visible) {
      ctx.save();
      ctx.globalAlpha *= rightEnt.alpha;

      // Teal Rounded Container Box
      const tBoxX = box.x + 995;
      const tBoxY = box.y + 150;
      const tBoxW = 635;
      const tBoxH = 745;

      ctx.fillStyle = 'rgba(76, 165, 139, 0.90)';
      this.roundRect(ctx, tBoxX, tBoxY, tBoxW, tBoxH, 48);
      ctx.fill();
      ctx.strokeStyle = '#EB9362';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Tilted Floorplan Tablet & Color Swatches at Top-Left of Teal Box (Matching Reference Slide!)
      ctx.save();
      ctx.translate(box.x + 1135, box.y + 155);
      ctx.rotate(-0.18);
      // Tablet outer frame
      ctx.fillStyle = '#B4BEF2';
      this.roundRect(ctx, -125, -85, 250, 175, 16);
      ctx.fill();
      ctx.strokeStyle = '#5933A9';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // White screen
      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, -108, -72, 198, 148, 8);
      ctx.fill();
      // Architectural Floorplan lines inside tablet
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 3;
      ctx.strokeRect(-92, -56, 164, 116);
      ctx.beginPath();
      ctx.moveTo(-20, -56); ctx.lineTo(-20, 15);
      ctx.moveTo(-92, 15); ctx.lineTo(25, 15);
      ctx.moveTo(25, -56); ctx.lineTo(25, 60);
      ctx.stroke();
      // Side tool buttons on tablet
      ctx.fillStyle = '#85DCC9';
      for (let b = 0; b < 5; b++) {
        this.roundRect(ctx, 96, -62 + b * 27, 18, 20, 4);
        ctx.fill();
      }
      ctx.restore();

      // Left Lavender Input Circle 1: OTF (Forcon.) / House Floorplan
      const c1X = box.x + 950;
      const c1Y = box.y + 390;
      const c1R = 80;
      ctx.save();
      ctx.fillStyle = '#B4BEF2';
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(c1X, c1Y, c1R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'OTF', c1X, c1Y - 18, c1R * 1.6, 26, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, '(Forcon.)', c1X, c1Y + 10, c1R * 1.6, 19, '700', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#374151';
      this.fillFittedText(ctx, 'House Floorplan', c1X, c1Y + 34, c1R * 1.65, 15, '600', '"Prompt", sans-serif', 'center');
      ctx.restore();

      // Left Lavender Input Circle 2: Planning Rule / Coding Rule / Database (MIM, IM)
      const c2X = box.x + 950;
      const c2Y = box.y + 575;
      const c2R = 84;
      ctx.save();
      ctx.fillStyle = '#B4BEF2';
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(c2X, c2Y, c2R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#5933A9';
      this.fillFittedText(ctx, '★ CORE RULES', c2X, c2Y - 38, c2R * 1.5, 14, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Database (MIM, IM)', c2X, c2Y - 14, c2R * 1.75, 16, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, 'Coding Rule', c2X, c2Y + 12, c2R * 1.7, 17, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, 'Planning Rule', c2X, c2Y + 38, c2R * 1.7, 17, '800', '"Prompt", sans-serif', 'center');
      ctx.restore();

      // Tall Coral-Orange Capsule 1: Auto BOM & Drawing (SketchUp) 4 Hrs.
      const cap1X = box.x + 1058;
      const cap1Y = box.y + 300;
      const cap1W = 166;
      const cap1H = 385;
      ctx.save();
      ctx.fillStyle = '#FA8E4F';
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 12;
      this.roundRect(ctx, cap1X, cap1Y, cap1W, cap1H, 83);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // Purple Badge on top of Auto BOM Capsule: ①+②+③=① (4 Hrs.)
      ctx.fillStyle = '#5933A9';
      this.roundRect(ctx, cap1X + 12, cap1Y - 18, cap1W - 24, 38, 19);
      ctx.fill();
      ctx.strokeStyle = '#F48C56';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#85DCC9';
      this.fillFittedText(ctx, '①+②+③=① • 4 Hrs.', cap1X + cap1W / 2, cap1Y + 6, cap1W - 34, 15.5, '800', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Auto BOM', cap1X + cap1W / 2, cap1Y + 66, cap1W - 24, 24, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, '& Drawing', cap1X + cap1W / 2, cap1Y + 94, cap1W - 24, 22, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#1F2937';
      this.fillFittedText(ctx, '(SketchUp)', cap1X + cap1W / 2, cap1Y + 120, cap1W - 24, 17, '700', '"Prompt", sans-serif', 'center');

      // 3 Sections inside Auto BOM Capsule (matching reference slide: BOM Floorplan, DWG Detail, Data Material Info)
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, '• ParItems (BOM)', cap1X + cap1W / 2, cap1Y + 172, cap1W - 24, 16.5, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, '• Picking List', cap1X + cap1W / 2, cap1Y + 216, cap1W - 24, 16.5, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, '• SB List (EE)', cap1X + cap1W / 2, cap1Y + 260, cap1W - 24, 16.5, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, '• 2D & 3D Dwg', cap1X + cap1W / 2, cap1Y + 304, cap1W - 24, 16.5, '800', '"Prompt", sans-serif', 'center');
      ctx.restore();

      // Middle Column Nodes:
      // 1) PO Auto (0.5 Hrs.) Circle
      const poX = box.x + 1335;
      const poY = box.y + 390;
      const poR = 76;
      ctx.save();
      ctx.fillStyle = '#FA8E4F';
      ctx.beginPath();
      ctx.arc(poX, poY, poR, 0, Math.PI * 2);
      ctx.fill();
      if (activeBranch === 0) {
        ctx.strokeStyle = '#5933A9';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.fillStyle = '#5933A9';
      this.fillFittedText(ctx, '★ 0.5 Hrs.', poX, poY - 32, poR * 1.5, 16, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'MRP ➔ PO Auto', poX, poY - 4, poR * 1.75, 19, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, '& Send Email', poX, poY + 22, poR * 1.65, 16.5, '700', '"Prompt", sans-serif', 'center');
      ctx.restore();

      // 2) Job Order / Picking Data Circle
      const pkX = box.x + 1335;
      const pkY = box.y + 555;
      const pkR = 74;
      ctx.save();
      ctx.fillStyle = '#FA8E4F';
      ctx.beginPath();
      ctx.arc(pkX, pkY, pkR, 0, Math.PI * 2);
      ctx.fill();
      if (activeBranch === 1) {
        ctx.strokeStyle = '#5933A9';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Job Order', pkX, pkY - 10, pkR * 1.65, 20, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, 'Picking List', pkX, pkY + 18, pkR * 1.65, 18.5, '800', '"Prompt", sans-serif', 'center');
      ctx.restore();

      // 3) Bottom Capsule: SB List ➔ ★ CAD EE Puning + 2D & 3D Drawing
      const dwgCapX = box.x + 1258;
      const dwgCapY = box.y + 642;
      const dwgCapW = 154;
      const dwgCapH = 225;
      ctx.save();
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, dwgCapX, dwgCapY, dwgCapW, dwgCapH, 77);
      ctx.fill();
      if (activeBranch >= 2) {
        ctx.strokeStyle = '#5933A9';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.fillStyle = '#5933A9';
      this.fillFittedText(ctx, '★ CAD EE Puning', dwgCapX + dwgCapW / 2, dwgCapY + 58, dwgCapW - 20, 16.5, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Lantex ➔', dwgCapX + dwgCapW / 2, dwgCapY + 86, dwgCapW - 24, 18, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, 'Cutting BP', dwgCapX + dwgCapW / 2, dwgCapY + 112, dwgCapW - 24, 18, '800', '"Prompt", sans-serif', 'center');

      ctx.strokeStyle = 'rgba(17, 24, 39, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dwgCapX + 24, dwgCapY + 132);
      ctx.lineTo(dwgCapX + dwgCapW - 24, dwgCapY + 132);
      ctx.stroke();

      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, '2D & 3D DWG', dwgCapX + dwgCapW / 2, dwgCapY + 162, dwgCapW - 22, 18, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, 'for Production', dwgCapX + dwgCapW / 2, dwgCapY + 186, dwgCapW - 22, 15.5, '700', '"Prompt", sans-serif', 'center');
      ctx.restore();

      // Right-Middle Column Capsules: Supplier (Vendor) & Supply (Store)
      const venCapX = box.x + 1450;
      const venCapY = box.y + 228;
      const venCapW = 152;
      const venCapH = 235;
      ctx.save();
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, venCapX, venCapY, venCapW, venCapH, 76);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Supplier', venCapX + venCapW / 2, venCapY + 110, venCapW - 24, 25, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#1F2937';
      this.fillFittedText(ctx, '(Vendor)', venCapX + venCapW / 2, venCapY + 140, venCapW - 24, 18, '700', '"Prompt", sans-serif', 'center');
      ctx.restore();

      const stoCapX = box.x + 1450;
      const stoCapY = box.y + 478;
      const stoCapW = 152;
      const stoCapH = 235;
      ctx.save();
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, stoCapX, stoCapY, stoCapW, stoCapH, 76);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Supply', stoCapX + stoCapW / 2, stoCapY + 110, stoCapW - 24, 25, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#1F2937';
      this.fillFittedText(ctx, '(Store)', stoCapX + stoCapW / 2, stoCapY + 140, stoCapW - 24, 18, '700', '"Prompt", sans-serif', 'center');
      ctx.restore();

      // Far-Right Light-Grey Vertical Capsule: Production Process ➔ Installation
      const prCapX = box.x + 1658;
      const prCapY = box.y + 275;
      const prCapW = 154;
      const prCapH = 520;
      ctx.save();
      ctx.fillStyle = '#DFDFDF';
      ctx.shadowColor = 'rgba(0,0,0,0.20)';
      ctx.shadowBlur = 14;
      this.roundRect(ctx, prCapX, prCapY, prCapW, prCapH, 77);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.fillStyle = '#1F2937';
      this.fillFittedText(ctx, 'Production', prCapX + prCapW / 2, prCapY + 150, prCapW - 24, 22, '600', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Process', prCapX + prCapW / 2, prCapY + 185, prCapW - 24, 27, '800', '"Prompt", sans-serif', 'center');

      // Downward Arrow inside Grey Capsule: Production ➔ Installation
      this.drawVer2BlockArrow(ctx, prCapX + prCapW / 2, prCapY + 215, prCapX + prCapW / 2, prCapY + 290, nowSec, 14);

      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Installation', prCapX + prCapW / 2, prCapY + 332, prCapW - 20, 24, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#374151';
      this.fillFittedText(ctx, 'PACKING TO', prCapX + prCapW / 2, prCapY + 368, prCapW - 24, 15, '600', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'CUSTOMER', prCapX + prCapW / 2, prCapY + 394, prCapW - 24, 17, '800', '"Prompt", sans-serif', 'center');
      ctx.restore();

      // Coral-Orange Block Arrows Connecting the Capsules (matching reference slide!)
      this.drawVer2BlockArrow(ctx, c1X + c1R - 12, c1Y, cap1X + 12, c1Y, nowSec, 15);
      this.drawVer2BlockArrow(ctx, cap1X + cap1W - 10, poY, poX - poR + 8, poY, nowSec + 0.15, 15);
      this.drawVer2BlockArrow(ctx, poX + poR - 8, poY, venCapX + 18, poY, nowSec + 0.3, 15);
      this.drawVer2BlockArrow(ctx, venCapX + venCapW / 2, venCapY + venCapH - 22, stoCapX + stoCapW / 2, stoCapY + 28, nowSec + 0.45, 15);
      this.drawVer2BlockArrow(ctx, pkX + pkR - 8, pkY, stoCapX + 18, pkY, nowSec + 0.35, 15);
      this.drawVer2BlockArrow(ctx, stoCapX + stoCapW - 14, stoCapY + 100, prCapX + 14, stoCapY + 100, nowSec + 0.6, 15);
      this.drawVer2BlockArrow(ctx, dwgCapX + dwgCapW - 18, dwgCapY + 170, prCapX + 16, dwgCapY + 170, nowSec + 0.5, 15);

      ctx.restore();
    }

    ctx.restore();
  }

  // ==================== SCENE 00B: COMPLETE WHITEBOARD FLOWCHART (EXISTING 42 HRS. VS NEW 4.5 HRS.) ====================
  drawWhiteboardCompareFlowchartScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    const mode = this.flowchartViewMode || 'both';

    // Top Header Bar inside Stage
    ctx.save();
    // Left Purple Pill Badge
    ctx.fillStyle = '#5933A9';
    this.roundRect(ctx, box.x + 8, box.y + 4, 495, 58, 29);
    ctx.fill();
    ctx.strokeStyle = '#F48C56';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#85DCC9';
    this.fillFittedText(
      ctx,
      '[1] FLOWCHART: EXISTING vs. NEW',
      box.x + 32,
      box.y + 41,
      450,
      21,
      '800',
      '"Prompt", sans-serif'
    );

    // Middle Summary Pills (01 | Existing -> 02 | New)
    ctx.fillStyle = '#84D3BD';
    this.roundRect(ctx, box.x + 520, box.y + 10, 490, 46, 23);
    ctx.fill();
    ctx.strokeStyle = '#EB8B55';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#111827';
    this.fillFittedText(
      ctx,
      '①+②+③ = ①  •  รวบจาก Manual แยกส่วน สู่ Auto BOM & Drawing เชื่อมต่อระบบ',
      box.x + 765,
      box.y + 40,
      465,
      17,
      '800',
      '"Prompt", sans-serif',
      'center'
    );

    // Right 3 Interactive Mode Switcher Tabs on Canvas
    const tabs = [
      { id: 'both', label: '🔀 เทียบครบทั้งกระดาน (Existing + New)' },
      { id: 'new', label: '✨ ผังใหม่ New (Automation)' },
      { id: 'existing', label: '⚠️ ผังเดิม Existing (Manual)' }
    ];
    const tabW = 258;
    const tabGap = 10;
    const tabStartX = box.x + box.w - (tabW * 3 + tabGap * 2) - 8;
    tabs.forEach((tb, idx) => {
      const tx = tabStartX + idx * (tabW + tabGap);
      const ty = box.y + 10;
      const isAct = mode === tb.id;
      ctx.fillStyle = isAct ? '#5933A9' : 'rgba(255, 255, 255, 0.78)';
      this.roundRect(ctx, tx, ty, tabW, 46, 23);
      ctx.fill();
      ctx.strokeStyle = isAct ? '#F48C56' : '#5933A9';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = isAct ? '#85DCC9' : '#111827';
      this.fillFittedText(ctx, tb.label, tx + tabW / 2, ty + 30, tabW - 22, 14.5, '800', '"Prompt", sans-serif', 'center');
    });
    ctx.restore();

    // Helper for drawing a glowing particle along a line segment
    const drawFlowLine = (x1, y1, x2, y2, col = '#F58245', hasArrow = true, speed = 1.0) => {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (hasArrow) {
        const ang = Math.atan2(y2 - y1, x2 - x1);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 14 * Math.cos(ang - 0.45), y2 - 14 * Math.sin(ang - 0.45));
        ctx.lineTo(x2 - 14 * Math.cos(ang + 0.45), y2 - 14 * Math.sin(ang + 0.45));
        ctx.closePath();
        ctx.fill();
      }

      const p = (nowSec * 0.9 * speed) % 1;
      const px = x1 + (x2 - x1) * p;
      const py = y1 + (y2 - y1) * p;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    // -------------------- SUB-RENDERER A: EXISTING WORKFLOW (42 HRS.) --------------------
    const renderExistingFlow = (ox, oy, scaleY = 1.0) => {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(1.0, scaleY);

      // Container Card
      ctx.fillStyle = 'rgba(36, 41, 42, 0.42)';
      this.roundRect(ctx, 0, 0, 1816, 428, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244, 140, 86, 0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Section Badge: Existing
      ctx.fillStyle = '#5933A9';
      this.roundRect(ctx, 20, 16, 240, 42, 21);
      ctx.fill();
      ctx.strokeStyle = '#F48C56';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#85DCC9';
      this.fillFittedText(ctx, 'Existing (กระบวนการเดิม Manual)', 140, 44, 215, 18, '800', '"Prompt", sans-serif', 'center');

      // OTF (Forcon.) Lavender Circle
      const otfX = 95, otfY = 232, otfR = 62;
      ctx.fillStyle = '#B4BEF2';
      ctx.beginPath();
      ctx.arc(otfX, otfY, otfR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5933A9';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'OTF', otfX, otfY - 6, 100, 26, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, '(Forcon.)', otfX, otfY + 22, 105, 17, '700', '"Prompt", sans-serif', 'center');

      // Split OTF -> BOM (y=142) and Drawing (y=342)
      ctx.strokeStyle = '#F58245';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(otfX + otfR, otfY);
      ctx.lineTo(195, otfY);
      ctx.moveTo(195, 142);
      ctx.lineTo(195, 342);
      ctx.moveTo(195, 142);
      ctx.lineTo(225, 142);
      ctx.moveTo(195, 342);
      ctx.lineTo(225, 342);
      ctx.stroke();

      // BOM Pill
      ctx.fillStyle = '#B4BEF2';
      this.roundRect(ctx, 225, 118, 92, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'BOM', 271, 149, 76, 20, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(317, 142, 358, 142, '#F58245', true);

      // Box ① ✗: Menu Select / Free Input (16 Hrs.)
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 360, 86, 210, 112, 24);
      ctx.fill();
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Badge ① ✗ above Box 1
      ctx.fillStyle = '#DC2626';
      this.roundRect(ctx, 395, 52, 140, 30, 15);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, '① ✗ Manual', 465, 73, 125, 16, '800', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Menu Select', 465, 134, 185, 22, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, 'Free Input', 465, 168, 185, 22, '800', '"Prompt", sans-serif', 'center');

      // Bracket from Box 1 into 3 sub-branches (y=78, y=155, y=248)
      ctx.strokeStyle = '#F58245';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(570, 142);
      ctx.lineTo(610, 142);
      ctx.moveTo(610, 78);
      ctx.lineTo(610, 248);
      ctx.moveTo(610, 78);
      ctx.lineTo(640, 78);
      ctx.moveTo(610, 155);
      ctx.lineTo(640, 155);
      ctx.moveTo(610, 248);
      ctx.lineTo(640, 248);
      ctx.stroke();

      // Sub-branch 1.1: Part Items -> MRP -> Purchase -> [④ ✗ PO & Send Email Manual 2 Hrs.] -> Supplier -> Supply
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 642, 54, 135, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Part Items', 709, 85, 118, 18, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(777, 78, 855, 78, '#F58245', true);
      ctx.fillStyle = '#85DCC9';
      this.fillFittedText(ctx, 'MRP', 816, 66, 65, 16, '800', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 858, 54, 130, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Purchase', 923, 85, 112, 18, '800', '"Prompt", sans-serif', 'center');

      // Box ④ ✗: PO & Send Email Manual (2 Hrs.) above line
      ctx.fillStyle = '#FEE2E2';
      this.roundRect(ctx, 1005, 18, 248, 52, 16);
      ctx.fill();
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#DC2626';
      this.fillFittedText(ctx, '④ ✗ PO & Send Email Manual', 1129, 41, 232, 15.5, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, '(PO Manual)', 1129, 61, 180, 15, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(988, 78, 1270, 78, '#F58245', true);

      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 1272, 54, 122, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Supplier', 1333, 85, 105, 18, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(1394, 78, 1435, 78, '#F58245', true);

      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 1438, 54, 114, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Supply', 1495, 85, 96, 18, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(1552, 78, 1625, 78, '#EF4444', true);

      // Sub-branch 1.2: Job Order / Picking List
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 642, 131, 265, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Job Order / Picking List', 774, 162, 240, 18, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(907, 155, 1625, 155, '#EF4444', true);

      // Sub-branch 1.3: SB List -> [③ ✗ EE Punching - Cad Dwg 16 Hrs.] -> Lantex -> Cutting BP
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 642, 224, 118, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'SB List', 701, 255, 100, 18, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(760, 248, 805, 248, '#F58245', true);

      // Box ③ ✗: EE Punching - Cad Dwg (16 Hrs.)
      ctx.fillStyle = '#FEE2E2';
      this.roundRect(ctx, 808, 210, 255, 76, 18);
      ctx.fill();
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2.8;
      ctx.stroke();
      ctx.fillStyle = '#DC2626';
      this.fillFittedText(ctx, '③ ✗ Manual EE', 935, 236, 220, 16.5, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'EE Punching - Cad Dwg', 935, 266, 235, 18.5, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(1063, 248, 1110, 248, '#F58245', true);

      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 1112, 224, 118, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Lantex', 1171, 255, 100, 18, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(1230, 248, 1275, 248, '#F58245', true);

      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 1278, 224, 148, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Cutting BP', 1352, 255, 130, 18, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(1426, 248, 1625, 248, '#EF4444', true);

      // Branch 2: Drawing -> [② ✗ (Cad) 2D Assembly Dwg. / Manual Code 8 Hrs.]
      ctx.fillStyle = '#B4BEF2';
      this.roundRect(ctx, 225, 318, 108, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Drawing', 279, 349, 92, 19, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(333, 342, 358, 342, '#F58245', true);

      // Box ② ✗: (Cad) 2D Assembly Dwg. / Manual Code (8 Hrs.)
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 360, 286, 250, 112, 24);
      ctx.fill();
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#DC2626';
      this.roundRect(ctx, 415, 254, 140, 30, 15);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, '② ✗ Manual 2D', 485, 275, 125, 16, '800', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, '(Cad) 2D Assembly Dwg.', 485, 332, 228, 19, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, 'Manual Code', 485, 366, 220, 20, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(610, 342, 1625, 342, '#EF4444', true);

      // Right Grey Capsule: Production -> Installation
      ctx.fillStyle = '#DFDFDF';
      this.roundRect(ctx, 1632, 42, 160, 346, 68);
      ctx.fill();
      ctx.strokeStyle = '#5933A9';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Production', 1712, 130, 138, 24, '800', '"Prompt", sans-serif', 'center');
      this.drawVer2BlockArrow(ctx, 1712, 158, 1712, 242, nowSec, 13);
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Installation', 1712, 285, 138, 24, '800', '"Prompt", sans-serif', 'center');

      ctx.restore();
    };

    // -------------------- SUB-RENDERER B: NEW WORKFLOW (4.5 HRS. | ①+②+③=①) --------------------
    const renderNewFlow = (ox, oy, scaleY = 1.0) => {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(1.0, scaleY);

      // Teal Container Card
      ctx.fillStyle = 'rgba(76, 165, 139, 0.85)';
      this.roundRect(ctx, 0, 0, 1816, 462, 28);
      ctx.fill();
      ctx.strokeStyle = '#EB9362';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Section Badge: New
      ctx.fillStyle = '#84D3BD';
      this.roundRect(ctx, 20, 16, 290, 44, 22);
      ctx.fill();
      ctx.strokeStyle = '#EB8B55';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'New (กระบวนการใหม่ • ①+②+③=①)', 165, 45, 268, 17.5, '800', '"Prompt", sans-serif', 'center');

      // Left Box: ★ Database (MIM, IM) / Coding Rule / Planing Rule
      ctx.fillStyle = '#B4BEF2';
      this.roundRect(ctx, 22, 82, 255, 178, 24);
      ctx.fill();
      ctx.strokeStyle = '#5933A9';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#5933A9';
      this.roundRect(ctx, 48, 66, 204, 30, 15);
      ctx.fill();
      ctx.fillStyle = '#85DCC9';
      this.fillFittedText(ctx, '★ CORE PREREQUISITES', 150, 87, 186, 14, '800', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, '• Database (MIM, IM)', 42, 132, 220, 20, '800', '"Prompt", sans-serif');
      this.fillFittedText(ctx, '• Coding Rule', 42, 174, 220, 20, '800', '"Prompt", sans-serif');
      this.fillFittedText(ctx, '• Planing Rule', 42, 216, 220, 20, '800', '"Prompt", sans-serif');

      // OTF (Forcon.) Lavender Circle
      const otfX = 148, otfY = 355, otfR = 64;
      ctx.fillStyle = '#B4BEF2';
      ctx.beginPath();
      ctx.arc(otfX, otfY, otfR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5933A9';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'OTF', otfX, otfY - 6, 100, 26, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, '(Forcon.)', otfX, otfY + 22, 108, 17.5, '700', '"Prompt", sans-serif', 'center');

      // Formula Badge above arrow: ① + ② + ③ = ①
      ctx.fillStyle = '#5933A9';
      this.roundRect(ctx, 295, 72, 250, 44, 22);
      ctx.fill();
      ctx.strokeStyle = '#F48C56';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#85DCC9';
      this.fillFittedText(ctx, '① + ② + ③ = ①', 420, 101, 225, 22, '800', '"Prompt", sans-serif', 'center');

      // Arrows from Rules & OTF into Auto BOM & Drawing
      this.drawVer2BlockArrow(ctx, 212, otfY, 305, 275, nowSec, 14);
      this.drawVer2BlockArrow(ctx, 277, 175, 305, 225, nowSec + 0.2, 12);

      // Main Box: Auto BOM & Drawing (SketchUp)
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 310, 145, 248, 215, 36);
      ctx.fill();
      ctx.strokeStyle = '#5933A9';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Auto Hub Badge
      ctx.fillStyle = '#5933A9';
      this.roundRect(ctx, 364, 124, 140, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, '★ Auto Hub', 434, 148, 120, 19, '800', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Auto BOM &', 434, 212, 220, 26, '800', '"Prompt", sans-serif', 'center');
      this.fillFittedText(ctx, 'Drawing', 434, 248, 220, 26, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#1F2937';
      this.fillFittedText(ctx, '(SketchUp)', 434, 286, 210, 20, '700', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#5933A9';
      this.fillFittedText(ctx, '★ All-in-One Model', 434, 326, 210, 16, '800', '"Prompt", sans-serif', 'center');

      // Bracket from Auto BOM into 4 Parallel Branches (y=90, y=188, y=288, y=388)
      ctx.strokeStyle = '#F58245';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(558, 252);
      ctx.lineTo(602, 252);
      ctx.moveTo(602, 90);
      ctx.lineTo(602, 388);
      ctx.moveTo(602, 90);
      ctx.lineTo(638, 90);
      ctx.moveTo(602, 188);
      ctx.lineTo(638, 188);
      ctx.moveTo(602, 288);
      ctx.lineTo(638, 288);
      ctx.moveTo(602, 388);
      ctx.lineTo(638, 388);
      ctx.stroke();

      // Branch 1: ParItems -> MRP -> Purchase -> [★ PO Auto & Send Email 0.5 Hrs.] -> Supplier -> Supply
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 640, 64, 134, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'ParItems', 707, 97, 116, 19, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(774, 90, 852, 90, '#F58245', true, 1.4);
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, 'MRP', 813, 76, 65, 16, '800', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 855, 64, 132, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Purchase', 921, 97, 114, 19, '800', '"Prompt", sans-serif', 'center');

      // ★ PO Auto & Send Email Mint Highlight Box
      ctx.fillStyle = '#84D3BD';
      this.roundRect(ctx, 1005, 22, 252, 64, 20);
      ctx.fill();
      ctx.strokeStyle = '#5933A9';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#5933A9';
      this.fillFittedText(ctx, '★ Automation', 1131, 46, 228, 16, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'PO Auto & Send Email', 1131, 72, 232, 18, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(987, 90, 1272, 90, '#84D3BD', true, 1.8);

      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 1275, 64, 122, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Supplier', 1336, 97, 105, 19, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(1397, 90, 1436, 90, '#F58245', true, 1.4);

      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 1438, 64, 114, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Supply', 1495, 97, 98, 19, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(1552, 90, 1625, 90, '#F58245', true, 1.4);

      // Branch 2: Job Order / Picking List -> Production
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 640, 162, 275, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Job Order / Picking List', 777, 195, 250, 19, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(915, 188, 1625, 188, '#F58245', true, 1.4);

      // Branch 3: SB List -> [★ Cad EE Puning] -> Lantex -> Cutting BP -> Production
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 640, 262, 122, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'SB List', 701, 295, 104, 19, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(762, 288, 808, 288, '#F58245', true, 1.4);

      // ★ Cad EE Puning Mint Box
      ctx.fillStyle = '#84D3BD';
      this.roundRect(ctx, 810, 252, 235, 72, 22);
      ctx.fill();
      ctx.strokeStyle = '#5933A9';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#5933A9';
      this.fillFittedText(ctx, '★ AUTOMATED', 927, 278, 210, 15, '800', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'CAD EE Puning', 927, 306, 215, 20, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(1045, 288, 1105, 288, '#84D3BD', true, 1.6);

      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 1108, 262, 124, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Lantex', 1170, 295, 105, 19, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(1232, 288, 1278, 288, '#F58245', true, 1.4);

      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 1280, 262, 156, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Cutting BP', 1358, 295, 138, 19, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(1436, 288, 1625, 288, '#F58245', true, 1.4);

      // Branch 4: 2D & 3D Drawing -> Production
      ctx.fillStyle = '#FA8E4F';
      this.roundRect(ctx, 640, 362, 235, 52, 26);
      ctx.fill();
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, '2D & 3D Drawing', 757, 395, 210, 19, '800', '"Prompt", sans-serif', 'center');

      drawFlowLine(875, 388, 1625, 388, '#F58245', true, 1.4);

      // Right Grey Capsule: Production -> Installation
      ctx.fillStyle = '#DFDFDF';
      this.roundRect(ctx, 1632, 42, 160, 378, 72);
      ctx.fill();
      ctx.strokeStyle = '#5933A9';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Production', 1712, 142, 138, 25, '800', '"Prompt", sans-serif', 'center');
      this.drawVer2BlockArrow(ctx, 1712, 172, 1712, 265, nowSec, 15);
      ctx.fillStyle = '#111827';
      this.fillFittedText(ctx, 'Installation', 1712, 312, 138, 25, '800', '"Prompt", sans-serif', 'center');

      ctx.restore();
    };

    if (mode === 'both') {
      renderExistingFlow(box.x + 8, box.y + 72, 0.98);
      renderNewFlow(box.x + 8, box.y + 510, 1.0);
    } else if (mode === 'new') {
      renderNewFlow(box.x + 8, box.y + 115, 1.78);
    } else {
      renderExistingFlow(box.x + 8, box.y + 115, 1.92);
    }

    ctx.restore();
  }

  // ==================== SCENE 01: ISOMETRIC 3D DIGITAL BLUEPRINT TO PHYSICAL WALL ASSEMBLY ====================
  drawIsoWallAssemblyScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    // Starts strictly at Step 01 upon slide opening (animSec = 0)
    const cycle = (animSec / (slide.duration || 16)) % 1;
    const activeIdx = Math.floor(cycle * 4);

    // Left 3D Isometric Cutaway Viewport with Sequential Entrance
    const vpEnt = this.getBoxEntrance(animSec, 0.25, 0.45);
    const vpX = box.x + 10;
    const vpY = box.y + 10;
    const vpW = box.w * 0.52;
    const vpH = box.h - 20;

    if (vpEnt.visible) {
      ctx.save();
      ctx.globalAlpha *= vpEnt.alpha;
      const vpMidX = vpX + vpW / 2;
      const vpMidY = vpY + vpH / 2;
      ctx.translate(vpMidX, vpMidY + vpEnt.yOffset);
      ctx.scale(vpEnt.scale, vpEnt.scale);
      ctx.translate(-vpMidX, -vpMidY);

      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, vpX, vpY, vpW, vpH, 16);
      ctx.fill();
      ctx.strokeStyle = '#1B365D';
      ctx.lineWidth = 2.5;
      ctx.stroke();

    // Top Technical Header Pill inside Viewport
    ctx.fillStyle = '#1B365D';
    this.roundRect(ctx, vpX, vpY, vpW, 52, 14);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(
      ctx,
      'SECTION A-A • DIGITAL BLUEPRINT (3D CAD) ➔ PHYSICAL MULTI-LAYER WALL ASSEMBLY',
      vpX + 20,
      vpY + 32,
      vpW - 40,
      16,
      '700',
      '"JetBrains Mono", monospace'
    );

    const innerX = vpX + 12;
    const innerY = vpY + 62;
    const innerW = vpW - 24;
    const innerH = vpH - 132;

    ctx.save();
    this.roundRect(ctx, innerX, innerY, innerW, innerH, 10);
    ctx.clip();

    const heroImg = this.illus && this.illus.isoHero;
    let imgX = innerX;
    let imgY = innerY;
    let imgW = innerW;
    let imgH = innerH;

    if (heroImg && heroImg.complete && heroImg.naturalWidth > 0) {
      const sc = Math.min(innerW / heroImg.naturalWidth, innerH / heroImg.naturalHeight);
      imgW = heroImg.naturalWidth * sc;
      imgH = heroImg.naturalHeight * sc;
      imgX = innerX + (innerW - imgW) / 2;
      imgY = innerY + (innerH - imgH) / 2;
      ctx.drawImage(heroImg, imgX, imgY, imgW, imgH);

      // Animated Diagonal Laser Translation Sweep across the 3D Wall Cutaway
      const scanP = (nowSec * 0.32) % 1;
      const scanX = imgX + imgW * scanP;
      const lGrad = ctx.createLinearGradient(scanX - 55, 0, scanX + 18, 0);
      lGrad.addColorStop(0, 'rgba(2, 132, 199, 0)');
      lGrad.addColorStop(0.65, 'rgba(2, 132, 199, 0.22)');
      lGrad.addColorStop(1, 'rgba(200, 75, 49, 0.65)');
      ctx.fillStyle = lGrad;
      ctx.fillRect(scanX - 55, imgY, 73, imgH);

      ctx.strokeStyle = '#C84B31';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(scanX, imgY + 10);
      ctx.lineTo(scanX, imgY + imgH - 10);
      ctx.stroke();

      // Animated Glowing Handoff Stream Particles from Digital Blueprint (left) to Physical Wall (right)
      const streamStart = { x: imgX + imgW * 0.30, y: imgY + imgH * 0.44 };
      const streamEnd = { x: imgX + imgW * 0.68, y: imgY + imgH * 0.52 };
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 75, 49, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -nowSec * 36;
      ctx.beginPath();
      ctx.moveTo(streamStart.x, streamStart.y);
      ctx.lineTo(streamEnd.x, streamEnd.y);
      ctx.stroke();
      ctx.restore();

      for (let p = 0; p < 3; p++) {
        const pt = ((nowSec * 0.65) + p / 3) % 1;
        const px = streamStart.x + (streamEnd.x - streamStart.x) * pt;
        const py = streamStart.y + (streamEnd.y - streamStart.y) * pt;
        ctx.fillStyle = '#C84B31';
        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4 Layer Target Reticles synchronized with the 4 Right Cards
      const layerTargets = [
        { rx: 0.27, ry: 0.42, code: '01 • 3D STEEL STUD FRAME' },
        { rx: 0.56, ry: 0.49, code: '02 • ROCKWOOL INSULATION' },
        { rx: 0.68, ry: 0.55, code: '03 • GYPSUM & MEP CAVITY' },
        { rx: 0.80, ry: 0.62, code: '04 • TERRACOTTA FINISH WALL' }
      ];
      layerTargets.forEach((lt, idx) => {
        const tx = imgX + imgW * lt.rx;
        const ty = imgY + imgH * lt.ry;
        const isCur = idx === activeIdx;
        const r = isCur ? 18 + 4 * Math.sin(nowSec * 6) : 11;

        ctx.save();
        ctx.strokeStyle = isCur ? '#C84B31' : '#1B365D';
        ctx.lineWidth = isCur ? 2.8 : 1.8;
        ctx.beginPath();
        ctx.arc(tx, ty, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = isCur ? '#C84B31' : '#1B365D';
        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        ctx.fill();

        if (isCur) {
          const badgeW = 215;
          const badgeH = 30;
          const bx = Math.min(innerX + innerW - badgeW - 8, Math.max(innerX + 8, tx - badgeW / 2));
          const by = ty - r - 36;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          this.roundRect(ctx, bx, by, badgeW, badgeH, 6);
          ctx.fill();
          ctx.strokeStyle = '#C84B31';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          this.fillFittedText(ctx, lt.code, bx + badgeW / 2, by + 20, badgeW - 16, 12, '700', '"JetBrains Mono", monospace', 'center');
        }
        ctx.restore();
      });
    }
    ctx.restore();

    // Bottom 4-Stage Progress Bar inside Left Viewport
    const barY = vpY + vpH - 56;
    const stepLabels = ['📐 1. โครงเหล็ก 3D', '🛡️ 2. ฉนวนภายใน', '📋 3. แผ่นผนัง & MEP', '🏠 4. ผนังสำเร็จรูป'];
    const segW = (vpW - 36 - 24) / 4;
    for (let s = 0; s < 4; s++) {
      const sx = vpX + 18 + s * (segW + 8);
      const isCur = s === activeIdx;
      ctx.fillStyle = isCur ? '#C84B31' : '#F6F5F0';
      this.roundRect(ctx, sx, barY, segW, 40, 8);
      ctx.fill();
      ctx.strokeStyle = isCur ? '#C84B31' : 'rgba(27, 54, 93, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = isCur ? '#FFFFFF' : '#1B365D';
      this.fillFittedText(ctx, stepLabels[s], sx + segW / 2, barY + 26, segW - 12, 15.5, '700', '"Prompt", sans-serif', 'center');
    }
    ctx.restore();
  }

    // Right: 4 Process Cards with Architectural Cutaway Thumbnails
    const nodes = slide.nodes || [];
    const startX = box.x + box.w * 0.54;
    const cardW = box.w * 0.45;
    const cardH = 210;
    const gapY = 32;
    const totalCardsH = 4 * cardH + 3 * gapY;
    const startY = box.y + (box.h - totalCardsH) / 2;
    const cardThumbs = [
      this.illus && this.illus.steelFrame,
      this.illus && this.illus.explodedWall,
      this.illus && this.illus.wall3d,
      this.illus && this.illus.physWall
    ];

    nodes.slice(0, 4).forEach((nd, idx) => {
      const cardEnt = this.getBoxEntrance(animSec, 0.70 + idx * 0.40, 0.38);
      if (!cardEnt.visible) return;
      ctx.save();
      ctx.globalAlpha *= cardEnt.alpha;
      const cy = startY + idx * (cardH + gapY);
      const isAct = activeIdx === idx;
      const cMidX = startX + cardW / 2;
      const cMidY = cy + cardH / 2;
      ctx.translate(cMidX, cMidY + cardEnt.yOffset);
      ctx.scale(cardEnt.scale, cardEnt.scale);
      ctx.translate(-cMidX, -cMidY);

      this.drawJapaneseProcessCard(ctx, startX, cy, cardW, cardH, nd, idx, isAct, cardThumbs[idx]);
      if (idx < 3) {
        this.drawHandoffPipe(ctx, startX + cardW / 2, cy + cardH, startX + cardW / 2, cy + cardH + gapY, nowSec, true);
      }
      ctx.restore();
    });

    ctx.restore();
  }

  // ==================== SCENE 02: 4 DESIGN TOOLS + MULTI-RIBBON FUNNEL & MATCHED-ANGLE MORPH ====================
  drawDesignFunnelScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    const nodes = slide.nodes || [];
    const leftX = box.x + 10;
    const cardW = 390;
    const cardH = 205;
    const gapY = 34;
    const totalCardsH = 4 * cardH + 3 * gapY;
    const startY = box.y + (box.h - totalCardsH) / 2;

    // Progression driven by slide progress (animSec) - starts strictly at Stage 01 upon entrance!
    const stepDuration = Math.max(4.0, (slide.duration || 20) / 4);
    const phaseFloat = (animSec / stepDuration) % 4;
    const activePhase = Math.floor(phaseFloat);
    const prevPhase = (activePhase + 3) % 4;
    const localT = phaseFloat - activePhase;
    const wipeP = this.easeOutCubic(Math.min(1, localT * 1.85));

    const funY = box.y + box.h * 0.5;
    const streamColors = ['#B45309', '#C84B31', '#0284C7', '#2E6F56'];

    // Left: 4 Design Process Cards
    for (let i = 0; i < 4; i++) {
      const nd = nodes[i] || { code: `0${i + 1}`, label: `Design ${i + 1}`, sub: '', icon: 'draft' };
      const cy = startY + i * (cardH + gapY);
      const isAct = activePhase === i;
      const thumbImg = this.designStageImages && this.designStageImages[i];
      this.drawJapaneseProcessCard(ctx, leftX, cy, cardW, cardH, nd, i, isAct, thumbImg);
    }

    // Geometry of Japanese Architectural Convergence Gateway
    const hubW = 148;
    const hubH = 304;
    const hubX = box.x + 462;
    const hubY = funY - hubH / 2;

    // 1. Left 4 Input Conduits into Hub Ports (P1, P2, P3, P4)
    for (let i = 0; i < 4; i++) {
      const cy = startY + i * (cardH + gapY);
      const isAct = activePhase === i;
      const sx = leftX + cardW;
      const sy = cy + cardH / 2;
      const portX = hubX;
      const portY = hubY + 68 + i * 54;

      ctx.save();
      ctx.strokeStyle = isAct ? '#C84B31' : 'rgba(27, 54, 93, 0.32)';
      ctx.globalAlpha = isAct ? 1.0 : 0.45;
      ctx.lineWidth = isAct ? 5.0 : 2.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + 35, sy, portX - 35, portY, portX, portY);
      ctx.stroke();

      // Traveling Light Pulse along the Conduit
      const pt = ((nowSec * 1.1) + i * 0.25) % 1;
      const inv = 1 - pt;
      const c1x = sx + 35, c1y = sy, c2x = portX - 35, c2y = portY;
      const px = inv * inv * inv * sx + 3 * inv * inv * pt * c1x + 3 * inv * pt * pt * c2x + pt * pt * pt * portX;
      const py = inv * inv * inv * sy + 3 * inv * inv * pt * c1y + 3 * inv * pt * pt * c2y + pt * pt * pt * portY;
      ctx.fillStyle = isAct ? '#C84B31' : '#0284C7';
      ctx.beginPath();
      ctx.arc(px, py, isAct ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Central Japanese Convergence Hub Chamber (Clean Japanese Blueprint Architecture)
    ctx.save();
    // Chamber Shadow & Base
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, hubX, hubY, hubW, hubH, 14);
    ctx.fill();
    ctx.strokeStyle = '#1B365D';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner Blueprint Drafting Grid inside Chamber
    ctx.save();
    this.roundRect(ctx, hubX + 4, hubY + 4, hubW - 8, hubH - 8, 10);
    ctx.clip();
    ctx.strokeStyle = 'rgba(27, 54, 93, 0.06)';
    ctx.lineWidth = 1;
    for (let gx = hubX; gx <= hubX + hubW; gx += 14) {
      ctx.beginPath(); ctx.moveTo(gx, hubY); ctx.lineTo(gx, hubY + hubH); ctx.stroke();
    }
    for (let gy = hubY; gy <= hubY + hubH; gy += 14) {
      ctx.beginPath(); ctx.moveTo(hubX, gy); ctx.lineTo(hubX + hubW, gy); ctx.stroke();
    }
    ctx.restore();

    // Chamber Header Bar: Aizome Navy with Gold Accent
    ctx.fillStyle = '#1B365D';
    this.roundRect(ctx, hubX, hubY, hubW, 46, 12);
    ctx.fill();
    // Gold Accent Bar
    ctx.fillStyle = '#F59E0B';
    this.roundRect(ctx, hubX + 10, hubY + 8, 4, 30, 2);
    ctx.fill();
    ctx.fillStyle = '#FDE68A';
    this.fillFittedText(ctx, '統合ハブ • CONVERGENCE', hubX + 22, hubY + 22, hubW - 32, 10.5, '700', '"JetBrains Mono", monospace');
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, 'BIM / CAD SYNC', hubX + 22, hubY + 37, hubW - 32, 13, '700', '"Prompt", sans-serif');

    // 4 Precision Input Receiving Ports on the Left Edge
    for (let i = 0; i < 4; i++) {
      const portY = hubY + 68 + i * 54;
      const isAct = activePhase === i;

      // Port Socket
      ctx.fillStyle = isAct ? '#C84B31' : '#1B365D';
      this.roundRect(ctx, hubX - 5, portY - 11, 10, 22, 4);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pulsing LED indicator on active port
      if (isAct) {
        const pulse = 0.5 + 0.5 * Math.sin(nowSec * 6);
        ctx.strokeStyle = `rgba(200, 75, 49, ${0.4 + 0.5 * pulse})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(hubX, portY, 13 + 3 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Rotating Precision Vernier Core (Single Source Iris)
    const coreX = hubX + hubW / 2;
    const coreY = hubY + 150;
    const coreR = 48;

    // Outer Rotating Vernier Scale Ring
    ctx.save();
    ctx.translate(coreX, coreY);
    ctx.rotate(nowSec * 0.35);
    ctx.strokeStyle = 'rgba(27, 54, 93, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, coreR + 6, 0, Math.PI * 2);
    ctx.stroke();
    // 12 Vernier Graduation Ticks
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * (coreR + 4), Math.sin(ang) * (coreR + 4));
      ctx.lineTo(Math.cos(ang) * (coreR + 8), Math.sin(ang) * (coreR + 8));
      ctx.stroke();
    }
    ctx.restore();

    // Concentric Energy Pulse Ring
    const pulseRing = ((nowSec * 0.8) % 1);
    ctx.strokeStyle = `rgba(200, 75, 49, ${1 - pulseRing})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 20 + pulseRing * (coreR - 10), 0, Math.PI * 2);
    ctx.stroke();

    // Central Solid Core Disc (Navy Aizome)
    ctx.fillStyle = '#0F1E36';
    ctx.beginPath();
    ctx.arc(coreX, coreY, coreR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1B365D';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Center Core Typography
    ctx.fillStyle = '#FDE68A';
    this.fillFittedText(ctx, 'SINGLE', coreX, coreY - 18, coreR * 1.6, 12, '700', '"JetBrains Mono", monospace', 'center');
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, 'SOURCE', coreX, coreY - 4, coreR * 1.6, 12.5, '700', '"JetBrains Mono", monospace', 'center');
    ctx.fillStyle = '#38BDF8';
    this.fillFittedText(ctx, 'OF TRUTH', coreX, coreY + 11, coreR * 1.6, 11, '700', '"JetBrains Mono", monospace', 'center');

    // Bottom Chamber Status Footer Pill
    const footY = hubY + hubH - 34;
    ctx.fillStyle = '#F8FAFC';
    this.roundRect(ctx, hubX + 10, footY, hubW - 20, 26, 6);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Pulsing Green LED
    const greenPulse = 0.5 + 0.5 * Math.sin(nowSec * 5);
    ctx.fillStyle = `rgba(16, 185, 129, ${0.7 + 0.3 * greenPulse})`;
    ctx.beginPath();
    ctx.arc(hubX + 22, footY + 13, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#065F46';
    this.fillFittedText(ctx, 'SYNC 100% ชุดเดียว', hubX + 32, footY + 17, hubW - 46, 11, '700', '"Prompt", sans-serif');

    // Corner Architectural Registration Crosses
    const mCross = (cx, cy) => {
      ctx.strokeStyle = 'rgba(27, 54, 93, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy);
      ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5);
      ctx.stroke();
    };
    mCross(hubX + 6, hubY + 6);
    mCross(hubX + hubW - 6, hubY + 6);
    mCross(hubX + 6, hubY + hubH - 6);
    mCross(hubX + hubW - 6, hubY + hubH - 6);
    ctx.restore();

    // 3. Thick Precision Japanese Handoff Conduit from Hub directly into Construction Monitor Screen
    const simX = box.x + 675;
    const simH = box.h - 20;
    const simY = box.y + 10;
    const simW = box.w - 685;

    const conduitStartX = hubX + hubW;
    const conduitEndX = simX;
    const conduitMidY = funY;

    // Conduit Body (Dual Blueprint Rail)
    ctx.save();
    ctx.fillStyle = 'rgba(27, 54, 93, 0.08)';
    ctx.fillRect(conduitStartX, conduitMidY - 14, conduitEndX - conduitStartX, 28);

    ctx.strokeStyle = '#1B365D';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(conduitStartX, conduitMidY - 14); ctx.lineTo(conduitEndX, conduitMidY - 14);
    ctx.moveTo(conduitStartX, conduitMidY + 14); ctx.lineTo(conduitEndX, conduitMidY + 14);
    ctx.stroke();

    // Flowing Chevron Energy Stream (>>>)
    const chevOffset = (nowSec * 45) % 24;
    ctx.strokeStyle = 'rgba(200, 75, 49, 0.55)';
    ctx.lineWidth = 2.2;
    for (let cx = conduitStartX + chevOffset; cx < conduitEndX - 8; cx += 24) {
      ctx.beginPath();
      ctx.moveTo(cx - 5, conduitMidY - 8);
      ctx.lineTo(cx + 3, conduitMidY);
      ctx.lineTo(cx - 5, conduitMidY + 8);
      ctx.stroke();
    }

    // High-Speed Data Packet Shooting across Conduit
    const pipePkt = (nowSec * 1.5) % 1;
    const pktX = conduitStartX + pipePkt * (conduitEndX - conduitStartX);
    ctx.fillStyle = '#C84B31';
    ctx.beginPath();
    ctx.arc(pktX, conduitMidY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Floating High-Contrast Pill Badge on Top of the Conduit
    const badgeW = 200;
    const badgeH = 28;
    const badgeX = (conduitStartX + conduitEndX) / 2 - badgeW / 2;
    const badgeY = conduitMidY - 34;

    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
    ctx.fill();
    ctx.strokeStyle = '#C84B31';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = '#C84B31';
    this.fillFittedText(ctx, '⚡ สู่แบบก่อสร้างชุดเดียว ➔', badgeX + badgeW / 2, badgeY + 19, badgeW - 16, 12, '700', '"Prompt", sans-serif', 'center');
    ctx.restore();

    // 4. Right: MATCHED-ANGLE 4-STAGE ARCHITECTURAL TRANSFORMATION MONITOR
    ctx.fillStyle = '#0F1E36';
    this.roundRect(ctx, simX, simY, simW, simH, 16);
    ctx.fill();
    ctx.strokeStyle = '#1B365D';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Top Screen Header Bar with 4 Stage Pills
    ctx.fillStyle = '#1B365D';
    this.roundRect(ctx, simX, simY, simW, 54, 14);
    ctx.fill();

    const stageLabels = [
      '01 • DRAFT SKETCH',
      '02 • SKETCHUP 3D',
      '03 • AUTOCAD 2D',
      '04 • CONSTRUCTION DWG'
    ];
    const pillW = (simW - 40 - 30) / 4;
    for (let s = 0; s < 4; s++) {
      const px = simX + 20 + s * (pillW + 10);
      const py = simY + 10;
      const isCur = s === activePhase;
      ctx.fillStyle = isCur ? '#C84B31' : 'rgba(255, 255, 255, 0.1)';
      this.roundRect(ctx, px, py, pillW, 34, 7);
      ctx.fill();
      ctx.fillStyle = isCur ? '#FFFFFF' : '#CBD5E1';
      this.fillFittedText(ctx, stageLabels[s], px + pillW / 2, py + 22, pillW - 14, 13.5, '700', '"JetBrains Mono", monospace', 'center');
    }

    // Inner Viewport for the 4 Matched-Angle House Images
    const vpX = simX + 14;
    const vpY = simY + 64;
    const vpW = simW - 28;
    const vpH = simH - 78;

    ctx.save();
    this.roundRect(ctx, vpX, vpY, vpW, vpH, 10);
    ctx.clip();

    const curImg = this.designStageImages && this.designStageImages[activePhase];
    const prvImg = this.designStageImages && this.designStageImages[prevPhase];

    const drawStageImg = (img) => {
      if (!img || !img.complete || !img.naturalWidth) return;
      const scale = Math.max(vpW / img.naturalWidth, vpH / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = vpX + (vpW - dw) / 2;
      const dy = vpY + (vpH - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    if (wipeP < 1 && prvImg && prvImg.complete && prvImg.naturalWidth > 0) {
      drawStageImg(prvImg);
    }

    if (curImg && curImg.complete && curImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(vpX, vpY, vpW * wipeP, vpH);
      ctx.clip();
      drawStageImg(curImg);
      ctx.restore();
    }

    // Vertical Laser Wipe Bar between the 4 architectural representations
    if (wipeP > 0.01 && wipeP < 0.99) {
      const scanX = vpX + vpW * wipeP;
      const grad = ctx.createLinearGradient(scanX - 44, 0, scanX + 14, 0);
      grad.addColorStop(0, 'rgba(200, 75, 49, 0)');
      grad.addColorStop(0.72, 'rgba(200, 75, 49, 0.45)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(scanX - 44, vpY, 58, vpH);

      ctx.strokeStyle = '#C84B31';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(scanX, vpY);
      ctx.lineTo(scanX, vpY + vpH);
      ctx.stroke();
    }

    // Technical HUD overlay inside screen: Coordinates, Scale, Camera Lock
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    this.roundRect(ctx, vpX + 16, vpY + 16, 210, 32, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    this.fillFittedText(ctx, 'SCALE 1:100 • CAMERA LOCKED', vpX + 105, vpY + 28, 190, 11, '700', '"JetBrains Mono", monospace', 'center');

    // Floating Stage Badge at bottom inside viewport
    const stageDesc = [
      '01 DRAFT • ภาพสเก็ตช์มือ 2D คุยไอเดียกับลูกค้า (Client Concept Sketch)',
      '02 SKETCHUP • ขึ้นโมเดล 3D & เรนเดอร์โชว์ลูกค้า (3D Massing & Client Render)',
      '03 AUTOCAD • นำร่างเข้าระบบ จับระยะเสา-คานแม่นยำ (2D Precision Dimensioning)',
      '04 CONSTRUCTION DWG • แบบก่อสร้างมาตรฐานชุดเดียว (Unified Construction Set)'
    ];
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    this.roundRect(ctx, vpX + 18, vpY + vpH - 58, vpW - 36, 44, 8);
    ctx.fill();
    ctx.strokeStyle = '#C84B31';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, stageDesc[activePhase], vpX + 32, vpY + vpH - 30, vpW - 64, 16, '600', '"Prompt", sans-serif');

    ctx.restore();
    ctx.restore();
  }

  // ==================== PROCEDURAL SKETCHUP 3D EXTENSION & RUBY AUTO BOM SIMULATOR ====================
  drawSketchUpLiveSimulationStudio(ctx, x, y, w, h, animSec, nowSec) {
    ctx.save();
    // 1. Dark Blueprint Grid Background
    ctx.fillStyle = '#0B132B';
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fill();

    // Subtle Isometric CAD Grid Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
    ctx.lineWidth = 1;
    const gridStep = 28;
    ctx.beginPath();
    for (let gx = x; gx <= x + w; gx += gridStep) {
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
    }
    for (let gy = y; gy <= y + h; gy += gridStep) {
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
    }
    ctx.stroke();

    // 2. 3D Coordinate Axis Indicator at Bottom-Left (X=Red, Y=Green, Z=Blue)
    const axX = x + 36;
    const axY = y + h - 46;
    ctx.lineWidth = 2.4;
    // Z axis (Blue, up)
    ctx.strokeStyle = '#38BDF8';
    ctx.beginPath(); ctx.moveTo(axX, axY); ctx.lineTo(axX, axY - 26); ctx.stroke();
    // X axis (Red, right-down)
    ctx.strokeStyle = '#EF4444';
    ctx.beginPath(); ctx.moveTo(axX, axY); ctx.lineTo(axX + 24, axY + 14); ctx.stroke();
    // Y axis (Green, left-down)
    ctx.strokeStyle = '#22C55E';
    ctx.beginPath(); ctx.moveTo(axX, axY); ctx.lineTo(axX - 20, axY + 14); ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('Z', axX - 2, axY - 30);
    ctx.fillText('X', axX + 28, axY + 18);
    ctx.fillText('Y', axX - 30, axY + 18);

    // 3. 3D Isometric Wall & Stud Extrusion Simulation (occupies clean wide Left+Center space; Right reserved for 20X Console)
    const termReserve = Math.min(448, Math.max(388, Math.floor(w * 0.34))) + 22;
    const midSpan = Math.max(340, w - termReserve);
    const isoCenterX = x + midSpan * 0.50;
    const isoCenterY = y + h * 0.53;

    // Draw Floor Slab Base in Isometric
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.strokeStyle = '#0284C7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(isoCenterX - 240, isoCenterY + 70);
    ctx.lineTo(isoCenterX + 50, isoCenterY - 60);
    ctx.lineTo(isoCenterX + 260, isoCenterY + 20);
    ctx.lineTo(isoCenterX - 30, isoCenterY + 150);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Base Grid Dimension Lines on Floor
    ctx.strokeStyle = 'rgba(2, 132, 199, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(isoCenterX - 180, isoCenterY + 45);
    ctx.lineTo(isoCenterX + 110, isoCenterY - 85);
    ctx.moveTo(isoCenterX - 120, isoCenterY + 70);
    ctx.lineTo(isoCenterX + 170, isoCenterY - 60);
    ctx.stroke();

    // Procedural C-Stud C75 frames rising smoothly
    const studCount = 7;
    const maxWallH = Math.min(180, h * 0.44);
    const progressH = Math.min(1.0, animSec * 0.28);
    const curH = maxWallH * (0.25 + 0.75 * progressH);

    for (let i = 0; i < studCount; i++) {
      const sp = i / (studCount - 1);
      const sx = (isoCenterX - 200) + sp * 240;
      const sy = (isoCenterY + 60) - sp * 110;

      // Stud vertical C75 steel beam
      ctx.fillStyle = (i % 2 === 0) ? '#38BDF8' : '#60A5FA';
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 1.5;
      ctx.fillRect(sx - 4, sy - curH, 8, curH);
      ctx.strokeRect(sx - 4, sy - curH, 8, curH);

      // Top track connector beam
      if (i > 0) {
        const prevSp = (i - 1) / (studCount - 1);
        const psx = (isoCenterX - 200) + prevSp * 240;
        const psy = (isoCenterY + 60) - prevSp * 110;
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(psx, psy - curH);
        ctx.lineTo(sx, sy - curH);
        ctx.stroke();
      }
    }

    // SmartBoard Outer Panel (translucent green/cyan panel sliding into place)
    const panelSlide = Math.min(1.0, Math.max(0, (animSec - 2.5) * 0.45));
    if (panelSlide > 0.02) {
      ctx.save();
      ctx.globalAlpha = 0.50 * panelSlide;
      ctx.fillStyle = '#10B981';
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const pOff = (1 - panelSlide) * 70;
      ctx.moveTo(isoCenterX - 200 + pOff, isoCenterY + 60 - curH);
      ctx.lineTo(isoCenterX + 40 + pOff, isoCenterY - 50 - curH);
      ctx.lineTo(isoCenterX + 40 + pOff, isoCenterY - 50);
      ctx.lineTo(isoCenterX - 200 + pOff, isoCenterY + 60);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // CAD EE Punching Hole (Switch box cutout on wall)
    const punchPulse = 0.5 + 0.5 * Math.sin(nowSec * 8);
    const punchX = isoCenterX - 80;
    const punchY = isoCenterY + 15 - curH * 0.45;
    ctx.save();
    ctx.fillStyle = '#F59E0B';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.fillRect(punchX - 16, punchY - 12, 32, 24);
    ctx.strokeRect(punchX - 16, punchY - 12, 32, 24);

    // Holographic targeting reticle on the punch box
    ctx.strokeStyle = `rgba(245, 158, 11, ${0.4 + 0.6 * punchPulse})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(punchX, punchY, 24 + 4 * punchPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#FBBF24';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText('CAD EE PUNCH: BOX 40x80 @ H+300 mm', punchX + 34, punchY + 4);
    ctx.restore();

    // Laser Scan Horizontal Line (Ruby Auto-BOM Scanner across Left+Center 3D viewport)
    const scanLineY = y + 45 + ((animSec * 60) % (h - 90));
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x + 24, scanLineY);
    ctx.lineTo(x + midSpan - 12, scanLineY);
    ctx.stroke();

    ctx.restore();
  }

  // ==================== SCENE 03: BOQ 3D ARCHITECTURAL HOUSE WALL MODEL & DYNAMIC VDO RUN ====================
  drawBoqSkuExtrusionScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();

    // 1. TIMING & ENTRANCE SEQUENCING
    // Phase 1 (0.0s - 3.5s): Full Stage Architectural Blueprint ("เปิดมา หน้าเต็ม ก่อน")
    // Phase 2 (3.5s - 4.7s): Smooth Shrink to Left Compact Width ("แล้ว ย่อ กลับมาเล็ก เหมือนเดิม")
    // Phase 3 (4.5s - 10.0s): Center VDO Monitor Rises & Powers On (Runs alone without right buttons)
    // Phase 4 (10.0s+): "หลัง VDO" - Right 4 Royal Blue Buttons & Clean Pipes Fade In ("ซ่อนตรงนี้ โชว์ หลังจาก หลัง VOD เลยครับ")
    const openDuration = 3.2;
    const shrinkDuration = 0.8;

    let shrinkP = 0;
    if (animSec >= openDuration) {
      const t = Math.min(1.0, (animSec - openDuration) / shrinkDuration);
      shrinkP = t * t * (3 - 2 * t);
    }

    let vdoEntranceP = 0;
    if (animSec >= openDuration) {
      const t = Math.min(1.0, (animSec - openDuration) / 0.75);
      vdoEntranceP = t * t * (3 - 2 * t);
    }

    // 4 Right Buttons entrance: MUST BE HIDDEN until AFTER VDO ("ซ่อนตรงนี้ โชว์ หลังจาก หลัง VOD เลยครับ")
    const btnDelay = 10.0;
    let btnEntranceP = 0;
    if (animSec >= btnDelay) {
      const t = Math.min(1.0, (animSec - btnDelay) / 0.8);
      btnEntranceP = t * t * (3 - 2 * t);
    }

    let activeStep = 0;
    if (animSec < openDuration) activeStep = 0; // 01 OTF Input (Full Screen CAD)
    else if (animSec < 4.0) activeStep = 1; // 02 Database & Rules (Shrink & VDO Enter)
    else if (animSec < btnDelay) activeStep = 2; // 03 Auto BOM & Drawing (VDO running)
    else activeStep = 3; // 04 Single Model & Continuous Plugin Demo

    // 2. TOP STEP PILLS (4 STEPS ACROSS FULL STAGE WIDTH)
    const topY = box.y + 10;
    const pillH = 72;
    const nodes = slide.nodes || [];
    const count = 4;
    const pillGap = 20;
    const pillW = (box.w - 20 - pillGap * (count - 1)) / count;
    for (let i = 0; i < count; i++) {
      const nd = nodes[i] || { code: `0${i + 1}`, label: '', sub: '' };
      const px = box.x + 10 + i * (pillW + pillGap);
      this.drawCompactStepPill(ctx, px, topY, pillW, pillH, nd, i, i === activeStep);
      if (i < count - 1) {
        this.drawHandoffPipe(ctx, px + pillW, topY + pillH / 2, px + pillW + pillGap, topY + pillH / 2, nowSec);
      }
    }

    // 3. MAIN BODY SECTION (BELOW PILLS)
    const contentY = topY + pillH + 16;
    const contentH = box.h - pillH - 26;
    const availW = box.w - 20;

    // Layout configuration: Left OTF Box aligned flush to [01] OTF Input pill; Center VDO expanded full width to right edge
    const compactW = Math.round(pillW);

    // Left Viewport Width: Starts Full Screen (availW), then smoothly shrinks down to exact [01] OTF Input pill width
    const leftX = box.x + 10;
    const leftY = contentY;
    const leftW = Math.round(availW - (availW - compactW) * shrinkP);
    const leftH = contentH;

    // Center VDO Monitor coordinates (Expanded full-width across remaining stage)
    const vdoX = leftX + compactW + 16;
    const vdoRight = leftX + availW;
    const vdoW = Math.max(100, vdoRight - vdoX);
    const vdoY = contentY;
    const vdoH = contentH;

    // 4. DRAW LEFT VIEWPORT ("รูปด้านซ้าย ปรับให้เล็กลง")
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, leftX, leftY, leftW, leftH, 14);
    ctx.fill();
    ctx.strokeStyle = '#1B365D';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.save();
    this.roundRect(ctx, leftX + 4, leftY + 4, leftW - 8, leftH - 8, 10);
    ctx.clip();

    // Top HUD inside Left Viewport
    const hudW = leftW - 28;
    const hudH = 34;
    const hudX = leftX + 14;
    const hudY = leftY + 12;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    this.roundRect(ctx, hudX, hudY, hudW, hudH, 6);
    ctx.fill();
    ctx.strokeStyle = '#C84B31';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    const dotPulse = 0.5 + 0.5 * Math.sin(nowSec * 5);
    ctx.fillStyle = `rgba(16, 185, 129, ${0.6 + 0.4 * dotPulse})`;
    ctx.beginPath();
    ctx.arc(hudX + 16, hudY + 17, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    const hudTitle = 'OTF (FORCON.) ARCHITECTURAL FLOORPLAN: ผังแปลนสถาปัตย์ & กฎการวางตำแหน่งผนัง (P-RULE 1..19)';
    this.fillFittedText(
      ctx,
      hudTitle,
      hudX + 30,
      hudY + 22,
      hudW - 42,
      13,
      '700',
      '"Prompt", sans-serif'
    );

    // 3D Model / Floorplan Image Area
    const wallImg = this.boq3dWallImg;
    let imgAreaX = leftX + 14;
    let imgAreaY = hudY + hudH + 10;
    let imgAreaW = leftW - 28;
    const fullImgH = leftH - 70;
    const compactImgH = 390;
    let imgAreaH = Math.round(fullImgH - (fullImgH - compactImgH) * shrinkP);

    let imgX = imgAreaX;
    let imgY = imgAreaY;
    let imgW = imgAreaW;
    let imgH = imgAreaH;

    if (wallImg && wallImg.complete && wallImg.naturalWidth > 0) {
      const scale = Math.min(imgAreaW / wallImg.naturalWidth, imgAreaH / wallImg.naturalHeight);
      imgW = wallImg.naturalWidth * scale;
      imgH = wallImg.naturalHeight * scale;
      imgX = imgAreaX + (imgAreaW - imgW) / 2;
      imgY = imgAreaY + (imgAreaH - imgH) / 2;
      ctx.drawImage(wallImg, imgX, imgY, imgW, imgH);
    }

    // Laser scan line
    const scanP = (nowSec * 0.28) % 1;
    const scanY = imgY + imgH * (0.12 + 0.76 * scanP);
    const scanGrad = ctx.createLinearGradient(0, scanY - 24, 0, scanY + 6);
    scanGrad.addColorStop(0, 'rgba(200, 75, 49, 0)');
    scanGrad.addColorStop(0.8, 'rgba(200, 75, 49, 0.22)');
    scanGrad.addColorStop(1, 'rgba(200, 75, 49, 0.7)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(imgX, scanY - 24, imgW, 30);

    ctx.strokeStyle = 'rgba(200, 75, 49, 0.9)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(imgX + 10, scanY);
    ctx.lineTo(imgX + imgW - 10, scanY);
    ctx.stroke();

    // 3 Process Callout Definitions for OTF Floorplan & Rules
    const skuDefs = [
      {
        code: 'OTF & PLANING RULE',
        desc: 'ผังแปลนสถาปัตย์ & กฎ P-Rule 1..19',
        spec: 'ระบุตำแหน่งเสา ผนัง และห้อง ①..⑭ แม่นยำ',
        ptX: imgX + imgW * 0.32,
        ptY: imgY + imgH * 0.44,
        img: this.illus && this.illus.sku1
      },
      {
        code: 'CODING RULE & MIM/IM',
        desc: 'จับคู่รหัสฐานข้อมูล MIM, IM',
        spec: 'ขึ้นโครง C75 & แผ่นผนังตามมาตรฐานโรงงาน',
        ptX: imgX + imgW * 0.52,
        ptY: imgY + imgH * 0.36,
        img: this.illus && this.illus.sku2
      },
      {
        code: 'AUTO BOM & DRAWING',
        desc: 'เจนเนอเรทโมเดลและถอดปริมาณใน 4 ช.ม.',
        spec: 'ยุบรวมขั้นตอน ①+②+③ = ① ใน SketchUp',
        ptX: imgX + imgW * 0.74,
        ptY: imgY + imgH * 0.54,
        img: this.illus && this.illus.sku3
      }
    ];

    const activeSku = Math.floor((nowSec * 0.75) % 3);

    // A. WIDE FLOATING CALLOUTS (Active when Full Screen / early shrink: shrinkP < 0.70)
    if (shrinkP < 0.70) {
      ctx.save();
      const wideAlpha = Math.min(1.0, (0.70 - shrinkP) / 0.30);
      ctx.globalAlpha = wideAlpha;

      const callW = Math.min(320, Math.max(220, leftW * 0.25));
      const callH = 84;
      const calloutBoxes = [
        { boxX: leftX + 32, boxY: leftY + 68 },
        { boxX: leftX + (leftW - callW) * 0.52, boxY: leftY + 60 },
        { boxX: leftX + leftW - callW - 32, boxY: leftY + leftH - callH - 28 }
      ];

      skuDefs.forEach((sp, idx) => {
        const isCur = idx === activeSku;
        const pulseR = (isCur ? 18 : 13) + 5 * Math.sin(nowSec * 4.5 + idx * 1.5);
        const b = calloutBoxes[idx];
        const targetBoxX = b.boxX + callW * 0.4;
        const targetBoxY = b.boxY + callH * 0.5;

        // Leader line
        ctx.save();
        ctx.strokeStyle = isCur ? '#C84B31' : '#1B365D';
        ctx.lineWidth = isCur ? 2.6 : 2;
        ctx.beginPath();
        ctx.moveTo(sp.ptX, sp.ptY);
        ctx.lineTo(targetBoxX, targetBoxY);
        ctx.stroke();
        ctx.restore();

        // Rotating CAD Reticle
        ctx.save();
        ctx.translate(sp.ptX, sp.ptY);
        ctx.rotate(nowSec * (idx % 2 === 0 ? 1.4 : -1.4));
        ctx.fillStyle = isCur ? 'rgba(200, 75, 49, 0.25)' : 'rgba(27, 54, 93, 0.16)';
        ctx.strokeStyle = isCur ? '#C84B31' : '#1B365D';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-pulseR - 4, 0); ctx.lineTo(-pulseR + 5, 0);
        ctx.moveTo(pulseR - 5, 0); ctx.lineTo(pulseR + 4, 0);
        ctx.moveTo(0, -pulseR - 4); ctx.lineTo(0, -pulseR + 5);
        ctx.moveTo(0, pulseR - 5); ctx.lineTo(0, pulseR + 4);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#C84B31';
        ctx.beginPath();
        ctx.arc(sp.ptX, sp.ptY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Callout Card
        ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
        this.roundRect(ctx, b.boxX, b.boxY, callW, callH, 10);
        ctx.fill();
        ctx.strokeStyle = isCur ? '#C84B31' : '#1B365D';
        ctx.lineWidth = isCur ? 2.6 : 1.8;
        ctx.stroke();

        const thumbS = callH - 14;
        const thumbX = b.boxX + 7;
        const thumbY = b.boxY + 7;
        const thBg = idx === 0 ? '#165B50' : (idx === 1 ? '#D97706' : '#C84B31');
        ctx.fillStyle = thBg;
        this.roundRect(ctx, thumbX, thumbY, thumbS, thumbS, 7);
        ctx.fill();

        const skuIcon = idx === 0 ? 'frame3d' : (idx === 1 ? 'insulation' : 'punch');
        this.drawSolidColorIcon(ctx, skuIcon, thumbX + thumbS / 2, thumbY + thumbS / 2, thumbS - 2, '#FFFFFF', true);

        const tx = thumbX + thumbS + 10;
        const maxTW = Math.max(80, callW - thumbS - 24);
        ctx.fillStyle = '#C84B31';
        this.fillFittedText(ctx, `SKU: ${sp.code}`, tx, b.boxY + 26, maxTW, 17.5, '700', '"JetBrains Mono", monospace');
        ctx.fillStyle = '#1E293B';
        this.fillFittedText(ctx, sp.desc, tx, b.boxY + 49, maxTW, 15, '600', '"Prompt", sans-serif');
        ctx.fillStyle = '#2E6F56';
        this.fillFittedText(ctx, sp.spec, tx, b.boxY + 71, maxTW, 13, '700', '"JetBrains Mono", monospace');
      });
      ctx.restore();
    }

    // B. COMPACT STACKED SKU CARDS (Active when Shrinking towards compact: shrinkP > 0.40)
    if (shrinkP > 0.40) {
      ctx.save();
      const compactAlpha = Math.min(1.0, (shrinkP - 0.40) / 0.30);
      ctx.globalAlpha = compactAlpha;

      const cardsStartY = imgAreaY + imgAreaH + 12;
      const cardGap = 10;
      const cardH = Math.min(108, Math.floor((leftH - (cardsStartY - leftY) - 16 - cardGap * 2) / 3));
      const cardW = leftW - 28;

      skuDefs.forEach((sp, idx) => {
        const isCur = idx === activeSku;
        const cy = cardsStartY + idx * (cardH + cardGap);
        const cx = leftX + 14;

        // Card Container
        ctx.fillStyle = isCur ? '#F8FAFC' : '#FFFFFF';
        this.roundRect(ctx, cx, cy, cardW, cardH, 8);
        ctx.fill();
        ctx.strokeStyle = isCur ? '#C84B31' : '#CBD5E1';
        ctx.lineWidth = isCur ? 2.2 : 1.4;
        ctx.stroke();

        // Thumbnail Icon Box
        const thS = cardH - 14;
        const thX = cx + 8;
        const thY = cy + 7;
        const thBg = idx === 0 ? '#165B50' : (idx === 1 ? '#D97706' : '#C84B31');
        ctx.fillStyle = thBg;
        this.roundRect(ctx, thX, thY, thS, thS, 8);
        ctx.fill();

        const skuIcon = idx === 0 ? 'frame3d' : (idx === 1 ? 'insulation' : 'punch');
        this.drawSolidColorIcon(ctx, skuIcon, thX + thS / 2, thY + thS / 2, thS - 2, '#FFFFFF', true);

        // Text
        const tx = thX + thS + 10;
        const maxTW = cardW - thS - 24;
        ctx.fillStyle = isCur ? '#C84B31' : '#1B365D';
        this.fillFittedText(ctx, `SKU: ${sp.code}`, tx, cy + 25, maxTW, 17, '700', '"JetBrains Mono", monospace');
        ctx.fillStyle = '#1E293B';
        this.fillFittedText(ctx, sp.desc, tx, cy + 48, maxTW, 14.5, '600', '"Prompt", sans-serif');
        ctx.fillStyle = '#2E6F56';
        this.fillFittedText(ctx, sp.spec, tx, cy + 70, maxTW, 13, '700', '"JetBrains Mono", monospace');

        // Reticle on 3D Model
        if (isCur) {
          ctx.save();
          ctx.translate(sp.ptX, sp.ptY);
          ctx.rotate(nowSec * 1.5);
          ctx.strokeStyle = '#C84B31';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-18, 0); ctx.lineTo(-11, 0);
          ctx.moveTo(11, 0); ctx.lineTo(18, 0);
          ctx.moveTo(0, -18); ctx.lineTo(0, -11);
          ctx.moveTo(0, 11); ctx.lineTo(0, 18);
          ctx.stroke();
          ctx.restore();

          // Reticle center dot
          ctx.fillStyle = '#C84B31';
          ctx.beginPath();
          ctx.arc(sp.ptX, sp.ptY, 4, 0, Math.PI * 2);
          ctx.fill();

          // Leader Line to Card
          ctx.save();
          ctx.strokeStyle = 'rgba(200, 75, 49, 0.6)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(sp.ptX, sp.ptY);
          ctx.lineTo(cx + cardW, cy + cardH / 2);
          ctx.stroke();
          ctx.restore();
        }
      });
      ctx.restore();
    }

    ctx.restore();
    ctx.restore();

    // 5. VIDEO PLAYBACK SYNCHRONIZATION (Supports sequential playlist: Run IW Plugin ➔ Run EE Plugin)
    const vdoDelay = 4.0;
    const vdoP = vdoEntranceP;
    const playlist = (Array.isArray(slide.videoPlaylist) && slide.videoPlaylist.length > 0 && slide.vdoLayout !== 'vector-only')
      ? slide.videoPlaylist
      : (slide.videoSrc && slide.vdoLayout !== 'vector-only'
          ? [{ src: slide.videoSrc, title: slide.vdoPrompt || 'Plugin Video', short: 'Plugin', fallbackDuration: 60 }]
          : []);

    const clipVids = playlist.map((item) => this.getOrCreateVideo(item.src));
    const clipDurs = clipVids.map((v, idx) => (v && !isNaN(v.duration) && v.duration > 0) ? v.duration : (playlist[idx].fallbackDuration || 35));
    const totalPlaylistDur = clipDurs.reduce((acc, d) => acc + d, 0);

    const rate = Math.max(0.25, Math.min(4.0, Number(slide.videoRate) || 1.0));
    const rawVdoElapsed = (Number(slide.videoStart) || 0) + Math.max(0, animSec - vdoDelay) * rate;
    const seqElapsed = totalPlaylistDur > 0 ? (rawVdoElapsed % totalPlaylistDur) : 0;

    let activeIdx = 0;
    let clipStartSec = 0;
    let localTime = seqElapsed;
    for (let pi = 0; pi < clipDurs.length; pi++) {
      if (seqElapsed < clipStartSec + clipDurs[pi] || pi === clipDurs.length - 1) {
        activeIdx = pi;
        localTime = Math.max(0, Math.min(clipDurs[pi] - 0.05, seqElapsed - clipStartSec));
        break;
      }
      clipStartSec += clipDurs[pi];
    }

    const vid = clipVids[activeIdx] || null;
    if (clipVids.length > 0) {
      clipVids.forEach((v, idx) => {
        if (!v) return;
        if (idx !== activeIdx || animSec < vdoDelay || !this.isPlaying) {
          if (!v.paused) {
            try { v.pause(); } catch (e) {}
          }
        }
      });

      if (vid) {
        try {
          vid.loop = clipVids.length === 1;
          vid.playbackRate = rate;
        } catch (e) {
          try { vid.playbackRate = 1.0; } catch (e2) {}
        }

        if (animSec >= vdoDelay && this.isPlaying) {
          if (vid.paused) {
            try { vid.play().catch(() => {}); } catch (e) {}
          }
          if (!isNaN(vid.duration) && vid.duration > 0 && Math.abs(vid.currentTime - localTime) > 0.65) {
            try { vid.currentTime = localTime; } catch (e) {}
          }
        } else if (animSec >= vdoDelay && vid.readyState >= 1) {
          if (!isNaN(vid.duration) && vid.duration > 0 && Math.abs(vid.currentTime - localTime) > 0.2) {
            try { vid.currentTime = localTime; } catch (e) {}
          }
        }
      }
    }

    // 6. DRAW RIGHT VDO MONITOR ("เล่นไปสักพัก ให้ จอ รัน VDO ให้ขึ้น")
    this._step2VdoClipHits = [];
    this.vdoMonitorRect = null;
    if (vdoP > 0.001 && vdoW > 100) {
      ctx.save();
      const yRiseOffset = (1 - vdoP) * 140;
      ctx.globalAlpha = vdoP;

      // Monitor Outer Frame
      ctx.fillStyle = '#0F172A';
      this.roundRect(ctx, vdoX, vdoY + yRiseOffset, vdoW, vdoH, 14);
      ctx.fill();
      ctx.strokeStyle = '#1B365D';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Top Monitor Header (Height 50px)
      const topH = 50;
      ctx.fillStyle = '#1E293B';
      this.roundRect(ctx, vdoX, vdoY + yRiseOffset, vdoW, topH, 12);
      ctx.fill();

      // Live Pulse Dot
      const redDotPulse = 0.5 + 0.5 * Math.sin(nowSec * 6);
      const isPureVector = (slide.vdoLayout === 'vector-only' || playlist.length === 0);
      ctx.fillStyle = isPureVector ? `rgba(16, 185, 129, ${0.7 + 0.3 * redDotPulse})` : `rgba(239, 68, 68, ${0.7 + 0.3 * redDotPulse})`;
      ctx.beginPath();
      ctx.arc(vdoX + 26, vdoY + yRiseOffset + 25, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Clickable Header Pills for Sequential Playlist (Run IW Plugin ➔ Run EE Plugin)
      let pillsRightBound = vdoX + vdoW - 180;
      if (playlist.length > 1) {
        const chipW = 192;
        const chipGap = 10;
        const badgeReserve = 166;
        const totalChipsW = playlist.length * chipW + (playlist.length - 1) * chipGap;
        let chipX = vdoX + vdoW - badgeReserve - totalChipsW - 14;
        pillsRightBound = chipX - 16;

        let accStart = 0;
        playlist.forEach((item, idx) => {
          const isCurClip = idx === activeIdx;
          const chipY = vdoY + yRiseOffset + 10;
          const chipH = 30;
          const pillCol = idx === 0 ? '#10B981' : '#F59E0B';
          ctx.fillStyle = isCurClip ? pillCol : 'rgba(255, 255, 255, 0.08)';
          this.roundRect(ctx, chipX, chipY, chipW, chipH, 15);
          ctx.fill();
          ctx.strokeStyle = isCurClip ? pillCol : 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = isCurClip ? 1.5 : 1;
          ctx.stroke();

          ctx.fillStyle = isCurClip ? '#0F172A' : '#CBD5E1';
          const chipLabel = `${idx + 1} · ${item.short || item.title} (${this.formatTime(clipDurs[idx])})`;
          this.fillFittedText(ctx, chipLabel, chipX + chipW / 2, chipY + 20, chipW - 16, 13.5, '800', '"Prompt", sans-serif', 'center');

          this._step2VdoClipHits.push({
            x: chipX, y: chipY, w: chipW, h: chipH,
            clipIdx: idx, clipStartSec: accStart, stepDelaySec: vdoDelay
          });
          accStart += clipDurs[idx];
          chipX += chipW + chipGap;
        });
      }

      // Monitor Title
      ctx.fillStyle = '#FFFFFF';
      const activeClipTitle = playlist[activeIdx] ? `VDO ${activeIdx + 1}/${playlist.length} · ${playlist[activeIdx].title}` : '';
      const vdoTitle = isPureVector
        ? (slide.vdoPrompt || '✨ SketchUp Live Studio: รัน Auto BOM & Extrusion 3D อัตโนมัติ (Fix ≤ 2 นาที)')
        : (activeClipTitle || slide.vdoPrompt || '🎬 VDO รัน Plugin SketchUp Auto จริง');
      this.fillFittedText(ctx, vdoTitle, vdoX + 44, vdoY + yRiseOffset + 31, Math.max(180, pillsRightBound - (vdoX + 44)), 17.5, '700', '"Prompt", sans-serif');

      // Right Live Badge
      ctx.fillStyle = isPureVector ? '#059669' : '#22C55E';
      this.roundRect(ctx, vdoX + vdoW - 166, vdoY + yRiseOffset + 12, 152, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, isPureVector ? '● AUTO SIMULATION' : '● LIVE RECORDING', vdoX + vdoW - 90, vdoY + yRiseOffset + 30, 142, 13, '800', '"JetBrains Mono", monospace', 'center');

      // Video Viewport (Clipped)
      const vidBoxX = vdoX + 6;
      const vidBoxY = vdoY + yRiseOffset + topH + 4;
      const vidBoxW = vdoW - 12;
      const vidBoxH = vdoH - topH - 10;
      const hudBarH = 42;
      const vidFrameH = Math.max(100, vidBoxH - hudBarH);

      ctx.save();
      this.roundRect(ctx, vidBoxX, vidBoxY, vidBoxW, vidBoxH, 10);
      ctx.clip();

      const codeColW = Math.min(436, Math.max(388, Math.floor(vidBoxW * 0.32)));
      const codeWindowSec = 10.0;
      const codeWipeSec = 0.75;
      const codeExpandP = (!isPureVector && playlist.length > 0)
        ? this.easeOutCubic(Math.min(1, Math.max(0, (seqElapsed - codeWindowSec) / codeWipeSec)))
        : 0;
      const baseVidW = Math.max(420, vidBoxW - codeColW - 22);
      const vidFrameW = Math.round(baseVidW + (vidBoxW - baseVidW) * codeExpandP);

      ctx.fillStyle = '#090F1E';
      ctx.fillRect(vidBoxX, vidBoxY, vidBoxW, vidFrameH);

      const canDrawVideo = !isPureVector && vid && (
        vid.readyState >= 2 ||
        (vid.readyState >= 1 && vid.videoWidth > 0) ||
        (vid.currentTime > 0)
      );

      if (canDrawVideo) {
        this.drawMediaContain(ctx, vid, vid.videoWidth || 1280, vid.videoHeight || 720, vidBoxX + 4, vidBoxY + 4, vidFrameW - 8, vidFrameH - 8);
      } else if (!isPureVector) {
        // Loading indicator while real MP4 initializes/buffers
        ctx.fillStyle = '#94A3B8';
        this.fillFittedText(ctx, `⏳ กำลังเตรียมวิดีโอ ${playlist[activeIdx] ? playlist[activeIdx].title : ''}...`, vidBoxX + vidFrameW / 2, vidBoxY + vidFrameH / 2, vidFrameW - 48, 20, '700', '"Prompt", sans-serif', 'center');
      } else {
        // Pure Procedural Vector Fallback
        this.drawSketchUpLiveSimulationStudio(ctx, vidBoxX, vidBoxY, vidFrameW, vidFrameH, animSec, nowSec);
      }

      // Run Clean White 30X Ruby Code Console for 10.0s, then fade & hand full monitor width to the VDO
      if (codeExpandP < 0.995) {
        ctx.save();
        ctx.globalAlpha *= (1 - codeExpandP);
        const isStreamActive = this.isPlaying && (!vid || !vid.paused);
        this.drawLiveCodeTerminalStreamer(ctx, vidBoxX + Math.round(codeExpandP * 56), vidBoxY, vidBoxW, vidFrameH, seqElapsed, codeWindowSec, nowSec, isStreamActive);
        ctx.restore();
      }

      // Save VDO monitor screen hit rect (below header tabs, inside video area) for direct click-to-play
      this.vdoMonitorRect = { x: vidBoxX, y: vidBoxY, w: vidBoxW, h: vidBoxH };

      // Bottom Dual-Segment Video HUD Scrubber & Sequence Readout
      const hudBarY = vidBoxY + vidBoxH - hudBarH;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.fillRect(vidBoxX, hudBarY, vidBoxW, hudBarH);

      const curLocalStr = this.formatTime(localTime);
      const curClipTotStr = this.formatTime(clipDurs[activeIdx] || 0);
      const seqCurStr = this.formatTime(seqElapsed);
      const seqTotStr = this.formatTime(totalPlaylistDur || 120);
      const nextHint = (playlist.length > 1 && activeIdx === 0) ? `  •  ถัดไป: ${playlist[1].short}` : (playlist.length > 1 ? '  •  ครบชุด 2 ปลั๊กอิน' : '');

      ctx.fillStyle = '#F8FAFC';
      this.fillFittedText(
        ctx,
        `▶ ${playlist[activeIdx] ? playlist[activeIdx].title : 'Plugin Demo'} (${curLocalStr} / ${curClipTotStr})  •  รวม ${seqCurStr} / ${seqTotStr}${nextHint}`,
        vidBoxX + 16,
        hudBarY + 21,
        vidBoxW - 220,
        15,
        '700',
        '"Prompt", sans-serif'
      );

      ctx.fillStyle = '#94A3B8';
      this.fillFittedText(
        ctx,
        this.isPlaying ? 'คลิกหน้าจอเพื่อหยุดชั่วคราว' : 'คลิกหน้าจอเพื่อเล่นวิดีโอ',
        vidBoxX + vidBoxW - 16,
        hudBarY + 21,
        190,
        13.5,
        '600',
        '"Prompt", sans-serif',
        'right'
      );

      // Segmented Progress Line Track (Shows Clip 1 -> Clip 2 split clearly)
      const barX = vidBoxX + 16;
      const barW = vidBoxW - 32;
      const barY = hudBarY + 31;
      const barH = 5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(barX, barY, barW, barH);

      if (playlist.length > 1 && totalPlaylistDur > 0) {
        let segAcc = 0;
        let xCursor = barX;
        playlist.forEach((_, si) => {
          const segW = Math.max(4, barW * (clipDurs[si] / totalPlaylistDur) - (si < playlist.length - 1 ? 3 : 0));
          const segCol = si === 0 ? '#10B981' : '#F59E0B';
          let fillFrac = 0;
          if (seqElapsed >= segAcc + clipDurs[si]) fillFrac = 1;
          else if (seqElapsed > segAcc) fillFrac = (seqElapsed - segAcc) / (clipDurs[si] || 1);
          if (fillFrac > 0) {
            ctx.fillStyle = segCol;
            ctx.fillRect(xCursor, barY, segW * fillFrac, barH);
          }
          // Divider tick at boundary
          if (si < playlist.length - 1) {
            ctx.fillStyle = '#0F172A';
            ctx.fillRect(xCursor + segW, barY - 1, 3, barH + 2);
          }
          segAcc += clipDurs[si];
          xCursor += segW + 3;
        });
      } else {
        const progP = (totalPlaylistDur > 0) ? Math.min(1.0, seqElapsed / totalPlaylistDur) : 0;
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(barX, barY, barW * progP, barH);
      }

      ctx.restore();
      ctx.restore();
    }

    // Right 4 Parallel Branch boxes (PartItems, Job Order, SB List, 2D & 3D) omitted here
    // per user request so Center VDO Monitor expands large and clean.
    this.rightBranchButtons = [];

    // 8. FLOATING DOCUMENT PREVIEW MODAL (Fallback if triggered)
    if (this.activeDocPreview && this.factoryDocs) {
      this.drawDocumentPreviewModal(ctx, box, contentY, contentH);
    }

    ctx.restore();
  }

  // ==================== RIGHT LIVE 30X CLEAN WHITE RUBY CODE CONSOLE STREAMER ====================
  drawLiveCodeTerminalStreamer(ctx, x, y, maxW, maxH, vdoElapsed, vdoTotalSec, nowSec, isRunning = true) {
    const codeW = Math.min(436, Math.max(388, Math.floor(maxW * 0.32)));
    const codeH = Math.max(200, maxH - 20);
    const termX = x + maxW - codeW - 10;
    const termY = y + 10;

    const startSec = 0.0;
    const endSec = (vdoTotalSec > 0 && vdoTotalSec <= 15.0) ? vdoTotalSec : 10.0;
    const runWindow = Math.max(1.0, endSec - startSec);
    const speedMultiplier = 30.0;
    const endTimeStr = this.formatTime(endSec);

    const phase = vdoElapsed < startSec ? 'waiting' : (vdoElapsed >= endSec ? 'done' : 'running');
    const clampedRunElapsed = Math.min(runWindow, Math.max(0, vdoElapsed - startSec));
    const windowProg = (phase === 'waiting') ? 0 : (phase === 'done' ? 1 : (clampedRunElapsed / runWindow));

    ctx.save();

    // 1. Clean White Console Backdrop + Subtle Emerald/Slate Accent Border
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, termX, termY, codeW, codeH, 10);
    ctx.fill();
    ctx.strokeStyle = phase === 'running' ? '#10B981' : '#CBD5E1';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 2. Terminal Header Bar (Clean White/Slate Top Chrome, Height: 36px)
    const headH = 36;
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(termX, termY, codeW, headH, [10, 10, 0, 0]);
    else ctx.rect(termX, termY, codeW, headH);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(termX, termY + headH);
    ctx.lineTo(termX + codeW, termY + headH);
    ctx.stroke();

    // 3 Mac-style window dots
    const dotY = termY + 18;
    [
      { c: '#EF4444', x: termX + 16 },
      { c: '#F59E0B', x: termX + 30 },
      { c: '#10B981', x: termX + 44 }
    ].forEach(d => {
      ctx.fillStyle = d.c;
      ctx.beginPath();
      ctx.arc(d.x, dotY, 4.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Console Title (fitted cleanly clear of top-right status badge)
    ctx.fillStyle = '#0F172A';
    this.fillFittedText(ctx, 'Ruby Engine · QHeim_AutoBOM.rb', termX + 56, termY + 23, Math.max(80, codeW - 196), 13.5, '800', '"JetBrains Mono", monospace');

    // Top-Right Status Badge: WAIT 00:02 / RUNNING 30X / DONE
    const badgeW = 124;
    const badgeH = 22;
    const badgeX = termX + codeW - badgeW - 10;
    const badgeY = termY + 7;

    const badgeFill = phase === 'running'
      ? '#ECFDF5'
      : (phase === 'done' ? '#D1FAE5' : '#FEF3C7');
    ctx.fillStyle = badgeFill;
    this.roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 5);
    ctx.fill();
    ctx.strokeStyle = phase === 'waiting' ? '#F59E0B88' : '#10B98188';
    ctx.lineWidth = 1;
    ctx.stroke();

    const dotPulse = phase === 'running' ? (0.45 + 0.55 * Math.sin(nowSec * 14)) : 1.0;
    ctx.fillStyle = phase === 'waiting'
      ? '#D97706'
      : `rgba(5, 150, 105, ${dotPulse})`;
    ctx.beginPath();
    ctx.arc(badgeX + 10, badgeY + badgeH / 2, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = phase === 'waiting' ? '#B45309' : '#047857';
    ctx.font = '800 12px "JetBrains Mono", monospace';
    const statusLabel = phase === 'waiting' ? 'WAIT 00:02' : (phase === 'done' ? `DONE ${endTimeStr}` : 'RUNNING 30X');
    ctx.fillText(statusLabel, badgeX + 18, badgeY + 15);

    // 2.5 Telemetry Sub-Bar (Batch counter & Run Window)
    const subBarY = termY + headH;
    const subBarH = 24;
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(termX + 1, subBarY, codeW - 2, subBarH);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(termX, subBarY + subBarH);
    ctx.lineTo(termX + codeW, subBarY + subBarH);
    ctx.stroke();

    const passNum = phase === 'waiting' ? 0 : (phase === 'done' ? 30 : Math.min(30, Math.floor(windowProg * 30) + 1));
    ctx.fillStyle = '#0369A1';
    this.fillFittedText(ctx, `> ruby QHeim_AutoBOM.rb --30x  [Pass ${String(passNum).padStart(2, '0')}/30]`, termX + 10, subBarY + 16, codeW - 122, 11.5, '700', '"JetBrains Mono", monospace');

    ctx.fillStyle = phase === 'done' ? '#047857' : '#475569';
    ctx.font = '700 11.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.formatTime(Math.min(endSec, Math.max(0, vdoElapsed)))} / ${endTimeStr}`, termX + codeW - 10, subBarY + 16);
    ctx.textAlign = 'left';

    // 3. Rich SketchUp Ruby Plugin + Engine Output Code Stream
    const scriptLines = [
      { type: 'comment', text: '# QHeim_AutoBOM Engine v3.2 (30X Pipeline)' },
      { type: 'keyword', text: 'require "sketchup.rb" ; require "json"' },
      { type: 'keyword', text: 'module SCGHeim::AutoBOM_Runner' },
      { type: 'comment', text: '# [STAGE 1] Parse OTF CAD & P-Rules' },
      { type: 'code', text: '  model = Sketchup.active_model' },
      { type: 'code', text: '  otf = OTF.parse("Forcon_Floorplan.dwg")' },
      { type: 'code', text: '  rules = Database.load_p_rules(1..19)' },
      { type: 'log', text: '  >> [OK] OTF Parsed + 19 P-Rules Ready' },
      { type: 'comment', text: '# [STAGE 2] Frame Wall C75 ±1mm Tolerance' },
      { type: 'keyword', text: '  otf.wall_segments.each_with_index do |w, i|' },
      { type: 'code', text: '    pitch = rules.coding_pitch(:C75, 450)' },
      { type: 'code', text: '    studs = w.compute_studs(pitch, height: 2800)' },
      { type: 'code', text: '    grp = model.entities.add_group' },
      { type: 'code', text: '    grp.extrude_c75_frame!(studs, rules)' },
      { type: 'code', text: '    grp.attach_smartboard!(layer: :SB_9mm)' },
      { type: 'log', text: '  >> [3D] C75 Framing & SmartBoard Sync' },
      { type: 'keyword', text: '  end' },
      { type: 'comment', text: '# [STAGE 3] Auto CAD EE Conduit & Punch' },
      { type: 'code', text: '  outlets = otf.extract_mep_points(:EE)' },
      { type: 'keyword', text: '  outlets.each do |pt|' },
      { type: 'code', text: '    stud = model.nearest_c75_stud(pt)' },
      { type: 'code', text: '    stud.punch_slot!(40, 80, offset_z: 300)' },
      { type: 'code', text: '    BOMRegistry.register_ee_box(pt, "EE-S")' },
      { type: 'log', text: '  >> [EE] CAD Punching Box @ H+300mm OK' },
      { type: 'keyword', text: '  end' },
      { type: 'comment', text: '# [STAGE 4] Parallel Factory Deliverables' },
      { type: 'code', text: '  bom = AutoBOM.aggregate(model, rules)' },
      { type: 'code', text: '  bom.export_xlsx!("PartItems_PO.xlsx")' },
      { type: 'log', text: '  >> [1/4] PartItems Excel Ready (MRP)' },
      { type: 'code', text: '  JobOrder.generate!("S238006A", bom)' },
      { type: 'log', text: '  >> [2/4] Job Order Sheet Verified' },
      { type: 'code', text: '  SBList.export_cnc_dxf!("Lantek_BP.dxf")' },
      { type: 'log', text: '  >> [3/4] SB List & CNC DXF Exported' },
      { type: 'code', text: '  ShopDrawing.batch_render_2d_3d!(model)' },
      { type: 'log', text: '  >> [4/4] 2D Assembly & 3D Views Done' },
      { type: 'log', text: '  ★ [DONE] STATUS: 100% READY FOR FACTORY' },
      { type: 'keyword', text: 'end' }
    ];

    const totalLines = scriptLines.length;
    // Ultra-fast 10-second 30X run: ~1.0s per full 37-line pass (~10 passes across 10.0s window)
    const cycleDuration = Math.max(0.85, Math.min(1.5, runWindow / 10.0));
    let activeLineFloat = 0;
    if (phase === 'waiting') {
      activeLineFloat = 0;
    } else if (phase === 'done') {
      activeLineFloat = totalLines - 1;
    } else {
      const cycleProg = (clampedRunElapsed % cycleDuration) / cycleDuration;
      activeLineFloat = cycleProg * totalLines;
    }
    const activeLineIdx = Math.min(totalLines - 1, Math.floor(activeLineFloat));

    const contentY = subBarY + subBarH + 4;
    const footerH = 38;
    const contentH = Math.max(80, codeH - headH - subBarH - footerH - 8);
    const lineH = 21;
    const visibleLines = Math.max(6, Math.floor(contentH / lineH));
    const maxScrollPx = Math.max(0, (totalLines - visibleLines + 1) * lineH);
    const rawScrollPx = Math.max(0, (activeLineFloat - Math.floor(visibleLines * 0.45)) * lineH);
    const scrollY = phase === 'waiting' ? 0 : Math.min(maxScrollPx, rawScrollPx);

    // Clip to Code Viewport
    ctx.save();
    ctx.rect(termX + 1, contentY, codeW - 2, contentH);
    ctx.clip();

    const cursorBlink = Math.sin(nowSec * 14) > 0;

    scriptLines.forEach((item, idx) => {
      const ly = contentY + idx * lineH - scrollY;
      if (ly < contentY - lineH || ly > contentY + contentH + lineH) return;

      const isActive = idx === activeLineIdx;

      if (isActive) {
        ctx.fillStyle = phase === 'done' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(2, 132, 199, 0.10)';
        ctx.fillRect(termX + 2, ly - 1, codeW - 4, lineH);

        ctx.fillStyle = phase === 'done' ? '#059669' : '#0284C7';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillText('▶', termX + 5, ly + 14.5);
      }

      // Line number
      ctx.fillStyle = isActive ? '#0F172A' : '#94A3B8';
      ctx.font = isActive ? '700 12px "JetBrains Mono", monospace' : '500 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(String(idx + 1).padStart(2, '0'), termX + 35, ly + 14.5);
      ctx.textAlign = 'left';

      // Gutter divider
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(termX + 40, ly);
      ctx.lineTo(termX + 40, ly + lineH);
      ctx.stroke();

      const tx = termX + 47;
      const maxTextW = codeW - 58;
      if (item.type === 'comment') {
        ctx.fillStyle = '#64748B';
      } else if (item.type === 'keyword') {
        ctx.fillStyle = '#BE123C';
      } else if (item.type === 'log') {
        ctx.fillStyle = item.text.includes('DONE') ? '#047857' : '#B45309';
      } else {
        ctx.fillStyle = isActive ? '#0369A1' : '#1E293B';
      }

      this.fillFittedText(ctx, item.text, tx, ly + 15, maxTextW, 13, item.type === 'log' ? '700' : '500', '"JetBrains Mono", monospace');

      if (isActive && cursorBlink) {
        ctx.font = `${item.type === 'log' ? '700' : '500'} 13px "JetBrains Mono", monospace`;
        const measured = Math.min(maxTextW, ctx.measureText(item.text).width);
        ctx.fillStyle = phase === 'done' ? '#059669' : '#0284C7';
        ctx.fillRect(tx + measured + 3, ly + 3, 6, 14);
      }
    });

    ctx.restore();

    // 4. Console Bottom Status & Progress Bar (Clean White/Slate Footer)
    const footY = termY + codeH - footerH;
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(termX, footY, codeW, footerH, [0, 0, 10, 10]);
    else ctx.rect(termX, footY, codeW, footerH);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(termX, footY);
    ctx.lineTo(termX + codeW, footY);
    ctx.stroke();

    const pctInt = Math.round(windowProg * 100);
    ctx.fillStyle = '#475569';
    this.fillFittedText(ctx, `Ln ${activeLineIdx + 1}/${totalLines} · Ruby 30X · Run: 00:00 → ${endTimeStr}`, termX + 12, footY + 15, codeW - 72, 12, '600', '"JetBrains Mono", monospace');

    ctx.fillStyle = phase === 'done' ? '#047857' : '#0284C7';
    ctx.font = '800 12.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${pctInt}%`, termX + codeW - 12, footY + 15);
    ctx.textAlign = 'left';

    // Smooth Execution Progress Meter
    const barW = codeW - 24;
    ctx.fillStyle = '#E2E8F0';
    this.roundRect(ctx, termX + 12, footY + 21, barW, 9, 4.5);
    ctx.fill();
    if (windowProg > 0.005) {
      const pGrad = ctx.createLinearGradient(termX + 12, 0, termX + 12 + barW, 0);
      pGrad.addColorStop(0, '#0284C7');
      pGrad.addColorStop(1, '#059669');
      ctx.fillStyle = pGrad;
      this.roundRect(ctx, termX + 12, footY + 21, barW * windowProg, 9, 4.5);
      ctx.fill();
    }

    ctx.restore();
  }

  // ==================== HELPER: FACTORY DOCUMENT PREVIEW MODAL ====================
  drawDocumentPreviewModal(ctx, box, contentY, contentH) {
    const docKey = this.activeDocPreview;
    const docTitles = {
      partItems: '📋 PART ITEMS (Excel BOM & Sizing Breakdown)',
      jobOrder: '📑 ใบสั่งผลิต JOB ORDER [Production Order Sheet S238006A]',
      sbList: '📐 SB LIST & CAD PUNCHING (EE Conduit & Punch Layout)',
      drawingAssembly: '🏗️ 3D & 2D DRAWING ASSEMBLY (Shop Drawing & Stud Assembly)'
    };
    const docDescriptions = {
      partItems: '✅ ถอดปริมาณอัตโนมัติจากโมเดล ➔ ส่งเข้า MRP สำหรับฝ่ายจัดซื้อ (Purchase) เพื่อออก PO Auto & Send Email',
      jobOrder: '✅ ใบสั่งผลิตและรายการหยิบชิ้นส่วน (Picking List) ➔ ส่งตรงถึงไลน์ผลิตโรงงาน (Production)',
      sbList: '✅ รหัสแผงผนัง SB List + เจาะร้อยท่อไฟ EE ➔ เข้า Lantek Nesting & ส่งตัด CNC แผ่น BP',
      drawingAssembly: '✅ แบบขยาย Shop Drawing 2D & 3D ➔ ส่งหน้างานประกอบ (Production) และติดตั้งจริง (Installation)'
    };
    const title = docTitles[docKey] || 'DOCUMENT PREVIEW';
    const subNote = docDescriptions[docKey] || '';

    // Dark backdrop overlay
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    this.roundRect(ctx, box.x, box.y, box.w, box.h, 16);
    ctx.fill();

    // Modal Card
    const modalW = 1320;
    const modalH = 820;
    const modalX = box.x + (box.w - modalW) / 2;
    const modalY = box.y + (box.h - modalH) / 2;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 20;

    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, modalX, modalY, modalW, modalH, 18);
    ctx.fill();

    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Header Bar
    const headH = 60;
    ctx.fillStyle = '#1E3A8A';
    this.roundRect(ctx, modalX, modalY, modalW, headH, 18);
    ctx.fill();
    ctx.fillRect(modalX, modalY + headH - 14, modalW, 14);

    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, title, modalX + 24, modalY + 38, 540, 20, '800', '"Prompt", sans-serif');

    // Interactive Document Switcher Tabs in Modal Header
    const tabDefs = [
      { key: 'partItems', label: '📋 Part Items' },
      { key: 'jobOrder', label: '📑 Job Order' },
      { key: 'sbList', label: '📐 SB List & CAD' },
      { key: 'drawingAssembly', label: '🏗️ 2D/3D Drawing' }
    ];
    this.modalDocTabs = [];
    const tabStartX = modalX + 575;
    const tabW = 145;
    const tabH = 36;
    const tabGap = 8;
    const tabY = modalY + 12;

    tabDefs.forEach((tb, tidx) => {
      const tx = tabStartX + tidx * (tabW + tabGap);
      const isCurTab = docKey === tb.key;
      this.modalDocTabs.push({ key: tb.key, x: tx, y: tabY, w: tabW, h: tabH });

      ctx.fillStyle = isCurTab ? '#3B82F6' : 'rgba(255, 255, 255, 0.12)';
      this.roundRect(ctx, tx, tabY, tabW, tabH, 8);
      ctx.fill();
      ctx.strokeStyle = isCurTab ? '#93C5FD' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, tb.label, tx + tabW / 2, tabY + 23, tabW - 12, 13, isCurTab ? '800' : '600', '"Prompt", sans-serif', 'center');
    });

    // Close Button [✕ ปิด (ESC)]
    const closeBtnW = 105;
    const closeBtnH = 36;
    const closeBtnX = modalX + modalW - closeBtnW - 16;
    const closeBtnY = modalY + 12;
    this.activeModalRect = {
      x: modalX,
      y: modalY,
      w: modalW,
      h: modalH,
      closeBtn: { x: closeBtnX, y: closeBtnY, w: closeBtnW, h: closeBtnH }
    };

    ctx.fillStyle = '#DC2626';
    this.roundRect(ctx, closeBtnX, closeBtnY, closeBtnW, closeBtnH, 18);
    ctx.fill();
    ctx.strokeStyle = '#FCA5A5';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, '✕ ปิด (ESC)', closeBtnX + closeBtnW / 2, closeBtnY + 24, closeBtnW - 10, 14, '800', '"Prompt", sans-serif', 'center');

    // Document Image Viewport
    const viewX = modalX + 16;
    const viewY = modalY + headH + 14;
    const viewW = modalW - 32;
    const viewH = modalH - headH - 56;

    ctx.fillStyle = '#0F172A';
    this.roundRect(ctx, viewX, viewY, viewW, viewH, 12);
    ctx.fill();

    ctx.save();
    this.roundRect(ctx, viewX, viewY, viewW, viewH, 12);
    ctx.clip();

    if (docKey === 'sbList') {
      const halfW = (viewW - 16) / 2;
      const doc1 = this.factoryDocs.sbList;
      const doc2 = this.factoryDocs.cadPunchingEe;
      if (doc1 && doc1.complete && doc1.naturalWidth > 0) {
        this.drawMediaContain(ctx, doc1, doc1.naturalWidth, doc1.naturalHeight, viewX, viewY, halfW, viewH);
      }
      if (doc2 && doc2.complete && doc2.naturalWidth > 0) {
        this.drawMediaContain(ctx, doc2, doc2.naturalWidth, doc2.naturalHeight, viewX + halfW + 16, viewY, halfW, viewH);
      }
    } else {
      const docImg = this.factoryDocs[docKey];
      if (docImg && docImg.complete && docImg.naturalWidth > 0) {
        this.drawMediaContain(ctx, docImg, docImg.naturalWidth, docImg.naturalHeight, viewX, viewY, viewW, viewH);
      }
    }
    ctx.restore();

    // Footer note bar inside modal
    const footY = modalY + modalH - 36;
    ctx.fillStyle = '#F1F5F9';
    this.roundRect(ctx, modalX + 16, footY, modalW - 32, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#1E3A8A';
    this.fillFittedText(ctx, subNote, modalX + 28, footY + 19, modalW - 56, 13, '700', '"Prompt", sans-serif');

    ctx.restore();
  }


  // ==================== SCENE 04: AUTOMATION DELIVERABLES SUMMARY (3D, 2D, BOM, Job Order, SB List) ====================
  // User request: "หน้า4 ตัดออก ที่กรอบแดง ส่วนอื่นจัดให้เต็มจอ"
  // 5 Deliverables Full-Stage View with live videos playing inside each card!
  drawAutomationDeliverablesSummaryScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();

    const deliverables = [
      {
        code: '3D',
        label: '3D Model',
        sub: 'โมเดลโครงสร้าง 3 มิติ',
        vdo: 'VDO/3D.mp4',
        thumb: this.factoryDocs ? this.factoryDocs.model3d : null,
        target: 'ฝ่ายวิศวกรรม & โรงงานผลิต',
        process: 'ขึ้นโมเดล 3D C75 ทั้งหลัง < 2 นาที',
        output: '.SKP / IFC (โมเดลกลาง 3 มิติ)',
        benefit: '🌟 โมเดลเดียวจบ ไร้ข้อผิดพลาด'
      },
      {
        code: '2D',
        label: '2D Drawing',
        sub: 'แบบประกอบ Shop Drawing',
        vdo: 'VDO/2D.mp4',
        thumb: this.factoryDocs ? this.factoryDocs.drawingAssembly : null,
        target: 'ทีมช่างประกอบ & Assembly Line',
        process: 'แยก Shop Drawing ละเอียด ±1mm',
        output: '.DWG / PDF (Shop Drawing ละเอียด)',
        benefit: '🌟 ประกอบตามแบบได้ทันที'
      },
      {
        code: 'BOM',
        label: 'Part Items (BOM)',
        sub: 'ถอดปริมาณชิ้นส่วน Auto',
        vdo: 'VDO/BOM.mp4',
        thumb: this.factoryDocs ? this.factoryDocs.partItems : null,
        target: 'ฝ่ายจัดซื้อ (Purchase) & MRP',
        process: 'ถอดปริมาณชิ้นส่วนอัตโนมัติ 100%',
        output: '.XLSX (BOM Excel ออก PO Auto)',
        benefit: '🌟 จัดซื้อวัสดุรวดเร็ว ไม่รอเช็ค'
      },
      {
        code: 'JOB',
        label: 'Job Order',
        sub: 'ใบสั่งผลิต & Picking List',
        vdo: 'VDO/Job Order.mp4',
        thumb: this.factoryDocs ? this.factoryDocs.jobOrder : null,
        target: 'ฝ่ายผลิตโรงงาน (Production)',
        process: 'สร้างใบสั่งผลิตแยกตามแผงผนัง',
        output: '.PDF (Job Order Sheet S238)',
        benefit: '🌟 คุมสต็อกและการหยิบประกอบเป๊ะ'
      },
      {
        code: 'SB',
        label: 'SB List & EE',
        sub: 'CAD Punching & CNC',
        vdo: 'VDO/SB List.mp4',
        thumb: this.factoryDocs ? this.factoryDocs.sbList : null,
        target: 'หน่วยเจาะตัดพับ CNC & Lantek',
        process: 'คำนวณตำแหน่งเจาะท่อไฟ EE Auto',
        output: '.DXF (ส่งตัด CNC & พับ BP)',
        benefit: '🌟 เจาะรูปลั๊กตรงตำแหน่งไฟ 100%'
      }
    ];

    const dur = Math.max(10, slide.duration || 30);
    const autoIdx = Math.floor((animSec / dur) * deliverables.length) % deliverables.length;
    const activeIdx = (this.automationActiveTab !== null && this.automationActiveTab !== undefined)
      ? this.automationActiveTab
      : autoIdx;

    // 1. TOP HEADER BANNER (Full Width)
    const headX = box.x + 14;
    const headY = box.y + 10;
    const headW = box.w - 28;
    const headH = 56;

    ctx.save();
    ctx.fillStyle = '#0F172A';
    this.roundRect(ctx, headX, headY, headW, headH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header Title
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(
      ctx,
      '📋 AUTOMATION OUTPUT DELIVERABLES — 5 ผลผลิตหลักประมวลผลอัตโนมัติ 100% จากโมเดลเดียว',
      headX + 24,
      headY + 35,
      headW * 0.55,
      17,
      '800',
      '"Prompt", sans-serif'
    );

    // Right Realtime Badge
    const bW = 280;
    const bX = headX + headW - bW - 16;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
    this.roundRect(ctx, bX, headY + 11, bW, 34, 8);
    ctx.fill();
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const dotPulse = 0.5 + 0.5 * Math.sin(nowSec * 6);
    ctx.fillStyle = 'rgba(34, 197, 94, ' + (0.7 + 0.3 * dotPulse) + ')';
    ctx.beginPath();
    ctx.arc(bX + 18, headY + 28, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#86EFAC';
    this.fillFittedText(ctx, '● 5-STREAM REALTIME SYNC', bX + bW / 2 + 8, headY + 29, bW - 36, 14.5, '800', '"JetBrains Mono", monospace', 'center');
    ctx.restore();

    // 2. 5 DELIVERABLES CARDS EXPANDED TO FULL SCREEN HEIGHT ("ส่วนอื่นจัดให้เต็มจอ")
    const cardsY = headY + headH + 16;
    const cardsH = (box.y + box.h) - cardsY - 14;
    const availW = box.w - 28;
    const gapX = 24;
    const cardW = Math.floor((availW - (deliverables.length - 1) * gapX) / deliverables.length);

    this.automationCards = [];

    deliverables.forEach((item, idx) => {
      const cx = box.x + 14 + idx * (cardW + gapX);
      const cy = cardsY;
      const isAct = (idx === activeIdx);
      const isHov = (this.hoveredCard === 'auto_card_' + idx);

      this.automationCards.push({ id: 'auto_card_' + idx, idx, x: cx, y: cy, w: cardW, h: cardsH });

      ctx.save();

      // Card Outer Container
      ctx.shadowColor = isAct ? 'rgba(234, 88, 12, 0.35)' : 'rgba(0, 0, 0, 0.06)';
      ctx.shadowBlur = isAct ? 26 : 12;
      ctx.shadowOffsetY = isAct ? 10 : 4;

      ctx.fillStyle = isAct ? '#FFFDFB' : '#FFFFFF';
      this.roundRect(ctx, cx, cy, cardW, cardsH, 20);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = isAct ? '#EA580C' : (isHov ? '#FDBA74' : 'rgba(226, 232, 240, 0.95)');
      ctx.lineWidth = isAct ? 3.5 : 1.8;
      ctx.stroke();

      // 2.1 Card Top Header
      // Sequence Tag & Code Pill
      ctx.fillStyle = isAct ? '#EA580C' : '#0F172A';
      this.roundRect(ctx, cx + 16, cy + 16, 108, 28, 7);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, 'OUTPUT 0' + (idx + 1), cx + 70, cy + 35, 96, 13.5, '800', '"JetBrains Mono", monospace', 'center');

      ctx.fillStyle = isAct ? '#EA580C' : '#C84B31';
      this.fillFittedText(ctx, item.code, cx + cardW - 36, cy + 35, 52, 16.5, '800', '"Prompt", sans-serif', 'center');

      // Title & Subtitle
      ctx.fillStyle = '#0F172A';
      this.fillFittedText(ctx, item.label, cx + 16, cy + 72, cardW - 32, 23, '800', '"Prompt", sans-serif');

      ctx.fillStyle = '#64748B';
      this.fillFittedText(ctx, item.sub, cx + 16, cy + 98, cardW - 32, 16, '600', '"Prompt", sans-serif');

      // 2.2 UPPER VIDEO EMBED ("ในกล่องให้เป็น VDO ที่แนบ")
      const vBoxX = cx + 14;
      const vBoxY = cy + 116;
      const vBoxW = cardW - 28;
      const vBoxH = 290;

      ctx.save();
      this.roundRect(ctx, vBoxX, vBoxY, vBoxW, vBoxH, 14);
      ctx.clip();

      const vid = this.getOrCreateVideo(item.vdo);
      let vidDrawn = false;
      if (vid) {
        try {
          vid.loop = true;
          vid.muted = true;
          if (vid.paused) {
            vid.play().catch(() => {});
          }
        } catch (e) {}

        const canDraw = (vid.readyState >= 2) || (vid.videoWidth > 0 && vid.currentTime > 0);
        if (canDraw) {
          ctx.fillStyle = '#0B0F19';
          ctx.fillRect(vBoxX, vBoxY, vBoxW, vBoxH);
          this.drawMediaContain(ctx, vid, vid.videoWidth || 1920, vid.videoHeight || 1080, vBoxX, vBoxY, vBoxW, vBoxH);
          vidDrawn = true;
        }
      }

      if (!vidDrawn) {
        ctx.fillStyle = '#0B0F19';
        ctx.fillRect(vBoxX, vBoxY, vBoxW, vBoxH);
        const fbImg = item.thumb;
        if (fbImg && fbImg.complete && fbImg.naturalWidth > 0) {
          this.drawMediaContain(ctx, fbImg, fbImg.naturalWidth, fbImg.naturalHeight, vBoxX, vBoxY, vBoxW, vBoxH);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.fillRect(vBoxX, vBoxY, vBoxW, vBoxH);
        } else {
          ctx.fillStyle = '#94A3B8';
          ctx.font = '600 14px "Prompt", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🎬 กำลังเชื่อมต่อ ' + item.label + '...', vBoxX + vBoxW / 2, vBoxY + vBoxH / 2);
          ctx.textAlign = 'left';
        }
      }

      // Live Video Overlay Badge (shows playing timecode or buffering state)
      const isLiveReady = vid && ((vid.readyState >= 2) || (vid.videoWidth > 0 && vid.currentTime > 0));
      ctx.fillStyle = isAct ? 'rgba(234, 88, 12, 0.92)' : (isLiveReady ? 'rgba(5, 150, 105, 0.90)' : 'rgba(15, 23, 42, 0.82)');
      this.roundRect(ctx, vBoxX + 10, vBoxY + 10, 104, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, isAct ? '● FOCUS' : (isLiveReady ? '▶ LIVE VDO' : '⏳ BUFFER'), vBoxX + 62, vBoxY + 27.5, 92, 12.5, '800', '"JetBrains Mono", monospace', 'center');

      ctx.restore(); // end video clip

      // Border around video
      ctx.strokeStyle = isAct ? '#EA580C' : 'rgba(15, 23, 42, 0.15)';
      ctx.lineWidth = isAct ? 2.5 : 1.2;
      this.roundRect(ctx, vBoxX, vBoxY, vBoxW, vBoxH, 14);
      ctx.stroke();

      // 2.3 STRUCTURED DELIVERABLE INFORMATION BLOCKS
      const infoStartY = vBoxY + vBoxH + 18;
      const bH = 80;
      const bGap = 12;

      // Block 1: Destination Department
      const b1Y = infoStartY;
      ctx.fillStyle = '#F8FAFC';
      this.roundRect(ctx, cx + 14, b1Y, cardW - 28, bH, 10);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      this.fillFittedText(ctx, '🏢 แผนกปลายทาง (Destination)', cx + 22, b1Y + 24, cardW - 44, 14.5, '700', '"Prompt", sans-serif');
      ctx.fillStyle = '#0F172A';
      this.fillFittedText(ctx, item.target, cx + 22, b1Y + 56, cardW - 44, 17.5, '800', '"Prompt", sans-serif');

      // Block 2: Automation Process
      const b2Y = b1Y + bH + bGap;
      ctx.fillStyle = '#F8FAFC';
      this.roundRect(ctx, cx + 14, b2Y, cardW - 28, bH, 10);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      this.fillFittedText(ctx, '⚡ การประมวลผลอัตโนมัติ (Process)', cx + 22, b2Y + 24, cardW - 44, 14.5, '700', '"Prompt", sans-serif');
      ctx.fillStyle = '#0F172A';
      this.fillFittedText(ctx, item.process, cx + 22, b2Y + 56, cardW - 44, 17, '800', '"Prompt", sans-serif');

      // Block 3: Output Format
      const b3Y = b2Y + bH + bGap;
      ctx.fillStyle = '#F8FAFC';
      this.roundRect(ctx, cx + 14, b3Y, cardW - 28, bH, 10);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      this.fillFittedText(ctx, '📁 รูปแบบไฟล์ผลผลิต (Outputs)', cx + 22, b3Y + 24, cardW - 44, 14.5, '700', '"Prompt", sans-serif');
      ctx.fillStyle = '#0F172A';
      this.fillFittedText(ctx, item.output, cx + 22, b3Y + 56, cardW - 44, 17, '800', '"Prompt", sans-serif');

      // Block 4: Key Advantage
      const b4Y = b3Y + bH + bGap;
      ctx.fillStyle = isAct ? '#FFF7ED' : '#F1F5F9';
      this.roundRect(ctx, cx + 14, b4Y, cardW - 28, 70, 10);
      ctx.fill();
      ctx.strokeStyle = isAct ? '#FDBA74' : '#E2E8F0';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = isAct ? '#C2410C' : '#334155';
      this.fillFittedText(ctx, item.benefit, cx + cardW / 2, b4Y + 42, cardW - 36, 16, '800', '"Prompt", sans-serif', 'center');

      // 2.4 Bottom Action Pill Button
      const btnY = cy + cardsH - 54;
      const btnH = 40;
      ctx.fillStyle = isAct ? '#EA580C' : '#F8FAFC';
      this.roundRect(ctx, cx + 14, btnY, cardW - 28, btnH, 8);
      ctx.fill();
      ctx.strokeStyle = isAct ? '#C2410C' : '#CBD5E1';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = isAct ? '#FFFFFF' : '#475569';
      this.fillFittedText(
        ctx,
        isAct ? '✨ FOCUSING (กำลังโฟกัสผลผลิตนี้)' : '🔍 คลิกเพื่อเลือกผลผลิตนี้',
        cx + cardW / 2,
        btnY + 26,
        cardW - 38,
        15.5,
        '800',
        '"Prompt", sans-serif',
        'center'
      );

      ctx.restore();

      // Flow Connector Arrow between adjacent cards
      if (idx < deliverables.length - 1) {
        const arrowMidX = cx + cardW + gapX / 2;
        const arrowMidY = vBoxY + vBoxH / 2;

        ctx.save();
        // Connector line
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(cx + cardW, arrowMidY);
        ctx.lineTo(cx + cardW + gapX, arrowMidY);
        ctx.stroke();

        // Connector circle
        ctx.fillStyle = '#6366F1';
        ctx.beginPath();
        ctx.arc(arrowMidX, arrowMidY, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('➔', arrowMidX + 1, arrowMidY);
        ctx.restore();
      }
    });

    ctx.restore();
  }

  /**
   * Metadata catalog for the 5 automated engineering & factory deliverables.
   */
  getDeliverablesCatalog() {
    return [
      {
        tag: '3D BIM',
        ext: '.SKP / .IFC',
        title: '3D Model',
        sub: 'โมเดลโครงสร้าง 3 มิติ & พิกัด C75',
        dept: 'ฝ่ายวิศวกรรม & โรงงานผลิต',
        proc: 'ขึ้นโมเดล 3D C75 ทั้งหลัง < 2 นาที',
        proc2: 'ซิงค์ P-Rule & Constraints อัตโนมัติ',
        outFmt: '.SKP / .IFC',
        outFmt2: '(โมเดลกลาง 3 มิติ Master BIM)',
        benefit: 'โมเดลเดียวจบ ไร้ข้อผิดพลาด',
        benefit2: 'ป้องกันชนโครงสร้าง & ท่อไฟก่อนผลิต',
        loupeLabel: 'C75 BIM & Insulation Cutaway',
        loupeFocus: { fx: 0.48, fy: 0.46 },
        docKey: 'gen01',
        fallbackKey: 'model3d',
        accent: '#059669',
        lightBg: '#ECFDF5',
        pillBg: '#D1FAE5'
      },
      {
        tag: '2D SHOP',
        ext: '.DWG / .PDF',
        title: '2D Drawing',
        sub: 'แบบประกอบโรงงาน Shop Drawing',
        dept: 'ทีมช่างประกอบ & Assembly Line',
        proc: 'แยก Shop Drawing ละเอียด ±1 mm',
        proc2: 'สร้าง Dimension & Stud Tag ครบทุกแผง',
        outFmt: '.DWG / .PDF',
        outFmt2: '(แบบมาตรฐานพร้อมส่งประกอบ)',
        benefit: 'ประกอบตามแบบได้ทันทีหน้างาน',
        benefit2: 'ลดเวลาสอบถามหรือรอแก้แบบ 100%',
        loupeLabel: 'Tolerance ±1mm · Grid & Stud',
        loupeFocus: { fx: 0.50, fy: 0.45 },
        docKey: 'gen02',
        fallbackKey: 'drawingAssembly',
        accent: '#2563EB',
        lightBg: '#EFF6FF',
        pillBg: '#DBEAFE'
      },
      {
        tag: 'BOM / MRP',
        ext: '.XLSX / PO',
        title: 'Part Items (BOM)',
        sub: 'ถอดปริมาณชิ้นส่วน Auto 100%',
        dept: 'ฝ่ายจัดซื้อ (Purchase) & MRP',
        proc: 'ถอดปริมาณเหล็ก-บอร์ด-น็อต อัตโนมัติ',
        proc2: 'สรุปรวมน้ำหนัก/จำนวนพร้อมออก PO',
        outFmt: '.XLSX (BOM)',
        outFmt2: '(ตาราง BOM พร้อมส่งสั่งซื้อทันที)',
        benefit: 'จัดซื้อวัสดุรวดเร็ว ไม่รอเช็คซ้ำ',
        benefit2: 'ตัดโอกาสสั่งขาด-สั่งเกินหน้างาน',
        loupeLabel: 'Auto BOM & Purchase Approval',
        loupeFocus: { fx: 0.68, fy: 0.44 },
        docKey: 'gen03',
        fallbackKey: 'partItems',
        accent: '#0284C7',
        lightBg: '#F0F9FF',
        pillBg: '#E0F2FE'
      },
      {
        tag: 'JOB ORDER',
        ext: '.PDF S230',
        title: 'Job Order',
        sub: 'ใบสั่งผลิต & Picking List แยกแผง',
        dept: 'ฝ่ายผลิตโรงงาน (Production)',
        proc: 'สร้างใบสั่งผลิตแยกตามหมายเลขแผง',
        proc2: 'ผูก Barcode/QR เบิกจ่ายชิ้นส่วนตรงแผง',
        outFmt: '.PDF (S230)',
        outFmt2: '(Job Order Sheet & Picking Tag)',
        benefit: 'คุมสต็อกและการหยิบประกอบเป๊ะ',
        benefit2: 'ตรวจเช็คสถานะรายแผงได้ Real-Time',
        loupeLabel: 'Panel #101–105 · Barcode / QR',
        loupeFocus: { fx: 0.54, fy: 0.52 },
        docKey: 'gen04',
        fallbackKey: 'jobOrder',
        accent: '#D97706',
        lightBg: '#FFFBEB',
        pillBg: '#FEF3C7'
      },
      {
        tag: 'SB & CNC',
        ext: '.DXF / CAM',
        title: 'SB List & EE',
        sub: 'CAD EE Punching & เจาะตัดพับ CNC',
        dept: 'หน่วยเจาะตัดพับ CNC & Lantek',
        proc: 'คำนวณจุดเจาะปลั๊ก & ท่อไฟ EE Auto',
        proc2: 'Nesting แผ่น Smart Board ส่งเครื่องตัด',
        outFmt: '.DXF / .CNC',
        outFmt2: '(ส่งเข้าเครื่องตัดพับ BP & Lantek)',
        benefit: 'เจาะรูปลั๊กตรงตำแหน่งไฟ 100%',
        benefit2: 'ลดเศษเหลือตัด & เวลาคีย์ CAM ที่หน้าเครื่อง',
        loupeLabel: 'CNC Nesting & Conduit Punching',
        loupeFocus: { fx: 0.52, fy: 0.42 },
        docKey: 'gen05',
        fallbackKey: 'sbList',
        accent: '#7C3AED',
        lightBg: '#F5F3FF',
        pillBg: '#EDE9FE'
      }
    ];
  }

  /**
   * Resolve ready image asset with fallback to factory documentation bitmap.
   */
  resolveDeliverableImage(item) {
    if (!this.factoryDocs) return null;
    const isReady = (im) => Boolean(im && im.complete && (im.naturalWidth || 0) > 0 && (im.naturalHeight || 0) > 0);
    const primary = item ? this.factoryDocs[item.docKey] : null;
    if (isReady(primary)) return primary;
    const fallback = item ? this.factoryDocs[item.fallbackKey] : null;
    if (isReady(fallback)) return fallback;
    return null;
  }

  /**
   * Draw an image fitted inside a rounded rectangle with smooth zoom/pan framing.
   * Returns computed draw rect for loupe sampling.
   */
  drawFittedRoundedImage(ctx, img, x, y, w, h, radius, zoom = 1.0, panX = 0, panY = 0, accent = '#059669') {
    ctx.save();
    this.roundRect(ctx, x, y, w, h, radius);
    if (typeof ctx.clip === 'function') ctx.clip();

    ctx.fillStyle = '#0F172A';
    ctx.fillRect(x, y, w, h);

    let drawRect = { dx: x, dy: y, dw: w, dh: h };
    if (img && typeof ctx.drawImage === 'function') {
      const iw = img.naturalWidth || w;
      const ih = img.naturalHeight || h;
      const baseScale = Math.max(w / iw, h / ih);
      const dw = iw * baseScale * zoom;
      const dh = ih * baseScale * zoom;
      const dx = x + (w - dw) / 2 + panX;
      const dy = y + (h - dh) / 2 + panY;
      ctx.drawImage(img, dx, dy, dw, dh);
      drawRect = { dx, dy, dw, dh };
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = accent;
      ctx.font = '700 16px "Prompt", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOADING GENERATED VISUAL...', x + w / 2, y + h / 2);
    }
    ctx.restore();
    return drawRect;
  }

  /**
   * Render animated floating 2x magnifying loupe gliding over key detail points.
   */
  drawMagnifyingLoupe(ctx, img, viewBox, imgRect, focus, nowSec, accent, label) {
    if (!img || typeof ctx.drawImage !== 'function' || typeof ctx.arc !== 'function' || typeof ctx.clip !== 'function') {
      return;
    }
    const orbitX = Math.sin(nowSec * 0.85) * 0.065;
    const orbitY = Math.cos(nowSec * 0.65) * 0.055;
    const normX = Math.max(0.18, Math.min(0.82, focus.fx + orbitX));
    const normY = Math.max(0.22, Math.min(0.78, focus.fy + orbitY));

    const r = 64;
    const lx = viewBox.x + normX * viewBox.w;
    const ly = viewBox.y + normY * viewBox.h;

    const iw = img.naturalWidth || viewBox.w;
    const ih = img.naturalHeight || viewBox.h;
    const relX = (lx - imgRect.dx) / (imgRect.dw || viewBox.w);
    const relY = (ly - imgRect.dy) / (imgRect.dh || viewBox.h);
    const zoomFactor = 2.05;
    const srcW = (r * 2 / (imgRect.dw || viewBox.w)) * iw / zoomFactor;
    const srcH = (r * 2 / (imgRect.dh || viewBox.h)) * ih / zoomFactor;
    const srcX = Math.max(0, Math.min(iw - srcW, relX * iw - srcW / 2));
    const srcY = Math.max(0, Math.min(ih - srcH, relY * ih - srcH / 2));

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.38)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.save();
    ctx.beginPath();
    ctx.arc(lx, ly, r - 3, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, srcX, srcY, srcW, srcH, lx - r + 3, ly - r + 3, (r - 3) * 2, (r - 3) * 2);

    // Subtle magnifying glass specular sheen & crosshair reticle
    const sheen = ctx.createLinearGradient(lx - r, ly - r, lx + r, ly + r);
    sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
    sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(lx - r, ly - r, r * 2, r * 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(lx - 14, ly);
    ctx.lineTo(lx + 14, ly);
    ctx.moveTo(lx, ly - 14);
    ctx.lineTo(lx, ly + 14);
    ctx.stroke();
    ctx.restore();

    // Glowing double lens bezel
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(lx, ly, r + 3, 0, Math.PI * 2);
    ctx.stroke();

    // Smart callout label flipping away from Hero boundaries
    const badgeW = 248;
    const badgeH = 32;
    const placeLeft = lx > viewBox.x + viewBox.w * 0.56;
    const bx = placeLeft ? (lx - r - badgeW - 12) : (lx + r + 12);
    const by = Math.max(viewBox.y + 12, Math.min(viewBox.y + viewBox.h - badgeH - 12, ly - badgeH / 2));

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    this.roundRect(ctx, bx, by, badgeW, badgeH, 8);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, `🔍 2×  ${label}`, bx + badgeW / 2, by + 20, badgeW - 16, 12.5, '700', '"Prompt", sans-serif', 'center');
    ctx.restore();
  }

  /**
   * Draw full-screen Cinema Modal when user clicks 'ขยายเต็มจอ' or Hero image.
   */
  drawDeliverablesModal(ctx, box, items, activeIdx) {
    const d = items[activeIdx];
    const img = this.resolveDeliverableImage(d);

    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(box.x, box.y, box.w, box.h);

    const mx = box.x + 24;
    const my = box.y + 14;
    const mw = box.w - 48;
    const mh = box.h - 28;
    this.automationModalBox = { x: mx, y: my, w: mw, h: mh };

    ctx.fillStyle = '#0F172A';
    this.roundRect(ctx, mx, my, mw, mh, 24);
    ctx.fill();
    ctx.strokeStyle = d.accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Header
    ctx.fillStyle = d.accent;
    this.roundRect(ctx, mx + 28, my + 24, 152, 34, 9);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, `OUTPUT 0${activeIdx + 1} / 05`, mx + 104, my + 46, 136, 14, '900', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#F8FAFC';
    this.fillFittedText(ctx, `${d.title} — ${d.sub}`, mx + 200, my + 47, 1080, 24, '900', '"Prompt", sans-serif', 'left');

    // Close button
    const closeW = 148;
    const closeH = 42;
    const closeX = mx + mw - closeW - 26;
    const closeY = my + 20;
    this.automationModalCloseBtn = { x: closeX, y: closeY, w: closeW, h: closeH };
    ctx.fillStyle = '#EF4444';
    this.roundRect(ctx, closeX, closeY, closeW, closeH, 10);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, '✕ ปิด (ESC)', closeX + closeW / 2, closeY + 26, closeW - 16, 14, '800', '"Prompt", sans-serif', 'center');

    // Cinema Visual
    this.drawFittedRoundedImage(ctx, img, mx + 28, my + 76, mw - 56, mh - 180, 16, 1.0, 0, 0, d.accent);

    // Bottom Summary Strip
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    this.roundRect(ctx, mx + 28, my + mh - 86, mw - 56, 62, 12);
    ctx.fill();
    ctx.fillStyle = '#CBD5E1';
    this.fillFittedText(ctx, `🏢 ${d.dept}   |   ⚡ ${d.proc}   |   📁 ${d.outFmt}   |   ✨ ${d.benefit}`, mx + mw / 2, my + mh - 48, mw - 100, 17, '700', '"Prompt", sans-serif', 'center');
    ctx.restore();
  }

  /**
   * Slide 12 Tab 03: Interactive Master-Detail Showcase of all 5 Generated Deliverables.
   * Alternates cleanly across 01..05 showing both the BIG spotlight inspection view & 5 small cards.
   */
  drawDeliverablesShowcaseScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    const tSec = nowSec || (Date.now() / 1000);
    const items = this.getDeliverablesCatalog();
    const dwellSec = 4.0; // Exact 4.0s x 5 deliverables = 20.0s full showcase

    if (this._deliverablesCycleOrigin === undefined) {
      this._deliverablesCycleOrigin = tSec;
    }

    const isAuto = (this.automationActiveTab === null || this.automationActiveTab === undefined);
    let activeIdx = 0;
    let cycleProg = 1.0;

    if (isAuto) {
      const elapsed = (this.isPlaying && typeof animSec === 'number' && animSec >= 0)
        ? animSec
        : Math.max(0, tSec - this._deliverablesCycleOrigin);
      const totalPos = (elapsed / dwellSec) % items.length;
      activeIdx = Math.floor(totalPos);
      cycleProg = totalPos - activeIdx;
    } else {
      activeIdx = Math.max(0, Math.min(items.length - 1, this.automationActiveTab));
      this._deliverablesCycleOrigin = tSec - activeIdx * dwellSec;
    }

    if (this._lastRenderedDeliverable !== activeIdx) {
      this._lastRenderedDeliverable = activeIdx;
      this._deliverableSwitchAt = tSec;
    }
    const transElapsed = Math.min(1, Math.max(0, (tSec - (this._deliverableSwitchAt || 0)) / 0.42));
    const easeOut = 1 - Math.pow(1 - transElapsed, 3);

    const dActive = items[activeIdx];
    const activeImg = this.resolveDeliverableImage(dActive);

    // 1. Main Clean White Studio Card + Dot Blueprint Texture
    const cardX = box.x + 10;
    const cardY = box.y + 6;
    const cardW = box.w - 20;
    const cardH = box.h - 12;

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.10)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Dotted blueprint texture inside card
    if (typeof ctx.arc === 'function') {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.032)';
      for (let gx = cardX + 28; gx < cardX + cardW - 18; gx += 34) {
        for (let gy = cardY + 76; gy < cardY + cardH - 18; gy += 34) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1.15, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 2. Top SCG HEIM Dark Emerald Banner + Auto/Step Pills (clipped inside outer card radius)
    const bannerH = 56;
    ctx.save();
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    if (typeof ctx.clip === 'function') ctx.clip();
    const bGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
    bGrad.addColorStop(0, '#0B1F1B');
    bGrad.addColorStop(0.55, '#064E3B');
    bGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = bGrad;
    ctx.fillRect(cardX, cardY, cardW, bannerH);
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(
      ctx,
      '🖼️  AUTOMATION OUTPUT SHOWCASE — 5 ผลผลิตหลักอัตโนมัติ (Generated Visual · ซูมดูครบ 5 ใบ)',
      cardX + 26,
      cardY + 35,
      1020,
      18,
      '900',
      '"Prompt", sans-serif',
      'left'
    );

    this.automationControls = [];
    this.automationCards = [];
    this.automationModalCloseBtn = null;
    this.automationModalBox = null;

    // Auto / Pinned Cycle Toggle Pill
    const autoBtnW = 246;
    const autoBtnH = 34;
    const autoBtnX = cardX + cardW - autoBtnW - 22;
    const autoBtnY = cardY + 11;
    this.automationControls.push({ action: 'toggle-auto', x: autoBtnX, y: autoBtnY, w: autoBtnW, h: autoBtnH });

    ctx.fillStyle = isAuto ? '#059669' : '#D97706';
    this.roundRect(ctx, autoBtnX, autoBtnY, autoBtnW, autoBtnH, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const remainSec = Math.max(0.1, (1 - cycleProg) * dwellSec).toFixed(1);
    const totalCycleSec = Math.round(dwellSec * items.length);
    const autoLbl = isAuto ? `▶ AUTO 1→5 (${totalCycleSec}s · ${remainSec}s)` : `📌 PINNED #0${activeIdx + 1} · กดวน ${totalCycleSec}s`;
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, autoLbl, autoBtnX + autoBtnW / 2, autoBtnY + 22, autoBtnW - 18, 13, '800', '"Prompt", sans-serif', 'center');

    // Banner 01..05 Quick Step Badges
    const dotW = 42;
    const dotGap = 6;
    const dotsTotalW = items.length * dotW + (items.length - 1) * dotGap;
    const dotsStartX = autoBtnX - dotsTotalW - 16;
    items.forEach((it, idx) => {
      const dx = dotsStartX + idx * (dotW + dotGap);
      const dy = cardY + 12;
      const isCur = idx === activeIdx;
      this.automationControls.push({ action: 'select', idx, x: dx, y: dy, w: dotW, h: 32 });
      ctx.fillStyle = isCur ? it.accent : 'rgba(255,255,255,0.12)';
      this.roundRect(ctx, dx, dy, dotW, 32, 8);
      ctx.fill();
      if (isCur) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillStyle = isCur ? '#FFFFFF' : '#CBD5E1';
      this.fillFittedText(ctx, `0${idx + 1}`, dx + dotW / 2, dy + 21, dotW - 8, 13, '800', '"Prompt", sans-serif', 'center');
    });

    // 3. Asymmetric Split Geometry: Left BIG Hero + Right 5 Small Cards
    const padX = 22;
    const bodyX = cardX + padX;
    const bodyY = cardY + bannerH + 16;
    const bodyW = cardW - padX * 2;
    const bodyH = cardH - bannerH - 32;

    const gapCols = 34;
    const heroW = 1110;
    const smallColW = bodyW - heroW - gapCols;
    const smallColX = bodyX + heroW + gapCols;

    // ---------------- LEFT COLUMN: BIG HERO SPOTLIGHT ----------------
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    this.roundRect(ctx, bodyX, bodyY, heroW, bodyH, 18);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = dActive.accent;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Subtle Hero Header Tint (clipped cleanly inside Hero top radius)
    ctx.save();
    this.roundRect(ctx, bodyX + 1, bodyY + 1, heroW - 2, bodyH - 2, 17);
    if (typeof ctx.clip === 'function') ctx.clip();
    const hhGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX + heroW, bodyY + 76);
    hhGrad.addColorStop(0, dActive.lightBg);
    hhGrad.addColorStop(1, '#FFFFFF');
    ctx.fillStyle = hhGrad;
    ctx.fillRect(bodyX + 1, bodyY + 1, heroW - 2, 74);
    ctx.restore();

    // Hero Output Pill & Title
    ctx.fillStyle = dActive.accent;
    this.roundRect(ctx, bodyX + 20, bodyY + 16, 150, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, `OUTPUT 0${activeIdx + 1} / 05`, bodyX + 95, bodyY + 37, 138, 13.5, '900', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#0F172A';
    this.fillFittedText(ctx, `${dActive.title} — ${dActive.sub}`, bodyX + 184, bodyY + 34, 620, 22, '900', '"Prompt", sans-serif', 'left');
    ctx.fillStyle = '#475569';
    this.fillFittedText(ctx, `${dActive.tag}  ·  ${dActive.outFmt}  ·  คลิกภาพด้านล่างเพื่อซูม 1920×1080`, bodyX + 184, bodyY + 57, 620, 13, '600', '"Prompt", sans-serif', 'left');

    // Hero Controls: Prev / Next / Fullscreen Modal
    const modalBtnW = 144;
    const navBtnW = 42;
    const ctrlY = bodyY + 19;
    const modalBtnX = bodyX + heroW - modalBtnW - 20;
    const nextBtnX = modalBtnX - navBtnW - 8;
    const prevBtnX = nextBtnX - navBtnW - 8;

    this.automationControls.push({ action: 'prev', x: prevBtnX, y: ctrlY, w: navBtnW, h: 36 });
    this.automationControls.push({ action: 'next', x: nextBtnX, y: ctrlY, w: navBtnW, h: 36 });
    this.automationControls.push({ action: 'modal', x: modalBtnX, y: ctrlY, w: modalBtnW, h: 36 });

    [[prevBtnX, '◀'], [nextBtnX, '▶']].forEach(([bx, sym]) => {
      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, bx, ctrlY, navBtnW, 36, 9);
      ctx.fill();
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      this.fillFittedText(ctx, sym, bx + navBtnW / 2, ctrlY + 23, 28, 14, '900', 'sans-serif', 'center');
    });

    ctx.fillStyle = dActive.accent;
    this.roundRect(ctx, modalBtnX, ctrlY, modalBtnW, 36, 9);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, '🔍 ขยายเต็มจอ', modalBtnX + modalBtnW / 2, ctrlY + 23, modalBtnW - 14, 13, '800', '"Prompt", sans-serif', 'center');

    // Hero Large 16:9 Generated Visual Viewport
    const imgPadX = 18;
    const heroImgX = bodyX + imgPadX;
    const heroImgY = bodyY + 80;
    const heroImgW = heroW - imgPadX * 2;
    const heroImgH = 582;

    this.automationDocBox = { x: heroImgX, y: heroImgY, w: heroImgW, h: heroImgH };

    const slideOffset = (1 - easeOut) * 18;
    const kbZoom = 1.025 + 0.025 * Math.sin(tSec * 0.72) + (1 - easeOut) * 0.03;
    const kbPanX = Math.sin(tSec * 0.45) * 8 + slideOffset;
    const kbPanY = Math.cos(tSec * 0.38) * 6;

    const imgRect = this.drawFittedRoundedImage(ctx, activeImg, heroImgX, heroImgY, heroImgW, heroImgH, 14, kbZoom, kbPanX, kbPanY, dActive.accent);

    // Subtle Blueprint Sweep Line across Generated Visual
    ctx.save();
    this.roundRect(ctx, heroImgX, heroImgY, heroImgW, heroImgH, 14);
    if (typeof ctx.clip === 'function') ctx.clip();
    const scanY = heroImgY + ((tSec * 0.24) % 1) * heroImgH;
    const sGrad = ctx.createLinearGradient(heroImgX, scanY - 24, heroImgX, scanY + 24);
    sGrad.addColorStop(0, 'rgba(255,255,255,0)');
    sGrad.addColorStop(0.5, dActive.accent + '33');
    sGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sGrad;
    ctx.fillRect(heroImgX, scanY - 24, heroImgW, 48);
    ctx.restore();

    // Precision 4-Corner Brackets around Hero Viewport
    ctx.strokeStyle = dActive.accent;
    ctx.lineWidth = 2.4;
    const brLen = 22;
    [
      [heroImgX + 8, heroImgY + 8, 1, 1],
      [heroImgX + heroImgW - 8, heroImgY + 8, -1, 1],
      [heroImgX + 8, heroImgY + heroImgH - 8, 1, -1],
      [heroImgX + heroImgW - 8, heroImgY + heroImgH - 8, -1, -1]
    ].forEach(([cx, cy, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * brLen);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * brLen, cy);
      ctx.stroke();
    });

    // Interactive Floating 2x Magnifying Loupe
    this.drawMagnifyingLoupe(
      ctx,
      activeImg,
      { x: heroImgX, y: heroImgY, w: heroImgW, h: heroImgH },
      imgRect,
      dActive.loupeFocus,
      tSec,
      dActive.accent,
      dActive.loupeLabel
    );

    // Top-Left Generated Visual Live Tag Pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.80)';
    this.roundRect(ctx, heroImgX + 18, heroImgY + 18, 224, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#34D399';
    this.fillFittedText(ctx, `✨ GENERATED #0${activeIdx + 1} · 16:9 HD`, heroImgX + 130, heroImgY + 38, 206, 12.5, '800', '"Prompt", sans-serif', 'center');

    // Hero Bottom 4 Structured Specification Cards
    const specY = heroImgY + heroImgH + 14;
    const specH = bodyY + bodyH - specY - 22;
    const specGap = 12;
    const specW = (heroImgW - specGap * 3) / 4;

    const specs = [
      { hdr: '🏢 แผนกปลายทาง', line1: dActive.dept, line2: 'รับข้อมูลตรงจากระบบกลาง', hl: false },
      { hdr: '⚡ การประมวลผลอัตโนมัติ', line1: dActive.proc, line2: dActive.proc2, hl: false },
      { hdr: '📁 รูปแบบไฟล์ผลผลิต', line1: dActive.outFmt, line2: dActive.outFmt2, hl: false },
      { hdr: '✨ จุดเด่น & Value', line1: dActive.benefit, line2: dActive.benefit2, hl: true }
    ];

    specs.forEach((sp, si) => {
      const sx = heroImgX + si * (specW + specGap);
      ctx.fillStyle = sp.hl ? dActive.lightBg : '#F8FAFC';
      this.roundRect(ctx, sx, specY, specW, specH, 12);
      ctx.fill();
      ctx.strokeStyle = sp.hl ? dActive.accent : '#E2E8F0';
      ctx.lineWidth = sp.hl ? 1.8 : 1.2;
      ctx.stroke();

      // Accent top bar inside spec card
      ctx.fillStyle = sp.hl ? dActive.accent : '#CBD5E1';
      this.roundRect(ctx, sx + 14, specY + 14, 48, 4, 2);
      ctx.fill();

      ctx.fillStyle = sp.hl ? dActive.accent : '#64748B';
      this.fillFittedText(ctx, sp.hdr, sx + 14, specY + 46, specW - 24, 13.5, '800', '"Prompt", sans-serif', 'left');

      ctx.fillStyle = '#0F172A';
      this.fillFittedText(ctx, sp.line1, sx + 14, specY + 86, specW - 24, 16, '900', '"Prompt", sans-serif', 'left');

      ctx.fillStyle = '#475569';
      this.fillFittedText(ctx, sp.line2, sx + 14, specY + 118, specW - 24, 13, '600', '"Prompt", sans-serif', 'left');
    });

    // Bottom Auto-Cycle Progress Bar inside Hero Card
    const pBarX = heroImgX;
    const pBarY = bodyY + bodyH - 12;
    ctx.fillStyle = '#E2E8F0';
    this.roundRect(ctx, pBarX, pBarY, heroImgW, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = dActive.accent;
    this.roundRect(ctx, pBarX, pBarY, Math.max(10, heroImgW * (isAuto ? cycleProg : 1)), 5, 2.5);
    ctx.fill();
    ctx.restore();

    // ---------------- RIGHT COLUMN: 5 SMALL INTERACTIVE THUMBNAIL CARDS ----------------
    const smallGap = 12;
    const smallH = (bodyH - smallGap * (items.length - 1)) / items.length;
    let activeConnectorStartY = bodyY + smallH / 2;

    items.forEach((it, idx) => {
      const isFocused = idx === activeIdx;
      const isHovered = this.hoveredCard === ('auto_card_' + idx);
      const sx = smallColX - (isFocused ? 8 : 0);
      const sy = bodyY + idx * (smallH + smallGap);
      const sw = smallColW + (isFocused ? 8 : 0);

      if (isFocused) {
        activeConnectorStartY = sy + smallH / 2;
      }

      this.automationCards.push({ id: 'auto_card_' + idx, idx, x: sx, y: sy, w: sw, h: smallH });

      ctx.save();
      ctx.fillStyle = isFocused ? it.lightBg : (isHovered ? '#F8FAFC' : '#FFFFFF');
      ctx.shadowColor = isFocused ? 'rgba(15, 23, 42, 0.14)' : 'rgba(15, 23, 42, 0.04)';
      ctx.shadowBlur = isFocused ? 18 : 8;
      ctx.shadowOffsetY = isFocused ? 6 : 2;
      this.roundRect(ctx, sx, sy, sw, smallH, 14);
      ctx.fill();
      ctx.shadowColor = 'transparent';

      ctx.strokeStyle = isFocused ? it.accent : (isHovered ? it.accent : '#CBD5E1');
      ctx.lineWidth = isFocused ? 2.6 : (isHovered ? 1.8 : 1.2);
      ctx.stroke();

      // Left Miniature 16:9 Thumbnail of Generated Image
      const thumbW = 242;
      const thumbH = smallH - 24;
      const thumbX = sx + 12;
      const thumbY = sy + 12;
      const thumbImg = this.resolveDeliverableImage(it);
      this.drawFittedRoundedImage(ctx, thumbImg, thumbX, thumbY, thumbW, thumbH, 10, isFocused ? 1.04 : 1.0, 0, 0, it.accent);

      // Border + Number Badge on Thumbnail
      ctx.strokeStyle = isFocused ? it.accent : '#CBD5E1';
      ctx.lineWidth = 1.4;
      this.roundRect(ctx, thumbX, thumbY, thumbW, thumbH, 10);
      ctx.stroke();

      ctx.fillStyle = isFocused ? it.accent : 'rgba(15, 23, 42, 0.80)';
      this.roundRect(ctx, thumbX + 8, thumbY + 8, 42, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, `0${idx + 1}`, thumbX + 29, thumbY + 24, 34, 12.5, '900', '"Prompt", sans-serif', 'center');

      // Right Metadata inside Small Card
      const infoX = thumbX + thumbW + 14;
      const infoW = sw - thumbW - 38;

      ctx.fillStyle = it.accent;
      this.roundRect(ctx, infoX, sy + 16, 88, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, `OUTPUT 0${idx + 1}`, infoX + 44, sy + 31, 80, 11, '800', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#E2E8F0';
      this.roundRect(ctx, infoX + 94, sy + 16, 94, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#334155';
      this.fillFittedText(ctx, it.ext, infoX + 141, sy + 31, 84, 11, '800', 'monospace', 'center');

      if (isFocused) {
        ctx.fillStyle = '#0F172A';
        this.roundRect(ctx, infoX + infoW - 96, sy + 15, 96, 23, 6);
        ctx.fill();
        ctx.fillStyle = '#34D399';
        this.fillFittedText(ctx, '◀ ภาพใหญ่', infoX + infoW - 48, sy + 31, 88, 11, '800', '"Prompt", sans-serif', 'center');
      }

      ctx.fillStyle = '#0F172A';
      this.fillFittedText(ctx, it.title, infoX, sy + 64, infoW, 19, '900', '"Prompt", sans-serif', 'left');

      ctx.fillStyle = '#475569';
      this.fillFittedText(ctx, it.sub, infoX, sy + 88, infoW, 13, '600', '"Prompt", sans-serif', 'left');

      ctx.fillStyle = '#1E293B';
      this.fillFittedText(ctx, `🏢 ${it.dept}`, infoX, sy + 114, infoW, 12.5, '700', '"Prompt", sans-serif', 'left');

      // Bottom Live Progress / Hover Prompt Strip inside Small Card
      const barY = sy + smallH - 22;
      if (isFocused) {
        ctx.fillStyle = it.pillBg;
        this.roundRect(ctx, infoX, barY, infoW, 8, 4);
        ctx.fill();
        ctx.fillStyle = it.accent;
        this.roundRect(ctx, infoX, barY, Math.max(12, infoW * (isAuto ? cycleProg : 1)), 8, 4);
        ctx.fill();
      } else {
        ctx.fillStyle = isHovered ? it.accent : '#64748B';
        this.fillFittedText(ctx, 'คลิกเพื่อสลับขึ้นภาพใหญ่ด้านซ้าย ◀', infoX, barY + 6, infoW, 11.5, '700', '"Prompt", sans-serif', 'left');
      }
      ctx.restore();
    });

    // ---------------- GLOWING CONNECTOR BRIDGE (ACTIVE SMALL CARD -> BIG HERO) ----------------
    const bridgeStartX = smallColX - 8;
    const bridgeEndX = bodyX + heroW + 2;
    const bridgeEndY = heroImgY + heroImgH * 0.5;
    const midX = (bridgeStartX + bridgeEndX) / 2;

    ctx.save();
    ctx.strokeStyle = dActive.accent;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(bridgeStartX, activeConnectorStartY);
    if (typeof ctx.bezierCurveTo === 'function') {
      ctx.bezierCurveTo(midX, activeConnectorStartY, midX, bridgeEndY, bridgeEndX, bridgeEndY);
    } else {
      ctx.lineTo(bridgeEndX, bridgeEndY);
    }
    ctx.stroke();

    if (typeof ctx.arc === 'function') {
      const pulse = 5 + 2.5 * Math.sin(tSec * 5);
      ctx.fillStyle = dActive.accent;
      ctx.beginPath();
      ctx.arc(bridgeEndX, bridgeEndY, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(bridgeStartX, activeConnectorStartY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dActive.accent;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.restore();

    // 4. Optional Cinema Fullscreen Modal
    if (this.showAutomationModal) {
      this.drawDeliverablesModal(ctx, box, items, activeIdx);
    }

    ctx.restore();
  }

    // ==================== NEW CLEAN MINIMAL FLOWCHART (Matching user image media_1794550146611_ac6660f2.png) ====================
  drawCleanMinimalNewFlowchart(ctx, box, slide, animSec, nowSec) {
    ctx.save();

    // 1. Clean White Stage Card with Subtle Shadow
    const cardX = box.x + 8;
    const cardY = box.y + 6;
    const cardW = box.w - 16;
    const cardH = box.h - 12;

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Subtle dotted background grid (Clean architectural paper aesthetic)
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.035)';
    for (let gx = cardX + 32; gx < cardX + cardW - 20; gx += 32) {
      for (let gy = cardY + 32; gy < cardY + cardH - 20; gy += 32) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Top-right: Style Toggle Buttons [ ✨ สไตล์ 1: Clean Minimal ] [ 🌙 สไตล์ 2: Ver 2 Dark ]
    const styleTabs = [
      { id: 'clean-minimal', label: '✨ สไตล์ 1: Clean Minimal (รูป New)' },
      { id: 'ver2-dark', label: '🌙 สไตล์ 2: Ver 2 Dark Studio' }
    ];
    this.parallelStyleTabs = [];
    const sTabW = 230;
    const sTabH = 36;
    const sTabY = cardY + 16;
    const sTabStartX = cardX + cardW - (sTabW * 2 + 10) - 20;

    styleTabs.forEach((st, idx) => {
      const tx = sTabStartX + idx * (sTabW + 10);
      const isCur = (this.parallelBranchStyle || 'clean-minimal') === st.id;
      this.parallelStyleTabs.push({ id: st.id, x: tx, y: sTabY, w: sTabW, h: sTabH });

      ctx.fillStyle = isCur ? '#059669' : '#F1F5F9';
      this.roundRect(ctx, tx, sTabY, sTabW, sTabH, 9);
      ctx.fill();
      ctx.strokeStyle = isCur ? '#047857' : '#CBD5E1';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      ctx.fillStyle = isCur ? '#FFFFFF' : '#475569';
      this.fillFittedText(ctx, st.label, tx + sTabW / 2, sTabY + 23, sTabW - 16, 13, isCur ? '800' : '600', '"Prompt", sans-serif', 'center');
    });

    // 2. MAIN FLOW LAYOUT (Centered Vertically - Matching media_1794555223983_03d338b9.png)
    const centerY = cardY + cardH / 2;
    const branchGap = 92;
    const bY1 = centerY - 1.5 * branchGap;  // PartItems ── Purchase ──┐
    const bY2 = centerY - 0.5 * branchGap;  // Job Order / Picking List ──➔
    const bY3 = centerY + 0.5 * branchGap;  // SB List ➔ [ CAD EE Puning ] ── Lantex ── Cutting BP ──┐
    const bY4 = centerY + 1.5 * branchGap;  // 2D & 3D Drawing ──────────────────────────────────┘

    // 2.1 INPUT BOX: OTF (Forcon.)
    const otfBoxX = cardX + 70;
    const otfBoxW = 160;
    const otfBoxH = 92;
    const otfBoxY = centerY - otfBoxH / 2;

    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, otfBoxX, otfBoxY, otfBoxW, otfBoxH, 16);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    this.fillFittedText(ctx, 'OTF', otfBoxX + otfBoxW / 2, otfBoxY + 38, otfBoxW - 20, 24, '800', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = '#64748B';
    this.fillFittedText(ctx, '(Forcon.)', otfBoxX + otfBoxW / 2, otfBoxY + 68, otfBoxW - 20, 16, '600', '"Prompt", sans-serif', 'center');

    // 2.2 CORE HUB BOX: Auto BOM & Drawing (SketchUp)
    const hubBoxX = otfBoxX + otfBoxW + 55;
    const hubBoxW = 270;
    const hubBoxH = 96;
    const hubBoxY = centerY - hubBoxH / 2;

    // Arrow from OTF to Auto BOM
    this.drawCleanOrthogonalPipe(ctx, [
      { x: otfBoxX + otfBoxW, y: centerY },
      { x: hubBoxX, y: centerY }
    ], '#059669', true, nowSec, 1.2, 10);

    // Auto BOM Box
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, hubBoxX, hubBoxY, hubBoxW, hubBoxH, 18);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3.0;
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    this.fillFittedText(ctx, 'Auto BOM & Drawing', hubBoxX + hubBoxW / 2, hubBoxY + 42, hubBoxW - 24, 21, '800', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = '#334155';
    this.fillFittedText(ctx, '(SketchUp)', hubBoxX + hubBoxW / 2, hubBoxY + 72, hubBoxW - 24, 16.5, '600', '"Prompt", sans-serif', 'center');

    // 2.3 FAN-OUT BUS FROM AUTO BOM TO 4 BRANCHES
    const trunkX = hubBoxX + hubBoxW + 36;

    // Horizontal line from hub right edge to trunkX
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(hubBoxX + hubBoxW, centerY);
    ctx.lineTo(trunkX, centerY);
    ctx.stroke();

    // Vertical bus line spanning bY1 to bY4
    ctx.beginPath();
    ctx.moveTo(trunkX, bY1);
    ctx.lineTo(trunkX, bY4);
    ctx.stroke();

    // 2.4 DESTINATION: Production (Centered at centerY)
    const destBoxW = 220;
    const destBoxH = 96;
    const destBoxX = cardX + cardW - destBoxW - 60;
    const destBoxY = centerY - destBoxH / 2;

    // Production Box (Light mint pastel background)
    ctx.fillStyle = '#D1FAE5';
    this.roundRect(ctx, destBoxX, destBoxY, destBoxW, destBoxH, 18);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    this.fillFittedText(ctx, 'Production', destBoxX + destBoxW / 2, destBoxY + 56, destBoxW - 30, 26, '800', '"Prompt", sans-serif', 'center');

    // 2.5 FOUR PARALLEL BRANCHES
    const bStartX = trunkX + 38;

    // ----- BRANCH 1: PartItems ── Purchase ──────────────────────────────────┐ ➔ Production -----
    this.drawCleanOrthogonalPipe(ctx, [
      { x: trunkX, y: bY1 },
      { x: bStartX - 10, y: bY1 }
    ], '#059669', false, nowSec, 1.2, 8);

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 19px "Prompt", sans-serif';
    ctx.fillText('PartItems', bStartX, bY1 + 6);
    const partW = ctx.measureText('PartItems').width;

    const partToPurchLineStartX = bStartX + partW + 16;
    const partToPurchLineEndX = partToPurchLineStartX + 75;

    // Line between PartItems and Purchase
    this.drawCleanOrthogonalPipe(ctx, [
      { x: partToPurchLineStartX, y: bY1 },
      { x: partToPurchLineEndX, y: bY1 }
    ], '#059669', false, nowSec, 1.2, 8);

    // Text: Purchase
    const purchX = partToPurchLineEndX + 16;
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 19px "Prompt", sans-serif';
    ctx.fillText('Purchase', purchX, bY1 + 6);
    const purchW = ctx.measureText('Purchase').width;

    // Line from Purchase turning down into Production top edge
    const turnDownX = destBoxX + destBoxW * 0.65;
    this.drawCleanOrthogonalPipe(ctx, [
      { x: purchX + purchW + 16, y: bY1 },
      { x: turnDownX, y: bY1 },
      { x: turnDownX, y: destBoxY }
    ], '#059669', true, nowSec, 1.3, 10);

    // ----- BRANCH 2: Job Order / Picking List ────────────────────────────────➔ Production -----
    this.drawCleanOrthogonalPipe(ctx, [
      { x: trunkX, y: bY2 },
      { x: bStartX - 10, y: bY2 }
    ], '#059669', false, nowSec, 1.2, 8);

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 19px "Prompt", sans-serif';
    ctx.fillText('Job Order / Picking List', bStartX, bY2 + 6);
    const jobW = ctx.measureText('Job Order / Picking List').width;

    // Line straight into Production left edge
    this.drawCleanOrthogonalPipe(ctx, [
      { x: bStartX + jobW + 18, y: bY2 },
      { x: destBoxX, y: bY2 }
    ], '#059669', true, nowSec, 1.3, 10);

    // ----- BRANCH 3: SB List ➔ CAD EE Puning ── Lantex ── Cutting BP ────────┐ ➔ Production -----
    this.drawCleanOrthogonalPipe(ctx, [
      { x: trunkX, y: bY3 },
      { x: bStartX - 10, y: bY3 }
    ], '#059669', false, nowSec, 1.2, 8);

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 19px "Prompt", sans-serif';
    ctx.fillText('SB List', bStartX, bY3 + 6);
    const sbW = ctx.measureText('SB List').width;

    // Arrow from SB List to CAD EE Puning box
    const cadBoxX = bStartX + sbW + 42;
    const cadBoxW = 175;
    const cadBoxH = 46;
    const cadBoxY = bY3 - cadBoxH / 2;

    this.drawCleanOrthogonalPipe(ctx, [
      { x: bStartX + sbW + 10, y: bY3 },
      { x: cadBoxX, y: bY3 }
    ], '#059669', true, nowSec, 1.2, 8);

    // CAD EE Puning Box (Clean minimal style, no star)
    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, cadBoxX, cadBoxY, cadBoxW, cadBoxH, 12);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.fillStyle = '#065F46';
    this.fillFittedText(ctx, 'CAD EE Puning', cadBoxX + cadBoxW / 2, cadBoxY + 28, cadBoxW - 16, 16.5, '800', '"Prompt", sans-serif', 'center');

    // Line from CAD EE Puning to Lantex
    const lantexStartX = cadBoxX + cadBoxW + 14;
    const lantexEndX = lantexStartX + 42;
    this.drawCleanOrthogonalPipe(ctx, [
      { x: lantexStartX, y: bY3 },
      { x: lantexEndX, y: bY3 }
    ], '#059669', false, nowSec, 1.2, 8);

    // Text: Lantex
    const lantexX = lantexEndX + 14;
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 19px "Prompt", sans-serif';
    ctx.fillText('Lantex', lantexX, bY3 + 6);
    const lantexW = ctx.measureText('Lantex').width;

    // Line from Lantex to Cutting BP
    const cutLineStartX = lantexX + lantexW + 14;
    const cutLineEndX = cutLineStartX + 42;
    this.drawCleanOrthogonalPipe(ctx, [
      { x: cutLineStartX, y: bY3 },
      { x: cutLineEndX, y: bY3 }
    ], '#059669', false, nowSec, 1.2, 8);

    // Text: Cutting BP
    const cutX = cutLineEndX + 14;
    ctx.fillStyle = '#0F172A';
    ctx.font = '800 19px "Prompt", sans-serif';
    ctx.fillText('Cutting BP', cutX, bY3 + 6);
    const cutW = ctx.measureText('Cutting BP').width;

    // Line from Cutting BP turning UP into Production
    const b3TurnUpX = destBoxX - 18;
    this.drawCleanOrthogonalPipe(ctx, [
      { x: cutX + cutW + 14, y: bY3 },
      { x: b3TurnUpX, y: bY3 },
      { x: b3TurnUpX, y: destBoxY + destBoxH - 18 },
      { x: destBoxX, y: destBoxY + destBoxH - 18 }
    ], '#059669', true, nowSec, 1.3, 10);

    // ----- BRANCH 4: 2D & 3D Drawing ────────────────────────────────────────┐ ➔ Production -----
    this.drawCleanOrthogonalPipe(ctx, [
      { x: trunkX, y: bY4 },
      { x: bStartX - 10, y: bY4 }
    ], '#059669', false, nowSec, 1.2, 8);

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 19px "Prompt", sans-serif';
    ctx.fillText('2D & 3D Drawing', bStartX, bY4 + 6);
    const dwgW = ctx.measureText('2D & 3D Drawing').width;

    // Line from 2D & 3D Drawing turning UP into Production
    const b4TurnUpX = destBoxX - 8;
    this.drawCleanOrthogonalPipe(ctx, [
      { x: bStartX + dwgW + 18, y: bY4 },
      { x: b4TurnUpX, y: bY4 },
      { x: b4TurnUpX, y: destBoxY + destBoxH - 6 },
      { x: destBoxX, y: destBoxY + destBoxH - 6 }
    ], '#059669', true, nowSec, 1.3, 10);

    ctx.restore();
  }


  // ==================== SCENE 04: NEW WORKFLOW 4-BRANCH PARALLEL PIPELINE ====================
  drawParallelBranchSplitScene(ctx, box, slide, animSec, nowSec) {
    if (this.parallelBranchStyle !== 'ver2-dark') {
      this.drawCleanMinimalNewFlowchart(ctx, box, slide, animSec, nowSec);
      return;
    }

    ctx.save();

    // Top Header Badge Bar
    ctx.save();
    ctx.fillStyle = '#5933A9';
    this.roundRect(ctx, box.x + 8, box.y + 4, 495, 54, 27);
    ctx.fill();
    ctx.strokeStyle = '#F48C56';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#85DCC9';
    this.fillFittedText(ctx, '[2] NEW WORKFLOW: 4 PARALLEL BRANCHES', box.x + 28, box.y + 38, 455, 20, '800', '"Prompt", sans-serif');

    ctx.fillStyle = '#84D3BD';
    this.roundRect(ctx, box.x + 520, box.y + 8, 720, 46, 23);
    ctx.fill();
    ctx.strokeStyle = '#EB8B55';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, '①+②+③ = ① Auto BOM & Drawing (SketchUp) ➔ แยก 4 สายงานคู่ขนาน ➔ Production', box.x + 880, box.y + 38, 690, 16.5, '800', '"Prompt", sans-serif', 'center');

    // Style Switcher Tabs on Ver 2 Dark (Allowing instant return to Clean Minimal)
    const styleTabs = [
      { id: 'clean-minimal', label: '✨ สไตล์ 1: Clean Minimal' },
      { id: 'ver2-dark', label: '🌙 สไตล์ 2: Ver 2 Dark' }
    ];
    this.parallelStyleTabs = [];
    const sTabW = 185;
    const sTabH = 40;
    const sTabY = box.y + 11;
    const sTabStartX = box.x + box.w - (sTabW * 2 + 10) - 10;

    styleTabs.forEach((st, idx) => {
      const tx = sTabStartX + idx * (sTabW + 10);
      const isCur = this.parallelBranchStyle === st.id;
      this.parallelStyleTabs.push({ id: st.id, x: tx, y: sTabY, w: sTabW, h: sTabH });

      ctx.fillStyle = isCur ? '#EB8B55' : 'rgba(255, 255, 255, 0.15)';
      this.roundRect(ctx, tx, sTabY, sTabW, sTabH, 10);
      ctx.fill();
      ctx.strokeStyle = isCur ? '#F48C56' : 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, st.label, tx + sTabW / 2, sTabY + 26, sTabW - 14, 13.5, isCur ? '800' : '600', '"Prompt", sans-serif', 'center');
    });
    ctx.restore();

    // Helper for drawing clean orthogonal rounded pipes with a single traveling laser pulse
    const drawCleanPipe = (pts, col = '#F58245', hasArrow = true, speed = 1.0, radius = 14) => {
      this.drawCleanOrthogonalPipe(ctx, pts, col, hasArrow, nowSec, speed, radius);
    };

    // Main Teal Card Frame (matching Ver 2 color theme)
    const cardY = box.y + 68;
    const cardH = box.h - 78;
    ctx.fillStyle = 'rgba(76, 165, 139, 0.88)';
    this.roundRect(ctx, box.x + 8, cardY, box.w - 16, cardH, 28);
    ctx.fill();
    ctx.strokeStyle = '#EB9362';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Left Prerequisite Box: Database & Rules
    ctx.fillStyle = '#B4BEF2';
    this.roundRect(ctx, box.x + 28, cardY + 28, 235, 168, 22);
    ctx.fill();
    ctx.strokeStyle = '#5933A9';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    ctx.fillStyle = '#5933A9';
    this.roundRect(ctx, box.x + 48, cardY + 14, 195, 28, 14);
    ctx.fill();
    ctx.fillStyle = '#85DCC9';
    this.fillFittedText(ctx, '★ CORE PREREQUISITES', box.x + 145, cardY + 33, 180, 13.5, '800', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, '• Database (MIM, IM)', box.x + 44, cardY + 76, 205, 18, '800', '"Prompt", sans-serif');
    this.fillFittedText(ctx, '• Coding Rule', box.x + 44, cardY + 116, 205, 18, '800', '"Prompt", sans-serif');
    this.fillFittedText(ctx, '• Planing Rule', box.x + 44, cardY + 156, 205, 18, '800', '"Prompt", sans-serif');

    // OTF (Forcon.) Lavender Input Circle
    const otfX = box.x + 145, otfY = cardY + 355, otfR = 74;
    ctx.fillStyle = '#B4BEF2';
    ctx.beginPath();
    ctx.arc(otfX, otfY, otfR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5933A9';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'OTF', otfX, otfY - 8, 115, 30, '800', '"Prompt", sans-serif', 'center');
    this.fillFittedText(ctx, '(Forcon.)', otfX, otfY + 24, 120, 20, '700', '"Prompt", sans-serif', 'center');

    // Arrow from Rules & OTF into Auto BOM & Drawing
    this.drawVer2BlockArrow(ctx, otfX + otfR - 6, otfY, box.x + 300, otfY, nowSec, 16);
    this.drawVer2BlockArrow(ctx, box.x + 263, cardY + 112, box.x + 300, cardY + 220, nowSec + 0.2, 14);

    // Formula Badge above Auto BOM: ① + ② + ③ = ①
    ctx.fillStyle = '#5933A9';
    this.roundRect(ctx, box.x + 300, cardY + 48, 250, 40, 20);
    ctx.fill();
    ctx.strokeStyle = '#F48C56';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#85DCC9';
    this.fillFittedText(ctx, '① + ② + ③ = ①', box.x + 425, cardY + 76, 220, 21, '800', '"Prompt", sans-serif', 'center');

    // 4 Parallel Branch Y Coordinates (Clean 135px vertical rhythm)
    const bY1 = cardY + 115;  // Branch 1: PartItems ➔ MRP ➔ Purchase ➔ PO Auto ➔ Supplier ➔ Supply
    const bY2 = cardY + 250;  // Branch 2: Job Order / Picking List
    const bY3 = cardY + 385;  // Branch 3: SB List ➔ CAD EE Puning ➔ Lantex ➔ Cutting BP
    const bY4 = cardY + 520;  // Branch 4: 2D & 3D Drawing

    // Main Hub Box: Auto BOM & Drawing (SketchUp) — Centered with the 4 branches
    const hubBoxX = box.x + 300;
    const hubBoxY = cardY + 95;
    const hubBoxW = 250;
    const hubBoxH = 445;

    ctx.fillStyle = '#FA8E4F';
    this.roundRect(ctx, hubBoxX, hubBoxY, hubBoxW, hubBoxH, 30);
    ctx.fill();
    ctx.strokeStyle = '#5933A9';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Auto BOM Badge
    ctx.fillStyle = '#5933A9';
    this.roundRect(ctx, hubBoxX + 48, hubBoxY - 18, 155, 36, 18);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, '★ Auto BOM', hubBoxX + 125, hubBoxY + 6, 135, 19, '800', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'Auto BOM &', hubBoxX + hubBoxW / 2, hubBoxY + 80, hubBoxW - 30, 28, '800', '"Prompt", sans-serif', 'center');
    this.fillFittedText(ctx, 'Drawing', hubBoxX + hubBoxW / 2, hubBoxY + 120, hubBoxW - 30, 28, '800', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = '#1F2937';
    this.fillFittedText(ctx, '(SketchUp)', hubBoxX + hubBoxW / 2, hubBoxY + 168, hubBoxW - 30, 22, '700', '"Prompt", sans-serif', 'center');

    ctx.strokeStyle = 'rgba(17, 24, 39, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hubBoxX + 24, hubBoxY + 205);
    ctx.lineTo(hubBoxX + hubBoxW - 24, hubBoxY + 205);
    ctx.stroke();

    ctx.fillStyle = '#5933A9';
    this.fillFittedText(ctx, '★ Unified 3D Model', hubBoxX + hubBoxW / 2, hubBoxY + 248, hubBoxW - 30, 19, '800', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'ถอด BOM & เจาะไฟ Auto', hubBoxX + hubBoxW / 2, hubBoxY + 288, hubBoxW - 30, 16.5, '700', '"Prompt", sans-serif', 'center');
    this.fillFittedText(ctx, 'พร้อมกระจาย 4 สายงาน', hubBoxX + hubBoxW / 2, hubBoxY + 322, hubBoxW - 30, 16.5, '700', '"Prompt", sans-serif', 'center');

    // Clean Orthogonal Fan-out trunk from Auto BOM to 4 branches
    const splitX = box.x + 595;
    const trunkCenterY = hubBoxY + hubBoxH / 2;
    ctx.strokeStyle = '#F58245';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(hubBoxX + hubBoxW, trunkCenterY);
    ctx.lineTo(splitX, trunkCenterY);
    ctx.stroke();

    // Clean feeder lines from trunk to 4 branches
    [bY1, bY2, bY3, bY4].forEach((by) => {
      drawCleanPipe([
        { x: splitX, y: trunkCenterY },
        { x: splitX, y: by },
        { x: box.x + 635, y: by }
      ], '#F58245', true, 1.2, 12);
    });

    // -------------------- RIGHT DESTINATION: Production (Ends here, Zero Installation) --------------------
    const rightBoxW = 215;
    const rightBoxX = box.x + box.w - rightBoxW - 38;

    // Production Box (Extended height, centered, ends at Production)
    const prodY = cardY + 200;
    const prodH = 340;
    ctx.fillStyle = '#84D3BD';
    this.roundRect(ctx, rightBoxX, prodY, rightBoxW, prodH, 24);
    ctx.fill();
    ctx.strokeStyle = '#5933A9';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = '#5933A9';
    this.roundRect(ctx, rightBoxX + 24, prodY - 16, rightBoxW - 48, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#85DCC9';
    this.fillFittedText(ctx, 'FACTORY STAGE', rightBoxX + rightBoxW / 2, prodY + 5, rightBoxW - 60, 13.5, '800', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'Production', rightBoxX + rightBoxW / 2, prodY + 90, rightBoxW - 30, 32, '900', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = '#1F2937';
    this.fillFittedText(ctx, 'ประกอบผนัง ±1mm', rightBoxX + rightBoxW / 2, prodY + 140, rightBoxW - 30, 18, '700', '"Prompt", sans-serif', 'center');
    this.fillFittedText(ctx, 'โครง+ฉนวน+แผ่น+ไฟ', rightBoxX + rightBoxW / 2, prodY + 175, rightBoxW - 30, 16, '600', '"Prompt", sans-serif', 'center');

    // Hero Tag at bottom of Production Box
    ctx.fillStyle = '#5933A9';
    this.roundRect(ctx, rightBoxX + 16, prodY + 225, rightBoxW - 32, 42, 21);
    ctx.fill();
    ctx.fillStyle = '#85DCC9';
    this.fillFittedText(ctx, '✓ จบที่ฝ่ายผลิต', rightBoxX + rightBoxW / 2, prodY + 252, rightBoxW - 40, 16.5, '800', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'Production Ready', rightBoxX + rightBoxW / 2, prodY + 300, rightBoxW - 30, 15, '700', '"Prompt", sans-serif', 'center');

    // -------------------- BRANCH 1: PartItems ➔ MRP ➔ Purchase ➔ ★ PO Auto ➔ Supplier ➔ Supply --------------------
    ctx.fillStyle = '#FA8E4F';
    this.roundRect(ctx, box.x + 635, bY1 - 27, 140, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'PartItems', box.x + 705, bY1 + 8, 120, 19, '800', '"Prompt", sans-serif', 'center');

    drawCleanPipe([{ x: box.x + 775, y: bY1 }, { x: box.x + 855, y: bY1 }], '#F58245', true, 1.3);
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, 'MRP', box.x + 815, bY1 - 15, 68, 16, '800', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#FA8E4F';
    this.roundRect(ctx, box.x + 855, bY1 - 27, 135, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'Purchase', box.x + 922, bY1 + 8, 115, 19, '800', '"Prompt", sans-serif', 'center');

    drawCleanPipe([{ x: box.x + 990, y: bY1 }, { x: box.x + 1035, y: bY1 }], '#F58245', true, 1.3);

    // ★ PO Auto & Send Email Mint Highlight Box
    ctx.fillStyle = '#84D3BD';
    this.roundRect(ctx, box.x + 1035, bY1 - 32, 235, 64, 18);
    ctx.fill();
    ctx.strokeStyle = '#5933A9';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#5933A9';
    this.fillFittedText(ctx, '★ Automation', box.x + 1152, bY1 - 10, 215, 14.5, '800', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'PO Auto & Send Email', box.x + 1152, bY1 + 18, 220, 17, '800', '"Prompt", sans-serif', 'center');

    drawCleanPipe([{ x: box.x + 1270, y: bY1 }, { x: box.x + 1315, y: bY1 }], '#84D3BD', true, 1.5);

    ctx.fillStyle = '#FA8E4F';
    this.roundRect(ctx, box.x + 1315, bY1 - 27, 115, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'Supplier', box.x + 1372, bY1 + 8, 100, 19, '800', '"Prompt", sans-serif', 'center');

    drawCleanPipe([{ x: box.x + 1430, y: bY1 }, { x: box.x + 1465, y: bY1 }], '#F58245', true, 1.3);

    ctx.fillStyle = '#FA8E4F';
    this.roundRect(ctx, box.x + 1465, bY1 - 27, 110, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'Supply', box.x + 1520, bY1 + 8, 95, 19, '800', '"Prompt", sans-serif', 'center');

    // Clean Orthogonal Line from Supply into TOP of Production (90° smooth turn)
    drawCleanPipe([
      { x: box.x + 1575, y: bY1 },
      { x: rightBoxX + rightBoxW / 2, y: bY1 },
      { x: rightBoxX + rightBoxW / 2, y: prodY }
    ], '#10B981', true, 1.4, 16);

    // -------------------- BRANCH 2: Job Order / Picking List --------------------
    ctx.fillStyle = '#FA8E4F';
    this.roundRect(ctx, box.x + 635, bY2 - 27, 280, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'Job Order / Picking List', box.x + 775, bY2 + 8, 255, 19, '800', '"Prompt", sans-serif', 'center');

    // Clean Straight Line from Job Order directly into CENTER of Production
    drawCleanPipe([
      { x: box.x + 915, y: bY2 },
      { x: rightBoxX, y: bY2 }
    ], '#F58245', true, 1.3);

    // -------------------- BRANCH 3: SB List ➔ ★ CAD EE Puning ➔ Lantex ➔ Cutting BP --------------------
    ctx.fillStyle = '#FA8E4F';
    this.roundRect(ctx, box.x + 635, bY3 - 27, 120, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'SB List', box.x + 695, bY3 + 8, 100, 19, '800', '"Prompt", sans-serif', 'center');

    drawCleanPipe([{ x: box.x + 755, y: bY3 }, { x: box.x + 800, y: bY3 }], '#F58245', true, 1.3);

    // ★ CAD EE Punching Mint Box
    ctx.fillStyle = '#84D3BD';
    this.roundRect(ctx, box.x + 800, bY3 - 34, 210, 68, 20);
    ctx.fill();
    ctx.strokeStyle = '#5933A9';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#5933A9';
    this.fillFittedText(ctx, '★ AUTOMATED', box.x + 905, bY3 - 10, 190, 14, '800', '"Prompt", sans-serif', 'center');
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'CAD EE Punching', box.x + 905, bY3 + 17, 195, 20, '800', '"Prompt", sans-serif', 'center');

    drawCleanPipe([{ x: box.x + 1010, y: bY3 }, { x: box.x + 1060, y: bY3 }], '#84D3BD', true, 1.5);

    ctx.fillStyle = '#FA8E4F';
    this.roundRect(ctx, box.x + 1060, bY3 - 27, 115, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'Lantek', box.x + 1117, bY3 + 8, 100, 19, '800', '"Prompt", sans-serif', 'center');

    drawCleanPipe([{ x: box.x + 1175, y: bY3 }, { x: box.x + 1225, y: bY3 }], '#F58245', true, 1.3);

    ctx.fillStyle = '#FA8E4F';
    this.roundRect(ctx, box.x + 1225, bY3 - 27, 145, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, 'Cutting BP', box.x + 1297, bY3 + 8, 130, 19, '800', '"Prompt", sans-serif', 'center');

    // Clean Orthogonal Line from Cutting BP into LOWER-LEFT of Production (90° smooth turns)
    drawCleanPipe([
      { x: box.x + 1370, y: bY3 },
      { x: rightBoxX - 35, y: bY3 },
      { x: rightBoxX - 35, y: prodY + 125 },
      { x: rightBoxX, y: prodY + 125 }
    ], '#F58245', true, 1.3, 14);

    // -------------------- BRANCH 4: 2D & 3D Drawing --------------------
    ctx.fillStyle = '#FA8E4F';
    this.roundRect(ctx, box.x + 635, bY4 - 27, 230, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, '2D & 3D Drawing', box.x + 750, bY4 + 8, 205, 19, '800', '"Prompt", sans-serif', 'center');

    // Clean Orthogonal Line from 2D & 3D Drawing into BOTTOM-LEFT of Production (90° smooth turns)
    drawCleanPipe([
      { x: box.x + 865, y: bY4 },
      { x: rightBoxX - 65, y: bY4 },
      { x: rightBoxX - 65, y: prodY + 155 },
      { x: rightBoxX, y: prodY + 155 }
    ], '#F58245', true, 1.3, 14);

    // Bottom Summary Banner
    const footY = cardY + cardH - 60;
    ctx.fillStyle = 'rgba(35, 40, 41, 0.85)';
    this.roundRect(ctx, box.x + 28, footY, box.w - 56, 46, 23);
    ctx.fill();
    ctx.strokeStyle = '#F48C56';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#85DCC9';
    this.fillFittedText(
      ctx,
      '★ ผังกระบวนการ New Workflow: รวมศูนย์ข้อมูลโมเดลเดียว ➔ ลด Human Error ➔ แม่นยำระดับมิลลิเมตร',
      box.x + box.w / 2,
      footY + 29,
      box.w - 90,
      17,
      '700',
      '"Prompt", sans-serif',
      'center'
    );

    ctx.restore();
  }

  // ==================== SCENE 05: ROUTE 1 DEEP-DIVE (ENGINEERS READING BLUEPRINT -> CREW ASSEMBLING WALL -> DWG CHECK) ====================
  drawPipelineRoute1Scene(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    const nodes = slide.nodes || [];
    const count = 4;
    const gap = Math.max(28, box.w * 0.032);
    const cardW = (box.w - 30 - gap * (count - 1)) / count;
    const cardH = 232;
    const topY = box.y + 10;

    // Timeline Budget: Total duration (default 22 seconds).
    // 4 Steps: 1.1 (5.5s) -> 1.2 (5.5s) -> 1.3 (5.5s) -> 1.4 (5.5s)
    // Starts strictly at Step 1.1 (animSec = 0) upon opening!
    const totalDuration = slide.duration || 22;
    const stepDuration = totalDuration / count;
    const loopSec = animSec % totalDuration;
    const activeIdx = Math.min(count - 1, Math.floor(loopSec / stepDuration));
    const stepT = (loopSec % stepDuration) / stepDuration;

    const r1StepImgs = [
      this.illus && this.illus.r1Step1,
      this.illus && this.illus.r1Step2,
      this.illus && this.illus.r1Step3,
      this.illus && this.illus.r1Step4
    ];

    const fallbackNodes = [
      {
        code: 'STEP 1.1',
        label: 'ถอดแบบ 3D',
        sub: 'คู่มือประกอบ Step 1-2-3',
        handoff: '📋 ส่งแบบหน้างาน',
        inputDetail: 'รับโมเดล 3D และรหัส SKU จากศูนย์กลาง',
        processDetail: 'สร้างคู่มือติดตั้งและแบบแผ่นคลี่แยกชิ้น',
        outputDetail: 'ส่งชุดพิมพ์เขียวคู่มือประกอบ #DW-01..12 สู่หน้างาน'
      },
      {
        code: 'STEP 1.2',
        label: 'คนอ่านแบบเทียบ Part',
        sub: 'กางแบบเทียบรหัสชิ้นงานจริง',
        handoff: '🔍 จับคู่รหัส Part',
        inputDetail: 'รับแบบประกอบ + ชิ้นส่วนสโตร์ & ชิ้นส่วนตัดพิเศษ',
        processDetail: 'ช่างกางแบบอ่านลำดับ 1-2-3 เทียบรหัสชิ้นงานจริง',
        outputDetail: 'จัดเรียงชิ้นส่วนตามลำดับ พร้อมเริ่มตั้งโครง'
      },
      {
        code: 'STEP 1.3',
        label: 'ทำงานประกอบจริง',
        sub: 'ยึดโครง-ใส่ฉนวน-กรุแผ่น (±1mm)',
        handoff: '🔨 ประกอบจริง ±1mm',
        inputDetail: 'ทีมช่างประจำจุดติดตั้ง พร้อมโครง C75 และแผ่นผนัง',
        processDetail: 'หัวหน้าถือแบบกำกับ ช่างยิงสกรูยึดโครงและกรุแผ่น',
        outputDetail: 'ประกอบโครงและผนังเข้าล็อกแม่นยำ ไม่ต้องตัดแก้'
      },
      {
        code: 'STEP 1.4',
        label: 'ตรวจเช็คเทียบ DWG',
        sub: 'ตรวจแนวระดับและบล็อกไฟ 100%',
        handoff: '✅ ผ่านตรวจ DWG',
        inputDetail: 'ผนังที่ประกอบเสร็จสมบูรณ์ + ไฟล์แบบ DWG',
        processDetail: 'วิศวกรถือแท็บเล็ตตรวจแนวระดับ ดิ่งฉาก และบล็อกไฟ',
        outputDetail: 'ผ่านการตรวจสอบคุณภาพ 100% (Zero Rework)'
      }
    ];

    for (let i = 0; i < count; i++) {
      const cardStartT = 0.05 + i * 0.08;
      const cardEnt = this.getBoxEntrance(animSec, cardStartT, 0.30);
      const nd = nodes[i] || fallbackNodes[i];
      const cx = box.x + 15 + i * (cardW + gap);
      const isAct = activeIdx === i;

      if (i < count - 1) {
        const arrowStartT = cardStartT + 0.06;
        const arrowEnt = this.getBoxEntrance(animSec, arrowStartT, 0.28);
        if (arrowEnt.visible) {
          ctx.save();
          ctx.globalAlpha *= arrowEnt.alpha;
          const arrowY = topY + cardH / 2;
          this.drawThickRedHandoffArrow(ctx, cx + cardW, arrowY, cx + cardW + gap, arrowY, nowSec + i * 0.25);

          const nextNd = nodes[i + 1] || fallbackNodes[i + 1];
          const badgeTxt = nd.handoffOut || nd.handoff || fallbackNodes[i].handoff || nextNd.code;
          const midX = cx + cardW + gap / 2;
          const bw = Math.min(168, gap + 92);
          const bh = 26;
          ctx.fillStyle = isAct ? '#C84B31' : '#2E6F56';
          this.roundRect(ctx, midX - bw / 2, arrowY - 42, bw, bh, 13);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          this.fillFittedText(ctx, badgeTxt, midX, arrowY - 24, bw - 14, 11.5, '700', '"Prompt", sans-serif', 'center');
          ctx.restore();
        }
      }

      if (cardEnt.visible) {
        ctx.save();
        ctx.globalAlpha *= cardEnt.alpha;
        const centerX = cx + cardW / 2;
        const centerY = topY + cardH / 2;
        ctx.translate(centerX, centerY + cardEnt.yOffset);
        ctx.scale(cardEnt.scale, cardEnt.scale);
        ctx.translate(-centerX, -centerY);
        this.drawJapaneseBlueprintBorderCard(ctx, cx, topY, cardW, cardH, nd, '#2E6F56', isAct, r1StepImgs[i]);
        ctx.restore();
      }
    }

    // ==================== BOTTOM AREA: LEFT COHESIVE ISOMETRIC VIEWPORT + RIGHT 4-STEP HANDOFF BREAKDOWN MATRIX ====================
    const botY = topY + cardH + 22;
    const botH = box.h - cardH - 36;
    if (botH <= 140) {
      ctx.restore();
      return;
    }

    const botEnt = this.getBoxEntrance(animSec, 0.12, 0.32);
    if (!botEnt.visible) {
      ctx.restore();
      return;
    }

    const leftW = Math.floor((box.w - 44) * 0.51);
    const rightW = (box.w - 44) - leftW;
    const leftX = box.x + 15;
    const rightX = leftX + leftW + 14;

    // 1. LEFT PANEL: COHESIVE 4-STAGE ISOMETRIC ILLUSTRATION VIEWPORT (WITH LASER SCAN MORPH & PROCEDURAL OVERLAYS)
    const leftEnt = this.getBoxEntrance(animSec, 0.16, 0.32);
    if (leftEnt.visible) {
      ctx.save();
      ctx.globalAlpha *= leftEnt.alpha;
      const lCenterX = leftX + leftW / 2;
      const lCenterY = botY + botH / 2;
      ctx.translate(lCenterX, lCenterY + leftEnt.yOffset);
      ctx.scale(leftEnt.scale, leftEnt.scale);
      ctx.translate(-lCenterX, -lCenterY);

      ctx.fillStyle = '#0F1E36';
      this.roundRect(ctx, leftX, botY, leftW, botH, 14);
      ctx.fill();
      ctx.strokeStyle = '#2E6F56';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Header Bar
      ctx.fillStyle = '#1B365D';
      this.roundRect(ctx, leftX, botY, leftW, 44, 12);
      ctx.fill();

      const stepTitles = [
        'STAGE 1.1 • ถอดแบบประกอบ 3D เป็นคู่มือติดตั้ง (STEP-BY-STEP ASSEMBLY MANUAL)',
        'STAGE 1.2 • คนกางแบบอ่านหน้างาน เทียบเลขชิ้นส่วนจริง (ENGINEERS READING BLUEPRINT)',
        'STAGE 1.3 • หัวหน้าช่างถือแบบกำกับทีม ประกอบโครงและแผ่นผนัง (CREW ASSEMBLING WALL)',
        'STAGE 1.4 • วิศวกรตรวจเช็คผนังจริงเทียบแบบ DWG 100% (FINAL DWG QUALITY CHECK)'
      ];
      ctx.fillStyle = '#6EE7B7';
      this.fillFittedText(
        ctx,
        stepTitles[activeIdx],
        leftX + 18,
        botY + 28,
        leftW - 36,
        14.5,
        '700',
        '"Prompt", "JetBrains Mono", sans-serif'
      );

      // Image Viewport Frame
      const vpX = leftX + 14;
      const vpY = botY + 54;
      const vpW = leftW - 28;
      const vpH = botH - 110;

      ctx.save();
      this.roundRect(ctx, vpX, vpY, vpW, vpH, 10);
      ctx.clip();

      ctx.fillStyle = '#F6F5F0';
      ctx.fillRect(vpX, vpY, vpW, vpH);

      const curImg = r1StepImgs[activeIdx];
      const prevImg = r1StepImgs[(activeIdx + 3) % 4];
      const drawMatchedImg = (imgObj) => {
        if (!imgObj || !imgObj.complete || imgObj.naturalWidth <= 0) return;
        const scale = Math.min(vpW / imgObj.naturalWidth, vpH / imgObj.naturalHeight);
        const dw = imgObj.naturalWidth * scale;
        const dh = imgObj.naturalHeight * scale;
        const dx = vpX + (vpW - dw) / 2;
        const dy = vpY + (vpH - dh) / 2;
        ctx.drawImage(imgObj, dx, dy, dw, dh);
      };

      const wipeDuration = 0.25;
      if (stepT < wipeDuration && prevImg && prevImg.complete) {
        drawMatchedImg(prevImg);
        const wipeX = vpX + vpW * (stepT / wipeDuration);
        ctx.save();
        ctx.beginPath();
        ctx.rect(vpX, vpY, wipeX - vpX, vpH);
        ctx.clip();
        drawMatchedImg(curImg);
        ctx.restore();

        // Laser Scan Line
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(wipeX, vpY);
        ctx.lineTo(wipeX, vpY + vpH);
        ctx.stroke();
      } else {
        drawMatchedImg(curImg);
      }

      // Live Animated Procedural Overlays for Each Step of Route 1
      if (activeIdx === 0) {
        const tags = [
          { rx: 0.24, ry: 0.26, txt: 'STEP 01: ตั้งโครง C75' },
          { rx: 0.50, ry: 0.20, txt: 'STEP 02: ใส่ฉนวน 50mm' },
          { rx: 0.76, ry: 0.28, txt: 'STEP 03: ปิดแผ่นผนัง' }
        ];
        tags.forEach((tg, idx) => {
          const px = vpX + vpW * tg.rx;
          const py = vpY + vpH * tg.ry;
          const pulse = 5 + 3 * Math.sin(nowSec * 6 + idx * 1.4);
          ctx.strokeStyle = '#2E6F56';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, pulse, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = 'rgba(15, 30, 54, 0.88)';
          this.roundRect(ctx, px - 68, py - 32, 136, 22, 5);
          ctx.fill();
          ctx.fillStyle = '#6EE7B7';
          this.fillFittedText(ctx, tg.txt, px, py - 17, 126, 11, '700', '"Prompt", sans-serif', 'center');
        });
      } else if (activeIdx === 1) {
        const tablePt = { x: vpX + vpW * 0.34, y: vpY + vpH * 0.54 };
        const partTargets = [
          { x: vpX + vpW * 0.68, y: vpY + vpH * 0.36, code: 'PART #01 • โครง C75' },
          { x: vpX + vpW * 0.75, y: vpY + vpH * 0.58, code: 'PART #02 • แผ่นผนังเจาะไฟ' },
          { x: vpX + vpW * 0.62, y: vpY + vpH * 0.76, code: 'PART #03 • ฉนวนกันเสียง' }
        ];
        partTargets.forEach((pt, idx) => {
          ctx.save();
          ctx.strokeStyle = idx === Math.floor((nowSec * 2) % 3) ? '#C84B31' : '#0284C7';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -(nowSec * 32);
          ctx.beginPath();
          ctx.moveTo(tablePt.x, tablePt.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = 'rgba(15, 30, 54, 0.9)';
          this.roundRect(ctx, pt.x - 74, pt.y - 12, 148, 24, 6);
          ctx.fill();
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          this.fillFittedText(ctx, pt.code, pt.x, pt.y + 4, 136, 11, '700', '"Prompt", sans-serif', 'center');
        });
      } else if (activeIdx === 2) {
        const badgeX = vpX + vpW * 0.50;
        const badgeY = vpY + vpH * 0.16;
        ctx.fillStyle = 'rgba(200, 75, 49, 0.94)';
        this.roundRect(ctx, badgeX - 145, badgeY, 290, 28, 7);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        this.fillFittedText(
          ctx,
          'หัวหน้าช่างดูแบบกำกับ ➔ ทีมช่างประกอบจริง (±1mm)',
          badgeX,
          badgeY + 19,
          272,
          12,
          '700',
          '"Prompt", sans-serif',
          'center'
        );
      } else if (activeIdx === 3) {
        const checks = [
          { rx: 0.45, ry: 0.34, label: 'DWG LEVEL OK ✓' },
          { rx: 0.62, ry: 0.52, label: 'MEP BOX ±0.5mm ✓' },
          { rx: 0.38, ry: 0.68, label: 'JOINT LOCK OK ✓' }
        ];
        checks.forEach((ck) => {
          const cx = vpX + vpW * ck.rx;
          const cy = vpY + vpH * ck.ry;
          ctx.fillStyle = 'rgba(22, 163, 74, 0.92)';
          this.roundRect(ctx, cx - 68, cy - 12, 136, 24, 6);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          this.fillFittedText(ctx, ck.label, cx, cy + 4, 124, 11, '700', '"JetBrains Mono", monospace', 'center');
        });
      }

      ctx.restore();

      // Viewport Border
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 2;
      this.roundRect(ctx, vpX, vpY, vpW, vpH, 10);
      ctx.stroke();

      // Bottom 4-Pill Step Selector inside Left Panel
      const pillGap = 8;
      const pillW = (vpW - pillGap * 3) / 4;
      const pillY = vpY + vpH + 10;
      const pillLabels = [
        '📄 1.1 ถอดแบบ 3D',
        '🔍 1.2 คนอ่านแบบ',
        '🔨 1.3 ประกอบจริง',
        '✅ 1.4 ตรวจ DWG'
      ];
      for (let i = 0; i < 4; i++) {
        const px = vpX + i * (pillW + pillGap);
        const isCur = i === activeIdx;
        ctx.fillStyle = isCur ? '#2E6F56' : '#1E293B';
        this.roundRect(ctx, px, pillY, pillW, 34, 7);
        ctx.fill();
        ctx.strokeStyle = isCur ? '#6EE7B7' : '#334155';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = isCur ? '#FFFFFF' : '#94A3B8';
        this.fillFittedText(ctx, pillLabels[i], px + pillW / 2, pillY + 22, pillW - 12, 12, '700', '"Prompt", sans-serif', 'center');
      }
      ctx.restore();
    }

    // 2. RIGHT PANEL: 4-STEP HANDOFF BREAKDOWN MATRIX
    const rightEnt = this.getBoxEntrance(animSec, 0.20, 0.32);
    if (rightEnt.visible) {
      ctx.save();
      ctx.globalAlpha *= rightEnt.alpha;
      const rCenterX = rightX + rightW / 2;
      const rCenterY = botY + botH / 2;
      ctx.translate(rCenterX, rCenterY + rightEnt.yOffset);
      ctx.scale(rightEnt.scale, rightEnt.scale);
      ctx.translate(-rCenterX, -rCenterY);

      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, rightX, botY, rightW, botH, 14);
      ctx.fill();
      ctx.strokeStyle = '#1B365D';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#1B365D';
      this.roundRect(ctx, rightX, botY, rightW, 44, 12);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(
        ctx,
        'ROUTE 1 HANDOFF DETAILS • ขยายความการต่องานเส้นทางที่ 1: คนอ่านแบบ & ทำงานประกอบจริง',
        rightX + 18,
        botY + 28,
        rightW - 36,
        14.5,
        '700',
        '"Prompt", sans-serif'
      );

      const rowGap = 8;
      const availRowsH = botH - 60;
      const rowH = (availRowsH - rowGap * 3) / 4;

      for (let i = 0; i < 4; i++) {
        const rowEnt = this.getBoxEntrance(animSec, 3.55 + i * 0.28, 0.35);
        if (!rowEnt.visible) continue;

        const nd = nodes[i] || fallbackNodes[i];
        const fb = fallbackNodes[i];
        const ry = botY + 52 + i * (rowH + rowGap);
        const rx = rightX + 12;
        const rw = rightW - 24;
        const isCur = i === activeIdx;

        ctx.save();
        ctx.globalAlpha *= rowEnt.alpha;
        const rowMidX = rx + rw / 2;
        const rowMidY = ry + rowH / 2;
        ctx.translate(rowMidX, rowMidY + rowEnt.yOffset);
        ctx.scale(rowEnt.scale, rowEnt.scale);
        ctx.translate(-rowMidX, -rowMidY);

        this.roundRect(ctx, rx, ry, rw, rowH, 10);
        ctx.clip();

        ctx.fillStyle = isCur ? '#F0FDF4' : '#F8FAFC';
        ctx.fillRect(rx, ry, rw, rowH);

        ctx.strokeStyle = isCur ? '#2E6F56' : '#CBD5E1';
        ctx.lineWidth = isCur ? 2.5 : 1.5;
        this.roundRect(ctx, rx, ry, rw, rowH, 10);
        ctx.stroke();

        ctx.fillStyle = isCur ? '#2E6F56' : '#1B365D';
        ctx.fillRect(rx, ry, 8, rowH);

        const stepTitle = `${nd.code || fb.code} • ${nd.label || fb.label}`;
        ctx.fillStyle = isCur ? '#2E6F56' : '#1B365D';
        this.fillFittedText(ctx, stepTitle, rx + 18, ry + 23, rw - 190, 15, '700', '"Prompt", sans-serif');

        const hBadge = nd.handoffOut || nd.handoff || fb.handoff;
        const hbW = 160;
        const hbX = rx + rw - hbW - 10;
        ctx.fillStyle = isCur ? '#C84B31' : '#2E6F56';
        this.roundRect(ctx, hbX, ry + 7, hbW, 23, 6);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        this.fillFittedText(ctx, hBadge, hbX + hbW / 2, ry + 23, hbW - 12, 11.5, '700', '"Prompt", sans-serif', 'center');

        const lines = [
          { icon: '📥', tag: 'IN', col: '#0284C7', txt: nd.inputDetail || fb.inputDetail },
          { icon: '🔨', tag: 'WORK', col: '#2E6F56', txt: nd.processDetail || fb.processDetail },
          { icon: '📤', tag: 'OUT', col: '#C84B31', txt: nd.outputDetail || fb.outputDetail }
        ];

        const startLineY = ry + 50;
        const lineStepY = Math.max(24, (rowH - 42) / 3);
        lines.forEach((ln, lIdx) => {
          const ly = startLineY + lIdx * lineStepY;
          const tagW = 76;
          const tagH = 20;
          ctx.fillStyle = `${ln.col}18`;
          this.roundRect(ctx, rx + 16, ly - 14, tagW, tagH, 5);
          ctx.fill();
          ctx.strokeStyle = ln.col;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = ln.col;
          this.fillFittedText(ctx, `${ln.icon} ${ln.tag}`, rx + 16 + tagW / 2, ly, tagW - 6, 11.5, '700', '"Prompt", sans-serif', 'center');

          ctx.fillStyle = '#1E293B';
          this.fillFittedText(ctx, ln.txt, rx + 16 + tagW + 10, ly, rw - tagW - 40, 13.5, '500', '"Prompt", sans-serif');
        });

        ctx.restore();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // ==================== SCENE 06: ROUTE 2 DEEP-DIVE (3D DATA -> PART FAN-OUT -> 1-CLICK APPROVE -> INSTANT PO DISPATCH) ====================
  drawPipelineRouteAScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    const nodes = slide.nodes || [];
    const count = 4;
    const gap = Math.max(28, box.w * 0.032);
    const cardW = (box.w - 30 - gap * (count - 1)) / count;
    const cardH = 232;
    const topY = box.y + 10;

    // Master Cycle for Route 2 (8.5s loop after initial storytelling entrance):
    // 0.00..0.26: Phase 0 (รับข้อมูล 3D ➔ กระจายออกเป็น 4 Part เพื่อสั่งซื้อ)
    // 0.26..0.52: Phase 1 (มีคนกดปุ่มอนุมัติ 1-Click Approve + ตราประทับ อนุมัติแล้ว)
    // 0.52..0.78: Phase 2 (ระบบสั่งซื้อ PO Auto วิ่งความเร็วสูงส่งผู้ผลิตทันที!)
    // 0.78..1.00: Phase 3 (ผู้ผลิตจัดส่งเข้าสโตร์ครบ 100% พร้อมเบิกหน้างาน)
    const cycle = (nowSec % 8.5) / 8.5;
    const loopActiveIdx = cycle < 0.26 ? 0 : cycle < 0.52 ? 1 : cycle < 0.78 ? 2 : 3;
    const loopApproved = cycle >= 0.36;
    const loopClickPulse = Math.max(0, 1 - Math.abs(cycle - 0.38) * 14);
    const loopDispatchP = Math.max(0, Math.min(1, (cycle - 0.38) / 0.36));

    // Storytelling Entrance vs Master Loop:
    const isIntro = animSec < 8.5;
    const activeIdx = isIntro
      ? (animSec < 3.2 ? 0 : animSec < 4.6 ? 0 : animSec < 6.0 ? 1 : animSec < 7.4 ? 2 : 3)
      : loopActiveIdx;
    const isApproved = isIntro ? (animSec >= 5.80) : loopApproved;
    const clickPulse = isIntro ? Math.max(0, 1 - Math.abs(animSec - 5.85) * 12) : loopClickPulse;
    const dispatchP = isIntro ? Math.max(0, Math.min(1, (animSec - 5.90) / 1.8)) : loopDispatchP;

    const routeAThumbs = [
      this.illus && this.illus.routeAPart,
      this.illus && this.illus.routeAPo,
      this.illus && this.illus.routeAFactory,
      this.illus && this.illus.routeAStore
    ];

    const defaultHandoffs = [
      '📊 กระจาย 4 Part',
      '⚡ ยิง PO ทันที',
      '🚚 ส่งตรงเข้าคลัง',
      '📦 พร้อมเบิกหน้างาน'
    ];

    // 1. TOP ROW: 4 PIPELINE CARDS WITH SEQUENTIAL ENTRANCE ANIMATION
    for (let i = 0; i < count; i++) {
      const cardStartT = 0.25 + i * 0.55;
      const cardEnt = this.getBoxEntrance(animSec, cardStartT, 0.45);
      const nd = nodes[i] || { code: `STEP 2.${i + 1}`, label: `Step 2.${i + 1}`, sub: '', icon: 'po' };
      const cx = box.x + 15 + i * (cardW + gap);

      if (i < count - 1) {
        const arrowStartT = cardStartT + 0.30;
        const arrowEnt = this.getBoxEntrance(animSec, arrowStartT, 0.35);
        if (arrowEnt.visible) {
          ctx.save();
          ctx.globalAlpha *= arrowEnt.alpha;
          const arrowY = topY + cardH / 2;
          const speedMult = i >= 1 && isApproved ? 3.2 : 1.0;
          this.drawThickRedHandoffArrow(ctx, cx + cardW, arrowY, cx + cardW + gap, arrowY, nowSec * speedMult + i * 0.25);

          const badgeTxt = nd.handoffOut || defaultHandoffs[i];
          const midX = cx + cardW + gap / 2;
          const bw = Math.min(172, gap + 96);
          const bh = 26;
          ctx.fillStyle = i === activeIdx ? '#C84B31' : '#1B365D';
          this.roundRect(ctx, midX - bw / 2, arrowY - 42, bw, bh, 13);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          this.fillFittedText(ctx, badgeTxt, midX, arrowY - 24, bw - 12, 11.5, '700', '"Prompt", sans-serif', 'center');
          ctx.restore();
        }
      }

      if (cardEnt.visible) {
        ctx.save();
        ctx.globalAlpha *= cardEnt.alpha;
        const centerX = cx + cardW / 2;
        const centerY = topY + cardH / 2;
        ctx.translate(centerX, centerY + cardEnt.yOffset);
        ctx.scale(cardEnt.scale, cardEnt.scale);
        ctx.translate(-centerX, -centerY);
        this.drawJapanesePipelineCard(ctx, cx, topY, cardW, cardH, nd, '#C84B31', i === activeIdx, routeAThumbs[i]);
        ctx.restore();
      }
    }

    // 2. BOTTOM DEEP-DIVE SHOWCASE CONTAINER (การเด็ป เน้น ที่โชว์)
    const simY = topY + cardH + 22;
    const simH = box.h - cardH - 36;
    const simX = box.x + 15;
    const simW = box.w - 30;

    const simEnt = this.getBoxEntrance(animSec, 2.45, 0.45);
    if (!simEnt.visible) {
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha *= simEnt.alpha;
    const simCenterX = simX + simW / 2;
    const simCenterY = simY + simH / 2;
    ctx.translate(simCenterX, simCenterY + simEnt.yOffset);
    ctx.scale(simEnt.scale, simEnt.scale);
    ctx.translate(-simCenterX, -simCenterY);

    ctx.fillStyle = '#FFFFFF';
    this.roundRect(ctx, simX, simY, simW, simH, 14);
    ctx.fill();
    ctx.strokeStyle = '#1B365D';
    ctx.lineWidth = 2.8;
    ctx.stroke();

    // Top Simulator Header Bar (High-Contrast Clean Japanese Navy)
    ctx.fillStyle = '#1B365D';
    this.roundRect(ctx, simX, simY, simW, 48, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(
      ctx,
      'LIVE PO AUTO • 📥 รับข้อมูล 3D  ➔  📊 กระจาย Part  ➔  👆 กดอนุมัติ  ➔  ⚡ ยิง PO สู่สโตร์ทันที!',
      simX + 20,
      simY + 30,
      simW - 40,
      15,
      '700',
      '"Prompt", sans-serif'
    );

    const bodyY = simY + 60;
    const bodyH = simH - 72;

    // Column X coordinates inside Simulator
    const z1X = simX + 16;
    const z1W = Math.floor(simW * 0.17);

    const z2X = z1X + z1W + Math.floor(simW * 0.055);
    const z2W = Math.floor(simW * 0.25);

    const z3X = z2X + z2W + Math.floor(simW * 0.045);
    const z3W = Math.floor(simW * 0.20);

    const z4X = z3X + z3W + Math.floor(simW * 0.055);
    const z4W = (simX + simW - 16) - z4X;

    // -------------------- ZONE 1: INCOMING 3D MODEL DATA HUB --------------------
    const z1Ent = this.getBoxEntrance(animSec, 2.85, 0.40);
    const hubH = Math.min(340, bodyH - 20);
    const hubY = bodyY + (bodyH - hubH) / 2;

    if (z1Ent.visible) {
      ctx.save();
      ctx.globalAlpha *= z1Ent.alpha;
      const z1MidX = z1X + z1W / 2;
      const z1MidY = hubY + hubH / 2;
      ctx.translate(z1MidX, z1MidY + z1Ent.yOffset);
      ctx.scale(z1Ent.scale, z1Ent.scale);
      ctx.translate(-z1MidX, -z1MidY);

      ctx.fillStyle = '#0F1E36';
      this.roundRect(ctx, z1X, hubY, z1W, hubH, 12);
      ctx.fill();
      ctx.strokeStyle = activeIdx === 0 ? '#C84B31' : '#1B365D';
      ctx.lineWidth = activeIdx === 0 ? 3 : 2;
      ctx.stroke();

      ctx.fillStyle = '#38BDF8';
      this.fillFittedText(ctx, '📥 รับข้อมูล 3D BOQ', z1X + z1W / 2, hubY + 28, z1W - 20, 14, '700', '"Prompt", sans-serif', 'center');

      // 3D Wall Image inside Hub
      const hImgX = z1X + 12;
      const hImgY = hubY + 42;
      const hImgW = z1W - 24;
      const hImgH = hubH - 125;
      ctx.save();
      this.roundRect(ctx, hImgX, hImgY, hImgW, hImgH, 8);
      ctx.clip();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(hImgX, hImgY, hImgW, hImgH);
      if (this.boq3dWallImg && this.boq3dWallImg.complete && this.boq3dWallImg.naturalWidth > 0) {
        const sc = Math.min(hImgW / this.boq3dWallImg.naturalWidth, hImgH / this.boq3dWallImg.naturalHeight);
        const dw = this.boq3dWallImg.naturalWidth * sc;
        const dh = this.boq3dWallImg.naturalHeight * sc;
        ctx.drawImage(this.boq3dWallImg, hImgX + (hImgW - dw) / 2, hImgY + (hImgH - dh) / 2, dw, dh);
      }
      const scanY = hImgY + ((nowSec * 70) % hImgH);
      ctx.strokeStyle = '#C84B31';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hImgX, scanY); ctx.lineTo(hImgX + hImgW, scanY); ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#F8FAFC';
      this.fillFittedText(ctx, 'ถอดปริมาณวัสดุอัตโนมัติ', z1X + z1W / 2, hubY + hubH - 52, z1W - 20, 13, '600', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#34D399';
      this.fillFittedText(ctx, '➔ กระจายออกเป็น 4 Part', z1X + z1W / 2, hubY + hubH - 24, z1W - 20, 13, '700', '"Prompt", sans-serif', 'center');
      ctx.restore();
    }

    // -------------------- ZONE 2: FAN-OUT INTO 4 PART CARDS (กระจายไปเป็น Part เพื่อสั่งซื้อ) --------------------
    const partsData = [
      { code: 'PART-01', name: 'แผ่นผนัง 12mm (Interior)', qty: '38 แผ่น', poNo: 'PO-8801', sup: 'SCG / Knauf', col: '#1B365D' },
      { code: 'PART-02', name: 'โครงเหล็ก C75 (Stud)', qty: '64 เส้น', poNo: 'PO-8802', sup: 'Steel Roll', col: '#0284C7' },
      { code: 'PART-03', name: 'ฉนวนกันร้อน 50mm', qty: '24 ม้วน', poNo: 'PO-8803', sup: 'Rockwool TH', col: '#C84B31' },
      { code: 'PART-04', name: 'อุปกรณ์ยึด & บล็อกไฟ', qty: '120 ชุด', poNo: 'PO-8804', sup: 'MEP Standard', col: '#2E6F56' }
    ];

    const pGap = 14;
    const pCardH = (bodyH - pGap * 3) / 4;
    const hubOutX = z1X + z1W;
    const hubOutY = hubY + hubH / 2;

    partsData.forEach((pt, idx) => {
      const pStartT = 3.25 + idx * 0.28;
      const pEnt = this.getBoxEntrance(animSec, pStartT, 0.38);
      if (!pEnt.visible) return;

      const py = bodyY + idx * (pCardH + pGap);
      const midPY = py + pCardH / 2;

      // Fan-out Bezier Curve from 3D Hub to each Part Card
      ctx.save();
      ctx.strokeStyle = pt.col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hubOutX, hubOutY);
      ctx.bezierCurveTo(hubOutX + (z2X - hubOutX) * 0.55, hubOutY, z2X - (z2X - hubOutX) * 0.45, midPY, z2X, midPY);
      ctx.stroke();

      // Animated Data Dot fanning out into each Part
      const dotT = ((nowSec * 1.1) + idx * 0.18) % 1;
      const inv = 1 - dotT;
      const c1x = hubOutX + (z2X - hubOutX) * 0.55, c1y = hubOutY;
      const c2x = z2X - (z2X - hubOutX) * 0.45, c2y = midPY;
      const dx = inv * inv * inv * hubOutX + 3 * inv * inv * dotT * c1x + 3 * inv * dotT * dotT * c2x + dotT * dotT * dotT * z2X;
      const dy = inv * inv * inv * hubOutY + 3 * inv * inv * dotT * c1y + 3 * inv * dotT * dotT * c2y + dotT * dotT * dotT * midPY;
      ctx.fillStyle = '#C84B31';
      ctx.beginPath();
      ctx.arc(dx, dy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Part Card with Entrance Animation
      ctx.save();
      ctx.globalAlpha *= pEnt.alpha;
      const pMidX = z2X + z2W / 2;
      ctx.translate(pMidX, midPY + pEnt.yOffset);
      ctx.scale(pEnt.scale, pEnt.scale);
      ctx.translate(-pMidX, -midPY);

      ctx.fillStyle = '#F6F5F0';
      this.roundRect(ctx, z2X, py, z2W, pCardH, 10);
      ctx.fill();
      ctx.strokeStyle = pt.col;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = pt.col;
      this.roundRect(ctx, z2X, py, 7, pCardH, 4);
      ctx.fill();

      this.roundRect(ctx, z2X + 7, py + 2, z2W - 12, pCardH - 4, 8);
      ctx.clip();

      ctx.fillStyle = pt.col;
      this.fillFittedText(ctx, `${pt.code} • เตรียมสั่งซื้อ`, z2X + 16, py + 24, z2W * 0.58, 12.5, '700', '"JetBrains Mono", monospace');

      // Quantity Pill on top-right of Part Card
      const qW = 82;
      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, z2X + z2W - qW - 10, py + 7, qW, 24, 6);
      ctx.fill();
      ctx.strokeStyle = pt.col;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = pt.col;
      this.fillFittedText(ctx, pt.qty, z2X + z2W - qW / 2 - 10, py + 24, qW - 10, 12.5, '700', '"Prompt", sans-serif', 'center');

      ctx.fillStyle = '#0F172A';
      this.fillFittedText(ctx, pt.name, z2X + 16, py + 52, z2W - 28, 15, '700', '"Prompt", sans-serif');

      ctx.fillStyle = '#64748B';
      this.fillFittedText(ctx, `🏭 ${pt.sup} • BOQ ตรง 100%`, z2X + 16, py + 76, z2W - 28, 12, '500', '"Prompt", sans-serif');
      ctx.restore();

      // Converging Line from each Part Card into Zone 3 Approval Console
      const appInY = bodyY + bodyH / 2;
      if (animSec >= 4.40) {
        ctx.save();
        ctx.strokeStyle = 'rgba(27, 54, 93, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(z2X + z2W, midPY);
        ctx.bezierCurveTo(z2X + z2W + 28, midPY, z3X - 28, appInY, z3X, appInY);
        ctx.stroke();
        ctx.restore();
      }
    });

    // -------------------- ZONE 3: MANAGER 1-CLICK APPROVAL CONSOLE (มีคนกดอนุมัติ) --------------------
    const z3Ent = this.getBoxEntrance(animSec, 4.40, 0.45);
    const appH = Math.min(370, bodyH - 12);
    const appY = bodyY + (bodyH - appH) / 2;

    if (z3Ent.visible) {
      ctx.save();
      ctx.globalAlpha *= z3Ent.alpha;
      const z3MidX = z3X + z3W / 2;
      const z3MidY = appY + appH / 2;
      ctx.translate(z3MidX, z3MidY + z3Ent.yOffset);
      ctx.scale(z3Ent.scale, z3Ent.scale);
      ctx.translate(-z3MidX, -z3MidY);

      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, z3X, appY, z3W, appH, 14);
      ctx.fill();
      ctx.strokeStyle = isApproved ? '#2E6F56' : '#C84B31';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = isApproved ? '#2E6F56' : '#1B365D';
      this.roundRect(ctx, z3X, appY, z3W, 44, 12);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, '👆 อนุมัติคำสั่งซื้อ (PO APPROVAL)', z3X + z3W / 2, appY + 28, z3W - 20, 13.5, '700', '"Prompt", sans-serif', 'center');

      this.roundRect(ctx, z3X + 6, appY + 46, z3W - 12, appH - 52, 10);
      ctx.clip();

      ctx.fillStyle = '#475569';
      this.fillFittedText(ctx, 'สรุปรายการขอสั่งซื้อ (PR Batch)', z3X + z3W / 2, appY + 74, z3W - 24, 13, '600', '"Prompt", sans-serif', 'center');
      ctx.fillStyle = '#1B365D';
      this.fillFittedText(ctx, '4 หมวด Part • รวม 246 ชิ้น', z3X + z3W / 2, appY + 102, z3W - 24, 16.5, '700', '"Prompt", sans-serif', 'center');

      // Interactive-style Approve Button
      const btnW = z3W - 36;
      const btnH = 54;
      const btnX = z3X + 18;
      const btnY = appY + 128 + clickPulse * 4;

      ctx.fillStyle = isApproved ? '#2E6F56' : '#C84B31';
      this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      const btnLabel = isApproved ? '✓ อนุมัติแล้ว (APPROVED)' : '👆 กดอนุมัติสั่งซื้อ (APPROVE)';
      this.fillFittedText(ctx, btnLabel, btnX + btnW / 2, btnY + 34, btnW - 20, 15.5, '700', '"Prompt", sans-serif', 'center');

      // Expanding Click Shockwave Ring when button is clicked!
      if (clickPulse > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(46, 111, 86, ${clickPulse})`;
        ctx.lineWidth = 3.5;
        this.roundRect(ctx, btnX - (1 - clickPulse) * 16, btnY - (1 - clickPulse) * 16, btnW + (1 - clickPulse) * 32, btnH + (1 - clickPulse) * 32, 14);
        ctx.stroke();
        ctx.restore();
      }

      // Animated Cursor / Pointer Finger moving in to click Approve
      const curTargetX = btnX + btnW * 0.72;
      const curTargetY = btnY + btnH * 0.65;
      let curOffset = 0;
      if (isIntro) {
        curOffset = animSec < 5.80 ? (5.80 - animSec) * 120 : 0;
      } else {
        curOffset = cycle < 0.35 ? (0.35 - cycle) * 140 : 0;
      }
      const curX = curTargetX + curOffset * 0.6;
      const curY = curTargetY + curOffset;

      if ((isIntro && animSec >= 4.90 && animSec <= 6.80) || (!isIntro)) {
        ctx.save();
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(curX, curY);
        ctx.lineTo(curX + 18, curY + 14);
        ctx.lineTo(curX + 10, curY + 16);
        ctx.lineTo(curX + 14, curY + 26);
        ctx.lineTo(curX + 8, curY + 28);
        ctx.lineTo(curX + 4, curY + 18);
        ctx.lineTo(curX - 2, curY + 23);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Stamp & Instant Dispatch Status below button
      if (isApproved) {
        const stampEnt = this.getBounceEntrance(animSec, isIntro ? 5.85 : 0, 0.40);
        if (stampEnt.visible) {
          ctx.save();
          const stampMidX = z3X + z3W / 2;
          const stampMidY = appY + 227;
          ctx.translate(stampMidX, stampMidY);
          ctx.scale(stampEnt.scale, stampEnt.scale);
          ctx.translate(-stampMidX, -stampMidY);

          ctx.strokeStyle = '#C84B31';
          ctx.lineWidth = 2.4;
          this.roundRect(ctx, z3X + 24, appY + 206, z3W - 48, 42, 8);
          ctx.stroke();
          ctx.fillStyle = 'rgba(200, 75, 49, 0.10)';
          ctx.fill();
          ctx.fillStyle = '#C84B31';
          this.fillFittedText(ctx, '承認済 • อนุมัติแล้ว ✓', z3X + z3W / 2, appY + 233, z3W - 60, 14, '700', '"Prompt", sans-serif', 'center');
          ctx.restore();
        }

        ctx.fillStyle = '#2E6F56';
        this.fillFittedText(ctx, '⚡ ระบบ PO Auto วิ่งส่งผู้ผลิตทันที!', z3X + z3W / 2, appY + appH - 26, z3W - 24, 14, '700', '"Prompt", sans-serif', 'center');
      } else {
        ctx.fillStyle = '#B45309';
        this.fillFittedText(ctx, '⏳ รอผู้มีอำนาจกดอนุมัติคำสั่งซื้อ...', z3X + z3W / 2, appY + 235, z3W - 24, 14, '600', '"Prompt", sans-serif', 'center');
      }
      ctx.restore();
    }

    // -------------------- ZONE 4: HIGH-SPEED PO DISPATCH & SUPPLIER -> STORE TERMINAL --------------------
    partsData.forEach((pt, idx) => {
      const z4StartT = 6.05 + idx * 0.28;
      const z4Ent = this.getBoxEntrance(animSec, z4StartT, 0.38);
      if (!z4Ent.visible) return;

      const py = bodyY + idx * (pCardH + pGap);
      const midPY = py + pCardH / 2;
      const appOutX = z3X + z3W;
      const appOutY = appY + 80 + idx * 46;

      // Express PO Track from Approval Console to each Supplier/Store Slot
      ctx.save();
      ctx.strokeStyle = isApproved ? '#2E6F56' : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = isApproved ? 3.5 : 2;
      if (!isApproved) ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(appOutX, appOutY);
      ctx.bezierCurveTo(appOutX + 40, appOutY, z4X - 40, midPY, z4X, midPY);
      ctx.stroke();

      // High-Speed PO Rocket Packet shooting immediately after Approval!
      if (isApproved) {
        // Staggered departure per part, smooth pacing across 4 parts
        const rawPkt = ((nowSec * 1.35) + idx * 0.25) % 1;
        // Only draw packet while in mid-flight between Zone 3 & Zone 4 (no bleeding into Zone 3 box!)
        if (rawPkt >= 0.08 && rawPkt <= 0.94) {
          const pktT = (rawPkt - 0.08) / 0.86;
          const inv = 1 - pktT;
          const c1x = appOutX + 40, c1y = appOutY;
          const c2x = z4X - 40, c2y = midPY;
          const px = inv * inv * inv * appOutX + 3 * inv * inv * pktT * c1x + 3 * inv * pktT * pktT * c2x + pktT * pktT * pktT * z4X;
          const pyTrack = inv * inv * inv * appOutY + 3 * inv * inv * pktT * c1y + 3 * inv * pktT * pktT * c2y + pktT * pktT * pktT * midPY;

          ctx.fillStyle = '#C84B31';
          this.roundRect(ctx, px - 28, pyTrack - 12, 56, 24, 6);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          this.fillFittedText(ctx, pt.poNo, px, pyTrack + 4, 48, 11, '700', '"JetBrains Mono", monospace', 'center');
        }
      }
      ctx.restore();

      // Right Supplier -> Store Card for each Part with Entrance Animation
      const arrived = isApproved && dispatchP > 0.35;
      ctx.save();
      ctx.globalAlpha *= z4Ent.alpha;
      const z4MidX = z4X + z4W / 2;
      ctx.translate(z4MidX, midPY + z4Ent.yOffset);
      ctx.scale(z4Ent.scale, z4Ent.scale);
      ctx.translate(-z4MidX, -midPY);

      ctx.fillStyle = arrived ? 'rgba(46, 111, 86, 0.08)' : '#F8FAFC';
      this.roundRect(ctx, z4X, py, z4W, pCardH, 10);
      ctx.fill();
      ctx.strokeStyle = arrived ? '#2E6F56' : '#CBD5E1';
      ctx.lineWidth = arrived ? 2.4 : 1.5;
      ctx.stroke();

      this.roundRect(ctx, z4X + 6, py + 2, z4W - 12, pCardH - 4, 8);
      ctx.clip();

      ctx.fillStyle = arrived ? '#2E6F56' : '#64748B';
      this.fillFittedText(
        ctx,
        arrived ? `🚀 ${pt.poNo} ➔ ส่งถึงผู้ผลิต & เข้าสโตร์ ✓` : `⏳ ${pt.poNo} • รอกดอนุมัติ...`,
        z4X + 14,
        py + 25,
        z4W - 28,
        13,
        '700',
        '"Prompt", sans-serif'
      );

      ctx.fillStyle = '#0F172A';
      this.fillFittedText(ctx, `${pt.name} (${pt.qty})`, z4X + 14, py + 50, z4W - 28, 14, '700', '"Prompt", sans-serif');

      // Animated Fill Bar showing PO execution & Store receipt
      const barW = z4W - 28;
      const fillRatio = !isApproved ? 0.08 : Math.min(1, dispatchP * 1.35);
      ctx.fillStyle = '#E2E8F0';
      this.roundRect(ctx, z4X + 14, py + 64, barW, 12, 6);
      ctx.fill();
      ctx.fillStyle = arrived ? '#2E6F56' : '#C84B31';
      this.roundRect(ctx, z4X + 14, py + 64, Math.max(12, barW * fillRatio), 12, 6);
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
    ctx.restore();
  }

  // ==================== SCENE 06: ROUTE 3 DEEP-DIVE (3.1 PUNCH -> 3.2 DXF -> 3.3 LANTEK -> 3.4 CNC VDO 8s) ====================
  drawPipelineRouteBScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    const nodes = slide.nodes || [];
    const count = 4;
    const gap = Math.max(22, Math.floor(box.w * 0.022));
    const cardW = (box.w - 30 - gap * (count - 1)) / count;
    const cardH = 228;
    const topY = box.y + 10;

    // Timeline Budget: Total 26 seconds.
    // 3.1 (6.0s) -> 3.2 (6.0s) -> 3.3 (6.0s) -> 3.4 CNC VDO (8.0s)!
    // Starts strictly at 3.1 (animSec = 0) and spends exactly 8.0 seconds on Step 3.4!
    const totalDuration = slide.duration || 26;
    const earlyDuration = Math.max(3.5, (totalDuration - 8.0) / 3); // 6.0s each
    const t34Start = earlyDuration * 3; // 18.0s
    const tCycle = t34Start + 8.0; // 26.0s
    const loopSec = animSec % tCycle;

    let activeIdx = 0;
    let localT = 0;
    if (loopSec < earlyDuration) {
      activeIdx = 0;
      localT = loopSec / earlyDuration;
    } else if (loopSec < earlyDuration * 2) {
      activeIdx = 1;
      localT = (loopSec - earlyDuration) / earlyDuration;
    } else if (loopSec < t34Start) {
      activeIdx = 2;
      localT = (loopSec - earlyDuration * 2) / earlyDuration;
    } else {
      activeIdx = 3;
      localT = (loopSec - t34Start) / 8.0;
    }

    const prevIdx = (activeIdx + 3) % 4;
    const wipeP = this.easeOutCubic(Math.min(1, localT * 2.2));

    const route3StageImgs = [
      this.illus && this.illus.r3Step1,
      this.illus && this.illus.r3Step2,
      this.illus && this.illus.r3Step3,
      this.illus && (this.illus.cncMachine || this.illus.r3Step4)
    ];

    const defaultHandoffBadges = [
      '⚡ พิกัดเจาะ (X,Y)',
      '📄 .DXF + Job',
      '📐 G-Code CNC',
      '🎬 ตัดจริง ±1mm (8s)'
    ];

    // 1. TOP ROW: 4-STEP PIPELINE OF ROUTE 3 WITH SEQUENTIAL ENTRANCE ANIMATION
    for (let i = 0; i < count; i++) {
      const cardStartT = 0.20 + i * 0.38;
      const cardEnt = this.getBoxEntrance(animSec, cardStartT, 0.40);
      const nd = nodes[i] || { code: `STEP 3.${i + 1}`, label: `Step 3.${i + 1}`, sub: '', icon: 'cnc' };
      const cx = box.x + 15 + i * (cardW + gap);

      if (i < count - 1) {
        const arrowStartT = cardStartT + 0.24;
        const arrowEnt = this.getBoxEntrance(animSec, arrowStartT, 0.32);
        if (arrowEnt.visible) {
          ctx.save();
          ctx.globalAlpha *= arrowEnt.alpha;
          const arrowY = topY + cardH / 2;
          this.drawThickRedHandoffArrow(ctx, cx + cardW, arrowY, cx + cardW + gap, arrowY, nowSec + i * 0.25);

          // Handoff Data Pill above the connecting arrow
          const badgeTxt = nd.handoffOut || defaultHandoffBadges[i];
          const midX = cx + cardW + gap / 2;
          const bw = Math.min(160, gap + 80);
          const bh = 26;
          ctx.fillStyle = i === activeIdx ? '#C84B31' : '#1B365D';
          this.roundRect(ctx, midX - bw / 2, arrowY - 40, bw, bh, 13);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          this.fillFittedText(ctx, badgeTxt, midX, arrowY - 23, bw - 12, 11.5, '700', '"Prompt", sans-serif', 'center');
          ctx.restore();
        }
      }

      if (cardEnt.visible) {
        ctx.save();
        ctx.globalAlpha *= cardEnt.alpha;
        const centerX = cx + cardW / 2;
        const centerY = topY + cardH / 2;
        ctx.translate(centerX, centerY + cardEnt.yOffset);
        ctx.scale(cardEnt.scale, cardEnt.scale);
        ctx.translate(-centerX, -centerY);
        this.drawJapaneseBlueprintBorderCard(ctx, cx, topY, cardW, cardH, nd, '#1B365D', i === activeIdx, route3StageImgs[i]);
        ctx.restore();
      }
    }

    // 2. BOTTOM SECTION: 2-COLUMN DEEP-DIVE HANDOFF VISUALIZER & 4-STEP SPECIFICATION MATRIX
    const simY = topY + cardH + 18;
    const simH = box.h - cardH - 30;
    if (simH <= 140) {
      ctx.restore();
      return;
    }

    const botEnt = this.getBoxEntrance(animSec, 1.85, 0.40);
    if (!botEnt.visible) {
      ctx.restore();
      return;
    }

    const simX = box.x + 15;
    const simW = box.w - 30;
    const leftW = Math.floor(simW * 0.51);
    const rightX = simX + leftW + 20;
    const rightW = simW - leftW - 20;

    // -------------------- LEFT COLUMN: MATCHED ISOMETRIC VIEWPORT & STAGE 3.4 LIVE CNC VIDEO (8 SECONDS) --------------------
    const leftEnt = this.getBoxEntrance(animSec, 2.15, 0.40);
    if (leftEnt.visible) {
      ctx.save();
      ctx.globalAlpha *= leftEnt.alpha;
      const lCenterX = simX + leftW / 2;
      const lCenterY = simY + simH / 2;
      ctx.translate(lCenterX, lCenterY + leftEnt.yOffset);
      ctx.scale(leftEnt.scale, leftEnt.scale);
      ctx.translate(-lCenterX, -lCenterY);

      ctx.fillStyle = '#0F1E36';
      this.roundRect(ctx, simX, simY, leftW, simH, 14);
      ctx.fill();
      ctx.strokeStyle = '#1B365D';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Header Bar with 4 Stage Tabs (3.4 clearly states VDO 8s)
      ctx.fillStyle = '#1B365D';
      this.roundRect(ctx, simX, simY, leftW, 48, 12);
      ctx.fill();

      const tabLabels = [
        '⚡ 3.1 PUNCH',
        '📄 3.2 DXF+JOB',
        '📐 3.3 LANTEK',
        '🎬 3.4 CNC VDO (8s)'
      ];
      const tabW = (leftW - 28 - (count - 1) * 8) / count;
      for (let t = 0; t < count; t++) {
        const tx = simX + 14 + t * (tabW + 8);
        const ty = simY + 8;
        const isCur = t === activeIdx;
        ctx.fillStyle = isCur ? '#C84B31' : 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, tx, ty, tabW, 32, 6);
        ctx.fill();
        ctx.fillStyle = isCur ? '#FFFFFF' : '#CBD5E1';
        this.fillFittedText(ctx, tabLabels[t], tx + tabW / 2, ty + 21, tabW - 8, 12, '700', '"JetBrains Mono", monospace', 'center');
      }

      // Inner Viewport for Steps 3.1 - 3.3 Illustrations OR Step 3.4 Real CNC Video (8s)
      const vpX = simX + 12;
      const vpY = simY + 58;
      const vpW = leftW - 24;
      const vpH = simH - 70;

      ctx.save();
      this.roundRect(ctx, vpX, vpY, vpW, vpH, 10);
      ctx.clip();

      ctx.fillStyle = '#F6F5F0';
      ctx.fillRect(vpX, vpY, vpW, vpH);

      if (activeIdx === 3) {
        // ==================== STAGE 3.4: LIVE CNC CUTTING VIDEO RUN (8 SECONDS) ====================
        const vidSrc = slide.videoSrc || 'VDO/รันเครื่องตัด.mp4';
        const cncVid = this.getOrCreateVideo(vidSrc);
        if (cncVid && cncVid.readyState >= 2) {
          if (cncVid.paused) {
            cncVid.play().catch(() => {});
          }
          this.drawMediaContain(ctx, cncVid, cncVid.videoWidth || 1280, cncVid.videoHeight || 720, vpX, vpY, vpW, vpH);
        } else {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(vpX, vpY, vpW, vpH);
          ctx.fillStyle = '#38BDF8';
          ctx.font = '600 20px "Prompt", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🎬 กำลังโหลด VDO รันเครื่องตัด CNC...', vpX + vpW / 2, vpY + vpH / 2);
          ctx.textAlign = 'left';
        }

        // Top-Left Live Recording HUD Badge + 8-Second Countdown Telemetry
        const livePulse = 0.5 + 0.5 * Math.sin(nowSec * 5);
        const vdoSecRemain = Math.max(0, 8.0 - (loopSec - t34Start)).toFixed(1);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        this.roundRect(ctx, vpX + 16, vpY + 16, 310, 36, 6);
        ctx.fill();
        ctx.strokeStyle = '#C84B31';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.fillStyle = `rgba(239, 68, 68, ${0.6 + 0.4 * livePulse})`;
        ctx.beginPath();
        ctx.arc(vpX + 34, vpY + 34, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        this.fillFittedText(ctx, `● LIVE CNC CUTTING • ${vdoSecRemain}s / 8.0s`, vpX + 48, vpY + 39, 260, 13.5, '700', '"Prompt", sans-serif');

        // Bottom Banner HUD
        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        this.roundRect(ctx, vpX + 14, vpY + vpH - 46, vpW - 28, 36, 8);
        ctx.fill();
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#34D399';
        this.fillFittedText(ctx, '3.4 CNC CUTTING • VDO รันเครื่องตัดจริงตามพิกัดเจาะไฟและตัดโครงเหล็ก ±1.0 มม. (8 วินาที)', vpX + 26, vpY + vpH - 23, vpW - 52, 14, '600', '"Prompt", sans-serif');
      } else {
        // ==================== STAGES 3.1 - 3.3: PROCEDURAL ISOMETRIC ILLUSTRATIONS ====================
        const curImg = route3StageImgs[activeIdx];
        const prvImg = route3StageImgs[prevIdx < 3 ? prevIdx : 2];

        const drawIsoStage = (img) => {
          if (!img || !img.complete || !img.naturalWidth) return;
          const sc = Math.max(vpW / img.naturalWidth, vpH / img.naturalHeight);
          const dw = img.naturalWidth * sc;
          const dh = img.naturalHeight * sc;
          const dx = vpX + (vpW - dw) / 2;
          const dy = vpY + (vpH - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
        };

        if (wipeP < 1 && prvImg && prvImg.complete && prvImg.naturalWidth > 0) {
          drawIsoStage(prvImg);
        }

        if (curImg && curImg.complete && curImg.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(vpX, vpY, vpW * wipeP, vpH);
          ctx.clip();
          drawIsoStage(curImg);
          ctx.restore();
        }

        // Vertical Laser Wipe Bar during transition between steps
        if (wipeP > 0.01 && wipeP < 0.99) {
          const scanX = vpX + vpW * wipeP;
          const grad = ctx.createLinearGradient(scanX - 36, 0, scanX + 12, 0);
          grad.addColorStop(0, 'rgba(200, 75, 49, 0)');
          grad.addColorStop(0.75, 'rgba(200, 75, 49, 0.45)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
          ctx.fillStyle = grad;
          ctx.fillRect(scanX - 36, vpY, 48, vpH);

          ctx.strokeStyle = '#C84B31';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(scanX, vpY);
          ctx.lineTo(scanX, vpY + vpH);
          ctx.stroke();
        }

        // Step-Specific Live Procedural Telemetry on Isometric Illustration
        if (activeIdx === 0) {
          // 3.1 Electric Punch: Pulsing coordinate crosshairs on the 3D wall panel
          const pts = [
            { rx: 0.39, ry: 0.58, label: 'BOX 68×110 (X:420, Y:300)' },
            { rx: 0.46, ry: 0.67, label: 'CONDUIT Ø25mm' },
            { rx: 0.60, ry: 0.70, label: 'T-NOTCH ±0.5mm' }
          ];
          pts.forEach((p, idx) => {
            const px = vpX + vpW * p.rx;
            const py = vpY + vpH * p.ry;
            const r = 14 + 4 * Math.sin(nowSec * 5 + idx);
            ctx.strokeStyle = '#C84B31';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.stroke();
          });
        } else if (activeIdx === 1) {
          // 3.2 CAD File / Job Order: Animated laser scan across the 2D DXF sheet
          const scanY = vpY + vpH * (0.35 + 0.5 * ((nowSec * 0.45) % 1));
          ctx.strokeStyle = 'rgba(2, 132, 199, 0.75)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(vpX + vpW * 0.14, scanY);
          ctx.lineTo(vpX + vpW * 0.62, scanY);
          ctx.stroke();
        } else if (activeIdx === 2) {
          // 3.3 Lantek Software: Animated CNC laser head & sparks tracing the nested sheet
          const hx = vpX + vpW * (0.28 + 0.38 * Math.abs(Math.sin(nowSec * 1.1)));
          const hy = vpY + vpH * (0.45 + 0.30 * Math.abs(Math.cos(nowSec * 1.6)));
          for (let sp = 0; sp < 6; sp++) {
            const ang = (sp / 6) * Math.PI * 2 + nowSec * 6;
            const dist = 8 + ((nowSec * 40 + sp * 5) % 18);
            ctx.fillStyle = sp % 2 === 0 ? '#FEF08A' : '#C84B31';
            ctx.beginPath();
            ctx.arc(hx + Math.cos(ang) * dist, hy + Math.sin(ang) * dist, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#C84B31';
          ctx.beginPath();
          ctx.arc(hx, hy, 7, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bottom Live Caption Banner inside Left Isometric Viewport
        const stageCaptions = [
          '3.1 ELECTRIC PUNCH / AUTO • ถอดพิกัดเจาะช่องบล็อกไฟ รูร้อยท่อ และรอยบากจากโมเดล 3D อัตโนมัติ',
          '3.2 CAD FILE / JOB ORDER • คลี่โมเดล 3D เป็นไฟล์ตัด .DXF รายชิ้น ผูกคู่กับใบสั่งผลิต Job Order ทันที',
          '3.3 LANTEK SOFTWARE • จัดเรียงชิ้นงานบนแผ่นแม่แบบ (Yield 98.4%) และสร้างชุดคำสั่ง CNC G-Code',
          '3.4 CNC CUTTING (VDO) • รันเครื่องตัด CNC จริง ตัด-เจาะ-พับแม่นยำ ±1.0 มม. (8 วินาที)'
        ];
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        this.roundRect(ctx, vpX + 14, vpY + vpH - 52, vpW - 28, 40, 8);
        ctx.fill();
        ctx.strokeStyle = '#C84B31';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        this.fillFittedText(ctx, stageCaptions[activeIdx], vpX + 26, vpY + vpH - 27, vpW - 52, 14.5, '600', '"Prompt", sans-serif');
      }

      ctx.restore();
      ctx.restore();
    }

    // -------------------- RIGHT COLUMN: 4-STEP HANDOFF BREAKDOWN MATRIX --------------------
    const rightEnt = this.getBoxEntrance(animSec, 2.55, 0.40);
    if (rightEnt.visible) {
      ctx.save();
      ctx.globalAlpha *= rightEnt.alpha;
      const rCenterX = rightX + rightW / 2;
      const rCenterY = simY + simH / 2;
      ctx.translate(rCenterX, rCenterY + rightEnt.yOffset);
      ctx.scale(rightEnt.scale, rightEnt.scale);
      ctx.translate(-rCenterX, -rCenterY);

      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, rightX, simY, rightW, simH, 14);
      ctx.fill();
      ctx.strokeStyle = '#1B365D';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#1B365D';
      this.roundRect(ctx, rightX, simY, rightW, 48, 12);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(
        ctx,
        'ROUTE 3 HANDOFF DETAILS • ขยายความการรับ-ส่งต่องานครบทั้ง 4 ขั้นตอน',
        rightX + 18,
        simY + 30,
        rightW - 36,
        14.5,
        '700',
        '"Prompt", sans-serif'
      );

      const fallbackDetails = [
        {
          code: 'STEP 3.1',
          label: 'Electric Punch / Auto',
          handoffOut: 'ส่งพิกัดเจาะ X,Y,Ø',
          inputDetail: 'รับโมเดลผนัง 3D + รหัส SKU (EE-2025-E, S-900-J) จากทีม BOQ',
          processDetail: 'คำนวณตำแหน่งเจาะช่องปลั๊กไฟ รูท่อร้อยสายไฟ และรอยบากเข้าลิ้นโครงคร่าวอัตโนมัติ',
          outputDetail: 'ส่งค่าพิกัดจุดเจาะ (X, Y, Ø) และเส้นรอบรูปชิ้นงานโดยไม่ต้องวัดด้วยมือ'
        },
        {
          code: 'STEP 3.2',
          label: 'CAD File / Job Order',
          handoffOut: 'ส่งไฟล์ .DXF + Job Order',
          inputDetail: 'รับพิกัดจุดเจาะและมิติแผ่นผนัง/โครงคร่าวจากระบบ Electric Punch',
          processDetail: 'คลี่โมเดล 3D เป็นแบบตัด 2D (.DXF) พร้อมออกใบสั่งงานระบุโซนห้องและจำนวนชิ้น',
          outputDetail: 'ส่งแพ็กเกจไฟล์ .DXF + Job Order Batch เข้าสู่ระบบ CAM โดยไม่ต้องวาดแบบซ้ำ'
        },
        {
          code: 'STEP 3.3',
          label: 'Lantek Software',
          handoffOut: 'ส่ง G-Code สั่งเครื่อง CNC',
          inputDetail: 'รับไฟล์ .DXF รายชิ้น และยอดสั่งผลิตจากใบ Job Order',
          processDetail: 'จัดเรียงชิ้นงานลงบนแผ่นวัสดุมาตรฐาน (Yield 98.4%) และจัดลำดับหัวเจาะ-หัวตัด',
          outputDetail: 'ส่งชุดคำสั่ง CNC G-Code (เจาะช่องไฟก่อน ➔ ตัดขอบนอก) เข้าเครื่องจักรโดยตรง'
        },
        {
          code: 'STEP 3.4',
          label: 'CNC Cutting Factory (VDO)',
          handoffOut: '🎬 ตัดจริง ±1.0 มม. (8s)',
          inputDetail: 'รับชุดคำสั่ง G-Code Toolpath จาก Lantek ออนไลน์และแผ่นโลหะเข้าแท่นตัด CNC',
          processDetail: 'เครื่องตัดไฟเบอร์เลเซอร์เดินตัด เจาะรูปลั๊กไฟและตัดรูปทรงตามแบบ Real-Time (8 วินาที)',
          outputDetail: 'ส่งชิ้นงานสำเร็จรูปพร้อมประกอบทันที (Ready-to-Assemble) เข้าสู่หน้างาน'
        }
      ];

      const listTopY = simY + 56;
      const availH = simH - 66;
      const rowGap = 10;
      const rowH = (availH - rowGap * (count - 1)) / count;

      for (let i = 0; i < count; i++) {
        const rowEnt = this.getBoxEntrance(animSec, 2.75 + i * 0.22, 0.32);
        if (!rowEnt.visible) continue;

        const nd = nodes[i] || {};
        const fb = fallbackDetails[i];
        const ry = listTopY + i * (rowH + rowGap);
        const rx = rightX + 12;
        const rw = rightW - 24;
        const isCur = i === activeIdx;

        ctx.save();
        ctx.globalAlpha *= rowEnt.alpha;
        const rowMidX = rx + rw / 2;
        const rowMidY = ry + rowH / 2;
        ctx.translate(rowMidX, rowMidY + rowEnt.yOffset);
        ctx.scale(rowEnt.scale, rowEnt.scale);
        ctx.translate(-rowMidX, -rowMidY);

        ctx.fillStyle = isCur ? 'rgba(200, 75, 49, 0.08)' : '#F6F5F0';
        this.roundRect(ctx, rx, ry, rw, rowH, 10);
        ctx.fill();
        ctx.strokeStyle = isCur ? '#C84B31' : 'rgba(27, 54, 93, 0.22)';
        ctx.lineWidth = isCur ? 2.4 : 1.3;
        ctx.stroke();

        // Left Status Strip
        ctx.fillStyle = isCur ? '#C84B31' : '#1B365D';
        this.roundRect(ctx, rx, ry, 6, rowH, 4);
        ctx.fill();

        // Row Header Bar: Step Code & Title + Right Handoff Badge
        const codeW = 76;
        ctx.fillStyle = isCur ? '#C84B31' : '#1B365D';
        this.roundRect(ctx, rx + 12, ry + 8, codeW, 24, 5);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        this.fillFittedText(ctx, fb.code, rx + 12 + codeW / 2, ry + 24, codeW - 8, 11, '700', '"JetBrains Mono", monospace', 'center');

        ctx.fillStyle = isCur ? '#C84B31' : '#0F172A';
        const titleTxt = nd.label || fb.label;
        this.fillFittedText(ctx, titleTxt, rx + codeW + 20, ry + 25, rw - codeW - 210, 15.5, '700', '"Prompt", sans-serif');

        // Right Handoff Badge
        const handoffTxt = nd.handoffOut || fb.handoffOut;
        const hBadgeW = Math.min(180, rw * 0.35);
        ctx.fillStyle = isCur ? 'rgba(200, 75, 49, 0.15)' : 'rgba(27, 54, 93, 0.08)';
        this.roundRect(ctx, rx + rw - hBadgeW - 12, ry + 8, hBadgeW, 24, 5);
        ctx.fill();
        ctx.fillStyle = isCur ? '#C84B31' : '#1B365D';
        this.fillFittedText(ctx, handoffTxt, rx + rw - hBadgeW / 2 - 12, ry + 24, hBadgeW - 10, 11.5, '700', '"Prompt", sans-serif', 'center');

        // 3 Detail Bullets
        const lineY1 = ry + 46;
        const lineY2 = ry + 68;
        const lineY3 = ry + 90;

        ctx.fillStyle = '#1E293B';
        const inTxt = nd.inputDetail || fb.inputDetail;
        this.fillFittedText(ctx, `📥 รับ: ${inTxt}`, rx + 16, lineY1, rw - 32, 12.5, '500', '"Prompt", sans-serif');

        ctx.fillStyle = '#0F172A';
        const prTxt = nd.processDetail || fb.processDetail;
        this.fillFittedText(ctx, `⚙️ ทำ: ${prTxt}`, rx + 16, lineY2, rw - 32, 12.5, '600', '"Prompt", sans-serif');

        ctx.fillStyle = isCur ? '#991B1B' : '#047857';
        const outTxt = nd.outputDetail || fb.outputDetail;
        this.fillFittedText(ctx, `📤 ส่ง: ${outTxt}`, rx + 16, lineY3, rw - 32, 12.5, '700', '"Prompt", sans-serif');

        ctx.restore();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // ==================== SCENE 07: CONVERGENCE TO ACTUAL ASSEMBLY ====================
  drawConvergenceAssemblyScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    const nodes = slide.nodes || [];
    const leftX = box.x + 12;
    const inW = Math.min(410, box.w * 0.40);
    const inH = 158;
    const gapY = 48;
    const startInY = box.y + (box.h - (3 * inH + 2 * gapY)) / 2;

    const outW = Math.min(415, box.w * 0.41);
    const outH = 505;
    const outX = box.x + box.w - outW - 12;
    const outY = box.y + (box.h - outH) / 2;

    const convThumbs = [
      this.illus && this.illus.r1Step2,
      this.illus && this.illus.routeAStore,
      this.illus && this.illus.r3Step4
    ];

    for (let i = 0; i < 3; i++) {
      const cardEnt = this.getBoxEntrance(animSec, 0.25 + i * 0.40, 0.38);
      const pipeEnt = this.getBoxEntrance(animSec, 0.45 + i * 0.40, 0.35);
      const nd = nodes[i] || { code: `IN-${i + 1}`, label: `Input ${i + 1}`, sub: '', icon: 'store' };
      const cy = startInY + i * (inH + gapY);
      const isAct = Math.floor((nowSec * 0.9) % 4) === i;

      if (cardEnt.visible) {
        ctx.save();
        ctx.globalAlpha *= cardEnt.alpha;
        const cMidX = leftX + inW / 2;
        const cMidY = cy + inH / 2;
        ctx.translate(cMidX, cMidY + cardEnt.yOffset);
        ctx.scale(cardEnt.scale, cardEnt.scale);
        ctx.translate(-cMidX, -cMidY);
        this.drawJapaneseProcessCard(ctx, leftX, cy, inW, inH, nd, i, isAct, convThumbs[i]);
        ctx.restore();
      }

      if (pipeEnt.visible) {
        ctx.save();
        ctx.globalAlpha *= pipeEnt.alpha;
        const startY = cy + inH / 2;
        const endY = outY + 135 + i * 115;
        this.drawOrthogonalHandoffPipe(
          ctx,
          [
            { x: leftX + inW, y: startY },
            { x: leftX + inW + (outX - (leftX + inW)) * 0.52, y: startY },
            { x: outX, y: endY }
          ],
          nowSec + i * 0.25,
          i === 2 ? '#C84B31' : '#1B365D',
          '🏗️ รวมหน้างาน'
        );
        ctx.restore();
      }
    }

    const heroEnt = this.getBoxEntrance(animSec, 1.65, 0.45);
    if (heroEnt.visible) {
      ctx.save();
      ctx.globalAlpha *= heroEnt.alpha;
      const hMidX = outX + outW / 2;
      const hMidY = outY + outH / 2;
      ctx.translate(hMidX, hMidY + heroEnt.yOffset);
      ctx.scale(heroEnt.scale, heroEnt.scale);
      ctx.translate(-hMidX, -hMidY);

      const finalNode = nodes[3] || {
        code: 'ACTUAL ASSEMBLY',
        label: 'Actual Assembly',
        sub: 'ตั้งโครง ➔ ติดแผ่น ➔ MEP ➔ ตรวจ DWG',
        icon: 'walldone'
      };
      this.drawJapaneseHeroNode(
        ctx,
        outX,
        outY,
        outW,
        outH,
        finalNode,
        true,
        nowSec,
        this.illus && this.illus.r1Step3
      );
      ctx.restore();
    }

    ctx.restore();
  }

  // ==================== SCENE 08: END-TO-END DATA CONTINUITY & BENCHMARK ====================
  drawContinuitySummaryScene(ctx, box, slide, animSec, nowSec) {
    ctx.save();
    const nodes = slide.nodes || [];
    const count = 4;
    const gap = 36;
    const cardW = (box.w - 40 - gap * (count - 1)) / count;
    const cardH = 205;
    const topY = box.y + 20;

    // Animated Multi-Ribbon Sine Wave Data Continuity Stream behind the 4 Phase Cards
    ctx.save();
    ctx.strokeStyle = 'rgba(2, 132, 199, 0.28)';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = box.x + 20; x <= box.x + box.w - 20; x += 10) {
      const rel = (x - box.x) / box.w;
      const y = topY + cardH / 2 + Math.sin(rel * Math.PI * 3 - nowSec * 3) * 36;
      if (x === box.x + 20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Traveling Light Orbs along the Continuity Ribbon
    for (let orb = 0; orb < 6; orb++) {
      const rel = ((nowSec * 0.22) + orb / 6) % 1;
      const ox = box.x + 20 + rel * (box.w - 40);
      const oy = topY + cardH / 2 + Math.sin(rel * Math.PI * 3 - nowSec * 3) * 36;
      ctx.fillStyle = orb % 2 === 0 ? '#C84B31' : '#0284C7';
      ctx.beginPath();
      ctx.arc(ox, oy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const phaseThumbs = [
      this.designStageImages && this.designStageImages[1],
      this.illus && (this.illus.r1Step1 || this.illus.r1Step2) || (this.designStageImages && this.designStageImages[0]),
      this.boq3dWallImg || (this.illus && this.illus.routeAStore),
      this.illus && (this.illus.cncMachine || this.illus.r3Step4)
    ];

    for (let i = 0; i < count; i++) {
      const cardStartT = 0.20 + i * 0.28;
      const cardEnt = this.getBoxEntrance(animSec, cardStartT, 0.35);
      const nd = nodes[i] || { code: `STEP 0${i + 1}`, label: `Phase ${i + 1}`, sub: '', icon: 'draft' };
      const cx = box.x + 20 + i * (cardW + gap);

      if (i < count - 1) {
        const arrowStartT = cardStartT + 0.18;
        const arrowEnt = this.getBoxEntrance(animSec, arrowStartT, 0.28);
        if (arrowEnt.visible) {
          ctx.save();
          ctx.globalAlpha *= arrowEnt.alpha;
          this.drawHandoffPipe(ctx, cx + cardW, topY + cardH / 2, cx + cardW + gap, topY + cardH / 2, nowSec + i * 0.2, true);
          ctx.restore();
        }
      }

      if (cardEnt.visible) {
        ctx.save();
        ctx.globalAlpha *= cardEnt.alpha;
        const cMidX = cx + cardW / 2;
        const cMidY = topY + cardH / 2;
        ctx.translate(cMidX, cMidY + cardEnt.yOffset);
        ctx.scale(cardEnt.scale, cardEnt.scale);
        ctx.translate(-cMidX, -cMidY);
        this.drawJapaneseBlueprintBorderCard(ctx, cx, topY, cardW, cardH, nd, i === 3 ? '#C84B31' : '#1B365D', true, phaseThumbs[i]);
        ctx.restore();
      }
    }

    // ==================== BOTTOM BENCHMARK COMPARISON MATRIX (HIGH CONTRAST & PROMINENT) ====================
    const benchY = topY + cardH + 24;
    const benchW = box.w - 40;
    const benchX = box.x + 20;

    const col1W = 310;
    const col2W = 650;
    const c1X = benchX;
    const c2X = c1X + col1W + 16;
    const c3X = c2X + col2W + 16;
    const col3W = benchW - (c3X - benchX);

    // 1. Benchmark Column Headers Bar
    const headerH = 48;
    const headEnt = this.getBoxEntrance(animSec, 1.20, 0.38);
    if (headEnt.visible) {
      ctx.save();
      ctx.globalAlpha *= headEnt.alpha;
      const hMidX = benchX + benchW / 2;
      const hMidY = benchY + headerH / 2;
      ctx.translate(hMidX, hMidY + headEnt.yOffset);
      ctx.scale(headEnt.scale, headEnt.scale);
      ctx.translate(-hMidX, -hMidY);

      // Col 1 Header: Dark Navy Indigo Title
      ctx.fillStyle = '#1B365D';
      this.roundRect(ctx, c1X, benchY, col1W, headerH, 10);
      ctx.fill();
      ctx.fillStyle = '#F59E0B';
      this.roundRect(ctx, c1X + 12, benchY + 8, 5, headerH - 16, 3);
      ctx.fill();
      ctx.fillStyle = '#FDE68A';
      this.fillFittedText(ctx, '🏆 BENCHMARK EVALUATION', c1X + 26, benchY + 20, col1W - 40, 11.5, '700', '"JetBrains Mono", monospace');
      ctx.fillStyle = '#FFFFFF';
      this.fillFittedText(ctx, 'เปรียบเทียบประสิทธิผล 4 มิติ', c1X + 26, benchY + 38, col1W - 40, 14, '700', '"Prompt", sans-serif');

      // Col 2 Header: Traditional Workflow (Alert Rose Red)
      ctx.fillStyle = '#FFF1F2';
      this.roundRect(ctx, c2X, benchY, col2W, headerH, 10);
      ctx.fill();
      ctx.strokeStyle = '#F87171';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = '#991B1B';
      this.fillFittedText(ctx, '✕ TRADITIONAL WORKFLOW (กระบวนการเดิม • เสี่ยงคลาดเคลื่อนและล่าช้า)', c2X + 20, benchY + 30, col2W - 40, 15, '700', '"Prompt", sans-serif');

      // Col 3 Header: Digital 3D Pipeline (Vibrant Emerald)
      ctx.fillStyle = '#F0FDF4';
      this.roundRect(ctx, c3X, benchY, col3W, headerH, 10);
      ctx.fill();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = '#065F46';
      this.fillFittedText(ctx, '✓ DIGITAL 3D PIPELINE (ระบบดิจิทัล 3 มิติ • แม่นยำ รวดเร็ว ไร้รอยต่อ)', c3X + 20, benchY + 30, col3W - 40, 15.5, '700', '"Prompt", sans-serif');

      ctx.restore();
    }

    // 2. Comparison Rows (4 Items)
    const itemsY = benchY + headerH + 12;
    const rowH = 142;
    const rowGap = 14;

    const benchmarkRows = [
      {
        dim: 'SPEED & LATENCY',
        topic: '⚡ ความเร็วส่งต่องาน',
        subPill: '⏱️ วัฏจักรการส่งต่องาน',
        accentColor: '#F59E0B',
        // Old
        oldHead: 'ถอดแบบและออกเอกสารด้วยคน (Manual Draft)',
        oldDesc: 'ใช้เวลา 3 - 5 วัน • เอกสารตกหล่น • มีโอกาสเกิด Human Error สูง',
        oldPill: '⏳ ล่าช้า 3 - 5 วัน',
        // New
        newHead: 'สร้าง PO Auto & Job Order ทันที Real-Time',
        newDesc: 'คลิก Approve ปุ๊บ ยิงใบสั่งซื้อตรงสู่โรงงาน & คลังวัสดุทันทีใน 5 วินาที',
        metricTop: '⚡ SPEED GAIN',
        metricVal: 'เร็วขึ้น 10x',
        metricSub: 'Real-Time Automation',
        metricBg: '#FEF3C7',
        metricBorder: '#F59E0B',
        metricText: '#B45309'
      },
      {
        dim: 'PRECISION TOLERANCE',
        topic: '🎯 ความแม่นยำมิลลิเมตร',
        subPill: '📐 ค่าพิกัดความคลาดเคลื่อน',
        accentColor: '#06B6D4',
        // Old
        oldHead: 'วัดตัดหน้างาน เกิดคลาดเคลื่อนสะสม (Cumulative Error)',
        oldDesc: 'พึ่งพาฝีมือช่างรายบุคคล • คลาดเคลื่อนมากกว่า ±5.0 ถึง ±10 มม.',
        oldPill: '⚠️ คลาดเคลื่อนสะสม ±10 มม.',
        // New
        newHead: 'ควบคุมตัดเจาะด้วย Lantek CNC แม่นยำระดับ ±1.0 มม.',
        newDesc: 'ส่งพิกัด Electric Punch และรหัส SKU ตรงเข้าเครื่อง CNC อัตโนมัติ',
        metricTop: '🎯 TOLERANCE',
        metricVal: '±1.0 mm',
        metricSub: 'High Precision CNC',
        metricBg: '#ECFEFF',
        metricBorder: '#06B6D4',
        metricText: '#0E7490'
      },
      {
        dim: 'MATERIAL EFFICIENCY',
        topic: '♻️ การสูญเสียเศษวัสดุ',
        subPill: '🌱 วงจรวัสดุหมุนเวียน 100%',
        accentColor: '#10B981',
        // Old
        oldHead: 'สั่งเผื่อ มีเศษวัสดุเหลือทิ้งจำนวนมาก (Waste Accumulation)',
        oldDesc: 'สูญเสียเศษ 8 - 15% • สั่งของเกินจริง • เสียค่าจัดการกำจัดขยะ',
        oldPill: '🗑️ เศษเหลือทิ้ง 8 - 15%',
        // New
        newHead: 'สั่งตัดและสั่งซื้อพอดี 100% ปราศจากเศษเหลือ (Zero Waste)',
        newDesc: 'คำนวณจากโมเดล 3D พอดีทุกชิ้นส่วน สั่งซื้อแม่นยำ ประหยัดงบประมาณ',
        metricTop: '♻️ ZERO WASTE',
        metricVal: '100% พอดี',
        metricSub: 'Zero Residual Waste',
        metricBg: '#ECFDF5',
        metricBorder: '#10B981',
        metricText: '#047857'
      },
      {
        dim: 'DATA INTEGRATION',
        topic: '🔗 ความต่อเนื่องของข้อมูล',
        subPill: '📁 Single Source of Truth',
        accentColor: '#6366F1',
        // Old
        oldHead: 'ข้อมูลแยกส่วน พิมพ์ซ้ำหลายระบบ (Data Silos & Rework)',
        oldDesc: 'ไฟล์กระจัดกระจาย • ข้อมูลไม่ตรงกัน • ต้องรื้องานแก้แบบซ้ำซ้อน',
        oldPill: '⚡ เกิด Rework ซ้ำซาก',
        // New
        newHead: 'Single Source of Truth เชื่อมโยงโมเดลสู่ไซต์งาน 100%',
        newDesc: 'ข้อมูลโมเดล 3D เป็นหนึ่งเดียว ช่างประกอบตามแบบได้ทันที ไร้รอยต่อ',
        metricTop: '🔗 REWORK FREE',
        metricVal: '0% Rework',
        metricSub: 'Single Source 100%',
        metricBg: '#EEF2FF',
        metricBorder: '#6366F1',
        metricText: '#4338CA'
      }
    ];

    benchmarkRows.forEach((row, idx) => {
      const rowEnt = this.getBoxEntrance(animSec, 1.42 + idx * 0.22, 0.38);
      if (!rowEnt.visible) return;

      const ry = itemsY + idx * (rowH + rowGap);
      ctx.save();
      ctx.globalAlpha *= rowEnt.alpha;
      const rMidX = benchX + benchW / 2;
      const rMidY = ry + rowH / 2;
      ctx.translate(rMidX, rMidY + rowEnt.yOffset);
      ctx.scale(rowEnt.scale, rowEnt.scale);
      ctx.translate(-rMidX, -rMidY);

      // ---------- 1. LEFT COLUMN: TOPIC & DIMENSION CARD ----------
      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, c1X, ry, col1W, rowH, 12);
      ctx.fill();
      ctx.strokeStyle = '#1B365D';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Left Accent Strip
      ctx.fillStyle = row.accentColor;
      this.roundRect(ctx, c1X, ry, 8, rowH, 6);
      ctx.fill();

      // Dim Pill
      ctx.fillStyle = '#F1F5F9';
      this.roundRect(ctx, c1X + 18, ry + 16, col1W - 36, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#475569';
      this.fillFittedText(ctx, row.dim, c1X + 26, ry + 32, col1W - 52, 11, '700', '"JetBrains Mono", monospace');

      // Topic Title
      ctx.fillStyle = '#1B365D';
      this.fillFittedText(ctx, row.topic, c1X + 18, ry + 72, col1W - 36, 23, '700', '"Prompt", sans-serif');

      // Sub Pill
      ctx.fillStyle = '#F8FAFC';
      this.roundRect(ctx, c1X + 18, ry + 96, col1W - 36, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.0;
      ctx.stroke();
      ctx.fillStyle = '#64748B';
      this.fillFittedText(ctx, row.subPill, c1X + 28, ry + 115, col1W - 56, 13, '600', '"Prompt", sans-serif');

      // ---------- 2. MIDDLE COLUMN: TRADITIONAL METHOD (ALERT CARD) ----------
      ctx.fillStyle = '#FFF5F5';
      this.roundRect(ctx, c2X, ry, col2W, rowH, 12);
      ctx.fill();
      ctx.strokeStyle = '#FECDD3';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Left Red Accent Stripe
      ctx.fillStyle = '#F43F5E';
      this.roundRect(ctx, c2X, ry, 6, rowH, 4);
      ctx.fill();

      // Red Circle X Badge
      const icX2 = c2X + 20;
      const icY2 = ry + 20;
      ctx.fillStyle = '#FEE2E2';
      ctx.beginPath();
      ctx.arc(icX2 + 15, icY2 + 15, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.fillStyle = '#DC2626';
      ctx.font = 'bold 16px "Prompt", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', icX2 + 15, icY2 + 15);
      ctx.textAlign = 'left';

      // Old Method Heading
      ctx.fillStyle = '#991B1B';
      this.fillFittedText(ctx, row.oldHead, c2X + 58, ry + 36, col2W - 74, 19.5, '700', '"Prompt", sans-serif');

      // Old Method Detailed Description
      ctx.fillStyle = '#7F1D1D';
      this.fillFittedText(ctx, row.oldDesc, c2X + 58, ry + 68, col2W - 74, 15, '500', '"Prompt", sans-serif');

      // Old Method Impact Warning Pill
      ctx.fillStyle = '#FEE2E2';
      this.roundRect(ctx, c2X + 58, ry + 94, 230, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#FCA5A5';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#B91C1C';
      this.fillFittedText(ctx, row.oldPill, c2X + 70, ry + 113, 210, 13.5, '700', '"Prompt", sans-serif');

      // ---------- 3. RIGHT COLUMN: DIGITAL 3D PIPELINE (HERO CARD) ----------
      ctx.fillStyle = '#FFFFFF';
      this.roundRect(ctx, c3X, ry, col3W, rowH, 12);
      ctx.fill();

      // Soft Emerald Glow Tint
      ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
      this.roundRect(ctx, c3X, ry, col3W, rowH, 12);
      ctx.fill();

      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Left Vibrant Emerald Accent Stripe
      ctx.fillStyle = '#059669';
      this.roundRect(ctx, c3X, ry, 7, rowH, 4);
      ctx.fill();

      // Emerald Circle Check Badge
      const icX3 = c3X + 20;
      const icY3 = ry + 20;
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(icX3 + 16, icY3 + 16, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px "Prompt", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', icX3 + 16, icY3 + 16);
      ctx.textAlign = 'left';

      // Width reserved for right Hero Metric Badge
      const metricW = 185;
      const textMaxW = col3W - 64 - metricW - 20;

      // New Method Heading
      ctx.fillStyle = '#064E3B';
      this.fillFittedText(ctx, row.newHead, c3X + 62, ry + 36, textMaxW, 21, '700', '"Prompt", sans-serif');

      // New Method Detailed Description
      ctx.fillStyle = '#047857';
      this.fillFittedText(ctx, row.newDesc, c3X + 62, ry + 68, textMaxW, 15.5, '600', '"Prompt", sans-serif');

      // Feature Check Tag
      ctx.fillStyle = '#D1FAE5';
      this.roundRect(ctx, c3X + 62, ry + 94, 270, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#6EE7B7';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#065F46';
      this.fillFittedText(ctx, '✓ ระบบดิจิทัลอัตโนมัติสมบูรณ์แบบ', c3X + 74, ry + 113, 250, 13.5, '700', '"Prompt", sans-serif');

      // RIGHT-ALIGNED HERO METRIC BADGE (EYE-CATCHING CALLOUT)
      const mX = c3X + col3W - metricW - 16;
      const mY = ry + 14;
      const mH = rowH - 28;

      ctx.fillStyle = row.metricBg;
      this.roundRect(ctx, mX, mY, metricW, mH, 10);
      ctx.fill();
      ctx.strokeStyle = row.metricBorder;
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Inner Metric Top Tag
      ctx.fillStyle = row.metricText;
      this.fillFittedText(ctx, row.metricTop, mX + 12, mY + 22, metricW - 24, 12, '700', '"JetBrains Mono", monospace');

      // Big Hero Metric Number
      ctx.fillStyle = row.metricText;
      this.fillFittedText(ctx, row.metricVal, mX + 12, mY + 54, metricW - 24, 24, '800', '"Prompt", sans-serif');

      // Metric Subtag
      ctx.fillStyle = row.metricText;
      this.fillFittedText(ctx, row.metricSub, mX + 12, mY + 84, metricW - 24, 11.5, '600', '"Prompt", sans-serif');

      ctx.restore();
    });

    ctx.restore();
  }

  // ==================== REUSABLE JAPANESE ARCHITECTURAL CARDS & PIPES ====================
  drawJapaneseProcessCard(ctx, x, y, w, h, nd, idx, isActive, thumbImg = null) {
    const isV2 = this.themeVersion === 'v2';
    const actCol = isV2 ? '#F48244' : '#C84B31';
    const baseCol = isV2 ? '#5933A9' : '#1B365D';
    ctx.save();
    ctx.fillStyle = isV2 ? (isActive ? '#FFF7ED' : '#F4FBF8') : '#FFFFFF';
    this.roundRect(ctx, x, y, w, h, isV2 ? 20 : 12);
    ctx.fill();

    ctx.strokeStyle = isActive ? actCol : baseCol;
    ctx.lineWidth = isActive ? 3.2 : 2.0;
    ctx.stroke();

    ctx.fillStyle = isActive ? actCol : baseCol;
    this.roundRect(ctx, x, y, 10, h, 5);
    ctx.fill();

    // Hard clip inside card so text never overflows border
    ctx.save();
    this.roundRect(ctx, x + 9, y + 4, w - 18, h - 8, 8);
    ctx.clip();

    const icS = Math.min(108, h - 36);
    const icX = x + 20;
    const icY = y + (h - icS) / 2;
    ctx.fillStyle = isV2 ? '#E6F7F2' : '#FFFFFF';
    this.roundRect(ctx, icX, icY, icS, icS, 14);
    ctx.fill();

    // Solid Color Icon (สีพื้น)
    this.drawSolidColorIcon(ctx, nd.icon || 'draft', icX + icS / 2, icY + icS / 2, icS - 14, isActive ? actCol : (isV2 ? '#5933A9' : null), isActive);

    ctx.strokeStyle = isActive ? actCol : 'rgba(89, 51, 169, 0.22)';
    ctx.lineWidth = isActive ? 2.4 : 1.4;
    this.roundRect(ctx, icX, icY, icS, icS, 14);
    ctx.stroke();

    const tx = icX + icS + 20;
    const maxTextW = Math.max(80, w - (icS + 55));

    ctx.fillStyle = isActive ? actCol : baseCol;
    this.fillFittedText(ctx, nd.code || `STEP 0${idx + 1}`, tx, y + h * 0.26, maxTextW, 14.5, '700', '"JetBrains Mono", monospace');

    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, nd.label || '', tx, y + h * 0.52, maxTextW, 24, '700', '"Prompt", sans-serif');

    ctx.fillStyle = '#374151';
    ctx.font = '500 17px "Prompt", sans-serif';
    this.wrapText(ctx, nd.sub || '', tx, y + h * 0.74, maxTextW, 23, 2);

    ctx.restore();
    ctx.restore();
  }

  drawJapaneseDiagramNode(ctx, x, y, w, h, nd, accentColor, isActive, thumbImg = null) {
    const isV2 = this.themeVersion === 'v2';
    const actCol = isV2 ? '#F48244' : '#C84B31';
    const normCol = isV2 ? '#5933A9' : accentColor;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    this.roundRect(ctx, x + 6, y + 8, w, h, isV2 ? 24 : 16);
    ctx.fill();

    ctx.fillStyle = isV2 ? (isActive ? '#FFF7ED' : '#F4FBF8') : '#FFFFFF';
    this.roundRect(ctx, x, y, w, h, isV2 ? 24 : 16);
    ctx.fill();

    ctx.strokeStyle = isActive ? actCol : normCol;
    ctx.lineWidth = isActive ? 3.5 : 2.5;
    ctx.stroke();

    ctx.save();
    this.roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 12);
    ctx.clip();

    const isCompact = h < 200;
    const thX = x + 16;
    const thY = y + 16;
    const thW = w - 32;
    const thH = isCompact ? 68 : 88;
    ctx.fillStyle = isV2 ? '#E6F7F2' : '#FFFFFF';
    this.roundRect(ctx, thX, thY, thW, thH, 12);
    ctx.fill();

    const iconSize = Math.min(thH - 10, 68);
    this.drawSolidColorIcon(ctx, nd.icon || 'sketchup', thX + thW / 2, thY + thH / 2, iconSize, isActive ? actCol : normCol, isActive);

    ctx.strokeStyle = isActive ? actCol : 'rgba(89, 51, 169, 0.22)';
    ctx.lineWidth = 1.2;
    this.roundRect(ctx, thX, thY, thW, thH, 12);
    ctx.stroke();

    const maxW = Math.max(60, w - 24);
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, nd.label || '', x + w / 2, y + 144, maxW, 22, '700', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#374151';
    ctx.font = '500 16px "Prompt", sans-serif';
    this.wrapTextCentered(ctx, nd.sub || '', x + w / 2, y + 176, maxW, 22, 2);

    ctx.restore();
    ctx.restore();
  }

  drawJapanesePipelineCard(ctx, x, y, w, h, nd, accentColor, isActive, thumbImg = null) {
    const isV2 = this.themeVersion === 'v2';
    const actCol = isV2 ? '#F48244' : accentColor;
    const baseCol = isV2 ? '#5933A9' : '#1B365D';
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    this.roundRect(ctx, x + 6, y + 10, w, h, isV2 ? 24 : 16);
    ctx.fill();

    ctx.fillStyle = isV2 ? (isActive ? '#FFF7ED' : '#F4FBF8') : '#FFFFFF';
    this.roundRect(ctx, x, y, w, h, isV2 ? 24 : 16);
    ctx.fill();

    ctx.strokeStyle = isActive ? actCol : baseCol;
    ctx.lineWidth = isActive ? 3.2 : 2.2;
    ctx.stroke();

    ctx.fillStyle = isActive ? actCol : baseCol;
    this.roundRect(ctx, x + 2, y + h - 14, w - 4, 12, 6);
    ctx.fill();

    ctx.save();
    this.roundRect(ctx, x + 6, y + 6, w - 12, h - 22, 12);
    ctx.clip();

    const thW = 160;
    const thH = 114;
    const thX = x + (w - thW) / 2;
    const thY = y + 16;
    ctx.fillStyle = isV2 ? '#E6F7F2' : '#FFFFFF';
    this.roundRect(ctx, thX, thY, thW, thH, 14);
    ctx.fill();

    const iconSize = Math.min(thH - 12, 82);
    this.drawSolidColorIcon(ctx, nd.icon || 'po', thX + thW / 2, thY + thH / 2, iconSize, isActive ? actCol : baseCol, isActive);

    ctx.strokeStyle = isActive ? actCol : 'rgba(89, 51, 169, 0.22)';
    ctx.lineWidth = 1.2;
    this.roundRect(ctx, thX, thY, thW, thH, 14);
    ctx.stroke();

    const maxW = Math.max(60, w - 24);
    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, nd.label || '', x + w / 2, y + 172, maxW, 24, '700', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#374151';
    ctx.font = '500 17px "Prompt", sans-serif';
    this.wrapTextCentered(ctx, nd.sub || '', x + w / 2, y + 204, maxW, 23, 2);

    ctx.restore();
    ctx.restore();
  }

  drawJapaneseBlueprintBorderCard(ctx, x, y, w, h, nd, accentColor, isActive, thumbImg = null) {
    const isV2 = this.themeVersion === 'v2';
    const actCol = isV2 ? '#F48244' : '#C84B31';
    const baseCol = isV2 ? '#5933A9' : accentColor;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    this.roundRect(ctx, x + 6, y + 10, w, h, isV2 ? 24 : 18);
    ctx.fill();

    ctx.fillStyle = isV2 ? (isActive ? '#FFF7ED' : '#F4FBF8') : '#FFFFFF';
    this.roundRect(ctx, x, y, w, h, isV2 ? 24 : 18);
    ctx.fill();

    ctx.strokeStyle = isActive ? actCol : baseCol;
    ctx.lineWidth = 3.2;
    ctx.stroke();

    ctx.strokeStyle = isV2 ? 'rgba(244, 130, 68, 0.35)' : 'rgba(27, 54, 93, 0.28)';
    ctx.lineWidth = 1.2;
    this.roundRect(ctx, x + 10, y + 10, w - 20, h - 20, 14);
    ctx.stroke();

    ctx.save();
    this.roundRect(ctx, x + 12, y + 12, w - 24, h - 24, 8);
    ctx.clip();

    const isCompact = h < 245;
    const thW = isCompact ? 144 : 164;
    const thH = isCompact ? 92 : 112;
    const thX = x + (w - thW) / 2;
    const thY = isCompact ? y + 14 : y + 18;

    ctx.fillStyle = isV2 ? '#E6F7F2' : '#FFFFFF';
    this.roundRect(ctx, thX, thY, thW, thH, 12);
    ctx.fill();

    const iconSize = Math.min(thH - 10, 68);
    this.drawSolidColorIcon(ctx, nd.icon || 'cnc', thX + thW / 2, thY + thH / 2, iconSize, isActive ? actCol : baseCol, isActive);

    ctx.strokeStyle = isActive ? actCol : 'rgba(89, 51, 169, 0.22)';
    ctx.lineWidth = 1.2;
    this.roundRect(ctx, thX, thY, thW, thH, 12);
    ctx.stroke();

    const maxW = Math.max(60, w - 30);
    const codeY = isCompact ? y + 126 : y + 146;
    const labelY = isCompact ? y + 152 : y + 178;
    const subY = isCompact ? y + 182 : y + 212;

    if (nd.code) {
      ctx.fillStyle = isActive ? actCol : baseCol;
      this.fillFittedText(ctx, nd.code, x + w / 2, codeY, maxW, 14, '700', '"JetBrains Mono", monospace', 'center');
    }

    ctx.fillStyle = '#111827';
    this.fillFittedText(ctx, nd.label || '', x + w / 2, labelY, maxW, 22, '700', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#374151';
    ctx.font = '500 16px "Prompt", sans-serif';
    this.wrapTextCentered(ctx, nd.sub || '', x + w / 2, subY, maxW, 22, 2);

    ctx.restore();
    ctx.restore();
  }

  drawJapaneseHeroNode(ctx, x, y, w, h, nd, isActive, nowSec, heroImg = null) {
    const isV2 = this.themeVersion === 'v2';
    ctx.save();
    ctx.fillStyle = isV2 ? '#F4FBF8' : '#FFFFFF';
    this.roundRect(ctx, x, y, w, h, isV2 ? 26 : 16);
    ctx.fill();
    ctx.strokeStyle = isV2 ? '#5933A9' : '#1B365D';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = isV2 ? '#5933A9' : '#1B365D';
    this.roundRect(ctx, x, y, w, 54, isV2 ? 22 : 14);
    ctx.fill();

    ctx.save();
    this.roundRect(ctx, x + 8, y + 4, w - 16, h - 12, 12);
    ctx.clip();

    const maxW = Math.max(80, w - 36);
    ctx.fillStyle = isV2 ? '#85DCC9' : '#FFFFFF';
    this.fillFittedText(ctx, nd.code || 'FINAL OUTPUT', x + w / 2, y + 34, maxW, 15.5, '700', '"JetBrains Mono", monospace', 'center');

    const imW = w - 44;
    const imH = 220;
    const imX = x + 22;
    const imY = y + 68;
    ctx.fillStyle = isV2 ? '#E6F7F2' : '#FFFFFF';
    this.roundRect(ctx, imX, imY, imW, imH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(89, 51, 169, 0.20)';
    ctx.lineWidth = 1.2;
    this.roundRect(ctx, imX, imY, imW, imH, 14);
    ctx.stroke();

    this.drawSolidColorIcon(ctx, nd.icon || 'walldone', imX + imW / 2, imY + imH / 2, Math.min(imH - 24, 130), isV2 ? '#F48244' : '#C84B31', true);

    ctx.fillStyle = isV2 ? '#5933A9' : '#1B365D';
    this.fillFittedText(ctx, nd.label || '', x + w / 2, y + 328, maxW, 21.5, '700', '"Prompt", sans-serif', 'center');

    ctx.fillStyle = '#374151';
    ctx.font = '500 15.5px "Prompt", sans-serif';
    this.wrapTextCentered(ctx, nd.sub || '', x + w / 2, y + 365, maxW, 23, 3);

    // Bottom Verification Status Badge inside Hero Card
    const badgeW = w - 48;
    const badgeX = x + 24;
    const badgeY = y + h - 54;
    ctx.fillStyle = isV2 ? '#84D3BD' : 'rgba(46, 111, 86, 0.12)';
    this.roundRect(ctx, badgeX, badgeY, badgeW, 36, 18);
    ctx.fill();
    ctx.strokeStyle = isV2 ? '#EB8B55' : '#2E6F56';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = isV2 ? '#111827' : '#2E6F56';
    this.fillFittedText(ctx, '✓ DWG TOLERANCE ±1.0 mm • SAVES 89% TIME', x + w / 2, badgeY + 23, badgeW - 20, 12.5, '700', '"JetBrains Mono", monospace', 'center');

    ctx.restore();
    ctx.restore();
  }

  drawCompactStepPill(ctx, x, y, w, h, nd, idx, isCur) {
    const isV2 = this.themeVersion === 'v2';
    const actCol = isV2 ? '#F48244' : '#C84B31';
    const baseCol = isV2 ? '#5933A9' : '#1B365D';
    ctx.save();
    ctx.fillStyle = isV2 ? '#F4FBF8' : '#FFFFFF';
    this.roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = isCur ? actCol : baseCol;
    ctx.lineWidth = isCur ? 2.6 : 1.8;
    ctx.stroke();

    ctx.save();
    this.roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 8);
    ctx.clip();

    ctx.fillStyle = isCur ? actCol : baseCol;
    this.roundRect(ctx, x + 10, y + 10, 48, h - 20, 7);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    this.fillFittedText(ctx, nd.code || `0${idx + 1}`, x + 34, y + 42, 42, 14.5, '700', '"JetBrains Mono", monospace', 'center');

    const maxW = Math.max(50, w - 82);
    ctx.fillStyle = isCur ? actCol : baseCol;
    this.fillFittedText(ctx, nd.label || '', x + 68, y + 31, maxW, 15.5, '700', '"Prompt", sans-serif');
    ctx.fillStyle = '#374151';
    this.fillFittedText(ctx, nd.sub || '', x + 68, y + 53, maxW, 12.5, '400', '"Prompt", sans-serif');

    ctx.restore();
    ctx.restore();
  }

  // ==================== PROCEDURAL HANDOFF ARROWS & FLOWING PULSES ====================
  drawHandoffPipe(ctx, x1, y1, x2, y2, nowSec, showArrowHead = true, label = '') {
    const isV2 = this.themeVersion === 'v2';
    const lineCol = isV2 ? '#F58245' : '#1B365D';
    const dotCol = isV2 ? '#5933A9' : '#C84B31';
    ctx.save();
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const p = (nowSec * 0.9) % 1;
    const px = x1 + (x2 - x1) * p;
    const py = y1 + (y2 - y1) * p;

    ctx.fillStyle = dotCol;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();

    if (showArrowHead) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.fillStyle = lineCol;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 16 * Math.cos(angle - 0.45), y2 - 16 * Math.sin(angle - 0.45));
      ctx.lineTo(x2 - 16 * Math.cos(angle + 0.45), y2 - 16 * Math.sin(angle + 0.45));
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  drawCleanOrthogonalPipe(ctx, pts, col = '#059669', hasArrow = false, nowSec = 0, speed = 1.0, radius = 10) {
    if (!pts || pts.length < 2) return;

    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);

    for (let i = 1; i < pts.length; i++) {
      const cur = pts[i];
      const next = pts[i + 1];
      if (next && radius > 0) {
        ctx.arcTo(cur.x, cur.y, next.x, next.y, radius);
      } else {
        ctx.lineTo(cur.x, cur.y);
      }
    }
    ctx.stroke();

    // Traveling laser pulse along the pipe
    if (nowSec > 0) {
      ctx.save();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([8, 16]);
      ctx.lineDashOffset = -nowSec * 10 * (speed || 1.0);
      ctx.stroke();
      ctx.restore();
    }

    // Directional Arrow Head at the end point
    if (hasArrow) {
      const endPt = pts[pts.length - 1];
      const prevPt = pts[pts.length - 2];
      const dx = endPt.x - prevPt.x;
      const dy = endPt.y - prevPt.y;
      const angle = Math.atan2(dy, dx);
      const headLen = 11;

      ctx.save();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(endPt.x, endPt.y);
      ctx.lineTo(endPt.x - headLen * Math.cos(angle - Math.PI / 6), endPt.y - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(endPt.x - (headLen * 0.6) * Math.cos(angle), endPt.y - (headLen * 0.6) * Math.sin(angle));
      ctx.lineTo(endPt.x - headLen * Math.cos(angle + Math.PI / 6), endPt.y - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  drawThickRedHandoffArrow(ctx, x1, y1, x2, y2, nowSec) {
    if (this.themeVersion === 'v2') {
      this.drawVer2BlockArrow(ctx, x1, y1, x2, y2, nowSec, 13);
      return;
    }
    ctx.save();
    const headLen = 20;
    ctx.strokeStyle = '#C84B31';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - headLen + 4, y2);
    ctx.stroke();

    ctx.fillStyle = '#C84B31';
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen, y2 - 16);
    ctx.lineTo(x2 - headLen, y2 + 16);
    ctx.closePath();
    ctx.fill();

    const p = (nowSec * 1.2) % 1;
    const px = x1 + (x2 - headLen - x1) * p;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px, y1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBezierHandoffPipe(ctx, x1, y1, x2, y2, nowSec, color = '#1B365D', label = '') {
    const isV2 = this.themeVersion === 'v2';
    const pipeCol = isV2 ? '#F58245' : color;
    ctx.save();
    const dx = x2 - x1;
    const cp1x = x1 + dx * 0.48;
    const cp1y = y1;
    const cp2x = x2 - dx * 0.48;
    const cp2y = y2;

    // Smooth Japanese Architectural Bezier Curve
    ctx.strokeStyle = pipeCol;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    ctx.stroke();

    // Arrow Head pointing directly into Destination Card
    ctx.fillStyle = pipeCol;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 14, y2 - 7);
    ctx.lineTo(x2 - 14, y2 + 7);
    ctx.closePath();
    ctx.fill();

    // Traveling Energy Bead sliding smoothly along the cubic Bezier curve
    const t = (nowSec * 0.8) % 1;
    const it = 1 - t;
    const px = it * it * it * x1 + 3 * it * it * t * cp1x + 3 * it * t * t * cp2x + t * t * t * x2;
    const py = it * it * it * y1 + 3 * it * it * t * cp1y + 3 * it * t * t * cp2y + t * t * t * y2;

    ctx.fillStyle = isV2 ? '#5933A9' : '#C84B31';
    ctx.beginPath();
    ctx.arc(px, py, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();
  }

  drawOrthogonalHandoffPipe(ctx, pts, nowSec, color = '#1B365D', label = '') {
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cornerRadius = 34;

    if (pts.length === 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
    } else {
      // Smooth Fillet Curved Corner according to Clean Japanese Architectural Style
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        ctx.arcTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, cornerRadius);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }

    // Origin Socket Bead on Source Node
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Arrow Head pointing directly into Destination Card
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(last.x - 16 * Math.cos(angle - 0.45), last.y - 16 * Math.sin(angle - 0.45));
    ctx.lineTo(last.x - 16 * Math.cos(angle + 0.45), last.y - 16 * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();

    // Traveling Data Packet sliding smoothly across straight runs and around the corner curve
    const p = (nowSec * 0.75) % 1;
    let px = pts[0].x;
    let py = pts[0].y;

    if (pts.length === 3) {
      const p0 = pts[0], p1 = pts[1], p2 = pts[2];
      const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
      const len1 = Math.hypot(v1.x, v1.y);
      const u1 = len1 > 0 ? { x: v1.x / len1, y: v1.y / len1 } : { x: 0, y: 0 };

      const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
      const len2 = Math.hypot(v2.x, v2.y);
      const u2 = len2 > 0 ? { x: v2.x / len2, y: v2.y / len2 } : { x: 0, y: 0 };

      const actualR = Math.min(cornerRadius, len1 * 0.45, len2 * 0.45);
      const d1 = len1 - actualR;
      const dArc = actualR * Math.PI * 0.5;
      const d2 = len2 - actualR;
      const totalLen = Math.max(1, d1 + dArc + d2);
      const curD = p * totalLen;

      if (curD <= d1) {
        px = p0.x + u1.x * curD;
        py = p0.y + u1.y * curD;
      } else if (curD <= d1 + dArc) {
        const arcT = (curD - d1) / dArc;
        const t1 = { x: p1.x - u1.x * actualR, y: p1.y - u1.y * actualR };
        const center = { x: p1.x + u2.x * actualR, y: p1.y - u1.y * actualR };
        const ang1 = Math.atan2(t1.y - center.y, t1.x - center.x);
        const t2 = { x: p1.x + u2.x * actualR, y: p1.y + u2.y * actualR };
        const ang2 = Math.atan2(t2.y - center.y, t2.x - center.x);
        let diff = ang2 - ang1;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const ang = ang1 + diff * arcT;
        px = center.x + actualR * Math.cos(ang);
        py = center.y + actualR * Math.sin(ang);
      } else {
        const rem = curD - (d1 + dArc);
        const t2 = { x: p1.x + u2.x * actualR, y: p1.y + u2.y * actualR };
        px = t2.x + u2.x * rem;
        py = t2.y + u2.y * rem;
      }
    } else {
      const segIdx = Math.min(pts.length - 2, Math.floor(p * (pts.length - 1)));
      const localP = (p * (pts.length - 1)) - segIdx;
      px = pts[segIdx].x + (pts[segIdx + 1].x - pts[segIdx].x) * localP;
      py = pts[segIdx].y + (pts[segIdx + 1].y - pts[segIdx].y) * localP;
    }

    ctx.fillStyle = '#C84B31';
    ctx.beginPath();
    ctx.arc(px, py, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ==================== PROCEDURAL ARCHITECTURAL SOLID-COLOR FLAT ICONS (ไอคอนสีพื้น) ====================
  getIconColorTheme(iconType, customColor, isActive) {
    if (isActive) {
      return { bg: '#C84B31', fg: '#FFFFFF', sub: 'rgba(255, 255, 255, 0.40)' };
    }
    if (customColor) {
      return { bg: customColor, fg: '#FFFFFF', sub: 'rgba(255, 255, 255, 0.40)' };
    }

    switch (iconType) {
      // 3D / Modeling / Software
      case 'sketchup':
        return { bg: '#0284C7', fg: '#FFFFFF', sub: '#BAE6FD' };
      case 'cad':
      case 'cadjob':
        return { bg: '#1E40AF', fg: '#FFFFFF', sub: '#BFDBFE' };
      case 'draft':
        return { bg: '#475569', fg: '#FFFFFF', sub: '#E2E8F0' };
      case 'blueprint':
        return { bg: '#1E3A8A', fg: '#FFFFFF', sub: '#93C5FD' };

      // Wall / Material / Assembly
      case 'frame3d':
        return { bg: '#0F766E', fg: '#FFFFFF', sub: '#99F6E4' };
      case 'insulation':
        return { bg: '#D97706', fg: '#FFFFFF', sub: '#FDE68A' };
      case 'board':
        return { bg: '#059669', fg: '#FFFFFF', sub: '#A7F3D0' };
      case 'walldone':
        return { bg: '#2E6F56', fg: '#FFFFFF', sub: '#A7F3D0' };

      // Hardware / Punch / Factory / CNC
      case 'punch':
        return { bg: '#DC2626', fg: '#FFFFFF', sub: '#FECACA' };
      case 'cnc':
        return { bg: '#B91C1C', fg: '#FFFFFF', sub: '#FECDD3' };
      case 'lantek':
        return { bg: '#7C3AED', fg: '#FFFFFF', sub: '#DDD6FE' };
      case 'factory':
        return { bg: '#334155', fg: '#FFFFFF', sub: '#CBD5E1' };

      // Orders / Warehouse / Hub / Manual
      case 'po':
        return { bg: '#2563EB', fg: '#FFFFFF', sub: '#BFDBFE' };
      case 'parts':
        return { bg: '#D97706', fg: '#FFFFFF', sub: '#FDE68A' };
      case 'store':
        return { bg: '#EA580C', fg: '#FFFFFF', sub: '#FFEDD5' };
      case 'wallhub':
        return { bg: '#0D9488', fg: '#FFFFFF', sub: '#99F6E4' };
      case 'manual':
        return { bg: '#4F46E5', fg: '#FFFFFF', sub: '#C7D2FE' };

      default:
        return { bg: '#1B365D', fg: '#FFFFFF', sub: 'rgba(255, 255, 255, 0.35)' };
    }
  }

  drawSolidColorIcon(ctx, iconType, cx, cy, size, customColor = null, isActive = false) {
    const raw = (iconType || 'default').toLowerCase().trim();
    let type = raw;
    if (type.includes('sketchup') || type === 'su') type = 'sketchup';
    else if (type.includes('frame') || type.includes('stud') || type === 'c75') type = 'frame3d';
    else if (type.includes('insul') || type.includes('mep')) type = 'insulation';
    else if (type.includes('board') || type.includes('partition')) type = 'board';
    else if (type.includes('walldone') || type.includes('phys') || type === 'wall') type = 'walldone';
    else if (type.includes('draft') || type.includes('sketch')) type = 'draft';
    else if (type === 'cad' || type.includes('autocad')) type = 'cad';
    else if (type.includes('blue') || type.includes('plan') || type.includes('doc')) type = 'blueprint';
    else if (type.includes('punch') || type.includes('outlet')) type = 'punch';
    else if (type.includes('hub')) type = 'wallhub';
    else if (type.includes('manual') || type.includes('book') || type.includes('read')) type = 'manual';
    else if (type.includes('po') || type.includes('order')) type = 'po';
    else if (type.includes('part')) type = 'parts';
    else if (type.includes('fact') || type.includes('plant')) type = 'factory';
    else if (type.includes('store') || type.includes('ware') || type.includes('stock')) type = 'store';
    else if (type.includes('cadjob') || type.includes('dxf')) type = 'cadjob';
    else if (type.includes('lantek') || type.includes('nest')) type = 'lantek';
    else if (type.includes('cnc') || type.includes('cut') || type.includes('laser')) type = 'cnc';

    const theme = this.getIconColorTheme(type, customColor, isActive);
    const badgeR = Math.max(6, size * 0.22);
    const bx = cx - size / 2;
    const by = cy - size / 2;

    ctx.save();

    // 1. Solid Color Badge Container (สีพื้นทึบ เรียบคมชัด สไตล์มินิมอล)
    ctx.fillStyle = theme.bg;
    this.roundRect(ctx, bx, by, size, size, badgeR);
    ctx.fill();

    // Subtle crisp inner stroke
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = Math.max(1, size * 0.025);
    this.roundRect(ctx, bx + 0.8, by + 0.8, size - 1.6, size - 1.6, Math.max(4, badgeR - 1));
    ctx.stroke();

    // 2. Render Solid Vector Icon Silhouette in Crisp White (#FFFFFF)
    const r = size * 0.28;
    const fg = theme.fg;
    const sub = theme.sub;

    ctx.fillStyle = fg;
    ctx.strokeStyle = fg;
    ctx.lineWidth = Math.max(1.8, size * 0.04);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (type) {
      case 'frame3d': {
        // C-Stud Frame (Vertical studs + horizontal tracks + punch holes)
        const fw = r * 1.5;
        const fh = r * 1.5;
        const fx = cx - fw / 2;
        const fy = cy - fh / 2;
        const trackH = Math.max(3, fh * 0.14);
        ctx.fillRect(fx, fy, fw, trackH);
        ctx.fillRect(fx, fy + fh - trackH, fw, trackH);
        const studW = Math.max(3.5, fw * 0.16);
        const colXs = [fx + fw * 0.08, fx + (fw - studW) / 2, fx + fw * 0.92 - studW];
        colXs.forEach(colX => {
          ctx.fillRect(colX, fy + trackH, studW, fh - trackH * 2);
          ctx.fillStyle = theme.bg;
          const holeR = studW * 0.32;
          ctx.beginPath();
          ctx.arc(colX + studW / 2, cy - fh * 0.18, holeR, 0, Math.PI * 2);
          ctx.arc(colX + studW / 2, cy + fh * 0.18, holeR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = fg;
        });
        break;
      }

      case 'insulation': {
        // Insulation Batt with MEP pipe
        const w = r * 1.5;
        const h = r * 1.5;
        const x = cx - w / 2;
        const y = cy - h / 2;
        ctx.strokeRect(x, y, w, h);
        ctx.strokeStyle = sub;
        ctx.lineWidth = Math.max(2.5, size * 0.055);
        ctx.beginPath();
        const steps = 4;
        for (let s = 0; s <= steps; s++) {
          const py = y + 4 + (s / steps) * (h - 8);
          const px = s % 2 === 0 ? x + 6 : x + w - 6;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.fillStyle = fg;
        ctx.fillRect(x - 3, cy - 4, w + 6, 8);
        ctx.fillStyle = theme.bg;
        ctx.fillRect(cx - 3, cy - 6, 6, 12);
        break;
      }

      case 'board': {
        // Overlapping Wall Partition Boards with joint seam & screw marks
        const bw = r * 1.4;
        const bh = r * 1.5;
        const bx0 = cx - bw / 2;
        const by0 = cy - bh / 2;
        ctx.fillStyle = sub;
        ctx.fillRect(bx0, by0, bw * 0.52, bh);
        ctx.fillStyle = fg;
        ctx.fillRect(bx0 + bw * 0.48, by0 + 3, bw * 0.52, bh - 6);
        ctx.strokeStyle = theme.bg;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx0 + bw * 0.5, by0);
        ctx.lineTo(bx0 + bw * 0.5, by0 + bh);
        ctx.stroke();
        ctx.fillStyle = theme.bg;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(bx0 + bw * 0.5, by0 + bh * 0.25 + k * (bh * 0.25), 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'walldone': {
        // Terracotta Wall Siding with inspection pass seal
        const w = r * 1.5;
        const h = r * 1.4;
        const x = cx - w / 2;
        const y = cy - h / 2;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = theme.bg;
        ctx.lineWidth = 2;
        const slats = 3;
        for (let i = 1; i <= slats; i++) {
          const sy = y + (i / (slats + 1)) * h;
          ctx.beginPath();
          ctx.moveTo(x + 2, sy);
          ctx.lineTo(x + w - 2, sy);
          ctx.stroke();
        }
        const sealR = r * 0.42;
        const sx = cx + r * 0.48;
        const sy = cy + r * 0.42;
        ctx.fillStyle = '#C84B31';
        ctx.beginPath();
        ctx.arc(sx, sy, sealR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(sx, sy, sealR - 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx - sealR * 0.45, sy);
        ctx.lineTo(sx - sealR * 0.1, sy + sealR * 0.35);
        ctx.lineTo(sx + sealR * 0.45, sy - sealR * 0.35);
        ctx.stroke();
        break;
      }

      case 'draft': {
        // Drafting Triangle (Set Square) + Drafting Pencil
        const tw = r * 1.4;
        const th = r * 1.4;
        const tx = cx - tw / 2;
        const ty = cy + th / 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + tw, ty);
        ctx.lineTo(tx, ty - th);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.bg;
        ctx.beginPath();
        ctx.moveTo(tx + tw * 0.22, ty - th * 0.18);
        ctx.lineTo(tx + tw * 0.68, ty - th * 0.18);
        ctx.lineTo(tx + tw * 0.22, ty - th * 0.64);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = sub;
        ctx.save();
        ctx.translate(cx + 4, cy - 4);
        ctx.rotate(-Math.PI / 4);
        ctx.fillRect(-3, -th * 0.45, 6, th * 0.9);
        ctx.beginPath();
        ctx.moveTo(-3, th * 0.45);
        ctx.lineTo(3, th * 0.45);
        ctx.lineTo(0, th * 0.65);
        ctx.closePath();
        ctx.fillStyle = fg;
        ctx.fill();
        ctx.restore();
        break;
      }

      case 'sketchup': {
        // Isometric 3D Cube Model
        const s = r * 0.95;
        const h = s * 0.55;
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + s * 0.86, cy - s + h);
        ctx.lineTo(cx, cy - s + 2 * h);
        ctx.lineTo(cx - s * 0.86, cy - s + h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = sub;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.86, cy - s + h);
        ctx.lineTo(cx, cy - s + 2 * h);
        ctx.lineTo(cx, cy + s);
        ctx.lineTo(cx - s * 0.86, cy + s - h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.beginPath();
        ctx.moveTo(cx, cy - s + 2 * h);
        ctx.lineTo(cx + s * 0.86, cy - s + h);
        ctx.lineTo(cx + s * 0.86, cy + s - h);
        ctx.lineTo(cx, cy + s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = theme.bg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s + 2 * h);
        ctx.lineTo(cx, cy + s);
        ctx.moveTo(cx, cy - s + 2 * h);
        ctx.lineTo(cx - s * 0.86, cy - s + h);
        ctx.moveTo(cx, cy - s + 2 * h);
        ctx.lineTo(cx + s * 0.86, cy - s + h);
        ctx.stroke();
        break;
      }

      case 'cad': {
        // AutoCAD 2D Floorplan with Dimension Line
        const w = r * 1.5;
        const h = r * 1.3;
        const x = cx - w / 2;
        const y = cy - h / 2;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.55, y);
        ctx.lineTo(x + w * 0.55, y + h * 0.6);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = sub;
        ctx.beginPath();
        ctx.arc(x + w * 0.55, y + h, h * 0.4, Math.PI, Math.PI * 1.5);
        ctx.stroke();
        ctx.strokeStyle = fg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 5); ctx.lineTo(x + w, y - 5);
        ctx.moveTo(x, y - 8); ctx.lineTo(x, y - 2);
        ctx.moveTo(x + w, y - 8); ctx.lineTo(x + w, y - 2);
        ctx.stroke();
        break;
      }

      case 'blueprint': {
        // Official Construction Document Blueprint Sheet
        const bw = r * 1.35;
        const bh = r * 1.55;
        const bx0 = cx - bw / 2;
        const by0 = cy - bh / 2;
        ctx.fillRect(bx0, by0, bw, bh);
        ctx.fillStyle = theme.bg;
        ctx.fillRect(bx0 + 3, by0 + 3, bw - 6, bh * 0.22);
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(bx0 + 4, by0 + bh * 0.36 + i * (bh * 0.18), bw * (0.85 - i * 0.15), 2.5);
        }
        ctx.fillStyle = '#C84B31';
        ctx.beginPath();
        ctx.arc(bx0 + bw - 6, by0 + bh - 6, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'punch': {
        // MEP Electrical Outlet Faceplate & Sockets
        const pw = r * 1.35;
        const ph = r * 1.5;
        const px = cx - pw / 2;
        const py = cy - ph / 2;
        this.roundRect(ctx, px, py, pw, ph, 6);
        ctx.fill();
        ctx.fillStyle = theme.bg;
        const sockH = ph * 0.36;
        const sockW = pw * 0.68;
        const sX = cx - sockW / 2;
        this.roundRect(ctx, sX, py + ph * 0.10, sockW, sockH, 4);
        ctx.fill();
        this.roundRect(ctx, sX, py + ph * 0.54, sockW, sockH, 4);
        ctx.fill();
        ctx.fillStyle = fg;
        [py + ph * 0.10 + sockH / 2, py + ph * 0.54 + sockH / 2].forEach(midY => {
          ctx.fillRect(cx - 6, midY - 4, 3, 8);
          ctx.fillRect(cx + 3, midY - 4, 3, 8);
          ctx.beginPath();
          ctx.arc(cx, midY - 7, 1.8, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      }

      case 'wallhub': {
        // Central Node with 3 Radiating Branch Arrows
        const hubR = r * 0.45;
        ctx.beginPath();
        ctx.arc(cx - r * 0.3, cy, hubR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.bg;
        ctx.beginPath();
        ctx.arc(cx - r * 0.3, cy, hubR * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = fg;
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = fg;
        const targets = [
          { y: cy - r * 0.6 },
          { y: cy },
          { y: cy + r * 0.6 }
        ];
        targets.forEach(tgt => {
          ctx.beginPath();
          ctx.moveTo(cx - r * 0.3 + hubR, cy);
          ctx.lineTo(cx + r * 0.4, tgt.y);
          ctx.lineTo(cx + r * 0.7, tgt.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + r * 0.7, tgt.y - 4);
          ctx.lineTo(cx + r * 0.95, tgt.y);
          ctx.lineTo(cx + r * 0.7, tgt.y + 4);
          ctx.closePath();
          ctx.fill();
        });
        break;
      }

      case 'manual': {
        // Open Technical Handbook
        const mw = r * 1.55;
        const mh = r * 1.25;
        const mx = cx - mw / 2;
        const my = cy - mh / 2;
        ctx.fillRect(mx, my, mw * 0.47, mh);
        ctx.fillRect(mx + mw * 0.53, my, mw * 0.47, mh);
        ctx.fillStyle = theme.bg;
        ctx.fillRect(mx + mw * 0.47, my, mw * 0.06, mh);
        ctx.fillRect(mx + 4, my + 6, mw * 0.35, mh * 0.3);
        ctx.fillRect(mx + 4, my + mh * 0.5, mw * 0.35, 2.5);
        ctx.fillRect(mx + 4, my + mh * 0.68, mw * 0.28, 2.5);
        ctx.fillRect(mx + mw * 0.57, my + 8, mw * 0.35, 2.5);
        ctx.fillRect(mx + mw * 0.57, my + 16, mw * 0.35, 2.5);
        ctx.fillRect(mx + mw * 0.57, my + 24, mw * 0.25, 2.5);
        ctx.fillStyle = '#C84B31';
        ctx.fillRect(mx + mw * 0.48, my - 3, mw * 0.08, mh * 0.4);
        break;
      }

      case 'po': {
        // Purchase Order Document Sheet with Stamp
        const pw = r * 1.35;
        const ph = r * 1.55;
        const px = cx - pw / 2;
        const py = cy - ph / 2;
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = theme.bg;
        ctx.fillRect(px + 4, py + 5, pw * 0.45, 3.5);
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(px + 4, py + ph * 0.28 + i * (ph * 0.16), pw * 0.72, 2.2);
        }
        const stampR = r * 0.44;
        const sx = cx + r * 0.45;
        const sy = cy + r * 0.45;
        ctx.fillStyle = '#C84B31';
        ctx.beginPath();
        ctx.arc(sx, sy, stampR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `700 ${Math.max(8, size * 0.15)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PO', sx, sy);
        break;
      }

      case 'parts': {
        // 4 Inventory Parts Grid
        const gw = r * 1.45;
        const gh = r * 1.45;
        const gx = cx - gw / 2;
        const gy = cy - gh / 2;
        const boxS = gw * 0.43;
        const gap = gw * 0.14;
        const coords = [
          [gx, gy],
          [gx + boxS + gap, gy],
          [gx, gy + boxS + gap],
          [gx + boxS + gap, gy + boxS + gap]
        ];
        coords.forEach(([bxk, byk], i) => {
          ctx.fillStyle = i === 3 ? sub : fg;
          this.roundRect(ctx, bxk, byk, boxS, boxS, 4);
          ctx.fill();
          ctx.fillStyle = theme.bg;
          ctx.fillRect(bxk + 3, byk + 3, boxS - 6, 2.5);
        });
        break;
      }

      case 'factory': {
        // Manufacturing Plant with Saw-tooth Roof & Chimney
        const fw = r * 1.6;
        const fh = r * 1.3;
        const fx = cx - fw / 2;
        const fy = cy + fh / 2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx, fy - fh * 0.5);
        ctx.lineTo(fx + fw * 0.3, fy - fh);
        ctx.lineTo(fx + fw * 0.3, fy - fh * 0.5);
        ctx.lineTo(fx + fw * 0.6, fy - fh);
        ctx.lineTo(fx + fw * 0.6, fy - fh * 0.5);
        ctx.lineTo(fx + fw * 0.72, fy - fh * 0.95);
        ctx.lineTo(fx + fw * 0.88, fy - fh * 0.95);
        ctx.lineTo(fx + fw * 0.88, fy - fh * 0.5);
        ctx.lineTo(fx + fw, fy - fh * 0.5);
        ctx.lineTo(fx + fw, fy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.bg;
        ctx.fillRect(cx - fw * 0.14, fy - fh * 0.42, fw * 0.28, fh * 0.42);
        break;
      }

      case 'store': {
        // Warehouse Storage Rack & Pallets
        const sw = r * 1.5;
        const sh = r * 1.45;
        const sx = cx - sw / 2;
        const sy = cy - sh / 2;
        const beamW = Math.max(2.5, sw * 0.08);
        ctx.fillRect(sx, sy, beamW, sh);
        ctx.fillRect(sx + sw - beamW, sy, beamW, sh);
        ctx.fillRect(sx, sy + sh * 0.45, sw, beamW);
        ctx.fillRect(sx, sy + sh - beamW, sw, beamW);
        ctx.fillStyle = sub;
        this.roundRect(ctx, sx + beamW + 3, sy + sh * 0.45 - sh * 0.32, sw * 0.38, sh * 0.32, 2);
        ctx.fill();
        this.roundRect(ctx, sx + sw * 0.52, sy + sh * 0.45 - sh * 0.38, sw * 0.36, sh * 0.38, 2);
        ctx.fill();
        ctx.fillStyle = fg;
        this.roundRect(ctx, sx + beamW + 4, sy + sh - beamW - sh * 0.36, sw * 0.42, sh * 0.36, 2);
        ctx.fill();
        this.roundRect(ctx, sx + sw * 0.54, sy + sh - beamW - sh * 0.28, sw * 0.34, sh * 0.28, 2);
        ctx.fill();
        break;
      }

      case 'cadjob': {
        // DXF CNC Job Cutting Sheet
        const jw = r * 1.5;
        const jh = r * 1.35;
        const jx = cx - jw / 2;
        const jy = cy - jh / 2;
        ctx.strokeRect(jx, jy, jw, jh);
        ctx.fillStyle = sub;
        ctx.beginPath();
        ctx.moveTo(jx + 6, jy + 6);
        ctx.lineTo(jx + jw * 0.7, jy + 6);
        ctx.lineTo(jx + jw - 6, jy + jh * 0.5);
        ctx.lineTo(jx + jw * 0.7, jy + jh - 6);
        ctx.lineTo(jx + 6, jy + jh - 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = theme.bg;
        ctx.beginPath();
        ctx.arc(cx - 3, cy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(jx, jy + jh); ctx.lineTo(jx + 12, jy + jh);
        ctx.moveTo(jx, jy + jh); ctx.lineTo(jx, jy + jh - 12);
        ctx.stroke();
        break;
      }

      case 'lantek': {
        // Lantek CNC Nesting Sheet
        const nw = r * 1.55;
        const nh = r * 1.35;
        const nx = cx - nw / 2;
        const ny = cy - nh / 2;
        ctx.strokeRect(nx, ny, nw, nh);
        ctx.fillStyle = fg;
        this.roundRect(ctx, nx + 4, ny + 4, nw * 0.44, nh * 0.42, 2);
        ctx.fill();
        this.roundRect(ctx, nx + nw * 0.52, ny + 4, nw * 0.42, nh * 0.28, 2);
        ctx.fill();
        ctx.fillStyle = sub;
        this.roundRect(ctx, nx + nw * 0.52, ny + nh * 0.36, nw * 0.42, nh * 0.56, 2);
        ctx.fill();
        this.roundRect(ctx, nx + 4, ny + nh * 0.50, nw * 0.44, nh * 0.42, 2);
        ctx.fill();
        break;
      }

      case 'cnc': {
        // Industrial CNC Laser Cutting Gantry
        const cw = r * 1.6;
        const ch = r * 1.4;
        const cx0 = cx - cw / 2;
        const cy0 = cy - ch / 2;
        ctx.fillRect(cx0, cy0, cw, Math.max(3, ch * 0.16));
        const headW = cw * 0.26;
        const hx = cx - headW / 2;
        ctx.fillRect(hx, cy0 + ch * 0.16, headW, ch * 0.45);
        ctx.beginPath();
        ctx.moveTo(hx, cy0 + ch * 0.61);
        ctx.lineTo(hx + headW, cy0 + ch * 0.61);
        ctx.lineTo(cx, cy0 + ch * 0.82);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#FEF08A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy0 + ch * 0.82);
        ctx.lineTo(cx, cy0 + ch);
        ctx.stroke();
        ctx.fillStyle = sub;
        ctx.fillRect(cx0, cy0 + ch - 3, cw, 4);
        break;
      }

      default: {
        // Minimal architectural square badge
        const w = r * 1.4;
        const h = r * 1.4;
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
        ctx.fillStyle = theme.bg;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  // Backwards-compatible vector icon caller
  drawVectorIcon(ctx, iconType, cx, cy, r, color) {
    this.drawSolidColorIcon(ctx, iconType, cx, cy, r * 1.8, color, false);
  }

  // ==================== LIVE VDO MONITORS (SPLIT, PIP, FULLSCREEN) ====================
  drawSplitVideoMonitor(ctx, vbox, slide, nowSec) {
    ctx.save();
    ctx.fillStyle = '#0F172A';
    this.roundRect(ctx, vbox.x, vbox.y, vbox.w, vbox.h, 14);
    ctx.fill();

    ctx.save();
    this.roundRect(ctx, vbox.x + 4, vbox.y + 48, vbox.w - 8, vbox.h - 52, 10);
    ctx.clip();

    const vid = this.getOrCreateVideo(slide.videoSrc);
    if (vid && vid.readyState >= 2) {
      this.drawMediaContain(ctx, vid, vid.videoWidth || 1280, vid.videoHeight || 720, vbox.x + 4, vbox.y + 48, vbox.w - 8, vbox.h - 52);
    } else {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(vbox.x, vbox.y + 48, vbox.w, vbox.h - 48);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = '600 20px "Prompt", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎬 กำลังเตรียมแสดงคลิป VDO ประจำกระบวนการ...', vbox.x + vbox.w / 2, vbox.y + vbox.h / 2);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    ctx.fillStyle = '#C84B31';
    ctx.beginPath();
    ctx.arc(vbox.x + 26, vbox.y + 25, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    const vdoTitle = slide.vdoPrompt
      ? slide.vdoPrompt.replace(/^[✨✅🎬\s]+/, '')
      : 'LIVE PROCESS VDO • ภาพการทำงานจริงควบคู่ผังการต่องาน';
    this.fillFittedText(ctx, `● ${vdoTitle}`, vbox.x + 42, vbox.y + 30, vbox.w - 60, 15, '600', '"Prompt", sans-serif');

    ctx.strokeStyle = '#1B365D';
    ctx.lineWidth = 3;
    this.roundRect(ctx, vbox.x, vbox.y, vbox.w, vbox.h, 14);
    ctx.stroke();
    ctx.restore();
  }

  drawPipVideoMonitor(ctx, vbox, slide, nowSec) {
    ctx.save();
    ctx.fillStyle = '#0F172A';
    this.roundRect(ctx, vbox.x, vbox.y, vbox.w, vbox.h, 12);
    ctx.fill();

    ctx.save();
    this.roundRect(ctx, vbox.x + 3, vbox.y + 3, vbox.w - 6, vbox.h - 6, 10);
    ctx.clip();
    const vid = this.getOrCreateVideo(slide.videoSrc);
    if (vid && vid.readyState >= 2) {
      this.drawMediaContain(ctx, vid, vid.videoWidth || 1280, vid.videoHeight || 720, vbox.x + 3, vbox.y + 3, vbox.w - 6, vbox.h - 6);
    }
    ctx.restore();

    ctx.strokeStyle = '#C84B31';
    ctx.lineWidth = 3;
    this.roundRect(ctx, vbox.x, vbox.y, vbox.w, vbox.h, 12);
    ctx.stroke();
    ctx.restore();
  }

  drawFullscreenVideoStage(ctx, W, H, slide, nowSec) {
    ctx.save();
    ctx.fillStyle = '#0B1320';
    ctx.fillRect(0, 0, W, H);

    const vid = this.getOrCreateVideo(slide.videoSrc);
    if (vid && vid.readyState >= 2) {
      this.drawMediaContain(ctx, vid, vid.videoWidth || 1920, vid.videoHeight || 1080, 0, 0, W, H);
    }
    ctx.restore();
  }

  // ==================== CANVAS HELPERS ====================
  drawMediaContain(ctx, media, mw, mh, x, y, w, h) {
    if (!mw || !mh) return;
    const scale = Math.min(w / mw, h / mh);
    const sw = mw * scale;
    const sh = mh * scale;
    const sx = x + (w - sw) / 2;
    const sy = y + (h - sh) / 2;
    ctx.drawImage(media, sx, sy, sw, sh);
  }

  easeOutCubic(x) {
    return 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
  }

  roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  fillFittedText(ctx, text, x, y, maxWidth, baseSize = 18, weight = '700', family = '"Prompt", sans-serif', align = 'left', minSize = 10.5) {
    if (!text) return;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = align;
    let sz = baseSize;
    ctx.font = `${weight} ${sz}px ${family}`;
    while (sz > minSize && ctx.measureText(text).width > maxWidth) {
      sz -= 0.5;
      ctx.font = `${weight} ${sz}px ${family}`;
    }
    ctx.fillText(text, x, y, maxWidth);
    ctx.textAlign = prevAlign;
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    if (!text) return y;
    const str = (typeof text === 'string') ? text : (Array.isArray(text) ? text.join(' ') : String(text));
    const words = str.split(' ');
    let line = '';
    let lineCount = 0;
    let curY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + (line ? ' ' : '') + words[n];
      if (ctx.measureText(testLine).width > maxWidth && line !== '') {
        ctx.fillText(line, x, curY, maxWidth);
        line = words[n];
        curY += lineHeight;
        lineCount++;
        if (lineCount >= maxLines - 1) {
          line = words.slice(n).join(' ');
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY, maxWidth);
    return curY + lineHeight;
  }

  wrapTextCentered(ctx, text, centerX, y, maxWidth, lineHeight, maxLines = 2) {
    if (!text) return;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'center';
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;
    let curY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + (line ? ' ' : '') + words[n];
      if (ctx.measureText(testLine).width > maxWidth && line !== '') {
        ctx.fillText(line, centerX, curY, maxWidth);
        line = words[n];
        curY += lineHeight;
        lineCount++;
        if (lineCount >= maxLines - 1) {
          line = words.slice(n).join(' ');
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, centerX, curY, maxWidth);
    ctx.textAlign = prevAlign;
  }

  formatTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  // ==================== UI BINDINGS & VDO DRAG-AND-DROP ====================
  bindUI() {
    const on = (id, event, handler) => {
      const el = (typeof document !== 'undefined') ? document.getElementById(id) : null;
      if (el) el.addEventListener(event, handler);
    };

    on('btnPlayPause', 'click', () => {
      if (this.isPlaying) this.pause();
      else this.play(false);
    });

    on('btnPrevSlide', 'click', () => {
      this.selectSlide(Math.max(0, this.activeSlideIndex - 1));
    });

    on('btnNextSlide', 'click', () => {
      this.selectSlide(Math.min(this.slides.length - 1, this.activeSlideIndex + 1));
    });

    on('btnRestart', 'click', () => {
      this.play(true);
    });

    on('btnZenMode', 'click', () => {
      if (document.body) document.body.classList.toggle('zen-mode');
    });

    on('btnFullscreen', 'click', () => {
      const wrap = document.getElementById('canvasWrapper');
      if (wrap) {
        if (!document.fullscreenElement) {
          wrap.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    });

    on('btnExportScene', 'click', () => {
      this.startVideoExport(true);
    });

    on('btnExportVideo', 'click', () => {
      this.startVideoExport(false);
    });

    on('timelineScrubber', 'input', (e) => {
      const pct = Number(e.target.value) / 1000;
      this.seekTo(pct * this.getTotalDuration());
    });

    on('chkBgm', 'change', (e) => {
      this.bgmEnabled = e.target.checked;
      if (this.isPlaying) {
        if (this.bgmEnabled) this.startBGM();
        else this.stopBGM();
      }
    });

    const btnTopTts = (typeof document !== 'undefined') ? document.getElementById('btnTopTtsToggle') : null;
    if (btnTopTts) {
      btnTopTts.addEventListener('click', () => {
        this.ttsEnabled = !this.ttsEnabled;
        try { localStorage.setItem('dbpa_tts_enabled', String(this.ttsEnabled)); } catch (e) {}
        const chk = document.getElementById('chkTts');
        if (chk) chk.checked = this.ttsEnabled;
        btnTopTts.textContent = this.ttsEnabled ? '🗣️ เสียงพากย์: เปิด ✓' : '🗣️ เสียงพากย์: ปิด ✕';
        btnTopTts.style.opacity = this.ttsEnabled ? '1.0' : '0.65';
        if (!this.ttsEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        } else if (this.ttsEnabled) {
          const slide = this.slides[this.activeSlideIndex];
          if (slide && slide.narration) this.speakNarration(slide.narration);
        }
      });
    }

    on('btnQuickSpeak', 'click', () => {
      const slide = this.slides[this.activeSlideIndex];
      if (slide && slide.narration) {
        const prev = this.ttsEnabled;
        this.ttsEnabled = true;
        this.speakNarration(slide.narration);
        this.ttsEnabled = prev;
      }
    });

    on('chkTts', 'change', (e) => {
      this.ttsEnabled = e.target.checked;
      try { localStorage.setItem('dbpa_tts_enabled', String(this.ttsEnabled)); } catch (err) {}
      const btnTop = document.getElementById('btnTopTtsToggle');
      if (btnTop) {
        btnTop.textContent = this.ttsEnabled ? '🗣️ เสียงพากย์: เปิด ✓' : '🗣️ เสียงพากย์: ปิด ✕';
        btnTop.style.opacity = this.ttsEnabled ? '1.0' : '0.65';
      }
      if (!this.ttsEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else if (this.ttsEnabled) {
        const slide = this.slides[this.activeSlideIndex];
        if (slide && slide.narration) this.speakNarration(slide.narration);
      }
    });

    on('selTtsVoice', 'change', (e) => {
      this.selectedVoiceURI = e.target.value;
      if (e.target.value) {
        localStorage.setItem('dbpa_tts_voice_uri', e.target.value);
      }
      this.testTtsSpeech();
    });

    on('btnTestTts', 'click', () => {
      this.testTtsSpeech();
    });

    on('chkSubtitleOverlay', 'change', (e) => {
      this.subtitleOverlay = e.target.checked;
    });

    on('bgmFileInput', 'change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.customAudioFile = file;
        this.customAudioEl.src = URL.createObjectURL(file);
        const nameEl = document.getElementById('bgmFileName');
        if (nameEl) nameEl.textContent = file.name;
        if (this.isPlaying && this.bgmEnabled) this.startBGM();
      }
    });

    on('btnThemeToggle', 'click', () => {
      this.themeVersion = this.themeVersion === 'v2' ? 'v1' : 'v2';
      if (document.body) document.body.classList.toggle('theme-v1', this.themeVersion === 'v1');
      const btn = document.getElementById('btnThemeToggle');
      if (btn) btn.textContent = this.themeVersion === 'v2' ? '🎨 โทนสี: Ver 2' : '🎨 โทนสี: Ver 1 (Washi)';
    });

    on('btnFlowStyleToggle', 'click', () => {
      this.parallelBranchStyle = this.parallelBranchStyle === 'clean-minimal' ? 'ver2-dark' : 'clean-minimal';
      const btn = document.getElementById('btnFlowStyleToggle');
      if (btn) {
        btn.textContent = this.parallelBranchStyle === 'clean-minimal'
          ? '🎨 สไตล์ Flowchart: รูปใหม่ (Clean)'
          : '🎨 สไตล์ Flowchart: Ver 2 Studio';
      }
    });

    on('btnResetDefault', 'click', () => {
      try { localStorage.removeItem(this.storageKey); } catch (e) {}
      this.slides = JSON.parse(JSON.stringify(DEFAULT_SLIDES));
      this.selectSlide(0);
    });

    // Interactive Stage Tab & Card Clicks on Canvas
    if (this.canvas) {
      this.canvas.addEventListener('click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const scaleX = 1920 / rect.width;
        const scaleY = 1080 / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const slide = this.slides[this.activeSlideIndex];
        if (!slide) return;

        // Slide 2 (Whiteboard Compare Flowchart - 3 Mode Tabs: both, new, existing)
        if (slide.sceneType === 'whiteboard-compare-flowchart') {
          const modes = ['both', 'new', 'existing'];
          let tabX = 1920 - 670;
          const tabY = 42;
          const tabW = 196;
          const tabH = 44;
          for (let i = 0; i < modes.length; i++) {
            if (mx >= tabX && mx <= tabX + tabW && my >= tabY && my <= tabY + tabH) {
              this.flowchartViewMode = modes[i];
              return;
            }
            tabX += tabW + 10;
          }
        }

        // Slide 2: New Workflow 4 Parallel Branches (Style Toggle: Clean Minimal vs Ver 2 Dark)
        if (slide.sceneType === 'parallel-branch-split') {
          if (this.parallelStyleTabs) {
            for (const st of this.parallelStyleTabs) {
              if (mx >= st.x && mx <= st.x + st.w && my >= st.y && my <= st.y + st.h) {
                this.parallelBranchStyle = st.id;
                return;
              }
            }
          }
        }

        // Slide 4 / Slide 12 Tab 03: Automation Deliverables Showcase
        if (slide.sceneType === 'automation-deliverables-summary' || ((slide.layout === 'new-workflow-allinone' || slide.id === 'v3-new-workflow' || slide.sceneType === 'new-workflow-allinone') && this._ver2ActiveStep === 2)) {
          if (this.showAutomationModal) {
            if (this.automationModalCloseBtn) {
              const cb = this.automationModalCloseBtn;
              if (mx >= cb.x && mx <= cb.x + cb.w && my >= cb.y && my <= cb.y + cb.h) {
                this.showAutomationModal = false;
                if (!this.isPlaying && typeof this.render === 'function') this.render();
                return;
              }
            }
            if (this.automationModalBox) {
              const mb = this.automationModalBox;
              if (mx < mb.x || mx > mb.x + mb.w || my < mb.y || my > mb.y + mb.h) {
                this.showAutomationModal = false;
                if (!this.isPlaying && typeof this.render === 'function') this.render();
                return;
              }
            }
            return;
          }

          if (this.automationControls) {
            for (const ctrl of this.automationControls) {
              if (mx >= ctrl.x && mx <= ctrl.x + ctrl.w && my >= ctrl.y && my <= ctrl.y + ctrl.h) {
                const cur = (this.automationActiveTab !== null && this.automationActiveTab !== undefined)
                  ? this.automationActiveTab
                  : (this._lastRenderedDeliverable || 0);
                if (ctrl.action === 'prev') {
                  this.automationActiveTab = (cur + 4) % 5;
                } else if (ctrl.action === 'next') {
                  this.automationActiveTab = (cur + 1) % 5;
                } else if (ctrl.action === 'select') {
                  this.automationActiveTab = ctrl.idx;
                } else if (ctrl.action === 'toggle-auto') {
                  this.automationActiveTab = (this.automationActiveTab === null || this.automationActiveTab === undefined) ? cur : null;
                } else if (ctrl.action === 'modal') {
                  this.automationActiveTab = cur;
                  this.showAutomationModal = true;
                }
                if (!this.isPlaying && typeof this.render === 'function') this.render();
                return;
              }
            }
          }

          if (this.automationCards) {
            for (const c of this.automationCards) {
              if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
                this.automationActiveTab = c.idx;
                if (!this.isPlaying && typeof this.render === 'function') this.render();
                return;
              }
            }
          }

          if (this.automationDocBox) {
            const db = this.automationDocBox;
            if (mx >= db.x && mx <= db.x + db.w && my >= db.y && my <= db.y + db.h) {
              this.showAutomationModal = true;
              if (!this.isPlaying && typeof this.render === 'function') this.render();
              return;
            }
          }
        }

        // Master Slide (CAD to SketchUp QHeim + 4 Blue Output Buttons)
        if (slide.sceneType === 'boq-sku-extrusion') {
          // If modal is open:
          if (this.activeDocPreview) {
            // Check modal doc switcher tabs
            if (this.modalDocTabs) {
              for (const tb of this.modalDocTabs) {
                if (mx >= tb.x && mx <= tb.x + tb.w && my >= tb.y && my <= tb.y + tb.h) {
                  this.activeDocPreview = tb.key;
                  return;
                }
              }
            }
            // Close button or click outside closes modal
            this.activeDocPreview = null;
            return;
          }

          // Click on VDO Monitor screen or bottom HUD to toggle Play/Pause directly on Slide 03
          if (this.vdoMonitorRect) {
            const vr = this.vdoMonitorRect;
            if (mx >= vr.x && mx <= vr.x + vr.w && my >= vr.y && my <= vr.y + vr.h) {
              if (this.isPlaying) this.pause();
              else this.play(false);
              return;
            }
          }

          // Clicks on 4 Blue Buttons on Right Column
          if (this.rightBranchButtons) {
            for (const b of this.rightBranchButtons) {
              if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
                this.activeDocPreview = b.docKey;
                return;
              }
            }
          }

          // Top 4 Step Pills
          const count = 4;
          const stageTimes = [0.1, 4.2, 7.0, 10.5];
          const pillGap = 20;
          const pillW = (1832 - 20 - pillGap * (count - 1)) / count;
          const topY = 54;
          for (let i = 0; i < count; i++) {
            const px = 44 + 10 + i * (pillW + pillGap);
            if (mx >= px && mx <= px + pillW && my >= topY && my <= topY + 72) {
              this.slideElapsed = stageTimes[i];
              this.syncActiveMedia(true);
              this.updateTimelineUI();
              return;
            }
          }
        }

        // Slide 5 (Route 1: Assembly Manual & Site Crew - 4 Steps: 1.1, 1.2, 1.3, 1.4)
        if (slide.sceneType === 'pipeline-route-1') {
          const count = 4;
          const totalDuration = slide.duration || 22;
          const stepDuration = totalDuration / count;
          const stageTimes = [0.1, stepDuration + 0.1, stepDuration * 2 + 0.1, stepDuration * 3 + 0.1];

          // Top 4 Pipeline Cards
          const gap = Math.max(28, 1832 * 0.032);
          const cardW = (1802 - gap * (count - 1)) / count;
          const cardH = 232;
          const topY = 54;
          for (let i = 0; i < count; i++) {
            const cx = 59 + i * (cardW + gap);
            if (mx >= cx && mx <= cx + cardW && my >= topY && my <= topY + cardH) {
              this.slideElapsed = stageTimes[i];
              this.updateTimelineUI();
              return;
            }
          }

          // Bottom Left 4 Viewport Tabs (1.1 to 1.4)
          const leftX = 59;
          const leftW = Math.floor((1832 - 44) * 0.51);
          const vpX = leftX + 14;
          const vpW = leftW - 28;
          const botY = topY + cardH + 22;
          const botH = 992 - cardH - 36;
          const vpH = botH - 110;
          const pillGap = 8;
          const pillW = (vpW - pillGap * 3) / 4;
          const pillY = botY + 54 + vpH + 10;
          for (let t = 0; t < count; t++) {
            const px = vpX + t * (pillW + pillGap);
            if (mx >= px && mx <= px + pillW && my >= pillY && my <= pillY + 34) {
              this.slideElapsed = stageTimes[t];
              this.updateTimelineUI();
              return;
            }
          }
        }

        // Slide 6 (Route 3: Lantek CNC - 4 Steps: 3.1, 3.2, 3.3, 3.4 CNC VDO 8s)
        if (slide.sceneType === 'pipeline-route-b') {
          const count = 4;
          const totalDuration = slide.duration || 26;
          const earlyDuration = Math.max(3.5, (totalDuration - 8.0) / 3);
          const t34Start = earlyDuration * 3;
          const stageTimes = [0.1, earlyDuration + 0.1, earlyDuration * 2 + 0.1, t34Start + 0.1];

          // Top 4 Pipeline Cards
          const gap = Math.max(22, Math.floor(1832 * 0.022));
          const cardW = (1802 - gap * (count - 1)) / count;
          const cardH = 228;
          const topY = 54;
          for (let i = 0; i < count; i++) {
            const cx = 59 + i * (cardW + gap);
            if (mx >= cx && mx <= cx + cardW && my >= topY && my <= topY + cardH) {
              this.slideElapsed = stageTimes[i];
              this.updateTimelineUI();
              return;
            }
          }

          // Bottom Left 4 Viewport Tabs (3.1 to 3.4)
          const simX = 59;
          const simY = topY + cardH + 18;
          const leftW = Math.floor(1802 * 0.51);
          const tabW = (leftW - 28 - (count - 1) * 8) / count;
          for (let t = 0; t < count; t++) {
            const tx = simX + 14 + t * (tabW + 8);
            const ty = simY + 8;
            if (mx >= tx && mx <= tx + tabW && my >= ty && my <= ty + 34) {
              this.slideElapsed = stageTimes[t];
              this.updateTimelineUI();
              return;
            }
          }
        }
      });

      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const scaleX = 1920 / rect.width;
        const scaleY = 1080 / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const slide = this.slides[this.activeSlideIndex];
        if (slide && slide.sceneType === 'boq-sku-extrusion') {
          if (this.activeDocPreview) {
            let overInteractive = false;
            const cb = this.activeModalRect && this.activeModalRect.closeBtn;
            if (cb && mx >= cb.x && mx <= cb.x + cb.w && my >= cb.y && my <= cb.y + cb.h) {
              overInteractive = true;
            }
            if (this.modalDocTabs) {
              for (const tb of this.modalDocTabs) {
                if (mx >= tb.x && mx <= tb.x + tb.w && my >= tb.y && my <= tb.y + tb.h) {
                  overInteractive = true;
                  break;
                }
              }
            }
            this.canvas.style.cursor = overInteractive ? 'pointer' : 'default';
            return;
          }

          let hovered = null;
          if (this.rightBranchButtons) {
            for (const b of this.rightBranchButtons) {
              if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
                hovered = b.id;
                break;
              }
            }
          }
          let overVdo = false;
          if (this.vdoMonitorRect) {
            const vr = this.vdoMonitorRect;
            if (mx >= vr.x && mx <= vr.x + vr.w && my >= vr.y && my <= vr.y + vr.h) {
              overVdo = true;
            }
          }
          if (this.hoveredCard !== hovered) {
            this.hoveredCard = hovered;
          }
          this.canvas.style.cursor = (hovered || overVdo) ? 'pointer' : 'default';
        }

        if (slide && slide.sceneType === 'parallel-branch-split') {
          let overTab = false;
          if (this.parallelStyleTabs) {
            for (const st of this.parallelStyleTabs) {
              if (mx >= st.x && mx <= st.x + st.w && my >= st.y && my <= st.y + st.h) {
                overTab = true;
                break;
              }
            }
          }
          this.canvas.style.cursor = overTab ? 'pointer' : 'default';
        }

        if (slide && (slide.sceneType === 'automation-deliverables-summary' || ((slide.layout === 'new-workflow-allinone' || slide.id === 'v3-new-workflow' || slide.sceneType === 'new-workflow-allinone') && this._ver2ActiveStep === 2))) {
          let isPointer = false;
          if (this.showAutomationModal) {
            isPointer = true;
          } else {
            let hov = null;
            if (this.automationCards) {
              for (const c of this.automationCards) {
                if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
                  hov = c.id;
                  isPointer = true;
                  break;
                }
              }
            }
            if (!isPointer && this.automationControls) {
              for (const ctrl of this.automationControls) {
                if (mx >= ctrl.x && mx <= ctrl.x + ctrl.w && my >= ctrl.y && my <= ctrl.y + ctrl.h) {
                  isPointer = true;
                  break;
                }
              }
            }
            this.hoveredCard = hov;
            if (!isPointer && this.automationDocBox) {
              const db = this.automationDocBox;
              if (mx >= db.x && mx <= db.x + db.w && my >= db.y && my <= db.y + db.h) {
                isPointer = true;
              }
            }
          }
          this.canvas.style.cursor = isPointer ? 'pointer' : 'default';
        }
      });

      // Escape key closes open document preview modal or automation modal
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          let changed = false;
          if (this.activeDocPreview) { this.activeDocPreview = null; changed = true; }
          if (this.showAutomationModal) { this.showAutomationModal = false; changed = true; }
          if (changed && !this.isPlaying && typeof this.render === 'function') this.render();
        }
      });
    }

    this.populateVideoDropdown();

    const attachVideoFile = (file) => {
      if (!file || !file.type.startsWith('video/')) return;
      const url = URL.createObjectURL(file);
      const label = `🎬 [ที่คุณใส่เพิ่ม] ${file.name}`;
      this.customVideos.push({ label, src: url });
      this.populateVideoDropdown();

      const s = this.slides[this.activeSlideIndex];
      s.videoSrc = url;
      if (s.vdoLayout === 'vector-only') {
        s.vdoLayout = 'split-handoff';
      }
      s.vdoStatus = 'ready';
      s.vdoPrompt = `✅ ใส่ไฟล์ VDO แล้ว: ${file.name}`;
      this.getOrCreateVideo(url);
      this.saveSlides();
      this.loadSlideIntoEditor(this.activeSlideIndex);
      this.renderSlideList();
      this.syncActiveMedia(true);
    };

    const vdoInput = (typeof document !== 'undefined') ? document.getElementById('vdoUploadInput') : null;
    if (vdoInput) {
      vdoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          attachVideoFile(e.target.files[0]);
        }
      });
    }

    if (typeof document !== 'undefined') {
      ['canvasWrapper', 'vdoDropzone'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('dragover', (ev) => {
          ev.preventDefault();
          el.classList.add('drag-over');
        });
        el.addEventListener('dragleave', () => {
          el.classList.remove('drag-over');
        });
        el.addEventListener('drop', (ev) => {
          ev.preventDefault();
          el.classList.remove('drag-over');
          if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]) {
            attachVideoFile(ev.dataTransfer.files[0]);
          }
        });
      });
    }

    on('edVideoSelect', 'change', (e) => {
      const s = this.slides[this.activeSlideIndex];
      s.videoSrc = e.target.value;
      if (s.videoSrc && s.vdoLayout === 'vector-only') {
        s.vdoLayout = 'split-handoff';
      } else if (!s.videoSrc) {
        s.vdoLayout = 'vector-only';
      }
      s.vdoStatus = s.videoSrc ? 'ready' : 'optional';
      if (s.videoSrc) this.getOrCreateVideo(s.videoSrc);
      this.saveSlides();
      this.loadSlideIntoEditor(this.activeSlideIndex);
      this.renderSlideList();
      this.syncActiveMedia(true);
    });

    on('edVdoLayoutSelect', 'change', (e) => {
      const s = this.slides[this.activeSlideIndex];
      s.vdoLayout = e.target.value;
      this.saveSlides();
      this.renderSlideList();
      this.syncActiveMedia(true);
    });

    on('edVideoStart', 'input', (e) => {
      this.slides[this.activeSlideIndex].videoStart = Math.max(0, Number(e.target.value) || 0);
      this.saveSlides();
      this.syncActiveMedia(true);
    });

    on('edVideoRate', 'input', (e) => {
      this.slides[this.activeSlideIndex].videoRate = Math.max(0.25, Math.min(4.0, Number(e.target.value) || 1.0));
      this.saveSlides();
      this.syncActiveMedia(false);
    });

    on('edSceneTypeSelect', 'change', (e) => {
      this.slides[this.activeSlideIndex].sceneType = e.target.value;
      this.saveSlides();
    });

    on('edDuration', 'input', (e) => {
      let desired = Math.max(4, Math.min(120, Number(e.target.value) || 10));
      const otherTotal = this.slides.reduce((acc, s, idx) => idx === this.activeSlideIndex ? acc : acc + Number(s.duration), 0);
      if (otherTotal + desired > MAX_TOTAL_SECONDS) {
        desired = Math.max(4, MAX_TOTAL_SECONDS - otherTotal);
        e.target.value = desired;
      }
      this.slides[this.activeSlideIndex].duration = desired;
      const valEl = document.getElementById('edDurationVal');
      if (valEl) valEl.textContent = `${desired}s`;
      this.saveSlides();
      this.renderSlideList();
      this.updateTimelineUI();
    });

    const bindText = (id, key) => {
      const el = (typeof document !== 'undefined') ? document.getElementById(id) : null;
      if (!el) return;
      el.addEventListener('input', () => {
        this.slides[this.activeSlideIndex][key] = el.value;
        this.saveSlides();
        this.renderSlideList();
        this.updateTimelineUI();
      });
    };
    bindText('edTitle', 'title');
    bindText('edSubtitle', 'subtitle');
    bindText('edFooterNote', 'footerNote');
    bindText('edNarration', 'narration');
  }

  populateVideoDropdown() {
    const sel = (typeof document !== 'undefined') ? document.getElementById('edVideoSelect') : null;
    if (!sel) return;
    sel.innerHTML = '';
    [...AVAILABLE_VIDEOS, ...this.customVideos].forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.src;
      opt.textContent = v.label;
      sel.appendChild(opt);
    });
  }

  loadSlideIntoEditor(index) {
    const s = this.slides[index];
    if (!s || typeof document === 'undefined') return;

    const numEl = document.getElementById('edSlideNumber');
    if (!numEl) return;
    numEl.textContent = `บทที่ ${index + 1} / ${this.slides.length}`;
    const durEl = document.getElementById('edDuration');
    if (durEl) durEl.value = s.duration || 12;
    const durVal = document.getElementById('edDurationVal');
    if (durVal) durVal.textContent = `${s.duration || 12}s`;
    const sceneSel = document.getElementById('edSceneTypeSelect');
    if (sceneSel) sceneSel.value = s.sceneType || 'pipeline-route-a';
    const titleEl = document.getElementById('edTitle');
    if (titleEl) titleEl.value = s.title || '';
    const subEl = document.getElementById('edSubtitle');
    if (subEl) subEl.value = s.subtitle || '';
    const footEl = document.getElementById('edFooterNote');
    if (footEl) footEl.value = s.footerNote || '';
    const narrEl = document.getElementById('edNarration');
    if (narrEl) narrEl.value = s.narration || '';

    const banner = document.getElementById('vdoStatusBanner');
    if (banner) {
      banner.textContent = s.vdoPrompt || 'มี Animation จำลองในตัวครบแล้ว (หรือลากไฟล์ VDO มาวางเพิ่มได้)';
      banner.className = `vdo-status-banner ${s.vdoStatus || 'optional'}`;
    }

    const vSel = document.getElementById('edVideoSelect');
    if (vSel && [...vSel.options].some(o => o.value === (s.videoSrc || ''))) {
      vSel.value = s.videoSrc || '';
    }
    const layoutSel = document.getElementById('edVdoLayoutSelect');
    if (layoutSel) layoutSel.value = s.vdoLayout || 'vector-only';
    const vStart = document.getElementById('edVideoStart');
    if (vStart) vStart.value = s.videoStart || 0;
    const vRate = document.getElementById('edVideoRate');
    if (vRate) vRate.value = s.videoRate || 1.0;

    const nodeList = document.getElementById('nodeEditorList');
    if (nodeList) {
      nodeList.innerHTML = '';
      (s.nodes || []).forEach((nd) => {
        const div = document.createElement('div');
        div.className = 'node-ed-card';
        div.innerHTML = `
          <div class="node-ed-row">
            <input type="text" data-field="code" value="${nd.code || ''}" placeholder="รหัส" title="รหัสขั้นตอน" />
            <input type="text" data-field="label" value="${nd.label || ''}" placeholder="ชื่อกระบวนการ" title="ชื่อบล็อกกระบวนการ" />
          </div>
          <input type="text" data-field="sub" value="${nd.sub || ''}" placeholder="คำอธิบายการส่งต่องาน" />
        `;
        div.querySelectorAll('input').forEach(inp => {
          inp.addEventListener('input', () => {
            nd[inp.dataset.field] = inp.value;
            this.saveSlides();
          });
        });
        nodeList.appendChild(div);
      });
    }
  }

  renderSlideList() {
    const listEl = (typeof document !== 'undefined') ? document.getElementById('slideListContainer') : null;
    if (!listEl) return;
    listEl.innerHTML = '';

    let accum = 0;
    this.slides.forEach((s, idx) => {
      const startStr = this.formatTime(accum);
      accum += Number(s.duration) || 8;
      const endStr = this.formatTime(accum);

      let badgeHtml = `<span class="vdo-tag vec-only">✨ Sim Animation ในตัว</span>`;
      if (s.videoSrc && s.vdoLayout !== 'vector-only') {
        badgeHtml = `<span class="vdo-tag has-vdo">🎬 Sim + คลิป VDO</span>`;
      }

      const card = document.createElement('div');
      card.className = `slide-item ${idx === this.activeSlideIndex ? 'active' : ''}`;
      card.innerHTML = `
        <div class="step-num-box">0${idx + 1}</div>
        <div class="slide-meta">
          <div class="slide-meta-top">
            ${badgeHtml}
            <span class="slide-time-pill">STEP 0${idx + 1}</span>
          </div>
          <div class="slide-item-title">${s.title}</div>
        </div>
        <div class="slide-actions">
          <button class="icon-btn" title="เลื่อนขึ้น" data-act="up">▲</button>
          <button class="icon-btn" title="เลื่อนลง" data-act="down">▼</button>
        </div>
      `;

      card.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button');
        if (btn) {
          ev.stopPropagation();
          const act = btn.dataset.act;
          if (act === 'up' && idx > 0) {
            [this.slides[idx - 1], this.slides[idx]] = [this.slides[idx], this.slides[idx - 1]];
            this.saveSlides();
            this.selectSlide(idx - 1);
          } else if (act === 'down' && idx < this.slides.length - 1) {
            [this.slides[idx + 1], this.slides[idx]] = [this.slides[idx], this.slides[idx + 1]];
            this.saveSlides();
            this.selectSlide(idx + 1);
          }
          return;
        }
        this.selectSlide(idx);
      });

      listEl.appendChild(card);
    });
  }

  updateTimelineUI() {
    if (typeof document === 'undefined') return;
    const total = this.getTotalDuration();
    const curStr = this.formatTime(this.globalElapsed);
    const totStr = this.formatTime(total);

    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) timeDisplay.textContent = `${curStr} / ${totStr}`;
    const capBadge = document.getElementById('durationCapBadge');
    if (capBadge) {
      capBadge.textContent = `🌟 New Workflow (${this.slides.length} ขั้นตอนครบวงจร)`;
      capBadge.className = 'cap-badge ok';
    }

    const scrubber = document.getElementById('timelineScrubber');
    if (scrubber && total > 0) {
      scrubber.value = Math.round((this.globalElapsed / total) * 1000);
    }

    const slide = this.slides[this.activeSlideIndex];
    if (slide) {
      const liveBadge = document.getElementById('liveSlideBadge');
      if (liveBadge) liveBadge.textContent = `STEP 0${this.activeSlideIndex + 1} / 0${this.slides.length}`;
      const liveNarration = document.getElementById('liveNarrationText');
      if (liveNarration) liveNarration.textContent = slide.narration || '';
    }
  }

  updatePlayControlsUI() {
    const btn = (typeof document !== 'undefined') ? document.getElementById('btnPlayPause') : null;
    if (btn) {
      btn.innerHTML = this.isPlaying ? '⏸ หยุดชั่วคราว (Pause)' : '▶ เล่นอนิเมชั่น (Auto-Play)';
      btn.classList.toggle('playing', this.isPlaying);
    }
  }

  updateExportUI(recording, finishedExt = '', wasSingle = false, finishedSceneIdx = 0, filename = '') {
    const btnScene = document.getElementById('btnExportScene');
    const btnFull = document.getElementById('btnExportVideo');
    const statusEl = document.getElementById('exportStatusBanner');
    const curSlide = this.slides[this.activeSlideIndex] || this.slides[0];
    const total = this.getTotalDuration();
    const audioChoice = document.getElementById('exportAudioChoice');
    const audioLabel = (audioChoice && audioChoice.value === 'mute') ? '🔇 ไม่เอาเสียง (Mute)' : '🔊 พร้อมเสียง';

    if (recording) {
      if (this.recordSingleScene) {
        if (btnScene) {
          btnScene.innerHTML = '⏹ หยุดบันทึกฉากนี้ (คลิกเพื่อเซฟทันที)';
          btnScene.classList.add('recording');
        }
        if (btnFull) {
          btnFull.disabled = true;
          btnFull.style.opacity = '0.35';
          btnFull.style.pointerEvents = 'none';
        }
        statusEl.style.display = 'flex';
        statusEl.style.background = 'rgba(239, 68, 68, 0.12)';
        statusEl.style.borderColor = '#EF4444';
        statusEl.style.color = '#B91C1C';
        statusEl.innerHTML = `
          <span class="rec-dot"></span>
          <span style="display:flex; align-items:center; gap:12px; width:100%; justify-content:space-between;">
            <span>🎬 <b>กำลังบันทึกวิดีโอเฉพาะฉากที่ ${this.activeSlideIndex + 1}: ${curSlide.title}</b> [ความยาว ${curSlide.duration}s] • 1080p 60fps • <span style="background:#fee2e2; padding:2px 6px; border-radius:4px; font-weight:700;">${audioLabel}</span></span>
            <span style="display:flex; align-items:center; gap:10px;">
              <span>⏱️ บันทึกไปแล้ว: <b id="recLiveTimer" style="font-family:'JetBrains Mono',monospace; color:#DC2626; font-size:14px;">00:00</b> / ${this.formatTime(curSlide.duration)}</span>
              <button id="btnQuickStopRec" type="button" style="background:#DC2626; color:#FFFFFF; border:none; padding:4px 12px; border-radius:4px; font-weight:700; font-size:12px; cursor:pointer;" title="หยุดบันทึกและดาวน์โหลดไฟล์ทันที">⏹ เซฟไฟล์ทันที</button>
            </span>
          </span>
        `;
        const qStop = document.getElementById('btnQuickStopRec');
        if (qStop) {
          qStop.addEventListener('click', (e) => {
            e.stopPropagation();
            this.stopVideoExport();
          });
        }
      } else {
        if (btnFull) {
          btnFull.innerHTML = '⏹ หยุดบันทึกทั้งหมด (คลิกเพื่อเซฟทันที)';
          btnFull.classList.add('recording');
        }
        if (btnScene) {
          btnScene.disabled = true;
          btnScene.style.opacity = '0.35';
          btnScene.style.pointerEvents = 'none';
        }
        statusEl.style.display = 'flex';
        statusEl.style.background = 'rgba(239, 68, 68, 0.12)';
        statusEl.style.borderColor = '#EF4444';
        statusEl.style.color = '#B91C1C';
        statusEl.innerHTML = `
          <span class="rec-dot"></span>
          <span style="display:flex; align-items:center; gap:12px; width:100%; justify-content:space-between;">
            <span>🎥 <b>กำลังบันทึกวิดีโอรวมทุกกระบวนการ (${this.slides.length} ขั้นตอน)</b> • 1080p 60fps • <span style="background:#fee2e2; padding:2px 6px; border-radius:4px; font-weight:700;">${audioLabel}</span></span>
            <span style="display:flex; align-items:center; gap:10px;">
              <span>⏱️ ความคืบหน้า: <b id="recLiveTimer" style="font-family:'JetBrains Mono',monospace; color:#DC2626; font-size:14px;">00:00</b> / ${this.formatTime(total)}</span>
              <button id="btnQuickStopRec" type="button" style="background:#DC2626; color:#FFFFFF; border:none; padding:4px 12px; border-radius:4px; font-weight:700; font-size:12px; cursor:pointer;" title="หยุดบันทึกและดาวน์โหลดไฟล์ทันที">⏹ เซฟไฟล์ทันที</button>
            </span>
          </span>
        `;
        const qStop = document.getElementById('btnQuickStopRec');
        if (qStop) {
          qStop.addEventListener('click', (e) => {
            e.stopPropagation();
            this.stopVideoExport();
          });
        }
      }
    } else {
      if (btnScene) {
        btnScene.innerHTML = '🎬 Export เฉพาะฉากนี้';
        btnScene.classList.remove('recording');
        btnScene.disabled = false;
        btnScene.style.opacity = '1';
        btnScene.style.pointerEvents = 'auto';
      }
      if (btnFull) {
        btnFull.innerHTML = '🎥 Export รวมทั้งหมด';
        btnFull.classList.remove('recording');
        btnFull.disabled = false;
        btnFull.style.opacity = '1';
        btnFull.style.pointerEvents = 'auto';
      }
      if (finishedExt) {
        statusEl.style.display = 'flex';
        statusEl.style.background = 'rgba(34, 197, 94, 0.14)';
        statusEl.style.borderColor = '#22C55E';
        statusEl.style.color = '#15803D';
        const msg = wasSingle
          ? `✅ บันทึกและดาวน์โหลดวิดีโอฉากที่ ${finishedSceneIdx + 1} (${filename}) เรียบร้อยแล้ว!`
          : `✅ บันทึกและดาวน์โหลดวิดีโอรวมทุกขั้นตอน (${filename}) เรียบร้อยแล้ว!`;
        statusEl.innerHTML = `<span style="font-size:16px;">🎉</span> <span>${msg}</span>`;
        setTimeout(() => { statusEl.style.display = 'none'; }, 8000);
      } else {
        statusEl.style.display = 'none';
      }
    }
  }

  saveSlides() {
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(this.storageKey, JSON.stringify(this.slides)); } catch(e) {}
    }
  }
}

if (typeof window !== 'undefined') {
  window.PresentationApp = PresentationApp;
  window.addEventListener('DOMContentLoaded', () => {
    if (typeof document !== 'undefined' && document.getElementById('stageCanvas') && !window.app) {
      window.app = new PresentationApp();
    }
  });
}
if (typeof globalThis !== 'undefined') {
  globalThis.PresentationApp = PresentationApp;
}

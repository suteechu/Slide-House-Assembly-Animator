import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import './style.css';
import { installJapanese } from './japanese.js';

const fmt = n => `${Math.floor((n || 0) / 60).toString().padStart(2, '0')}:${Math.floor((n || 0) % 60).toString().padStart(2, '0')}`;

function App() {
  const [japanese, setJapanese] = useState(true);
  const themeRef = useRef(true);
  const [bgPreset, setBgPreset] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem('dbpa_bg_preset')) || 'default');
  const [bgColor, setBgColor] = useState(() => (typeof localStorage !== 'undefined' && localStorage.getItem('dbpa_bg_custom_color')) || '#eef5f1');
  const stage = useRef(null);
  const canvasRef = useRef(null);
  const initializedRef = useRef(false);
  const [app, setApp] = useState(null);
  const [state, setState] = useState({
    slides: [],
    index: 0,
    time: 0,
    slideTime: 0,
    total: 897,
    playing: false
  });
  const [menu, setMenu] = useState(true);
  const [notes, setNotes] = useState(false);
  const [error, setError] = useState('');
  const [voice, setVoice] = useState(true);

  useEffect(() => {
    let instance = null;
    let timer = null;

    const tryInit = () => {
      if (initializedRef.current) return true;
      if (!canvasRef.current || !window.PresentationApp) return false;

      try {
        initializedRef.current = true;
        instance = new window.PresentationApp(canvasRef.current);
        window.app = instance;
        installJapanese(instance);
        instance.japaneseTheme = themeRef.current;

        instance.onTimeUpdate = (elapsed, total) => {
          const t = typeof elapsed === 'object' ? elapsed.globalElapsed : elapsed;
          const st = typeof elapsed === 'object' ? elapsed.slideElapsed : (instance.slideElapsed || 0);
          const tot = typeof elapsed === 'object' ? elapsed.totalDuration : (total || 897);
          setState(prev => ({
            ...prev,
            time: t || 0,
            slideTime: st || 0,
            total: tot || prev.total
          }));
        };

        instance.onSlideChange = (slideIndex) => {
          setState(prev => ({
            ...prev,
            index: slideIndex,
            time: instance.globalElapsed || 0,
            slideTime: instance.slideElapsed || 0,
            total: typeof instance.getTotalDuration === 'function' ? instance.getTotalDuration() : prev.total
          }));
        };

        instance.onPlayStateChange = (isPlaying) => {
          setState(prev => ({
            ...prev,
            playing: isPlaying
          }));
        };

        setApp(instance);
        setState({
          slides: instance.slides || [],
          index: instance.activeSlideIndex || 0,
          time: instance.globalElapsed || 0,
          slideTime: instance.slideElapsed || 0,
          total: typeof instance.getTotalDuration === 'function' ? instance.getTotalDuration() : 897,
          playing: instance.isPlaying || false
        });

        if (typeof instance.render === 'function') {
          instance.render();
        }
        return true;
      } catch (err) {
        console.error('Failed to initialize PresentationApp:', err);
        setError(err.message || 'Error initializing engine');
        initializedRef.current = false;
        return false;
      }
    };

    if (!tryInit()) {
      let attempts = 0;
      timer = setInterval(() => {
        attempts++;
        if (tryInit() || attempts > 50) {
          clearInterval(timer);
        }
      }, 100);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
    };
  }, []);

  const act = fn => {
    try {
      if (app) fn(app);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleJapanese = () => {
    const next = !japanese;
    themeRef.current = next;
    setJapanese(next);
    if (app) {
      app.japaneseTheme = next;
      if (typeof app.render === 'function') {
        app.render();
      }
    }
  };

  const applyBgTheme = (preset, customColor = bgColor) => {
    setBgPreset(preset);
    setBgColor(customColor);
    if (app && typeof app.setBackgroundTheme === 'function') {
      app.setBackgroundTheme(preset, customColor);
    }
  };

  const switchSlide = (i) => {
    act(a => {
      a.selectSlide(i);
      a._v3motionSeconds = 0;
      a._v3lastMotion = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
      if (typeof a.render === 'function') a.render();
    });
  };

  const slide = state.slides[state.index];

  return (
    <div className={`studio-fixed min-h-screen p-4 md:p-6 ${japanese ? 'japanese' : 'original'}`}>
      <header className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">
            Integrated Design <span className="text-emerald-300">& BOM Automation</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="control flex items-center gap-1.5 py-1 px-2.5" title="ปรับสีพื้นหลังสไลด์ (Slide 10 & 12)">
            <span className="text-xs font-semibold opacity-80">BG:</span>
            {[
              { id: 'default', label: 'Auto', color: 'linear-gradient(135deg,#1e3a31,#72ab99)' },
              { id: 'washi', label: 'Washi', color: '#f7f5ee' },
              { id: 'white', label: 'White', color: '#ffffff' },
              { id: 'sage', label: 'Sage', color: '#dfeee7' },
              { id: 'emerald-dark', label: 'Dark', color: '#132720' },
              { id: 'blueprint', label: 'Navy', color: '#10243e' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyBgTheme(p.id, bgColor)}
                title={`พื้นหลัง: ${p.label}`}
                aria-label={`Background ${p.label}`}
                className={`w-5 h-5 rounded-full border transition-transform ${bgPreset === p.id ? 'scale-110 ring-2 ring-emerald-500 border-white' : 'border-slate-400/60 opacity-85 hover:opacity-100'}`}
                style={{ background: p.color }}
              />
            ))}
            <label className="flex items-center gap-1 cursor-pointer ml-0.5" title="เลือกสีพื้นหลังเอง (Custom)">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => applyBgTheme('custom', e.target.value)}
                aria-label="Custom background color"
                className={`w-5 h-5 p-0 border-0 rounded cursor-pointer bg-transparent ${bgPreset === 'custom' ? 'ring-2 ring-emerald-500 rounded-full' : ''}`}
              />
            </label>
          </div>
          <button
            className="control"
            aria-pressed={japanese}
            onClick={toggleJapanese}
          >
            {japanese ? '和 Japanese' : 'Original'}
          </button>
          <button
            className="control"
            onClick={() => setMenu(!menu)}
          >
            ☰ สไลด์
          </button>
        </div>
      </header>

      <div
        className="shell grid gap-3.5"
        style={{
          gridTemplateColumns: menu ? '185px minmax(0, 1fr)' : '1fr'
        }}
      >
        <AnimatePresence>
          {menu && (
            <motion.aside
              initial={{ opacity: 0, x: -16, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 185 }}
              exit={{ opacity: 0, x: -16, width: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="sidebar panel p-2 flex flex-col min-h-0"
            >
              <div className="px-2 py-1.5 text-[11px] font-medium tracking-wider text-slate-400 uppercase flex items-center justify-between border-b border-black/5 dark:border-white/5 mb-1.5">
                <span>Chapters</span>
                <span className="text-[10px] opacity-70 font-mono">
                  {state.slides.length}
                </span>
              </div>
              <div className="overflow-y-auto space-y-1.5 pr-0.5">
                {state.slides.map((s, i) => {
                  const isActive = i === state.index;
                  return (
                    <motion.button
                      key={s.id || i}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => switchSlide(i)}
                      className={`w-full text-left p-2 rounded-lg transition-colors flex flex-col gap-1 relative ${
                        isActive
                          ? 'bg-emerald-200 text-emerald-950 font-medium shadow-sm'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-mono opacity-60">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] font-mono opacity-50">
                          {fmt(s.duration)}
                        </span>
                      </div>
                      <div className="text-xs leading-snug line-clamp-2 font-medium">
                        {s.title}
                      </div>
                      {s.sourceImage && (
                        <img
                          className="chapter-image"
                          src={'./' + s.sourceImage.replace(/^\/+/, '')}
                          alt=""
                          loading="lazy"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="stage shadow-2xl relative"
            ref={stage}
          >
            <canvas
              id="stageCanvas"
              ref={canvasRef}
              width={1920}
              height={1080}
              className="w-full h-full object-contain"
            />
            <motion.div
              key={state.index + String(japanese)}
              className="scene-transition"
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>

          {!app && (
            <p className="p-2 text-xs text-amber-200">
              กำลังเริ่มต้นระบบ Native Canvas…
            </p>
          )}
          {error && (
            <p role="alert" className="p-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <section className="panel mt-3 p-3.5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-emerald-200">
                {state.time >= state.total
                  ? 'นำเสนอครบแล้ว'
                  : state.playing
                  ? 'กำลังเล่นต่อเนื่อง'
                  : 'พร้อมนำเสนอ'}{' '}
                · {state.index + 1} / {state.slides.length || '—'}
              </span>
              <span className="tabular-nums font-mono text-slate-400">
                สไลด์ {fmt(state.slideTime)} / {fmt(slide?.duration || 0)} · รวม {fmt(state.time)} / {fmt(state.total)}
              </span>
            </div>
            <input
              aria-label="ตำแหน่งการนำเสนอ"
              type="range"
              className="w-full mb-3"
              min="0"
              max={state.total}
              value={state.time}
              onChange={e => act(a => a.seekTo(Number(e.target.value)))}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={!app}
                className="rounded-lg px-4 py-2 bg-emerald-200 text-emerald-950 font-semibold text-xs transition hover:brightness-105"
                onClick={() => act(a => (a.playAll ? a.playAll() : a.play(true)))}
              >
                ▶ เล่นทั้งหมดจนจบ
              </button>
              <button
                disabled={!app}
                className="control"
                onClick={() => act(a => (a.isPlaying ? a.pause() : a.play(false)))}
              >
                {state.playing ? '⏸ พัก' : '▶ เล่นต่อ'}
              </button>
              <button
                disabled={!app || state.index === 0}
                className="control"
                onClick={() => switchSlide(state.index - 1)}
              >
                ←
              </button>
              <button
                disabled={!app || state.index >= state.slides.length - 1}
                className="control"
                onClick={() => switchSlide(state.index + 1)}
              >
                →
              </button>
              <button
                className="control"
                onClick={() =>
                  act(a => {
                    const next = !voice;
                    a.ttsEnabled = next;
                    setVoice(next);
                    if (!next) {
                      if (typeof a.stopNarration === 'function') {
                        a.stopNarration();
                      } else if (typeof speechSynthesis !== 'undefined') {
                        speechSynthesis.cancel();
                      }
                    } else if (a.isPlaying) {
                      const cur = a.slides?.[a.activeSlideIndex];
                      if (cur?.narration) {
                        a.speakNarration(cur.narration);
                      }
                    }
                  })
                }
              >
                {voice ? 'เสียง: เปิด' : 'เสียง: ปิด'}
              </button>
              <button
                className="control"
                onClick={() => setNotes(!notes)}
              >
                บทบรรยาย
              </button>
              <button
                className="control"
                onClick={() => stage.current?.requestFullscreen().catch(e => setError(e.message))}
              >
                เต็มจอ
              </button>
            </div>
          </section>

          <AnimatePresence>
            {notes && (
              <motion.section
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="speaker-floating panel p-4 mt-3 overflow-hidden text-xs"
              >
                <h2 className="text-emerald-200 font-semibold text-sm mb-2">
                  {slide?.title}
                </h2>
                <p className="leading-6 text-slate-300">
                  {slide?.narration}
                </p>
                {slide?.speakerCues?.length > 0 && (
                  <ul className="mt-3 text-slate-400 space-y-1 border-t border-white/5 pt-2">
                    {slide.speakerCues.map((c, i) => (
                      <li key={i}>
                        {i + 1}. {c}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

// Narration phrasing and time-synced controls for Ver3 & Ver4; uses normal 1.0x voice speed locked to slide clock.
(() => {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const proto = PresentationApp.prototype;

  function status(message) {
    const el = typeof document !== 'undefined' ? document.getElementById('v3VoiceStatus') : null;
    if (el) el.textContent = message;
  }

  function restoreMusic(app) {
    if (app._v3MusicGain !== undefined && app.bgmGain) {
      app.bgmGain.gain.value = app._v3MusicGain;
      delete app._v3MusicGain;
    }
  }

  function stop(app) {
    app._v3VoiceToken = (app._v3VoiceToken || 0) + 1;
    if (app._v3VoiceTimer) {
      clearTimeout(app._v3VoiceTimer);
      app._v3VoiceTimer = null;
    }
    if (synth) {
      try { synth.cancel(); } catch (e) {}
    }
    app.currentUtterance = null;
    restoreMusic(app);
  }

  proto.stopNarration = function() {
    stop(this);
  };

  function chunks(text) {
    const result = [];
    for (const sentence of String(text || '').split(/(?<=ครับ|ค่ะ|[!?。])\s*|\n+/u).filter(s => s.trim())) {
      const words = typeof Intl.Segmenter === 'function'
        ? Array.from(new Intl.Segmenter('th', { granularity: 'word' }).segment(sentence), s => s.segment)
        : Array.from(sentence);
      let part = '';
      for (const word of words) {
        if (part.length + word.length > 200 && part.trim()) {
          result.push(part.trim());
          part = '';
        }
        part += word;
      }
      if (part.trim()) result.push(part.trim());
    }
    return result;
  }

  proto.getBestThaiVoice = function() {
    const voices = synth ? synth.getVoices() : [];
    const thai = voices.filter(v => /^th(?:-|_|$)/i.test(v.lang || '') || /thai|ไทย|premwadee|niwat|kanya|achara/i.test(v.name || ''));
    const selected = thai.find(v => v.voiceURI === this.selectedVoiceURI);
    if (selected) return selected;
    const score = v => /natural|neural/i.test(v.name) ? 3 : /online|google/i.test(v.name) ? 2 : 1;
    return thai.sort((a, b) => score(b) - score(a))[0] || null;
  };

  proto.speakNarration = function(text, opts = {}) {
    if (!this.ttsEnabled || !synth || !text) return;
    if (!this.isPlaying && !opts.forceWhenPaused) return;

    stop(this);
    const token = this._v3VoiceToken;
    const slideIdx = this.activeSlideIndex;
    const slide = this.slides && this.slides[slideIdx];
    const voice = this.getBestThaiVoice();

    // Build time-synced cues list for this slide
    let cueList = [];
    if (slide && Array.isArray(slide.timedNarration) && slide.timedNarration.length > 0 && text === slide.narration && !opts.forceWhenPaused) {
      cueList = slide.timedNarration.map(c => ({
        at: Number(c.at) || 0,
        phonetic: this.toThaiPhonetic(c.text)
      })).filter(c => c.phonetic);
    } else {
      const rawParts = chunks(this.toThaiPhonetic(text));
      const dur = Math.max(10, (slide && Number(slide.duration)) || 30);
      const totalChars = Math.max(1, rawParts.reduce((s, p) => s + p.length, 0));
      let acc = 0;
      cueList = rawParts.map((p, idx) => {
        const at = idx === 0 ? 0.2 : Math.min(dur - 4, (acc / totalChars) * (dur * 0.78));
        acc += p.length;
        return { at, phonetic: p };
      });
    }

    if (cueList.length === 0) return;

    // Determine starting cue based on current slideElapsed when playing
    let startIdx = 0;
    const curElapsed = this.isPlaying ? (Number(this.slideElapsed) || 0) : 0;
    if (this.isPlaying && !opts.forceWhenPaused && curElapsed > 1.5) {
      for (let k = cueList.length - 1; k >= 0; k--) {
        if (curElapsed >= cueList[k].at - 0.5) {
          startIdx = k;
          break;
        }
      }
    }

    if (this.bgmGain) {
      this._v3MusicGain = this.bgmGain.gain.value;
      this.bgmGain.gain.value = Math.min(this._v3MusicGain, 0.035);
    }

    const speakCue = (i) => {
      if (token !== this._v3VoiceToken) return;
      if (!opts.forceWhenPaused && (!this.isPlaying || this.activeSlideIndex !== slideIdx || !this.ttsEnabled)) {
        stop(this);
        return;
      }
      if (i >= cueList.length) {
        this.currentUtterance = null;
        restoreMusic(this);
        status('อ่านจบแล้ว' + (voice ? ' · ' + voice.name : ''));
        return;
      }

      const cue = cueList[i];
      const nowElapsed = this.isPlaying ? (Number(this.slideElapsed) || 0) : cue.at;

      // If we reached a cue whose scheduled timestamp `cue.at` is still in the future
      // (e.g. waiting for Slide 12 Step 02 at 10.3s or Step 03 at 130.3s), wait until `cue.at`
      if (this.isPlaying && !opts.forceWhenPaused && cue.at - nowElapsed > 0.25) {
        const waitMs = Math.min(30000, Math.max(150, (cue.at - nowElapsed) * 1000));
        this._v3VoiceTimer = setTimeout(() => speakCue(i), waitMs);
        return;
      }

      const utter = new SpeechSynthesisUtterance(cue.phonetic);
      if (voice) utter.voice = voice;
      utter.lang = 'th-TH';
      // Normal 1.0x voice speed as requested by user (no artificial speedup)
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.volume = 1.0;

      this.currentUtterance = utter;
      utter.onend = () => {
        if (token !== this._v3VoiceToken) return;
        this.currentUtterance = null;
        if (i + 1 >= cueList.length) {
          restoreMusic(this);
          status('อ่านจบแล้ว' + (voice ? ' · ' + voice.name : ''));
          return;
        }
        const nextCue = cueList[i + 1];
        const afterElapsed = this.isPlaying ? (Number(this.slideElapsed) || 0) : nextCue.at;
        const gapToNextCueMs = this.isPlaying && !opts.forceWhenPaused
          ? Math.max(320, (nextCue.at - afterElapsed) * 1000)
          : 360;
        this._v3VoiceTimer = setTimeout(() => speakCue(i + 1), gapToNextCueMs);
      };
      utter.onerror = (e) => {
        if (token !== this._v3VoiceToken) return;
        if (e && (e.error === 'canceled' || e.error === 'interrupted')) return;
        this.currentUtterance = null;
        if (i + 1 < cueList.length && this.isPlaying) {
          this._v3VoiceTimer = setTimeout(() => speakCue(i + 1), 400);
        } else {
          stop(this);
        }
      };

      status(`กำลังบรรยายฉาก ${slideIdx + 1}/${this.slides ? this.slides.length : 16} (ช่วง ${i + 1}/${cueList.length})`);
      try {
        if (synth.paused) synth.resume();
        synth.speak(utter);
      } catch (e) {
        stop(this);
      }
    };

    // Initial delay if first cue starts slightly after curElapsed
    const firstCue = cueList[startIdx];
    const initialDelayMs = (this.isPlaying && !opts.forceWhenPaused && firstCue.at > curElapsed)
      ? Math.max(60, (firstCue.at - curElapsed) * 1000)
      : 60;
    this._v3VoiceTimer = setTimeout(() => speakCue(startIdx), initialDelayMs);
  };

  window.addEventListener('DOMContentLoaded', () => {
    const app = window.app;
    if (!app) return;
    app.v3VoiceRate = 1.0;
    try { localStorage.setItem('dbpa_v3_voice_rate', '1.0'); } catch (e) {}
    const stagePanel = document.querySelector('.stage-panel');
    if (!stagePanel) return;
    const panel = document.createElement('details');
    panel.id = 'v3VoicePanel';
    panel.open = true;
    panel.innerHTML = '<summary>เสียงบรรยาย · ความเร็วปกติ (1.00×) ซิงค์ตามเวลาสไลด์</summary><div class="v3-voice-row"><label id="v3VoiceChoice">เสียงภาษาไทย </label><button type="button" class="btn v3-mode" id="v3VoiceTry">ลองเสียง</button><button type="button" class="btn" id="v3VoiceRead">อ่านฉากนี้</button><button type="button" class="btn" id="v3VoiceStop">หยุดเสียง</button></div><p id="v3VoiceStatus" role="status"></p>';
    stagePanel.append(panel);
    const select = document.getElementById('selTtsVoice');
    if (select) document.getElementById('v3VoiceChoice').append(select);
    const read = text => {
      const before = app.ttsEnabled;
      app.ttsEnabled = true;
      app.speakNarration(text, { forceWhenPaused: true });
      app.ttsEnabled = before;
    };
    document.getElementById('v3VoiceTry').addEventListener('click', () => read('สวัสดีครับ วันนี้ขอนำเสนอระบบออกแบบและจัดทำรายการวัสดุอัตโนมัติ ด้วยความเร็วเสียงปกติครับ'));
    document.getElementById('v3VoiceRead').addEventListener('click', () => read(app.slides[app.activeSlideIndex].narration));
    document.getElementById('v3VoiceStop').addEventListener('click', () => { stop(app); status('หยุดเสียงแล้ว'); });
    const showVoice = () => {
      const voice = app.getBestThaiVoice();
      status(voice ? 'พร้อม · ' + voice.name + ' · ความเร็วปกติ 1.00×' : 'พร้อมบรรยายภาษาไทย · ความเร็วปกติ 1.00×');
    };
    showVoice();
    if (synth && synth.addEventListener) synth.addEventListener('voiceschanged', showVoice);
  });
})();

// Explicit full-presentation playback, using the existing timeline engine.
(() => {
  const proto = PresentationApp.prototype;
  function refresh(app) {
    const button = document.getElementById('btnPlayPause');
    if (button) button.textContent = app.isPlaying ? '⏸ พักการนำเสนอ' : '▶ เล่นต่อ';
    const all = document.getElementById('btnV3PlayAll');
    if (all) {
      all.disabled = !!app.isRecording;
      all.textContent = `▶ เล่นทั้งหมดจนจบ · ${app.formatTime(app.getTotalDuration())}`;
    }
    const status = document.getElementById('v3PlaybackStatus');
    if (status) {
      const done = app.globalElapsed >= app.getTotalDuration();
      status.textContent = `${done ? 'นำเสนอครบแล้ว' : app.isPlaying ? 'กำลังเล่นต่อเนื่อง' : app.globalElapsed > 0 ? 'พักการนำเสนอ' : 'พร้อมเล่นทั้งหมด'} · ฉาก ${app.activeSlideIndex + 1}/${app.slides.length} · ${app.formatTime(app.globalElapsed)} / ${app.formatTime(app.getTotalDuration())}`;
    }
  }
  proto.playAll = function() {
    if (this.isRecording) return;
    this.pause();
    this.recordSingleScene = false;
    this.activeDocPreview = null;
    this.showAutomationModal = false;
    this.automationActiveTab = null;
    this._v3motionSlide = null;
    this.play(true);
    this.renderSlideList();
    this.loadSlideIntoEditor(0);
    this.updateTimelineUI();
    refresh(this);
  };
  const controls = proto.updatePlayControlsUI;
  proto.updatePlayControlsUI = function(...args) {
    if (document.getElementById('btnPlayPause') && controls) {
      try { controls.apply(this, args); } catch (_) {}
    }
    refresh(this);
  };
  const timeline = proto.updateTimelineUI;
  proto.updateTimelineUI = function(...args) {
    if (timeline) timeline.apply(this, args);
    refresh(this);
  };
  window.addEventListener('DOMContentLoaded', () => {
    const app = window.app;
    if (!app) return;
    const toolbar = document.querySelector('.toolbar-actions');
    const timelineBox = document.querySelector('.timeline-box');
    if (!toolbar || !timelineBox) return;
    const button = document.createElement('button');
    button.id = 'btnV3PlayAll';
    button.className = 'btn btn-primary';
    button.title = 'เริ่มฉากแรกและเปลี่ยนฉากอัตโนมัติจนจบ ใช้การตั้งค่าเสียงปัจจุบัน';
    button.addEventListener('click', () => app.playAll());
    toolbar.prepend(button);
    const status = document.createElement('div');
    status.id = 'v3PlaybackStatus';
    timelineBox.prepend(status);
    refresh(app);
  });
})();

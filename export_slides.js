const EXPORT_SETTLE_SEC = 18;
const IMAGE_LOAD_TIMEOUT_MS = 4000;

const waitFrame = () => new Promise(resolve => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => resolve());
  } else {
    setTimeout(resolve, 16);
  }
});

/**
 * Wait for all tracked Image instances to finish loading and decoding (with timeout).
 */
async function waitForPendingImages(pendingImages) {
  if (!pendingImages.size) return;
  const targets = Array.from(pendingImages);
  const waitAll = Promise.all(targets.map(img => {
    if (img.complete) {
      return typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();
    }
    return new Promise(resolve => {
      const finish = () => {
        if (typeof img.decode === 'function') {
          img.decode().catch(() => {}).finally(resolve);
        } else {
          resolve();
        }
      };
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));
  await Promise.race([
    waitAll,
    new Promise(resolve => setTimeout(resolve, IMAGE_LOAD_TIMEOUT_MS))
  ]);
}

/**
 * Render and capture every slide from the PresentationApp canvas at 1920x1080.
 */
async function captureAllSlides(app, onProgress) {
  if (!app || !app.canvas || !Array.isArray(app.slides) || app.slides.length === 0) {
    throw new Error('ระบบสไลด์ยังไม่พร้อมสำหรับส่งออก');
  }

  const wasPlaying = Boolean(app.isPlaying);
  const prevIndex = app.activeSlideIndex || 0;
  const prevGlobalElapsed = app.globalElapsed || 0;
  const prevSlideElapsed = app.slideElapsed || 0;
  const prevV3MotionEnabled = app.v3MotionEnabled;
  const prevV3MotionSlide = app._v3motionSlide;
  const prevV3MotionSeconds = app._v3motionSeconds;
  const prevSubtitleOverlay = app.subtitleOverlay;
  const prevTtsEnabled = app.ttsEnabled;

  if (wasPlaying && typeof app.pause === 'function') {
    app.pause();
  }
  if (typeof app.stopNarration === 'function') {
    app.stopNarration();
  }

  app.ttsEnabled = false;
  app.subtitleOverlay = false;
  app.v3MotionEnabled = false;

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  // Track any lazy-loaded Image objects created during slide rendering.
  const pendingImages = new Set();
  const OrigImage = typeof window !== 'undefined' ? window.Image : null;
  if (OrigImage) {
    const TrackedImage = function (...args) {
      const img = new OrigImage(...args);
      pendingImages.add(img);
      const cleanup = () => pendingImages.delete(img);
      img.addEventListener('load', cleanup, { once: true });
      img.addEventListener('error', cleanup, { once: true });
      return img;
    };
    TrackedImage.prototype = OrigImage.prototype;
    window.Image = TrackedImage;
  }

  const captures = [];
  const total = app.slides.length;

  try {
    for (let i = 0; i < total; i++) {
      const slide = app.slides[i];
      onProgress?.({ current: i + 1, total, title: slide?.title || '' });

      app.selectSlide(i);
      const settledSec = Math.max(EXPORT_SETTLE_SEC, Number(slide?.duration) || 12);
      const isResultsSlide = Boolean(
        slide && (slide.id === 'v3-results' || slide.layout === 'results-full' || slide.layout === 'results')
      );
      const isNewWorkflowSlide = Boolean(
        slide && (slide.id === 'v3-new-workflow' || slide.layout === 'new-workflow-allinone')
      );
      const targetElapsed = isResultsSlide ? EXPORT_SETTLE_SEC : (isNewWorkflowSlide ? 8.5 : 0);

      app._v3motionSlide = slide?.id;
      app._v3motionSeconds = settledSec;
      app._v3time = settledSec;
      app.slideElapsed = targetElapsed;

      // First render triggers any lazy-loaded images for this slide.
      app.render();
      await waitForPendingImages(pendingImages);
      await waitFrame();

      app._v3motionSlide = slide?.id;
      app._v3motionSeconds = settledSec;
      app._v3time = settledSec;
      app.slideElapsed = targetElapsed;
      app.render();

      const dataUrl = app.canvas.toDataURL('image/jpeg', 0.92);
      captures.push({
        index: i,
        title: slide?.title || `Slide ${i + 1}`,
        narration: slide?.narration || '',
        dataUrl
      });
    }
  } finally {
    if (OrigImage) {
      window.Image = OrigImage;
    }
    app.v3MotionEnabled = prevV3MotionEnabled;
    app.subtitleOverlay = prevSubtitleOverlay;
    app.ttsEnabled = prevTtsEnabled;
    app.selectSlide(prevIndex);
    app.globalElapsed = prevGlobalElapsed;
    app.slideElapsed = prevSlideElapsed;
    app._v3motionSlide = prevV3MotionSlide;
    app._v3motionSeconds = prevV3MotionSeconds;
    if (typeof app.render === 'function') {
      app.render();
    }
  }

  return captures;
}

/**
 * Export all presentation slides to a 16:9 PDF document.
 */
export async function exportSlidesToPdf(app, { onProgress } = {}) {
  const captures = await captureAllSlides(app, onProgress);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [960, 540],
    compress: true
  });

  captures.forEach((cap, idx) => {
    if (idx > 0) {
      pdf.addPage([960, 540], 'landscape');
    }
    pdf.addImage(cap.dataUrl, 'JPEG', 0, 0, 960, 540, undefined, 'FAST');
  });

  pdf.save('Integrated_Design_BOM_Automation_V4.pdf');
}

/**
 * Export all presentation slides to a 16:9 PowerPoint (.pptx) file with speaker notes.
 */
export async function exportSlidesToPptx(app, { onProgress } = {}) {
  const captures = await captureAllSlides(app, onProgress);
  const mod = await import('pptxgenjs');
  const PptxGenJS = mod.default || mod;
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Integrated Design & BOM Automation V4';
  pptx.author = 'SCG HEIM · R&D & TOI';

  captures.forEach((cap) => {
    const slide = pptx.addSlide();
    slide.addImage({
      data: cap.dataUrl,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%'
    });
    if (cap.narration) {
      slide.addNotes(cap.narration);
    }
  });

  await pptx.writeFile({ fileName: 'Integrated_Design_BOM_Automation_V4.pptx' });
}

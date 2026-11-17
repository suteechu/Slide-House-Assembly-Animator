// Auto BOM & Drawing — Digital Blueprint to Physical Assembly (Master Process Flow)
// 100% Procedural Vector Animation + Live VDO Screen
// 3-Stage Process Deck:
// 01: New Workflow: 4 Parallel Branches (OTF ➔ Auto BOM 4.5 Hrs. ➔ 4 Branches ➔ Production ➔ Installation)
// 02: ต้นน้ำ: OTF (Forcon.) ➔ Auto BOM & Drawing (SketchUp ≤ 2 นาที) + Code Streamer 20X & Documents
// 03: สรุปผลลัพธ์ Automation: 5 ผลผลิตหลัก (3D Model, 2D Drawing, Part Items (BOM), Job Order, SB List & EE)

const MAX_TOTAL_SECONDS = 9999; // ปลดล็อกข้อจำกัดเวลา

const AVAILABLE_VIDEOS = [
  { label: '🎬 [1/2] VDO Run IW Plugin (สร้างผนัง & โครง C75 Auto)', src: 'VDO/Run IW Plugin.mp4' },
  { label: '🎬 [2/2] VDO Run EE Plugin (เจาะจุดปลั๊ก & สวิตช์ Auto)', src: 'VDO/Run EE Plugin.mp4' },
  { label: '🎬 VDO 3D Model Automation (04)', src: 'VDO/3D.mp4' },
  { label: '🎬 VDO 2D Drawing Automation (04)', src: 'VDO/2D.mp4' },
  { label: '🎬 VDO BOM / PartItems Automation (04)', src: 'VDO/BOM.mp4' },
  { label: '🎬 VDO Job Order Automation (04)', src: 'VDO/Job Order.mp4' },
  { label: '🎬 VDO SB List / CAD EE Punching (04)', src: 'VDO/SB List.mp4' },
  { label: '🎬 VDO รัน Plugin - EE (01:19)', src: 'VDO/รัน Plugin - EE.mp4' },
  { label: '🎬 VDO 3D House Assembly Animator Clean (01:19)', src: 'VDO/2026-11-12 09-27-32.mp4' },
  { label: '🎬 VDO โรงงานเครื่องตัด CNC จริง (01:10)', src: 'VDO/รันเครื่องตัด.mp4' },
  { label: '🎬 VDO SketchUp แยก Tags ชิ้นส่วนผนัง (01:14)', src: 'หน้าต่าง 2026-11-12 06-47-33.mp4' },
  { label: '🎬 VDO Simulation Run เต็มรูปแบบ (03:16)', src: 'VDO/2026-11-12 09-09-29.mp4' },
  { label: '🎬 VDO Recording 09-24-47 (Full Session)', src: 'VDO/2026-11-12 09-24-47.mp4' },
  { label: '🎬 VDO Main Edit Presentation (02:28)', src: 'Main Edit.mp4' },
  { label: '🚫 ไม่ใส่วิดีโอ (แสดง Vector Animation เต็มจอ 100%)', src: '' }
];

const DEFAULT_SLIDES = [
  {
    id: 'stage-new-flow-overview',
    chapter: '01 • NEW WORKFLOW: 4 PARALLEL BRANCHES',
    jpTitle: '第一工程：新フロー全体像',
    title: 'ภาพรวม New Flow: OTF ➔ 4 สายงานคู่ขนาน',
    subtitle: 'OTF (Forcon.) ➔ Auto BOM & Drawing (SketchUp) ➔ แยก 4 สายงาน ➔ Production',
    duration: 20,
    sceneType: 'parallel-branch-split',
    vdoLayout: 'vector-only',
    videoSrc: '',
    videoStart: 0,
    videoRate: 1.0,
    vdoStatus: 'ready',
    vdoPrompt: '✨ ผังกระบวนการใหม่: OTF ➔ Auto BOM & Drawing ➔ แยก 4 สายงานคู่ขนาน ➔ Production',
    narration: 'ภาพรวมกระบวนการใหม่ นำเข้า โอทีเอฟ รัน ออโต้ บีโอเอ็ม ในสเก็ตช์อัป แล้วแยกสี่สายงานคู่ขนาน ส่งตรงฝ่ายผลิตทันที',
    footerNote: 'NEW FLOW: OTF ➔ Auto BOM & Drawing ➔ 1. PartItems • 2. Picking • 3. SB List • 4. 2D/3D Dwg ➔ Production',
    nodes: [
      { code: 'SRC', label: 'OTF (Forcon.)', sub: 'รับแบบบ้าน & ผังแปลนสถาปัตย์', icon: 'draft' },
      { code: 'HUB', label: 'Auto BOM & Drawing', sub: 'SketchUp Automation', icon: 'sketchup' },
      { code: 'B1-4', label: '4 สายงานคู่ขนาน', sub: '1. PartItems • 2. Picking • 3. SB • 4. 2D/3D', icon: 'po' },
      { code: 'DEST', label: 'Production', sub: 'ประกอบโรงงาน ±1mm', icon: 'walldone' }
    ]
  },
  {
    id: 'stage-auto-bom-sketchup',
    chapter: '02 • OTF ➔ AUTO BOM & DRAWING',
    jpTitle: '第二工程：OTFからAuto BOM & Drawing (SketchUp) へ',
    title: 'ต้นน้ำ: OTF (Forcon.) ➔ Auto BOM & Drawing (SketchUp)',
    subtitle: 'นำเข้าแบบแปลนสถาปัตย์ ➔ รัน 3D & ถอดปริมาณอัตโนมัติใน SketchUp (Fix ไม่เกิน 2 นาที) ➔ แตก 4 สายงานช่วงท้าย',
    duration: 120,
    sceneType: 'boq-sku-extrusion',
    vdoLayout: 'vdo-with-vector',
    videoSrc: 'VDO/Run IW Plugin.mp4',
    videoPlaylist: [
      { src: 'VDO/Run IW Plugin.mp4', title: 'Run IW Plugin (สร้างผนัง & โครง C75 Auto)', short: 'IW Plugin', fallbackDuration: 39.3 },
      { src: 'VDO/Run EE Plugin.mp4', title: 'Run EE Plugin (เจาะจุดปลั๊ก & สวิตช์ Auto)', short: 'EE Plugin', fallbackDuration: 34.67 }
    ],
    videoStart: 0,
    videoRate: 1.0,
    vdoStatus: 'ready',
    vdoPrompt: '🎬 รันปลั๊กอิน SketchUp อัตโนมัติ : Run IW Plugin ➔ Run EE Plugin',
    narration: 'นำข้อมูล โอทีเอฟ เข้า สเก็ตช์อัป ถอดปริมาณชิ้นส่วนและคำนวณตำแหน่งเจาะไฟอัตโนมัติ ภายในเวลาไม่เกินสองนาที พร้อมส่งต่อข้อมูลสี่สายงาน ได้แก่ พาร์ทไอเทมส์ จ๊อบออร์เดอร์ เอสบีลิสต์ และแบบสองมิติสามมิติ',
    footerNote: 'OTF (Forcon.) ➔ Database & Rules ➔ Auto BOM & Drawing (SketchUp ≤ 2 นาที) ➔ 1. PartItems • 2. Job Order • 3. SB List • 4. 2D/3D Drawing',
    nodes: [
      { code: '01', label: 'OTF Input', sub: 'รับแบบสถาปัตย์เข้าระบบ', icon: 'draft' },
      { code: '02', label: 'Database & Rules', sub: 'MIM, IM, Coding & Planing Rule', icon: 'blueprint' },
      { code: '03', label: 'Auto BOM & Drawing', sub: 'ขึ้น 3D & ถอดปริมาณ (≤ 2 นาที)', icon: 'sketchup' },
      { code: '04', label: 'Single Model', sub: 'โมเดลกลางพร้อมแยก 4 สายงาน', icon: 'walldone' }
    ]
  },
  {
    id: 'stage-automation-summary',
    chapter: '03 • 5 DELIVERABLES SUMMARY',
    jpTitle: '第三工程：自動化アウトプット総括',
    title: 'สรุปผลลัพธ์ Automation: 5 ผลผลิตหลัก (3D, 2D, BOM, Job Order, SB List)',
    subtitle: 'จากการประมวลผลโมเดลเดี่ยว สู่ 5 ผลผลิตพร้อมใช้งาน: 3D, 2D, BOM (PartItems), Job Order, SB List',
    duration: 30,
    sceneType: 'automation-deliverables-summary',
    vdoLayout: 'vdo-with-vector',
    videoSrc: 'VDO/3D.mp4',
    videoStart: 0,
    videoRate: 1.0,
    vdoStatus: 'ready',
    vdoPrompt: '✨ สรุปผลลัพธ์ Automation: 3D, 2D, BOM, Job Order, SB List จากโมเดลเดียว',
    narration: 'สรุปผลลัพธ์จากการทำงานด้วยระบบ ออโตเมชัน เมื่อประมวลผลโมเดลสามมิติเสร็จสมบูรณ์ ระบบจะสร้างผลผลิตทั้งห้าอย่างอัตโนมัติทันที ได้แก่ โมเดลสามมิติ แบบประกอบสองมิติ ตารางพาร์ทไอเทมส์บีโอเอ็ม ใบสั่งผลิต และเอสบีลิสต์พร้อมตำแหน่งเจาะไฟ เชื่อมโยงสู่สายการผลิตได้อย่างรวดเร็วและแม่นยำ',
    footerNote: 'AUTOMATION SUMMARY: 1. 3D Model • 2. 2D Drawing • 3. Part Items (BOM) • 4. Job Order • 5. SB List ➔ Production 100%',
    nodes: [
      { code: '3D', label: '3D Model', sub: 'โมเดลโครงสร้าง 3 มิติ', icon: 'walldone', vdo: 'VDO/3D.mp4' },
      { code: '2D', label: '2D Drawing', sub: 'แบบประกอบ Shop Drawing', icon: 'draft', vdo: 'VDO/2D.mp4' },
      { code: 'BOM', label: 'Part Items (BOM)', sub: 'ถอดปริมาณชิ้นส่วน Auto', icon: 'po', vdo: 'VDO/BOM.mp4' },
      { code: 'JOB', label: 'Job Order', sub: 'ใบสั่งผลิต & Picking List', icon: 'blueprint', vdo: 'VDO/Job Order.mp4' },
      { code: 'SB', label: 'SB List & EE', sub: 'CAD Punching & CNC', icon: 'sketchup', vdo: 'VDO/SB List.mp4' }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.AVAILABLE_VIDEOS = AVAILABLE_VIDEOS;
  window.DEFAULT_SLIDES = DEFAULT_SLIDES;
  window.MAX_TOTAL_SECONDS = MAX_TOTAL_SECONDS;
}

if (typeof module !== 'undefined') {
  module.exports = { AVAILABLE_VIDEOS, DEFAULT_SLIDES, MAX_TOTAL_SECONDS };
}

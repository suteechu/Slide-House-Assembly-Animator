// Additive Ver3 content. Source: OE_NonManu_INTEGRATEGRATED DESIGN _ BOM AUTOMATION.pptx.
// The three original interactive scenes remain in the same engine.
window.PRESENTATION_V3 = true;
(() => {
  const original = DEFAULT_SLIDES.map(s => JSON.parse(JSON.stringify(s)));
  if (typeof window !== "undefined") window.VER2_SLIDES = original;
  const slide = (id, title, subtitle, layout, sourceSlides, extra = {}) => ({
    id, chapter: 'INTEGRATED DESIGN & BOM AUTOMATION', jpTitle: '', title, subtitle,
    duration: 24, sceneType: 'ver3-editorial', vdoLayout: 'vector-only',
    videoSrc: '', videoStart: 0, videoRate: 1, vdoStatus: 'optional', vdoPrompt: '',
    narration: subtitle, footerNote: 'SCG HEIM  /  Design · Production · Installation',
    nodes: [], layout, sourceSlides, ...extra
  });
  const intro = [
    slide('v3-cover', 'Integrated Design', '& BOM Automation', 'cover', [1], {
      sourceImage: 'assets/ver3/slide_01_full.png', duration: 15,
      narration: 'Integrated Design และ BOM Automation เชื่อมโยงงานออกแบบ ข้อมูลวัสดุ การผลิต และการติดตั้ง',
      kicker: 'End-to-End Value Creation',
      nodes: [{label:'Floorplan',sub:'สถาปัตย์และเงื่อนไข'},{label:'BOM',sub:'รายการวัสดุและปริมาณ'},{label:'Data Base',sub:'ข้อมูลโมเดลสู่ระบบ'},{label:'DWG Detail',sub:'แบบประกอบโรงงาน'},{label:'Production',sub:'จัดซื้อและผลิต'}]
    }),
    slide('v3-team', 'Meet Our Team', 'Integrated Design & BOM Automation · SCG HEIM', 'team-full', [2], {
      sourceImage: 'assets/ver3/slide_02_team.png',
      duration: 25,
      members: [
        {
          id: 'kritsana',
          name: 'Kritsana Pongphal',
          role: 'Project Leader',
          roleBadge: '★ PROJECT LEADER',
          photo: 'assets/ver3/team/card_kritsana.png',
          accent: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.4)',
          points: [
            'Project Management & Strategic Direction',
            'Cross-Department Integration (R&D / TOI)',
            'Quality Control & Standard Governance'
          ]
        },
        {
          id: 'pat',
          name: 'Pat Booranasanti',
          role: 'Staff / System Developer',
          roleBadge: '● SYSTEM DEVELOPER',
          photo: 'assets/ver3/team/card_pat.png',
          accent: '#10b981',
          glow: 'rgba(16, 185, 129, 0.35)',
          points: [
            '3D Ruby Logic & Component Engine',
            'Interior Wall & Partition Automation',
            '3D Accuracy Validation & Rule Check'
          ]
        },
        {
          id: 'peeradol',
          name: 'Peeradol Tongpubes',
          role: 'Staff / System Developer',
          roleBadge: '● SYSTEM DEVELOPER',
          photo: 'assets/ver3/team/card_peeradol.png',
          accent: '#10b981',
          glow: 'rgba(16, 185, 129, 0.35)',
          points: [
            '2D Assembly DWG Auto Generation',
            'Smart Board Punching Board Engine',
            'CAD Punching DWG to Machine CSV'
          ]
        },
        {
          id: 'sutee',
          name: 'Sutee Chuyram',
          role: 'Staff / System Developer',
          roleBadge: '● SYSTEM DEVELOPER',
          photo: 'assets/ver3/team/card_sutee.png',
          accent: '#10b981',
          glow: 'rgba(16, 185, 129, 0.35)',
          points: [
            'End-to-End Auto BOM Architecture',
            'Ruby-to-Database Sync & Automation',
            'Sourcing, PO & Production Data Integration'
          ]
        }
      ],
      nodes:[{label:'Kritsana Pongphal',sub:'Project Leader'}, {label:'Pat Booranasanti',sub:'Staff'}, {label:'Peeradol Tongpubes',sub:'Staff'}, {label:'Sutee Chuyram',sub:'Staff'}]
    }),
    slide('v3-background', '[1] BACKGROUND', 'ยกระดับการจัดทำ BOM และ Drawing จาก Manual สู่ Automation', 'background', [3], {
      sourceImage: 'assets/ver3/slide_02_full.png',
      nodes: [
        {label:'Manpower Skill',sub:'ลดการพึ่งพาทักษะเฉพาะบุคคล ด้วย Planning Rule และมาตรฐานเดียวกัน'},
        {label:'Loss Cost & Rework',sub:'ลดข้อผิดพลาดจากการเลือกวัสดุ การใส่รหัส และการส่งต่อข้อมูล'},
        {label:'Reduce Time',sub:'ลดงานซ้ำในการจัดทำ BOM และ Drawing ให้ข้อมูลเชื่อมโยงกัน'}
      ]
    }),
    slide('v3-existing', 'Existing Workflow', 'ข้อมูลผ่านหลายขั้นตอน และต้องจัดทำรายละเอียดด้วย Manual', 'process', [4,5,14], {
      sourceImage: 'assets/ver3/slide_06_2.png',
      nodes: [{label:'OTF / For Construction',sub:'ข้อมูลแบบและคำสั่งผลิต'}, {label:'Menu Select & Coding',sub:'เลือกข้อมูลและใส่รหัสทีละรายการ'}, {label:'BOM & Drawing',sub:'จัดทำรายการวัสดุและแบบประกอบ'}, {label:'Production & Supply',sub:'Job Order, Picking List, Purchase และ Smart Board'}]
    }),
    slide('v3-comparison', '[2] Existing Work Flow', 'Existing Menu Select BOM on WEB', 'existing-detail', [5], {
      sourceImage: 'assets/ver3/slide_04_full.png',
      nodes: [{label:'Coding Manual',sub:'Single/Double, Wall Type, Window, Grid Line'}, {label:'Input Data & Export',sub:'Web Menu Select, Parameters & Create IM/MPS/PS'}, {label:'Upload BOM Data',sub:'File Upload via Excel'}, {label:'Generate Final BOM',sub:'Recheck & Excel List'}]
    }),
    slide('v3-standard', 'Long Lead-time Parts', 'Before (Manual) vs After (Automate)', 'before-after', [6], {
      sourceImage: 'assets/ver3/slide_06_full.png',
      nodes: [
        {label:'Before / Manual',sub:'ขีดไฮไลท์แบบกระดาษ และเลือกเมนูทีละรายการบนเว็บ'},
        {label:'Center Bridge',sub:'Automate Detecting Part ตรวจจับชิ้นส่วนอัตโนมัติ'},
        {label:'After / Automate',sub:'2D CAD นำเข้าสู่ 3D SketchUp + Plug-in Ruby สร้าง BOM ทันที'}
      ]
    }),
    slide('v3-database', 'Interior Wall / Partition', 'Before (Manual DWG) vs After (Auto Code & DWG)', 'before-after-wall', [7], {
      sourceImage: 'assets/ver3/slide_07_full.png',
      nodes:[
        {label:'Before / Manual',sub:'กางแบบกระดาษ คีย์ทีละชิ้น และเขียนแบบเอง'},
        {label:'Center Bridge',sub:'Automate Detecting Wall & Assembly Code'},
        {label:'After / Automate',sub:'3D SketchUp ตรวจจับผนัง สร้าง 2D DWG และ Code อัตโนมัติ'}
      ]
    }),
    slide('v3-punching', 'Smart Board Punching', 'Before (Existing Work Flow) vs After (Improved Work Flow)', 'before-after-punching', [8], {
      sourceImage: 'assets/ver3/slide_07_punching.jpg',
      duration: 60,
      nodes: [
        { label: 'Before / Manual', sub: 'Coding Knowledge, Matching Data & Manual CAD DWG' },
        { label: 'Center Bridge', sub: 'Smart Board Punching for Electric System' },
        { label: 'After / Automate', sub: '2D/3D Selecting Part & CAD Punching DWG to CSV Machine' }
      ]
    }),
    slide('v3-database-mgmt', 'Data Base Create / Management', 'Before (Existing Work Flow) vs After (Improved Work Flow)', 'before-after-database', [9], {
      sourceImage: 'assets/ver3/slide_08_database.jpg',
      duration: 60,
      nodes: [
        { label: 'Before / Manual', sub: 'Manual Create Database via Multiple Excel CSV Files' },
        { label: 'Center Bridge', sub: 'Create from Logic to 3D Part & Generate CSV' },
        { label: 'After / Automate', sub: 'Automate Generate Part & Direct Database to System' }
      ]
    }),
    slide('v3-automate-process', 'NEW Automate Process', 'Automate of Interior wall & Partition (STD.)', 'automate-process-full', [10], {
      sourceImage: 'assets/ver3/slide_09_automate.jpg',
      duration: 60,
      nodes: [
        { label: 'IW (Interior Wall)', sub: '6-Step Sequence & #8 One Command Run (2+3+5+6+7)' },
        { label: 'CAD to SketchUp Pipeline', sub: 'Import CAD >>> SketchUp (100% BOM • MRP • DWG)' },
        { label: 'PT (Partition)', sub: 'Standard P-Rule 11 Commands & Auto Detail DWG' }
      ]
    }),
    slide('v3-holeplug-automate', 'NEW Automate Process: Hole Plug & Switch_Hood', 'Automate of Hole Plug & Switch_Hood [Interior Wall / Partition]', 'holeplug-automate-full', [11], {
      sourceImage: 'assets/ver3/slide_10_holeplug.jpg',
      duration: 60,
      nodes: [
        { label: 'Key Objectives', sub: '1. ลด loss จาก Human error  2. ลดเวลาจาก Manual' },
        { label: '7-Step Automation Pipeline', sub: '#1 Setup CAD ➔ #2 Import ➔ #3 Detect Height ➔ #4 Auto Punch' },
        { label: 'Automated Outputs', sub: '#5 2D Rotate DWG ➔ #6 3D Accuracy ➔ #7 Export CAD & File Up' }
      ]
    })
  ];
  const combinedNewWorkflow = [
    slide('v3-new-workflow', 'New Workflow & Auto BOM Deliverables', 'OTF ➔ SketchUp Auto BOM (≤ 2 Min) ➔ 4 Parallel Branches ➔ Factory Production', 'new-workflow-allinone', [14, 15], {
      sourceImage: 'Pictures/automation_summary_deliverables.jpg',
      videoSrc: '',
      duration: 140,
      vdoLayout: 'vector-only',
      narration: 'ผังกระบวนการใหม่แบบครบวงจร นำเข้า OTF สู่ 3D SketchUp รัน Auto BOM และถอดปริมาณอัตโนมัติภายใน 2 นาที พร้อมแยกข้อมูล 4 สายงานคู่ขนาน สรุปผลผลิต 5 รายการส่งตรงถึงโรงงานฝ่ายผลิตครับ',
      footerNote: 'NEW FLOW: OTF ➔ SketchUp Auto BOM (≤ 2 Min) ➔ 1. PartItems • 2. Picking/PO • 3. SB List • 4. 2D/3D DWG ➔ Factory Production',
      nodes: [
        { code: '01', label: 'OTF Input', sub: 'รับแบบบ้าน & ผังแปลนสถาปัตย์ 2D CAD' },
        { code: '02', label: 'Auto BOM & Drawing', sub: 'ขึ้น 3D + ถอดปริมาณอัตโนมัติ (Fix ≤ 2 นาที)' },
        { code: '03', label: '4 Parallel Branches', sub: '1. PartItems • 2. Picking • 3. SB • 4. 2D/3D' },
        { code: '04', label: 'Factory Production', sub: 'ส่งตรงฝ่ายผลิต ประกอบโรงงานแม่นยำ ±1mm' }
      ]
    })
  ];
  const processImprovement = [
    slide('v3-process-improvement', 'EXISTING PROCESS & IMPROVEMENT', '7 days ➔ 1 day · From Floorplan to Customer Delivery', 'process-improvement-full', [12], {
      sourceImage: 'assets/ver3/slide_12_improvement.jpg',
      duration: 60,
      nodes: [
        { label: 'Central Backbone', sub: 'Floorplan ➔ BOM ➔ Data Base ➔ DWG ➔ Production ➔ Customer' },
        { label: 'Existing (Manual)', sub: 'Paper Markup ➔ Web Menu Select (High Error) ➔ Manual DWG & PO' },
        { label: 'Improvement (Automate)', sub: 'Logic Ruby SketchUp ➔ Easy 3D Check ➔ Auto DWG, CSV & PO (1 Day)' }
      ]
    })
  ];
  const ending = [
    slide('v3-results', 'RESULT | Auto BOM System Development', 'End-to-End Value Creation from Design to Production & Installation', 'results-full', [15], {
      sourceImage: 'assets/ver3/slide_13_results.jpg',
      duration: 90,
      metrics:[{value:'7 → 1',label:'วัน / BOM & Drawing',detail:'ลดระยะเวลา [ 7 Days > 1 Day ]'}, {value:'86%',label:'ลดระยะเวลา',detail:'Time Reduction BOM & DWG ประมาณ 86%'}, {value:'1.2M',label:'บาท / ปี',detail:'Cost Reduction: -1,200,000 THB / YEAR'}],
      nodes:[
        { code: '01', label: 'TIME REDUCTION', sub: '7 Days Before 1 Day After · ลดระยะเวลาจัดทำ BOM และ Drawing ประมาณ 86%' },
        { code: '02', label: 'SKILL & KNOWLEDGE STANDARDIZATION', sub: 'เปลี่ยนองค์ความรู้เฉพาะบุคคลเป็น Logic และมาตรฐานในระบบ ลดการพึ่งพาทักษะการจัดทำ BOM ด้วยมือ' },
        { code: '03', label: 'ERROR & LOSS REDUCTION', sub: 'ลดขั้นตอนการทำงานด้วยมือ และเพิ่มความสม่ำเสมอของข้อมูลผ่าน Automation' },
        { code: '04', label: 'AUTOMATED OUTPUT & DATA INTEGRATION', sub: 'เชื่อม 3D Visualization, 2D DWG, Punching, Job Order และ Part Item เป็นกระบวนการเดียวกัน' }
      ]
    }),
    slide('v3-next', 'Next Step', 'ขยาย Automation ให้ครอบคลุมงานออกแบบและการผลิตมากขึ้น', 'next-step-full', [15], {
      sourceImage:'assets/ver3/slide_14_nextstep.jpg',
      duration: 30,
      nodes:[
        { code: '01', label: 'Smart Estimation for Sales', sub: 'ขยายระบบสู่การประเมินราคา เพื่อให้ทีมขายเสนอราคาได้รวดเร็วและตอบโจทย์ลูกค้าทันที' },
        { code: '02', label: 'Design-to-Production Automation', sub: 'เชื่อมโยงข้อมูลตั้งแต่การออกแบบ ➔ BOM ➔ Drawing ➔ Production ลด Design Conflict ตั้งแต่ต้นทาง' },
        { code: '03', label: '6 Key Expansion Modules', sub: 'Interior High Unit, Stair V2, Electrical & Air, Bathroom, Structure V2, Exterior & Balcony' }
      ]
    }),
    slide('v3-closing', 'ปิดการนำเสนอและเข้าสู่ช่วงคำถาม', 'ขอบคุณทีมงานและผู้ฟัง · SCG HEIM Auto BOM Studio', 'closing-qa', [16], {
      sourceImage: 'assets/ver3/slide_16_closing.png',
      duration: 35,
      narration: 'สุดท้ายนี้ขอขอบคุณทีมงานทุกท่านที่ร่วมพัฒนา Integrated Design และ BOM Automation ครับ โครงการนี้เชื่อมความรู้ด้านออกแบบ กฎการทำงาน และข้อมูลการผลิตเข้าด้วยกัน เพื่อช่วยให้กระบวนการทำงานมีความต่อเนื่องมากขึ้น ขอบคุณทุกท่านที่รับฟัง และยินดีตอบคำถามครับ',
      speakerCues: ['ขอบคุณทีมงานและผู้ฟัง', 'ปิดการนำเสนอและเข้าสู่ช่วงคำถาม']
    })
  ];
  DEFAULT_SLIDES.splice(0, DEFAULT_SLIDES.length, ...intro, ...combinedNewWorkflow, ...processImprovement, ...ending);
  DEFAULT_SLIDES.forEach((s,i) => { s.chapter = `${String(i+1).padStart(2,'0')}  /  ${s.title}`; });
  // Total duration: 897 seconds (14:57 minutes / 14.57 นาที) across 16 slides
  const timings = [26, 25, 54, 54, 54, 54, 54, 55, 56, 56, 55, 140, 58, 66, 62, 28];
  const talks = [
    [
      'สวัสดีครับ วันนี้ขอนำเสนอโครงการ Integrated Design และ BOM Automation ครับ แนวคิดหลักคือการเชื่อมโยงงานออกแบบ รายการวัสดุ การผลิต และการติดตั้งเข้าด้วยกัน ผ่านข้อมูลที่สัมพันธ์กันตั้งแต่ต้นทาง โดยเริ่มจากปัญหาของกระบวนการเดิม ไปดูระบบอัตโนมัติ และสรุปผลลัพธ์ครับ',
      ['เปิดประเด็น: เชื่อมข้อมูลตั้งแต่ออกแบบถึงติดตั้ง', 'แนะนำลำดับเรื่อง ปัญหา วิธีพัฒนา และผลลัพธ์'],
      [
        { at: 0.2, text: 'สวัสดีครับ วันนี้ขอนำเสนอโครงการ Integrated Design และ BOM Automation ครับ' },
        { at: 7.5, text: 'แนวคิดหลักคือการเชื่อมโยงงานออกแบบ รายการวัสดุ การผลิต และการติดตั้งเข้าด้วยกัน ผ่านข้อมูลที่สัมพันธ์กันตั้งแต่ต้นทาง' },
        { at: 17.2, text: 'โดยเริ่มจากปัญหาของกระบวนการเดิม ไปดูระบบอัตโนมัติ และสรุปผลลัพธ์ครับ' }
      ]
    ],
    [
      'ขอแนะนำทีมงานผู้พัฒนาโครงการ Integrated Design และ Auto BOM Automation ทั้งสี่ท่านครับ นำโดยคุณกฤษณะ พงษ์พาล Project Leader ร่วมกับทีมพัฒนาระบบ คุณภัทร คุณพีรดล และคุณสุธี ครับ ซึ่งร่วมกันผสานงานออกแบบสามมิติ สู่ระบบ BOM และ Drawing อัตโนมัติครับ',
      ['แนะนำทีมงานผู้พัฒนา 4 ท่าน', 'ผสานงานออกแบบ 3D สู่ระบบ BOM & Drawing อัตโนมัติ'],
      [
        { at: 0.2, text: 'ขอแนะนำทีมงานผู้พัฒนาโครงการ Integrated Design และ Auto BOM Automation ทั้งสี่ท่านครับ' },
        { at: 8.0, text: 'นำโดยคุณกฤษณะ พงษ์พาล Project Leader ร่วมกับทีมพัฒนาระบบ คุณภัทร คุณพีรดล และคุณสุธี ครับ' },
        { at: 16.0, text: 'ซึ่งร่วมกันผสานงานออกแบบสามมิติ สู่ระบบ BOM และ Drawing อัตโนมัติครับ' }
      ]
    ],
    [
      'ที่มาของโครงการเริ่มต้นจากสามประเด็นสำคัญครับ ประเด็นแรกคือ Manpower Skill งานเดิมต้องอาศัยทักษะและความชำนาญเฉพาะบุคคลในการอ่านแบบ รหัสวัสดุ และกฎการออกแบบครับ ประเด็นที่สองคือ Loss Cost และ Rework เมื่อต้องเลือกวัสดุและกรอกรหัสด้วยมือหลายขั้นตอน จึงมีความเสี่ยงที่ข้อมูลจะคลาดเคลื่อนและเกิดงานแก้ไขซ้ำครับ และประเด็นที่สามคือ Reduce Time เราจึงนำ Planning Rule และมาตรฐานการออกแบบมาจัดระบบเป็น Automation เพื่อลดเวลาจัดทำ BOM และ Drawing ให้แม่นยำและรวดเร็วขึ้นครับ',
      ['Manpower Skill: ลดการพึ่งพาทักษะเฉพาะบุคคลด้วย Planning Rule', 'Loss Cost & Rework: ลดข้อผิดพลาดจากการคีย์รหัสซ้ำด้วยมือ', 'Reduce Time: ลดเวลาจัดทำ BOM และ Drawing ด้วย Automation'],
      [
        { at: 0.2, text: 'ที่มาของโครงการเริ่มต้นจากสามประเด็นสำคัญครับ ประเด็นแรกคือ Manpower Skill งานเดิมต้องอาศัยทักษะและความชำนาญเฉพาะบุคคลในการอ่านแบบ รหัสวัสดุ และกฎการออกแบบครับ' },
        { at: 16.5, text: 'ประเด็นที่สองคือ Loss Cost และ Rework เมื่อต้องเลือกวัสดุและกรอกรหัสด้วยมือหลายขั้นตอน จึงมีความเสี่ยงที่ข้อมูลจะคลาดเคลื่อนและเกิดงานแก้ไขซ้ำครับ' },
        { at: 32.0, text: 'และประเด็นที่สามคือ Reduce Time เราจึงนำ Planning Rule และมาตรฐานการออกแบบมาจัดระบบเป็น Automation เพื่อลดเวลาจัดทำ BOM และ Drawing ให้แม่นยำและรวดเร็วขึ้นครับ' }
      ]
    ],
    [
      'มาดูภาพรวมกระบวนการทำงานเดิม Existing Workflow จากซ้ายไปขวาครับ เริ่มตั้งแต่การรับข้อมูล OTF และแบบก่อสร้าง For Construction จากต้นทางครับ จากนั้นผู้ปฏิบัติงานต้องเปิดแบบเพื่อเลือกข้อมูลผ่านระบบ Menu Select และกำหนดรหัสชิ้นส่วนทีละรายการด้วยมือ ก่อนนำไปจัดทำ BOM และเขียนแบบประกอบครับ ข้อมูลเหล่านี้ยังต้องส่งต่อไปยัง Job Order, Picking List, งานจัดซื้อ Purchase และรายการตัดแผ่น Smart Board ซึ่งหากต้นทางเปลี่ยน ต้องไล่แก้ไขด้วยมือทุกขั้นตอนครับ',
      ['ไล่กระบวนการเดิมตั้งแต่ OTF และแบบ For Construction', 'ขั้นตอน Menu Select และกำหนดรหัสด้วยมือทีละรายการ', 'การส่งต่อข้อมูลสู่ Job Order, Picking List, Purchase และ Smart Board'],
      [
        { at: 0.2, text: 'มาดูภาพรวมกระบวนการทำงานเดิม Existing Workflow จากซ้ายไปขวาครับ เริ่มตั้งแต่การรับข้อมูล OTF และแบบก่อสร้าง For Construction จากต้นทางครับ' },
        { at: 16.0, text: 'จากนั้นผู้ปฏิบัติงานต้องเปิดแบบเพื่อเลือกข้อมูลผ่านระบบ Menu Select และกำหนดรหัสชิ้นส่วนทีละรายการด้วยมือ ก่อนนำไปจัดทำ BOM และเขียนแบบประกอบครับ' },
        { at: 32.0, text: 'ข้อมูลเหล่านี้ยังต้องส่งต่อไปยัง Job Order, Picking List, งานจัดซื้อ Purchase และรายการตัดแผ่น Smart Board ซึ่งหากต้นทางเปลี่ยน ต้องไล่แก้ไขด้วยมือทุกขั้นตอนครับ' }
      ]
    ],
    [
      'เจาะลึกขั้นตอนการเลือก BOM บนระบบเว็บแบบเดิม หรือ Existing Menu Select BOM on Web ซึ่งประกอบด้วยสี่ขั้นตอนหลักครับ ขั้นตอนที่หนึ่งและสอง ผู้ปฏิบัติงานต้องถอดรหัสแบบ Manual ทั้งชนิดผนัง Single หรือ Double หน้าต่าง และ Gridline แล้วคีย์เลือกพารามิเตอร์บนหน้าเว็บเพื่อสร้างไฟล์ IM, MPS และ PS ครับ จากนั้นขั้นตอนที่สามและสี่ ต้องนำข้อมูลมาอัปโหลดผ่านไฟล์ Excel เพื่อตรวจสอบความถูกต้องและจัดทำเป็น Final BOM Data ซึ่งใช้เวลานานและเกิดข้อผิดพลาดได้ง่ายครับ',
      ['ขั้นตอนที่ 1–2: ถอดรหัสแบบ Manual และคีย์เลือกผ่าน Web Menu Select', 'การสร้างไฟล์ IM, MPS, PS จากพารามิเตอร์ที่เลือกด้วยมือ', 'ขั้นตอนที่ 3–4: อัปโหลดผ่าน Excel ตรวจสอบและออก Final BOM Data'],
      [
        { at: 0.2, text: 'เจาะลึกขั้นตอนการเลือก BOM บนระบบเว็บแบบเดิม หรือ Existing Menu Select BOM on Web ซึ่งประกอบด้วยสี่ขั้นตอนหลักครับ' },
        { at: 14.0, text: 'ขั้นตอนที่หนึ่งและสอง ผู้ปฏิบัติงานต้องถอดรหัสแบบ Manual ทั้งชนิดผนัง Single หรือ Double หน้าต่าง และ Gridline แล้วคีย์เลือกพารามิเตอร์บนหน้าเว็บเพื่อสร้างไฟล์ IM, MPS และ PS ครับ' },
        { at: 32.5, text: 'จากนั้นขั้นตอนที่สามและสี่ ต้องนำข้อมูลมาอัปโหลดผ่านไฟล์ Excel เพื่อตรวจสอบความถูกต้องและจัดทำเป็น Final BOM Data ซึ่งใช้เวลานานและเกิดข้อผิดพลาดได้ง่ายครับ' }
      ]
    ],
    [
      'เปรียบเทียบการจัดทำข้อมูลชิ้นส่วนสั่งผลิตล่วงหน้า หรือ Long Lead-time Parts ระหว่าง Before กับ After ครับ ฝั่งซ้าย Before กระบวนการเดิมเป็น Manual บนโปรแกรมเว็บ พนักงานต้องกางแบบกระดาษขีดไฮไลท์ตรวจสอบ แล้วคลิกเลือกชิ้นส่วนทีละรายการแบบ Selecting One by One ครับ ส่วนฝั่งขวา After กระบวนการใหม่แบบ Automate นำไฟล์สองมิติ CAD เข้าสู่สามมิติ SketchUp ร่วมกับ Plug-in Ruby ให้ระบบตรวจจับชิ้นส่วนอัตโนมัติและออกรายการ BOM ทันทีครับ',
      ['เปรียบเทียบ Long Lead-time Parts: Before Manual vs After Automate', 'ฝั่งซ้าย Before: ขีดไฮไลท์แบบกระดาษและคลิกเลือกทีละชิ้นบนเว็บ', 'ฝั่งขวา After: 2D CAD สู่ 3D SketchUp + Ruby ตรวจจับและออก BOM ทันที'],
      [
        { at: 0.2, text: 'เปรียบเทียบการจัดทำข้อมูลชิ้นส่วนสั่งผลิตล่วงหน้า หรือ Long Lead-time Parts ระหว่าง Before กับ After ครับ' },
        { at: 13.0, text: 'ฝั่งซ้าย Before กระบวนการเดิมเป็น Manual บนโปรแกรมเว็บ พนักงานต้องกางแบบกระดาษขีดไฮไลท์ตรวจสอบ แล้วคลิกเลือกชิ้นส่วนทีละรายการแบบ Selecting One by One ครับ' },
        { at: 30.5, text: 'ส่วนฝั่งขวา After กระบวนการใหม่แบบ Automate นำไฟล์สองมิติ CAD เข้าสู่สามมิติ SketchUp ร่วมกับ Plug-in Ruby ให้ระบบตรวจจับชิ้นส่วนอัตโนมัติและออกรายการ BOM ทันทีครับ' }
      ]
    ],
    [
      'เปรียบเทียบกระบวนการทำงานหมวดผนังภายใน Interior Wall และ Partition ระหว่าง Before กับ After ครับ ฝั่งซ้าย Before เดิมต้องกางแบบกระดาษตรวจสอบ คีย์เลือกผนังทีละชิ้นบนหน้าเว็บ และต้องเขียนแบบประกอบ Detail DWG ของโครงคร่าวด้วยมือเองทั้งหมดครับ ส่วนฝั่งขวา After ระบบใหม่นำแบบสองมิติ CAD เข้าสู่สามมิติ SketchUp ตรวจจับแนวผนังอัตโนมัติ พร้อมสร้างรหัสประกอบชิ้นส่วนและออกใบแบบประกอบ Detail DWG ให้ทันทีครับ',
      ['เปรียบเทียบ Interior Wall / Partition: Before vs After', 'ฝั่งซ้าย Before: กางแบบกระดาษ คีย์ทีละชิ้น และเขียน Detail DWG เอง', 'ฝั่งขวา After: 3D SketchUp ตรวจจับผนัง สร้างรหัสและ Detail DWG อัตโนมัติ'],
      [
        { at: 0.2, text: 'เปรียบเทียบกระบวนการทำงานหมวดผนังภายใน Interior Wall และ Partition ระหว่าง Before กับ After ครับ' },
        { at: 12.5, text: 'ฝั่งซ้าย Before เดิมต้องกางแบบกระดาษตรวจสอบ คีย์เลือกผนังทีละชิ้นบนหน้าเว็บ และต้องเขียนแบบประกอบ Detail DWG ของโครงคร่าวด้วยมือเองทั้งหมดครับ' },
        { at: 29.5, text: 'ส่วนฝั่งขวา After ระบบใหม่นำแบบสองมิติ CAD เข้าสู่สามมิติ SketchUp ตรวจจับแนวผนังอัตโนมัติ พร้อมสร้างรหัสประกอบชิ้นส่วนและออกใบแบบประกอบ Detail DWG ให้ทันทีครับ' }
      ]
    ],
    [
      'เปรียบเทียบกระบวนการเจาะช่องเปิดแผ่น Smart Board Punching สำหรับงานระบบไฟฟ้า ระหว่าง Before กับ After ครับ ฝั่งซ้าย Before กระบวนการเดิมเป็น Manual ทั้งหมด ต้องอาศัยผู้ที่มีความรู้รหัสวัสดุ เปิดเทียบแบบแปลน จับคู่ข้อมูล และเขียนแบบ CAD กำหนดจุดเจาะรูปลั๊กไฟทีละแผ่นครับ ส่วนฝั่งขวา After ระบบใหม่ทำงานแบบ Automate โดยเลือกชิ้นส่วนจากโมเดลสองมิติและสามมิติ สร้างแบบเจาะแผ่นอัตโนมัติ และส่งออกไฟล์ CSV เข้าเครื่องเจาะ CNC ได้ทันทีครับ',
      ['เปรียบเทียบ Smart Board Punching: Before Manual vs After Automate', 'ฝั่งซ้าย Before: เปิดเทียบแบบ จับคู่รหัส และเขียน CAD เจาะรูด้วยมือ', 'ฝั่งขวา After: เลือกจาก 2D/3D ออกแบบเจาะและส่ง CSV เข้าเครื่อง CNC ทันที'],
      [
        { at: 0.2, text: 'เปรียบเทียบกระบวนการเจาะช่องเปิดแผ่น Smart Board Punching สำหรับงานระบบไฟฟ้า ระหว่าง Before กับ After ครับ' },
        { at: 13.0, text: 'ฝั่งซ้าย Before กระบวนการเดิมเป็น Manual ทั้งหมด ต้องอาศัยผู้ที่มีความรู้รหัสวัสดุ เปิดเทียบแบบแปลน จับคู่ข้อมูล และเขียนแบบ CAD กำหนดจุดเจาะรูปลั๊กไฟทีละแผ่นครับ' },
        { at: 30.5, text: 'ส่วนฝั่งขวา After ระบบใหม่ทำงานแบบ Automate โดยเลือกชิ้นส่วนจากโมเดลสองมิติและสามมิติ สร้างแบบเจาะแผ่นอัตโนมัติ และส่งออกไฟล์ CSV เข้าเครื่องเจาะ CNC ได้ทันทีครับ' }
      ]
    ],
    [
      'เปรียบเทียบการสร้างและจัดการฐานข้อมูล Data Base Create and Management ระหว่าง Before กับ After ครับ ฝั่งซ้าย Before เดิมเป็น Manual CSV Data Base ต้องสร้างและคีย์ตารางรหัสชิ้นส่วนลงในไฟล์ Excel แยกกันหลายชุด เสี่ยงต่อการกรอกรหัสผิดและข้อมูลไม่ตรงกันครับ ส่วนฝั่งขวา After ระบบใหม่ผูก Logic เข้ากับโมเดลสามมิติ เช่น ชุดวงกบประตู L-Shape Door PT แล้วสั่ง Generate ออกมาเป็นฐานข้อมูล CSV ส่งเข้าสู่ระบบส่วนกลางโดยอัตโนมัติครับ',
      ['เปรียบเทียบ Database Management: Before Manual vs After Automate', 'ฝั่งซ้าย Before: คีย์ตารางรหัสชิ้นส่วนลงไฟล์ Excel แยกหลายชุดด้วยมือ', 'ฝั่งขวา After: ผูก Logic สู่โมเดล 3D และ Generate CSV เข้าระบบอัตโนมัติ'],
      [
        { at: 0.2, text: 'เปรียบเทียบการสร้างและจัดการฐานข้อมูล Data Base Create and Management ระหว่าง Before กับ After ครับ' },
        { at: 13.0, text: 'ฝั่งซ้าย Before เดิมเป็น Manual CSV Data Base ต้องสร้างและคีย์ตารางรหัสชิ้นส่วนลงในไฟล์ Excel แยกกันหลายชุด เสี่ยงต่อการกรอกรหัสผิดและข้อมูลไม่ตรงกันครับ' },
        { at: 30.5, text: 'ส่วนฝั่งขวา After ระบบใหม่ผูก Logic เข้ากับโมเดลสามมิติ เช่น ชุดวงกบประตู L-Shape Door PT แล้วสั่ง Generate ออกมาเป็นฐานข้อมูล CSV ส่งเข้าสู่ระบบส่วนกลางโดยอัตโนมัติครับ' }
      ]
    ],
    [
      'เข้าสู่รายละเอียดกระบวนการทำงานอัตโนมัติใหม่ NEW Automate Process สำหรับผนังภายใน IW และผนังกั้นห้อง PT ครับ ระบบเชื่อมการนำเข้าไฟล์ CAD สู่ SketchUp โดยฝั่งซ้าย IW มีปุ่มคำสั่งที่แปด One Command รวบห้าขั้นตอนไว้ในคลิกเดียว สร้างทั้ง Gridline โครงคร่าว และแผ่น Smart Board ครับ ส่วนฝั่งขวา PT ขับเคลื่อนด้วยมาตรฐาน P-Rule สิบเอ็ดคำสั่ง สร้างโมเดลสามมิติและออกใบแบบสองมิติครบหนึ่งร้อยเปอร์เซ็นต์ทั้ง BOM, MRP และ DWG ใช้งานจริงตั้งแต่เดือนสิงหาคม 2024 ครับ',
      ['ภาพรวม NEW Automate Process: ผนังภายใน (IW) และผนังกั้นห้อง (PT)', 'ฝั่งซ้าย IW: คำสั่ง #8 One Command รวบ 5 ขั้นตอนในคลิกเดียว', 'ฝั่งขวา PT: มาตรฐาน P-Rule 11 คำสั่ง ออกครบ 100% BOM, MRP, DWG (AUG 2024)'],
      [
        { at: 0.2, text: 'เข้าสู่รายละเอียดกระบวนการทำงานอัตโนมัติใหม่ NEW Automate Process สำหรับผนังภายใน IW และผนังกั้นห้อง PT ครับ' },
        { at: 13.5, text: 'ระบบเชื่อมการนำเข้าไฟล์ CAD สู่ SketchUp โดยฝั่งซ้าย IW มีปุ่มคำสั่งที่แปด One Command รวบห้าขั้นตอนไว้ในคลิกเดียว สร้างทั้ง Gridline โครงคร่าว และแผ่น Smart Board ครับ' },
        { at: 32.0, text: 'ส่วนฝั่งขวา PT ขับเคลื่อนด้วยมาตรฐาน P-Rule สิบเอ็ดคำสั่ง สร้างโมเดลสามมิติและออกใบแบบสองมิติครบหนึ่งร้อยเปอร์เซ็นต์ทั้ง BOM, MRP และ DWG ใช้งานจริงตั้งแต่เดือนสิงหาคม 2024 ครับ' }
      ]
    ],
    [
      'กระบวนการอัตโนมัติใหม่สำหรับการเจาะช่องปลั๊กไฟ สวิตช์ และช่องดูดควัน Hole Plug and Switch Hood บนผนังภายในและ Partition ครับ เป้าหมายหลักคือลดความสูญเสียจาก Human Error และลดเวลาทำงาน Manual ผ่านเจ็ดขั้นตอนอัตโนมัติ ตั้งแต่จัดเลเยอร์ CAD นำเข้า SketchUp ตรวจจับความสูง และเจาะรูแผ่นอัตโนมัติครับ จากนั้นขั้นตอนที่ห้าถึงเจ็ด ระบบจะหมุนสร้างแบบสองมิติ ตรวจสอบความแม่นยำด้วยโมเดลสามมิติ และส่งออกไฟล์ CAD พร้อมอัปโหลดฐานข้อมูลเข้าสู่ระบบการผลิตทันทีครับ',
      ['เป้าหมายหลัก: ลด Loss จาก Human Error และลดเวลา Manual', 'ขั้นตอนที่ #1–#4: จัดเลเยอร์ CAD ➔ นำเข้า SketchUp ➔ ตรวจความสูง ➔ เจาะรูอัตโนมัติ', 'ขั้นตอนที่ #5–#7: สร้างแบบ 2D Auto Rotate ➔ เช็กความแม่นยำ 3D ➔ ส่งออกไฟล์สู่โรงงาน'],
      [
        { at: 0.2, text: 'กระบวนการอัตโนมัติใหม่สำหรับการเจาะช่องปลั๊กไฟ สวิตช์ และช่องดูดควัน Hole Plug and Switch Hood บนผนังภายในและ Partition ครับ' },
        { at: 14.0, text: 'เป้าหมายหลักคือลดความสูญเสียจาก Human Error และลดเวลาทำงาน Manual ผ่านเจ็ดขั้นตอนอัตโนมัติ ตั้งแต่จัดเลเยอร์ CAD นำเข้า SketchUp ตรวจจับความสูง และเจาะรูแผ่นอัตโนมัติครับ' },
        { at: 32.5, text: 'จากนั้นขั้นตอนที่ห้าถึงเจ็ด ระบบจะหมุนสร้างแบบสองมิติ ตรวจสอบความแม่นยำด้วยโมเดลสามมิติ และส่งออกไฟล์ CAD พร้อมอัปโหลดฐานข้อมูลเข้าสู่ระบบการผลิตทันทีครับ' }
      ]
    ],
    [
      'ผังกระบวนการใหม่ นำเข้าแบบแปลน OTF สู่สามมิติ SketchUp แยกข้อมูลสี่สายงานคู่ขนาน ส่งตรงถึงฝ่ายผลิตครับ เข้าสู่ขั้นตอนที่สอง การทำงานต้นน้ำจากแปลนสถาปัตย์และ P-Rule ครับ ระบบนำเข้าไฟล์สองมิติ CAD เข้าสู่โปรแกรมสามมิติ SketchUp ร่วมกับปลั๊กอิน Ruby เพื่อตรวจสอบเงื่อนไขและขึ้นโมเดลอัตโนมัติครับ สังเกตการทำงานบนหน้าจอครับ ระบบใช้ Logic และ Planning Rule ตรวจจับตำแหน่งผนังภายใน โครงคร่าว แผ่นสมาร์ทบอร์ด ประตู หน้าต่าง และจุดเจาะระบบไฟฟ้าอย่างแม่นยำครับ พร้อมกันนี้ ระบบจะกำหนดรหัสชิ้นส่วน Assembly Code และถอดปริมาณวัสดุ BOQ กับรายการ SKU ออกมาโดยอัตโนมัติ โดยใช้เวลาประมวลผลรวมไม่เกินสองนาทีครับ ข้อมูลที่ประมวลผลเสร็จแล้ว จะถูกแยกออกเป็นสี่สายงานคู่ขนานทันที ทั้งงานสั่งซื้อ PartItems งานเบิกจ่าย Picking List งานเจาะแผ่นสมาร์ทบอร์ด และแบบประกอบสองมิติและสามมิติครับ สรุปผลผลิตหลักทั้งห้ารายการ ได้แก่ โมเดลสามมิติ แบบสองมิติ PartItems, Job Order และ SB List ส่งตรงถึงโรงงานครับ',
      ['ช่วงที่ 1 (0:00–0:10): ผังภาพรวม New Workflow 4 สายงานคู่ขนาน', 'ช่วงที่ 2 (0:10–2:10): สาธิตต้นน้ำ แปลนสถาปัตย์ & P-Rule บน 3D SketchUp (2 นาที)', 'ช่วงที่ 3 (2:10–2:20): สรุปผลผลิต 5 Deliverables ส่งตรงถึงโรงงานฝ่ายผลิต'],
      [
        { at: 0.2, text: 'ผังกระบวนการใหม่ นำเข้าแบบแปลน OTF สู่สามมิติ SketchUp แยกข้อมูลสี่สายงานคู่ขนาน ส่งตรงถึงฝ่ายผลิตครับ' },
        { at: 10.3, text: 'เข้าสู่ขั้นตอนที่สอง การทำงานต้นน้ำจากแปลนสถาปัตย์และ P-Rule ครับ ระบบนำเข้าไฟล์สองมิติ CAD เข้าสู่โปรแกรมสามมิติ SketchUp ร่วมกับปลั๊กอิน Ruby เพื่อตรวจสอบเงื่อนไขและขึ้นโมเดลอัตโนมัติครับ' },
        { at: 36.0, text: 'สังเกตการทำงานบนหน้าจอครับ ระบบใช้ Logic และ Planning Rule ตรวจจับตำแหน่งผนังภายใน โครงคร่าว แผ่นสมาร์ทบอร์ด ประตู หน้าต่าง และจุดเจาะระบบไฟฟ้าอย่างแม่นยำครับ' },
        { at: 66.0, text: 'พร้อมกันนี้ ระบบจะกำหนดรหัสชิ้นส่วน Assembly Code และถอดปริมาณวัสดุ BOQ กับรายการ SKU ออกมาโดยอัตโนมัติ โดยใช้เวลาประมวลผลรวมไม่เกินสองนาทีครับ' },
        { at: 96.0, text: 'ข้อมูลที่ประมวลผลเสร็จแล้ว จะถูกแยกออกเป็นสี่สายงานคู่ขนานทันที ทั้งงานสั่งซื้อ PartItems งานเบิกจ่าย Picking List งานเจาะแผ่นสมาร์ทบอร์ด และแบบประกอบสองมิติและสามมิติครับ' },
        { at: 130.3, text: 'สรุปผลผลิตหลักทั้งห้ารายการ ได้แก่ โมเดลสามมิติ แบบสองมิติ PartItems, Job Order และ SB List ส่งตรงถึงโรงงานครับ' }
      ]
    ],
    [
      'ภาพรวมเปรียบเทียบกระบวนการเดิมและการปรับปรุงใหม่ Existing Process and Improvement ตลอดทั้งสายงาน ตั้งแต่รับแบบแปลนจากทีมขายจนส่งมอบถึงลูกค้าครับ ฝั่งซ้ายคือกระบวนการเดิมแบบ Manual ต้องขีดแบบกระดาษ เลือกเมนูบนเว็บที่มีโอกาสเกิด Human Error สูง และเขียนแบบประกอบกับใบสั่งซื้อด้วยมือ ใช้เวลารวมถึงเจ็ดวันครับ ส่วนฝั่งขวาคือการปรับปรุงด้วย Logic Ruby บน SketchUp สร้างชิ้นส่วนและฐานข้อมูลอัตโนมัติ ตรวจสอบผ่านโมเดลสามมิติ ออกแบบประกอบและใบสั่งซื้อ PO ทันที ลดเวลาจากเจ็ดวันเหลือเพียงหนึ่งวันครับ',
      ['เปรียบเทียบภาพรวมทั้งสายงาน: ลดเวลาจาก 7 Days เหลือ 1 Day', 'ฝั่งซ้าย Existing (Manual): ขีดแบบกระดาษ เลือกเมนูบนเว็บ เขียน DWG และเปิด PO เอง', 'ฝั่งขวา Improvement (Automate): Logic Ruby SketchUp เช็ก 3D ออก DWG, CSV และ PO อัตโนมัติ'],
      [
        { at: 0.2, text: 'ภาพรวมเปรียบเทียบกระบวนการเดิมและการปรับปรุงใหม่ Existing Process and Improvement ตลอดทั้งสายงาน ตั้งแต่รับแบบแปลนจากทีมขายจนส่งมอบถึงลูกค้าครับ' },
        { at: 15.5, text: 'ฝั่งซ้ายคือกระบวนการเดิมแบบ Manual ต้องขีดแบบกระดาษ เลือกเมนูบนเว็บที่มีโอกาสเกิด Human Error สูง และเขียนแบบประกอบกับใบสั่งซื้อด้วยมือ ใช้เวลารวมถึงเจ็ดวันครับ' },
        { at: 33.5, text: 'ส่วนฝั่งขวาคือการปรับปรุงด้วย Logic Ruby บน SketchUp สร้างชิ้นส่วนและฐานข้อมูลอัตโนมัติ ตรวจสอบผ่านโมเดลสามมิติ ออกแบบประกอบและใบสั่งซื้อ PO ทันที ลดเวลาจากเจ็ดวันเหลือเพียงหนึ่งวันครับ' }
      ]
    ],
    [
      'สรุปผลลัพธ์การพัฒนาระบบ Auto BOM System Development ที่สร้างคุณค่าแบบ End-to-End ตั้งแต่งานออกแบบไปจนถึงการผลิตและติดตั้งครับ ด้านที่หนึ่ง Time Reduction ลดระยะเวลาจัดทำ BOM และ Drawing จากเจ็ดวัน เหลือเพียงหนึ่งวัน หรือลดลงถึงแปดสิบหกเปอร์เซ็นต์ และด้านที่สอง เปลี่ยนทักษะเฉพาะบุคคลให้เป็นมาตรฐาน Logic ในระบบครับ ด้านที่สาม ลดความผิดพลาดและงานแก้ไขจากขั้นตอน Manual และด้านที่สี่ เชื่อมโยงผลผลิตทั้งห้ารายการเข้าด้วยกันอย่างสมบูรณ์ ช่วยลดต้นทุนได้ถึงหนึ่งล้านสองแสนบาทต่อปีครับ',
      ['01 Time Reduction: ลดเวลาจัดทำ BOM & DWG จาก 7 วัน เหลือ 1 วัน (-86%)', '02–03 Standardization & Error Reduction: เปลี่ยนทักษะคนเป็น Logic ลดงานแก้', '04 Data Integration & Cost Saving: เชื่อม 5 ผลผลิตหลัก ลดต้นทุน 1,200,000 บาท/ปี'],
      [
        { at: 0.2, text: 'สรุปผลลัพธ์การพัฒนาระบบ Auto BOM System Development ที่สร้างคุณค่าแบบ End-to-End ตั้งแต่งานออกแบบไปจนถึงการผลิตและติดตั้งครับ' },
        { at: 15.0, text: 'ด้านที่หนึ่ง Time Reduction ลดระยะเวลาจัดทำ BOM และ Drawing จากเจ็ดวัน เหลือเพียงหนึ่งวัน หรือลดลงถึงแปดสิบหกเปอร์เซ็นต์ และด้านที่สอง เปลี่ยนทักษะเฉพาะบุคคลให้เป็นมาตรฐาน Logic ในระบบครับ' },
        { at: 36.0, text: 'ด้านที่สาม ลดความผิดพลาดและงานแก้ไขจากขั้นตอน Manual และด้านที่สี่ เชื่อมโยงผลผลิตทั้งห้ารายการเข้าด้วยกันอย่างสมบูรณ์ ช่วยลดต้นทุนได้ถึงหนึ่งล้านสองแสนบาทต่อปีครับ' }
      ]
    ],
    [
      'สำหรับแผนการพัฒนาต่อยอดในระยะถัดไป หรือ Next Step เรามุ่งขยายระบบอัตโนมัติในสองยุทธศาสตร์สำคัญครับ ยุทธศาสตร์ที่หนึ่ง Smart Estimation for Sales ขยายระบบสู่การประเมินราคาขาย เพื่อให้ทีมขายสามารถถอดราคาจากแบบแปลนได้อย่างรวดเร็ว แม่นยำ และตอบโจทย์ลูกค้าได้ทันทีครับ และยุทธศาสตร์ที่สอง Design-to-Production Automation ขยายผลครอบคลุมหกหมวดงานสำคัญ ได้แก่ ตู้สูงภายใน บันได ระบบไฟฟ้าและแอร์ ห้องน้ำ โครงสร้าง และงานภายนอก เพื่อเชื่อมข้อมูลสู่โรงงานครบวงจรครับ',
      ['01 Smart Estimation for Sales: ประเมินราคาขายรวดเร็วและแม่นยำทันที', '02 Design-to-Production Automation: เชื่อมข้อมูลออกแบบ ➔ BOM ➔ โรงงาน ลด Design Conflict', 'ขยายผลครอบคลุม 6 หมวดงาน: Interior High Unit, Stair, Electrical & Air, Bathroom, Structure, Exterior'],
      [
        { at: 0.2, text: 'สำหรับแผนการพัฒนาต่อยอดในระยะถัดไป หรือ Next Step เรามุ่งขยายระบบอัตโนมัติในสองยุทธศาสตร์สำคัญครับ' },
        { at: 13.0, text: 'ยุทธศาสตร์ที่หนึ่ง Smart Estimation for Sales ขยายระบบสู่การประเมินราคาขาย เพื่อให้ทีมขายสามารถถอดราคาจากแบบแปลนได้อย่างรวดเร็ว แม่นยำ และตอบโจทย์ลูกค้าได้ทันทีครับ' },
        { at: 32.0, text: 'และยุทธศาสตร์ที่สอง Design-to-Production Automation ขยายผลครอบคลุมหกหมวดงานสำคัญ ได้แก่ ตู้สูงภายใน บันได ระบบไฟฟ้าและแอร์ ห้องน้ำ โครงสร้าง และงานภายนอก เพื่อเชื่อมข้อมูลสู่โรงงานครบวงจรครับ' }
      ]
    ],
    [
      'สุดท้ายนี้ ขอขอบคุณทีมงานทุกท่านที่ร่วมกันพัฒนาโครงการ Integrated Design และ BOM Automation จนสำเร็จลุล่วงครับ ขอขอบคุณทุกท่านที่รับฟังการนำเสนอ และยินดีรับฟังข้อเสนอแนะรวมถึงตอบคำถามครับ ขอบคุณครับ',
      ['ขอบคุณทีมงานผู้พัฒนาและผู้รับฟังทุกท่าน', 'ปิดการนำเสนอและเข้าสู่ช่วงถาม-ตอบ (Q&A)'],
      [
        { at: 0.2, text: 'สุดท้ายนี้ ขอขอบคุณทีมงานทุกท่านที่ร่วมกันพัฒนาโครงการ Integrated Design และ BOM Automation จนสำเร็จลุล่วงครับ' },
        { at: 12.0, text: 'ขอขอบคุณทุกท่านที่รับฟังการนำเสนอ และยินดีรับฟังข้อเสนอแนะรวมถึงตอบคำถามครับ ขอบคุณครับ' }
      ]
    ]
  ];
  DEFAULT_SLIDES.forEach((s,i)=>{
    s.duration = timings[i];
    s.narration = talks[i][0];
    s.speakerCues = talks[i][1];
    s.timedNarration = talks[i][2];
  });
})();

import React, { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Upload, Users, Grid3x3, Search, Trash2, Download, UserPlus, X, RotateCcw, Tag, Plus, Printer, Save, FolderOpen } from "lucide-react";

// ============================================================
// 좌석 정의
// 각 행의 left/center를 "통로 기준"으로 정렬할 수 있도록
// 각 좌석에 col 인덱스를 부여한다 (절대 위치).
// center 블록은 가운데 통로 오른쪽부터 시작 → col 양수
// left 블록은 가운데 통로 왼쪽 → col 음수 (오른쪽 끝이 -1)
// ============================================================

function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

// 좌석 정의:
//   left: 통로 왼쪽 좌석 번호 배열
//   right: 통로 오른쪽 좌석. 숫자는 실제 좌석, { blocked: N }은 N개의 사용불가 자리
// 예: M행 right = [{blocked:4}, ...range(14,21)]
const B2_ROWS_RAW = [
  { row: "A", left: range(1, 10),  right: range(11, 20) },
  { row: "C", left: range(1, 11),  right: range(12, 22) },
  { row: "D", left: range(1, 10),  right: range(11, 20) },
  { row: "E", left: range(1, 11),  right: range(12, 22) },
  { row: "F", left: range(1, 10),  right: range(11, 20) },
  { row: "G", left: range(1, 11),  right: range(12, 22) },
  { row: "H", left: range(1, 10),  right: range(11, 20) },
  { row: "I", left: range(1, 11),  right: range(12, 22) },
  { row: "J", left: range(1, 9),   right: range(11, 18) },
  { row: "K", left: range(1, 11),  right: range(12, 22) },
  { row: "L", left: range(1, 11),  right: range(12, 22) },
  { row: "M", left: range(1, 12),  right: [{ blocked: 4 }, ...range(14, 21)] },
  { row: "N", left: range(1, 11),  right: [{ blocked: 4 }, ...range(13, 19)] },
  { row: "U", left: range(1, 4),   right: range(5, 8) },
];

const B1_ROWS_RAW = [
  { row: "O", left: range(1, 9),   right: [{ blocked: 1 }, ...range(11, 18)] },
  { row: "P", left: range(1, 9),   right: range(10, 18) },
  { row: "Q", left: range(1, 9),   right: range(10, 18) },
  { row: "R", left: range(1, 11),  right: range(12, 22) },
  { row: "S", left: range(1, 12),  right: range(13, 24) },
  { row: "T", left: range(1, 14),  right: range(15, 29) },
];

// 통로 기준 col 인덱스 부여
// left 좌석: col = -leftCount, ..., -1 (col=-1이 통로 바로 왼쪽)
// right 좌석: col = 1, 2, ... (blocked는 col 위치는 차지하되 좌석은 아님)
function buildRow(raw) {
  const seats = [];
  const blocked = []; // { col } 사용불가 자리
  const leftLen = raw.left.length;
  raw.left.forEach((num, i) => {
    seats.push({ row: raw.row, num, col: -(leftLen - i) });
  });
  let rightCol = 1;
  raw.right.forEach(item => {
    if (typeof item === "number") {
      seats.push({ row: raw.row, num: item, col: rightCol });
      rightCol += 1;
    } else if (item && typeof item === "object" && item.blocked) {
      for (let i = 0; i < item.blocked; i++) {
        blocked.push({ col: rightCol });
        rightCol += 1;
      }
    }
  });
  return { row: raw.row, seats, blocked };
}

const B2_ROWS = B2_ROWS_RAW.map(buildRow);
const B1_ROWS = B1_ROWS_RAW.map(buildRow);

const ALL_ROWS = [...B2_ROWS, ...B1_ROWS];
const MIN_COL = Math.min(...ALL_ROWS.flatMap(r => r.seats.map(s => s.col)));
const MAX_COL = Math.max(
  ...ALL_ROWS.flatMap(r => [
    ...r.seats.map(s => s.col),
    ...r.blocked.map(b => b.col),
  ])
);

// 좌석 ID는 단순히 "행+번호" (예: A2, M11)
const seatId = (row, num) => `${row}${num}`;

const ALL_SEAT_IDS = ALL_ROWS.flatMap(r => r.seats.map(s => seatId(s.row, s.num)));

// ============================================================
// 카테고리 기본값 + 색상 팔레트
// ============================================================
const DEFAULT_COLOR = {
  name: "기본",
  bg: "#dbeafe",
  border: "#93c5fd",
  text: "#1e3a8a",
  fill: "#3b82f6",
  fillBorder: "#1d4ed8",
};

const COLOR_PALETTE = [
  { name: "주황", bg: "#fed7aa", border: "#fb923c", text: "#7c2d12", fill: "#f97316", fillBorder: "#9a3412" },
  { name: "빨강", bg: "#fecaca", border: "#f87171", text: "#7f1d1d", fill: "#ef4444", fillBorder: "#991b1b" },
  { name: "분홍", bg: "#fbcfe8", border: "#f472b6", text: "#831843", fill: "#ec4899", fillBorder: "#9d174d" },
  { name: "보라", bg: "#e9d5ff", border: "#c084fc", text: "#581c87", fill: "#a855f7", fillBorder: "#6b21a8" },
  { name: "파랑", bg: "#bfdbfe", border: "#60a5fa", text: "#1e3a8a", fill: "#3b82f6", fillBorder: "#1e40af" },
  { name: "하늘", bg: "#bae6fd", border: "#38bdf8", text: "#0c4a6e", fill: "#0ea5e9", fillBorder: "#075985" },
  { name: "청록", bg: "#a5f3fc", border: "#22d3ee", text: "#164e63", fill: "#06b6d4", fillBorder: "#155e75" },
  { name: "초록", bg: "#bbf7d0", border: "#4ade80", text: "#14532d", fill: "#22c55e", fillBorder: "#166534" },
  { name: "라임", bg: "#d9f99d", border: "#a3e635", text: "#365314", fill: "#84cc16", fillBorder: "#3f6212" },
  { name: "노랑", bg: "#fef08a", border: "#facc15", text: "#713f12", fill: "#eab308", fillBorder: "#854d0e" },
  { name: "회색", bg: "#e2e8f0", border: "#94a3b8", text: "#1e293b", fill: "#64748b", fillBorder: "#334155" },
  { name: "갈색", bg: "#e7d3c1", border: "#a78471", text: "#3e2723", fill: "#78544a", fillBorder: "#3e2723" },
];

// ============================================================
const STORAGE_KEY = "cts_seating_v1";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function CTSSeatingApp() {
  const [people, setPeople] = useState(() => {
    const saved = loadFromStorage();
    return saved?.people || [];
  });
  const [categories, setCategories] = useState(() => {
    const saved = loadFromStorage();
    return saved?.categories || [];
  });
  const [view, setView] = useState("seats");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [draggingPerson, setDraggingPerson] = useState(null);
  const [highlightedSeat, setHighlightedSeat] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [detailPerson, setDetailPerson] = useState(null);
  const [seatPickerSeatId, setSeatPickerSeatId] = useState(null); // 빈좌석 클릭 시 인원선택 모달
  const [savedToast, setSavedToast] = useState(false);
  // 커스텀 확인 모달 state
  const [confirmState, setConfirmState] = useState(null); // { title, message, onConfirm, danger }
  const presetInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const askConfirm = (title, message, onConfirm, danger = false) => {
    setConfirmState({ title, message, onConfirm, danger });
  };

  // 자동 저장 (people, categories 변경 시)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ people, categories }));
    } catch (err) {
      // localStorage 사용 불가 환경 (시크릿 모드, iframe 제약 등)
      console.warn("자동 저장 실패:", err);
    }
  }, [people, categories]);

  const seatMap = useMemo(() => {
    const m = {};
    people.forEach(p => { if (p.seatId) m[p.seatId] = p; });
    return m;
  }, [people]);

  const unassignedPeople = useMemo(() => people.filter(p => !p.seatId), [people]);
  const assignedCount = people.length - unassignedPeople.length;

  // detailPerson을 항상 최신 people로부터 찾음 (state 동기화)
  const liveDetailPerson = useMemo(() => {
    if (!detailPerson) return null;
    return people.find(p => p.id === detailPerson.id) || null;
  }, [detailPerson, people]);

  const getCategory = (catId) => categories.find(c => c.id === catId);

  const getPersonColor = (p) => {
    if (p.categoryId) {
      const c = getCategory(p.categoryId);
      if (c) return c.color;
    }
    return DEFAULT_COLOR;
  };

  // ====== 엑셀 업로드 ======
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const newPeople = [];
      let startIdx = 0;
      if (rows.length > 0) {
        const first = String(rows[0][0] || "").trim();
        if (first === "이름" || first.toLowerCase() === "name") startIdx = 1;
      }
      for (let i = startIdx; i < rows.length; i++) {
        const name = String(rows[i][0] || "").trim();
        const position = String(rows[i][1] || "").trim();
        const aff = String(rows[i][2] || "").trim();
        if (!name) continue;
        newPeople.push({
          id: `p_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
          name, position, affiliation: aff, seatId: null, categoryId: null,
        });
      }
      setPeople(prev => [...prev, ...newPeople]);
      e.target.value = "";
    } catch (err) {
      alert("엑셀 파일 오류: " + err.message);
    }
  };

  const handleExport = () => {
    const data = [["성명", "직위", "소속", "카테고리", "좌석"]];
    people.forEach(p => {
      const cat = p.categoryId ? getCategory(p.categoryId)?.name || "" : "";
      data.push([p.name, p.position || "", p.affiliation, cat, p.seatId || ""]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "좌석배치");
    XLSX.writeFile(wb, "CTS_좌석배치.xlsx");
  };

  const addPerson = (name, position, affiliation) => {
    if (!name.trim()) return;
    setPeople(prev => [...prev, {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(), position: (position || "").trim(), affiliation: affiliation.trim(),
      seatId: null, categoryId: null,
    }]);
  };

  const removePerson = (id) => {
    setPeople(prev => prev.filter(p => p.id !== id));
    if (selectedPerson?.id === id) setSelectedPerson(null);
    if (detailPerson?.id === id) setDetailPerson(null);
  };

  const unassignSeat = (id) => {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, seatId: null } : p));
  };

  const setPersonCategory = (personId, categoryId) => {
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, categoryId } : p));
  };

  const resetAll = () => {
    askConfirm(
      "배치 초기화",
      "모든 좌석 배치를 초기화하시겠습니까? (인원 명단은 유지됩니다)",
      () => setPeople(prev => prev.map(p => ({ ...p, seatId: null }))),
      true
    );
  };

  // 프리셋 파일로 저장 (JSON 다운로드)
  const handleSavePreset = () => {
    const data = {
      version: 1,
      savedAt: new Date().toISOString(),
      people,
      categories,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    a.download = `CTS_좌석프리셋_${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  // 프리셋 파일 불러오기
  const handleLoadPreset = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.people || !Array.isArray(data.people)) {
        throw new Error("올바른 프리셋 파일이 아닙니다");
      }
      e.target.value = "";
      askConfirm(
        "프리셋 불러오기",
        `프리셋을 불러오면 현재 데이터가 모두 교체됩니다. (인원 ${data.people.length}명, 카테고리 ${(data.categories || []).length}개) 계속하시겠습니까?`,
        () => {
          setPeople(data.people);
          setCategories(data.categories || []);
        }
      );
    } catch (err) {
      alert("프리셋 파일을 불러올 수 없습니다: " + err.message);
      e.target.value = "";
    }
  };

  // 전체 데이터 초기화 (인원·카테고리·배치 모두)
  const handleClearAll = () => {
    askConfirm(
      "전체 데이터 삭제",
      "모든 데이터(인원, 카테고리, 배치)를 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      () => {
        setPeople([]);
        setCategories([]);
      },
      true
    );
  };

  // ====== 카테고리 관리 ======
  const addCategory = (name, colorIndex) => {
    if (!name.trim()) return;
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setCategories(prev => [...prev, {
      id, name: name.trim(), color: COLOR_PALETTE[colorIndex % COLOR_PALETTE.length],
    }]);
  };

  const removeCategory = (id) => {
    askConfirm(
      "카테고리 삭제",
      "카테고리를 삭제하시겠습니까? 이 카테고리의 인원은 기본 색으로 돌아갑니다.",
      () => {
        setCategories(prev => prev.filter(c => c.id !== id));
        setPeople(prev => prev.map(p => p.categoryId === id ? { ...p, categoryId: null } : p));
      },
      true
    );
  };

  // ====== 드래그앤드롭 ======
  const handleDragStart = (person) => (e) => {
    setDraggingPerson(person);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", person.id);
  };

  const handleDragEnd = () => {
    setDraggingPerson(null);
    setHighlightedSeat(null);
  };

  const handleSeatDragOver = (sid) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setHighlightedSeat(sid);
  };

  const handleSeatDrop = (sid) => (e) => {
    e.preventDefault();
    if (!draggingPerson) return;
    setPeople(prev => {
      const existing = prev.find(p => p.seatId === sid);
      const draggingOldSeat = draggingPerson.seatId;
      return prev.map(p => {
        if (p.id === draggingPerson.id) return { ...p, seatId: sid };
        if (existing && p.id === existing.id) return { ...p, seatId: draggingOldSeat };
        return p;
      });
    });
    setDraggingPerson(null);
    setHighlightedSeat(null);
  };

  const handleSeatClick = (sid) => {
    const occupant = seatMap[sid];
    if (occupant) {
      // 점유된 좌석 → 상세 정보
      setDetailPerson(occupant);
      return;
    }
    // 빈 좌석
    if (selectedPerson && !selectedPerson.seatId) {
      // 사이드바에서 선택한 사람이 있으면 바로 배치
      setPeople(prev => prev.map(p => p.id === selectedPerson.id ? { ...p, seatId: sid } : p));
      setSelectedPerson(null);
    } else {
      // 인원 선택 모달 띄우기
      setSeatPickerSeatId(sid);
    }
  };

  // 인원 선택 모달에서 사람 선택 시 좌석 배치
  const assignPersonToSeat = (personId, sid) => {
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, seatId: sid } : p));
    setSeatPickerSeatId(null);
  };

  const filteredPeople = useMemo(() => {
    if (!searchTerm.trim()) return people;
    const t = searchTerm.toLowerCase();
    return people.filter(p =>
      p.name.toLowerCase().includes(t) ||
      (p.affiliation || "").toLowerCase().includes(t) ||
      (p.position || "").toLowerCase().includes(t)
    );
  }, [people, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        .print-only { display: none; }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-area { padding: 0 !important; max-width: none !important; }
          .print-seat-card {
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .seat-grid-wrapper {
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .seat-grid-inner {
            transform: scale(0.62);
            transform-origin: top left;
            width: 162%;
          }
          .print-stage {
            background: #1e293b !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-4 sm:gap-6 overflow-x-auto">
          {/* 로고+타이틀 */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <img
              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAAqU0lEQVR42u29e7Btd1Xn+xnj95tzrrX26zxzTsLJA/JAIgEBW1saRaQFbbUvNhYXWwts2ytdl6ax6vYtta/XKru9Wtp1vY1tcfvim7Zo0BKwFZGHgLyE8A6BJJyQEPLOeZ/9WGvN+fuNcf/4zbX2PocIJ7gTkvT6Va2cnbP32WvO+Ru/8fh+v2MscXdnsf6HXbp4BAsDWKyFASzWwgAWa2EAi7UwgMVaGMBiLQxgsRYGsFgLA1ishQEs1sIAFmthAIu1MIDFWhjAYi0MYLEWBrBYj68VF4/g613evx7bZ2lhAF/3koUHWKzHvhEscoBFDrBYX3cK8DhwBgsP8FDyvf7l7tsGsPPrhQd4vId86w+7A9b/nfSnPzwm3cDCAzxkb2C4WdlrcZwWyAsP8D+OF1BEMtPN0ziJZjTAPSJSPSY9wMIALmBlM1Ra5NQnyPfeyPrGUSbdXdTViPrJL0DjN0G1StscBozahpgERFrEFSSWPOFRaB+y6A38Wi7fMcDHRzn7kV9k6fQtpMEWod7EPbKRLmYweAay52qqb/lxRFaIucJEUJ0geQDh0RtpFznA1zQAQRFyvpfETVRLdzEcJDQNGMiQpeoUafpBNs5+BM1T1Aa4K6JTcAW0Lx58YQCP2RrQIFYDogiiGbotKhGYtgx8zFJ9isqPIpv3EQREDbxFRHAtKaIvPMBjNenr/6wuJsiVkA4iOsRTWxLCPCB2EZncQ3f2FhAQUVQGQMDk/F+0MIDHmAEIpkDYQ718BV0akV2gknKuXRFpaCyxdezj4KdxBKzBXclMgITao9MNLAzgaweAvsp3pA4k6cghk8VBBNcWmDAIQ6qzt2DtHeWw55JAOgnBHrUxYGEAFxQFHEGReliSOfFtty4GnlEfYpN76NoTc8sp9VVAiDv+zQIHeIxtvhEAGIAcQNMIYYyQwQXJFXgNHglsgU0LVyCOuINXBQuwCWgPFok8anKCx60BbHM3GUHKCbZtvzf7vnr/05Lx/qR7v+WzMhADcUEGlzANQ5bNURPwCrTDwwRcaVGqYKjMcgSlAkQ60MH275xdBx1I2xtFBI8klCxQ9dfmArm/IjFwlV1NKePj9+TuIGx2EjcmxTdLwrGSsEkAFHNDxHBPiCsiEfdSygVRwr49tEtLdKYMCP3jmyBsgQ0ZqqC3v4N2cDuuilhEZYOkW1i6hKROtbJMPdqPjA6DHgDWQIYlZRDQ3NKp0ElF04eRrBCwOaawm77jcYwEdmAGNJQUfNzX9EMQJcmETCJQIV6hFkripiDBQbaADfDT2PQeplvH4OwNTG5/F8N8jCZXSBqUEyxTPA8QNdouYzjRE+oO2mGhJUkgxYpETQ578cER4ujJ1MtXw9Kl1MMDxNES1AnTI0zZS+OGeqlChIx43PXI8Tg2gHJW3CnxmBYsgzegoXB4Us5wnJ+qKWwdI6/fRnfmRiYbR2FyD834XvL0DNE3qWOHYmAV+KB4D8kkTZg0eJii6oROEQsl/muLx5OQG9wb3APuRmdTkhkuQ5r6IB72kpaOUF31v2L7n0H0LarcgCiEDqzuWchFDnBhCI5DllKI4Q2NgtABG9SEkiHYCWx6irx+B5OzN+EnPoVv3EqcnmTkRswVaiMIxQWTlyAbhHK6i9vIBFtHZIBHoZMtuho0rxK6PYQ8KoZAAHdUHBEhhhFEcM+4HyNP7yRv3Ile9mNkHKMreQahmPPDkDs+fg3AMuQWjYYQEFHa8d341s346S+Qzp4m+kma8WdYP3M/UTOVC0EbjIBUy1AlWptQ2Zk+bwilmlNHxPr6Xgoi2A4JPoJpg1YB4jpIBzZBUchFMCIySyy931EtSaoIKgGtRzBo+hzm4UcQH78GoApeobmj0WOw/ike+PSb0M3bGPomkSniU1yFNa0pcJ+Dj8EzbgFSg7NEiltATfAKsxYJqZx8L5tn3uED0JSga1AbQjvBgtH5JhqABEpAPfYpaov5SVzaoiXoGkRWOOX7WJOGiOBE0NBjCLIjtO2eYTxuDaBDyCHSZIf2FKc++RaWz17PqNqCuqYLSqZBUsDdy2EEsACE3gVPMenAOiQ3pGSEakyIE8gB9xUc7StFRYMCY1LbwNJ1TKqGzBDRvSX05Nsw28KpsbhCXLqIZukiJgm2pltkE0bN1Wi9rwefBrgKWUDR3g52tw543BqAAskdCbB1omVSX43uzaTNL1ClCUwaBCX5aZwtJLQYRtYBLnuYyj6oDyCDZdARIzlM1IRtfZKt8WdpRMtJJ6GyiXrE8pCxGINrfoB46UtZqkaghsgK6CncxpBayCD1MlSrwDINgTWslKsWcK3AHcmBHKAr/gfcdj0s7KIB7GiVcp0rYEy26dDQb8x2jV5+3jzgUv42uBeUDZ1nPb7jLUQKXCMzqFXnWk1cHLGS/AWFYf9QR/ufzOjgE/F8Ch/fhUxOIVOBnHDZpO22aNMmJol6sEQzOsBScxipD4HsBZbLk3Ijf/E12NFbkSiYZERyAWw0IElRX0IPPReWn0bb32XjIBJw3YfH8sjdy35G8TnQNEOm3FPJG3q9qfZb7j2CJW4ghpOBiBB6m0gFz0AvuFjYRQOQbQPYgXs7suM7RUKd3Qqk4Y6ZIyqYG9Zfdvn54pYd79OkHq1LCQ8CXiMiJLyPl16+toL7JXMkCFD1EOwSHvYiK1dhK9tXLEDdv6TfsLlpuqO5JGxbbDDQNZxMtISkhhQd8QrSEiZTQsjUvoTGvRhO5S14jRp4WMItoRpwrL/ikgvOdnr+jEwxivDUs5dnpbbN3GSFkBE1nIhlUJ2BW4pRz43mkTMALyfftcfdJKG0BVT1qo+tM7g1IKG8dQgzlx0epIo/38DAc+7fq+t9imNabD8hSJX6m5IeiN3+jb2/mfuU80FVn5tsb4YCGmcZxZTIgPVug0FQJICGhJJQzTgdk7zFZBjZO6gB62FmwQQ6Weo3yZHUoeIQmq/g4/pic/7n9rdLRWHZMFlBNCJ0mEOQ2X1ogbwfQpCIu7b70l+y928toX/QBZGz1KAhIrGc8A3gjpMb3HMqcdtdx/jy3fdx+uwGm9NCpqhn9q2u8IRD+7n88AGuuWwvF+9dZW81KB7CHLEOUDJKdudY59A5SkZUqbdB969y6efhYHLuowternciAzbcOLb+BJr8FCoRJmGM65gmZVakYklPQNMUjIA8r9+td88hd2hsIA4YA1+45wy33bvO52+/ky/ff5w2ewF9UmY0qDly0QEuObCPJx7Zz6UHag6trTCaGzsIkSgF7JLz8h955HOAMUiFWNNjJgI6JJtCiIRQsQF88rYTvPdjn+f6m07yyVvv48TYyVphuS2n2iNoXR6g3UcdjlL5lOUqcfXlR7j2mkt53rddyXd/02EOVwnzSPDAUJXX/7cP8eZ330yztIexCF20r7q5s5D0lY5m++cCDmlKWwfI+xlsBZbyM8issBkVDxXVxl38i2++g3/1rU5MikvEvQIpuYqScN9C4ipf2si89f0f5+0fv5O/vekuNlJBBskd5FyYRRQUAnfSBCPkCYf3Drj26it41nUX8T3XXclTL1ulCoUwivO70b56uPBKYdcMIBvFrZkhVuJAKyDVkJPAX37wFt7w3jv46M33s765CXUNwzVYjQiKejk4plrq3z6pTO4kOiY5cf/tW3zw6Of5/b/4HD/41D3811/6UQYBJBmocOJM4oZjiZCUzowLath4EJs4nw4WOixksDFR9xFthZYhFhRiBRuZL+VICGcK66druJXcwVNGB8I6q7zuPUf5L3/8YW67f6NUAEtX9ilTorIJgZYuDrHe75sbEzfEEreljqOfuI0/+/BNvO3i9/GHv/JTPOmiVfDch8JZ8PKHVCPEXUsAfdg/zUQmk0NDCMpf3Xw/v/6H7+XDnztBqoYwWiLs34NZVbxvLvETpph3pQyScnoKjq99ql8jyw1Rhe7MhPumFVn7yK5bwBJSV9hoBKMRYh1iu9GxE3AdFeeRBfMRnSfwiEqfKwRFInS+SWoux9iLKHgLUkXuXW955X9+O2/56F2wtErccwgIWK8dcJyOSIdC6vqKRktOJT1VHCJhzwo+PovXWyytLZPJNH0VcY7neghQwa55gOCBlA2LisXAhiu/9Scf4rVvup7jtkI8cBl12iJ4ohufIYaKjGIyKwxrstYEm1DZBKPcvM8eQskriy1QszRcoxFI5kSxnvlPEDYhHMdtdwATJxYSxkG8xQm4R9SFYEZlAtmpWKfTCWnpYoQRuesIVeTOceJf/vKbeddnt2gOHizG3m6hlpAQyUQ6aXBtQCIhbRAsY6KYhP7epVcYCTaNDJqalUZxaxGx+TZ6r3uYlxTySOYAZqgYnQjHWuFnX/Nn/Olf30Gz90qqykislxtgBCFhJNS7PmoF3CtcCjfnsqNIk74sdC/xVMC7LfaN1miALSAzIqKYjyA3aEpoEozhgx4I/4rc/8Gj5kwgAk7lGWRCJzWugYzh7pgGNHaIJdxrquEhlIznLTarPbzq9/6Sd93yAM1FT8Zsk+yChiGZUuublHdXmwItiGEBDKcUxjIvrcs5aFlZXeoxFelDwHbC+VDNPl7oOdj+tbMq+bxcUzpclLMWefX/8xbe+sEvMzh4NRMTMlM8J4jLJItUZDSBh5pMBAmoQmBK8orOB4ARpFS15gkNgpmTRUCmLC2l8rYZcgjz06qyglqN2oSk4NQEF1ynmCqSIg2Jzo0UBohbicGe6bQkYGoTTJtSSdiYkDMdFSFE1DKpUkxLuLOwRa47WtmDixBlmQ6jGtT86Qc+z5+9/y70oktI45NkbYABkjMSlI4MUqEEoncE2WJMg0tA1YmasWy494CYRIgVTzi0j6YUmvP4z7wolocEFsYL23zv/1vOA24lRu+opBOCx4p//9vv4a0f+DLx4GVM8lYRV0BB01wJ3qJpCxUn6QDLDl2LbR0npTNUgyWqwRLWdbRbm71aqsbqETpYgnoZdJO9yzUAlUPqk3lPp7H2NG23Cu14XkPnHKHeKFVAWmOSxviwlGOex6h1BG/ppAGcEBLmipnSTk5jugyyDB6o0xlyqvC4Vtg+mcJ4HewU6lsErXEaTuWW33vTh1G7DHKH6JliXA6Vd5BbiIJpxCYt080TBDnLcHkFc2WysYnlDM0IdEgcLhHqIa1NeMLeERUwRjFpKCqxGYymPXewa0CQ7Mgve9JDtH9DAy9SKq9qfv89N/L6//4RhvuexMRKORI8FXBLrNfbCblaIntHOnuStTrzzCft53uf/RyOHFD2jmq0imDOxqTlgTPGJ266j+s/dwe3Hdtgsj6h0czF+5bmVxc8IwSOrDpPvCSzumo0KbKlEfNINCHXNVkjOhGiN9zfKvdvjHu1ECXe9oijuqPWsrpSc9lFAyYaaJnQdA8w2voiIIx1D2oVVa6ISw9wzfLNNHmMeKBGePun7uCGOxO61pBsA6NBLOCSmUZK0mqGjE9w1QHlR374WTz9yjUOrg3pusT6+hYnt5xbvjThIzfcwtF7z3B8/QRMNzm8/9rtel9m1PLDzgWUMLCN6wt4KmWfBm48M+VX/+hvycuHmHrERXsZk82Nxz0QYiRPNqi7M7z0udfwih/4Fp551UFGX+WdN7/nWo4bfOCTd/Anf/lh3vGBzxOGzy4bp1LQxLzJv33Zd/OTL38eNTCygpgCRANXY8uV6M5QhX/32+/kN/78s+j+J+K5eDMRLTFVIE/GfPdzr+APfvrZVNOMNE73wDs5/Ym3MaiP0QUhmFAnwaRBqg5f34C2hKYP3XAfp9MqIaTynGRAMCdHw0MEGvzsaV5w3QH+06tfyDV7RudhoXP8j1M8ixtuPcmHP3snb/rT93Lx2rA3ft+G4GUbS5yhgQ9DFeBzIFX7GtkIqAj/+Y8/xpdOJJp9hzAL89EpJqHnzBWtBnTjsxyqJ/zaq1/Ij3/HVYV4zZsYQqbBc6E36HkAUWMAHFHlx7/1cn7kWy/nje98EpdftlqUOGL9eznBnWWEBqPCi/RKeuWvd9RSkbNQKUjV4BYInulECiE1v00B71ixCcv9KRNafHwfB7p7GeqxYl0WIdcgAeMMXc7EakDrcPO9E7xRnAlqVQFpZFoitdTQjrlsr/Prr/4+nrKnIXVbdFkQMTQEitYkECRwQJV/fNU+/vFV+/jp5z+ZQR1K2idaCEKRQibNJ5gYF6odixe27Yp4nte9ySHikA0NDR/78jH+/H03oEt76bJv4+kuoBXZHYkVeXyGS5cyv/vzL+F7r1rFugkuHRJqXKpiuX0GrO6EGeXXsybuxiAIP/GCby8Qj0/R4OU2pAERohc+zOd+qlf+ejExLVdOKw2uo2LUsqN+JhdPYDCUkmZN1anJWJQeqOp7/tRQukJYuWExIFXN2Snc9sC9sKRgRpUGZBVcEi6DQh2fvZMXPueJXLdnSB5vECLIYEAm9ASYlhTG+nokZ8A4vFr1jF+piM5FLmcswi6HgPJm1pdhWt7YrOyNwJs/eJTjp1vqAzXJcnFKoqDas2oGuWN/dy+vffWP8r1XrdJNx1RVIOlyIXGAut+4jOLS84CiPSgk8/qjs6KpEymQsRARcQKJQOxLI8epMCBoYQ99xq8CrWhhCnc+OE8oRhIBDXMeJtAiJNRBLSAWSzAUQ7Sw9XhDko46RqbZ2Ww3QSuCDxEPKB1JAA8oAfctrjhYo+4kKrIHkimVyrz0c3LvvmakcOjZ05lA/MHT/V2Fgn3OTHlpgSKWxgcRNCj3tvAXH70dWdmH2SzeG5jP5ydVakzXT/MzL/1H/ODTnsBkMundWCQhJGAAfb6gfQQLc29sPaEyu5YouWgyXXDpwAMmghF7w6gQp3TmSO7xBC3NHT10Gi1vl7ei4OU0qxumAbQhS+hL8AJNS64QqwoK6KX2wXvCWwKZKVLFWVsgpIgS6UIRj/rsuqxDCEx9QCdC50qtgSCFNxCKoTjS6yR0+1yrEM8pxf+uXbtw4cyFyTxKnTWvPq3rQBs+96Xj3Hoi4dUyhmI9HyzuKFDTwfgMTzmywste9B3k3BKbPkkUqMmMyL1jDjt0BbMevHL7ASPiVDgVqXfzM6zety3fHfcZGlZMxmTnuch95ZDmOU0JFd5XE1agV2no5mlZb4yaSaGD0GGae4FGjxSG1JeFigRhWK2g073AkNxMycFwH+DiZN9Cl/bw9vffwe2bicGownNLyHlH7Jb5YeihMgKZQK9HZHfajfVCisB5td9TvIoXLwB86MYvMt3sCDGcgxaIBHKfUbO5zr/4p8/k4qbPJyTirqg4agm1rkzfEsFEcDFcbF5qCuW0qwvBi8TbpMYkFN8hPZlEIriVjeyxCiOQkZLXSR+aZrfu8iCespfq9Dhg8UIGJLwScmh7ObiAh9IfIIK5E7XGgzKsYd9oL54rLHpPCsR5jmECXu/lE1/a5JW/8hZuPr5O1fT1fNvilsv7SeldUjLqGTVDc99z+BVM5gyvKcflQimhCzKAyEzSNOih2YLMdcCn71M8d0RLuHagxb3hAY+BiSmH9+7lh551KRUQNBQYU3sUS5vCoEnYIX8K5XfMX7o9j09K1ruNgYUdobAuKtrZS7abPsRLOLXeALTf/AIDFNA199i7kMBbQs8mFk1/RMMeVAOYIlaSVjRD3MJsiOoaSYQ1hSsPr+H5DKbjEjZSQJiiPkUMsjm672Le/fl1fuh/fwOveev13Lk+Reohoo55JnVTLEPKihGBasee6za97cy9nffyFdstD/Cg3Gmf3Z+eJm7+4j3IcITZDFPX/idL1eBbW1x7zSVcumepV98+BmeqzsUuob8/ObdF3EE6J8URrpEK+M5rDxAYYzrCfYRqmuchtbU0NkbSlHplH7e1e/mZ3/0Yz/63b+YVr7+ed3xxypiGqhoQpcPc6HCSWJlNKCUg5hkuI9usaS+Cu+CNfcjzAQTtRTTC+taEe+4/DtWI7DuNxIpYUoDUcdXlI0ZK79oeqysUN75DotmrVEvCiyJL+6jqglB+37dfxZMOGExaRAclrGhN7pNL76dIZHE0DgiHnshdWwNe95Zb+Wc//ye85Jf+lNe/97OcSA11jARxskPSitS3is5eeV78CUJJZi/UB3xdAyJmgoVTG8ZWK7jWvQXOXFMvEcuZUFc8+UlHes9hj829n7V1zYY9+I5cwYv8LYlj1RohLGMdXLqn4qd/5FnY+pcJnkEr3MpUUSOQtSLPOpXzGJ2eZhA7qpWabriPv7zxDC//v9/NP/nZ3+e177qRE52iqnTJ5oEx7kibbYcRPJQEUR+C49/BOZe/2diYzrPobRRtdkkdnqEKysUH13pF1mN0pPYcbKkw0210REprmAm0ZHJcA0aIQTLjJ1/wdF787MOkE7dTiVJ7S2NTsNTvj/QAT0mOO4eEkbwlrCwTL7qU6+8WXvna9/LDv/Df+Jub72MUQ5Ff5Q7xKeotod+FbTVz2L0q4KtVleY94iY7xdShL1FzkSybU1XwkDjKR5sDmGEhWoMUvYLI9vwBccGDI3E/WE0OkMRZC85vvOrFfP8z9jF94G6QihQGeBgUxF4h9I2iSSpyWCoDICTh1pFSRpcPEPc8kb/9wiYv+4U/4nXvvBELWjrfzcCm4C06k5nPcI3dqgL+bvFcHw3d569Zglh6HzNusmM+zmO3C916MCrGATEOcHNM7BwsLhjE5mLQhjQrWrrEkaUB/+/Pv5SXv+Bq2s1NclvIM9UCLgVPBC8AFG6IF3zBpDe2NMHzJktrq5wM+/nXv/U+/tOffwaqipZeQLqjKcfPK953zwD8HERgHtO1x8EF641gliWDhArXyNZ0s8+WH7szqRxBqxqqqhdo9LVl7/FCB6G5GETpZAOxDm0brDUODIXX/swL+e1XP5en7VnHT99NHm/hWpPjEBftUchJ6aHwGjFBrMdVBMaWSaNVbHUfv/L6d/PWz3wZQiBLcw5lX/Qa/pVy97+/B7B5ZjlL5aJKQdSk4OLMcPtZiaRO13YcO76+jW3v9ATOOenLo9ZHzICXarmQTgVawsWw0BXWMywTm0t6hdOY4AZBUFFqz4wY81Pf9ST++j/+GK95xXfxrUcCnH2A7uxp3CPoAGeAe4WYUHum9hZxSDSYjsgYGpx1H/Affue93D7ORTtZmCl29mNd6FSyC0sCZxuVpmQ3pn0yt7o8JGgqbV2aca8L2eFGICIyxc34wtHj/WW1nDs1t4xYw+fjEB6Vk/dDTyd7dQjTZYRJSXODMK03MXPSgauo167EXRn4gKAV1I5WiShlmkhOxoGlhld9/zfzjl9/CX/8s8/lf37mKmuT+0inT+PZqWKHaEdyIxFQd8QSkhNkIdEQR/v53N0T3v7xu6lUIacdx2j21S6GgLlIU2Yqn/L3qyuRldGA7SkzMzRKMO+rBRFuvWeTs8mRMChK4PnF6ryQKYijP3oHF/akUjXci1kDVqHWoNaQc4WsHIY4KI5Q6hImetncrDwL0TCbkHPLWmX8s394Da/7P1/MG//jj/GKH7yCK5p76U7fTaCDGHAprzm24lYGX2hhBf76AzcydpAYv273eUHPO++IMALE3riWRw1HDu2FnFEJPfvmPZXbyxKWlvjUzXdy9NQ6IqFnz3bmlbqDjZthW4+yCCBFiwAQlw+RfakwghaorMZsQNa1wtMLO2jsbcykRBJBVFBNBBuT0iZD73juE/fxmv/le3jrr72Ml33/dcStE4Ruk0oLY+oSe/jbCCS6lJClFT578xc5vr4BWu+A0eUrupt2hw3sN2p2Zr1rWasjV12yD8brKKEvjdKcqrTO0abh3rNj3nn9F2dpQUkcZ2XjTiN4lGYBPg9bgo0O0zICsZ6gyUW7H/bNwbCwox+6oCS9PsEDlmrEh+AVUQJV6gipJabENx9c4bd++nn86qt+gGF3FvL4nB2SflCQh4ghnNhsue9MOkcBINttpbvMBorPb1CwIn8CnvmkVaro25We9OrULEiMhZ9a2sMfvOUj3LXeFWeWWrB2Ti/PSN+H0tZo1ieO7vOvd73434EEuhQewIaHmepSIYGkBcZ4TFDtLeQSXe+qDc8lZLq3kHMpDcOs36EuCWUYoBoJWuJ907W88rlX8ZLnX0u7fgKd079OViETMXdEAxaHnDjTzY1DH4TD3UUkcDZQsZR/sSqy7O9+xlWsVNO+ZCkgxswIShPHmGp5lVvvn/Bbb3wvqNB5wHPCcztnNW3O7OkFb37OmYdtyt2O56cyY+ShWr2UuHSI7F1f/XR0aoRwAMgo3ZyxzGZMkmHedwuLlwEX6rhaGQahRdiaC6hC5RtEz3z/dz6LUSy9z9upcTFE0YCbkezcylrnF667mwPMmreMwtfTS6bMnacdWeOZVx4gb20iIcxn5AYRvGvxKjDtMs2ei/mdt32a1777BkIVaWWAucwPmzzEOrBLqaeUmf/58KLBATdBmydQ7XsibdJ+hFtDrtYYrV5ePJkU8MtckTpgMdBR4xIR7wpEToeVDkqsDKbpS+QO1MgIoRlgVYVZnmMt2+RTh4QycUx7mFVm33c/Z0bqLnmADG591O4VuwJuLQOMFz3/WaRpmmer3oNCRdSZQYROBpweXcG/+92P8jvvv5k6RiSOyDtTAbevCmC4OW6GqtLU9Tlh4OHGgmU+R3iFeuUI5iPc1khbQzpZQ5YvwYl0Uub9dqJ84a5TnO0galEFF/JnpvQpmofyVXmJK+ZDgigf+sxNTKaOh7pXV6X5BisZ8Yx5ZjDQbcrafZ4F7KIHOB9V2h7joiqQx/xPz76Ga560j7xxGg2OByV5n9jlFhEvKpXBAc6Evfzcb/4Fv/zGv+Z42xGC9mpjcOuw3GE5Y7nDrcV8u8YVFUSVo/ef4X0fu5EQAtm2cQXfCdz4+bHQ/46dtTlwMhvT4+e7Iy0DK0o8h+rAtaTmMJM8JOx7Kvue/ALQJfJsBJw5UeH/e+M7+cmf/U3e9dnb2XAhhKr/eLlYkL6+ZaBEE0GoCNUS77n9GH/0to8ho7VCQBHBdcenDwU8JQ6sNBxcCefFfXlIE0L0goKhBBCd04+zclCkwmXAkUb5uR99GnW6i4oEDEn1ChmhsUzIVmbhdOtoJYwHh/nFN3yaF/zcG/i1v/oMnz3VsukgsUFjjYaAhgrRmiyB02SOjhNvvfE+/rc/+ADPedXv89r33AxAOwtLM17ce5LEzwvnvVFsl6Az3UI3R/bA553IOxAwDKEyRbMUke7yt5EPfhvHXGmf8lLikR8rUjNpqL2jYswmcLRd4a9uannJv//vvOQ//Bm/9/aPctP966zn0uUqUdGoaKXkIByfZn7z3Ud52S/9BfePI940hUG3AW4j1CJijlR78OmUb7tiL5evjvBsiMReTidzaP5CVnzIGdF5iaFoILvzz7/jGt7/nOv4g7+5Dz10GLdNxKbEXNrBiJMinMhCkiHVwav5zN2n+czrruc33vhxnnL5RTz16st5wt6KoTjJnJMnjWMnznDbfQ9w57GzHFt3NrtMlwbEpkx6qopKv9/+qs+BwoMWsrPQNYezPRDSAPEG9dQbdgYL5GxEC3PDqnpNWRIhygqDw8+g3dwiNldj7Nnu4qXI4TdS5sa7TiEHrmEizjs+d4r33XAH+5c/zhWH9/DUa67k0P5lRkOYJrjjnrN8/DOf55Z7Wmw4QoZLeLtJ3c8RUqR0ICiF/WvX+fanXsuSCtYlRL++ObK70h6uQJ2dX/6pF/D5O97I9XffSdizjyyRNnSYtEAkEFFzsmVsnGkGSyADTk6mfPDmE/zNJ+/op2/PRqVUoA0SazRWyADiXiWdOkvaaosBiJVGSwHR4oJtJh+c6+R0LuKZFSteskc6rXArgyHnLrGAFb1+uC9UVeaGk9wZ7nk6HFkhLF3J1CO19JJYib3ku2Nja4L7GjkKcbSHFA9yT5pyzx1bfPjoDZCn26VvrGEwoF5dLq1p2Qn1gJxyPy2vtN8DhOlZLtsf+KHnfgvZvHRHlQ6I7eP5SM4HEBFSl7lkdcgf/uKL+In/4/V84oFE2HcJXZyWrDUJLhWtg1al0yhbrxvUQFUNqAYjUkx4cLCIW1VGeguYFKGmW4c7bE5nDSv9JJEZQXNe69qsdx4pUjabK32Ld7AwLfHfUy8pbwtiKZMyJbR/oN7Tro6R3VG5hDhcYTqpyKPyPevRPsQZb0DjHZWfLQPNEMzKh1boaERYGqI59RhYVTQe7phDDmUqqLn3DTbe94cIUYGTd/Lyn3wh37R/gHft7FMvdlRUcsHOYNfqJx2UUPBNB/fypl/5CZ53dSQf/xKkBmUPKkr2FmrBrMMskQW6oFjVMMnKhJqcVvDJCj4dQKd4BkuOpIjYMtLtBd/DJk0ZDiF9r91sovbs0zUeBNHxWRXVGw7iBMtgHcE6Kmup3ai9dAnNNLixF30IUrT56mhYIS4fJtY1UWzebzAbMrd+ehNrJyAJ8VQavnKLx2KIXZfpXGmzMO0yyZxsQg5D3AdYokDsuSvyTxFEG9r1ju/7R0/nX/3wP8TMy4i4XjH99XxCne5WnZR7Wjgl49IDa/ze//UT/JsXfwtLZ+7Czp5BEerKifksKmNiSASf4pbKZMxQhiXRpaJ9twRMcN1C4hTXXE5oDhAGjFtjkpxO6LHyuCMz6c6Ztj3/Simf/D2DZ3PCZ2MiPQI1lgXRuih7+taxsEMWFGf/VhytlVBlIpNelbNdMB0/u87Ya7KOSPU+prqCaAUpYdnxOCBrxIiYxHl3v+cJkiZl4p9FgjSICQPJ5ON38R3XHuRXX/lPWJaCvorY+XDdI58DzJKxRIJYM8nG/qj82sufw/c+80r+y5s/yrs+dQ+tRBgOCE1doEwFycVNi01KO0MoNbNrwrUYlaK4JWKsiSSmqWN85iTjjSmrawPMvZ/AuSPjZ7unznfMzZGejArWEZqA14rmgHvxYLEZkkQIdcUkxl5jJzOlBXhEpO3LRwGmpY3TDZEy1axCuOvuezi7vgEHLgapiHVA25OFVtaA5R0aCJ+1xRkD2yAQSHEPUxmWaWeTM1T5BK/4vqfxCz/1fA43AcxR6fMbn80G2kGz72Z38IVUCUX/oHSeCRKKy0vOD1x3Mc+57kW865Nf4g3vuZWP3nwX9x67n0wDg+XSGFLVZHFyTsRYcnqXqhc6OJ4T1m7STo+TPSMKF9WRJR9Te0VnDqp9Zzz9aZZtomk+ZAlinw/aZEK+716y9SocmxbFgntJyDZbfGvfDh6kn0xqus36SZnKK3lYRuQgPSEGl+4d8Q8uH3Db+jFOn52QXInVkFjVmGvf+h56ia3PDTNpTZec6an7UTdWh8Yzrj3Iv37xS/mhpx2hSQl360U3ZaT83D7ZOYf5woShu/aRMWZtmQ/Yz7cXCoCTsiLiVCGQUL50quXDn76Jjx09xS33bnH07pMcX5+SPdB2CZFJn041KAPqWDGqnSP7h1x56T6ecuUal1+8h++8+lKuWS0PA60RVbq+pTrYdh3vkklEKgfLjgRDBP74w1/mbZ+8n7Va6DxSede7VCeFwPH1KS96xiW89HlX9B8mlYAKsYhLIoviGJGuGIDCtO9ECpZAI8eAW+/Z5JYvHOWGoyf46Jen3Hbfac6c3SJrpMv008z6vCWANwP2rgx45qElnv/N+/iupz+B6666hCUgWUJMCPOBrEq2HlMQmU8L3B40K4+cAcxd7nymvW8TGG6494mMbKdoG+asT1pObSZOntzg9NmzTKaTvnwTlkfLHD54gNWVyL7lhqVKz3VZff/fTtuXcy5ne/qvfAXBK1/18WyHk9l7+DaQIH5uhtEzMttSwfJvMnLOOTxpcGaz5dTpMcdPnmE8mTDtOtyEuqkZDodctH+NQ3sqDiw1NDuBTbeCvD5Iiff3+QiJR/hDozLuhlmZMyAaHhp7bWl78EMvuPh76fx8m+nffoiyDRTOP+Tx7/k2VryOPATSys3IZoQQHtZ+im/Ap4Ztm6/NBoBID7b0ta/02MKM3tQdaJ5on8yJ7OKVPLTvff3G0MdvZqNdepRUtjuRY+9t5vf3MPdTfsM/Ns7M+hk8PRo///gW7+t2PecQzi73MdllZPk81+3nNfjuwKofKZr7G/65gTPFsW8TNNtdxDKfGezuqOrDcjIf2Xs9h6Hq77foDpUyGndm3I+EsT+iBvCgyYrPuOzzyZud8Vd3JeF5NO3/+f/v/T2HR/iaHgWfHGpfg318zJ73B71T/xqw7CN9t/GRPwP+d5wCvUAi+rG7FH8QDyYPb+b56DMA21FBzzSB+qAn4/HlB4ow9Cs/B0l2nAJ5xO/0G1QGfuWWfvWR7o+nIPBVDOAbcMOP408PX6wLC0uLtTCAxVoYwGItDGCxFgawWAsDWKyFASzWwgAWa2EAi7UwgMVaGMBiLQxgsRYGsFgLA1ishQEs1sIAFmthAIu1MIDFWhjAYi0MYLEWBrBYCwNYrIUBLNbCABZrYQCLtTCAxXrsrf8fDqFTnL6Me/EAAAAASUVORK5CYII="
              alt="CTS"
              className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex-shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold tracking-tight whitespace-nowrap">아트홀 좌석 관리</h1>
              <p className="text-[10px] sm:text-sm text-slate-500 whitespace-nowrap hidden sm:block">
                총 {ALL_SEAT_IDS.length}석 · 등록 {people.length}명 · 배치 {assignedCount}명
              </p>
            </div>
          </div>

          {/* 우측 영역: 탭 + 액션 버튼 */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto">
            {/* 뷰 전환 탭 */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden flex-shrink-0 mr-1 sm:mr-2">
              <button
                onClick={() => setView("seats")}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  view === "seats"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600"
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">자리배치</span>
              </button>
              <button
                onClick={() => setView("people")}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  view === "people"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> <span className="hidden sm:inline">인원관리</span>
              </button>
            </div>

            {/* 액션 버튼들 */}
            <button onClick={() => setShowCategoryManager(true)} className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[11px] sm:text-xs font-medium flex items-center gap-1 flex-shrink-0">
              <Tag className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">카테고리</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] sm:text-xs font-medium flex items-center gap-1 flex-shrink-0">
              <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">업로드</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
            <button onClick={handleExport} className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] sm:text-xs font-medium flex items-center gap-1 flex-shrink-0">
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">내보내기</span>
            </button>
            <button onClick={handleSavePreset} className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-md bg-violet-50 border border-violet-200 text-violet-700 text-[11px] sm:text-xs font-medium flex items-center gap-1 flex-shrink-0">
              <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">저장</span>
            </button>
            <button onClick={() => presetInputRef.current?.click()} className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-md bg-violet-50 border border-violet-200 text-violet-700 text-[11px] sm:text-xs font-medium flex items-center gap-1 flex-shrink-0">
              <FolderOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">불러오기</span>
            </button>
            <input ref={presetInputRef} type="file" accept=".json" onChange={handleLoadPreset} className="hidden" />
            <button onClick={() => window.print()} className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] sm:text-xs font-medium flex items-center gap-1 flex-shrink-0">
              <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">인쇄</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-6 print-area">
        {view === "seats" ? (
          <SeatView
            seatMap={seatMap}
            unassignedPeople={unassignedPeople}
            selectedPerson={selectedPerson}
            setSelectedPerson={setSelectedPerson}
            highlightedSeat={highlightedSeat}
            handleDragStart={handleDragStart}
            handleDragEnd={handleDragEnd}
            handleSeatDragOver={handleSeatDragOver}
            handleSeatDrop={handleSeatDrop}
            handleSeatClick={handleSeatClick}
            resetAll={resetAll}
            getPersonColor={getPersonColor}
            categories={categories}
          />
        ) : (
          <PeopleView
            people={filteredPeople}
            allCount={people.length}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            removePerson={removePerson}
            unassignSeat={unassignSeat}
            onAddClick={() => setShowAddModal(true)}
            onPersonClick={(p) => setDetailPerson(p)}
            getCategory={getCategory}
            getPersonColor={getPersonColor}
            onClearAll={handleClearAll}
          />
        )}
      </main>

      {showAddModal && (
        <AddPersonModal
          onClose={() => setShowAddModal(false)}
          onAdd={(n, pos, a) => { addPerson(n, pos, a); setShowAddModal(false); }}
        />
      )}

      {liveDetailPerson && (
        <PersonDetailModal
          person={liveDetailPerson}
          categories={categories}
          getPersonColor={getPersonColor}
          onClose={() => setDetailPerson(null)}
          onUnassign={() => unassignSeat(liveDetailPerson.id)}
          onRemove={() => {
            askConfirm(
              "인원 삭제",
              `${liveDetailPerson.name}님을 명단에서 삭제하시겠습니까?`,
              () => { removePerson(liveDetailPerson.id); },
              true
            );
          }}
          onSetCategory={(catId) => setPersonCategory(liveDetailPerson.id, catId)}
        />
      )}

      {showCategoryManager && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onAdd={addCategory}
          onRemove={removeCategory}
        />
      )}

      {seatPickerSeatId && (
        <SeatPickerModal
          seatId={seatPickerSeatId}
          unassignedPeople={unassignedPeople}
          getPersonColor={getPersonColor}
          onClose={() => setSeatPickerSeatId(null)}
          onPick={(personId) => assignPersonToSeat(personId, seatPickerSeatId)}
        />
      )}

      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-5 py-3 rounded-full shadow-lg text-sm font-semibold flex items-center gap-2 z-[100] no-print animate-in fade-in">
          <Save className="w-4 h-4" /> 프리셋 파일이 다운로드되었습니다
        </div>
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          danger={confirmState.danger}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => {
            confirmState.onConfirm();
            setConfirmState(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// 자리배치 뷰
// ============================================================
function SeatView({
  seatMap, unassignedPeople, selectedPerson, setSelectedPerson,
  highlightedSeat, handleDragStart, handleDragEnd, handleSeatDragOver, handleSeatDrop,
  handleSeatClick, resetAll, getPersonColor, categories,
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 미배치 인원 - 상단 sticky */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 no-print sticky top-[56px] sm:top-[60px] z-10 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">미배치 인원</h3>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{unassignedPeople.length}명</span>
          </div>
          {selectedPerson && (
            <button
              onClick={() => setSelectedPerson(null)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              선택 해제
            </button>
          )}
        </div>

        {selectedPerson && (
          <div className="mb-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs">
            <span className="font-bold text-blue-900">{selectedPerson.name}</span>
            <span className="text-blue-700 ml-2">
              {[selectedPerson.position, selectedPerson.affiliation].filter(Boolean).join(" · ")}
            </span>
            <span className="text-blue-600 ml-2">→ 배치할 좌석을 클릭하세요</span>
          </div>
        )}

        {unassignedPeople.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400">
            모든 인원이 배치되었습니다 ✨
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {unassignedPeople.map(p => {
              const isSelected = selectedPerson?.id === p.id;
              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={handleDragStart(p)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedPerson(isSelected ? null : p)}
                  className={`flex-shrink-0 p-2.5 rounded-lg border-2 cursor-grab active:cursor-grabbing text-xs transition-all min-w-[120px] max-w-[180px] ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-900 shadow-md"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:shadow-sm"
                  }`}
                >
                  <div className="font-semibold truncate">{p.name}</div>
                  {(p.position || p.affiliation) && (
                    <div className="text-slate-500 truncate text-[11px]">
                      {[p.position, p.affiliation].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 좌석 배치도 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 print-seat-card">
        <div className="flex items-center justify-between mb-4 no-print">
          <h2 className="text-base sm:text-lg font-bold">좌석 배치도</h2>
          <button
            onClick={resetAll}
            className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
          >
            <RotateCcw className="w-3 h-3" /> 배치 초기화
          </button>
        </div>

        {/* 인쇄용 제목 */}
        <div className="print-only mb-3">
          <h2 className="text-lg font-bold text-center">CTS 아트홀 좌석 배치도</h2>
        </div>

        {/* 카테고리 범례 */}
        {categories.length > 0 && (
          <div className="mb-4 flex items-center gap-2 sm:gap-3 flex-wrap text-[11px] sm:text-xs">
            <span className="text-slate-500 font-semibold">범례:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border" style={{ background: DEFAULT_COLOR.fill, borderColor: DEFAULT_COLOR.fillBorder }} />
              <span className="text-slate-600">미분류</span>
            </div>
            {categories.map(c => (
              <div key={c.id} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border" style={{ background: c.color.fill, borderColor: c.color.fillBorder }} />
                <span className="text-slate-700">{c.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* 좌석 그리드 + 무대: 동일 컨테이너에서 가운데 정렬 */}
        <div className="seat-grid-wrapper overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="seat-grid-inner inline-block min-w-full">
            {/* 무대 - 통로 중심선 기준 정렬 */}
            <div className="flex items-center gap-2 justify-center mb-5 sm:mb-6">
              <div className="w-6 flex-shrink-0" />
              <div className="relative" style={{ width: GRID_TOTAL_WIDTH, height: 40 }}>
                <div
                  className="absolute bg-gradient-to-b from-slate-700 to-slate-900 text-white text-center py-2.5 sm:py-3 rounded-lg font-bold tracking-[0.3em] text-xs sm:text-sm shadow-lg print-stage"
                  style={{
                    width: STAGE_WIDTH,
                    left: AISLE_CENTER - STAGE_WIDTH / 2,
                    top: 0,
                  }}
                >
                  S T A G E
                </div>
              </div>
              <div className="w-6 flex-shrink-0" />
            </div>

            <SectionTitle label="1층 객석" sub="A · C ~ N · U행" />
            <div className="space-y-1.5 mb-6 sm:mb-8">
              {B2_ROWS.map(({ row, seats, blocked }) => (
                <SeatRow
                  key={`b2-${row}`}
                  row={row}
                  seats={seats}
                  blocked={blocked}
                  seatMap={seatMap}
                  highlightedSeat={highlightedSeat}
                  handleDragStart={handleDragStart}
                  handleDragEnd={handleDragEnd}
                  handleSeatDragOver={handleSeatDragOver}
                  handleSeatDrop={handleSeatDrop}
                  handleSeatClick={handleSeatClick}
                  getPersonColor={getPersonColor}
                />
              ))}
            </div>

            <SectionTitle label="2층 객석" sub="O ~ T행" />
            <div className="space-y-1.5">
              {B1_ROWS.map(({ row, seats, blocked }) => (
                <SeatRow
                  key={`b1-${row}`}
                  row={row}
                  seats={seats}
                  blocked={blocked}
                  seatMap={seatMap}
                  highlightedSeat={highlightedSeat}
                  handleDragStart={handleDragStart}
                  handleDragEnd={handleDragEnd}
                  handleSeatDragOver={handleSeatDragOver}
                  handleSeatDrop={handleSeatDrop}
                  handleSeatClick={handleSeatClick}
                  getPersonColor={getPersonColor}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 leading-relaxed no-print">
          💡 <b>배치 방법 3가지:</b><br />
          ① <b>드래그</b>: 위 미배치 인원 카드를 좌석으로 끌어다 놓기<br />
          ② <b>인원 먼저 선택</b>: 미배치 인원 카드를 클릭한 뒤 빈 좌석 클릭<br />
          ③ <b>좌석 먼저 선택</b>: 빈 좌석을 클릭하면 인원 선택 창이 열림
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ label, sub }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h3 className="font-bold text-sm text-slate-700">{label}</h3>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

// ============================================================
// 좌석 행 (통로 기준 정렬)
// ============================================================
const SEAT_W = 40; // px
const SEAT_GAP = 2;
const AISLE_GAP = 16; // 가운데 통로 폭
const LEFT_SLOTS = -MIN_COL;
const RIGHT_SLOTS = MAX_COL;
const GRID_TOTAL_WIDTH = LEFT_SLOTS * (SEAT_W + SEAT_GAP) + AISLE_GAP + RIGHT_SLOTS * (SEAT_W + SEAT_GAP);
const AISLE_CENTER = LEFT_SLOTS * (SEAT_W + SEAT_GAP) + AISLE_GAP / 2; // 통로 중심선의 x 좌표
const STAGE_WIDTH = Math.round(GRID_TOTAL_WIDTH * 0.6);

function SeatRow({
  row, seats, blocked = [],
  seatMap, highlightedSeat,
  handleDragStart, handleDragEnd, handleSeatDragOver, handleSeatDrop, handleSeatClick,
  getPersonColor,
}) {
  const colToX = (col) => {
    if (col < 0) {
      const idx = LEFT_SLOTS + col;
      return idx * (SEAT_W + SEAT_GAP);
    } else {
      const idx = col - 1;
      return LEFT_SLOTS * (SEAT_W + SEAT_GAP) + AISLE_GAP + idx * (SEAT_W + SEAT_GAP);
    }
  };

  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="w-6 text-xs font-bold text-slate-500 text-right">{row}</div>
      <div
        className="relative"
        style={{ width: GRID_TOTAL_WIDTH, height: SEAT_W }}
      >
        {seats.map(s => {
          const sid = seatId(s.row, s.num);
          const occupant = seatMap[sid];
          const isHi = highlightedSeat === sid;
          const c = occupant ? getPersonColor(occupant) : DEFAULT_COLOR;
          const x = colToX(s.col);
          return (
            <div
              key={sid}
              draggable={!!occupant}
              onDragStart={occupant ? handleDragStart(occupant) : undefined}
              onDragEnd={handleDragEnd}
              onDragOver={handleSeatDragOver(sid)}
              onDrop={handleSeatDrop(sid)}
              onClick={() => handleSeatClick(sid)}
              title={occupant ? `${sid} · ${occupant.name}${occupant.position ? " " + occupant.position : ""}${occupant.affiliation ? " (" + occupant.affiliation + ")" : ""}` : sid}
              className={`absolute border rounded text-[9px] flex items-center justify-center cursor-pointer transition-all ${
                isHi ? "ring-2 ring-blue-500 ring-offset-1 z-10" : ""
              }`}
              style={{
                left: x,
                top: 0,
                width: SEAT_W,
                height: SEAT_W,
                background: occupant ? c.fill : c.bg,
                borderColor: occupant ? c.fillBorder : c.border,
                color: occupant ? "#fff" : "#64748b",
                transform: isHi ? "scale(1.1)" : "none",
              }}
            >
              {occupant ? (
                <span className="font-bold leading-tight px-0.5 text-center break-keep">
                  {occupant.name}
                </span>
              ) : (
                <span className="leading-none">{s.num}</span>
              )}
            </div>
          );
        })}
        {blocked.map((b, i) => (
          <div
            key={`blk-${row}-${i}`}
            className="absolute border rounded flex items-center justify-center"
            style={{
              left: colToX(b.col),
              top: 0,
              width: SEAT_W,
              height: SEAT_W,
              background: "repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 4px, #cbd5e1 4px, #cbd5e1 8px)",
              borderColor: "#94a3b8",
            }}
            title="사용 불가 (콘솔/구조물)"
          >
            <span className="text-[8px] text-slate-600 font-bold">×</span>
          </div>
        ))}
      </div>
      <div className="w-6 text-xs font-bold text-slate-500">{row}</div>
    </div>
  );
}

// ============================================================
// 인원관리 뷰
// ============================================================
function PeopleView({
  people, allCount, searchTerm, setSearchTerm, removePerson, unassignSeat,
  onAddClick, onPersonClick, getCategory, getPersonColor, onClearAll,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold">인원 관리</h2>
          <p className="text-xs text-slate-500 mt-0.5">전체 {allCount}명 · 표시 {people.length}명 · 행 클릭 시 상세보기</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="성명·직위·소속 검색"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
          <button
            onClick={onAddClick}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> 추가
          </button>
          {allCount > 0 && (
            <button
              onClick={onClearAll}
              className="px-3 py-2 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium flex items-center gap-2"
              title="모든 데이터 삭제"
            >
              <Trash2 className="w-4 h-4" /> 전체 삭제
            </button>
          )}
        </div>
      </div>

      {people.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">등록된 인원이 없습니다</p>
          <p className="text-xs mt-1">엑셀을 업로드하거나 직접 추가해 주세요</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-600">
                <th className="px-5 py-3 font-semibold w-2"></th>
                <th className="px-5 py-3 font-semibold">성명</th>
                <th className="px-5 py-3 font-semibold">직위</th>
                <th className="px-5 py-3 font-semibold">소속</th>
                <th className="px-5 py-3 font-semibold">카테고리</th>
                <th className="px-5 py-3 font-semibold">좌석</th>
                <th className="px-5 py-3 font-semibold text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {people.map(p => {
                const cat = p.categoryId ? getCategory(p.categoryId) : null;
                const c = getPersonColor(p);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 hover:bg-blue-50 cursor-pointer"
                    onClick={() => onPersonClick(p)}
                  >
                    <td className="pl-5 py-3">
                      <div className="w-3 h-3 rounded" style={{ background: c.fill }} />
                    </td>
                    <td className="px-5 py-3 font-medium">{p.name}</td>
                    <td className="px-5 py-3 text-slate-600">{p.position || "-"}</td>
                    <td className="px-5 py-3 text-slate-600">{p.affiliation || "-"}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {cat ? (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                        >
                          {cat.name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">미분류</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {p.seatId ? (
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                          {p.seatId}
                          <button
                            onClick={(e) => { e.stopPropagation(); unassignSeat(p.id); }}
                            className="hover:text-red-600"
                            title="배치 해제"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">미배치</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); removePerson(p.id); }}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 인원 추가 모달
// ============================================================
function AddPersonModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [affiliation, setAffiliation] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">인원 추가</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <Field label="성명" value={name} onChange={setName} placeholder="홍길동" autoFocus />
          <Field label="직위" value={position} onChange={setPosition} placeholder="팀장" />
          <Field label="소속" value={affiliation} onChange={setAffiliation} placeholder="경영지원팀" />
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={() => onAdd(name, position, affiliation)}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, autoFocus }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
      />
    </div>
  );
}

// ============================================================
// 사람 상세 정보 모달
// ============================================================
function PersonDetailModal({ person, categories, getPersonColor, onClose, onUnassign, onRemove, onSetCategory }) {
  const c = getPersonColor(person);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="text-white p-6 relative" style={{ background: `linear-gradient(135deg, ${c.fill}, ${c.fillBorder})` }}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-3xl font-bold mb-1">{person.name}</div>
          <div className="text-white/80 text-sm">
            {[person.position, person.affiliation].filter(Boolean).join(" · ") || "정보 미등록"}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <DetailRow label="직위" value={person.position || "미등록"} />
          <DetailRow label="소속" value={person.affiliation || "미등록"} />
          <DetailRow
            label="좌석"
            value={person.seatId || "미배치"}
            highlight={!!person.seatId}
          />

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">카테고리</div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onSetCategory(null)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                  !person.categoryId ? "ring-2 ring-offset-1 ring-slate-400" : ""
                }`}
                style={{ background: DEFAULT_COLOR.bg, borderColor: DEFAULT_COLOR.border, color: DEFAULT_COLOR.text }}
              >
                미분류
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onSetCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all ${
                    person.categoryId === cat.id ? "ring-2 ring-offset-1 ring-slate-400" : ""
                  }`}
                  style={{ background: cat.color.bg, borderColor: cat.color.border, color: cat.color.text }}
                >
                  {cat.name}
                </button>
              ))}
              {categories.length === 0 && (
                <div className="text-xs text-slate-400 py-1">상단 "카테고리" 버튼으로 먼저 만들어주세요</div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
          {person.seatId && (
            <button
              onClick={onUnassign}
              className="flex-1 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-100"
            >
              배치 해제
            </button>
          )}
          <button
            onClick={onRemove}
            className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
          >
            명단에서 삭제
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-medium ${highlight ? "text-amber-700 font-bold" : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

// ============================================================
// 카테고리 관리 모달
// ============================================================
function CategoryManagerModal({ categories, onClose, onAdd, onRemove }) {
  const [newName, setNewName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAdd(newName, colorIdx);
    setNewName("");
    setColorIdx((colorIdx + 1) % COLOR_PALETTE.length);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2"><Tag className="w-5 h-5" /> 카테고리 관리</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">새 카테고리 이름</label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: VIP, 임원진, 직원, 외부 손님..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">색상 선택</label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PALETTE.map((color, i) => (
                <button
                  key={i}
                  onClick={() => setColorIdx(i)}
                  className={`h-10 rounded-lg border-2 transition-all ${
                    colorIdx === i ? "scale-110 ring-2 ring-offset-1 ring-slate-400" : ""
                  }`}
                  style={{ background: color.fill, borderColor: color.fillBorder }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> 카테고리 추가
          </button>
        </div>

        <div className="border-t border-slate-200 p-5 max-h-64 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-600 mb-2">등록된 카테고리 ({categories.length})</div>
          {categories.length === 0 ? (
            <div className="text-xs text-slate-400 text-center py-4">아직 카테고리가 없습니다</div>
          ) : (
            <div className="space-y-2">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border"
                  style={{ background: cat.color.bg, borderColor: cat.color.border }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ background: cat.color.fill }} />
                    <span className="font-semibold text-sm" style={{ color: cat.color.text }}>{cat.name}</span>
                  </div>
                  <button
                    onClick={() => onRemove(cat.id)}
                    className="text-slate-500 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 빈 좌석 클릭 시 인원 선택 모달
// ============================================================
function SeatPickerModal({ seatId, unassignedPeople, getPersonColor, onClose, onPick }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return unassignedPeople;
    const t = search.toLowerCase();
    return unassignedPeople.filter(p =>
      p.name.toLowerCase().includes(t) ||
      (p.position || "").toLowerCase().includes(t) ||
      (p.affiliation || "").toLowerCase().includes(t)
    );
  }, [unassignedPeople, search]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg">인원 선택</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="font-bold text-blue-700">{seatId}</span>번 좌석에 배치할 인원을 선택하세요
              </p>
            </div>
            <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="성명·직위·소속 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              {unassignedPeople.length === 0
                ? "미배치 인원이 없습니다"
                : "검색 결과가 없습니다"}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map(p => {
                const c = getPersonColor(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => onPick(p.id)}
                    className="w-full text-left p-3 rounded-lg border hover:shadow-md transition-all flex items-center gap-3"
                    style={{ background: c.bg, borderColor: c.border, color: c.text }}
                  >
                    <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ background: c.fill }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{p.name}</div>
                      {(p.position || p.affiliation) && (
                        <div className="text-xs opacity-75 truncate">
                          {[p.position, p.affiliation].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 커스텀 확인 모달 (window.confirm 대체)
// ============================================================
function ConfirmModal({ title, message, danger, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className={`font-bold text-lg mb-2 ${danger ? "text-red-700" : "text-slate-900"}`}>
            {danger && "⚠️ "}{title}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold hover:bg-slate-100"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`flex-1 py-2.5 rounded-lg text-white text-sm font-semibold ${
              danger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

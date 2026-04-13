import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { DEFAULT_COLOR, COLOR_PALETTE } from "../constants/colors";
import { seatId, ALL_ROWS, ALL_SEAT_IDS } from "../constants/seats";

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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useSeating() {
  // 초기 로드는 한 번만
  const [people, setPeople] = useState(() => loadFromStorage()?.people || []);
  const [categories, setCategories] = useState(() => loadFromStorage()?.categories || []);
  const [view, setView] = useState("seats");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [draggingPerson, setDraggingPerson] = useState(null);
  const [highlightedSeat, setHighlightedSeat] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [detailPerson, setDetailPerson] = useState(null);
  const [seatPickerSeatId, setSeatPickerSeatId] = useState(null);
  const [savedToast, setSavedToast] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const showError = useCallback((msg) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 3000);
  }, []);

  const askConfirm = useCallback((title, message, onConfirm, danger = false) => {
    setConfirmState({ title, message, onConfirm, danger });
  }, []);

  // 자동 저장 — 디바운스(250ms)로 불필요한 직렬화 최소화
  const saveTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ people, categories }));
      } catch {
        // localStorage 사용 불가 환경 (시크릿 모드, iframe 제약 등) — 무시
      }
    }, 250);
    return () => clearTimeout(saveTimerRef.current);
  }, [people, categories]);

  // seatId → person O(1) 맵
  const seatMap = useMemo(() => {
    const m = {};
    people.forEach(p => { if (p.seatId) m[p.seatId] = p; });
    return m;
  }, [people]);

  // categoryId → category O(1) 맵
  const categoryMap = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories]
  );

  const unassignedPeople = useMemo(() => people.filter(p => !p.seatId), [people]);
  const assignedCount = people.length - unassignedPeople.length;

  // detailPerson은 항상 최신 people 기준으로 조회
  const liveDetailPerson = useMemo(() => {
    if (!detailPerson) return null;
    return people.find(p => p.id === detailPerson.id) || null;
  }, [detailPerson, people]);

  const getCategory = useCallback(
    (catId) => categoryMap.get(catId),
    [categoryMap]
  );

  const getPersonColor = useCallback((p) => {
    if (p.categoryId) {
      const c = categoryMap.get(p.categoryId);
      if (c) return c.color;
    }
    return DEFAULT_COLOR;
  }, [categoryMap]);

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
          id: crypto.randomUUID(),
          name, position, affiliation: aff, seatId: null, categoryId: null,
        });
      }
      setPeople(prev => [...prev, ...newPeople]);
      e.target.value = "";
    } catch (err) {
      showError("엑셀 파일 오류: " + err.message);
      e.target.value = "";
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
      id: crypto.randomUUID(),
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
    const data = { version: 1, savedAt: new Date().toISOString(), people, categories };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const ts = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    downloadBlob(blob, `CTS_좌석프리셋_${ts}.json`);
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
      showError("프리셋 파일을 불러올 수 없습니다: " + err.message);
      e.target.value = "";
    }
  };

  const handleClearAll = () => {
    askConfirm(
      "전체 데이터 삭제",
      "모든 데이터(인원, 카테고리, 배치)를 완전히 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      () => { setPeople([]); setCategories([]); },
      true
    );
  };

  // ====== 자동 배치 ======
  const autoAssign = () => {
    // Step 1: 빈 좌석 수집 (앞줄 → 뒷줄, 왼쪽 → 오른쪽)
    const availableSeats = [];
    ALL_ROWS.forEach(({ seats }) => {
      [...seats]
        .sort((a, b) => a.col - b.col)
        .forEach(s => {
          const sid = seatId(s.row, s.num);
          if (!seatMap[sid]) availableSeats.push(sid);
        });
    });

    if (availableSeats.length === 0 || unassignedPeople.length === 0) return;

    // Step 2: 카테고리(1순위) → 소속(2순위) → 이름(3순위) 정렬
    // 미분류는 맨 뒤, 소속 없음은 해당 카테고리 그룹 내 맨 뒤
    const LAST = "\uFFFF"; // 정렬 시 맨 뒤로 밀기 위한 sentinel
    const sortedPeople = [...unassignedPeople].sort((a, b) => {
      const catA = categoryMap.get(a.categoryId)?.name ?? LAST;
      const catB = categoryMap.get(b.categoryId)?.name ?? LAST;
      if (catA !== catB) return catA.localeCompare(catB, "ko");

      const affA = a.affiliation || LAST;
      const affB = b.affiliation || LAST;
      if (affA !== affB) return affA.localeCompare(affB, "ko");

      return a.name.localeCompare(b.name, "ko");
    });

    // Step 4: 순서대로 좌석 할당
    const assignments = new Map();
    sortedPeople.forEach((p, i) => {
      if (i < availableSeats.length) assignments.set(p.id, availableSeats[i]);
    });

    const unplacedCount = Math.max(0, sortedPeople.length - availableSeats.length);

    setPeople(prev =>
      prev.map(p => assignments.has(p.id) ? { ...p, seatId: assignments.get(p.id) } : p)
    );

    if (unplacedCount > 0) showError(`좌석이 부족합니다: ${unplacedCount}명 미배치`);
  };

  // ====== 카테고리 관리 ======
  const addCategory = (name, colorIndex) => {
    if (!name.trim()) return;
    setCategories(prev => [...prev, {
      id: crypto.randomUUID(),
      name: name.trim(),
      color: COLOR_PALETTE[colorIndex % COLOR_PALETTE.length],
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
      setDetailPerson(occupant);
      return;
    }
    if (selectedPerson && !selectedPerson.seatId) {
      setPeople(prev => prev.map(p => p.id === selectedPerson.id ? { ...p, seatId: sid } : p));
      setSelectedPerson(null);
    } else {
      setSeatPickerSeatId(sid);
    }
  };

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

  return {
    // state
    people, categories, view, setView,
    searchTerm, setSearchTerm,
    selectedPerson, setSelectedPerson,
    highlightedSeat,
    showAddModal, setShowAddModal,
    showCategoryManager, setShowCategoryManager,
    detailPerson, setDetailPerson,
    seatPickerSeatId, setSeatPickerSeatId,
    savedToast, errorToast,
    confirmState, setConfirmState,
    // derived
    seatMap, unassignedPeople, assignedCount, liveDetailPerson, filteredPeople,
    // actions
    getCategory, getPersonColor,
    handleExcelUpload, handleExport,
    addPerson, removePerson, unassignSeat, setPersonCategory,
    resetAll, handleSavePreset, handleLoadPreset, handleClearAll,
    addCategory, removeCategory,
    handleDragStart, handleDragEnd, handleSeatDragOver, handleSeatDrop,
    handleSeatClick, assignPersonToSeat,
    autoAssign,
    askConfirm,
    ALL_SEAT_IDS,
  };
}

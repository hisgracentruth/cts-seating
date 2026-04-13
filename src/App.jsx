import { useRef } from "react";
import {
  Upload, Users, Grid3x3, Download,
  Tag, Save, FolderOpen, Printer,
} from "lucide-react";
import { useSeating } from "./hooks/useSeating";
import SeatView from "./components/SeatView";
import PeopleView from "./components/PeopleView";
import AddPersonModal from "./components/modals/AddPersonModal";
import PersonDetailModal from "./components/modals/PersonDetailModal";
import CategoryManagerModal from "./components/modals/CategoryManagerModal";
import SeatPickerModal from "./components/modals/SeatPickerModal";
import ConfirmModal from "./components/modals/ConfirmModal";

// 로고는 base64로 인라인 유지 (외부 서버 없이 동작)
import LOGO_SRC from "./assets/logo.js";

export default function CTSSeatingApp() {
  const fileInputRef = useRef(null);
  const presetInputRef = useRef(null);

  const {
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
    seatMap, unassignedPeople, assignedCount, liveDetailPerson, filteredPeople,
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
  } = useSeating();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-4 sm:gap-6 overflow-x-auto">
          {/* 로고+타이틀 */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <img src={LOGO_SRC} alt="CTS" className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold tracking-tight whitespace-nowrap">아트홀 좌석 관리</h1>
              <p className="text-[10px] sm:text-sm text-slate-500 whitespace-nowrap hidden sm:block">
                총 {ALL_SEAT_IDS.length}석 · 등록 {people.length}명 · 배치 {assignedCount}명
              </p>
            </div>
          </div>

          {/* 뷰 전환 탭 + 액션 버튼 */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto">
            <div className="flex border border-slate-200 rounded-lg overflow-hidden flex-shrink-0 mr-1 sm:mr-2">
              <button
                onClick={() => setView("seats")}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  view === "seats" ? "bg-blue-600 text-white" : "bg-white text-slate-600"
                }`}
              >
                <Grid3x3 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">자리배치</span>
              </button>
              <button
                onClick={() => setView("people")}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  view === "people" ? "bg-blue-600 text-white" : "bg-white text-slate-600"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> <span className="hidden sm:inline">인원관리</span>
              </button>
            </div>

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
            onAutoAssign={autoAssign}
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
          onRemove={() => askConfirm(
            "인원 삭제",
            `${liveDetailPerson.name}님을 명단에서 삭제하시겠습니까?`,
            () => removePerson(liveDetailPerson.id),
            true
          )}
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

      {confirmState && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          danger={confirmState.danger}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
        />
      )}

      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-5 py-3 rounded-full shadow-lg text-sm font-semibold flex items-center gap-2 z-[100] no-print">
          <Save className="w-4 h-4" /> 프리셋 파일이 다운로드되었습니다
        </div>
      )}

      {errorToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-full shadow-lg text-sm font-semibold z-[100] no-print">
          {errorToast}
        </div>
      )}
    </div>
  );
}

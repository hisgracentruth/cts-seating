import { Wand2 } from "lucide-react";
import SeatGrid from "./SeatGrid";

export default function SeatView({
  seatMap, unassignedPeople, selectedPerson, setSelectedPerson,
  highlightedSeat, handleDragStart, handleDragEnd, handleSeatDragOver, handleSeatDrop,
  handleSeatClick, resetAll, onAutoAssign, getPersonColor, categories,
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 미배치 인원 — 상단 sticky */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 no-print sticky top-[56px] sm:top-[60px] z-10 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">미배치 인원</h3>
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{unassignedPeople.length}명</span>
          </div>
          <div className="flex items-center gap-2">
            {unassignedPeople.length > 0 && (
              <button
                onClick={onAutoAssign}
                className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-violet-50 font-medium"
              >
                <Wand2 className="w-3 h-3" /> 자동 배치
              </button>
            )}
            {selectedPerson && (
              <button
                onClick={() => setSelectedPerson(null)}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                선택 해제
              </button>
            )}
          </div>
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
          <div className="text-center py-4 text-xs text-slate-400">모든 인원이 배치되었습니다 ✨</div>
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

      <SeatGrid
        seatMap={seatMap} highlightedSeat={highlightedSeat}
        handleDragStart={handleDragStart} handleDragEnd={handleDragEnd}
        handleSeatDragOver={handleSeatDragOver} handleSeatDrop={handleSeatDrop}
        handleSeatClick={handleSeatClick} resetAll={resetAll}
        getPersonColor={getPersonColor} categories={categories}
      />
    </div>
  );
}

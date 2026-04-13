import { RotateCcw } from "lucide-react";
import {
  B2_ROWS, B1_ROWS,
  SEAT_W, SEAT_GAP, AISLE_GAP, LEFT_SLOTS,
  GRID_TOTAL_WIDTH, AISLE_CENTER, STAGE_WIDTH,
  seatId,
} from "../constants/seats";
import { DEFAULT_COLOR } from "../constants/colors";

function SectionTitle({ label, sub }) {
  return (
    <div className="flex items-baseline gap-2 mb-3">
      <h3 className="font-bold text-sm text-slate-700">{label}</h3>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

function SeatRow({
  row, seats, blocked = [],
  seatMap, highlightedSeat,
  handleDragStart, handleDragEnd, handleSeatDragOver, handleSeatDrop, handleSeatClick,
  getPersonColor,
}) {
  const colToX = (col) => {
    if (col < 0) {
      return (LEFT_SLOTS + col) * (SEAT_W + SEAT_GAP);
    }
    return LEFT_SLOTS * (SEAT_W + SEAT_GAP) + AISLE_GAP + (col - 1) * (SEAT_W + SEAT_GAP);
  };

  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="w-6 text-xs font-bold text-slate-500 text-right">{row}</div>
      <div className="relative" style={{ width: GRID_TOTAL_WIDTH, height: SEAT_W }}>
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
              title={
                occupant
                  ? `${sid} · ${occupant.name}${occupant.position ? " " + occupant.position : ""}${occupant.affiliation ? " (" + occupant.affiliation + ")" : ""}`
                  : sid
              }
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

export default function SeatGrid({
  seatMap, highlightedSeat,
  handleDragStart, handleDragEnd, handleSeatDragOver, handleSeatDrop, handleSeatClick,
  resetAll, getPersonColor, categories,
}) {
  return (
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

      <div className="seat-grid-wrapper overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="seat-grid-inner inline-block min-w-full">
          {/* 무대 */}
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
                row={row} seats={seats} blocked={blocked}
                seatMap={seatMap} highlightedSeat={highlightedSeat}
                handleDragStart={handleDragStart} handleDragEnd={handleDragEnd}
                handleSeatDragOver={handleSeatDragOver} handleSeatDrop={handleSeatDrop}
                handleSeatClick={handleSeatClick} getPersonColor={getPersonColor}
              />
            ))}
          </div>

          <SectionTitle label="2층 객석" sub="O ~ T행" />
          <div className="space-y-1.5">
            {B1_ROWS.map(({ row, seats, blocked }) => (
              <SeatRow
                key={`b1-${row}`}
                row={row} seats={seats} blocked={blocked}
                seatMap={seatMap} highlightedSeat={highlightedSeat}
                handleDragStart={handleDragStart} handleDragEnd={handleDragEnd}
                handleSeatDragOver={handleSeatDragOver} handleSeatDrop={handleSeatDrop}
                handleSeatClick={handleSeatClick} getPersonColor={getPersonColor}
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
  );
}

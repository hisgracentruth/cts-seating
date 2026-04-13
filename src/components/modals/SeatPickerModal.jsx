import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";

export default function SeatPickerModal({ seatId, unassignedPeople, getPersonColor, onClose, onPick }) {
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
              {unassignedPeople.length === 0 ? "미배치 인원이 없습니다" : "검색 결과가 없습니다"}
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

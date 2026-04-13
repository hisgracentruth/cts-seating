import { X } from "lucide-react";
import { DEFAULT_COLOR } from "../../constants/colors";

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

export default function PersonDetailModal({
  person, categories, getPersonColor,
  onClose, onUnassign, onRemove, onSetCategory,
}) {
  const c = getPersonColor(person);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="text-white p-6 relative" style={{ background: `linear-gradient(135deg, ${c.fill}, ${c.fillBorder})` }}>
          <button onClick={onClose} className="absolute top-3 right-3 text-white/80 hover:text-white">
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
          <DetailRow label="좌석" value={person.seatId || "미배치"} highlight={!!person.seatId} />

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

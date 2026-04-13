import { useState } from "react";
import { X, Tag, Plus, Trash2 } from "lucide-react";
import { COLOR_PALETTE } from "../../constants/colors";

export default function CategoryManagerModal({ categories, onClose, onAdd, onRemove }) {
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
                  <button onClick={() => onRemove(cat.id)} className="text-slate-500 hover:text-red-600 p-1">
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

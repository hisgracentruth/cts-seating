import { useState } from "react";
import { X } from "lucide-react";

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

export default function AddPersonModal({ onClose, onAdd }) {
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

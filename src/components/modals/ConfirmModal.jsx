export default function ConfirmModal({ title, message, danger, onCancel, onConfirm }) {
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
              danger ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

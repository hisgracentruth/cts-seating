import { Users, Search, UserPlus, Trash2, X } from "lucide-react";

export default function PeopleView({
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

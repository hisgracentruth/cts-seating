function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

// 좌석 정의:
//   left: 통로 왼쪽 좌석 번호 배열
//   right: 통로 오른쪽 좌석. 숫자는 실제 좌석, { blocked: N }은 N개의 사용불가 자리
const B2_ROWS_RAW = [
  { row: "A", left: range(1, 10),  right: range(11, 20) },
  { row: "C", left: range(1, 11),  right: range(12, 22) },
  { row: "D", left: range(1, 10),  right: range(11, 20) },
  { row: "E", left: range(1, 11),  right: range(12, 22) },
  { row: "F", left: range(1, 10),  right: range(11, 20) },
  { row: "G", left: range(1, 11),  right: range(12, 22) },
  { row: "H", left: range(1, 10),  right: range(11, 20) },
  { row: "I", left: range(1, 11),  right: range(12, 22) },
  { row: "J", left: range(1, 9),   right: range(11, 18) },
  { row: "K", left: range(1, 11),  right: range(12, 22) },
  { row: "L", left: range(1, 11),  right: range(12, 22) },
  { row: "M", left: range(1, 12),  right: [{ blocked: 4 }, ...range(14, 21)] },
  { row: "N", left: range(1, 11),  right: [{ blocked: 4 }, ...range(13, 19)] },
  { row: "U", left: range(1, 4),   right: range(5, 8) },
];

const B1_ROWS_RAW = [
  { row: "O", left: range(1, 9),   right: [{ blocked: 1 }, ...range(11, 18)] },
  { row: "P", left: range(1, 9),   right: range(10, 18) },
  { row: "Q", left: range(1, 9),   right: range(10, 18) },
  { row: "R", left: range(1, 11),  right: range(12, 22) },
  { row: "S", left: range(1, 12),  right: range(13, 24) },
  { row: "T", left: range(1, 14),  right: range(15, 29) },
];

// 통로 기준 col 인덱스 부여
// left 좌석: col = -leftCount, ..., -1 (col=-1이 통로 바로 왼쪽)
// right 좌석: col = 1, 2, ... (blocked는 col 위치는 차지하되 좌석은 아님)
function buildRow(raw) {
  const seats = [];
  const blocked = [];
  const leftLen = raw.left.length;
  raw.left.forEach((num, i) => {
    seats.push({ row: raw.row, num, col: -(leftLen - i) });
  });
  let rightCol = 1;
  raw.right.forEach(item => {
    if (typeof item === "number") {
      seats.push({ row: raw.row, num: item, col: rightCol });
      rightCol += 1;
    } else if (item && typeof item === "object" && item.blocked) {
      for (let i = 0; i < item.blocked; i++) {
        blocked.push({ col: rightCol });
        rightCol += 1;
      }
    }
  });
  return { row: raw.row, seats, blocked };
}

export const B2_ROWS = B2_ROWS_RAW.map(buildRow);
export const B1_ROWS = B1_ROWS_RAW.map(buildRow);

export const ALL_ROWS = [...B2_ROWS, ...B1_ROWS];
export const MIN_COL = Math.min(...ALL_ROWS.flatMap(r => r.seats.map(s => s.col)));
export const MAX_COL = Math.max(
  ...ALL_ROWS.flatMap(r => [
    ...r.seats.map(s => s.col),
    ...r.blocked.map(b => b.col),
  ])
);

export const seatId = (row, num) => `${row}${num}`;

export const ALL_SEAT_IDS = ALL_ROWS.flatMap(r => r.seats.map(s => seatId(s.row, s.num)));

// 그리드 레이아웃 상수
export const SEAT_W = 40;    // 좌석 크기(px)
export const SEAT_GAP = 2;   // 좌석 간격(px)
export const AISLE_GAP = 16; // 중앙 통로 폭(px)
export const LEFT_SLOTS = -MIN_COL;
export const RIGHT_SLOTS = MAX_COL;
export const GRID_TOTAL_WIDTH =
  LEFT_SLOTS * (SEAT_W + SEAT_GAP) + AISLE_GAP + RIGHT_SLOTS * (SEAT_W + SEAT_GAP);
// 통로 중심선 x 좌표
export const AISLE_CENTER = LEFT_SLOTS * (SEAT_W + SEAT_GAP) + AISLE_GAP / 2;
// 무대 폭: 그리드 너비의 60%
export const STAGE_WIDTH = Math.round(GRID_TOTAL_WIDTH * 0.6);

export function getLineForOffset(offset: number, lineOffsets: number[]) {
  let low = 0;
  let high = lineOffsets.length - 1;
  // Loops until `low` indexes the line containing `offset`
  while (low < high) {
    const mid = Math.ceil((high + low) / 2);
    const midOffset = lineOffsets[mid];
    if (offset < midOffset) {
      high = mid - 1;
    } else {
      low = mid;
    }
  }
  return low;
}

export function getOffsetForPosition(pos: Position, lineOffsets: number[]) {
  return lineOffsets[pos.line] + pos.column;
}

export interface Position {
    line: number;
    column: number;
}

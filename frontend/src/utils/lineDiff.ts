export type LineDiffRow = { kind: 'same' | 'add' | 'remove'; line: string };

/** Line-based LCS diff for readable text comparison (small/medium inputs). */
export function diffLines(a: string, b: string): LineDiffRow[] {
  const A = a.split('\n');
  const B = b.split('\n');
  const n = A.length;
  const m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: LineDiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) {
      out.push({ kind: 'same', line: A[i] });
      i += 1;
      j += 1;
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      out.push({ kind: 'add', line: B[j] });
      j += 1;
    } else if (i < n) {
      out.push({ kind: 'remove', line: A[i] });
      i += 1;
    }
  }
  return out;
}

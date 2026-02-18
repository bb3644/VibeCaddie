/**
 * 球场名称标准化：去掉变音符号、标点，转小写并 trim
 * 用于查重和模糊搜索前的预处理
 */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .toLowerCase()
    .trim();
}

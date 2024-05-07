//调用API所用UA
export const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.82";
export const fetch_config_UA = { headers: { "User-Agent": UA } };

/**
 * bili duration(时长ms)转 min+s
 * @param {number} milliseconds
 * @returns
 */
export function formatMillisecondsToMinutesAndSeconds(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}min${seconds < 10 ? "0" : ""}${seconds}s`;
}

/**
 * unix时间戳(秒s)格式化为 yyyy-MM-dd_HH-mm-ss
 * @param {number} timestamp
 * @returns
 */
export function formatUnixTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hour}-${minute}-${second}`;
}

/**
 * 去除文件名中的非法字符
 * @param input 原文件名
 * @param [re="_"] 替换值
 * @param [filterSlash=false] 是否替换斜杠
 */
export function getValidFileName(input: string, re = "_", filterSlash = false) {
  let title = input;
  const InvalidChars = [
    34, 60, 62, 124, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 58, 42, 63, 92,
    47,
  ].map((charCode) => String.fromCharCode(charCode));
  for (const invalidChar of InvalidChars) {
    title = title.replaceAll(invalidChar, re);
  }
  if (filterSlash) {
    title = title.replaceAll("/", re);
    title = title.replaceAll("\\", re);
  }
  return title;
}

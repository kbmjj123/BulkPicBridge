/**
 * exifReader — EXIF 隐私体检模块
 * 全程在客户端完成，图片数据不离开本地
 *
 * ⚠️ 注意：此模块不依赖任何第三方库，手动解析 JPEG/TIFF EXIF 二进制
 *    如需更完整的 EXIF 支持，可替换为 exifr 库（npm install exifr）
 */

export interface ExifData {
  /** 是否包含 GPS 信息（高风险） */
  hasGPS: boolean;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAltitude?: number;
  /** 拍摄设备 */
  make?: string;
  model?: string;
  /** 拍摄时间 */
  dateTime?: string;
  dateTimeOriginal?: string;
  /** 软件/编辑信息 */
  software?: string;
  /** 版权信息 */
  copyright?: string;
  /** 作者 */
  artist?: string;
  /** 原始完整 EXIF 字段（用于完整版展示） */
  raw?: Record<string, string | number>;
}

export interface ExifRiskReport {
  riskLevel: 'high' | 'medium' | 'low' | 'none';
  risks: string[];
  data: ExifData;
  summary: string;
}

// EXIF Tag ID 对照表（部分常用字段）
const EXIF_TAGS: Record<number, string> = {
  0x010F: 'make',
  0x0110: 'model',
  0x0112: 'orientation',
  0x011A: 'xResolution',
  0x011B: 'yResolution',
  0x0128: 'resolutionUnit',
  0x0131: 'software',
  0x0132: 'dateTime',
  0x013B: 'artist',
  0x8298: 'copyright',
  0x8769: 'exifIFDPointer',
  0x8825: 'gpsIFDPointer',
  0x9003: 'dateTimeOriginal',
  0x9004: 'dateTimeDigitized',
  0x9c9b: 'xpTitle',
  0x9c9d: 'xpKeywords',
};

const GPS_TAGS: Record<number, string> = {
  0x0000: 'gpsVersionID',
  0x0001: 'gpsLatitudeRef',
  0x0002: 'gpsLatitude',
  0x0003: 'gpsLongitudeRef',
  0x0004: 'gpsLongitude',
  0x0005: 'gpsAltitudeRef',
  0x0006: 'gpsAltitude',
  0x0007: 'gpsTimeStamp',
  0x0012: 'gpsMapDatum',
  0x001D: 'gpsDateStamp',
};

/**
 * 读取 DataView 中的字符串
 */
function readString(view: DataView, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    const char = view.getUint8(offset + i);
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  return str.trim();
}

/**
 * 读取 Rational（分数）值
 */
function readRational(view: DataView, offset: number, littleEndian: boolean): number {
  const numerator = view.getUint32(offset, littleEndian);
  const denominator = view.getUint32(offset + 4, littleEndian);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * 读取 IFD 目录中的标签值
 */
function readTagValue(
  view: DataView,
  offset: number,
  littleEndian: boolean
): string | number | null {
  const type = view.getUint16(offset + 2, littleEndian);
  const count = view.getUint32(offset + 4, littleEndian);
  const valueOffset = view.getUint32(offset + 8, littleEndian);

  switch (type) {
    case 2: { // ASCII
      const strOffset = count <= 4 ? offset + 8 : valueOffset;
      return readString(view, strOffset, count);
    }
    case 3: // SHORT
      return count === 1 ? view.getUint16(offset + 8, littleEndian) : null;
    case 4: // LONG
      return count === 1 ? view.getUint32(offset + 8, littleEndian) : null;
    case 5: { // RATIONAL
      if (count === 1) return readRational(view, valueOffset, littleEndian);
      if (count === 3) {
        // GPS 坐标（度/分/秒）
        const deg = readRational(view, valueOffset, littleEndian);
        const min = readRational(view, valueOffset + 8, littleEndian);
        const sec = readRational(view, valueOffset + 16, littleEndian);
        return deg + min / 60 + sec / 3600;
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * 解析 IFD（Image File Directory）
 */
function parseIFD(
  view: DataView,
  ifdOffset: number,
  littleEndian: boolean,
  tagMap: Record<number, string>
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  try {
    const entryCount = view.getUint16(ifdOffset, littleEndian);
    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      const tagId = view.getUint16(entryOffset, littleEndian);
      const tagName = tagMap[tagId];
      if (!tagName) continue;
      const value = readTagValue(view, entryOffset, littleEndian);
      if (value !== null) {
        result[tagName] = value;
      }
    }
  } catch {
    // 解析出错时静默失败
  }
  return result;
}

/**
 * 解析 JPEG 中的 EXIF APP1 段
 */
function parseExifFromBuffer(buffer: ArrayBuffer): ExifData | null {
  const view = new DataView(buffer);

  // 检查 JPEG 标识
  if (view.getUint16(0) !== 0xFFD8) return null;

  let offset = 2;
  let exifOffset = -1;

  // 遍历 JPEG segments 找到 APP1 (0xFFE1)
  while (offset < view.byteLength - 2) {
    const marker = view.getUint16(offset);
    if (marker === 0xFFE1) {
      // APP1 段
      const segmentLength = view.getUint16(offset + 2);
      // 检查 "Exif\0\0" 标识
      const exifHeader = readString(view, offset + 4, 6);
      if (exifHeader.startsWith('Exif')) {
        exifOffset = offset + 10; // TIFF 数据从这里开始
        break;
      }
      offset += 2 + segmentLength;
    } else if ((marker & 0xFF00) === 0xFF00) {
      if (offset + 2 >= view.byteLength) break;
      const segLen = view.getUint16(offset + 2);
      offset += 2 + segLen;
    } else {
      break;
    }
  }

  if (exifOffset === -1) return null;

  // 确定字节序
  const byteOrder = view.getUint16(exifOffset);
  const littleEndian = byteOrder === 0x4949; // 'II' = little endian, 'MM' = big endian

  // 读取 IFD0 偏移量
  const ifd0Offset = exifOffset + view.getUint32(exifOffset + 4, littleEndian);
  const ifd0 = parseIFD(view, ifd0Offset, littleEndian, EXIF_TAGS);

  const exifData: ExifData = {
    hasGPS: false,
    raw: { ...ifd0 },
  };

  // 提取基础字段
  if (typeof ifd0['make'] === 'string') exifData.make = ifd0['make'];
  if (typeof ifd0['model'] === 'string') exifData.model = ifd0['model'];
  if (typeof ifd0['dateTime'] === 'string') exifData.dateTime = ifd0['dateTime'];
  if (typeof ifd0['software'] === 'string') exifData.software = ifd0['software'];
  if (typeof ifd0['copyright'] === 'string') exifData.copyright = ifd0['copyright'];
  if (typeof ifd0['artist'] === 'string') exifData.artist = ifd0['artist'];

  // 读取 Exif IFD（含 dateTimeOriginal）
  if (typeof ifd0['exifIFDPointer'] === 'number') {
    const exifIfdOffset = exifOffset + ifd0['exifIFDPointer'];
    const exifIfd = parseIFD(view, exifIfdOffset, littleEndian, EXIF_TAGS);
    if (typeof exifIfd['dateTimeOriginal'] === 'string') {
      exifData.dateTimeOriginal = exifIfd['dateTimeOriginal'];
    }
    Object.assign(exifData.raw!, exifIfd);
  }

  // 读取 GPS IFD
  if (typeof ifd0['gpsIFDPointer'] === 'number') {
    const gpsIfdOffset = exifOffset + ifd0['gpsIFDPointer'];
    const gpsData = parseIFD(view, gpsIfdOffset, littleEndian, GPS_TAGS);

    if (gpsData['gpsLatitude'] !== undefined || gpsData['gpsLongitude'] !== undefined) {
      exifData.hasGPS = true;

      if (typeof gpsData['gpsLatitude'] === 'number') {
        const latRef = gpsData['gpsLatitudeRef'] === 'S' ? -1 : 1;
        exifData.gpsLatitude = latRef * (gpsData['gpsLatitude'] as number);
      }
      if (typeof gpsData['gpsLongitude'] === 'number') {
        const lonRef = gpsData['gpsLongitudeRef'] === 'W' ? -1 : 1;
        exifData.gpsLongitude = lonRef * (gpsData['gpsLongitude'] as number);
      }
      if (typeof gpsData['gpsAltitude'] === 'number') {
        exifData.gpsAltitude = gpsData['gpsAltitude'] as number;
      }

      Object.assign(exifData.raw!, gpsData);
    }
  }

  return exifData;
}

/**
 * 对 URL 图片进行 EXIF 体检
 */
export async function checkExifFromUrl(imageUrl: string): Promise<ExifData | null> {
  try {
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    return parseExifFromBuffer(buffer);
  } catch {
    return null;
  }
}

/**
 * 对 Blob 图片进行 EXIF 体检
 */
export async function checkExifFromBlob(blob: Blob): Promise<ExifData | null> {
  try {
    const buffer = await blob.arrayBuffer();
    return parseExifFromBuffer(buffer);
  } catch {
    return null;
  }
}

/**
 * 生成风险报告
 */
export function generateRiskReport(exif: ExifData | null): ExifRiskReport {
  if (!exif) {
    return {
      riskLevel: 'none',
      risks: [],
      data: { hasGPS: false },
      summary: '✅ 未检测到 EXIF 信息或不支持该图片格式',
    };
  }

  const risks: string[] = [];

  if (exif.hasGPS) {
    risks.push(`🔴 GPS 位置信息（纬度: ${exif.gpsLatitude?.toFixed(6)}, 经度: ${exif.gpsLongitude?.toFixed(6)}）`);
  }
  if (exif.make || exif.model) {
    risks.push(`🟡 设备型号：${[exif.make, exif.model].filter(Boolean).join(' ')}`);
  }
  if (exif.dateTimeOriginal || exif.dateTime) {
    risks.push(`🟡 拍摄时间：${exif.dateTimeOriginal || exif.dateTime}`);
  }
  if (exif.software) {
    risks.push(`🟡 编辑软件：${exif.software}`);
  }
  if (exif.artist) {
    risks.push(`🟡 作者信息：${exif.artist}`);
  }
  if (exif.copyright) {
    risks.push(`🟡 版权信息：${exif.copyright}`);
  }

  const riskLevel =
    exif.hasGPS ? 'high'
    : risks.length >= 3 ? 'medium'
    : risks.length > 0 ? 'low'
    : 'none';

  const summaryMap = {
    high: '⚠️ 高风险：此图片含有 GPS 位置信息，建议立即前往 BulkPicTools 一键擦除',
    medium: '⚠️ 中风险：此图片含有多项隐私信息，建议脱敏后再分享',
    low: '⚠️ 低风险：此图片含有设备或时间信息',
    none: '✅ 未检测到隐私风险',
  };

  return {
    riskLevel,
    risks,
    data: exif,
    summary: summaryMap[riskLevel],
  };
}

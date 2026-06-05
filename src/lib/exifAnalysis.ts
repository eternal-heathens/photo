import type { ExifSummary } from "../types/analysisV2";

const TAG_MAKE = 0x010f;
const TAG_MODEL = 0x0110;
const TAG_ORIENTATION = 0x0112;
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_EXPOSURE_TIME = 0x829a;
const TAG_F_NUMBER = 0x829d;
const TAG_ISO = 0x8827;
const TAG_PHOTOGRAPHIC_SENSITIVITY = 0x8833;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const TAG_EXPOSURE_BIAS = 0x9204;
const TAG_FOCAL_LENGTH = 0x920a;
const TAG_LENS_MODEL = 0xa434;

type EndianReader = {
  littleEndian: boolean;
  getUint16: (offset: number) => number;
  getUint32: (offset: number) => number;
  getInt32: (offset: number) => number;
};

function emptyExifSummary(): ExifSummary {
  return {
    hasGps: false,
    gpsRemovedInExport: true,
  };
}

function findExifTiffStart(view: DataView) {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    const segmentLength = view.getUint16(offset + 2);

    if (marker === 0xe1) {
      const headerOffset = offset + 4;
      const header = String.fromCharCode(
        view.getUint8(headerOffset),
        view.getUint8(headerOffset + 1),
        view.getUint8(headerOffset + 2),
        view.getUint8(headerOffset + 3),
        view.getUint8(headerOffset + 4),
        view.getUint8(headerOffset + 5),
      );

      if (header === "Exif\u0000\u0000") {
        return headerOffset + 6;
      }
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function createReader(view: DataView, tiffStart: number): EndianReader | null {
  const byteOrder = String.fromCharCode(view.getUint8(tiffStart), view.getUint8(tiffStart + 1));
  const littleEndian = byteOrder === "II";

  if (!littleEndian && byteOrder !== "MM") return null;
  if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return null;

  return {
    littleEndian,
    getUint16: (offset: number) => view.getUint16(offset, littleEndian),
    getUint32: (offset: number) => view.getUint32(offset, littleEndian),
    getInt32: (offset: number) => view.getInt32(offset, littleEndian),
  };
}

function typeByteSize(type: number) {
  switch (type) {
    case 1:
    case 2:
    case 7:
      return 1;
    case 3:
      return 2;
    case 4:
    case 9:
      return 4;
    case 5:
    case 10:
      return 8;
    default:
      return 0;
  }
}

function readAscii(view: DataView, offset: number, count: number) {
  let value = "";
  for (let index = 0; index < count && offset + index < view.byteLength; index += 1) {
    const code = view.getUint8(offset + index);
    if (code === 0) break;
    value += String.fromCharCode(code);
  }
  return value.trim();
}

function formatExposure(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return undefined;
  if (seconds >= 1) return `${Number(seconds.toFixed(2))}s`;
  const denominator = Math.round(1 / seconds);
  return `1/${denominator}s`;
}

function readEntryValue(
  view: DataView,
  reader: EndianReader,
  tiffStart: number,
  entryOffset: number,
) {
  const type = reader.getUint16(entryOffset + 2);
  const count = reader.getUint32(entryOffset + 4);
  const byteSize = typeByteSize(type) * count;
  const valueOffset = byteSize <= 4 ? entryOffset + 8 : tiffStart + reader.getUint32(entryOffset + 8);

  if (valueOffset < 0 || valueOffset >= view.byteLength) return undefined;

  if (type === 2) return readAscii(view, valueOffset, count);
  if (type === 3) return count === 1 ? reader.getUint16(valueOffset) : undefined;
  if (type === 4) return count === 1 ? reader.getUint32(valueOffset) : undefined;
  if (type === 9) return count === 1 ? reader.getInt32(valueOffset) : undefined;
  if (type === 5 && count === 1) {
    const numerator = reader.getUint32(valueOffset);
    const denominator = reader.getUint32(valueOffset + 4);
    return denominator ? numerator / denominator : undefined;
  }
  if (type === 10 && count === 1) {
    const numerator = reader.getInt32(valueOffset);
    const denominator = reader.getInt32(valueOffset + 4);
    return denominator ? numerator / denominator : undefined;
  }

  return undefined;
}

function readIfd(view: DataView, reader: EndianReader, tiffStart: number, ifdOffset: number) {
  const entries = new Map<number, unknown>();
  const absoluteOffset = tiffStart + ifdOffset;

  if (absoluteOffset < 0 || absoluteOffset + 2 > view.byteLength) return entries;

  const entryCount = reader.getUint16(absoluteOffset);
  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = absoluteOffset + 2 + index * 12;
    if (entryOffset + 12 > view.byteLength) break;
    const tag = reader.getUint16(entryOffset);
    entries.set(tag, readEntryValue(view, reader, tiffStart, entryOffset));
  }

  return entries;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function extractExifSummary(file: File): Promise<ExifSummary> {
  if (!file.type.includes("jpeg") && !/\.jpe?g$/i.test(file.name)) {
    return emptyExifSummary();
  }

  try {
    const buffer = await file.slice(0, Math.min(file.size, 1024 * 512)).arrayBuffer();
    const view = new DataView(buffer);
    const tiffStart = findExifTiffStart(view);
    if (tiffStart === null) return emptyExifSummary();

    const reader = createReader(view, tiffStart);
    if (!reader) return emptyExifSummary();

    const firstIfdOffset = reader.getUint32(tiffStart + 4);
    const ifd0 = readIfd(view, reader, tiffStart, firstIfdOffset);
    const exifIfdPointer = numberValue(ifd0.get(TAG_EXIF_IFD));
    const gpsIfdPointer = numberValue(ifd0.get(TAG_GPS_IFD));
    const exif = exifIfdPointer ? readIfd(view, reader, tiffStart, exifIfdPointer) : new Map<number, unknown>();
    const exposureTime = numberValue(exif.get(TAG_EXPOSURE_TIME));

    return {
      cameraMake: stringValue(ifd0.get(TAG_MAKE)),
      cameraModel: stringValue(ifd0.get(TAG_MODEL)),
      lensModel: stringValue(exif.get(TAG_LENS_MODEL)),
      focalLengthMm: numberValue(exif.get(TAG_FOCAL_LENGTH)),
      aperture: numberValue(exif.get(TAG_F_NUMBER)),
      shutterSpeed: formatExposure(exposureTime),
      iso: numberValue(exif.get(TAG_ISO)) ?? numberValue(exif.get(TAG_PHOTOGRAPHIC_SENSITIVITY)),
      exposureCompensation: numberValue(exif.get(TAG_EXPOSURE_BIAS)),
      takenAt: stringValue(exif.get(TAG_DATE_TIME_ORIGINAL)),
      orientation: numberValue(ifd0.get(TAG_ORIENTATION)),
      hasGps: Boolean(gpsIfdPointer),
      gpsRemovedInExport: true,
    };
  } catch {
    return emptyExifSummary();
  }
}

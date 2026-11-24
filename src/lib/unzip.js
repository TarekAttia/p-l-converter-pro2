export async function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  let eocd = -1;
  const floor = Math.max(0, bytes.length - 66000);
  for (let i = bytes.length - 22; i >= floor; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("That file is not a readable packaged workbook (.twbx).");

  const total = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = [];

  for (let i = 0; i < total; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = bytes.slice(dataStart, dataStart + compressedSize);

    entries.push({ name, method, data });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

export async function readEntryText(entry) {
  if (entry.method === 0) return new TextDecoder().decode(entry.data);
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot unpack .twbx files. Export the workbook as .twb and try again.");
  }
  const stream = new Blob([entry.data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const buffer = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buffer);
}

export async function readPackagedWorkbook(buffer) {
  const entries = await readZipEntries(buffer);
  const entry = entries.find((item) => item.name.toLowerCase().endsWith(".twb"));
  if (!entry) throw new Error("No .twb workbook was found inside that .twbx package.");
  return readEntryText(entry);
}
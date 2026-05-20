export interface VttSegment {
  time: string;
  speaker: string;
  text: string;
}

export function parseVtt(content: string): VttSegment[] {
  const segments: VttSegment[] = [];
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    if (!lines[i].includes('-->')) { i++; continue; }

    const time = lines[i].split('-->')[0].trim().slice(0, 8); // HH:MM:SS
    i++;

    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '') {
      textLines.push(lines[i]);
      i++;
    }

    const raw = textLines.join('\n').trim();
    if (!raw) continue;

    // Teams format: <v Speaker>text</v>
    const vMatch = raw.match(/^<v ([^>]+)>([\s\S]*?)<\/v>$/);
    if (vMatch) {
      segments.push({ time, speaker: vMatch[1].trim(), text: vMatch[2].trim() });
      continue;
    }

    // "Speaker: text" on the first line
    const colonMatch = raw.match(/^([^:\n]{1,40}):\s+([\s\S]+)$/);
    if (colonMatch) {
      segments.push({ time, speaker: colonMatch[1].trim(), text: colonMatch[2].trim() });
      continue;
    }

    if (raw) segments.push({ time, speaker: '', text: raw });
  }

  return segments;
}

// Merge consecutive cues from the same speaker to reduce noise
function mergeConsecutive(segments: VttSegment[]): VttSegment[] {
  const merged: VttSegment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && last.speaker && last.speaker === seg.speaker) {
      last.text += ' ' + seg.text;
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

export function vttToText(content: string): string {
  const segments = mergeConsecutive(parseVtt(content));
  return segments
    .map(s => s.speaker ? `[${s.time}] ${s.speaker}：${s.text}` : `[${s.time}] ${s.text}`)
    .join('\n');
}

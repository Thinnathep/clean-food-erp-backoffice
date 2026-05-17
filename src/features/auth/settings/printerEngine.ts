export const encodeThaiCP874 = (text: string): Uint8Array => {
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x0E01 && code <= 0x0E5B) {
      bytes.push(code - 0x0E00 + 0xA0);
    } else if (code <= 0x7F) {
      bytes.push(code);
    } else {
      bytes.push(32); // Space
    }
  }
  return new Uint8Array(bytes);
};

export const encodeThaiOverprint = (text: string): Uint8Array => {
  const isBaseChar = (char: string): boolean => {
    const code = char.charCodeAt(0);
    if (code < 0x0E00 || code > 0x0E7F) return true;
    const baseCodes = [
      0x0E01, 0x0E02, 0x0E03, 0x0E04, 0x0E05, 0x0E06, 0x0E07, 0x0E08, 0x0E09, 0x0E0A, 0x0E0B, 0x0E0C, 0x0E0D, 0x0E0E, 0x0E0F,
      0x0E10, 0x0E11, 0x0E12, 0x0E13, 0x0E14, 0x0E15, 0x0E16, 0x0E17, 0x0E18, 0x0E19, 0x0E1A, 0x0E1B, 0x0E1C, 0x0E1D, 0x0E1E, 0x0E1F,
      0x0E20, 0x0E21, 0x0E22, 0x0E23, 0x0E24, 0x0E25, 0x0E26, 0x0E27, 0x0E28, 0x0E29, 0x0E2A, 0x0E2B, 0x0E2C, 0x0E2D, 0x0E2E, 0x0E2F,
      0x0E30, 0x0E32, 0x0E33, 0x0E3F, 0x0E40, 0x0E41, 0x0E42, 0x0E43, 0x0E44, 0x0E45, 0x0E46, 0x0E4F, 0x0E50, 0x0E51, 0x0E52, 0x0E53,
      0x0E54, 0x0E55, 0x0E56, 0x0E57, 0x0E58, 0x0E59, 0x0E5A, 0x0E5B
    ];
    return baseCodes.includes(code);
  };

  const isAboveVowel = (char: string): boolean => {
    const code = char.charCodeAt(0);
    const aboveVowels = [0x0E31, 0x0E34, 0x0E35, 0x0E36, 0x0E37, 0x0E47, 0x0E4D];
    return aboveVowels.includes(code);
  };

  const isToneMark = (char: string): boolean => {
    const code = char.charCodeAt(0);
    const toneMarks = [0x0E48, 0x0E49, 0x0E4A, 0x0E4B, 0x0E4C, 0x0E4E];
    return toneMarks.includes(code);
  };

  const isBelowVowel = (char: string): boolean => {
    const code = char.charCodeAt(0);
    const belowVowels = [0x0E38, 0x0E39, 0x0E3A];
    return belowVowels.includes(code);
  };

  const lines = text.split('\n');
  const finalBytes: number[] = [];

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    if (line.length === 0 && l === lines.length - 1) {
      continue;
    }
    if (line.length === 0) {
      finalBytes.push(0x0A);
      continue;
    }

    const baseLine: string[] = [];
    const aboveVowelLine: string[] = [];
    const toneLine: string[] = [];
    const belowLine: string[] = [];

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (isBaseChar(char)) {
        baseLine.push(char);
        aboveVowelLine.push(' ');
        toneLine.push(' ');
        belowLine.push(' ');
      } else if (isAboveVowel(char)) {
        if (aboveVowelLine.length > 0) {
          aboveVowelLine[aboveVowelLine.length - 1] = char;
        }
      } else if (isToneMark(char)) {
        if (toneLine.length > 0) {
          toneLine[toneLine.length - 1] = char;
        }
      } else if (isBelowVowel(char)) {
        if (belowLine.length > 0) {
          belowLine[belowLine.length - 1] = char;
        }
      }
    }

    const hasAbove = aboveVowelLine.some(c => c !== ' ');
    const hasTone = toneLine.some(c => c !== ' ');
    const hasBelow = belowLine.some(c => c !== ' ');

    const addBytes = (chars: string[]) => {
      const encoded = encodeThaiCP874(chars.join(''));
      finalBytes.push(...Array.from(encoded));
    };

    if (!hasAbove && !hasTone && !hasBelow) {
      addBytes(baseLine);
      finalBytes.push(0x0A);
    } else {
      finalBytes.push(0x1B, 0x33, 0);

      if (hasAbove) {
        addBytes(aboveVowelLine);
        finalBytes.push(0x0A);
      }

      if (hasTone) {
        addBytes(toneLine);
        finalBytes.push(0x0A);
      }

      if (hasBelow) {
        addBytes(belowLine);
        finalBytes.push(0x0A);
      }

      finalBytes.push(0x1B, 0x32);
      addBytes(baseLine);
      finalBytes.push(0x0A);
    }
  }

  return new Uint8Array(finalBytes);
};

export const convertCanvasToEscPosBytes = (canvas: HTMLCanvasElement): Uint8Array => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array();

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const bytesWidth = width / 8;
  const imageBytes = new Uint8Array(bytesWidth * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < bytesWidth; x++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const pixelX = x * 8 + bit;
        const index = (y * width + pixelX) * 4;
        
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];

        const gray = (r + g + b) / 3;
        const isBlack = a > 50 && gray < 128;

        if (isBlack) {
          byteVal |= (1 << (7 - bit));
        }
      }
      imageBytes[y * bytesWidth + x] = byteVal;
    }
  }

  const xL = bytesWidth % 256;
  const xH = Math.floor(bytesWidth / 256);
  const yL = height % 256;
  const yH = Math.floor(height / 256);

  const header = new Uint8Array([
    0x1D, 0x76, 0x30, 0x00,
    xL, xH,
    yL, yH
  ]);

  const result = new Uint8Array(header.length + imageBytes.length);
  result.set(header, 0);
  result.set(imageBytes, header.length);
  return result;
};

export const renderTextToCanvas = (
  text: string, 
  width: number = 576, // Optimized default for 80mm
  activeFont: string = 'Tahoma'
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  let lines = text.split('\n');
  
  // Trim leading empty lines to eliminate any empty top paper space
  while (lines.length > 0 && lines[0].trim().length === 0) {
    lines.shift();
  }
  // Trim trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1].trim().length === 0) {
    lines.pop();
  }
  
  // Dynamic scaling based on paper width
  const isLarge = width >= 500;
  const lineHeight = isLarge ? 38 : 30; // Compact vertical spacing
  const padding = isLarge ? 20 : 10;
  
  const titleSize = isLarge ? 34 : 24;
  const bodySize = isLarge ? 24 : 17; // Larger body text for high readability
  const dividerHeight = isLarge ? 2 : 1.5;
  
  canvas.width = width;
  canvas.height = lines.length * lineHeight + 20; // Tighter vertical margins
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'middle';
  
  for (let i = 0; i < lines.length; i++) {
    const origLine = lines[i];
    let line = origLine.trim();
    if (line.length === 0) continue;
    
    const y = i * lineHeight + lineHeight / 2 + 10; // Tight top padding
    
    // Check if line should be bold or italic
    let isBold = false;
    let isItalic = false;
    
    if (line.startsWith("[I]")) {
      isItalic = true;
      line = line.substring(3).trim();
    } else if (line.startsWith("**") && line.endsWith("**")) {
      isBold = true;
      line = line.substring(2, line.length - 2).trim();
    } else if (line.startsWith("[B]")) {
      isBold = true;
      line = line.substring(3).trim();
    }

    const fontWeight = isBold ? 'bold' : 'normal';
    const fontStyle = isItalic ? 'italic' : 'normal';
    
    // Thin, elegant appearance for italics using a soft charcoal color (#555555)
    ctx.fillStyle = isItalic ? '#555555' : '#000000';
    
    // Draw beautiful vector dashed lines for dividers
    if (line.startsWith("---") || line.startsWith("===")) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = line.startsWith("===") ? dividerHeight * 1.5 : dividerHeight;
      ctx.beginPath();
      // Use clean vector dash patterns: [8, 6] for double dashed, [5, 4] for single dashed
      ctx.setLineDash(line.startsWith("===") ? [12, 6] : [6, 4]);
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash
      continue;
    }
    
    // Center-align main headers
    if (
      line === "CLEAN FOOD CR" || 
      line === "ใบสั่งเตรียมอาหาร KDS" || 
      line === "ออเดอร์อาหาร Clean Food CR" ||
      (isBold && (line.includes("ใบสั่งเตรียมอาหาร") || line.includes("Clean Food") || line.includes("CLEAN FOOD")))
    ) {
      ctx.font = `${fontStyle} ${fontWeight} ${titleSize}px '${activeFont}', 'Sarabun', 'Prompt', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(line, width / 2, y);
    } else if (line.includes(" | ")) {
      // Split by ' | ' and keep individual cell weights if prefixed
      const parts = line.split(" | ");
      const leftText = parts[0].trim();
      const rightText = parts[1].trim();
      
      // Parse individual bold prefixes if present
      let leftBold = isBold;
      let leftClean = leftText;
      if (leftText.startsWith("[B]")) {
        leftBold = true;
        leftClean = leftText.substring(3).trim();
      }
      
      let rightBold = isBold;
      let rightClean = rightText;
      if (rightText.startsWith("[B]")) {
        rightBold = true;
        rightClean = rightText.substring(3).trim();
      }

      ctx.font = `${fontStyle} ${leftBold ? 'bold' : 'normal'} ${bodySize}px '${activeFont}', 'Sarabun', 'Prompt', sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(leftClean, padding, y);
      
      ctx.font = `${fontStyle} ${rightBold ? 'bold' : 'normal'} ${bodySize}px '${activeFont}', 'Sarabun', 'Prompt', sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(rightClean, width - padding, y);
    } else {
      ctx.font = `${fontStyle} ${fontWeight} ${bodySize}px '${activeFont}', 'Sarabun', 'Prompt', sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(line, padding, y);
    }
  }
  
  return canvas;
};

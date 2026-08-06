const awb = "MMC1234";

const baseAwb = awb.trim();
const variations = new Set([baseAwb]);

// Add uppercase/lowercase variants
variations.add(baseAwb.toUpperCase());
variations.add(baseAwb.toLowerCase());

if (/^\d+$/.test(baseAwb)) {
  variations.add(`MMC-${baseAwb}`);
  variations.add(`MMC${baseAwb}`);
  variations.add(`mmc-${baseAwb}`);
  variations.add(`mmc${baseAwb}`);
} 
else if (/^mmc-?\d+$/i.test(baseAwb)) {
  const numMatch = baseAwb.match(/\d+/);
  if (numMatch) {
    const num = numMatch[0];
    variations.add(num);
    variations.add(`MMC-${num}`);
    variations.add(`MMC${num}`);
    variations.add(`mmc-${num}`);
    variations.add(`mmc${num}`);
  }
}

console.log(Array.from(variations).slice(0, 10));

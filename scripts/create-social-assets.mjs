import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
// Compose separate sharing assets. Never overwrite or regenerate the master.
const original = "public/dinosaur_jungle_birthday_invitation_artwork.png";
const card = await sharp(original).resize({ height: 554 }).png().toBuffer();
const backdrop = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f6f4ec"/><rect x="866" y="44" width="243" height="554" rx="3" fill="#dce2cf"/><g fill="#314b38"><text x="94" y="158" font-family="Arial" font-size="16" letter-spacing="4">YOU’RE INVITED</text><text x="89" y="261" font-family="Georgia" font-size="69">A little roar.</text><text x="89" y="343" font-family="Georgia" font-style="italic" font-size="69" fill="#71845e">A big celebration.</text><text x="94" y="414" font-family="Arial" font-size="28">Zunain is turning three!</text><path d="M94 451h72" stroke="#c97340" stroke-width="3"/><text x="94" y="494" font-family="Arial" font-size="19">21 November 2026 · 6:30 PM</text><text x="94" y="527" font-family="Arial" font-size="18" fill="#6b7669">Lakeshore Heights · Gulshan 1, Dhaka</text></g></svg>`);
await sharp(backdrop).composite([{ input: card, left: 854, top: 38 }]).jpeg({ quality: 93, mozjpeg: true }).toFile("public/social-preview.jpg");
const icon = await readFile("app/icon.svg");
await sharp(icon).resize(180, 180).png().toFile("public/apple-icon.png");
const faviconPng = await sharp(icon).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4); header[6] = 32; header[7] = 32;
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(faviconPng.length, 14); header.writeUInt32LE(22, 18);
await writeFile("app/favicon.ico", Buffer.concat([header, faviconPng]));
console.log("Created 1200 × 630 social preview, Apple icon, and favicon.");

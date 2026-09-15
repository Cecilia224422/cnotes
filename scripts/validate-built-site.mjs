import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

if (html.includes("bytes omitted")) {
  throw new Error("index.html contains a truncation marker.");
}

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
if (scripts.length === 0) {
  throw new Error("index.html contains no inline script.");
}

for (const [index, match] of scripts.entries()) {
  new vm.Script(match[1], { filename: `index-inline-${index + 1}.js` });
}

const configPrefix = "staticryptConfig = ";
const configStart = html.indexOf(configPrefix);
const configEnd = html.indexOf(";", configStart);
if (configStart === -1 || configEnd === -1) {
  throw new Error("Could not locate the StatiCrypt configuration.");
}

const config = JSON.parse(
  html.slice(configStart + configPrefix.length, configEnd),
);
const encrypted = config.staticryptEncryptedMsgUniqueVariableName;
if (typeof encrypted !== "string" || encrypted.length < 100_000) {
  throw new Error("The encrypted payload is missing or unexpectedly short.");
}
if (!/^[0-9a-f]+$/i.test(encrypted) || encrypted.length % 2 !== 0) {
  throw new Error("The encrypted payload is not complete hexadecimal data.");
}

console.log(
  `Validated ${scripts.length} script block(s); encrypted payload ${encrypted.length} hex characters.`,
);

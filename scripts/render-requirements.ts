import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
const markdown = await readFile("docs/requirements.md", "utf8");
function escape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
const html = markdown
  .split("\n")
  .map((line) =>
    line.startsWith("# ")
      ? `<h1>${escape(line.slice(2))}</h1>`
      : line.startsWith("## ")
        ? `<h2>${escape(line.slice(3))}</h2>`
        : line.startsWith("- ")
          ? `<p class="item">• ${escape(line.slice(2))}</p>`
          : line
            ? `<p>${escape(line).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")}</p>`
            : "",
  )
  .join("");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 794, height: 1123 },
  });
  await page.setContent(
    `<html><head><style>@page{size:A4;margin:15mm}body{font-family:Arial,sans-serif;color:#18302d;font-size:10pt;line-height:1.35;margin:0}h1{font-size:20pt;margin:0 0 12px}h2{font-size:12pt;margin:16px 0 6px;color:#197653}p{margin:7px 0}.item{padding-left:10px}</style></head><body>${html}</body></html>`,
  );
  await mkdir("docs/artifacts", { recursive: true });
  await page.pdf({
    path: "docs/artifacts/requirements.pdf",
    format: "A4",
    printBackground: true,
  });
  await page.screenshot({
    path: ".data/requirements-preview.png",
    fullPage: true,
  });
} finally {
  await browser.close();
}

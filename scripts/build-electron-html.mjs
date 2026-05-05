import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist", "client");
const assetsDir = path.join(distDir, "assets");

function getAssets() {
  const files = fs.readdirSync(assetsDir);
  const jsFiles = files.filter(f => f.endsWith(".js") && !f.includes(".map"));
  const mainJs = jsFiles.find(f => f.startsWith("index-Dcusd_BN")) || jsFiles[0];
  const vendorJs = jsFiles.filter(f => f !== mainJs);

  const cssFiles = files.filter(f => f.endsWith(".css"));
  const mainCss = cssFiles.find(f => f.startsWith("styles-"));

  return { mainJs, vendorJs, mainCss };
}

function generateHtml() {
  if (!fs.existsSync(assetsDir)) {
    console.error("dist/client/assets not found. Run `npm run build` first.");
    process.exit(1);
  }

  const { mainJs, vendorJs, mainCss } = getAssets();

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Meeple Vault — Board Game Collection Manager</title>
  <meta name="description" content="Catalog, design and print board games. Manage series, expansions and components in a beautiful tabletop-inspired library.">
  <meta name="author" content="Meeple Vault">
  <meta property="og:title" content="Meeple Vault — Board Game Collection Manager">
  <meta property="og:description" content="Catalog, design and print board games with a tabletop-inspired library.">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  ${mainCss ? `<link rel="stylesheet" href="/assets/${mainCss}">` : ""}
  <script>
    (function(){
      try{
        var d=document.documentElement;
        var m=localStorage.getItem('meeple-vault-theme')||'system';
        var v=localStorage.getItem('meeple-vault-variant')||'tabletop';
        var s=localStorage.getItem('meeple-vault-skin')||'cabinet';
        var r=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark'):m;
        if(r==='dark'){d.classList.add('dark');}
        d.style.colorScheme=r;
        d.classList.remove('theme-tabletop','theme-modern','theme-neon');
        d.classList.add('theme-'+v);
        d.classList.remove('skin-cabinet','skin-workbench','skin-command');
        d.classList.add('skin-'+s);
      }catch(e){}
    })();
  </script>
  ${vendorJs.map(f => `<script type="module" src="/assets/${f}"></script>`).join("\n  ")}
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/assets/${mainJs}"></script>
</body>
</html>`;

  fs.writeFileSync(path.join(distDir, "index.html"), html);
  console.log("Created dist/client/index.html");
}

generateHtml();
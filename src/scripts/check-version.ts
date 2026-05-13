import https from "https";
import * as fs from "fs";
import * as path from "path";

(async () => {
  const root = path.join(__dirname, "../../");
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );

  const latest = await new Promise<string>((res, rej) => {
    https
      .get("https://open-vsx.org/api/renathossain/markdown-runner", (r) => {
        let d = "";
        r.on("data", (c) => (d += c));
        r.on("end", () => res(JSON.parse(d).version));
      })
      .on("error", rej);
  });

  const v = (s: string) => s.split(".").map(Number);
  const [a, b] = [v(pkg.version), v(latest)];

  const ok =
    a[0] > b[0] ||
    (a[0] === b[0] && a[1] > b[1]) ||
    (a[0] === b[0] && a[1] === b[1] && a[2] > b[2]);

  if (!ok) {
    console.error(
      `Version ${pkg.version} must be greater than published ${latest}`,
    );
    process.exit(1);
  }

  console.log(`Version OK: ${pkg.version} > ${latest}`);
})();

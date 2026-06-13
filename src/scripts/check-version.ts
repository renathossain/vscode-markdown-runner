// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025 Renat Hossain

import https from "https";
import fs from "fs";
import path from "path";

(async () => {
  const { version } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8"),
  );
  const latest = await new Promise<string>((res, rej) => {
    https
      .get("https://open-vsx.org/api/renathossain/markdown-runner", (r) => {
        if (r.statusCode !== 200) rej(Error(`${r.statusCode}`));
        let d = "";
        r.on("data", (c) => (d += c))
          .on("end", () => res(JSON.parse(d).version))
          .on("error", rej);
      })
      .on("error", rej);
  });

  if (version.localeCompare(latest, undefined, { numeric: true }) <= 0) {
    console.error(
      `Version ${version} must be greater than published ${latest}`,
    );
    process.exit(1);
  }

  console.log(`Version OK: ${version} > ${latest}`);
})();

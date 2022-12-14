import type { PackageJson } from "type-fest";
import type { Installer } from "~/installers/index.js";
import path from "path";
import fs from "fs-extra";
import { PKG_ROOT } from "~/consts.js";
import { execa } from "~/utils/execAsync.js";

export const prismaInstaller: Installer = async ({
  projectDir,
  runPkgManagerInstall,
  pkgManager,
  packages,
  noInstall,
}) => {
  await runPkgManagerInstall({
    packages: ["prisma"],
    devMode: true,
  });
  await runPkgManagerInstall({
    packages: ["@prisma/client"],
  });

  const prismaAssetDir = path.join(PKG_ROOT, "template/addons/prisma");

  const schemaSrc = path.join(
    prismaAssetDir,
    packages?.nextAuth.inUse ? "auth-schema.prisma" : "schema.prisma",
  );
  const schemaDest = path.join(projectDir, "prisma/schema.prisma");

  const clientSrc = path.join(prismaAssetDir, "client.ts");
  const clientDest = path.join(projectDir, "src/server/db/client.ts");

  const sampleApiRouteSrc = path.join(prismaAssetDir, "sample-api.ts");
  const sampleApiRouteDest = path.join(projectDir, "src/pages/api/examples.ts");

  // add postinstall script to package.json
  const packageJsonPath = path.join(projectDir, "package.json");

  const packageJsonContent = fs.readJSONSync(packageJsonPath) as PackageJson;
  packageJsonContent.scripts!.postinstall = "prisma generate"; //eslint-disable-line @typescript-eslint/no-non-null-assertion

  await Promise.all([
    fs.copy(schemaSrc, schemaDest),
    fs.copy(clientSrc, clientDest),
    fs.copy(sampleApiRouteSrc, sampleApiRouteDest),
    fs.writeJSON(packageJsonPath, packageJsonContent, {
      spaces: 2,
    }),
  ]);

  // only generate client if we have installed the dependencies
  if (!noInstall) {
    const generateClientCmd =
      pkgManager === "npm"
        ? "npx prisma generate"
        : `${pkgManager} prisma generate`;
    await execa(generateClientCmd, { cwd: projectDir });
  }
};

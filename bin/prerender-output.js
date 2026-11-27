import fs from "node:fs/promises";
import path from "node:path";

function containsPath(directory, candidate) {
    const relative = path.relative(directory, candidate);
    return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function resolvePhysicalPath(directory) {
    try {
        return await fs.realpath(directory);
    } catch (error) {
        const parent = path.dirname(directory);
        if (error.code !== "ENOENT" || parent === directory) {
            throw error;
        }

        return path.join(await resolvePhysicalPath(parent), path.basename(directory));
    }
}

export async function validateOutputPaths(srcDir, distDir, cwd, clean) {
    const [physicalSrc, physicalDist, physicalCwd] = await Promise.all([srcDir, distDir, cwd].map(resolvePhysicalPath));

    const overlapsSource = [srcDir, physicalSrc].some((src) =>
        [distDir, physicalDist].some((dist) => containsPath(src, dist) || containsPath(dist, src)),
    );

    if (overlapsSource) {
        throw new Error("--src and --dist must not overlap.");
    }

    const containsWorkingDirectory = [distDir, physicalDist].some((dist) =>
        [cwd, physicalCwd].some((workingDirectory) => containsPath(dist, workingDirectory)),
    );

    if (clean && containsWorkingDirectory) {
        throw new Error(`Refusing to clean unsafe directory: ${distDir}`);
    }
}

export async function writeOutput(distDir, clean, write) {
    if (!clean) {
        await fs.mkdir(distDir, { recursive: true });
        return write(distDir);
    }

    const parent = path.dirname(distDir);
    await fs.mkdir(parent, { recursive: true });
    const stagingDir = await fs.mkdtemp(path.join(parent, ".bitsy-prerender-"));
    const outputDir = path.join(stagingDir, "output");

    try {
        await fs.mkdir(outputDir);
        await write(outputDir);
        await fs.rm(distDir, { recursive: true, force: true });
        await fs.rename(outputDir, distDir);
    } finally {
        await fs.rm(stagingDir, { recursive: true, force: true });
    }
}

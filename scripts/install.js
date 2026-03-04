const axios = require('axios');
const fs = require('fs');
const path = require('path');
const tar = require('tar');

const VERSION = '0.14.0';
const BASE_URL = `https://github.com/AsamK/signal-cli/releases/download/v${VERSION}`;

const platform = process.platform;

/**
 * Recursively search for a file by name within a directory tree.
 * Returns the full path to the first match, or null if not found.
 */
function findFile(dir, filename) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const result = findFile(fullPath, filename);
            if (result) return result;
        } else if (entry.name === filename) {
            return fullPath;
        }
    }
    return null;
}

/**
 * Recursively remove a directory and all its contents.
 * Uses fs.rmSync when available (Node >= 14.14), falls back to a manual walk.
 */
function removeDir(dir) {
    if (typeof fs.rmSync === 'function') {
        fs.rmSync(dir, { recursive: true, force: true });
    } else {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                removeDir(fullPath);
            } else {
                fs.unlinkSync(fullPath);
            }
        }
        fs.rmdirSync(dir);
    }
}

/**
 * Recursively copy all files and directories from srcDir into destDir,
 * merging contents rather than replacing the destination directory wholesale.
 */
function copyDir(srcDir, destDir) {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
            }
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function install() {
    // -------------------------------------------------------------------------
    // 1. Determine download URL per platform
    // -------------------------------------------------------------------------
    // Linux   → native binary tarball  (single self-contained executable)
    //           Extracts directly to:  signal-cli
    //
    // macOS   → generic JVM tarball    (signal-cli-X.Y.Z.tar.gz)
    // Windows → same generic JVM tarball
    //
    //   The generic tarball always extracts into a subdirectory:
    //     signal-cli-X.Y.Z/
    //       bin/signal-cli          ← POSIX shell launcher
    //       bin/signal-cli.bat      ← Windows batch launcher
    //       lib/*.jar               ← JVM runtime dependencies
    //       man/...
    //
    //   The shell launcher computes APP_HOME as the *parent* of the directory
    //   it lives in (i.e. one level above `bin/`), then resolves the classpath
    //   as $APP_HOME/lib/*.jar.  So the layout on disk after installation must
    //   mirror the original tarball structure relative to the project root:
    //
    //     <project-root>/
    //       bin/signal-cli          ← launcher (what SignalCli.ts looks for)
    //       bin/signal-cli.bat
    //       lib/*.jar               ← resolved by launcher as $APP_HOME/lib/
    //       man/...
    //
    //   In other words we extract the tarball directly to the project root so
    //   that signal-cli-X.Y.Z/{bin,lib,...} lands as {bin,lib,...}.
    // -------------------------------------------------------------------------
    let url;
    if (platform === 'linux') {
        url = `${BASE_URL}/signal-cli-${VERSION}-Linux-native.tar.gz`;
    } else {
        url = `${BASE_URL}/signal-cli-${VERSION}.tar.gz`;
    }

    console.log(`Downloading signal-cli v${VERSION} for platform: ${platform}`);
    console.log(`URL: ${url}`);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer',
        // Allow up to 5 minutes for the download on slow connections
        timeout: 300_000,
    });

    // Project root = one level above this script (scripts/../)
    const projectRoot = path.join(__dirname, '..');
    const binDir = path.join(projectRoot, 'bin');

    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
    }

    // -------------------------------------------------------------------------
    // 2. Write the archive to a temp file then extract it
    // -------------------------------------------------------------------------
    const tempFile = path.join(projectRoot, 'signal-cli.tar.gz');
    fs.writeFileSync(tempFile, response.data);

    console.log('Extracting archive...');
    try {
        if (platform === 'linux') {
            // Native Linux tarball: extract directly into binDir.
            // The archive contains a single `signal-cli` executable at its root.
            await tar.x({ file: tempFile, cwd: binDir });
        } else {
            // Generic JVM tarball: extract to projectRoot so that the nested
            // signal-cli-X.Y.Z/{bin,lib,...} layout is preserved relative to root.
            await tar.x({ file: tempFile, cwd: projectRoot });
        }
    } catch (error) {
        console.error('Failed to extract archive:', error.message);
        throw error;
    } finally {
        fs.unlinkSync(tempFile);
    }

    // -------------------------------------------------------------------------
    // 3. Platform-specific post-extraction handling
    // -------------------------------------------------------------------------
    if (platform === 'linux') {
        // Native build: single executable lands directly in binDir.
        const executable = path.join(binDir, 'signal-cli');
        if (!fs.existsSync(executable)) {
            throw new Error(
                `Linux native extraction finished but ${executable} was not found.\n` +
                    `Please check the archive contents at:\n` +
                    `  ${BASE_URL}/signal-cli-${VERSION}-Linux-native.tar.gz`,
            );
        }
        fs.chmodSync(executable, '755');
        console.log('\nLinux: signal-cli native binary is ready.');
        console.log('Location: ' + executable);
    } else {
        // -----------------------------------------------------------------------
        // Generic JVM tarball was extracted to projectRoot, producing:
        //   <projectRoot>/signal-cli-X.Y.Z/{bin,lib,man,...}
        //
        // We need to merge those contents into <projectRoot> so we end up with:
        //   <projectRoot>/bin/signal-cli
        //   <projectRoot>/bin/signal-cli.bat
        //   <projectRoot>/lib/*.jar
        //   <projectRoot>/man/...
        //
        // Then remove the now-redundant signal-cli-X.Y.Z/ directory.
        // -----------------------------------------------------------------------
        let nestedDir = path.join(projectRoot, `signal-cli-${VERSION}`);

        if (!fs.existsSync(nestedDir)) {
            // Fallback: the archive may use a slightly different directory name
            const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
            const subDir = entries.find((e) => e.isDirectory() && e.name.startsWith('signal-cli'));
            if (!subDir) {
                throw new Error(
                    `Could not find the extracted signal-cli directory inside:\n  ${projectRoot}\n` +
                        `Expected a folder named "signal-cli-${VERSION}" or similar.\n` +
                        `The archive may have an unexpected structure.`,
                );
            }
            nestedDir = path.join(projectRoot, subDir.name);
            console.log(`Found extracted directory: ${subDir.name}`);
        }

        // Merge nested dir contents into projectRoot
        copyDir(nestedDir, projectRoot);
        removeDir(nestedDir);

        // Fix permissions on POSIX platforms
        if (platform !== 'win32') {
            const executable = path.join(binDir, 'signal-cli');
            if (!fs.existsSync(executable)) {
                throw new Error(
                    `signal-cli launcher not found at ${executable} after installation.\n` +
                        `Make sure the archive structure matches the expected layout.`,
                );
            }
            fs.chmodSync(executable, '755');

            console.log('\nmacOS/Unix: signal-cli JVM launcher is ready.');
            console.log('Location  : ' + executable);
            console.log('Libs      : ' + path.join(projectRoot, 'lib'));
            console.log('Note      : Java (JDK 17+) must be installed and available in your PATH.');
        } else {
            const batFile = path.join(binDir, 'signal-cli.bat');
            if (!fs.existsSync(batFile)) {
                throw new Error(
                    `signal-cli.bat not found at ${batFile} after installation.\n` +
                        `Make sure the archive structure matches the expected layout.`,
                );
            }
            console.log('\nWindows: signal-cli batch launcher is ready.');
            console.log('Location: ' + batFile);
            console.log('Note    : Java (JDK 17+) must be installed and available in your PATH.');
        }
    }

    console.log('\nsignal-cli installed successfully.\n');
}

install().catch((error) => {
    console.error('\nFailed to install signal-cli:', error.message || error);
    console.error(
        '\nYou can install signal-cli manually:\n' +
            `  1. Download v${VERSION} from:\n` +
            `     https://github.com/AsamK/signal-cli/releases/tag/v${VERSION}\n` +
            `  2. Extract the archive to the project root so that the layout is:\n` +
            `       bin/signal-cli   (or bin/signal-cli.bat on Windows)\n` +
            `       lib/*.jar\n`,
    );
    process.exit(1);
});

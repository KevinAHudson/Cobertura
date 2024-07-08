import { isAbsolute, join } from "path";
import {
  commands,
  Diagnostic,
  DiagnosticSeverity,
  ExtensionContext,
  languages,
  Position,
  Range,
  RelativePattern,
  Uri,
  window,
  workspace,
  WorkspaceFolder,
} from "vscode";

import { Coverage, CoverageCollection } from "./coverage-info";
import {
  CONFIG_OPTION_SEARCH_CRITERIA,
  CONFIG_SECTION_NAME,
  ExtensionConfiguration,
} from "./extension-configuration";
import { parse as parseLcov } from "./parse-lcov";
import { CoverageDecorations } from "./coverage-decorations";
import { FileCoverageInfoProvider } from "./file-coverage-info-provider";
import { StatusBarAlignment } from "vscode";

const COVERED_MESSAGE = "This line is covered";
const UNCOVERED_MESSAGE = "This line is not covered";

export async function activate(context: ExtensionContext) {
  const diagnostics = languages.createDiagnosticCollection("cobertura");
  const coverageByFile = new Map<string, Coverage>();
  const workspaceFolders = workspace.workspaceFolders;
  const coverageDecorations = new CoverageDecorations();

  const statusBar = window.createStatusBarItem();

  let toggleCoverageStatusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Right,
    100,
  );
  toggleCoverageStatusBarItem.command = `cobertura.toggleCoverage`;
  toggleCoverageStatusBarItem.text = `Coverage: ?`;
  toggleCoverageStatusBarItem.tooltip = `Toggle coverage visibility`;
  const extensionConfiguration = new ExtensionConfiguration(
    workspace.getConfiguration(CONFIG_SECTION_NAME),
  );
  toggleCoverageStatusBarItem.show();

  let isShowingCoverage = extensionConfiguration.showCoverage; // Initial state of the coverage visibility

  async function toggleCoverage() {
    isShowingCoverage = !isShowingCoverage;
    return showOrHideCoverage();
  }

  async function showOrHideCoverage() {
    if (isShowingCoverage) {
      toggleCoverageStatusBarItem.text = `Coverage: $(eye)`;
      return showCoverage();
    } else {
      toggleCoverageStatusBarItem.text = `Coverage: $(eye-closed)`;
      return hideCoverage();
    }
  }

  // Register command for toggling coverage visibility
  let toggleCoverageCommand = commands.registerCommand(
    `cobertura.toggleCoverage`,
    toggleCoverage,
  );

  context.subscriptions.push(
    toggleCoverageCommand,
    toggleCoverageStatusBarItem,
  );

  // Register watchers and listen if the coverage file directory has changed
  registerWatchers();
  extensionConfiguration.onConfigOptionUpdated.event((e) => {
    if (e && e === CONFIG_OPTION_SEARCH_CRITERIA) {
      registerWatchers();
    }
  });

  // Create and Register the file decoration provider
  const fileCoverageInfoProvider = new FileCoverageInfoProvider(
    extensionConfiguration,
    coverageByFile,
  );
  const fileCoverageInfoProviderRegistration =
    window.registerFileDecorationProvider(fileCoverageInfoProvider);

  context.subscriptions.push(
    extensionConfiguration,
    diagnostics,
    coverageDecorations,
    statusBar,
    fileCoverageInfoProviderRegistration,
    fileCoverageInfoProvider,
  );

  // Update status bar on changes to any open file
  workspace.onDidChangeTextDocument((e) => {
    if (e) {
      diagnostics.delete(e.document.uri);
      coverageDecorations.removeDecorationsForFile(e.document.uri);
      showDecorations();
    }
  });
  workspace.onDidOpenTextDocument(() => {
    showDecorations();
  });
  workspace.onDidCloseTextDocument(() => {
    showDecorations();
  });
  workspace.onDidChangeConfiguration((e) => {
    if (e) {
      extensionConfiguration.dispatchConfigUpdate(
        e,
        workspace.getConfiguration(CONFIG_SECTION_NAME),
      );
    }
  });
  window.onDidChangeActiveTextEditor(() => {
    showDecorations();
  });

  // Register watchers for file changes on coverage files to re-run the coverage parser
  function registerWatchers() {
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        const pattern = new RelativePattern(
          folder.uri.fsPath,
          extensionConfiguration.searchCriteria,
        );
        const watcher = workspace.createFileSystemWatcher(pattern);
        watcher.onDidChange(() => findDiagnostics(folder));
        watcher.onDidCreate(() => findDiagnostics(folder));
        watcher.onDidDelete(() => findDiagnostics(folder));
      }
    }
  }

  async function hideCoverage() {
    fileCoverageInfoProvider.showFileDecorations = false;
    fileCoverageInfoProvider.changeFileDecorations(
      Array.from(coverageByFile.keys()),
    );
    diagnostics.clear();
    coverageDecorations.clearAllDecorations();
  }

  async function showCoverage() {
    fileCoverageInfoProvider.showFileDecorations = true;
    // Trigger any necessary logic to refresh decorations based on the current state.
    await findDiagnosticsInWorkspace();
  }

  async function findDiagnosticsInWorkspace() {
    if (workspaceFolders) {
      await Promise.all(workspaceFolders.map(findDiagnostics));
      fileCoverageInfoProvider.changeFileDecorations(
        Array.from(coverageByFile.keys()),
      );
    }
  }

  // Finds VSCode diagnostics to display based on a coverage file specified by the search pattern in each workspace folder
  async function findDiagnostics(workspaceFolder: WorkspaceFolder) {
    const searchPattern = new RelativePattern(
      workspaceFolder,
      extensionConfiguration.searchCriteria,
    );
    const files = await workspace.findFiles(searchPattern);
    for (const file of files) {
      const coverages = await parseLcov(file.fsPath);
      recordFileCoverage(coverages, workspaceFolder.uri.fsPath);
      convertDecorations(coverages, workspaceFolder.uri.fsPath);
    }
  }

  function showDecorations() {
    const activeTextEditor = window.activeTextEditor;
    if (!activeTextEditor) {
      statusBar.hide();
      return;
    }
    const fileUri = activeTextEditor.document.uri;
    const filePath = fileUri.fsPath;

    if (coverageByFile.has(filePath)) {
      const coverage = coverageByFile.get(filePath);
      if (coverage) {
        const { lines } = coverage;
        statusBar.text = `Coverage: ${lines.hit}/${lines.found} lines`;
        statusBar.show();

        // Assuming coverage data includes diagnostics for covered and uncovered lines
        const coveredDiagnostics = coverage.lines.details
          .filter((detail) => detail.hit > 0)
          .map((detail) => createDiagnosticForLine(detail.line, true));
        const uncoveredDiagnostics = coverage.lines.details
          .filter((detail) => detail.hit === 0)
          .map((detail) => createDiagnosticForLine(detail.line, false));

        // Apply covered and uncovered decorations directly
        // if (coveredDiagnostics.length > 0) {
        coverageDecorations.addCoveredDecorationsForFile(
          fileUri,
          coveredDiagnostics,
        );
        // }
        // if (uncoveredDiagnostics.length > 0) {
        coverageDecorations.addUncoveredDecorationsForFile(
          fileUri,
          uncoveredDiagnostics,
        );
        // }
      }
    } else {
      statusBar.hide();
    }
  }

  function createDiagnosticForLine(lineNumber: number, covered: boolean) {
    const message = covered
      ? "This line is covered"
      : "This line is not covered";
    return new Diagnostic(
      new Range(lineNumber - 1, 0, lineNumber - 1, Number.MAX_VALUE),
      message,
      DiagnosticSeverity.Information,
    );
  }

  function recordFileCoverage(
    coverages: CoverageCollection,
    workspaceFolder: string,
  ) {
    coverageByFile.clear();
    for (const coverage of coverages) {
      const fileName = !isAbsolute(coverage.file)
        ? join(workspaceFolder, coverage.file)
        : coverage.file;

      coverageByFile.set(fileName, coverage);
    }
    showDecorations();
  }
  function createDiagnostic(detail: any): Diagnostic {
    const range = new Range(
      detail.line - 1,
      0,
      detail.line - 1,
      Number.MAX_VALUE,
    );
    const diagnosticMessage =
      detail.hit > 0 ? COVERED_MESSAGE : UNCOVERED_MESSAGE;
    return new Diagnostic(
      range,
      diagnosticMessage,
      DiagnosticSeverity.Information,
    );
  }

  function convertDecorations(
    coverages: CoverageCollection,
    workspaceFolder: string,
  ): void {
    if (!isShowingCoverage) return;

    const { errorCoverageThreshold, warningCoverageThreshold } =
      extensionConfiguration;

    coverages.forEach((coverage) => {
      if (coverage?.lines?.details) {
        const fileName = isAbsolute(coverage.file)
          ? coverage.file
          : join(workspaceFolder, coverage.file);
        const fileUri = Uri.file(fileName);
        const coveragePercent = Math.floor(
          (coverage.lines.hit / coverage.lines.found) * 100,
        );

        let severity;
        let message;
        if (coveragePercent < errorCoverageThreshold) {
          severity = DiagnosticSeverity.Error;
          message = `Low coverage: ${coveragePercent}% (Threshold: ${errorCoverageThreshold}%)`;
        } else if (coveragePercent < warningCoverageThreshold) {
          severity = DiagnosticSeverity.Warning;
          message = `Low coverage: ${coveragePercent}% (Threshold: ${warningCoverageThreshold}%)`;
        } else {
          return;
        }
        diagnostics.set(fileUri, [
          new Diagnostic(
            new Range(new Position(0, 0), new Position(0, 0)),
            message,
            severity,
          ),
        ]);

        const diagnosticsArray = coverage.lines.details.map(createDiagnostic);
        const coveredDiagnostics = diagnosticsArray.filter(
          (diagnostic) => diagnostic.message === COVERED_MESSAGE,
        );
        const uncoveredDiagnostics = diagnosticsArray.filter(
          (diagnostic) => diagnostic.message === UNCOVERED_MESSAGE,
        );

        // if (coveredDiagnostics.length > 0) {
        coverageDecorations.addCoveredDecorationsForFile(
          fileUri,
          coveredDiagnostics,
        );
        // }
        // if (uncoveredDiagnostics.length > 0) {
        coverageDecorations.addUncoveredDecorationsForFile(
          fileUri,
          uncoveredDiagnostics,
        );
        // }
      }
    });
  }
  showOrHideCoverage();
}

import {
  CancellationToken,
  Disposable,
  Event,
  EventEmitter,
  FileDecoration,
  FileDecorationProvider,
  ProviderResult,
  Uri,
} from "vscode";
import { ExtensionConfiguration } from "./extension-configuration";
import { Coverage } from "./coverage-info";
import * as os from "node:os";

const isWindows = () => os.type() === "Windows_NT";
const FILE_DECORATION_TOOLTIP_PRELUDE = "Insufficent Code Coverage:";

export class FileCoverageInfoProvider
  extends Disposable
  implements FileDecorationProvider
{
  private readonly _onDidChangeFileDecorations = new EventEmitter<
    Uri | Uri[] | undefined
  >();
  private readonly _coverageByFile: Map<string, Coverage>;

  public listener: Disposable;
  public isDisposed = false;
  showFileDecorations = true;
  public errorThreshold = 0;
  public warningThreshold = 0;

  constructor(
    readonly configuration: ExtensionConfiguration,
    readonly coverageByFile: Map<string, Coverage>,
  ) {
    // use dummy function for callOnDispose since dispose() will be overrided
    super(() => true);

    this._coverageByFile = coverageByFile;
    this.errorThreshold = configuration.errorCoverageThreshold;
    this.warningThreshold = configuration.warningCoverageThreshold; // Add this line

    // Watch for updates to coverage threshold and regenerate when its updated
    this.listener = configuration.onConfigOptionUpdated.event((e) => {
      if (e !== "THRESHOLDS_UPDATED") {
        return;
      }
      if (
        configuration.errorCoverageThreshold == this.errorThreshold &&
        configuration.warningCoverageThreshold == this.warningThreshold
      ) {
        return;
      }
      this.errorThreshold = configuration.errorCoverageThreshold;
      this.warningThreshold = configuration.warningCoverageThreshold;
      this.changeFileDecorations(Array.from(this._coverageByFile.keys()));
    });
  }
  public override dispose(): void {
    if (!this.isDisposed) {
      this._onDidChangeFileDecorations.dispose();
      this.listener.dispose();

      this.isDisposed = true;
    }
  }

  // The event that window.registerFileDecorationProvider() subscribes to
  get onDidChangeFileDecorations(): Event<Uri | Uri[] | undefined> {
    return this._onDidChangeFileDecorations.event;
  }

  // Either decorates or undecorates a file within the Explore View
  provideFileDecoration(
    uri: Uri,
    _token: CancellationToken,
  ): ProviderResult<FileDecoration> {
    if (!this.showFileDecorations) {
      return;
    }

    let path = uri.fsPath;
    // Uri.file() might lowercase the drive letter on some machines which might not match coverageByFile's keys
    // Encountered this issue on a Windows 11 machine but not my main Windows 10 system...
    if (!this._coverageByFile.has(path) && isWindows()) {
      path = path.charAt(0).toUpperCase().concat(path.substring(1));
    }

    const coverage = this._coverageByFile.get(path);
    if (coverage === undefined) {
      return;
    }

    const { lines } = coverage;
    const percentCovered = Math.floor((lines.hit / lines.found) * 100);

    if (percentCovered < this.errorThreshold) {
      const result = new FileDecoration(
        "✗",
        `${FILE_DECORATION_TOOLTIP_PRELUDE} ${percentCovered}% vs. ${this.errorThreshold}%.`,
      );

      result.propagate = true;
      return result;
    }
  }

  // Fire the onDidChangeFileDecorations event for the specified file(s)
  changeFileDecorations(fsPaths: string | string[]): void {
    if (typeof fsPaths === "string") {
      this._onDidChangeFileDecorations.fire([Uri.file(fsPaths)]);
    }

    this._onDidChangeFileDecorations.fire(
      (fsPaths as string[]).map((p) => Uri.file(p)),
    );
  }
}
import {
  window,
  DecorationOptions,
  Diagnostic,
  Disposable,
  Uri,
  TextEditorDecorationType,
  OverviewRulerLane,
  MarkdownString,
} from "vscode";

export interface CoverageDecoration {
  readonly decorationType: TextEditorDecorationType;
  readonly decorationOptions: DecorationOptions[];
}

export class CoverageDecorations extends Disposable {
  public isDisposed = false;

  public coveredDecorationType: TextEditorDecorationType =
    window.createTextEditorDecorationType({
      isWholeLine: true,
      overviewRulerLane: OverviewRulerLane.Full,

      backgroundColor: { id: "cobertura.line.covered" },
      // Add overview ruler color
      overviewRulerColor: { id: "cobertura.line.covered" },
    });
  public uncoveredDecorationType: TextEditorDecorationType =
    window.createTextEditorDecorationType({
      isWholeLine: true,
      overviewRulerLane: OverviewRulerLane.Full,
      backgroundColor: { id: "cobertura.line.uncovered" },
      // Add overview ruler color
      overviewRulerColor: { id: "cobertura.line.uncovered" }, // Example: A semi-transparent red
    });

  public fileCoverageDecorations = new Map<string, DecorationOptions[]>();
  // Initialize decoration styles for covered and uncovered lines.
  constructor() {
    super(() => true);
  }

  // Cleans up resources to avoid memory leaks.
  public override dispose(): void {
    if (!this.isDisposed) {
      this.fileCoverageDecorations.clear();
      this.coveredDecorationType.dispose();
      this.uncoveredDecorationType.dispose();
      this.isDisposed = true;
    }
  }

  // Adds decorations to indicate covered lines in a file.
  public addCoveredDecorationsForFile(
    fileUri: Uri,
    diagnostics: Diagnostic[],
  ): void {
    this.applyDecorations(
      fileUri,
      diagnostics,
      this.coveredDecorationType,
      "This line is covered.",
    );
  }

  public addUncoveredDecorationsForFile(
    fileUri: Uri,
    diagnostics: Diagnostic[],
  ): void {
    this.applyDecorations(
      fileUri,
      diagnostics,
      this.uncoveredDecorationType,
      "This line is missing code coverage.",
    );
  }

  // Helper function to apply decorations based on diagnostics and a specific message.
  private applyDecorations(
    fileUri: Uri,
    diagnostics: Diagnostic[],
    decorationType: TextEditorDecorationType,
    message: string,
  ): void {
    const decorationOptions: DecorationOptions[] = diagnostics.map((diag) => ({
      range: diag.range,
      hoverMessage: new MarkdownString(message),
    }));

    const editor = window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === fileUri.toString(),
    );
    if (editor) {
      editor.setDecorations(decorationType, decorationOptions);
    }
  }

  // Applies decorations based on diagnostics, storing them for future reference.
  addDecorationsForFile(file: Uri, diagnostics: readonly Diagnostic[]): void {
    this.fileCoverageDecorations.set(
      file.toString(),
      this.mapDecorationOptions(diagnostics),
    );
  }

  // Removes all decorations for a specific file, useful when coverage information changes.
  removeDecorationsForFile(file: Uri): void {
    window.visibleTextEditors.forEach((editor) => {
      if (editor.document.uri.toString() === file.toString()) {
        editor.setDecorations(this.coveredDecorationType, []);
        editor.setDecorations(this.uncoveredDecorationType, []);
      }
    });
  }

  clearAllDecorations(): void {
    window.visibleTextEditors.forEach((editor) => {
      editor.setDecorations(this.coveredDecorationType, []);
      editor.setDecorations(this.uncoveredDecorationType, []);
    });
  }

  public mapDecorationOptions(
    diagnostics: readonly Diagnostic[],
    message?: string,
  ): DecorationOptions[] {
    return diagnostics.map((diag) => {
      return {
        hoverMessage: new MarkdownString(message ?? ""),
        range: diag.range,
      };
    });
  }
}

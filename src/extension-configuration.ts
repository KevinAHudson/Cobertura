import {
  ConfigurationChangeEvent,
  Disposable,
  EventEmitter,
  WorkspaceConfiguration,
} from "vscode";

export const CONFIG_SECTION_NAME = "cobertura";
export const CONFIG_OPTION_ENABLE_ON_STARTUP = "enableOnStartup";
export const CONFIG_OPTION_SEARCH_CRITERIA = "searchCriteria";
export const CONFIG_OPTION_ERROR_THRESHOLD = "threshold.error";
export const CONFIG_OPTION_WARNING_THRESHOLD = "threshold.warning";

export const DEFAULT_SEARCH_CRITERIA = "coverage/lcov*.info";

export class ExtensionConfiguration extends Disposable {
  public readonly onConfigOptionUpdated = new EventEmitter<string>();
  public showCoverage = false;
  public searchCriteria = "";
  public errorCoverageThreshold = 0;
  public warningCoverageThreshold = 0;
  constructor(config: WorkspaceConfiguration) {
    // use dummy function for callOnDispose since dispose() will be overrided
    super(() => true);

    this.showCoverage = config.get(CONFIG_OPTION_ENABLE_ON_STARTUP)!;
    this.searchCriteria = config.get<string>(CONFIG_OPTION_SEARCH_CRITERIA)!;
    this.errorCoverageThreshold = config.get(CONFIG_OPTION_ERROR_THRESHOLD)!;
    this.warningCoverageThreshold = config.get(
      CONFIG_OPTION_WARNING_THRESHOLD,
    )!;
  }

  dispatchConfigUpdate(
    evtSrc: ConfigurationChangeEvent,
    latestSnapshot: WorkspaceConfiguration,
  ): void {
    if (this.hasUpdated(evtSrc, CONFIG_OPTION_SEARCH_CRITERIA)) {
      this.searchCriteria = latestSnapshot.get(CONFIG_OPTION_SEARCH_CRITERIA)!;
      this.onConfigOptionUpdated.fire(CONFIG_OPTION_SEARCH_CRITERIA);
    } else if (
      this.hasUpdated(
        evtSrc,
        CONFIG_OPTION_ERROR_THRESHOLD,
        CONFIG_OPTION_WARNING_THRESHOLD,
      )
    ) {
      this.errorCoverageThreshold = latestSnapshot.get(
        CONFIG_OPTION_ERROR_THRESHOLD,
      )!;
      this.warningCoverageThreshold = latestSnapshot.get(
        CONFIG_OPTION_WARNING_THRESHOLD,
      )!;
      this.onConfigOptionUpdated.fire("THRESHOLDS_UPDATED");
    }
  }

  private hasUpdated(
    evtSrc: ConfigurationChangeEvent,
    ...optionNames: string[]
  ): boolean {
    return optionNames.some((optionName) =>
      evtSrc.affectsConfiguration(`${CONFIG_SECTION_NAME}.${optionName}`),
    );
  }
}

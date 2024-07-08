# Code Coverage Visualizer

Code Coverage Visualizer is a dynamic Visual Studio Code extension that enhances your ability to see and understand the test coverage across your codebase. It decorates your code editor with real-time visual cues that highlight uncovered code lines, offering crucial insights into parts of your code that lack testing. Additionally, Code Coverage Visualizer integrates seamlessly with the IDE's Problems pane. It automatically generates problem statements that appear as warnings or errors based on the coverage thresholds you've set. This feature helps developers immediately identify areas with insufficient coverage and prioritize testing efforts accordingly. This tool simplifies the process of tracking and improving the coverage of your projects, ultimately aiding in enhancing their quality and reliability.

## Features

- **Real-Time Coverage Visualization:** Instantly see which lines of code are covered by tests and which are not, right in your editor with highlighted decorations and problem statements.

- **Configurable Coverage Thresholds:** Set custom thresholds for coverage warnings and errors, making it easy to maintain high standards for test coverage.

- **Minimal Performance Impact:** Optimized to have a low impact on system resources, ensuring that it integrates smoothly into your development workflow without affecting performance.

- **Versatile Coverage Reporting:** Supports multiple coverage report formats, primarily lcov, allowing seamless integration with various programming languages and testing frameworks.

## Getting Started

Here’s how to get started with Code Coverage Visualizer:

1. Generate `.lcov` coverage files using your preferred tools that supports your programming language’s coverage analysis.

2. Open Visual Studio Code and navigate to the extension settings by using `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac).

3. Configure the "Coverage File Path" setting (`cobertura.searchCriteria`) to match the location of your coverage files. The default path is set to `coverage/lcov*.info`, but you can adjust this to align with your project’s directory structure.

4. Configure the warning and error thresholds using the settings `cobertura.threshold.warning` and `cobertura.threshold.error`, respectively. These settings allow you to define coverage levels below which the code is marked with a warning or error decoration.

5. Use the toggle button in the toolbar to activate or deactivate the coverage visualization as needed.

6. Open a project file in Visual Studio Code. The extension will automatically apply coverage highlights to the code, visible in both the editor and under the Problems tab.

## Contributions and Feedback

If you have suggestions, encounter any issues, or want to contribute to the development of Code Coverage Visualizer, visit [GitHub repository](github.com/KevinAHudson/Cobertura) to submit issues or pull requests.

## License

This project is licensed under the [MIT License](LICENSE).

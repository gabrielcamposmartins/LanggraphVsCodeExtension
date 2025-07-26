# ai-node-builder README

This is the README for your extension "ai-node-builder". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

# AI Node Builder VS Code Extension

This extension provides a visual drag-and-drop node editor for building AI applications using LangChain and LangGraph. Users can visually connect nodes representing different components or steps in an AI workflow, and the extension will handle communication between the UI and backend to generate and run workflows.

## Features
- Drag-and-drop node editor in a webview
- Visual workflow creation for LangChain and LangGraph
- Communication between extension backend and webview
- Extensible for custom AI components

## Getting Started
1. Open the command palette and run `AI Node Builder: Start` to open the node editor.
2. Drag nodes onto the canvas and connect them to build your workflow.
3. Save or run your workflow directly from the extension.

## Development
- The extension is written in TypeScript.
- The node editor UI is implemented in a webview.
- Communication between the extension and webview uses the VS Code Webview API.

## TODO
- Integrate LangChain and LangGraph libraries
- Implement node types for common AI components
- Add workflow export/import

---

For more information, see the [VS Code Extension API documentation](https://code.visualstudio.com/api) and the [LangChain](https://js.langchain.com/) and [LangGraph](https://js.langchain.com/docs/langgraph/) docs.

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "ai-node-builder" is now active!');

	const helloDisposable = vscode.commands.registerCommand('ai-node-builder.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from AI Node Builder!');
	});

	const openNodeEditor = () => {
		const panel = vscode.window.createWebviewPanel(
			'aiNodeBuilder',
			'AI Node Builder',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
			}
		);
		const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'node-editor.html');
		vscode.workspace.fs.readFile(htmlPath).then(data => {
			let html = Buffer.from(data).toString('utf8');
			panel.webview.html = html;
		});
	};

	const openNodeEditorDisposable = vscode.commands.registerCommand('ai-node-builder.openNodeEditor', openNodeEditor);

const nodeBuilderViewDisposable = vscode.window.registerWebviewViewProvider('aiNodeBuilderView', {
	resolveWebviewView(webviewView) {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
		};
		webviewView.webview.html = getSidebarHtml();

		webviewView.webview.onDidReceiveMessage(async message => {
			if (message.command === 'createNewProject') {
				// Scaffold Python project for LangChain and LangGraph
				const wsFolders = vscode.workspace.workspaceFolders;
				if (!wsFolders || wsFolders.length === 0) {
					vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
					return;
				}
				const rootUri = wsFolders[0].uri;
				// Create main.py
				const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
				const mainPyContent = `# Entry point for LangChain/LangGraph workflow\n\nimport langchain\nimport langgraph\n\n# Example state class\nclass State:\n        messsages = []\n\nworkflow = StateGraph(State)\nchain = workflow.compile()`;
				await vscode.workspace.fs.writeFile(mainPy, Buffer.from(mainPyContent, 'utf8'));
				// Create requirements.txt
				const reqs = vscode.Uri.joinPath(rootUri, 'requirements.txt');
				const reqsContent = `langchain\nlanggraph\n`;
				await vscode.workspace.fs.writeFile(reqs, Buffer.from(reqsContent, 'utf8'));
				// Optionally create a README
				const readme = vscode.Uri.joinPath(rootUri, 'README.md');
				const readmeContent = `# LangChain & LangGraph Project\n\nThis project was created by the AI Node Builder VS Code extension.\n`;
				await vscode.workspace.fs.writeFile(readme, Buffer.from(readmeContent, 'utf8'));
				vscode.window.showInformationMessage('Python project for LangChain and LangGraph created!');
				openNodeEditor();
			}
		});
	}
});

	context.subscriptions.push(helloDisposable, openNodeEditorDisposable, nodeBuilderViewDisposable);
}

function getSidebarHtml(): string {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>AI Node Builder Sidebar</title>
		<style>
			body { background: #23272e; color: #fff; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100vh; }
			#new-project-btn {
				margin-top: 32px;
				background: #4F8EF7;
				color: #fff;
				border: none;
				border-radius: 6px;
				padding: 10px 24px;
				font-size: 1rem;
				cursor: pointer;
				box-shadow: 0 2px 8px #0004;
			}
		</style>
	</head>
	<body>
		<button id="new-project-btn">Create New Project</button>
		<script>
			const vscode = acquireVsCodeApi();
			document.getElementById('new-project-btn').addEventListener('click', () => {
				vscode.postMessage({ command: 'createNewProject' });
			});
		</script>
	</body>
	</html>`;
}



// This method is called when your extension is deactivated
export function deactivate() {}

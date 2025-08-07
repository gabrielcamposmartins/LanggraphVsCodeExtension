// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
var panel: any;
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "ai-node-builder" is now active!');

	// On activation, check if project exists and open node editor if so
	(async () => {
		const wsFolders = vscode.workspace.workspaceFolders;
		if (wsFolders && wsFolders.length > 0) {
			const rootUri = wsFolders[0].uri;
			const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
			const nodesDir = vscode.Uri.joinPath(rootUri, 'nodes');
			try {
				await vscode.workspace.fs.stat(mainPy);
				await vscode.workspace.fs.stat(nodesDir);
				// Project detected, open node editor
				setTimeout(() => vscode.commands.executeCommand('ai-node-builder.openNodeEditor'), 500);
			} catch (e) {
				// Not a project, do nothing
			}
		}
	})();

	const helloDisposable = vscode.commands.registerCommand('ai-node-builder.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from AI Node Builder!');
	});

const openNodeEditor = async () => {
	panel = vscode.window.createWebviewPanel(
		'aiNodeBuilder',
		'AI Node Builder',
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
		}
	);
	const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'node-editor.html');
	const wsFolders = vscode.workspace.workspaceFolders;
	let nodesList: string[] = [];
	let stateInfo: string | null = null;
	let nodeEditorState: any = null;
	let nodeEditorStatePath: vscode.Uri | null = null;
	if (wsFolders && wsFolders.length > 0) {
		const rootUri = wsFolders[0].uri;
		// Check for /nodes and main.py
		try {
			const nodesDir = vscode.Uri.joinPath(rootUri, 'nodes');
			const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
			// Check if main.py exists
			await vscode.workspace.fs.stat(mainPy);
			// Check if /nodes exists and list .py files
			const nodeFiles = await vscode.workspace.fs.readDirectory(nodesDir);
			nodesList = nodeFiles.filter(([name, type]) => name.endsWith('.py')).map(([name]) => name.replace(/\.py$/, ''));
			// Read state from main.py
			const data = await vscode.workspace.fs.readFile(mainPy);
			const text = Buffer.from(data).toString('utf8');
			const stateClassMatch = text.match(/class\s+State\s*:\s*([\s\S]*?)(?=^class\s|\Z)/m);
			if (stateClassMatch) {
				const classBody = stateClassMatch[1];
				const assignedVars = Array.from(classBody.matchAll(/^\s*(\w+)\s*=\s*([^\n#]*)/gm)).map(
					m => `${m[1]} = ${m[2].trim()}`
				);
				const annotatedVars = Array.from(classBody.matchAll(/^\s*(\w+)\s*:\s*([^\n=#]*)/gm)).map(
					m => `${m[1]}: ${m[2].trim()}`
				);
				const vars = [...assignedVars, ...annotatedVars];
				stateInfo = vars.length ? vars.join('\n') : '(No attributes found)';
			}
			// Try to load node-editor.json
			nodeEditorStatePath = vscode.Uri.joinPath(rootUri, 'node-editor.json');
			try {
				const stateData = await vscode.workspace.fs.readFile(nodeEditorStatePath);
				nodeEditorState = JSON.parse(Buffer.from(stateData).toString('utf8'));
			} catch (e) {
				nodeEditorState = null;
			}
		} catch (e) {
			// Not a project, ignore
		}
	}
	vscode.workspace.fs.readFile(htmlPath).then(data => {
		let html = Buffer.from(data).toString('utf8');
		panel.webview.html = html;
		// After webview loads, send nodes, state, and node editor state if found
		panel.webview.onDidReceiveMessage(async (msg:any) => {}); // dummy to ensure webview is ready
		setTimeout(() => {
			if (nodesList.length > 0) {
				panel.webview.postMessage({ command: 'loadNodes', nodes: nodesList });
			}
			if (stateInfo) {
				panel.webview.postMessage({ command: 'showStateInfo', stateInfo });
			}
			if (nodeEditorState) {
				panel.webview.postMessage({ command: 'loadNodeEditorState', nodeEditorState });
			}
		}, 300);
	});

	enum NodeEditorCommand {
		GetStateInfo = 'getStateInfo',
		AddNode = 'addNode',
		SaveNodeEditorData = 'saveNodeEditorData',
		RequestNodeEditorState = 'requestNodeEditorState',
		AddEdge = 'addEdge'
	}

	async function handleGetStateInfo(panel: vscode.WebviewPanel) {
		const wsFolders = vscode.workspace.workspaceFolders;
		if (!wsFolders || wsFolders.length === 0) {
			panel.webview.postMessage({ command: 'showStateInfo', stateInfo: null });
			return;
		}
		const rootUri = wsFolders[0].uri;
		const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
		try {
			const data = await vscode.workspace.fs.readFile(mainPy);
			const text = Buffer.from(data).toString('utf8');
			// Regex to find class State and its attributes (class vars and type-annotated vars)
			const stateClassMatch = text.match(/class\s+State\s*:\s*([\s\S]*?)(?=^class\s|\Z)/m);
			if (stateClassMatch) {
				const classBody = stateClassMatch[1];
				// Match assignments like: var = value
				const assignedVars = Array.from(classBody.matchAll(/^\s*(\w+)\s*=\s*([^\n#]*)/gm)).map(
					m => `${m[1]} = ${m[2].trim()}`
				);
				// Match type-annotated vars like: var: type
				const annotatedVars = Array.from(classBody.matchAll(/^\s*(\w+)\s*:\s*([^\n=#]*)/gm)).map(
					m => `${m[1]}: ${m[2].trim()}`
				);
				const vars = [...assignedVars, ...annotatedVars];
				let stateInfo = vars.length ? vars.join('\n') : '(No attributes found)';
				panel.webview.postMessage({ command: 'showStateInfo', stateInfo });
			} else {
				panel.webview.postMessage({ command: 'showStateInfo', stateInfo: null });
			}
		} catch (e) {
			panel.webview.postMessage({ command: 'showStateInfo', stateInfo: null });
		}
	}

	async function handleAddNode(message: any) {
		const wsFolders = vscode.workspace.workspaceFolders;
		if (!wsFolders || wsFolders.length === 0) {
			vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
			return;
		}
		const rootUri = wsFolders[0].uri;
		const nodesDir = vscode.Uri.joinPath(rootUri, 'nodes');
		const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
		try {
			await vscode.workspace.fs.createDirectory(nodesDir);
			let nodeName = message.label || message.nodeName || 'node';
			// Sanitize nodeName for file and function
			nodeName = nodeName.replace(/[^a-zA-Z0-9_]/g, '_');
			if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(nodeName)) nodeName = 'node';
			const pyFile = vscode.Uri.joinPath(nodesDir, `${nodeName}.py`);
			
			let pyContent = '';
			if (message.isUserNode && message.userNodeContent) {
				// Use actual content from user's node file
				pyContent = message.userNodeContent;
			} else {
				// Create default template for non-user nodes
				pyContent = `# LangGraph Node: ${nodeName}\n\ndef ${nodeName}(state):\n    # TODO: implement node logic\n    return state\n`;
			}
			
			await vscode.workspace.fs.writeFile(pyFile, Buffer.from(pyContent, 'utf8'));
			// Insert import and node registration in main.py
			let mainPyText = Buffer.from(await vscode.workspace.fs.readFile(mainPy)).toString('utf8');
			// Add import if not present
			const importLine = `from nodes.${nodeName} import ${nodeName}`;
			if (!mainPyText.includes(importLine)) {
				// Insert after last import or at the top
				const importRegex = /^(import\s+\w+|from\s+\w+.*)$/gm;
				let lastImportMatch;
				let matchArr;
				while ((matchArr = importRegex.exec(mainPyText)) !== null) {
					lastImportMatch = matchArr;
				}
				if (lastImportMatch) {
					const idx = lastImportMatch.index + lastImportMatch[0].length;
					mainPyText = mainPyText.slice(0, idx) + `\n${importLine}` + mainPyText.slice(idx);
				} else {
					mainPyText = `${importLine}\n` + mainPyText;
				}
			}
			// Find the line before 'workflow = workflow.compile()'
			const compileRegex = /^workflow\s*=\s*workflow\.compile\(\)/m;
			const match = mainPyText.match(compileRegex);
			if (match) {
				const idx = mainPyText.indexOf(match[0]);
				const before = mainPyText.slice(0, idx);
				const after = mainPyText.slice(idx);
				// Add node registration (example: workflow.add_node(nodeName, nodeName))
				const nodeReg = `workflow.add_node("${nodeName}", ${nodeName})\n`;
				mainPyText = before + nodeReg + after;
			}
			await vscode.workspace.fs.writeFile(mainPy, Buffer.from(mainPyText, 'utf8'));
			vscode.window.showInformationMessage(`Node '${nodeName}' created in /nodes and registered in main.py.`);
		} catch (e) {
			vscode.window.showErrorMessage('Failed to create node: ' + (typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e)));
		}
	}

	async function handleSaveNodeEditorData(message: any) {
		// message.nodeEditorData is the JSON to save
		const wsFolders = vscode.workspace.workspaceFolders;
		if (!wsFolders || wsFolders.length === 0) return;
		const rootUri = wsFolders[0].uri;
		const dataPath = vscode.Uri.joinPath(rootUri, 'node-editor.json');
		try {
			await vscode.workspace.fs.writeFile(dataPath, Buffer.from(JSON.stringify(message.nodeEditorData, null, 2), 'utf8'));
		} catch (e) {
			vscode.window.showErrorMessage('Failed to save node editor data: ' + (typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e)));
		}
	}

	async function handleRequestNodeEditorState(panel: vscode.WebviewPanel) {
		const wsFolders = vscode.workspace.workspaceFolders;
		if (!wsFolders || wsFolders.length === 0) {
			panel.webview.postMessage({ command: 'loadNodeEditorState', nodeEditorState: null });
			return;
		}
		const rootUri = wsFolders[0].uri;
		const statePath = vscode.Uri.joinPath(rootUri, 'node-editor.json');
		try {
			const stateData = await vscode.workspace.fs.readFile(statePath);
			const nodeEditorState = JSON.parse(Buffer.from(stateData).toString('utf8'));
			panel.webview.postMessage({ command: 'loadNodeEditorState', nodeEditorState });
		} catch (e) {
			panel.webview.postMessage({ command: 'loadNodeEditorState', nodeEditorState: null });
		}
	}

	// Cross-webview drag-and-drop state
	let sidebarDragNodeType: string | null = null;

	panel.webview.onDidReceiveMessage(async (message:any) => {
		switch (message.command) {
			case NodeEditorCommand.GetStateInfo:
				await handleGetStateInfo(panel);
				break;
			case NodeEditorCommand.AddNode:
				await handleAddNode(message);
				break;
			case NodeEditorCommand.SaveNodeEditorData:
				await handleSaveNodeEditorData(message);
				break;
			case NodeEditorCommand.RequestNodeEditorState:
				await handleRequestNodeEditorState(panel);
				break;
			case NodeEditorCommand.AddEdge:
				await handleAddEdge(message);
				break;
			case 'sidebarPaletteNodeClick':
				// Sidebar node clicked: set pending node type in editor
				if (message.isUserNode) {
					// Handle user node click - load actual content from the user's file
					const wsFolders = vscode.workspace.workspaceFolders;
					if (wsFolders && wsFolders.length > 0) {
						const rootUri = wsFolders[0].uri;
						const nodeEditorPath = vscode.Uri.joinPath(rootUri, 'node-editor.json');
						try {
							const data = await vscode.workspace.fs.readFile(nodeEditorPath);
							const nodeEditorData = JSON.parse(Buffer.from(data).toString('utf8'));
							const userNodesPath = nodeEditorData.userNodesPath;
							if (userNodesPath) {
								const userNodesUri = vscode.Uri.file(userNodesPath);
								const userNodeFile = vscode.Uri.joinPath(userNodesUri, `${message.label}.py`);
								try {
									const content = await vscode.workspace.fs.readFile(userNodeFile);
									const contentStr = Buffer.from(content).toString('utf8');
									panel.webview.postMessage({ 
										command: 'setPendingNodeType', 
										label: message.label, 
										isUserNode: true,
										userNodeContent: contentStr
									});
								} catch (e) {
									vscode.window.showErrorMessage(`Failed to read user node file: ${userNodeFile.fsPath}`);
									panel.webview.postMessage({ command: 'setPendingNodeType', label: message.label, isUserNode: true });
								}
							} else {
								panel.webview.postMessage({ command: 'setPendingNodeType', label: message.label, isUserNode: true });
							}
						} catch (e) {
							panel.webview.postMessage({ command: 'setPendingNodeType', label: message.label, isUserNode: true });
						}
					} else {
						panel.webview.postMessage({ command: 'setPendingNodeType', label: message.label, isUserNode: true });
					}
				} else {
					panel.webview.postMessage({ command: 'setPendingNodeType', label: message.label });
				}
				break;
			case 'editorClickToAddNode':
				// Editor clicked: create node at position
				if (message.label) {
					// Forward the user node content if it exists
					const postMessage: any = { 
						command: 'createNodeFromSidebar', 
						x: message.x, 
						y: message.y, 
						label: message.label 
					};
					if (message.isUserNode && message.userNodeContent) {
						postMessage.isUserNode = true;
						postMessage.userNodeContent = message.userNodeContent;
					}
					panel.webview.postMessage(postMessage);
				}
				break;
			case 'deleteNode': {
				// Delete node file and remove from main.py
				const wsFolders = vscode.workspace.workspaceFolders;
				if (!wsFolders || wsFolders.length === 0) return;
				const rootUri = wsFolders[0].uri;
				const nodesDir = vscode.Uri.joinPath(rootUri, 'nodes');
				const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
				let nodeName = message.label || '';
				nodeName = nodeName.replace(/[^a-zA-Z0-9_]/g, '_');
				if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(nodeName)) nodeName = 'node';
				const pyFile = vscode.Uri.joinPath(nodesDir, `${nodeName}.py`);
				try {
					// Delete the node file
					await vscode.workspace.fs.delete(pyFile, { useTrash: false });
				} catch (e) {
					// File may not exist, ignore
				}
				try {
					let mainPyText = Buffer.from(await vscode.workspace.fs.readFile(mainPy)).toString('utf8');
					// Remove import line
					const importLine = `from nodes.${nodeName} import ${nodeName}`;
					mainPyText = mainPyText.split('\n').filter(line => line.trim() !== importLine).join('\n');
					// Remove node registration line
					const regRegex = new RegExp(`workflow\\.add_node\\(\\s*["']${nodeName}["']\\s*,\\s*${nodeName}\\s*\\)\\s*\\n?`, 'g');
					mainPyText = mainPyText.replace(regRegex, '');
					// Remove edge lines where this node is source or target
					// Remove edges where node is source
					const edgeRegexSrc = new RegExp(`workflow\\.add_edge\\(["']${nodeName}["'],[^\n]*\\n?`, 'g');
					mainPyText = mainPyText.replace(edgeRegexSrc, '');
					// Remove edges where node is target
					const edgeRegexTgt = new RegExp(`workflow\\.add_edge\\([^,]+,[ ]*["']${nodeName}["']\\)\\n?`, 'g');
					mainPyText = mainPyText.replace(edgeRegexTgt, '');
					await vscode.workspace.fs.writeFile(mainPy, Buffer.from(mainPyText, 'utf8'));
				} catch (e) {
					console.log(e);
					// ignore
				}
				break;
			}
			case 'renameNode': {
				// Rename node file and update main.py references
				const wsFolders = vscode.workspace.workspaceFolders;
				if (!wsFolders || wsFolders.length === 0) return;
				const rootUri = wsFolders[0].uri;
				const nodesDir = vscode.Uri.joinPath(rootUri, 'nodes');
				const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
				let oldName = message.oldName || '';
				let newName = message.newName || '';
				oldName = oldName.replace(/[^a-zA-Z0-9_]/g, '_');
				newName = newName.replace(/[^a-zA-Z0-9_]/g, '_');
				if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(oldName)) oldName = 'node';
				if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(newName)) newName = 'node';
				const oldFile = vscode.Uri.joinPath(nodesDir, `${oldName}.py`);
				const newFile = vscode.Uri.joinPath(nodesDir, `${newName}.py`);
				try {
					// Rename the node file
					await vscode.workspace.fs.rename(oldFile, newFile, { overwrite: true });
				} catch (e) {
					// File may not exist, ignore
				}
				try {
					let mainPyText = Buffer.from(await vscode.workspace.fs.readFile(mainPy)).toString('utf8');
					// Update import line
					const importRegex = new RegExp(`from nodes\.${oldName} import ${oldName}`, 'g');
					mainPyText = mainPyText.replace(importRegex, `from nodes.${newName} import ${newName}`);
					// Update node registration line
					const regRegex = new RegExp(`workflow\\.add_node\\(["']${oldName}["'],\\s*${oldName}\\)`, 'g');
					mainPyText = mainPyText.replace(regRegex, `workflow.add_node("${newName}", ${newName})`);
					// Update edge lines where this node is source
					const edgeRegexSrc = new RegExp(`workflow\\.add_edge\\(["']${oldName}["'],`, 'g');
					mainPyText = mainPyText.replace(edgeRegexSrc, `workflow.add_edge("${newName}",`);
					// Update edge lines where this node is target
					const edgeRegexTgt = new RegExp(`,\\s*["']${oldName}["']\\)`, 'g');
					mainPyText = mainPyText.replace(edgeRegexTgt, `, "${newName}")`);
					await vscode.workspace.fs.writeFile(mainPy, Buffer.from(mainPyText, 'utf8'));
					// Update node-editor.json connections
					const nodeEditorStatePath = vscode.Uri.joinPath(rootUri, 'node-editor.json');
					try {
						const stateData = await vscode.workspace.fs.readFile(nodeEditorStatePath);
						let nodeEditorState = JSON.parse(Buffer.from(stateData).toString('utf8'));
						if (nodeEditorState && Array.isArray(nodeEditorState.connections)) {
							let changed = false;
							nodeEditorState.connections = nodeEditorState.connections.map((connection: any) => {
								let updated = { ...connection };
								if (updated.from === oldName.replace('_', ' ')) { updated.from = newName.replace('_', ' '); changed = true; }
								if (updated.to === oldName.replace('_', ' ')) { updated.to = newName.replace('_', ' '); changed = true; }
								return updated;
							});
							if (changed) {
								await vscode.workspace.fs.writeFile(nodeEditorStatePath, Buffer.from(JSON.stringify(nodeEditorState, null, 2), 'utf8'));
								// Immediately send updated state to webview for live UI update
								if (panel && panel.webview) {
									panel.webview.postMessage({ command: 'loadNodeEditorState', nodeEditorState });
								}
							}
						}
					} catch (e) {
						// node-editor.json may not exist, ignore
					}
				} catch (e) {
					console.log(e);
					// ignore
				}
				break;
			}
			case 'openNodeFile': {
				const wsFolders = vscode.workspace.workspaceFolders;
				if (!wsFolders || wsFolders.length === 0) return;
				const rootUri = wsFolders[0].uri;
				const nodesDir = vscode.Uri.joinPath(rootUri, 'nodes');
				let nodeName = message.label || '';
				nodeName = nodeName.replace(/[^a-zA-Z0-9_]/g, '_');
				if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(nodeName)) nodeName = 'node';
				const pyFile = vscode.Uri.joinPath(nodesDir, `${nodeName}.py`);
				vscode.window.showTextDocument(pyFile);
				break;
			}
			default:
				// Unknown command
				break;
		}
	});

	async function handleAddEdge(message: any) {
		// message.from, message.to
		const wsFolders = vscode.workspace.workspaceFolders;
		if (!wsFolders || wsFolders.length === 0) return;
		const rootUri = wsFolders[0].uri;
		const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
		try {
			let mainPyText = Buffer.from(await vscode.workspace.fs.readFile(mainPy)).toString('utf8');
			// Find the line before 'workflow = workflow.compile()'
			const compileRegex = /^workflow\s*=\s*workflow\.compile\(\)/m;
			const match = mainPyText.match(compileRegex);
			if (match) {
				const idx = mainPyText.indexOf(match[0]);
				const before = mainPyText.slice(0, idx);
				const after = mainPyText.slice(idx);
				// Add edge (example: workflow.add_edge("from", "to"))
				const edgeReg = `workflow.add_edge("${message.from}", "${message.to}")\n`;
				mainPyText = before + edgeReg + after;
				await vscode.workspace.fs.writeFile(mainPy, Buffer.from(mainPyText, 'utf8'));
			}
		} catch (e) {
			vscode.window.showErrorMessage('Failed to add edge: ' + (typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e)));
		}
	}
};

	const openNodeEditorDisposable = vscode.commands.registerCommand('ai-node-builder.openNodeEditor', openNodeEditor);

const nodeBuilderViewDisposable = vscode.window.registerWebviewViewProvider('aiNodeBuilderView', {
	   resolveWebviewView(webviewView) {
			   webviewView.webview.options = {
					   enableScripts: true,
					   localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
			   };
			   webviewView.webview.html = getSidebarHtml();

			   // Initialize user nodes path on webview creation
			   setTimeout(async () => {
				   await handleGetUserNodesPath();
				   // Auto-load user nodes if path is already set
				   const wsFolders = vscode.workspace.workspaceFolders;
				   if (wsFolders && wsFolders.length > 0) {
					   const rootUri = wsFolders[0].uri;
					   const nodeEditorPath = vscode.Uri.joinPath(rootUri, 'node-editor.json');
					   try {
						   const data = await vscode.workspace.fs.readFile(nodeEditorPath);
						   const nodeEditorData = JSON.parse(Buffer.from(data).toString('utf8'));
						   const savedPath = nodeEditorData.userNodesPath || '';
						   if (savedPath) {
							   await handleLoadUserNodes({ path: savedPath });
						   }
					   } catch (e) {
						   // File doesn't exist or doesn't have userNodesPath, no auto-load
					   }
				   }
			   }, 500);

			   enum SidebarCommand {
				   CreateNewProject = 'createNewProject',
				   AddNode = 'addNode',
				   GetStateInfo = 'getStateInfo',
				   UpdateStateInfo = 'updateStateInfo',
				   LoadUserNodes = 'loadUserNodes',
				   SaveUserNodesPath = 'saveUserNodesPath',
				   GetUserNodesPath = 'getUserNodesPath',
			   }


			   async function createMainPy(rootUri: vscode.Uri) {
				   const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
				   const mainPyContent = [
					   '# Entry point for LangChain/LangGraph workflow',
					   '',
					   'import langchain',
					   'import langgraph',
					   '',
					   '# Example state class',
					   'class State:',
					   '    messsages = []',
					   '',
					   'workflow = StateGraph(State)',
					   'workflow = workflow.compile()',
					   ''
				   ].join('\n');
				   await vscode.workspace.fs.writeFile(mainPy, Buffer.from(mainPyContent, 'utf8'));
			   }

			   async function createRequirementsTxt(rootUri: vscode.Uri) {
				   const reqs = vscode.Uri.joinPath(rootUri, 'requirements.txt');
				   const reqsContent = [
					   'langchain',
					   'langgraph',
					   ''
				   ].join('\n');
				   await vscode.workspace.fs.writeFile(reqs, Buffer.from(reqsContent, 'utf8'));
			   }

			   async function createReadme(rootUri: vscode.Uri) {
				   const readme = vscode.Uri.joinPath(rootUri, 'README.md');
				   const readmeContent = [
					   '# LangChain & LangGraph Project',
					   '',
					   'This project was created by the AI Node Builder VS Code extension.',
					   ''
				   ].join('\n');
				   await vscode.workspace.fs.writeFile(readme, Buffer.from(readmeContent, 'utf8'));
			   }

			   async function handleCreateNewProject() {
				   const wsFolders = vscode.workspace.workspaceFolders;
				   if (!wsFolders || wsFolders.length === 0) {
					   vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
					   return;
				   }
				   const rootUri = wsFolders[0].uri;
				   await createMainPy(rootUri);
				   await createRequirementsTxt(rootUri);
				   await createReadme(rootUri);
				   vscode.window.showInformationMessage('Python project for LangChain and LangGraph created!');
				   openNodeEditor();
			   }

			   async function handleAddNode(message: any) {
				   const wsFolders = vscode.workspace.workspaceFolders;
				   if (!wsFolders || wsFolders.length === 0) {
					   vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
					   return;
				   }
				   const rootUri = wsFolders[0].uri;
				   const nodesDir = vscode.Uri.joinPath(rootUri, 'nodes');
				   try {
					   await vscode.workspace.fs.createDirectory(nodesDir);
					   let nodeName = message.label || message.nodeName || 'node';
					   nodeName = nodeName.replace(/[^a-zA-Z0-9_]/g, '_');
					   if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(nodeName)) nodeName = 'node';
					   const pyFile = vscode.Uri.joinPath(nodesDir, `${nodeName}.py`);
					   const pyContent = `# LangGraph Node: ${nodeName}\n\ndef ${nodeName}_node(state):\n    # TODO: implement node logic\n    return state\n`;
					   await vscode.workspace.fs.writeFile(pyFile, Buffer.from(pyContent, 'utf8'));
					   vscode.window.showInformationMessage(`Node '${nodeName}' created in /nodes.`);
				   } catch (e) {
					   vscode.window.showErrorMessage('Failed to create node: ' + (typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e)));
				   }
			   }

			   async function handleGetStateInfo() {
				   const wsFolders = vscode.workspace.workspaceFolders;
				   if (!wsFolders || wsFolders.length === 0) {
					   webviewView.webview.postMessage({ command: 'showStateInfo', stateInfo: null });
					   return;
				   }
				   const rootUri = wsFolders[0].uri;
				   const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
				   try {
					   const data = await vscode.workspace.fs.readFile(mainPy);
					   const text = Buffer.from(data).toString('utf8');
					   const stateClassMatch = text.match(/class\s+State\s*:\s*\n([\s\S]*?)(?=^\S|^class\s|\Z)/m);
					   if (stateClassMatch) {
						   const classBody = stateClassMatch[1];
						   const assignedVars = Array.from(classBody.matchAll(/^\s*(\w+)\s*=\s*([^\n#]*)/gm)).map(
							   m => [m[1], m[2].trim()]
						   );
						   const annotatedVars = Array.from(classBody.matchAll(/^\s*(\w+)\s*:\s*([^\n=#]*)/gm)).map(
							   m => [m[1], m[2].trim()]
						   );
						   const vars = [...assignedVars, ...annotatedVars];
						   webviewView.webview.postMessage({ command: 'showStateInfo', stateInfo: vars });
					   } else {
						   webviewView.webview.postMessage({ command: 'showStateInfo', stateInfo: null });
					   }
				   } catch (e) {
					   webviewView.webview.postMessage({ command: 'showStateInfo', stateInfo: null });
				   }
			   }

			   async function handleUpdateStateInfo(message: any) {
				   const wsFolders = vscode.workspace.workspaceFolders;
				   if (!wsFolders || wsFolders.length === 0) return;
				   const rootUri = wsFolders[0].uri;
				   const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
				   try {
					   const data = await vscode.workspace.fs.readFile(mainPy);
					   let text = Buffer.from(data).toString('utf8');
					   const stateClassMatch = text.match(/class\s+State\s*:\s*\n([\s\S]*?)(?=^\S|^class\s|\Z)/m);
					   if (stateClassMatch) {
						   const newBody = message.stateInfo.map((row: any[]) => {
							   if (row[1].includes(':')) return `    ${row[0]}: ${row[1]}`;
							   return `    ${row[0]} = ${row[1]}`;
						   }).join('\n');
						   const newText = text.replace(/(class\s+State\s*:\s*\n)([\s\S]*?)(?=^\S|^class\s|\Z)/m, (m, p1) => p1 + newBody + '\n');
						   await vscode.workspace.fs.writeFile(mainPy, Buffer.from(newText, 'utf8'));
						   webviewView.webview.postMessage({ command: 'showStateInfo', stateInfo: message.stateInfo });
					   }
				   } catch (e) {
					   // ignore
				   }
			   }

			   async function handleLoadUserNodes(message: any) {
				   const userNodesPath = message.path;
				   if (!userNodesPath) return;
				   
				   try {
					   const userNodesUri = vscode.Uri.file(userNodesPath);
					   const stat = await vscode.workspace.fs.stat(userNodesUri);
					   
					   if (stat.type === vscode.FileType.Directory) {
						   const files = await vscode.workspace.fs.readDirectory(userNodesUri);
						   const nodeFiles = files.filter(([name, type]) => name.endsWith('.py') && type === vscode.FileType.File);
						   
						   const nodes = [];
						   for (const [filename] of nodeFiles) {
							   const nodeName = filename.replace('.py', '');
							   const nodeUri = vscode.Uri.joinPath(userNodesUri, filename);
							   try {
								   const content = await vscode.workspace.fs.readFile(nodeUri);
								   const contentStr = Buffer.from(content).toString('utf8');
								   nodes.push({
									   name: nodeName,
									   content: contentStr,
									   path: nodeUri.fsPath
								   });
							   } catch (e) {
								   // Skip files that can't be read
							   }
						   }
						   
						   webviewView.webview.postMessage({ command: 'userNodesLoaded', nodes });
					   } else {
						   vscode.window.showErrorMessage('Path must be a directory');
					   }
				   } catch (e) {
					   vscode.window.showErrorMessage('Failed to load user nodes: ' + (typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e)));
				   }
			   }

			   async function handleSaveUserNodesPath(message: any) {
				   const path = message.path;
				   if (path) {
					   // Save to node-editor.json instead of global state
					   const wsFolders = vscode.workspace.workspaceFolders;
					   if (wsFolders && wsFolders.length > 0) {
						   const rootUri = wsFolders[0].uri;
						   const nodeEditorPath = vscode.Uri.joinPath(rootUri, 'node-editor.json');
						   try {
							   let nodeEditorData: any = {};
							   try {
								   const existingData = await vscode.workspace.fs.readFile(nodeEditorPath);
								   nodeEditorData = JSON.parse(Buffer.from(existingData).toString('utf8'));
							   } catch (e) {
								   // File doesn't exist yet, start with empty object
							   }
							   nodeEditorData.userNodesPath = path;
							   await vscode.workspace.fs.writeFile(nodeEditorPath, Buffer.from(JSON.stringify(nodeEditorData, null, 2), 'utf8'));
						   } catch (e) {
							   vscode.window.showErrorMessage('Failed to save user nodes path: ' + (typeof e === 'object' && e && 'message' in e ? (e as any).message : String(e)));
						   }
					   }
				   }
			   }

			   async function handleGetUserNodesPath() {
				   // Read from node-editor.json instead of global state
				   const wsFolders = vscode.workspace.workspaceFolders;
				   let path = '';
				   if (wsFolders && wsFolders.length > 0) {
					   const rootUri = wsFolders[0].uri;
					   const nodeEditorPath = vscode.Uri.joinPath(rootUri, 'node-editor.json');
					   try {
						   const data = await vscode.workspace.fs.readFile(nodeEditorPath);
						   const nodeEditorData = JSON.parse(Buffer.from(data).toString('utf8'));
						   path = nodeEditorData.userNodesPath || '';
					   } catch (e) {
						   // File doesn't exist or doesn't have userNodesPath, use empty string
					   }
				   }
				   webviewView.webview.postMessage({ command: 'userNodesPathLoaded', path });
			   }

			   webviewView.webview.onDidReceiveMessage(async message => {
				   switch (message.command) {
					   case SidebarCommand.CreateNewProject:
						   await handleCreateNewProject();
						   break;
					   case SidebarCommand.AddNode:
						   await handleAddNode(message);
						   break;
					   case SidebarCommand.GetStateInfo:
						   await handleGetStateInfo();
						   break;
					   case SidebarCommand.UpdateStateInfo:
						   await handleUpdateStateInfo(message);
						   break;
					   case SidebarCommand.LoadUserNodes:
						   await handleLoadUserNodes(message);
						   break;
					   case SidebarCommand.SaveUserNodesPath:
						   await handleSaveUserNodesPath(message);
						   break;
					   case SidebarCommand.GetUserNodesPath:
						   await handleGetUserNodesPath();
						   break;
					   case 'checkProjectExists': {
						   // Check if main.py and /nodes exist
						   const wsFolders = vscode.workspace.workspaceFolders;
						   if (wsFolders && wsFolders.length > 0) {
							   const rootUri = wsFolders[0].uri;
							   const mainPy = vscode.Uri.joinPath(rootUri, 'main.py');
							   const nodesDir = vscode.Uri.joinPath(rootUri, 'nodes');
							   try {
								   await vscode.workspace.fs.stat(mainPy);
								   await vscode.workspace.fs.stat(nodesDir);
								   webviewView.webview.postMessage({ command: 'projectDetected' });
							   } catch (e) {
								   // Not a project, do nothing
							   }
						   }
						   break;
					   }
						case 'sidebarPaletteNodeClick':
							// Sidebar node clicked: set pending node type in editor
							if (panel && panel.webview) {
								panel.webview.postMessage({ command: 'setPendingNodeType', label: message.label });
							}
						break;
					   default:
						   // Unknown command
						   break;
				   }
			   });
		}
	});

	context.subscriptions.push(helloDisposable, openNodeEditorDisposable, nodeBuilderViewDisposable);

	function getSidebarHtml(): string {
		const htmlPath = path.join(__dirname, '..', 'media', 'sidebar.html');
		return fs.readFileSync(htmlPath, 'utf8');
	}

}
// This method is called when your extension is deactivated
export function deactivate() { }

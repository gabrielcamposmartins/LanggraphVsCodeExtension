import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('User Nodes Test Suite', () => {
	vscode.window.showInformationMessage('Start user nodes tests.');

	test('User nodes path storage', async () => {
		// Test that we can store and retrieve user nodes path
		const context = {
			globalState: {
				data: new Map(),
				update: function(key: string, value: any) {
					this.data.set(key, value);
					return Promise.resolve();
				},
				get: function(key: string, defaultValue?: any) {
					return this.data.get(key) || defaultValue;
				}
			}
		};

		// Simulate storing path
		await context.globalState.update('userNodesPath', '/tmp/test-user-nodes');
		
		// Verify retrieval
		const retrievedPath = context.globalState.get('userNodesPath', '');
		assert.strictEqual(retrievedPath, '/tmp/test-user-nodes');
	});

	test('User nodes directory reading', () => {
		// Test that we can read user nodes from directory
		const testDir = '/tmp/test-user-nodes';
		if (fs.existsSync(testDir)) {
			const files = fs.readdirSync(testDir);
			const pyFiles = files.filter(file => file.endsWith('.py'));
			assert.ok(pyFiles.length > 0, 'Should find Python files in test directory');
		}
	});
});
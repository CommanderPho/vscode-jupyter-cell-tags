// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as vscode from 'vscode';

// const myOutputChannel = vscode.window.createOutputChannel("Pho Hale Extension - Jupyter Cell Tags");
// myOutputChannel.appendLine("This is a log message from my extension");
// myOutputChannel.show(true);

import { register as registerCellTags } from './cellTags';
import { register as registerCellTagsView } from './cellTagsTreeDataProvider';

let debugSelectedCellsStatusBarItem: vscode.StatusBarItem;


export function activate(context: vscode.ExtensionContext) {
	registerCellTags(context);
	registerCellTagsView(context);

    // Create a new status bar item
    debugSelectedCellsStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(debugSelectedCellsStatusBarItem);

    // Update context when the active editor or selection changes
    vscode.window.onDidChangeActiveNotebookEditor(updateContext);
    vscode.window.onDidChangeNotebookEditorSelection(updateContext);

    // Initialize the status bar
    updateContext();
}

function updateContext() {
    const editor = vscode.window.activeNotebookEditor;
    if (!editor) {
        vscode.commands.executeCommand('setContext', 'jupyter-cell-tags.singleCellSelected', false);
        vscode.commands.executeCommand('setContext', 'jupyter-cell-tags.multipleCellsSelected', false);
        console.log('No active notebook editor');
        debugSelectedCellsStatusBarItem.hide();
        return;
    }

    const selectionCount = editor.selections.length;
    vscode.commands.executeCommand('setContext', 'jupyter-cell-tags.singleCellSelected', selectionCount === 1);
    vscode.commands.executeCommand('setContext', 'jupyter-cell-tags.multipleCellsSelected', selectionCount > 1);

    console.log(`Selection count: ${selectionCount}`);
    console.log(`Single cell selected: ${selectionCount === 1}`);
    console.log(`Multiple cells selected: ${selectionCount > 1}`);

    debugSelectedCellsStatusBarItem.text = `$(notebook) ${selectionCount} Cell(s) Selected`;
    debugSelectedCellsStatusBarItem.show();
}



export function deactivate() {
    if (debugSelectedCellsStatusBarItem) {
        debugSelectedCellsStatusBarItem.dispose();
    }
}

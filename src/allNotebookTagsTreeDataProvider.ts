import * as vscode from 'vscode';
import { getCellTags } from './helper';  // Assuming this function fetches the tags for a cell

interface CellReference {
    index: number;
    label: string;
}

export class AllTagsTreeDataProvider implements vscode.TreeDataProvider<string | CellReference> {
    private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;

    private _tags: Map<string, CellReference[]> = new Map();  // Map from tag -> list of cell references
    private _disposables: vscode.Disposable[] = [];
    private _editorDisposables: vscode.Disposable[] = [];

    constructor() {
        this._tags = new Map();

        this._disposables.push(vscode.window.onDidChangeActiveNotebookEditor(e => {
            this.registerEditorListeners(e);
        }));

        if (vscode.window.activeNotebookEditor) {
            this.registerEditorListeners(vscode.window.activeNotebookEditor);
        }
    }

    private async registerEditorListeners(editor: vscode.NotebookEditor | undefined) {
        this._editorDisposables.forEach(d => d.dispose());

        if (!editor || editor.notebook.notebookType !== 'jupyter-notebook') {
            return;
        }

        await vscode.commands.executeCommand('setContext', 'jupyter:showAllTagsExplorer', true);

        this._editorDisposables.push(vscode.workspace.onDidChangeNotebookDocument(e => {
            this.updateTags(editor);
        }));
        this.updateTags(editor);
    }

    private async updateTags(editor: vscode.NotebookEditor | undefined) {
        if (!editor) {
            this._tags.clear();
            this._onDidChangeTreeData.fire();
            return;
        }

        this._tags.clear();
        for (let i = 0; i < editor.notebook.cellCount; i++) {
            const cell = editor.notebook.cellAt(i);
            if (!cell) {
                continue;
            }
            const tags = getCellTags(cell);
            tags.forEach(tag => {
                if (!this._tags.has(tag)) {
                    this._tags.set(tag, []);
                }
                const cellRef: CellReference = { index: i, label: `Cell ${i + 1}` };
                this._tags.get(tag)?.push(cellRef);
            });
        }

        this._onDidChangeTreeData.fire();
    }

    // Get tree item for both tag and cell references
    getTreeItem(element: string | CellReference): vscode.TreeItem | Thenable<vscode.TreeItem> {
        if (typeof element === 'string') {
            // Tag node
            return {
                label: element,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
            };
        } else {
            // Cell reference node
            const cellItem = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
            cellItem.command = {
                command: 'extension.openNotebookCell',
                title: 'Open Cell',
                arguments: [element.index]  // Pass the cell index to the command
            };
            cellItem.tooltip = `Jump to cell ${element.index + 1}`;
            return cellItem;
        }
    }

    // Get children for both tags and cells
    getChildren(element?: string | undefined): vscode.ProviderResult<(string | CellReference)[]> {
        if (!element) {
            // Return all tags
            return Array.from(this._tags.keys());
        } else {
            // Return the list of cells for a given tag
            return this._tags.get(element) || [];
        }
    }

    dispose() {
        this._editorDisposables.forEach(d => d.dispose());
        this._disposables.forEach(d => d.dispose());
    }
}


export function register(context: vscode.ExtensionContext) {
    const treeDataProvider = new AllTagsTreeDataProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider('all-notebook-tags-view', treeDataProvider));

    // Register a command to open and highlight a cell
    context.subscriptions.push(vscode.commands.registerCommand('extension.openNotebookCell', (cellIndex: number) => {
        const editor = vscode.window.activeNotebookEditor;
        if (editor) {
            const range = new vscode.NotebookRange(cellIndex, cellIndex + 1);
            editor.revealRange(range, vscode.NotebookEditorRevealType.Default);
            editor.selections = [new vscode.NotebookRange(cellIndex, cellIndex + 1)];  // Highlight the cell
        }
    }));
}

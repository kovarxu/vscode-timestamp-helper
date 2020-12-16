// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import TimeTransfer from './transfer/time-transfer';
import dayjs = require('dayjs');
// import dayjs from 'dayjs';
import utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {
	// get configuration
	const [shortest = 9, longest = 13] = vscode.workspace.getConfiguration().get('timestamp-helper.activeLimit') || [];
	let timeFormat: string = vscode.workspace.getConfiguration().get('timestamp-helper.format') || 'YYYY-MM-DD HH:mm:ss';
	const pureNumberReg = new RegExp(`^(\\d{${shortest},${longest}})$`);
	const timeTransfer = new TimeTransfer();

	// listen on configuration change
	vscode.workspace.onDidChangeConfiguration((e) => {
		const timeFormatHasChanged = e.affectsConfiguration('timestamp-helper.format');
		if (timeFormatHasChanged) {
			timeFormat = vscode.workspace.getConfiguration().get('timestamp-helper.format') || 'YYYY-MM-DD HH:mm:ss';
		}
	});

	// subscribe hover
	const hover = vscode.languages.registerHoverProvider({scheme: '*', language: '*'}, {
		provideHover(document, position, token) {
			// get word at the hover position: a word or a sentence
			const wordAtPosition = document.getText(document.getWordRangeAtPosition(position));
			const regMatch = wordAtPosition.match(pureNumberReg);
			if (regMatch) {
				const result = new vscode.MarkdownString();
				const numMatch = regMatch[1];
				const guessIsmillisecond = numMatch.length > 10;
				result.appendMarkdown(`Guess timestamp in ${guessIsmillisecond ? 'milliseconds' : 'seconds'}:\n`);
				const day = guessIsmillisecond ? dayjs(+numMatch) : dayjs.unix(+numMatch);
				result.appendMarkdown(`\* Local: \`${day.format(timeFormat)}\`\n`);
				const dayInUTC = day.utc();
				result.appendMarkdown(`\* UTC: \`${dayInUTC.format(timeFormat)}\``);
				return {
					contents: [result]
				};
			}
		}
	});
	context.subscriptions.push(hover);

	// comand transfer
	const transferDisposable = vscode.commands.registerCommand('timestamp-helper.transfer', async () => {
		const inputValue = await vscode.window.showInputBox({
			prompt: 'please type your converter: ',
			placeHolder: 'For example: now'
		}) || '';
		const inputText = inputValue.trim();

		// get selections
		const textEditor = vscode.window.activeTextEditor;
		const selections = textEditor?.selections || [];
		try {
			const replaceTexts = selections.map(sel => {
				const selText = textEditor?.document?.getText(sel) || '';
				const result = timeTransfer.transfer(inputText, +selText || 0);
				if (result) {
					return String(result);
				} else {
					vscode.window.showInformationMessage(`"${inputText}" wrongly transferred "${selText}" to ${result}`);
					return selText;
				}
			});

			// text replace should be done in one editting, for single editting generates a new activeTextEditor.
			textEditor?.edit(editBuilder => {
				selections.map((sel, index) => editBuilder.replace(sel, replaceTexts[index]));
			});
		} catch(e) {
			vscode.window.showInformationMessage(`oops! there seemed to be some bad things. Error message: ${e.message}`);
		}
	});

	context.subscriptions.push(transferDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

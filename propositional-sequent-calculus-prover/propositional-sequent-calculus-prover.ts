/* 
 * Propositional sequent calculus prover
 * 
 * Copyright (c) 2018 Project Nayuki
 * All rights reserved. Contact Nayuki for licensing.
 * https://www.nayuki.io/page/propositional-sequent-calculus-prover
 */

"use strict";


function doProve(inputSequent: string): void {
	(document.getElementById("inputSequent") as HTMLInputElement).value = inputSequent;
	
	function clearChildren(node: HTMLElement): void {
		while (node.firstChild != null)
			node.removeChild(node.firstChild);
	}
	let msgElem     = document.getElementById("message"   ) as HTMLElement;
	let codeOutElem = document.getElementById("codeOutput") as HTMLElement;
	let proofElem   = document.getElementById("proof"     ) as HTMLElement;
	clearChildren(msgElem);
	clearChildren(codeOutElem);
	clearChildren(proofElem);
	
	function appendText(node: HTMLElement, text: string): void {
		node.appendChild(document.createTextNode(text));
	}
	
	let proof: Tree;
	try {
		let seq: Sequent = parseSequent(new Tokenizer(inputSequent));
		proof = prove(seq);
		appendText(msgElem, "Proof:");
		proofElem.appendChild(Tree.toHtml([proof]));
		
	} catch (e) {
		if (typeof e == "string")
			appendText(msgElem, "Error: " + e);
		else if ("position" in e) {
			appendText(msgElem, "Syntax error: " + e.message);
			appendText(codeOutElem, inputSequent.substr(0, e.position));
			let highlight = document.createElement("u");
			if (e.position < inputSequent.length) {
				appendText(highlight, inputSequent.substr(e.position, 1));
				codeOutElem.appendChild(highlight);
				appendText(codeOutElem, inputSequent.substr(e.position + 1));
			} else {
				appendText(highlight, " ");
				codeOutElem.appendChild(highlight);
			}
		} else
			appendText(msgElem, "Error: " + e);
	}
}


/* Data types */

class Tree {
	public children: Array<Tree>;  // Length 0, 1, or 2.
	
	// Constructs a proof tree. Has zero, one, or two children.
	public constructor(
			// The value at this node - either a sequent or the string "Fail".
			public sequent: Sequent|"Fail",
			...children: Array<Tree>) {
		
		if (typeof sequent == "string" && sequent != "Fail" || children.length > 2)
			throw "Invalid value";
		this.children = children;
	}
	
	public static toHtml(trees: Array<Tree>): HTMLElement|DocumentFragment {
		if (trees.length == 0)
			return document.createDocumentFragment();
		let ul = document.createElement("ul");
		trees.forEach(tree => {
			let li = document.createElement("li");
			if (tree.sequent === "Fail")
				li.textContent = "Fail";
			else {
				li.appendChild(tree.sequent.toHtml());
				li.appendChild(Tree.toHtml(tree.children));
				ul.appendChild(li);
			}
			ul.appendChild(li);
		});
		return ul;
	}
}


class Sequent {
	// Constructs a sequent.
	public constructor(
		// Zero or more terms.
		public left: Array<Term>,
		// Zero or more terms.
		public right: Array<Term>) {}
	
	// Returns a string representation of this sequent, e.g.: "¬(A ∧ B) ⊦ C, D ∨ E".
	public toString(): string {
		function formatTerms(terms: Array<Term>): string {
			if (terms.length == 0)
				return EMPTY;
			else
				return terms.map(t => t.toString(true)).join(", ");
		}
		return formatTerms(this.left) + " " + TURNSTILE + " " + formatTerms(this.right);
	}
	
	// Returns an array of DOM nodes representing this sequent.
	// The reason that an array of nodes is returned is because the comma and turnstile are styled with extra spacing.
	public toHtml(): DocumentFragment {
		let result = document.createDocumentFragment();
		
		function appendText(text: string): void {
			result.appendChild(document.createTextNode(text));
		}
		function appendSpan(text: string, clsName: string): void {
			let elem = document.createElement("span");
			elem.textContent = text;
			elem.className = clsName;
			result.appendChild(elem);
		}
		
		if (this.left.length == 0)
			appendText(EMPTY);
		else {
			this.left.forEach((term, i) => {
				if (i > 0)
					appendSpan(", ", "comma");
				appendText(term.toString(true));
			});
		}
		appendSpan(" " + TURNSTILE + " ", "turnstile");
		
		if (this.right.length == 0)
			appendText(EMPTY);
		else {
			this.right.forEach((term, i) => {
				if (i > 0)
					appendSpan(", ", "comma");
				appendText(term.toString(true));
			});
		}
		return result;
	}
}


interface Term {
	// Returns a string representation of this term, e.g.: "(A ∧ (¬B)) ∨ C".
	toString(isRoot?: boolean): string;
}


class VarTerm implements Term {
	public constructor(
		public name: string) {}
	
	public toString(isRoot: boolean = false): string {
		return this.name;
	}
}


class NotTerm implements Term {
	public constructor(
		public child: Term) {}
	
	public toString(isRoot: boolean = false): string {
		let s = NOT + this.child.toString();
		if (!isRoot)
			s = "(" + s + ")";
		return s;
	}
}


class AndTerm implements Term {
	public constructor(
		public left: Term,
		public right: Term) {}
	
	public toString(isRoot: boolean = false): string {
		let s = this.left.toString() + " " + AND + " " + this.right.toString();
		if (!isRoot)
			s = "(" + s + ")";
		return s;
	}
}


class OrTerm implements Term {
	public constructor(
		public left: Term,
		public right: Term) {}
	
	public toString(isRoot: boolean = false): string {
		let s = this.left.toString() + " " + OR + " " + this.right.toString();
		if (!isRoot)
			s = "(" + s + ")";
		return s;
	}
}


/* Sequent prover */

function prove(sequent: Sequent): Tree {
	let left  = sequent.left .slice();
	let right = sequent.right.slice();
	
	// Try to find a variable that is common to both sides, to try to derive an axiom.
	// This uses a dumb O(n^2) algorithm, but can theoretically be sped up by a hash table or such.
	for (let lt of left) {
		if (lt instanceof VarTerm) {
			for (let rt of right) {
				if (rt instanceof VarTerm && rt.name == lt.name) {
					if (left.length == 1 && right.length == 1)  // Already in the form X ⊦ X
						return new Tree(sequent);
					let axiom = new Tree(new Sequent([lt], [rt]));
					return new Tree(sequent, axiom);
				}
			}
		}
	}
	
	// Try to find an easy operator on left side
	for (let i = 0; i < left.length; i++) {
		let term = left[i];
		if (term instanceof NotTerm) {
			left.splice(i, 1);
			right.push(term.child);
			let seq = new Sequent(left, right);
			return new Tree(sequent, prove(seq));
		} else if (term instanceof AndTerm) {
			left.splice(i, 1, term.left, term.right);
			let seq = new Sequent(left, right);
			return new Tree(sequent, prove(seq));
		}
	}
	
	// Try to find an easy operator on right side
	for (let i = 0; i < right.length; i++) {
		let term = right[i];
		if (term instanceof NotTerm) {
			right.splice(i, 1);
			left.push(term.child);
			let seq = new Sequent(left, right);
			return new Tree(sequent, prove(seq));
		} else if (term instanceof OrTerm) {
			right.splice(i, 1, term.left, term.right);
			let seq = new Sequent(left, right);
			return new Tree(sequent, prove(seq));
		}
	}
	
	// Try to find a hard operator (OR on left side, AND on right side)
	for (let i = 0; i < left.length; i++) {
		let term = left[i];
		if (term instanceof OrTerm) {
			left.splice(i, 1, term.left);
			let seq0 = new Sequent(left, right);
			left = left.slice();
			left.splice(i, 1, term.right);
			let seq1 = new Sequent(left, right);
			return new Tree(sequent, prove(seq0), prove(seq1));
		}
	}
	for (let i = 0; i < right.length; i++) {
		let term = right[i];
		if (term instanceof AndTerm) {
			right.splice(i, 1, term.left);
			let seq0 = new Sequent(left, right);
			right = right.slice();
			right.splice(i, 1, term.right);
			let seq1 = new Sequent(left, right);
			return new Tree(sequent, prove(seq0), prove(seq1));
		}
	}
	
	// No operators remaining, and not an axiom
	return new Tree(sequent, new Tree("Fail"));
}


/* Parser functions */

function parseSequent(tok: Tokenizer): Sequent {
	// Parse left side
	let lhs: Array<Term> = [];
	for (let expectComma = false; ; ) {
		let next: string|null = tok.peek();
		if (next == TURNSTILE) {
			tok.consume(next);
			break;
		} else if (next == null)
			throw {message: "Comma or turnstile expected", position: tok.pos};
		else {
			if (expectComma) {
				if (next == ",")
					tok.consume(next);
				else
					throw {message: "Comma expected", position: tok.pos};
				if (tok.peek() == null)
					throw {message: "Term expected", position: tok.pos};
			} else {
				if (tok.peek() != ",")
					expectComma = true;
				else
					throw {message: "Term or turnstile expected", position: tok.pos};
			}
			let term: Term|null = parseTerm(tok);
			if (term != null)
				lhs.push(term);
		}
	}
	
	// Parse right side
	let rhs: Array<Term> = [];
	for (let expectComma = false; ; ) {
		let next: string|null = tok.peek();
		if (next == null)
			break;
		else if (next == TURNSTILE)
			throw {message: "Turnstile not expected", position: tok.pos};
		else {
			if (expectComma) {
				if (next == ",")
					tok.consume(next);
				else
					throw {message: "Comma expected", position: tok.pos};
				if (tok.peek() == null)
					throw {message: "Term expected", position: tok.pos};
			} else {
				if (tok.peek() != ",")
					expectComma = true;
				else
					throw {message: "Term or end expected", position: tok.pos};
			}
			let term: Term|null = parseTerm(tok);
			if (term != null)
				rhs.push(term);
		}
	}
	
	return new Sequent(lhs, rhs);
}


// Parses and returns a term, or null if the leading token is the empty symbol.
function parseTerm(tok: Tokenizer): Term|null {
	if (tok.peek() == EMPTY) {
		tok.consume(EMPTY);
		return null;
	}
	
	// Mutant LR parser with deferred reductions
	let stack: Array<Term|string> = [];  // The stack consists of terms (variables/subexpressions) and strings (operators)
	
	function isTerm(x: Term|string): boolean {
		return typeof x != "string";
	}
	
	function reduce(): void {
		while (true) {
			if (stack.length >= 2 && stack[stack.length - 2] == NOT) {
				let term = stack.pop() as Term;
				stack.pop();  // NOT
				stack.push(new NotTerm(term));
			} else if (stack.length >= 3 && isTerm(stack[stack.length - 1]) && stack[stack.length - 2] == AND && isTerm(stack[stack.length - 3])) {
				let right = stack.pop() as Term;
				stack.pop();  // AND
				let left = stack.pop() as Term;
				stack.push(new AndTerm(left, right));
			} else
				break;
		}
	}
	
	function finalReduce(): void {
		while (stack.length >= 3 && isTerm(stack[stack.length - 1]) && stack[stack.length - 2] == OR && isTerm(stack[stack.length - 3])) {
			let right = stack.pop() as Term;
			stack.pop();  // OR
			let left = stack.pop() as Term;
			stack.push(new OrTerm(left, right));
		}
	}
	
	function checkBeforePushingUnary(): void {
		if (stack.length > 0 && isTerm(stack[stack.length - 1]))
			throw {message: "Unexpected item", position: tok.pos};
	}
	
	function checkBeforePushingBinary(): void {
		if (stack.length == 0 || !isTerm(stack[stack.length - 1]))
			throw {message: "Unexpected item", position: tok.pos};
	}
	
	while (true) {
		let next: string|null = tok.peek();
		if (next == null || next == TURNSTILE || next == ",")
			break;
		
		else if (/^[A-Za-z][A-Za-z0-9]*$/.test(next)) {  // Variable
			checkBeforePushingUnary();
			stack.push(new VarTerm(tok.take()));
			reduce();
			
		} else if (next == NOT) {
			checkBeforePushingUnary();
			stack.push(tok.take());
			
		} else if (next == AND) {
			checkBeforePushingBinary();
			stack.push(tok.take());
			
		} else if (next == OR) {
			checkBeforePushingBinary();
			finalReduce();
			stack.push(tok.take());
			
		} else if (next == "(") {  // Subformula
			checkBeforePushingUnary();
			stack.push(tok.take());
			
		} else if (next == ")") {
			finalReduce();
			if (stack.length < 2 || stack[stack.length - 2] != "(")
				throw {message: "Binary operator without second operand", position: tok.pos};
			tok.consume(next);
			stack.splice(stack.length - 2, 1);
			reduce();
		
		} else if (next == EMPTY)
			throw {message: "Empty not expected", position: tok.pos};
		else
			throw "Assertion error";
	}
	finalReduce();
	
	if (stack.length == 1 && isTerm(stack[0]))
		return stack[0] as Term;
	else if (stack.length == 0)
		throw {message: "Blank term", position: tok.pos};
	else
		throw {message: "Expected more", position: tok.pos};
}


/* Tokenizer object */

// Tokenizes a formula into a stream of token strings.
class Tokenizer {
	public pos: number = 0;
	
	public constructor(
			public str: string) {
		this.skipSpaces();
	}
	
	// Returns the next token as a string, or null if the end of the token stream is reached.
	public peek(): string|null {
		if (this.pos == this.str.length)  // End of stream
			return null;
		
		let match: RegExpExecArray|null = /^([A-Za-z][A-Za-z0-9]*|[,()!&|>\u2205\u00AC\u2227\u2228\u22A6]| +)/.exec(this.str.substring(this.pos));
		if (match == null)
			throw {message: "Invalid symbol", position: this.pos};
		
		// Normalize notation
		let token: string = match[0];
		if      (token == "!") token = NOT;
		else if (token == "&") token = AND;
		else if (token == "|") token = OR;
		else if (token == ">") token = TURNSTILE;
		return token;
	}
	
	// Returns the next token as a string and advances this tokenizer past the token.
	public take(): string {
		let result: string|null = this.peek();
		if (result == null)
			throw "Advancing beyond last token";
		this.pos += result.length;
		this.skipSpaces();
		return result;
	}
	
	// Takes the next token and checks that it matches the given string, or throws an exception.
	public consume(s: string): void {
		if (this.take() != s)
			throw "Token mismatch";
	}
	
	private skipSpaces(): void {
		let match: RegExpExecArray|null = /^[ \t]*/.exec(this.str.substring(this.pos));
		if (match === null)
			throw "Assertion error";
		this.pos += match[0].length;
	}
}


/* Miscellaneous */

// Unicode character constants (because this script file's character encoding is unspecified)
const TURNSTILE = "\u22A6";
const EMPTY     = "\u2205";
const NOT       = "\u00AC";
const AND       = "\u2227";
const OR        = "\u2228";

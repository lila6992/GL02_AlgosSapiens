var vCard = require('./vCard');

// VpfParser

var VCardParser = function(sTokenize, sParsedSymb) {
    // The list of vCard parsed from the input file.
    this.parsedVCard = [];
    this.symb = ["BEGIN:VCARD", "VERSION:4.0", "Name", "Email", "Phone", "END:VCARD"];
    this.showTokenize = sTokenize;
    this.showParsedSymbols = sParsedSymb;
    this.errorCount = 0;
};

// Function to check if data follows GIFT format
VCardParser.prototype.isGiftFormat = function(data) {
    // Simple heuristics for detecting GIFT format
    const giftPatterns = [
        /::.*::/,            // Question title (e.g., "::Question Title::")
        /\{.*\}/,            // Answer block (e.g., "{True ~False}")
        /~|=/                // Answer indicators (~ for incorrect, = for correct)
    ];
    return giftPatterns.every(pattern => pattern.test(data));
};

// tokenize : transform the data input into a list
// <eol> = CRLF
VCardParser.prototype.tokenize = function(data) {
    var separator = /(\r\n| : )/;
    data = data.split(separator);
    data = data.filter((val, idx) => !val.match(separator));
    return data;
};

// parse : analyze data by calling the first non-terminal rule of the grammar
VCardParser.prototype.parse = function(data) {
    // Check if the data is in GIFT format
    if (this.isGiftFormat(data)) {
        console.log("The provided file is in GIFT format.");
    } else {
        console.log("The provided file is NOT in GIFT format.");
    }

    var tData = this.tokenize(data);
    if (this.showTokenize) {
        console.log(tData);
    }
    this.listpoi(tData);
};

// Parser operand

VCardParser.prototype.errMsg = function(msg, input) {
    this.errorCount++;
    console.log("Parsing Error! on " + input + " -- msg: " + msg);
};

// Read and return a symbol from input
VCardParser.prototype.next = function(input) {
    var curS = input.shift();
    if (this.showParsedSymbols) {
        console.log(curS);
    }
    return curS;
};

// accept : verify if the arg s is part of the language symbols.
VCardParser.prototype.accept = function(s) {
    var idx = this.symb.indexOf(s);
    // index 0 exists
    if (idx === -1) {
        this.errMsg("symbol " + s + " unknown", [" "]);
        return false;
    }

    return idx;
};

// check : check whether the arg elt is on the head of the list
VCardParser.prototype.check = function(s, input) {
    if (this.accept(input[0]) == this.accept(s)) {
        return true;
    }
    return false;
};

// expect : expect the next symbol to be s.
VCardParser.prototype.expect = function(s, input) {
    if (s == this.next(input)) {
        // console.log("Recognized! " + s)
        return true;
    } else {
        this.errMsg("symbol " + s + " doesn't match", input);
    }
    return false;
};

// VCardParser.js
module.exports = VCardParser;

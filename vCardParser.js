var vCard = require('./vCard');


// VpfParser

var VCardParser = function(sTokenize, sParsedSymb){
	// The list of vCard parsed from the input file.
	this.parsedVCard = [];
	this.symb = ["BEGIN:VCARD","VERSION:4.0","Name","Email","Phone","END:VCARD"];
	this.showTokenize = sTokenize;
	this.showParsedSymbols = sParsedSymb;
	this.errorCount = 0;
}

// Parser procedure

// tokenize : tranform the data input into a list
// <eol> = CRLF
VCardParser.prototype.tokenize = function(data){
	var separator = /(\r\n| : )/;
	data = data.split(separator);
	data = data.filter((val, idx) => !val.match(separator)); 					
	return data;
}

// parse : analyze data by calling the first non terminal rule of the grammar
VCardParser.prototype.parse = function(data){
	var tData = this.tokenize(data);
	if(this.showTokenize){
		console.log(tData);
	}
	this.listpoi(tData);
}

// Parser operand

VCardParser.prototype.errMsg = function(msg, input){
	this.errorCount++;
	console.log("Parsing Error ! on "+input+" -- msg : "+msg);
}

// Read and return a symbol from input
VCardParser.prototype.next = function(input){
	var curS = input.shift();
	if(this.showParsedSymbols){
		console.log(curS);
	}
	return curS
}

// accept : verify if the arg s is part of the language symbols.
VCardParser.prototype.accept = function(s){
	var idx = this.symb.indexOf(s);
	// index 0 exists
	if(idx === -1){
		this.errMsg("symbol "+s+" unknown", [" "]);
		return false;
	}

	return idx;
}



// check : check whether the arg elt is on the head of the list
VCardParser.prototype.check = function(s, input){
	if(this.accept(input[0]) == this.accept(s)){
		return true;	
	}
	return false;
}

// expect : expect the next symbol to be s.
VCardParser.prototype.expect = function(s, input){
	if(s == this.next(input)){
		//console.log("Reckognized! "+s)
		return true;
	}else{
		this.errMsg("symbol "+s+" doesn't match", input);
	}
	return false;
}

//From here not modified for the project
// Parser rules

// <liste_poi> = *(<poi>) "$$"
VCardParser.prototype.listpoi = function(input){
	this.poi(input);
	this.expect("$$", input);
}

// <poi> = "START_POI" <eol> <body> "END_POI"
VCardParser.prototype.poi = function(input){

	if(this.check("START_POI", input)){
		this.expect("START_POI", input);
		var args = this.body(input);
		var p = new POI(args.nm, args.lt, args.lg, []);
		this.note(input, p);
		this.expect("END_POI",input);
		this.parsedPOI.push(p);
		if(input.length > 0){
			this.poi(input);
		}
		return true;
	}else{
		return false;
	}

}

// <body> = <name> <eol> <latlng> <eol> <optional>
VCardParser.prototype.body = function(input){
	var nm = this.name(input);
	var ltlg = this.latlng(input);
	return { nm: nm, lt: ltlg.lat, lg: ltlg.lng };
}

// <name> = "name: " 1*WCHAR
VCardParser.prototype.name = function(input){
	this.expect("name",input)
	var curS = this.next(input);
	if(matched = curS.match(/[\wàéèêîù'\s]+/i)){
		return matched[0];
	}else{
		this.errMsg("Invalid name", input);
	}
}

// <latlng> = "latlng: " ?"-" 1*3DIGIT "." 1*DIGIT", " ?"-" 1*3DIGIT "." 1*DIGIT
VCardParser.prototype.latlng = function(input){
	this.expect("latlng",input)
	var curS = this.next(input);
	if(matched = curS.match(/(-?\d+(\.\d+)?);(-?\d+(\.\d+)?)/)){
		return { lat: matched[1], lng: matched[3] };
	}else{
		this.errMsg("Invalid latlng", input);
	}
}

// <optional> = *(<note>)
// <note> = "note: " "0"/"1"/"2"/"3"/"4"/"5"
VCardParser.prototype.note = function (input, curPoi){
	if(this.check("note", input)){
		this.expect("note", input);
		var curS = this.next(input);
		if(matched = curS.match(/-?\d/)){
			if(!(matched<0 || matched >5)){
				curPoi.addRating(matched[0]);
			}
			if(input.length > 0){
				this.note(input, curPoi);
			}
		}else{
			this.errMsg("Invalid note");
		}	
	}
}

module.exports = VCardParser;
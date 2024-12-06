const chalk = require('chalk');
const { v4: uuidv4 } = require('uuid');

class GiftParser {
    constructor() {
        this.parsedQuestion = [];
        this.questionIndex = 0; 
        this.errorCount = 0;
        this.errorMessages = [];
    }

    parse(data, fileName) {
        try {
            if (typeof data !== 'string') {
                throw new Error(`Invalid input: The provided text for file ${fileName} is not a string.`);
            }
    
            // Remove comment lines that start with "//" and "$CATEGORY:"
            const cleanedData = data
                .split('\n')
                .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('$CATEGORY:'))
                .join('\n')
                .replace(/\n{3,}/g, '\n\n')  // Replace consecutive empty lines with a maximum of two newlines
                .trim();  // Remove any leading or trailing whitespace
    
            // Modified split to keep the initial "::" with each question block
            const questionSplitRegex = /\n\s*\n(?=::)|\n\r\n(?=::)|\r\n\r\n(?=::)/;
            const questionBlocks = cleanedData.split(questionSplitRegex).filter(block => block.trim() !== '');
            
            this.parsedQuestion = [];
            this.errorMessages = [];
            this.errorCount = 0;
            this.questionIndex = 0;
    
            // Process each question block
            for (const block of questionBlocks) {
                const tokens = this.tokenizeBlock(block);
                this.listQuestion(tokens, fileName, block);
            }
            
            return this.parsedQuestion;
        } catch (error) {
            this.incrementErrorCount(`Fatal error in parsing ${fileName}: ${error.message}`);
            this.checkFormat(fileName);
            return [];
        }
    }

    tokenizeBlock(block) {
        // Preserve "::" tokens
        const separator = /(::|{|}|=|~|#|MC|SA|\n|\$CATEGORY:|%)/g;
    
        let tokens = block.split(separator).filter(token => token.trim() !== "");
    
        tokens = tokens.map(token =>
            token.replace(/(<([^>]+)>)/gi, "")  // Remove HTML tags
                .replace(/\[(\w+)\]/g, '')    // Remove markdown-like tags
                .replace(/\r?\n|\r/g, ' ')    // Replace newlines with spaces
                .replace(/\s+/g, ' ')         // Collapse spaces
                .trim()
        ).filter(token => token !== '');
    
        return tokens;
    }


    listQuestion(input, fileName, rawGift) {
        try {
            this.question(input, fileName, rawGift);
        } catch (error) {
            this.incrementErrorCount(`Error in list question parsing for ${fileName}: ${error.message}`);
        }
    }

    question(input, fileName, rawGift) {
        let inAnswer = false;
        let titre = '';
        let texte = [];
        let bonnesReponses = [[]];
        let reponses = [[]];
        let typeDeQuestion;
        let previous;
        let i = 1;
    
        const sanitizedFileName = this.sanitizeFileName(fileName);
    
        while (input.length > 0) {
            try {
                if (this.check('::', input)) {
                    if (titre === '') titre = this.titre(input);
                    else texte.push(this.texte(input));
                } else if (this.check('%', input)) {
                    input[0] = previous;
                } else if (this.check('=', input) && inAnswer) {
                    // Collect correct answers in both bonnesReponses and reponses
                    const correctReponse = this.bonnesReponses(input);
                    bonnesReponses[bonnesReponses.length - 1].push(correctReponse);
                    reponses[reponses.length - 1].push(correctReponse);
                    if (correctReponse.includes('->')) typeDeQuestion = 'match';
                } else if (this.check('{', input)) {
                    inAnswer = true;
                    typeDeQuestion = 'ouverte';
                    if (input[1] === '=' || input[1] === '~' || input[1] === '}') {
                        bonnesReponses.push([]);
                        reponses.push([]);
                        texte.push('(' + i + ')');
                        i++;
                    }
                    this.next(input);
                } else if (this.check('TRUE', input) || this.check('T', input) || this.check('FALSE', input) || this.check('F', input)) {
                    typeDeQuestion = 'vrai_faux';
                    bonnesReponses[bonnesReponses.length - 1].push(input[0]);
                    reponses[reponses.length - 1].push(input[0]);
                    this.next(input);
                } else if (this.check('~', input) && input[1] !== '=' && input[1] !== '%') {
                    typeDeQuestion = 'qcm1';
                    // Collect incorrect answers in reponses
                    const incorrectReponse = this.reponses(input);
                    reponses[reponses.length - 1].push(incorrectReponse);
                } else if (this.check('}', input) && input.length > 1 && input[1] !== '::') {
                    inAnswer = false;
                    this.expect('}', input);
    
                    if (input[0] !== '//') 
                        texte.push(this.texte(input));
                } else {
                    texte.push(this.texte(input));

                    if (texte.some(t => t.includes("___"))) {
                        typeDeQuestion = 'mot_manquant';
                    }
                }
            } catch (error) {
                this.incrementErrorCount(`Error parsing question in ${fileName}: ${error.message}`);
                break;
            }
        }
    
        // Determine type based on the current responses
        if (typeDeQuestion === 'ouverte' && reponses[reponses.length - 1].length === 0 && bonnesReponses[bonnesReponses.length - 1].length > 0)
            typeDeQuestion = 'numerique';
        else if (typeDeQuestion === undefined)
            typeDeQuestion = 'texte';
    
        // Increment global question index
        this.questionIndex++;
        
        const questionObj = {
            id: this.titreId(titre),
            file: fileName,
            questionIndex: this.questionIndex,
            titre,
            typeDeQuestion,
            texte: texte.join(' '),
            bonnesReponses: bonnesReponses.flat(),
            reponses: reponses.flat(),
            formatGift: rawGift 
        };
    
        this.parsedQuestion.push(questionObj);
    
        if (input.length > 0) {
            this.question(input, fileName);
        }
    
        return true;
    }

    
    sanitizeFileName(fileName) {
        const normalizedFileName = fileName.replace(/\\/g, '/');
        // Check if entire path
        if (normalizedFileName.includes('gift/')) {
            fileName = normalizedFileName.split('gift/').pop();
        }
        // Remove the ".gift" extension if present
        return fileName.replace('.gift', '');
    }
    

    titreId(titre) {
        return titre
            .toLowerCase() // Convert to lowercase
            .replace(/[^a-zA-Z0-9\-]/g, '-') // Replace non-alphanumeric characters (except "-") with "-"
            .replace(/\s+/g, '-') // Replace spaces with "-"
            .replace(/^-+/, '') // Remove leading hyphens
            .replace(/-+$/, '') // Remove trailing hyphens
            .replace(/-+/g, '-'); // Replace consecutive dashes with a single dash
    }

    titre(input) {
        // Now expecting the first token to be "::"
        if (input[0] !== '::') {
            this.incrementErrorCount(`Expected "::", but got ${input[0]}`);
            return `Untitled Question ${this.questionIndex}`;
        }
        
        // Remove "::" 
        this.next(input);
        
        // Capture the title 
        const curS = this.next(input) || '';
        
        // Handle HTML tags and extract title
        const htmlMatch = curS.match(/\[html\](.*?)(?=::|\s*$)/);
        if (htmlMatch) {
            return htmlMatch[1].trim();
        }
        
        // Standard title extraction
        const titreMatch = curS.match(/^(.*?)(?=::|\s*$)/);
        if (titreMatch) {
            return titreMatch[1].trim();
        }
        
        this.incrementErrorCount(`Invalid titre: ${curS}`);
        return `Untitled Question ${this.questionIndex}`;  
    }
    

    texte(input) {
        const curS = this.next(input) || '';
        // Remove all "::", "{", and "}" patterns and capture text
        const matched = curS.replace(/::|\{|\}/g, '').match(/^[^{]*(?=\{|$)/);
        if (matched) return matched[0].trim();
        this.incrementErrorCount(`Invalid texte: ${curS}`);
        return '';
     }
  

    bonnesReponses(input) {
        this.expect('=', input);
        const curS = this.next(input);
        const matched = curS.match(/^[\s\w.,;:'"“”‘’\-!?()\[\]\/&%€$@+=<>…•{}#:~|]*$/u);
        
        if (matched) {
            const answer = matched[0].trim();  // Remove any leading or trailing spaces
            // Check for invalid values (empty, space, or "—")
            if (answer === "" || answer === " " || answer === "—") {
                this.incrementErrorCount(`Invalid bonnesReponses: ${curS}`);
                return '';
            }
            
            return answer;
        }
        this.incrementErrorCount(`Invalid bonnesReponses: ${curS}`);
        return '';
    }
    
    reponses(input) {
        this.expect("~", input);
        const curS = this.next(input);
        const matched = curS.match(/^[\s\w.,;:'"“”‘’\-!?()\[\]\/&%€$@+=<>…•{}#:~|]*$/u);
        
        if (matched) {
            const response = matched[0].trim();  // Remove any leading or trailing spaces
            // Check for invalid values (empty, space, or "—")
            if (response === "" || response === " " || response === "—") {
                this.incrementErrorCount(`Invalid reponses: ${curS}`);
                return '';
            }
            
            return response;
        }
        this.incrementErrorCount(`Invalid reponses: ${curS}`);
        return '';
    }
    

    check(s, input) {
        return input[0] === s;
    }

    next(input) {
        return input.shift();
    }

    expect(s, input) {
        const nextToken = this.next(input);
        if (nextToken !== s) {
            this.incrementErrorCount(`Expected ${s}, but got ${nextToken}`);
            return false;
        }
        return true;
    }

    incrementErrorCount(errorMessage) {
        this.errorMessages.push(errorMessage);
        this.errorCount++;
    }

    checkFormat(fileName) {
        let formatResult;
    
        if (this.errorCount === 0) {
            formatResult = `${chalk.white(fileName)}: ${chalk.green('CORRECT format')}`;
            console.log(formatResult);
        } else {
            const errorList = this.errorMessages.join(' | ');
            formatResult = `${chalk.white(fileName)}: ${chalk.red(this.errorCount)} ${chalk.red('errors: ')} ${chalk.magenta(errorList)}`;
            console.log(formatResult);
        }
    
        return formatResult;
    }
}

module.exports = GiftParser;

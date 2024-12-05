const chalk = require('chalk');
const { v4: uuidv4 } = require('uuid');

class GiftParser {
    constructor() {
        this.parsedQuestion = [];
        this.questionIndex = 0; 
        this.errorCount = 0;
        this.errorMessages = [];
    }

    sanitizeFileName(fileName) {
        return fileName.replace('.gift', '');
    }

    parse(data, fileName) {
        try {
            if (typeof data !== 'string') {
                throw new Error(`Invalid input: The provided text for file ${fileName} is not a string.`);
            }

            // More flexible tokenization
            const separator = /(::|{|}|=|~|#|MC|SA|\/\/|\n?\n|\$CATEGORY:|%)/g;
            
            let tokens = data.split(separator);
            
            // More robust cleaning
            tokens = tokens.map(token => 
                token.replace(/(<([^>]+)>)/gi, "")
                     .replace(/\[(\w+)\]/g, '')  // Remove [html], [markdown], etc.
                     .replace(/\r?\n|\r/g, ' ')  // Replace newlines with spaces
                     .replace(/\s+/g, ' ')  // Collapse multiple whitespaces
                     .trim()
            ).filter(token => token !== '');

            this.parsedQuestion = [];
            this.errorMessages = [];
            this.errorCount = 0;

            this.listQuestion(tokens, fileName);
            
            return this.parsedQuestion;
        } catch (error) {
            this.incrementErrorCount(`Fatal error in parsing ${fileName}: ${error.message}`);
            this.checkFormat(fileName);
            return [];
        }
    }

    listQuestion(input, fileName) {
        try {
            this.question(input, fileName);
        } catch (error) {
            this.incrementErrorCount(`Error in list question parsing for ${fileName}: ${error.message}`);
        }
    }

    question(input, fileName) {
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
                } else if (this.check('~', input) && !['=', '%'].includes(input[1])) {
                    typeDeQuestion = 'qcml';
                    // Collect incorrect answers in reponses
                    const incorrectReponse = this.reponses(input);
                    reponses[reponses.length - 1].push(incorrectReponse);
                } else if (this.check('}', input)) {
                    inAnswer = false;
                    this.expect('}', input);
                } else {
                    texte.push(this.texte(input));
                }
            } catch (error) {
                this.incrementErrorCount(`Error parsing question in ${fileName}: ${error.message}`);
                break;
            }
        }
    
        if (typeDeQuestion === 'ouverte' && reponses[reponses.length - 1].length === 0 && bonnesReponses[bonnesReponses.length - 1].length > 0)
            typeDeQuestion = 'numerique';
        else if (!typeDeQuestion) typeDeQuestion = 'texte';
    
        // Increment global question index
        this.questionIndex++;
    
        const uniqueKey = `${sanitizedFileName}-${this.questionIndex}`;
    
        const questionObj = {
            id: uniqueKey,
            file: fileName,
            questionIndex: this.questionIndex,
            titre,
            typeDeQuestion,
            texte: texte.join(' '),
            bonnesReponses: bonnesReponses.flat(),
            reponses: reponses.flat(),
        };
    
        this.parsedQuestion.push(questionObj);
    
        if (input.length > 0) {
            this.question(input, fileName);
        }
    
        return true;
    }

    titre(input) {
        this.expect("::", input);
        const curS = this.next(input);
        const matched = curS.match(/^(\w|\.|\/|\+|-|"|'|&|\(|\)|\[|\]|:|,|\u2013|\u2014| )+$/i);
        if (matched) return matched[0];
        this.incrementErrorCount(`Invalid titre: ${curS}`);
        return '';
    }

    texte(input) {
        const curS = this.next(input);
        const matched = curS.match(/^[\s\w.,;:'"“”‘’\-!?()\[\]\/&%€$@+=<>…•{}#:~|]*$/u);
        if (matched) return matched[0];
    
        this.incrementErrorCount(`Invalid texte: ${curS}`);
        return '';
    }
    

    bonnesReponses(input) {
        this.expect('=', input);
        const curS = this.next(input);
        const matched = curS.match(/^(\w|\.|-|,|\u2014|\u2013|\u00a0|\\|\/|\||\*|:|'|\?|->|'|´|'|'|\$|\(|\)| )+$/i);
        
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
        const matched = curS.match(/^(\w|\.|-|,|\u2014|\u2013|\u00a0|\\|\/|:|'|\?|'|´|'|'|\(|\)| )+$/i);
        
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
            formatResult = `${chalk.white(fileName)}: ${chalk.red('WRONG format')} | ${chalk.red(this.errorCount)} ${chalk.red('errors: ')} ${chalk.magenta(errorList)}`;
            console.log(formatResult);
        }
    
        return formatResult;
    }
}

module.exports = GiftParser;

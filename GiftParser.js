const chalk = require('chalk');
const { v4: uuidv4 } = require('uuid');

class GiftParser {
    constructor() {
        this.parsedQuestion = [];
        this.errorCount = 0;
        this.errorMessages = [];
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
            
            // this.checkFormat(fileName);
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
        let question = 0;
        let title = '';
        let statement = [];
        let answer = [[]];
        let choice = [[]];
        let category = 'none';
        let type;
        let answersWeight = [[]];
        let previous;
        let i = 1;

        while (question <= 2 && input.length > 0) {
            try {
                if (this.check('::', input)) {
                    question += 1;
                    
                    if (question === 1) {
                        title = this.title(input);
                    } else if (question === 2 && input[1] !== '{' && input[1] !== '//') {
                        this.expect('::', input);
                        statement.push(this.statement(input));
                    }
                } else if (this.check('$CATEGORY:', input)) {
                    category = this.category(input);
                } else if (this.check('%', input)) {
                    answersWeight[answersWeight.length-1].push(parseInt(this.answerWeight(input)));
                    input[0] = previous;
                } else if (this.check('=', input) && input[1] != '%' && inAnswer) {
                    answer[answer.length-1].push(this.answer(input));
                    if (answer[answer.length-1].length > answersWeight[answersWeight.length-1].length)
                        answersWeight[answersWeight.length-1].push(100);
                    
                    if (answer[answer.length-1][0].includes('->'))
                        type = 'match';
                } else if (this.check('{', input)) {
                    inAnswer = true;
                    type = 'ouverte';
                    
                    if(input[1] === '=' || input[1] === '~' || input[1] === '}'){
                        answer.push([]);
                        choice.push([]);
                        answersWeight.push([]);
                        statement.push('('+i+')');
                        i++;
                    }
                    this.next(input);
                } else if (this.check('TRUE', input) || this.check('T', input) || this.check('FALSE', input) || this.check('F', input)) {
                    type = 'vrai_faux';
                    answer.push([]);
                    answersWeight.push([]);
                    answer[answer.length-1].push(input[0]);
                    
                    if (answer[answer.length-1].length > answersWeight[answersWeight.length-1].length)
                        answersWeight[answersWeight.length-1].push(100);
                    
                    this.next(input);
                } else if (this.check('~', input) && input[1] != '=' && input[1] != '%') {
                    type = 'qcml';
                    choice[choice.length-1].push(this.choice(input));
                } else if (this.check('}', input) && input.length > 1 && input[1] != '::') {
                    inAnswer = false;
                    this.expect('}', input);
                    
                    if (input[0] != '//') 
                        statement.push(this.statement(input));
                } else {
                    statement.push(this.statement(input));
                }
            } catch (error) {
                this.incrementErrorCount(`Error parsing question in ${fileName}: ${error.message}`);
                break;
            }
        }

        if (type === 'ouverte' && choice[choice.length-1].length === 0 && answer[answer.length-1].length > 0)
            type = 'numerique';
        else if (type === undefined)
            type = 'texte';

        const questionObj = {
            id: uuidv4(),
            file: fileName,
            questionIndex: question,
            category,
            title, 
            type, 
            statement: statement.join(' '), 
            inAnswer: inAnswer || false, 
            answersWeight: answersWeight.flat(), 
            answer: answer.flat(), 
            choice: choice.flat(), 
            content: input.join(' ')
        };

        this.parsedQuestion.push(questionObj);


        if (input.length > 0) {
            this.question(input, fileName);
        }

        return true;
    }

    normaliserType(type) {
        switch (type) {
            case 'qcml':
                return 'choix_multiple';
            case 'true_false':
                return 'vrai_faux';
            case 'numerique':
                return 'numerique';
            case 'texte':
                return 'mot_manquant';
            default:
                return 'autre';
        }
    }

    title(input) {
        this.expect("::", input);
        const curS = this.next(input);
        const matched = curS.match(/^(\w|\.|\/|\+|-|"|'|&|\(|\)|\[|\]|:|,|\u2013|\u2014| )+$/i);
        if (matched) return matched[0];
        this.incrementErrorCount(`Invalid title: ${curS}`);
        return '';
    }

    statement(input) {
        const curS = this.next(input);
    
        // Match text allowing printable ASCII, common Unicode characters, and GIFT syntax.
        const matched = curS.match(/^[\s\w.,;:'"“”‘’\-!?()\[\]\/&%€$@+=<>…•{}#:~|]*$/u);
        if (matched) return matched[0];
    
        this.incrementErrorCount(`Invalid statement: ${curS}`);
        return '';
    }
    

    answer(input) {
        this.expect('=', input);
        const curS = this.next(input);
        const matched = curS.match(/^(\w|\.|-|,|\u2014|\u2013|\u00a0|\\|\/|\||\*|:|'|\?|->|'|´|'|'|\$|\(|\)| )+$/i);
        if (matched) return matched[0];
        this.incrementErrorCount(`Invalid answer: ${curS}`);
        return '';
    }

    answerWeight(input) {
        this.expect("%", input);
        const curS = this.next(input);
        const matched = curS.match(/^(-?)\d{1,3}$/);
        if (matched) return matched[0];
        this.incrementErrorCount(`Invalid answer weight: ${curS}`);
        return '0';
    }

    category(input) {
        this.expect("$CATEGORY:", input);
        const curS = this.next(input);
        const matched = curS.match(/\$\w+\$((\/?(\w| )+\/?)|,)+/i);
        if (matched) return matched[0];
        this.incrementErrorCount(`Invalid category: ${curS}`);
        return 'none';
    }

    choice(input) {
        this.expect("~", input);
        const curS = this.next(input);
        const matched = curS.match(/^(\w|\.|-|,|\u2014|\u2013|\u00a0|\\|\/|:|'|\?|'|´|'|'|\(|\)| )+$/i);
        if (matched) return matched[0];
        this.incrementErrorCount(`Invalid choice: ${curS}`);
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
const chalk = require('chalk');
const { v4: uuidv4 } = require('uuid');

class GiftParser {
    constructor() {
        this.parsedQuestion = [];
        this.questionIndex = 0; 
        this.errorCount = 0;
        this.errorMessages = [];
    }

    /**
     * Parse les données et retourne une liste de questions parsées.
     * @param {string} data - Données à parser sous forme de chaîne de caractères.
     * @param {string} fileName - Nom du fichier.
     * @returns {Array} Liste des questions parsées.
     */
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

    /**
     * Tokenize un bloc de texte en éléments significatifs.
     * @param {string} block - Bloc de texte à tokenizer.
     * @returns {Array} Liste des tokens extraits du bloc.
     */
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

    /**
     * Ajoute une question à la liste des questions parsées.
     * @param {Array} input - Liste des tokens à traiter.
     * @param {string} fileName - Nom du fichier.
     * @param {string} rawGift - Le texte brut de la question.
     */
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
        let bonnesReponses = [[]]; // Tableau pour plusieurs groupes de bonnes réponses
        let reponses = [[]]; // Tableau pour plusieurs groupes de réponses
        let typeDeQuestion;
        let previous;
        let i = 1;
        let qcmMultiple = false; // Flag pour indiquer si la question a plusieurs endroits de réponses
    
        while (input.length > 0) {
            try {
                if (this.check('::', input)) {
                    if (titre === '') titre = this.titre(input);
                    else texte.push(this.texte(input));
                } else if (this.check('%', input)) {
                    input[0] = previous;
                } else if (this.check('=', input) && inAnswer) {
                    // Collecte des bonnes réponses pour le groupe actuel
                    const correctReponse = this.bonnesReponses(input);
                    bonnesReponses[bonnesReponses.length - 1].push(correctReponse);
                    reponses[reponses.length - 1].push(correctReponse);
                    if (correctReponse.includes('->')) typeDeQuestion = 'match';
                } else if (this.check('{', input)) {
                    inAnswer = true;
                    typeDeQuestion = 'ouverte';
                    if (input[1] === '=' || input[1] === '~' || input[1] === '}') {
                        bonnesReponses.push([]); // Nouveau groupe de bonnes réponses
                        reponses.push([]); // Nouveau groupe de réponses proposées
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
                    if (!qcmMultiple) {
                        typeDeQuestion = 'qcm1'; // Une seule fois, on marque la question comme qcm1
                        qcmMultiple = true; // Indique que cette question a plusieurs endroits de réponses
                    }
                    const incorrectReponse = this.reponses(input);
                    reponses[reponses.length - 1].push(incorrectReponse);
                } else if (this.check('}', input) && input.length > 1 && input[1] !== '::') {
                    inAnswer = false;
                    this.expect('}', input);
                    if (input[0] !== '//') texte.push(this.texte(input));
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
    
        // Si aucun type de question n'a été défini, on le définit par défaut
        if (typeDeQuestion === 'ouverte' && reponses[reponses.length - 1].length === 0 && bonnesReponses[bonnesReponses.length - 1].length > 0)
            typeDeQuestion = 'numerique';
        else if (typeDeQuestion === undefined)
            typeDeQuestion = 'texte';
    
        this.questionIndex++;
    
        const questionObj = {
            id: this.titreId(titre),
            file: fileName,
            questionIndex: this.questionIndex,
            titre,
            typeDeQuestion,
            texte: texte.join(' '),
            bonnesReponses: bonnesReponses.flat(), // Aplatir pour obtenir un tableau simple
            reponses: reponses.flat(), // Aplatir également les réponses
            formatGift: rawGift
        };
    
        this.parsedQuestion.push(questionObj);
    
        if (input.length > 0) {
            this.question(input, fileName);
        }
    
        return true;
    }
         
 
    /**
     * Génère un ID unique pour un titre en le transformant en une chaîne URL-friendly.
     * @param {string} titre - Le titre de la question.
     * @returns {string} L'ID généré pour le titre.
     */
    titreId(titre) {
        return titre
            .toLowerCase() // Convert to lowercase
            .replace(/[^a-zA-Z0-9\-]/g, '-') // Replace non-alphanumeric characters (except "-") with "-"
            .replace(/\s+/g, '-') // Replace spaces with "-"
            .replace(/^-+/, '') // Remove leading hyphens
            .replace(/-+$/, '') // Remove trailing hyphens
            .replace(/-+/g, '-'); // Replace consecutive dashes with a single dash
    }

    /**
     * Extrait le titre d'une question à partir des tokens fournis.
     * @param {Array} input - Liste des tokens.
     * @returns {string} Le titre extrait.
     */
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
    
    /**
     * Extrait le texte d'une question à partir des tokens fournis.
     * @param {Array} input - Liste des tokens.
     * @returns {string} Le texte extrait.
     */
    texte(input) {
        const curS = this.next(input) || '';
        // Remove all "::", "{", and "}" patterns and capture text
        const matched = curS.replace(/::|\{|\}/g, '').match(/^[^{]*(?=\{|$)/);
        if (matched) return matched[0].trim();
        this.incrementErrorCount(`Invalid texte: ${curS}`);
        return '';
     }
  
    /**
     * Extrait les bonnes réponses d'une question à partir des tokens fournis.
     * @param {Array} input - Liste des tokens.
     * @returns {string} La bonne réponse extraite.
     */
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
    
    /**
     * Extrait les choix de réponse d'une question à partir des tokens fournis.
     * @param {Array} input - Liste des tokens.
     * @returns {string} Le choix de réponse extrait.
     */
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
    
    /**
     * Vérifie si un token correspond à un symbole attendu.
     * @param {string} symbol - Le symbole à vérifier.
     * @param {Array} input - Liste des tokens.
     * @returns {boolean} Vrai si le symbole est trouvé.
     */
    check(s, input) {
        return input[0] === s;
    }

    /**
     * Passe au token suivant dans la liste.
     * @param {Array} input - Liste des tokens.
     */
    next(input) {
        return input.shift();
    }

    /**
     * Vérifie que le token actuel est celui attendu.
     * @param {string} symbol - Le symbole attendu.
     * @param {Array} input - Liste des tokens.
     */
    expect(s, input) {
        const nextToken = this.next(input);
        if (nextToken !== s) {
            this.incrementErrorCount(`Expected ${s}, but got ${nextToken}`);
            return false;
        }
        return true;
    }

    /**
     * Gère les erreurs en augmentant le compteur et en enregistrant les messages d'erreur.
     * @param {string} message - Le message d'erreur.
     */
    incrementErrorCount(errorMessage) {
        this.errorMessages.push(errorMessage);
        this.errorCount++;
    }

    /**
     * Vérifie si le format du fichier est correct, basé sur le comptage des erreurs.
     * @param {string} fileName - Le nom du fichier à vérifier.
     */
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

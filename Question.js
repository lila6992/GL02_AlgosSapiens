const fs = require('fs');
const path = require('path');

class Question {
    constructor(title, statement, type, answers, file) {
        this.title = title;    // Titre de la question
        this.statement = statement; // Contenu principal (énoncé)
        this.type = type;      // Type de la question (choix multiples, vrai-faux, etc.)
        this.answers = answers; // Liste des réponses (correctes et incorrectes)
        this.file = file;      // Nom du fichier source
    }

    // Méthode pour afficher une question de manière lisible
    toString() {
        return `${this.title}: ${this.statement} (${this.type})`;
    }
}

// Parse les réponses pour distinguer correctes et incorrectes
function parseAnswers(rawAnswers) {
    return rawAnswers.split(/[#=~]/).filter(Boolean).map(answer => {
        const trimmedAnswer = answer.trim();
        return {
            text: trimmedAnswer,
            correct: rawAnswers.includes(`=${trimmedAnswer}`) // Correct si précédé par '='
        };
    });
}

// Détermine le type de question
function determineType(rawAnswers) {
    if (rawAnswers.includes('=')) return 'Choix multiple';
    if (rawAnswers.includes('TRUE') || rawAnswers.includes('FALSE')) return 'Vrai-Faux';
    return 'Autre';
}

// Charge toutes les questions depuis un dossier
function loadQuestions(folderPath) {
    const questions = [];
    const files = fs.readdirSync(folderPath);

    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const data = fs.readFileSync(filePath, 'utf8');
        const giftPattern = /::(.*?)::(.*?)\{([\s\S]*?)\}/g;

        let match;
        while ((match = giftPattern.exec(data)) !== null) {
            const title = match[1].trim();
            const statement = match[2].trim();
            const rawAnswers = match[3].trim();
            const answers = parseAnswers(rawAnswers);
            const type = determineType(rawAnswers);

            questions.push(new Question(title, statement, type, answers, file));
        }
    });

    return questions;
}

module.exports = { Question, loadQuestions };

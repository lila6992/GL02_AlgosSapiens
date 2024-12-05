const fs = require('fs');
const path = require('path');
const GiftParser = require('./GiftParser');
const { CollectionQuestion, Question } = require('./Question');

class Examen {
    constructor(nomFichier) {
        this.nomFichier = nomFichier;
        this.questions = new CollectionQuestion();
    }
    
    listAllQuestions = function (data, file) {
        const parser = new GiftParser();
        parser.parse(data, file); 

        const parsedQuestions = parser.parse(data, file);
        parsedQuestions.forEach((question, index) => {
            // console.log(JSON.stringify(question, null, 2));
            console.log(`\n`);
            console.log(`ID : ${String(question.id)}`);
            console.log(`Fichier source : ${question.file}`);
            console.log(`Titre : ${String(question.title)}`);
            console.log(`Type : ${question.type}`);
            console.log(`Enoncé : ${question.statement}`);
        
            if (Array.isArray(question.answer) && question.answer.length > 0) {
                console.log("Réponses :");
                question.answer.forEach(ans => {
                    console.log(`\t ✔️ ${ans}`);
                });
            }
        
            if (Array.isArray(question.choice) && question.choice.length > 0) {
                console.log("Autres choix :");
                question.choice.forEach(indivChoice => {
                    console.log(`\t❌ ${indivChoice}`);
                });
            }
        
        });
    }

    /**
     * Vérifie la validité de l'examen selon les critères définis.
     * @returns {Object} - Résultat de la vérification (booléen et détails).
     */
    verifierQualite() {
        const erreurs = [];

        // Vérifie le nombre de questions
        const nombreQuestions = this.questions.questions.length;
        if (nombreQuestions < 15) {
            erreurs.push(`L'examen contient trop peu de questions (${nombreQuestions}). Minimum requis : 15.`);
        } else if (nombreQuestions > 20) {
            erreurs.push(`L'examen contient trop de questions (${nombreQuestions}). Maximum permis : 20.`);
        }

        // Vérifie les doublons
        const titres = this.questions.questions.map(q => q.titre);
        const doublons = titres.filter((titre, index) => titres.indexOf(titre) !== index);
        if (doublons.length > 0) {
            erreurs.push(`L'examen contient des doublons : ${[...new Set(doublons)].join(', ')}.`);
        }

        return {
            valide: erreurs.length === 0,
            erreurs,
        };
    }
}

module.exports = Examen;

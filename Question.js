const fs = require('fs');
const path = require('path');
const GiftParser = require('./GiftParser');

class Question {
    constructor(titre, texte, reponses, bonnesReponses, typeDeQuestion) {
        if (!titre || !texte || !Array.isArray(reponses) || reponses.length < 1 || !Array.isArray(bonnesReponses)) {
            throw new Error("Données invalides pour créer une question.");
        }

        // Modifier les réponses et les bonnes réponses pour accepter des ensembles de réponses multiples
        this.titre = titre;
        this.texte = texte;
        this.reponses = reponses; // Liste de groupes de réponses pour gérer plusieurs endroits
        this.bonnesReponses = bonnesReponses; // Liste de groupes de bonnes réponses
        this.typeDeQuestion = typeDeQuestion;
    }

    estEgale(autreQuestion) {
        return (
            this.titre === autreQuestion.titre &&
            this.texte === autreQuestion.texte &&
            JSON.stringify(this.reponses) === JSON.stringify(autreQuestion.reponses) &&
            JSON.stringify(this.bonnesReponses) === JSON.stringify(autreQuestion.bonnesReponses) &&
            this.typeDeQuestion === autreQuestion.typeDeQuestion
        );
    }
}

module.exports = Question;

class CollectionQuestion {
    constructor() {
        this.questions = [];
    }

    retirerQuestion(titre) {
        this.questions = this.questions.filter(q => q.titre !== titre);
    }

    naviguerEtChoisir(callback) {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        let index = 0;

        const afficherQuestion = () => {
            if (index < this.questions.length) {
                const question = this.questions[index];
                console.log(`\nQuestion [${index + 1}/${this.questions.length}]`);
                console.log(`Titre : ${question.titre}`);
                console.log(`Texte : ${question.texte}`);
                console.log(`typeDeQuestion : ${question.typeDeQuestion}`);
                console.log(`Réponses : ${question.reponses.join(', ')}`);

                rl.question("Voulez-vous sélectionner cette question ? (oui/non) ", (reponse) => {
                    if (reponse.toLowerCase() === "oui") {
                        callback(question);
                        rl.close();
                    } else {
                        index++;
                        afficherQuestion();
                    }
                });
            } else {
                console.log("\nFin de la navigation.");
                rl.close();
                callback(null);
            }
        };

        afficherQuestion();
    }    
}   
module.exports = { Question, CollectionQuestion };

const fs = require('fs');
const path = require('path');
const GiftParser = require('./GiftParser');

class Question {
    constructor(titre, texte, reponses, bonnesReponses, typeDeQuestion) {
        if (!titre || !texte || !Array.isArray(reponses) || reponses.length < 1 || !Array.isArray(bonnesReponses)) {
            throw new Error("Données invalides pour créer une question.");
        }
        this.titre = titre;
        this.texte = texte;
        this.reponses = reponses;
        this.bonnesReponses = bonnesReponses;
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

class CollectionQuestion {
    constructor() {
        this.questions = [];
    }

    ajouterQuestion(question) {
        if (this.questions.some(q => q.titre === question.titre)) {
            throw new Error(`La question "${question.titre}" existe déjà dans la collection.`);
        }
        this.questions.push(question);
    }

    retirerQuestion(titre) {
        this.questions = this.questions.filter(q => q.titre !== titre);
    }

    afficherCollection() {
        console.log("\nCollection actuelle :");
        if (this.questions.length === 0) {
            console.log("Aucune question dans la collection.");
        } else {
            this.questions.forEach((q, index) => {
                console.log(`${index + 1}. ${q.titre}`);
            });
        }
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
                console.log(`Type : ${question.typeDeQuestion}`);
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

    /**
     * Génère un fichier GIFT à partir des questions de la collection.
     * @param {string} nomFichier - Nom du fichier GIFT à générer.
     */
    genererFichierGIFT(nomFichier) {
        if (this.questions.length === 0) {
            throw new Error("Aucune question à inclure dans le fichier GIFT.");
        }

        const dossierExamens = path.join(__dirname, 'data', 'gift');
        if (!fs.existsSync(dossierExamens)) {
            fs.mkdirSync(dossierExamens, { recursive: true });
        }

        const cheminFichier = path.join(dossierExamens, `${nomFichier}.gift`);
        const contenuGIFT = this.questions.map(q => {
            switch (q.typeDeQuestion) {
                case 'choix_multiple':
                    return `::${q.titre}:: ${q.texte} {\n` +
                        q.reponses.map(r =>
                            q.bonnesReponses.includes(r) ? `=${r}` : `~${r}`
                        ).join('\n') +
                        `\n}`;
                case 'vrai_faux':
                    return `::${q.titre}:: ${q.texte} {\n` +
                        (q.bonnesReponses[0] === 'Vrai' ? '=true' : '=false') +
                        `\n}`;
                case 'numerique':
                    return `::${q.titre}:: ${q.texte} {\n` +
                        `#${q.bonnesReponses[0]}\n}`;
                case 'mot_manquant':
                    return `::${q.titre}:: ${q.texte.replace('___', `{=${q.bonnesReponses[0]}}`)}`;
                default:
                    throw new Error(`Type de question inconnu : ${q.typeDeQuestion}`);
            }
        }).join('\n\n');

        fs.writeFileSync(cheminFichier, contenuGIFT, 'utf-8');
        console.log(`Fichier GIFT généré : ${cheminFichier}`);
    }
    
}   
module.exports = { Question, CollectionQuestion };

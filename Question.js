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

    rechercher(motCle) {
        const resultats = new CollectionQuestion();
        this.questions
            .filter(q => q.titre.includes(motCle) || q.texte.includes(motCle))
            .forEach(q => resultats.ajouterQuestion(q));
        return resultats;
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

        const dossierExamens = path.resolve('C:/projects/GL02/Projet/GL02_AlgosSapiens/examens');
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
    /**
     * Charge toutes les questions à partir d'un dossier et retourne une instance de CollectionQuestion.
     * @param {string} dossier - Chemin vers le dossier contenant les fichiers GIFT.
     * @returns {CollectionQuestion}
     */
    static chargerDepuisDossier(dossier) {
        const collection = new CollectionQuestion();
        const parser = new GiftParser();
    
        const fichiers = fs.readdirSync(dossier).filter(file => file.endsWith('.gift'));
    
        fichiers.forEach((fichier) => {
            const chemin = path.join(dossier, fichier);
            const contenu = fs.readFileSync(chemin, 'utf-8');
            const questionsParsees = parser.parse(contenu, fichier);
    
            questionsParsees.forEach((q) => {
                try {
                    // Vérifications et corrections
                    if (!q.title || !q.statement || !q.type) {
                        throw new Error("Champs obligatoires manquants dans la question.");
                    }
    
                    // Normalisation des réponses possibles
                    const reponses = [...(q.choice || []), ...(q.answer || [])];
                    const bonnesReponses = q.answer || [];
                    const type = this.normaliserType(q.type);
    
                    if (reponses.length < 1 || bonnesReponses.length < 1) {
                        throw new Error("Réponses manquantes ou invalides.");
                    }
    
                    // Création de la question
                    const question = new Question(
                        q.title,
                        q.statement,
                        reponses,
                        bonnesReponses,
                        type
                    );
                    collection.ajouterQuestion(question);
                } catch (error) {
                    console.warn(`Question ignorée dans "${fichier}" : ${error.message}`);
                }
            });
        });
    
        return collection;
    }
    
    /**
     * Normalise le type de question pour correspondre aux standards attendus.
     * @param {string} type - Type de question brut.
     * @returns {string} - Type normalisé.
     */
    static normaliserType(type) {
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
}   
module.exports = { Question, CollectionQuestion };

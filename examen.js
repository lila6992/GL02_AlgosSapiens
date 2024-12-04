const fs = require('fs');
const path = require('path');
const { CollectionQuestion, Question } = require('./question');

class Examen {
    constructor(nomFichier) {
        this.nomFichier = nomFichier;
        this.questions = new CollectionQuestion();
    }

    /**
     * Charge un fichier GIFT et parse les questions.
     * @returns {void}
     */
    chargerDepuisFichier() {
        const cheminFichier = path.resolve('C:/projects/GL02/Projet/GL02_AlgosSapiens/examens', `${this.nomFichier}.gift`);
    
        if (!fs.existsSync(cheminFichier)) {
            throw new Error(`Fichier ${this.nomFichier}.gift non trouvé dans le dossier examens.`);
        }
    
        const contenu = fs.readFileSync(cheminFichier, 'utf-8');
        const questions = contenu.split(/\n\n+/); // Sépare chaque question par deux lignes vides
    
        questions.forEach((questionTexte) => {
            try {
                const match = questionTexte.match(/^::(.*?)::\s*(.*?)\s*\{([\s\S]*)\}$/m);
                if (!match) {
                    console.warn("Format de question non reconnu, ignorée :", questionTexte);
                    return;
                }
    
                const titre = match[1];
                const texte = match[2];
                const blocReponses = match[3].trim();
    
                let reponses = [];
                let bonnesReponses = [];
                let typeDeQuestion = "choix_multiple";
    
                if (blocReponses.includes('=')) {
                    // Choix multiple ou mot manquant
                    const lignes = blocReponses.split('\n');
                    lignes.forEach((ligne) => {
                        if (ligne.startsWith('=')) {
                            bonnesReponses.push(ligne.slice(1).trim());
                            reponses.push(ligne.slice(1).trim());
                        } else if (ligne.startsWith('~')) {
                            reponses.push(ligne.slice(1).trim());
                        }
                    });
                    typeDeQuestion = bonnesReponses.length > 1 ? "choix_multiple" : "mot_manquant";
                } else if (blocReponses.includes('#')) {
                    // Question numérique
                    const reponseNumerique = blocReponses.match(/#(\d+)/);
                    if (reponseNumerique) {
                        bonnesReponses.push(reponseNumerique[1]);
                        reponses.push(reponseNumerique[1]);
                        typeDeQuestion = "numerique";
                    }
                } else if (blocReponses.includes('=true') || blocReponses.includes('=false')) {
                    // Question vrai/faux
                    bonnesReponses.push(blocReponses.includes('=true') ? "Vrai" : "Faux");
                    reponses = ["Vrai", "Faux"];
                    typeDeQuestion = "vrai_faux";
                } else {
                    console.warn("Type de question non supporté, ignorée :", questionTexte);
                    return;
                }
    
                // Création et ajout de la question
                const question = new Question(titre, texte, reponses, bonnesReponses, typeDeQuestion);
                this.questions.ajouterQuestion(question);
            } catch (error) {
                console.error("Erreur lors du parsing d'une question :", error.message);
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

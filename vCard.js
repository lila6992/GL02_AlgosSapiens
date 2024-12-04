const fs = require('fs');
const path = require('path');



class VCard {
    /**
     * Crée une nouvelle instance de VCard.
     * @param {string} nom - Le nom de l'utilisateur.
     * @param {string} prenom - Le prénom de l'utilisateur.
     * @param {string} email - L'adresse e-mail de l'utilisateur.
     * @param {string} telephone - Le numéro de téléphone de l'utilisateur.
     * @param {string} organisation - Le nom de l'organisation (facultatif).
     */
    constructor(nom, prenom, email, telephone, organisation = "SRYEM") {
        if (!nom || !prenom || !email || !telephone) {
            throw new Error("Tous les champs obligatoires doivent être fournis.");
        }

        if (!this.validerEmail(email)) {
            throw new Error("Adresse e-mail invalide.");
        }

        this.nom = nom;
        this.prenom = prenom;
        this.email = email;
        this.telephone = telephone;
        this.organisation = organisation;
    }

    /**
     * Valide le format d'une adresse e-mail.
     * @param {string} email - L'adresse e-mail à valider.
     * @returns {boolean} - True si l'adresse e-mail est valide, sinon False.
     */
    validerEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Génère la représentation VCard de l'utilisateur.
     * @returns {string} - La VCard au format texte.
     */
    genererVCard() {
        return `BEGIN:VCARD
VERSION:4.0
FN:${this.prenom} ${this.nom}
EMAIL:${this.email}
TEL:${this.telephone}
ORG:${this.organisation}
END:VCARD`;
    }

    /**
     * Enregistre la VCard dans un fichier.
     * @param {string} chemin - Le chemin du fichier VCard.
     */
    enregistrerVCard(chemin) {
        fs.writeFileSync(chemin, this.genererVCard());
    }
}

class GestionVCard {
    constructor(fichierStockage = 'emails_utilises.json') {
        this.fichierStockage = path.resolve(fichierStockage);
        this.chargerStockage();
    }

    /**
     * Charge le fichier de stockage des adresses e-mail.
     */
    chargerStockage() {
        if (fs.existsSync(this.fichierStockage)) {
            const contenu = fs.readFileSync(this.fichierStockage, 'utf-8');
            this.emailsUtilises = JSON.parse(contenu);
        } else {
            this.emailsUtilises = [];
        }
    }

    /**
     * Sauvegarde les adresses e-mail utilisées dans le fichier de stockage.
     */
    sauvegarderStockage() {
        fs.writeFileSync(this.fichierStockage, JSON.stringify(this.emailsUtilises, null, 2));
    }

    /**
     * Vérifie si une adresse e-mail est déjà utilisée.
     * @param {string} email - L'adresse e-mail à vérifier.
     * @returns {boolean} - True si l'e-mail est déjà utilisé, sinon False.
     */
    verifierEmail(email) {
        return this.emailsUtilises.includes(email);
    }

    /**
     * Ajoute une adresse e-mail au fichier de stockage.
     * @param {string} email - L'adresse e-mail à ajouter.
     */
    ajouterEmail(email) {
        if (this.verifierEmail(email)) {
            throw new Error(`L'adresse e-mail ${email} est déjà utilisée.`);
        }
        this.emailsUtilises.push(email);
        this.sauvegarderStockage();
    }

    /**
     * Génère et sauvegarde une VCard après vérification des informations.
     * @param {VCard} vcard - L'instance de VCard à enregistrer.
     * @param {string} chemin - Le chemin du fichier VCard.
     */
    genererEtSauvegarder(vcard, chemin) {
        if (this.verifierEmail(vcard.email)) {
            throw new Error(`L'adresse e-mail ${vcard.email} est déjà utilisée.`);
        }

        vcard.enregistrerVCard(chemin);
        this.ajouterEmail(vcard.email);
        console.log(`VCard générée et sauvegardée : ${chemin}`);
    }
}

module.exports = { VCard, GestionVCard };

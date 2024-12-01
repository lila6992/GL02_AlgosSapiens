class GiftParser {
    constructor(sTokenize, sParsedSymb) {
        this.symb = ["::", "{", "=", "~", "#", "}"];
        this.showTokenize = sTokenize;
        this.showParsedSymbols = sParsedSymb;
        this.errorCount = 0;
    }

    // Fonction pour vérifier si un fichier est au format GIFT
    isGiftFormat(data) {
        const giftPatterns = [
            { pattern: /::.*::/, error: "Titre de la question manquant ou mal formaté" },    // Recherche le titre de la question "::Question Title::"
            { pattern: /\{[^}]*\}/, error: "Bloc de réponses manquant ou mal formaté" },    // Recherche un bloc de réponses entre {}
            { pattern: /[=~]/, error: "Réponse correcte ou incorrecte manquante" }       // Recherche un égal ou un tilde pour les réponses
        ];

        let errors = [];

        // Vérification selon les patterns
        giftPatterns.forEach(rule => {
            if (!data.match(rule.pattern)) {
                errors.push(rule.error);
            }
        });

        // Affiche les erreurs détectées
        if (errors.length > 0) {
            errors.forEach(error => console.log(`Erreur : ${error}`));
            return false;
        }

        return true;
    }

    // Tokenisation du fichier GIFT
    tokenize(data) {
        var separator = /(\r\n|\r|\n| : )/;
        data = data.split(separator);
        return data.filter((val, idx) => !val.match(separator));
    }

    // Fonction de validation du format GIFT
    parse(data, fileName) {
        if (this.isGiftFormat(data)) {
            console.log(`Le fichier ${fileName} est bien au format GIFT.`);
        } else {
            console.log(`Le fichier ${fileName} n'est PAS au format GIFT.`);
        }

        var tData = this.tokenize(data);
        if (this.showTokenize) {
            console.log(tData);
        }
    }

    errMsg(msg, input, fileName) {
        this.errorCount++;
        console.log(`Erreur de parsing dans le fichier ${fileName} : ${msg} sur ${input}`);
    }

    next(input) {
        var curS = input.shift();
        if (this.showParsedSymbols) {
            console.log(curS);
        }
        return curS;
    }

    accept(s) {
        var idx = this.symb.indexOf(s);
        if (idx === -1) {
            this.errMsg("symbole " + s + " inconnu", [" "], fileName);
            return false;
        }
        return idx;
    }

    check(s, input) {
        return this.accept(input[0]) === this.accept(s);
    }

    expect(s, input) {
        if (s === this.next(input)) {
            return true;
        } else {
            this.errMsg("symbole " + s + " ne correspond pas", input);
        }
        return false;
    }
}

module.exports = GiftParser;

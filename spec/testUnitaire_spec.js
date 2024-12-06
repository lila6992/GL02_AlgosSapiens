const GiftParser = require('../GiftParser');
const Question = require('../Question');

describe("Tests du parser GIFT", () => {
    let parser;

    beforeEach(() => {
        parser = new GiftParser();
    });

    it("devrait reconnaître un identifiant depuis une entrée simulée", () => {
        const input = ["::", "EM U5 p34 Voc1.1"];
        expect(parser.titre(input)).toEqual("EM U5 p34 Voc1.1");
    });



    it("devrait reconnaître une réponse correcte depuis une entrée simulée", () => {
        const input = ["=", "answer 1"];
        expect(parser.bonnesReponses(input)).toEqual("answer 1");
    });

    it("devrait reconnaître une réponse incorrecte depuis une entrée simulée", () => {
        const input = ["~", "answer 2"];
        expect(parser.reponses(input)).toEqual("answer 2");
    });

    it("devrait analyser correctement une question complète", () => {
        const input =
            "::U7 p77 [So,such,too,enough,very] 1.1::He was {~enough~=so~such~too~very} surprised that he went to check.";
        parser.parse(input, "test.gift");
        const parsed = parser.parsedQuestion[0];

        expect(parsed.id).toEqual("u7-p77-so-such-too-enough-very-1-1");
        expect(parsed.titre).toEqual("U7 p77 [So,such,too,enough,very] 1.1");
        expect(parsed.texte).toContain("He was (1) surprised that he went to check.");
        expect(parsed.reponses).toContain("so");
        expect(parsed.bonnesReponses).toContain("so");
    });

    it("devrait détecter une question de type vrai/faux", () => {
        const input = "::Q1::La Terre est plate. {F}";
        parser.parse(input, "test.gift");
        const parsed = parser.parsedQuestion[0];

        expect(parsed.typeDeQuestion).toEqual("vrai_faux");
        expect(parsed.texte).toContain("La Terre est plate.");
        expect(parsed.bonnesReponses).toContain("F");
    });


    it("devrait détecter une question de type mot manquant", () => {
        const input = "::Fill in the blank::The capital of France is ___.";
        parser.parse(input, "test.gift");
        const parsed = parser.parsedQuestion[0];

        expect(parsed.typeDeQuestion).toEqual("mot_manquant");
        expect(parsed.texte).toContain("The capital of France is ___.");
    });

    it("devrait détecter une question avec pondérations", () => {
        const input = "::Weighted QCM::What is 2+2? {~%-50%3 ~%25%5 =%100%4}";
        parser.parse(input, "test.gift");
        const parsed = parser.parsedQuestion[0];

        expect(parsed.typeDeQuestion).toEqual("qcm2");
        expect(parsed.reponses).toContain("3");
        expect(parsed.reponses).toContain("5");
        expect(parsed.reponses).toContain("4");
        expect(parsed.pondérations).toEqual([-50, 25, 100]);
    });
});

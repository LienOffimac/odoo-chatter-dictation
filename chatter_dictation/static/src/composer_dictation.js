import { Composer } from "@mail/core/common/composer";
import { registerComposerAction } from "@mail/core/common/composer_actions";
import { patch } from "@web/core/utils/patch";
import * as owl from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { browser } from "@web/core/browser/browser";
import { ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

const CONSENT_KEY = "chatter_dictation.consent";

// Taal van de spraakherkenning. Los van de Odoo-interfacetaal.
// Andere opties: "nl-NL" (Nederland), "fr-BE", "en-GB", ...
const DICTATION_LANG = "nl-BE";

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

patch(Composer.prototype, {
    setup() {
        super.setup(...arguments);
        // Owl 3 (Odoo 20) heeft proxy(), Owl 2 (Odoo 19.x) heeft useState()
        this.dictation = (owl.proxy || owl.useState)({ active: false });
        this._dictationNotification = useService("notification");
        this._dictationDialog = useService("dialog");
        this._recognition = null;
        owl.onWillUnmount(() => this._stopDictation());
    },

    onClickDictation() {
        if (this.dictation.active) {
            this._stopDictation();
            return;
        }
        if (this._hasDictationConsent()) {
            this._startDictation();
            return;
        }
        // Eerste gebruik: vraag toestemming voor het doorsturen van audio
        this._dictationDialog.add(ConfirmationDialog, {
            title: _t("Dicteren met je stem"),
            body: _t(
                "Voor het omzetten van spraak naar tekst gebruikt je browser de spraakdienst van de " +
                "browserleverancier (bijvoorbeeld Google bij Chrome of Microsoft bij Edge). " +
                "Je opname wordt daarvoor naar die dienst gestuurd. Odoo ontvangt en bewaart alleen de tekst. " +
                "Wil je doorgaan?"
            ),
            confirmLabel: _t("Ja, doorgaan"),
            cancelLabel: _t("Annuleren"),
            confirm: () => {
                this._storeDictationConsent();
                this._startDictation();
            },
            cancel: () => {},
        });
    },

    _hasDictationConsent() {
        try {
            return browser.localStorage.getItem(CONSENT_KEY) === "1";
        } catch {
            return false;
        }
    },

    _storeDictationConsent() {
        try {
            browser.localStorage.setItem(CONSENT_KEY, "1");
        } catch {
            /* negeren: dan vragen we de volgende keer opnieuw */
        }
    },

    _appendDictatedText(text) {
        const composer = this.props.composer;
        const current = composer.composerText || "";
        const sep = current && !/\s$/.test(current) ? " " : "";
        composer.insertText(sep + text, current.length, { moveCursorToEnd: true });
    },

    _startDictation() {
        if (!SpeechRecognition) {
            this._dictationNotification.add(
                _t("Spraakherkenning wordt niet ondersteund door deze browser. Gebruik Chrome, Edge of Safari."),
                { type: "warning" }
            );
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = DICTATION_LANG;
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            let text = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    text += event.results[i][0].transcript;
                }
            }
            text = text.trim();
            if (text) {
                this._appendDictatedText(text);
            }
        };
        recognition.onerror = (event) => {
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                this._dictationNotification.add(
                    _t("Toegang tot de microfoon is geweigerd. Sta de microfoon toe in je browser."),
                    { type: "danger" }
                );
                this._recognition = null;
                this.dictation.active = false;
            }
        };
        recognition.onend = () => {
            // Chrome stopt zelf na stilte; herstart zolang de gebruiker niet gestopt is
            if (this.dictation.active && this._recognition === recognition) {
                try {
                    recognition.start();
                    return;
                } catch {
                    /* negeren */
                }
            }
            this.dictation.active = false;
        };

        this._recognition = recognition;
        this.dictation.active = true;
        try {
            recognition.start();
        } catch {
            this._recognition = null;
            this.dictation.active = false;
        }
    },

    _stopDictation() {
        const recognition = this._recognition;
        this._recognition = null;
        this.dictation.active = false;
        if (recognition) {
            try {
                recognition.stop();
            } catch {
                /* negeren */
            }
        }
    },
});

registerComposerAction("chatter-dictation", {
    condition: ({ composer }) => !composer.message,
    disabledCondition: ({ owner }) => owner.areAllActionsDisabled,
    // Odoo 20 gebruikt Material Symbols: <i class="oi" data-icon="mic"/>
    icon: ({ owner }) => (owner.dictation?.active ? "stop_circle" : "mic"),
    iconClass: ({ owner }) => (owner.dictation?.active ? "o-chatterDictation-active" : ""),
    name: ({ owner }) =>
        owner.dictation?.active ? _t("Stop dicteren") : _t("Dicteer met je stem"),
    onSelected: ({ owner }) => owner.onClickDictation(),
    sequenceQuick: 10,
});

/* ============================================================
   TALLY — VOICE AI ENGINE
   Handles: Wake-word detection, STT via Web Speech API,
   NLP intent parsing (local), TTS feedback.
   Supports English, Bengali, and Banglish.
   ============================================================ */

const TallyVoice = (() => {

    let recognition = null;
    let isListening = false;
    let onResultCallback = null;
    let onInterimCallback = null;
    let onStatusCallback = null;

    // ---- Bengali digit map ----
    const bnDigitMap = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };

    function bnToEnDigits(str) {
        return str.replace(/[০-৯]/g, d => bnDigitMap[d] || d);
    }

    // ---- TTS (Text-to-Speech) ----
    function speak(text, callback) {
        if (!('speechSynthesis' in window)) {
            if (callback) setTimeout(callback, 500);
            return;
        }
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.0;
        u.pitch = 1.0;
        u.onend = () => { if (callback) callback(); };
        u.onerror = () => { if (callback) callback(); };
        window.speechSynthesis.speak(u);
    }

    function stopSpeaking() {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }

    // ---- STT (Speech-to-Text) using Web Speech API ----
    function initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Web Speech API not supported in this browser.');
            return false;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = 'bn-BD'; // Default to Bengali, also picks up English well

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }
            if (interim && onInterimCallback) onInterimCallback(interim);
            if (final && onResultCallback) onResultCallback(final.trim());
        };

        recognition.onerror = (e) => {
            console.log('Speech recognition error:', e.error);
            if (e.error === 'no-speech' || e.error === 'aborted') {
                if (onStatusCallback) onStatusCallback('no-speech');
            }
        };

        recognition.onend = () => {
            isListening = false;
            if (onStatusCallback) onStatusCallback('ended');
        };

        return true;
    }

    function startListening(opts = {}) {
        if (!recognition && !initRecognition()) return false;
        if (opts.lang) recognition.lang = opts.lang;
        if (opts.onResult) onResultCallback = opts.onResult;
        if (opts.onInterim) onInterimCallback = opts.onInterim;
        if (opts.onStatus) onStatusCallback = opts.onStatus;
        try {
            recognition.start();
            isListening = true;
            return true;
        } catch (e) {
            console.error('Could not start recognition:', e);
            return false;
        }
    }

    function stopListening() {
        if (recognition && isListening) {
            recognition.stop();
            isListening = false;
        }
    }

    // ================ NLP INTENT PARSER (LOCAL) ================
    // This is a rule-based parser that handles English, Bengali, and Banglish.
    // In production, this would call OpenAI GPT-4o for accuracy.
    // For the prototype, the local parser covers the most common patterns.

    function parseVoiceCommand(raw) {
        let text = raw.trim();
        // Normalize Bengali digits
        text = bnToEnDigits(text);

        // Remove wake word
        text = text.replace(/^(tally|টালি|ট্যালি)[,\s]*/i, '').trim();

        // Lowercase for matching (keep original for names)
        const lower = text.toLowerCase();

        const result = {
            type: null,
            entityName: null,
            amount: null,
            paymentMethod: 'cash',
            description: '',
            category: '',
            qty: 1,
            commission: 0,
            date: new Date().toISOString(),
            raw: raw,
        };

        // ---- Extract amount ----
        const amtMatch = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:taka|টাকা|tk|৳|takar)?/i);
        if (amtMatch) {
            result.amount = parseFloat(amtMatch[1].replace(/,/g, ''));
        }

        // ---- Extract payment method (Providers) ----
        if (/bkash|বিকাশ/i.test(lower)) result.paymentMethod = 'bkash';
        else if (/nagad|নগদ/i.test(lower)) result.paymentMethod = 'nagad';
        else if (/rocket|রকেট/i.test(lower)) result.paymentMethod = 'rocket';

        // ---- Detect intent type ----

        // Detect intent type (Simplified: Due vs Payment)
        // payment_in (Taka ferot / cash in)
        if (/ferot|pay|diche|payment|collected|received|জমা|ফেরত|দিয়েছি/i.test(lower)) {
            result.type = 'payment_in';
        }
        // sale (Baki / Sale)
        else {
            result.type = 'sale';
        }

        // ---- Extract entity name ----
        let nameText = text;
        if (amtMatch) nameText = nameText.replace(amtMatch[0], '');
        const removeWords = /\b(tally|টালি|বাকি|ফেরত|জমা|টাকা|tk|cash|bkash|nagad|payment|due|baki|ferot|diche|দিলাম|দেওয়া|বেচলাম)\b/gi;
        nameText = nameText.replace(removeWords, '').trim();
        nameText = nameText.replace(/[,.\-।]/g, '').replace(/\s+/g, ' ').trim();

        if (nameText.length > 1) {
            result.entityName = nameText;
        }

        return result;
    }

    // ---- Build confirmation message from parsed result ----
    function buildConfirmation(parsed, lang = 'en') {
        if (!parsed || !parsed.type) {
            return lang === 'bn' ? 'দুঃখিত, বুঝতে পারিনি।' : "Sorry, I didn't understand that.";
        }

        const amt = parsed.amount || 0;
        const name = parsed.entityName || (lang === 'bn' ? 'অজানা' : 'Unknown');

        if (parsed.type === 'payment_in') {
            return lang === 'bn'
                ? `${name} থেকে ৳${amt} জমা করা হয়েছে।`
                : `Received ৳${amt} from ${name}.`;
        } else {
            return lang === 'bn'
                ? `${name} এর নামে ৳${amt} বাকি এন্ট্রি করা হয়েছে।`
                : `Recorded ৳${amt} due for ${name}.`;
        }
    }

    return {
        initRecognition,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        parseVoiceCommand,
        buildConfirmation,
        get isListening() { return isListening; },
    };
})();

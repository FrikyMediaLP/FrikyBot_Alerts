const FONTS_LIST = ['Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier', 'Courier New', 'Palatino', 'Garamond', 'Bookman', 'Avant Garde', 'Verdana', 'Georgia', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact', 'Roboto'];
const TRIGGER_EFFECTS = ['Fade', 'Move', 'Move Inv'];

const ALERT_PROFILE_OPTIONS = {
    'join': [],
    'follow': [],
    'sub': ['tier'],
    'resub': ['tier', 'amount'],
    'giftsub': ['tier', 'target'],
    'giftbomb': ['tier', 'amount'],
    'upgrade': ['tier'],
    'giftupgrade': ['tier'],
    'cheer': ['amount'],
    'host': ['amount'],
    'raid': ['amount']
};

let ALERT_FILE_END_INDICATOR = 0;

async function text2speech(text, volume = 1, pitch = 1, voice) {
    let msg = new SpeechSynthesisUtterance();
    
    msg.text = text;
    msg.volume = volume;
    msg.pitch = pitch;
    if (voice) msg.voice = voice;
    if (voice) msg.lang = voice.lang;
    
    window.speechSynthesis.speak(msg);

    return new Promise((resolve, reject) => {
        msg.onend = (e) => resolve();
    });
}

const TTV_IMAGE_URL = "https://static-cdn.jtvnw.net/emoticons/v2/{id}/{format}/dark/3.0";
const FFZ_IMAGE_URL = "https://cdn.frankerfacez.com/emote/{id}/4";
const BTTV_IMAGE_URL = "https://api.betterttv.net/3/emotes/{id}";

//Alert V2
function Alert_Overlay_createHTML(cfg, event, id = "", is_preview = false) {
    let s = '';
    
    s += '<div class="ALERT_V2" id="' + id + '" data-layout="' + cfg.layout + '">';

    //Text and Message
    s += '<div class="ALERT_V2_Text_Wrapper">';
    s += '<div class="ALERT_V2_Text">';
    if (cfg.text) s += Alert_Overlay_FillText(cfg.text, event);
    s += '</div>';
    s += '<div class="ALERT_V2_Message">';
    if (event.message)
        if (cfg.message_show_emotes) s += ReplaceEmotes(event.message.text, event.message.emotes, event.message.ffz_emotes, event.message.bttv_emotes, event.message.cheer_emotes);
        else s += event.message.text ||'';
    s += '</div>';
    s += '</div>';

    //Image or Video
    s += '<div class="ALERT_V2_Image_Wrapper">';

    let is_video = cfg.image ? SUPPORTED_VIDEO_FILES.find(elt => elt === cfg.image.split('.').pop()) !== undefined : false;

    if (cfg.image && !is_video) {
        s += '<div class="ALERT_V2_Image">';
        s += '<img src="/Alerts/custom/' + cfg.image + '" />';
        s += '</div>';
    }

    if (cfg.image && is_video) {
        s += '<div class="ALERT_V2_Video">';
        s += '<video onended="Alert_SourceEnded(this, ' + "'sound'" + ')">';
        s += '<source src="/Alerts/custom/' + cfg.image + '" type="video/' + cfg.image.split('.').pop() + '" onerror="Alert_SourceEnded(this, ' + "'sound'" + ')">';
        s += '</video>';
        s += '</div>';
    }

    s += '</div>';

    // CSS / JS / Sound / TTS (Hidden)
    s += '<div class="ALERT_V2_Hidden_Wrapper">';

    s += '<audio onended="Alert_SourceEnded(this, ' + "'sound'" + ')">';
    if (cfg.sound) {
        s += '<source src="/Alerts/custom/' + cfg.sound + '" type="audio/' + cfg.sound.split('.').pop() + '" onerror="Alert_SourceEnded(this, ' + "'sound'"  + ')">';
    }
    if (cfg.tts && event.message) {
        //TTS (WIP) text tts and message tts
    }
    s += '</audio>';
    
    //CSS
    s += '<style>';
    //text
    s += '.ALERT_V2_Text {';
    s += 'font-family: "' + cfg.text_font + '"; ';
    if (is_preview) s += 'font-size: ' + cfg.text_size*1.5 + 'px; ';
    else s += 'font-size: ' + cfg.text_size / 10 + 'vw; ';
    s += 'font-weight: ' + (cfg.text_bold ? 'bold' : 'normal') + '; ';
    s += 'color: ' + cfg.text_color + '; ';
    if (cfg.text_shadow) s += ' text-shadow: -1px -1px 0 ' + cfg.text_shadow_color +  ', 1px -1px 0 ' + cfg.text_shadow_color +  ', -1px 1px 0 ' + cfg.text_shadow_color +  ', 1px 1px 0 ' + cfg.text_shadow_color +  '; ';
    s += '}';
    //variable
    s += '.ALERT_V2_Variable {';
    s += 'font-family: "' + cfg.vari_font + '"; ';
    s += 'font-weight: ' + (cfg.vari_bold ? 'bold' : 'normal') + '; ';
    s += 'color: ' + cfg.vari_color + '; ';
    if (cfg.vari_shadow) s += ' text-shadow: -1px -1px 0 ' + cfg.vari_shadow_color + ', 1px -1px 0 ' + cfg.vari_shadow_color + ', -1px 1px 0 ' + cfg.vari_shadow_color + ', 1px 1px 0 ' + cfg.vari_shadow_color + '; ';
    s += '}';
    //message
    s += '.ALERT_V2_Message {';
    s += 'font-family: "' + cfg.message_font + '"; ';
    if (is_preview) s += 'font-size: ' + cfg.message_size * 1.5 + 'px; ';
    else s += 'font-size: ' + cfg.message_size / 10 + 'vw; ';
    s += 'font-weight: ' + (cfg.message_bold ? 'bold' : 'normal') + '; ';
    s += 'color: ' + cfg.message_color + '; ';
    if (cfg.message_shadow) s += ' text-shadow: -1px -1px 0 ' + cfg.message_shadow_color + ', 1px -1px 0 ' + cfg.message_shadow_color + ', -1px 1px 0 ' + cfg.message_shadow_color + ', 1px 1px 0 ' + cfg.message_shadow_color + '; ';
    s += '}';
    s += '.ALERT_V2_Message img {';
    if (is_preview) s += 'height: ' + cfg.message_size * 1.5 + 'px; ';
    else s += 'height: ' + cfg.message_size / 10 + 'vw; ';
    s += '}';

    if (cfg.css) s += cfg.css;
    s += '</style>';

    //JS
    if (cfg.js) s += '<script>' + cfg.js + '</script>';
    s += '</div>';

    s += '</div>';

    return s;
}
async function Alert_Overlay_trigger(id, cfg, onEnd) {
    let elt = document.getElementById(id);
    if (!elt) return;

    //Setup
    elt.dataset.movein = '';
    elt.dataset.moveout = '';
    elt.dataset.ontime = 'false';

    let sources = 0;
    let is_video = cfg.image ? SUPPORTED_VIDEO_FILES.find(elt => elt === cfg.image.split('.').pop()) !== undefined : false;

    //movein
    elt.dataset.movein = cfg.move_in;
    elt.style.display = 'grid';

    //Start On_Time
    Alert_awaitTime(cfg.on_time * 1000)
        .then(() => {
            //Return On Canceled
            elt = document.getElementById(id);
            if (elt) elt.dataset.ontime = 'true';
        });

    //locate video source
    let video = FindSubElementFromPath(elt, ['.ALERT_V2_Image_Wrapper', '.ALERT_V2_Video', 'VIDEO']);
    //locate sound source
    let sound = FindSubElementFromPath(elt, ['.ALERT_V2_Hidden_Wrapper', 'AUDIO']);
    
    //play video and sound
    if (video) {
        video.volume = cfg.video_volume  / 100;
        video.play();
    }
    if (sound) {
        sound.volume = cfg.sound_volume / 100;
        sound.play();
    }
    
    //Wait Sound End
    if (cfg.sound) sources++;
    if (is_video) sources++;
    await Alert_awaitSources(id, sources);

    //Return On Canceled
    elt = document.getElementById(id);
    if (!elt) {
        if (onEnd) return onEnd();
        else return false;
    }

    //play tts- WiP
    sources = 0;
    //if (cfg.text_tts) sources++;
    
    //Wait Text TTS End
    await Alert_awaitSources(id, sources);

    //Return On Canceled
    elt = document.getElementById(id);
    if (!elt) {
        if (onEnd) return onEnd();
        else return false;
    }

    sources = 0;
    //if (cfg.message_tts) sources++;

    //Wait Message TTS End
    await Alert_awaitSources(id, sources);

    //Return On Canceled
    elt = document.getElementById(id);
    if (!elt) {
        if (onEnd) return onEnd();
        else return false;
    }

    //ontime
    await Alert_awaitOnTime(elt);

    //Return On Canceled
    elt = document.getElementById(id);
    if (!elt) {
        if (onEnd) return onEnd();
        else return false;
    }

    //moveout
    elt.dataset.movein = '';
    elt.dataset.moveout = cfg.move_out;

    //delay
    await Alert_awaitTime(cfg.delay * 1000);

    //end
    if (onEnd) return onEnd();
    else return true;
}
function Alert_cancel(id) {
    let elt = document.getElementById(id);
    if (!elt) return;
    elt.remove();
}

async function Alert_awaitTime(m_s) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            return resolve();
        }, m_s)
    });
}
async function Alert_awaitSources(id, amount) {
    let elt = document.getElementById(id);
    elt.dataset.sources = 0;
    
    return new Promise((resolve, reject) => {
        let int = null;
        
        int = setInterval(() => {
            if (!int) return resolve();

            let elt = document.getElementById(id);
            if (!elt) {
                clearInterval(int);
                return resolve();
            }

            if (parseInt(elt.dataset.sources) < amount) return;
            clearInterval(int);
            return resolve();
        }, 100);
    });
}
async function Alert_awaitOnTime(elt) {
    return new Promise((resolve, reject) => {
        let int = null;

        int = setInterval(() => {
            if (!int) return resolve();
            if (elt.dataset.ontime === 'false') return;

            clearInterval(int);
            return resolve();
        }, 100);
    });
}
function Alert_SourceEnded(elt, type = '') {
    let alert = GetAlertRoot(elt);
    if (!alert) return;
    alert.dataset.sources = parseInt(alert.dataset.sources) + 1;
}

function Alert_Overlay_FillText(string = "", vars = {}) {
    vars = cloneJSON(vars);

    for (let key in vars) {
        vars[key] = '<span class="ALERT_V2_Variable">' + vars[key] + '</span>';
    }

    return FillFormattedString(string, vars);
}
function ReplaceEmotes(message = "", ttv = [], ffz = [], bttv = [], cheer = []) {
    let replaced_message = "";

    let emotes = [];
    for (let emote of ttv) emotes.push({ type: 'ttv', data: emote });
    for (let emote of ffz) emotes.push({ type: 'ffz', data: emote });
    for (let emote of bttv) emotes.push({ type: 'bttv', data: emote });
    for (let emote of cheer) emotes.push({ type: 'cheer', data: emote });
    emotes.sort((a, b) => a.data.begin - b.data.begin);

    let last_end = 0;
    for (let emote of emotes) {
        let img = '<img title="' + message.substring(emote.data.begin - 1, emote.data.end + 1) + '" src="';
        if (emote.type === 'ttv') img += FillFormattedString(TTV_IMAGE_URL, { id: emote.data.id, format: 'default' });
        if (emote.type === 'bttv') img += FillFormattedString(BTTV_IMAGE_URL, { id: emote.data.id });
        if (emote.type === 'ffz') img += FillFormattedString(FFZ_IMAGE_URL, { id: emote.data.id });
        if (emote.type === 'cheer') img += emote.data.images.light.animated ? emote.data.images.light.animated['4'] : emote.data.images.light.static['4'];
        img += '" />';

        replaced_message += '<span>' + message.substring(last_end, emote.data.begin) + '</span><span>' + img + '</span>';
        last_end = emote.data.end + 1;
    }
    replaced_message += '<span>' + message.substring(last_end) + '</span>';

    return replaced_message;
}
function sortBounds(arr = []) {
    let smallest = cloneJSONArray(arr)
        .sort((a, b) => a.where.min - b.where.min)
        .filter(elt => elt.where.min !== -1 && elt.where.max !== -1);

    let smallest_upper = cloneJSONArray(arr)
        .sort((a, b) => a.where.max - b.where.max)
        .filter(elt => elt.where.min === -1 && elt.where.max !== -1);

    let biggest_lower = cloneJSONArray(arr)
        .sort((a, b) => a.where.min - b.where.min)
        .filter(elt => elt.where.min !== -1 && elt.where.max === -1);

    let biggest = cloneJSONArray(arr)
        .sort((a, b) => b.where.max - a.where.max)
        .filter(elt => elt.where.min === -1 && elt.where.max === -1);

    //fussion
    return smallest.concat(smallest_upper).concat(biggest_lower).concat(biggest);
}
function GetAlertRoot(elt) {
    while (!elt.classList.contains('ALERT_V2') && elt.tagName !== 'BODY') {
        elt = elt.parentElement;
    }

    if (elt.tagName === 'BODY') return null;

    return elt;
}

function findProfileFromAlertCfg(type, alert = {}, event = {}) {
    let selection = alert.profiles;

    if (ALERT_PROFILE_OPTIONS[type].find(elt => elt === 'tier')) {
        switch (event.tier) {
            case 'Tier 1': selection = selection.filter(elt => elt.where.tier1 === true); break;
            case 'Tier 2': selection = selection.filter(elt => elt.where.tier2 === true); break;
            case 'Tier 3': selection = selection.filter(elt => elt.where.tier3 === true); break;
            case 'Twitch Prime': selection = selection.filter(elt => elt.where.twitchprime === true); break;
        }
    }

    if (ALERT_PROFILE_OPTIONS[type].find(elt => elt === 'amount')) selection = sortBounds(selection);

    let amount = 0;
    if (event.months !== undefined) amount = event.months;
    if (event.amount !== undefined) amount = event.amount;

    let profile = null;
    for (let i = 0; i < selection.length; i++) {
        let cur = selection[i];

        if (cur.where.min > amount) continue;
        if (cur.where.max < amount && cur.where.max !== -1) continue;
        profile = cur;
        break;
    }

    return profile;
}
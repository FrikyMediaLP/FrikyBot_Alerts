const FONTS_LIST = ['Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier', 'Courier New', 'Palatino', 'Garamond', 'Bookman', 'Avant Garde', 'Verdana', 'Georgia', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact', 'Roboto'];
const TRIGGER_EFFECTS = ['Fade', 'Move', 'Move Inv'];
let VOICES = [];
let SKIPPED = false;

let WEIRD_TWITCH_TIME_DIALATION = 0;

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
const ALERT_VARIABLES = {
    'join': [
        { name: 'username', desc: 'The name of the user joining the IRC.', type: 'string' }
    ],
    'follow': [
        { name: 'username', desc: 'The name of the user following the Channel.', type: 'string' }
    ],
    'sub': [
        { name: 'username', desc: 'The name of the user subscribing to the channel.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2', 'Tier 3' or 'Twitch Prime'.", type: 'string' }
    ],
    'resub': [
        { name: 'username', desc: 'The name of the user resubscribing to the channel.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2', 'Tier 3' or 'Twitch Prime'.", type: 'string' },
        { name: 'months', desc: 'The amount of months a user has been subscribed for.', type: 'number' },
        { name: 'message', desc: 'Message sent by the user.', type: 'string' }
    ],
    'giftsub': [
        { name: 'username', desc: 'The name of the user gifting subs.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2', 'Tier 3' or 'Twitch Prime'.", type: 'string' },
        { name: 'target', desc: 'The name of the user receiving a sub.', type: 'string' },
        { name: 'total', desc: 'The total number of subgifts the user has.', type: 'number' }
    ],
    'giftbomb': [
        { name: 'username', desc: 'The name of the user gifting subs.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2', 'Tier 3' or 'Twitch Prime'.", type: 'string' },
        { name: 'amount', desc: 'The amount of subs gifted.', type: 'number' },
        { name: 'total', desc: 'The total number of subgifts the user has.', type: 'number' }
    ],
    'upgrade': [
        { name: 'username', desc: 'The name of the user gifting subs.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2' or 'Tier 3'.", type: 'string' }
    ],
    'giftupgrade': [
        { name: 'username', desc: 'The name of the user gifting subs.', type: 'string' },
        { name: 'target', desc: 'The name of the user receiving a subupgrade.', type: 'string' },
        { name: 'tier', desc: "Returns 'Tier 1', 'Tier 2' or 'Tier 3'.", type: 'string' }
    ],
    'cheer': [
        { name: 'username', desc: 'The name of the user donating bits.', type: 'string' },
        { name: 'amount', desc: 'The amount of bits donated.', type: 'number' }
    ],
    'host': [
        { name: 'username', desc: 'The name of the user hosting.', type: 'string' },
        { name: 'amount', desc: 'The amount of viewers who joined the host.', type: 'number' }
    ],
    'raid': [
        { name: 'username', desc: 'The name of the user raiding.', type: 'string' },
        { name: 'amount', desc: 'The amount of viewers  who joined the raid.', type: 'number' }
    ]
};

const EVENT_VARIABLES = {
    'poll': [
        { name: 'title', desc: 'The name of the Poll.', type: 'string' },
        { name: 'choices', desc: 'The list of choices in the Poll.', type: 'string' },
        { name: 'results', desc: 'The list of choices and votes in the Poll.', type: 'string' },
        { name: 'winner', desc: 'The winning choice and its votes of the Poll.', type: 'string' },
        { name: 'ends', desc: 'How long until the Poll will end.', type: 'string' }
    ],
    'prediction': [
        { name: 'title', desc: 'The name of the Prediction.', type: 'string' },
        { name: 'outcomes', desc: 'The list of outcomes in the Prediction.', type: 'string' },
        { name: 'lock_time', desc: 'How long until the Prediction will lock voting.', type: 'string' },
        { name: 'winner', desc: 'The winning outcome of the Prediction.', type: 'string' },
        { name: 'spent', desc: 'The Number of channel points spent on all outcomes.', type: 'number' },
        { name: 'corrent_spent', desc: 'The Number of channel points spent on correct outcomes.', type: 'number' },
        { name: 'wrong_spent', desc: 'The Number of channel points spent on wrong outcomes.', type: 'number' },
        { name: 'correct_users', desc: 'The number of users who picked correctly.', type: 'number' },
        { name: 'wrong_users', desc: 'The number of users who picked wrong.', type: 'number' },
        { name: 'awared', desc: 'The Number of awarded channel points.', type: 'number' }
    ],
    'channel_point_redemption': [
        { name: 'title', desc: 'The title of the Reward', type: 'number' },
        { name: 'prompt', desc: 'The description of the Reward', type: 'number' },
        { name: 'cost', desc: 'The cost of the Reward', type: 'number' },
        { name: 'username', desc: 'The name of the user redeeming the reward', type: 'number' },
        { name: 'userinput', desc: 'The input the user gave when redeeming the reward', type: 'number' }
    ],
    'hypetrain': [
        { name: 'subs', desc: 'The number of subs occoured during the hypetrain.', type: 'number' },
        { name: 'bits', desc: 'The number of bits spent during the hypetrain.', type: 'number' },
        { name: 'level', desc: 'The level of the hypetrain.', type: 'number' }
    ]
};

let ALERT_FILE_END_INDICATOR = 0;

async function GetVoices() {
    let voices = [];

    return new Promise((resolve, reject) => {
        let inter = setInterval(() => {
            voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                clearInterval(inter);
                return resolve(voices);
            }
        }, 100);
    });
}
function CreateVoice(volume = 1, pitch = 1, voice) {
    let msg = new SpeechSynthesisUtterance();
    msg.volume = volume;
    msg.pitch = pitch;
    if (voice) msg.voice = voice;
    if (voice) msg.lang = voice.lang;
    return msg;
}
async function text2speech(text, voice) {
    voice.text = text;
    window.speechSynthesis.speak(voice);

    return new Promise((resolve, reject) => {
        let inter = null;

        voice.onend = (e) => {
            resolve();
            clearInterval(inter);
        }
        
        inter = setInterval(() => {
            if (SKIPPED === true) {
                clearInterval(inter);
                window.speechSynthesis.cancel();
                reject(new Error('skipped'));
            }
        }, 100);
    });
}

const TTV_IMAGE_URL = "https://static-cdn.jtvnw.net/emoticons/v2/{id}/{format}/dark/3.0";
const FFZ_IMAGE_URL = "https://cdn.frankerfacez.com/emote/{id}/4";
const BTTV_IMAGE_URL = "https://cdn.betterttv.net/emote/{id}/3x";

//ALERTS
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
        if (cfg.message_show_emotes) s += ReplaceEmotes(event.message.text, event.message.ttv_emotes, event.message.ffz_emotes, event.message.bttv_emotes, event.message.cheer_emotes);
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
        s += '<video onended="Alert_SourceEnded(this, ' + "'video'" + ')">';
        s += '<source src="/Alerts/custom/' + cfg.image + '" type="video/' + cfg.image.split('.').pop() + '" onerror="Alert_SourceEnded(this, ' + "'video'" + ')">';
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
    
    s += '</div>';

    s += '</div>';

    return s;
}
async function Alert_Overlay_trigger(id, cfg, event, onEnd) {
    SKIPPED = false;
    let elt = document.getElementById(id);
    if (!elt) return;

    //JS
    if (cfg.js) {
        let script_tag = document.createElement('script');
        script_tag.type = 'text/javascript';
        script_tag.text = cfg.js;
        elt.appendChild(script_tag);
    }

    //Setup
    elt.dataset.movein = '';
    elt.dataset.moveout = '';
    elt.dataset.ontime = 'false';
    Alert_STAGE_setup(elt, cfg, event);

    let sources = 0;
    let is_video = cfg.image ? SUPPORTED_VIDEO_FILES.find(elt => elt === cfg.image.split('.').pop()) !== undefined : false;

    //movein
    elt.dataset.movein = cfg.move_in;
    elt.style.display = 'grid';
    Alert_STAGE_movein(elt, cfg, event);

    //Start On_Time
    try {
        Alert_awaitTime(cfg.on_time * 1000).then(x => elt.dataset.ontime = 'true');
    } catch (err) {

    }

    //locate video source
    let video = FindSubElementFromPath(elt, ['.ALERT_V2_Image_Wrapper', '.ALERT_V2_Video', 'VIDEO']);
    //locate sound source
    let sound = FindSubElementFromPath(elt, ['.ALERT_V2_Hidden_Wrapper', 'AUDIO']);

    Alert_STAGE_media_play(elt, cfg, event);

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

    try {
        await Alert_awaitSources(id, sources);
    } catch (err) {
        return Alert_close(elt, cfg, onEnd);
    }

    Alert_STAGE_media_end(elt, cfg, event);
    
    //Voice
    let voice = CreateVoice(CONFIG.tts_volume, CONFIG.tts_pitch, VOICES.find(elt => elt.name === CONFIG.tts_voice));

    //play Text tts
    if (cfg.text_tts && cfg.text) {
        Alert_STAGE_text_tts(elt, cfg, event);
        try {
            await text2speech(FillFormattedString(cfg.text, event), voice);
        } catch (err) {
            return Alert_close(elt, cfg, onEnd);
        }
    }

    //play Message tts
    if (cfg.message_tts && event.message) {
        Alert_STAGE_msg_tts(elt, cfg, event);
        try {
            await text2speech(cfg.message_tts_skip_emotes ? messageWithoutEmotes(event.message.text, event.message.ttv_emotes, event.message.ffz_emotes, event.message.bttv_emotes, event.message.cheer_emotes) : event.message.text, voice);
        } catch (err) {
            return Alert_close(elt, cfg, onEnd);
        }
    }

    //ontime
    try {
        await Alert_awaitOnTime(elt);
    } catch (err) {

    }
    
    return Alert_close(elt, cfg, onEnd);
}
async function Alert_close(elt, cfg, onEnd) {
    //moveout
    elt.dataset.movein = '';
    elt.dataset.moveout = cfg.move_out;
    Alert_STAGE_moveout(elt, cfg);

    //delay
    await Alert_awaitTime(cfg.delay * 1000, true);

    Alert_STAGE_end(elt);

    if (onEnd) return onEnd();
    else return true;
}
function Alert_cancel(id) {
    SKIPPED = true;
    let elt = document.getElementById(id);
    if (!elt) return;
    elt.remove();
}

//OVERWRITEABLE FUNCTION
function Alert_STAGE_setup(elt, cfg, event) {

}
function Alert_STAGE_movein(elt, cfg, event) {

}
function Alert_STAGE_source_end(alert, elt, type) {

}
function Alert_STAGE_media_play(elt, cfg, event) {

}
function Alert_STAGE_media_end(elt, cfg, event) {

}
function Alert_STAGE_text_tts(elt, cfg, event) {

}
function Alert_STAGE_msg_tts(elt, cfg, event) {

}
function Alert_STAGE_moveout(elt, cfg, event) {

}
function Alert_STAGE_end(elt, cfg, event) {

}

//Alert creation
async function Alert_awaitTime(m_s, ignore_skip = false) {
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
            if (!elt || SKIPPED) {
                clearInterval(int);
                return reject(new Error('skipped'));
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
            
            if (!elt || SKIPPED) {
                clearInterval(int);
                return reject(new Error('skipped'));
            }
            
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
    if (type) {
        Alert_STAGE_source_end(alert, elt, type);
    }
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
    if (!message) return "";

    let emotes = [];
    for (let emote of ttv || []) for (let use of emote.uses) emotes.push({ type: 'ttv', data: use, id: emote.id, name: emote.name });
    for (let emote of ffz || []) for (let use of emote.uses) emotes.push({ type: 'ffz', data: use, id: emote.id, name: emote.name });
    for (let emote of bttv || []) for (let use of emote.uses) emotes.push({ type: 'bttv', data: use, id: emote.id, name: emote.name });
    for (let emote of cheer || []) for (let use of emote.uses) emotes.push({ type: 'cheer', data: use, tier: emote.tier, prefix: emote.prefix, images: emote.images });
    emotes.sort((a, b) => a.data.start - b.data.end);
    
    let last_end = 0;
    for (let emote of emotes) {
        let img = '<img title="' + emote.name + '" src="';
        if (emote.type === 'ttv') img += FillFormattedString(TTV_IMAGE_URL, { id: emote.id, format: 'default' });
        if (emote.type === 'bttv') img += FillFormattedString(BTTV_IMAGE_URL, { id: emote.id });
        if (emote.type === 'ffz') img += FillFormattedString(FFZ_IMAGE_URL, { id: emote.id });
        if (emote.type === 'cheer') img += emote.images.light.animated ? emote.images.light.animated['4'] : emote.images.light.static['4'];
        img += '" />';

        replaced_message += '<span>' + message.substring(last_end, emote.data.start) + '</span><span>' + img + '</span>';
        last_end = emote.data.end + 1;
    }
    replaced_message += '<span>' + message.substring(last_end) + '</span>';

    return replaced_message;
}
function messageWithoutEmotes(message = "", ttv = [], ffz = [], bttv = [], cheer = []) {
    let replaced_message = "";
    if (!message) return "";

    let emotes = [];
    for (let emote of ttv || []) for (let use of emote.uses) emotes.push({ type: 'ttv', data: use, id: emote.id, name: emote.name });
    for (let emote of ffz || []) for (let use of emote.uses) emotes.push({ type: 'ffz', data: use, id: emote.id, name: emote.name });
    for (let emote of bttv || []) for (let use of emote.uses) emotes.push({ type: 'bttv', data: use, id: emote.id, name: emote.name });
    for (let emote of cheer || []) for (let use of emote.uses) emotes.push({ type: 'cheer', data: use, tier: emote.tier, prefix: emote.prefix, images: emote.images });
    emotes.sort((a, b) => a.data.start - b.data.end);

    let last_end = 0;
    for (let emote of emotes) {
        replaced_message += message.substring(last_end, emote.data.start);
        last_end = emote.data.end + 1;
    }
    replaced_message += message.substring(last_end);

    return replaced_message;
}
function sortBounds(arr = [], pre = 'amount') {
    let smallest = cloneJSONArray(arr)
        .sort((a, b) => a.where[pre + '_min'] - b.where[pre + '_min'])
        .filter(elt => elt.where[pre + '_min'] !== -1 && elt.where[pre + '_max'] !== -1);

    let smallest_upper = cloneJSONArray(arr)
        .sort((a, b) => a.where[pre + '_max'] - b.where[pre + '_max'])
        .filter(elt => elt.where[pre + '_min'] === -1 && elt.where[pre + '_max'] !== -1);

    let biggest_lower = cloneJSONArray(arr)
        .sort((a, b) => a.where[pre + '_min'] - b.where[pre + '_min'])
        .filter(elt => elt.where[pre + '_min'] !== -1 && elt.where[pre + '_max'] === -1);

    let biggest = cloneJSONArray(arr)
        .sort((a, b) => b.where[pre + '_max'] - a.where[pre + '_max'])
        .filter(elt => elt.where[pre + '_min'] === -1 && elt.where[pre + '_max'] === -1);

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

//EVENTS
function Events_createHTML(type, cfg, event) {
    if (type === 'poll') return Event_createPoll(event, cfg);
    else if (type === 'prediction') return Event_createPrediction(event, cfg);
    else if (type === 'channel_point_redemption') return Event_createChannelPointRedeption(event, cfg);
    else if (type === 'hypetrain') return Event_createHypeTrain(event, cfg);
    else return '';
}
async function Events_trigger(elt, type, cfg, event) {
    if (type === 'hypetrain') {
    //Move in
        return Event_updateHypeTrain_Intro(event, cfg);
    } else if (type === 'channel_point_redemption') {
        //Ontime
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                //Audio
                let AUDIO_elt = FindSubElementFromPath(elt, ['AUDIO']);
                if (AUDIO_elt) AUDIO_elt.remove();
                if (cfg.use_hide_sound && cfg.hide_sound) {
                    let element = document.createElement('DIV');

                    let sound = cfg.hide_sound || 0;
                    let volume = cfg.hide_volume || "";

                    let s = '';
                    s += '<audio autoplay data-vol="' + (volume / 100) + '" onplay="this.volume=parseFloat(this.dataset.vol);">';
                    s += '<source src="/Alerts/custom/' + sound + '" type="audio/' + sound.split('.').pop() + '">';
                    s += '</audio>';
                    element.innerHTML = s;

                    elt.appendChild(element.childNodes[0]);
                }

                //Move
                elt.dataset.end = true;
                elt.dataset.effect = cfg.hide_method || 'move';
                elt.dataset.dir = cfg.hide_direction || 'R';

                setTimeout(() => resolve(false), 4000);
            }, (cfg.display_duration || 10) * 1000);
        });
    }
}
async function Events_update(elt, type, cfg, event) {
    if (type === 'poll') {
        return Event_updatePoll(elt, event, cfg);
    }
    else if (type === 'prediction') {
        return Event_updatePrediction(elt, event, cfg);
    }
    else if (type === 'hypetrain') {
        return Event_updateHypeTrain_Head(event, cfg);
    }
    else if (['sub', 'resub', 'giftsub', 'giftbomb', 'cheer'].find(elt2 => elt2 === type)) {
        //Hypetrain Contribution Events
        event.topic = type;
        return Event_updateHypeTrain_Cart(elt.id.split('_').pop(), event, cfg);
    }
}

//Poll
function Event_createPoll(data = {}, cfg = { type: 'twitch' }) {
    let s = '';
    s += '<div class="EVENT EVENT_POLL ' + (cfg.type ? cfg.type.toUpperCase() : 'FRIKYBOT') + '" id="EVENT_POLL_' + data.id + '" ';
    if(cfg.display_time !== 'closed') s += ' data-effect="' + (cfg.display_method || 'move') + '" data-dir="' + (cfg.display_direction || 'R') + '" data-end="false" ';
    s += '>';
    if (cfg.type === 'twitch') s += Event_PollInner_TwitchVersion(data, cfg);
    else s += Event_PollInner_FrikyBotVersion(data, cfg);
    s += '</div>';
    return s;
}
async function Event_updatePoll(elt, data = {}, cfg = { type: 'twitch' }, duration = 1000, update_ratio = 0.1) {
    if (cfg.type === 'twitch') return Event_PollInner_TwitchVersion_update(elt, data, cfg, duration, update_ratio);
    else return Event_PollInner_FrikyBotVersion_update(elt, data, cfg, duration, update_ratio);
}

function Event_PollInner_FrikyBotVersion(data = {}, cfg = {}) {
    if (data.choices === undefined) data.choices = [];
    data.choices.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    let s = '';

    //CSS
    s += '<style>';
    s += '#EVENT_POLL_' + data.id + '{';
    let order = cfg.order || 'pos percent text votes';
    const columns_widths = {
        pos: '37px',
        percent: '60px',
        text: 'auto',
        votes: '60px'
    };

    //general Cell
    if (cfg.cell_border === false) s += '--event-poll-cell-border: none;';
    else if (cfg.cell_border_style) s += '--event-poll-cell-border: ' + cfg.cell_border_style + ';';
    if (cfg.cell_border_radius) s += '--event-poll-cell-border-radius: ' + cfg.cell_border_radius + 'px;';
    if (cfg.cell_border_color) {
        s += '--event-poll-index-border-color: ' + cfg.cell_border_color + ';';
        s += '--event-poll-choice-border-color: ' + cfg.cell_border_color + ';';
        s += '--event-poll-exact-border-color: ' + cfg.cell_border_color + ';';
        s += '--event-poll-percentages-border-color: ' + cfg.cell_border_color + ';';
    }
    if (cfg.cell_background_color) {
        s += '--event-poll-index-background-color: ' + cfg.cell_background_color + ';';
        s += '--event-poll-choice-background-color: ' + cfg.cell_background_color + ';';
        s += '--event-poll-exact-background-color: ' + cfg.cell_background_color + ';';
        s += '--event-poll-percentages-background-color: ' + cfg.cell_background_color + ';';
    }
    if (cfg.cell_color) {
        s += '--event-poll-index-color: ' + cfg.cell_color + ';';
        s += '--event-poll-choice-color: ' + cfg.cell_color + ';';
        s += '--event-poll-exact-color: ' + cfg.cell_color + ';';
        s += '--event-poll-percentages-color: ' + cfg.cell_color + ';';
    }
    
    //index
    if (cfg.display_index === false) {
        s += '--event-poll-index-display: none;';
        order = order.split(' ').filter(elt => elt !== 'pos').join(' ');
    }
    if (cfg.index_color) s += '--event-poll-index-color: ' + cfg.index_color + ';';
    if (cfg.index_background_color) s += '--event-poll-index-background-color: ' + cfg.index_background_color + ';';
    if (cfg.index_border_color) s += '--event-poll-index-border-color: ' + cfg.index_border_color + ';';

    //choice
    if (cfg.display_choice === false) {
        s += '--event-poll-choice-display: none;';
        order = order.split(' ').filter(elt => elt !== 'text').join(' ');
    }
    if (cfg.choice_color) s += '--event-poll-choice-color: ' + cfg.choice_color + ';';
    if (cfg.choice_background_color) s += '--event-poll-choice-background-color: ' + cfg.choice_background_color + ';';
    if (cfg.choice_border_color) s += '--event-poll-choice-border-color: ' + cfg.choice_border_color + ';';

    //exact
    if (cfg.display_exact !== true) {
        s += '--event-poll-exact-display: none;';
        order = order.split(' ').filter(elt => elt !== 'votes').join(' ');
    }
    if (cfg.exact_color) s += '--event-poll-exact-color: ' + cfg.exact_color + ';';
    if (cfg.exact_background_color) s += '--event-poll-exact-background-color: ' + cfg.exact_background_color + ';';
    if (cfg.exact_border_color) s += '--event-poll-exact-border-color: ' + cfg.exact_border_color + ';';

    //percentages
    if (cfg.display_percentages === false) {
        s += '--event-poll-percentages-display: none;';
        order = order.split(' ').filter(elt => elt !== 'percent').join(' ');
    }
    if (cfg.percentages_color) s += '--event-poll-percentages-color: ' + cfg.percentages_color + ';';
    if (cfg.percentages_background_color) s += '--event-poll-percentages-background-color: ' + cfg.percentages_background_color + ';';
    if (cfg.percentages_border_color) s += '--event-poll-percentages-border-color: ' + cfg.percentages_border_color + ';';

    //footer
    if (cfg.display_footer === false) s += '--event-poll-footer-display: none;';
    if (cfg.footer_color) s += '--event-poll-footer-color: ' + cfg.footer_color + ';';
    if (cfg.footer_border_color) s += '--event-poll-footer-border-color: ' + cfg.footer_border_color + ';';

    //grid
    if (order) s += '--event-poll-grid-order: "' + order + '";';
    if (cfg.grid_gap) s += '--event-poll-grid-gap: ' + cfg.grid_gap + 'px;';
    
    let columns = '';
    for (let area of order.split(' ')) {
        columns += (columns_widths[area] || 'auto') + ' ';
    }
    s += '--event-poll-grid-columns: ' + columns + ';';
    s += '}';
    s += '</style>';
    
    //HTML
    s += '<center>' + (data.title || 'Title here') + '</center>';

    let total = data.choices.reduce((sum, cur) => sum + (cur.votes || 0), 0);
    total = Math.max(total, 1);

    //choices
    for (let i = 0; i < data.choices.length; i++) {
        s += '<div class="EVENT_POLL_CHOICE" data-choice="' + data.choices[i].id + '" data-position="' + i + '">';
        s += '<center class="EVENT_POLL_CHOICE_POSITION" data-pos="' + (i + 1) + '">' + (i + 1) + '</center>';
        s += '<center class="EVENT_POLL_CHOICE_PERCENTAGE" data-votes="' + (data.choices[i].votes || 0) + '">' + Math.round(((data.choices[i].votes || 0) / total) * 100) + '%</center>';
        s += '<div class="EVENT_POLL_CHOICE_TEXT">' + data.choices[i].title + '</div>';
        s += '<center class="EVENT_POLL_CHOICE_VOTES">' + (data.choices[i].votes || 0) + '</center>';
        s += '</div>';
    }

    s += '<center class="EVENT_POLL_FOOTER">Total Votes: ' + total + ' - Poll ';
    if (Date.now() < (new Date(data.ends_at)).getTime()) s += 'Ends ' + relativeTime((new Date(data.ends_at)).getTime()) + '!';
    else s += 'Ended!';
    s += '!</center>';

    return s;
}
async function Event_PollInner_FrikyBotVersion_update(elt, data = {}, cfg = {}, duration = 1000, update_ratio = 0.1) {
    const move_duration = duration;
    const number_update_interval = move_duration * update_ratio;

    if (elt.dataset.moving === 'true') return Promise.reject(new Error('moving'));
    elt.dataset.moving = "true";

    let copy = cloneJSON(data);
    if (copy.choices === undefined) copy.choices = [];
    copy.choices.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    for (let child of elt.childNodes) {
        if (child instanceof Element && child.dataset.choice !== undefined) {
            let choice = copy.choices.find(elt2 => elt2.id === child.dataset.choice);
            if (choice) choice.element = child;
        }
    }

    //Animation
    return new Promise((resolve, reject) => {
        //Move
        for (let i = 0; i < copy.choices.length; i++) {
            copy.choices[i].element.style.setProperty('--event-poll-move-index', (i - parseInt(copy.choices[i].element.dataset.position)));
            copy.choices[i].element.style.animation = 'pollMoveUp ' + Math.floor(move_duration / 1000) + 's forwards';
        }

        let old_total = 0;
        for (let i = 0; i < copy.choices.length; i++) {
            let votes = FindSubElementFromPath(copy.choices[i].element, ['.EVENT_POLL_CHOICE_PERCENTAGE']);
            if (votes) old_total += parseInt(votes.dataset.votes);
        }
        old_total = Math.max(old_total, 1);

        let total = copy.choices.reduce((sum, cur) => sum + (cur.votes || 0), 0);
        total = Math.max(total, 1);

        //Update Text
        let step = 1;
        let interval = setInterval(() => {
            let increment = step * (number_update_interval / move_duration);

            for (let i = 0; i < copy.choices.length; i++) {
                //Choice Position
                if ((i - parseInt(copy.choices[i].element.dataset.position)) !== 0) {
                    let pos = FindSubElementFromPath(copy.choices[i].element, ['.EVENT_POLL_CHOICE_POSITION']);
                    if (pos) pos.innerHTML = Math.min(Math.max(1, Math.round(increment * (i - parseInt(pos.dataset.pos)) + parseInt(pos.dataset.pos))), copy.choices.length);
                }

                //Choice Percent
                let percent = FindSubElementFromPath(copy.choices[i].element, ['.EVENT_POLL_CHOICE_PERCENTAGE']);
                if (percent && Math.round((parseInt(percent.dataset.votes) / old_total) * 100) !== Math.round((copy.choices[i].votes / total) * 100)) {
                    let votes_base = ((copy.choices[i].votes || 0) - parseInt(percent.dataset.votes));
                    let votes_bias = parseInt(percent.dataset.votes);

                    let total_base = total - old_total;
                    let total_bias = old_total;

                    percent.innerHTML = Math.round(((increment * votes_base + votes_bias) / (increment * total_base + total_bias)) * 100) + '%';
                }

                //Choice Votes
                let votes = FindSubElementFromPath(copy.choices[i].element, ['.EVENT_POLL_CHOICE_VOTES']);
                if (votes && parseInt(votes.dataset.votes) !== copy.choices[i].votes) {
                    let votes_base = ((copy.choices[i].votes || 0) - parseInt(votes.dataset.votes));
                    let votes_bias = parseInt(votes.dataset.votes);

                    votes.innerHTML = Math.round(increment * votes_base + votes_bias);
                }
            }

            //Total Votes & Time
            let tot = FindSubElementFromPath(elt, ['.EVENT_POLL_FOOTER']);
            if (tot) {
                let s = "Total Votes: " + Math.round(increment * (total - old_total) + old_total) + ' - ';

                if ((new Date(data.ends_at)).getTime() > Date.now()) s += "Poll Ends " + relativeTime((new Date(data.ends_at)).getTime()) + '!';
                else s += "Poll Ended!";

                tot.innerHTML = s;
            }

            step++;
        }, number_update_interval);

        //End Animation
        setTimeout(() => {
            //Transition to new
            elt.innerHTML = Event_PollInner_FrikyBotVersion(data, cfg);
            elt.dataset.moving = "false";
            clearInterval(interval);
            resolve(elt);
        }, move_duration);
    });
}

function Event_PollInner_TwitchVersion(data = {}, cfg = {}, from_update = false) {
    let s = '';

    //HTML
    s += '<div class="POLL_HEADER_WRAPPER">';

    //Header
    if (data.status === 'completed') s += '<div class="POLL_PREHEADER">Poll ended!</div>';
    else if (data.ended_at) s += '<div class="POLL_PREHEADER">Poll terminated!</div>';
    s += '<div class="POLL_HEADER">' + (data.title || 'Title here') + '</div>';
    s += '</div>';

    let total = data.choices.reduce((sum, cur) => sum + (cur.votes || 0), 0);
    total = Math.max(total, 1);

    let max = 0;
    for (let choice of data.choices) if (choice.votes && choice.votes > max) max = choice.votes;
    let highlighted = false;

    //Choices
    for (let i = 0; i < data.choices.length; i++) {
        let percent = Math.round(((data.choices[i].votes || 0) / total) * 100);

        s += '<div class="EVENT_POLL_CHOICE ';
        if (data.ended_at && !highlighted && max === (data.choices[i].votes || 0)) {
            s += 'highlighted" data-choice="' + data.choices[i].id + '">';
            s += '<div class="EVENT_POLL_CHOICE_TEXT"><img src="/Alerts/images/trophy-solid.svg" /><span>' + data.choices[i].title + '</span></div>';
            highlighted = true;
        } else {
            s += '" data-choice="' + data.choices[i].id + '">';
            s += '<div class="EVENT_POLL_CHOICE_TEXT">' + data.choices[i].title + '</div>';
        }
        s += '<center class="EVENT_POLL_CHOICE_PERCENTAGE" data-votes="' + (data.choices[i].votes || 0) + '">' + percent + '%</center>';
        s += '<center class="EVENT_POLL_CHOICE_VOTES" data-votes="' + (data.choices[i].votes || 0) + '">(' + (data.choices[i].votes || 0) + ')</center>';
        s += '<div class="EVENT_POLL_CHOICE_BAR" data-votes="' + (data.choices[i].votes || 0) + '" style="--event-poll-choice-offset: ' + Math.max(percent, 0) + '%;"></div>';
        s += '</div>';
    }

    //Footer
    if (!from_update && WEIRD_TWITCH_TIME_DIALATION === 0) {
        WEIRD_TWITCH_TIME_DIALATION = Date.now() - (new Date(data.started_at)).getTime();
    }

    let span = (new Date(data.ends_at || 0)).getTime() - (new Date(data.started_at)).getTime();
    let progress = (new Date(data.ends_at || 0)).getTime() - Date.now() + WEIRD_TWITCH_TIME_DIALATION;
    let ratio = (progress / span) * 100;

    if (cfg.hide_time === 'ontime') {
        progress = (cfg.display_duration || 10) * 1000;
        ratio = 100;
    }

    if (data.ended_at) {
        progress = (cfg.display_duration || 10) * 1000;
        ratio = 100;
    }

    s += '<div class="EVENT_POLL_FOOTER" style="--event-poll-footer-offset: ' + Math.max(ratio, 0) + '%; --event-poll-footer-duration: ' + (progress / 1000) + 's;"></div>';

    //Sound
    let sound = null;
    let volume = 50;
    if (cfg.display_time !== 'closed' && cfg.use_display_sound && data.ends_at !== undefined && !from_update) {
        sound = cfg.display_sound;
        volume = cfg.display_volume;
    }
    if (cfg.use_concluded_sound && data.ended_at && data.status === 'completed') {
        sound = cfg.concluded_sound;
        volume = cfg.concluded_volume;
    }

    s += '<audio autoplay data-vol="' + (volume / 100) + '" onplay="this.volume=parseFloat(this.dataset.vol);">';
    if (sound) s += '<source src="/Alerts/custom/' + sound + '" type="audio/' + sound.split('.').pop() + '">';
    s += '</audio>';

    return s;
}
async function Event_PollInner_TwitchVersion_update(elt, data = {}, cfg = {}, duration = 1000, update_ratio = 0.1) {
    const move_duration = duration;
    const number_update_interval = move_duration * update_ratio;

    if (elt.dataset.moving === 'true') return Promise.reject(new Error('moving'));
    if (elt.dataset.done === 'ended') return Promise.reject(new Error('ended'));
    elt.dataset.moving = "true";

    let copy = cloneJSON(data);
    if (copy.choices === undefined) copy.choices = [];
    copy.choices.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    for (let child of elt.childNodes) {
        if (child instanceof Element && child.dataset.choice !== undefined) {
            let choice = copy.choices.find(elt2 => elt2.id + "" === child.dataset.choice + "");
            if (choice) choice.element = child;
        }
    }

    let old_total = 0;
    for (let i = 0; i < copy.choices.length; i++) {
        let votes = FindSubElementFromPath(copy.choices[i].element, ['.EVENT_POLL_CHOICE_PERCENTAGE']);
        if (votes) old_total += parseInt(votes.dataset.votes);
    }
    old_total = Math.max(old_total, 1);


    let total = copy.choices.reduce((sum, cur) => sum + (cur.votes || 0), 0);
    total = Math.max(total, 1);

    //Animation
    return new Promise((resolve, reject) => {
        //Update Text
        let step = 1;
        let interval = setInterval(() => {
            let increment = step * (number_update_interval / move_duration);

            for (let i = 0; i < copy.choices.length; i++) {
                //Choice Votes
                let votes = FindSubElementFromPath(copy.choices[i].element, ['.EVENT_POLL_CHOICE_VOTES']);
                if (votes && parseInt(votes.dataset.votes) !== copy.choices[i].votes) {
                    let votes_base = ((copy.choices[i].votes || 0) - parseInt(votes.dataset.votes));
                    let votes_bias = parseInt(votes.dataset.votes);

                    votes.innerHTML = '(' + Math.round(increment * votes_base + votes_bias) + ')';
                }

                //Choice Percent
                let percent = FindSubElementFromPath(copy.choices[i].element, ['.EVENT_POLL_CHOICE_PERCENTAGE']);
                if (percent && Math.round((parseInt(percent.dataset.votes) / old_total) * 100) !== Math.round((copy.choices[i].votes / total) * 100)) {
                    let votes_base = ((copy.choices[i].votes || 0) - parseInt(percent.dataset.votes));
                    let votes_bias = parseInt(percent.dataset.votes);

                    let total_base = total - old_total;
                    let total_bias = old_total;

                    percent.innerHTML = Math.round(((increment * votes_base + votes_bias) / (increment * total_base + total_bias)) * 100) + '%';
                }

                //per Choice Bar
                let bar = FindSubElementFromPath(copy.choices[i].element, ['.EVENT_POLL_CHOICE_BAR']);
                if (bar && Math.round((parseInt(bar.dataset.votes) / old_total) * 100) !== Math.round((copy.choices[i].votes / total) * 100)) {
                    let votes_base = ((copy.choices[i].votes || 0) - parseInt(bar.dataset.votes));
                    let votes_bias = parseInt(bar.dataset.votes);

                    let total_base = total - old_total;
                    let total_bias = old_total;
                    
                    bar.style.setProperty('--event-poll-choice-offset', Math.round(((increment * votes_base + votes_bias) / (increment * total_base + total_bias)) * 100) + '%');
                }
            }

            step++;
        }, number_update_interval);

        //End Animation
        setTimeout(() => {
            //Transition to new
            elt.innerHTML = Event_PollInner_TwitchVersion(data, cfg, true);
            elt.dataset.moving = "false";
            clearInterval(interval);
            resolve(elt);
        }, move_duration);
    });
}

//Prediction
function Event_createPrediction(data = {}, cfg = { type: 'twitch' }) {
    let s = '';
    s += '<div class="EVENT EVENT_PREDICTION ' + (cfg.type ? cfg.type.toUpperCase() : 'FRIKYBOT') + '" id="EVENT_PREDICTION_' + data.id + '" ';
    if (cfg.display_time !== 'locked' && cfg.display_time !== 'concluded') s += ' data-effect="' + (cfg.display_method || 'move') + '" data-dir="' + (cfg.display_direction || 'R') + '" data-end="false" ';
    s += '>';
    if (cfg.type === 'twitch') s += Event_PredictionInner_TwitchVersion(data, cfg);
    else s += Event_createPredictionInner_FrikyBotVersion(data, cfg);
    s += '</div>';
    return s;
}
async function Event_updatePrediction(elt, data = {}, cfg = { type: 'twitch'}, duration = 1000, update_ratio = 0.1) {
    if (cfg.type === 'twitch') return Event_PredictionInner_TwitchVersion_update(elt, data, cfg, duration, update_ratio);
    else return Event_PredictionInner_FrikyBotVersion_update(elt, data, cfg, duration, update_ratio);
}

function Event_createPredictionInner_FrikyBotVersion(data = {}, cfg = {}) {
    if (data.outcomes === undefined) data.choices = [];
    data.outcomes.sort((a, b) => (b.channel_points || 0) - (a.channel_points || 0));
    let s = '';

    //CSS
    s += '<style>';
    s += '#EVENT_PREDICTION_' + data.id + '{';
    let order = cfg.order || 'pos percent text exact';
    const columns_widths = {
        pos: '37px',
        percent: '60px',
        outcome: 'auto',
        exact: '100px'
    };

    //general Cell
    if (cfg.cell_border_color) {
        s += '--event-prediction-index-border-color: ' + cfg.cell_border_color + ';';
        s += '--event-prediction-outcome-border-color: ' + cfg.cell_border_color + ';';
        s += '--event-prediction-exact-border-color: ' + cfg.cell_border_color + ';';
        s += '--event-prediction-percentages-border-color: ' + cfg.cell_border_color + ';';
    }
    if (cfg.cell_background_color) {
        s += '--event-prediction-index-background-color: ' + cfg.cell_background_color + ';';
        s += '--event-prediction-outcome-background-color: ' + cfg.cell_background_color + ';';
        s += '--event-prediction-exact-background-color: ' + cfg.cell_background_color + ';';
        s += '--event-prediction-percentages-background-color: ' + cfg.cell_background_color + ';';
    }
    if (cfg.cell_color) {
        s += '--event-prediction-index-color: ' + cfg.cell_color + ';';
        s += '--event-prediction-outcome-color: ' + cfg.cell_color + ';';
        s += '--event-prediction-exact-color: ' + cfg.cell_color + ';';
        s += '--event-prediction-percentages-color: ' + cfg.cell_color + ';';
    }

    //index
    if (cfg.display_index === false) {
        s += '--event-prediction-index-display: none;';
        order = order.split(' ').filter(elt => elt !== 'pos').join(' ');
    }

    //choice
    if (cfg.display_outcome === false) {
        s += '--event-prediction-outcome-display: none;';
        order = order.split(' ').filter(elt => elt !== 'outcome').join(' ');
    }

    //exact
    if (cfg.display_exact === false) {
        s += '--event-prediction-exact-display: none;';
        order = order.split(' ').filter(elt => elt !== 'exact').join(' ');
    }

    //percentages
    if (cfg.display_percentages === false) {
        s += '--event-prediction-percentages-display: none;';
        order = order.split(' ').filter(elt => elt !== 'percent').join(' ');
    }

    let columns = '';
    for (let area of order.split(' ')) {
        columns += (columns_widths[area] || 'auto') + ' ';
    }

    s += '--event-prediction-grid-order: "' + order + '";';
    s += '--event-prediction-grid-columns: ' + columns + ';';
    s += '}';
    s += '</style>';

    s += '<center>' + (data.title || 'Title here') + '</center>';

    let total = data.outcomes.reduce((sum, cur) => sum + (cur.channel_points || 0), 0);
    total = Math.max(total, 1);

    //Outcomes
    for (let i = 0; i < data.outcomes.length; i++) {
        s += '<div class="EVENT_PREDICTION_OUTCOME" data-outcome="' + data.outcomes[i].id + '" data-position="' + i + '">';
        s += '<center class="EVENT_PREDICTION_OUTCOME_POSITION" data-pos="' + (i + 1) + '">' + (i + 1) + '</center>';
        s += '<div class="EVENT_PREDICTION_OUTCOME_TEXT">' + data.outcomes[i].title + '</div>';
        s += '<center class="EVENT_PREDICTION_OUTCOME_POINTS" data-points="' + (data.outcomes[i].channel_points || 0) + '">' + (data.outcomes[i].channel_points || 0) + '</center>';
        s += '<center class="EVENT_PREDICTION_OUTCOME_POINTS_PERCENT" data-points="' + (data.outcomes[i].channel_points || 0) + '">' + Math.round(((data.outcomes[i].channel_points || 0) / total) * 100) + '%</center>';
        s += '</div>';
    }

    s += '<center class="EVENT_PREDICTION_FOOTER">Total Points used: ' + total + ' - Prediction locks ' + relativeTime((new Date(data.locks_at)).getTime()) + '!</center>';

    return s;
}
async function Event_PredictionInner_FrikyBotVersion_update(elt, data = {}, cfg = {}, duration = 1000, update_ratio = 0.1) {
    const move_duration = duration;
    const number_update_interval = move_duration * update_ratio;

    if (elt.dataset.moving === 'true') return Promise.reject(new Error('moving'));
    elt.dataset.moving = "true";

    let copy = cloneJSON(data);
    if (copy.outcomes === undefined) copy.outcomes = [];
    copy.outcomes.sort((a, b) => (b.channel_points || 0) - (a.channel_points || 0));

    for (let child of elt.childNodes) {
        if (child instanceof Element && child.dataset.outcome !== undefined) {
            let outcome = copy.outcomes.find(elt2 => elt2.id === child.dataset.outcome);
            if (outcome) outcome.element = child;
        }
    }

    //Animation
    return new Promise((resolve, reject) => {
        //Move
        for (let i = 0; i < copy.outcomes.length; i++) {
            copy.outcomes[i].element.style.setProperty('--event-prediction-move-index', (i - parseInt(copy.outcomes[i].element.dataset.position)));
            copy.outcomes[i].element.style.animation = 'predictionMoveUp ' + Math.floor(move_duration / 1000) + 's forwards';
        }

        let old_total = 0;
        for (let i = 0; i < copy.outcomes.length; i++) {
            let votes = FindSubElementFromPath(copy.outcomes[i].element, ['.EVENT_PREDICTION_OUTCOME_POINTS']);
            if (votes) old_total += parseInt(votes.dataset.points);
        }
        old_total = Math.max(old_total, 1);

        let total = copy.outcomes.reduce((sum, cur) => sum + (cur.channel_points || 0), 0);
        total = Math.max(total, 1);

        //Update Text
        let step = 1;
        let interval = setInterval(() => {
            let increment = step * (number_update_interval / move_duration);

            for (let i = 0; i < copy.outcomes.length; i++) {
                //outcome Position
                if ((i - parseInt(copy.outcomes[i].element.dataset.position)) !== 0) {
                    let pos = FindSubElementFromPath(copy.outcomes[i].element, ['.EVENT_PREDICTION_OUTCOME_POSITION']);
                    if (pos) pos.innerHTML = Math.min(Math.max(1, Math.round(increment * (i - parseInt(pos.dataset.pos)) + parseInt(pos.dataset.pos))), copy.outcomes.length);
                }

                //outcome points
                let points = FindSubElementFromPath(copy.outcomes[i].element, ['.EVENT_PREDICTION_OUTCOME_POINTS']);
                if (points && parseInt(points.dataset.points) !== copy.outcomes[i].channel_points) {
                    let points_base = ((copy.outcomes[i].channel_points || 0) - parseInt(points.dataset.points));
                    let points_bias = parseInt(points.dataset.points);

                    points.innerHTML = Math.round(increment * points_base + points_bias);
                }

                //outcome percent
                let points_cent = FindSubElementFromPath(copy.outcomes[i].element, ['.EVENT_PREDICTION_OUTCOME_POINTS_PERCENT']);
                if (points_cent && Math.round((parseInt(points_cent.dataset.points) / old_total) * 100) !== Math.round((copy.outcomes[i].channel_points / total) * 100)) {
                    let points_base = ((copy.outcomes[i].channel_points || 0) - parseInt(points_cent.dataset.points));
                    let points_bias = parseInt(points_cent.dataset.points);

                    let total_base = total - old_total;
                    let total_bias = old_total;

                    points_cent.innerHTML = Math.round(((increment * points_base + points_bias) / (increment * total_base + total_bias)) * 100) + '%';
                }
            }

            //Total Votes & Time
            let tot = FindSubElementFromPath(elt, ['.EVENT_PREDICTION_FOOTER']);
            if (tot) {
                let s = "Total Points used: " + Math.round(increment * (total - old_total) + old_total) + ' - ';

                if ((new Date(data.locks_at)).getTime() > Date.now()) s += "Prediction locks " + relativeTime((new Date(data.locks_at)).getTime()) + '!';
                else s += "Prediction Locked!";

                tot.innerHTML = s;
            }

            step++;
        }, number_update_interval);

        //End Animation
        setTimeout(() => {
            //Transition to new
            elt.innerHTML = Event_createPredictionInner_FrikyBotVersion(data, cfg);
            elt.dataset.moving = "false";
            clearInterval(interval);
            resolve(elt);
        }, move_duration);
    });
}

function Event_PredictionInner_TwitchVersion(data = {}, cfg = {}, from_update = false) {
    let s = '';

    //HTML
    s += '<div class="PRED_HEADER_WRAPPER">';
    if (data.locked_at) s += '<div class="PRED_PREHEADER">Prediction locked!</div>';
    else if (data.ended_at && data.status === 'resolved') s += '<div class="PRED_PREHEADER">Prediction ended!</div>';
    else if (data.ended_at) s += '<div class="PRED_PREHEADER">Prediction cancled!</div>';
    s += '<div class="PRED_HEADER">' + (data.title || 'Title here') + '</div>';
    s += '</div>';

    let total = data.outcomes.reduce((sum, cur) => sum + (cur.channel_points || 0), 0);
    total = Math.max(total, 1);

    data.outcomes.sort((a, b) => (b.channel_points || 0) - (a.channel_points || 0));
    
    let highlighted = false;

    //outcomes
    for (let i = 0; i < data.outcomes.length; i++) {
        let percent = Math.round(((data.outcomes[i].channel_points || 0) / total) * 100);

        s += '<div class="EVENT_PRED_OUTCOME ';
        if (!highlighted && data.ended_at && data.winning_outcome_id === data.outcomes[i].id) {
            s += 'highlighted" ';
            s += 'data-outcome="' + data.outcomes[i].id + '">';
            s += '<center class="EVENT_PRED_OUTCOME_POS" data-pos="' + i + '">' + (i + 1) + '</center>';
            s += '<div class="EVENT_PRED_OUTCOME_TEXT">';
            s += '<img src="/Alerts/images/trophy-solid.svg" />';
            s += '<span>' + data.outcomes[i].title + '</span>';
            highlighted = true;
        } else {
            s += '" ';
            s += 'data-outcome="' + data.outcomes[i].id + '">';
            s += '<center class="EVENT_PRED_OUTCOME_POS" data-pos="' + i + '">' + (i + 1) + '</center>';
            s += '<div class="EVENT_PRED_OUTCOME_TEXT">' + data.outcomes[i].title;
        }
        s += '</div>';
        s += '<div class="EVENT_PRED_OUTCOME_VOTES" data-votes="' + (data.outcomes[i].channel_points || 0) + '">' + (data.outcomes[i].channel_points || 0) + '</div>';
        s += '<div class="EVENT_PRED_OUTCOME_BAR" data-votes="' + (data.outcomes[i].channel_points || 0) + '" style="--event-pred-outcome-offset: ' + Math.max(percent, 0) + '%;"></div>';
        s += '</div>';
    }

    if (!from_update && WEIRD_TWITCH_TIME_DIALATION === 0) {
        WEIRD_TWITCH_TIME_DIALATION = Date.now() - (new Date(data.started_at)).getTime();
    }

    let span = (new Date(data.locks_at || 0)).getTime() - (new Date(data.started_at)).getTime();
    let progress = (new Date(data.locks_at || 0)).getTime() - Date.now() + WEIRD_TWITCH_TIME_DIALATION;
    let ratio = (progress / span) * 100;
    
    if (cfg.hide_time === 'ontime') {
        progress = (cfg.display_duration || 10) * 1000;
        ratio = 100;
    }

    if (data.locked_at && (cfg.hide_time === 'stage' || cfg.hide_time === 'ontime')) {
        progress = (cfg.display_duration || 10) * 1000;
        ratio = 100;
    } else if (data.locked_at) {
        progress = 0;
        ratio = 100;
    }

    if (data.ended_at) {
        progress = (cfg.display_duration || 10) * 1000;
        ratio = 100;
    }
    
    s += '<div class="EVENT_PRED_FOOTER" style="--event-pred-footer-offset: ' + Math.max(ratio, 0) + '%; --event-pred-footer-duration: ' + (progress / 1000) + 's;"></div>';

    //Sound
    let sound = null;
    let volume = 50;

    if (cfg.display_time !== 'locked' && cfg.display_time !== 'concluded' && cfg.use_display_sound && data.locks_at && !from_update) {
        sound = cfg.display_sound;
        volume = cfg.display_volume;
    }
    if ((cfg.display_time === 'concluded' || cfg.display_time === 'update') && cfg.use_locked_sound && data.locked_at) {
        sound = cfg.locked_sound;
        volume = cfg.locked_volume;
    }
    if (cfg.use_concluded_sound && data.ended_at) {
        sound = cfg.concluded_sound;
        volume = cfg.concluded_volume;
    }

    s += '<audio autoplay data-vol="' + (volume / 100) + '" onplay="this.volume=parseFloat(this.dataset.vol);">';
    if (sound) s += '<source src="/Alerts/custom/' + sound + '" type="audio/' + sound.split('.').pop() + '">';
    s += '</audio>';

    return s;
}
function Event_PredictionInner_TwitchVersion_update(elt, data = {}, cfg = {}, duration = 1000, update_ratio = 0.1) {
    const move_duration = duration;
    const number_update_interval = move_duration * update_ratio;

    if (elt.dataset.moving === 'true') return Promise.reject(new Error('moving'));
    if (elt.dataset.done === 'ended') return Promise.reject(new Error('ended'));
    elt.dataset.moving = "true";

    let copy = cloneJSON(data);
    if (copy.outcomes === undefined) copy.outcomes = [];
    copy.outcomes.sort((a, b) => (b.channel_points || 0) - (a.channel_points || 0));

    for (let child of elt.childNodes) {
        if (child instanceof Element && child.dataset.outcome !== undefined) {
            let outcome = copy.outcomes.find(elt2 => elt2.id + "" === child.dataset.outcome + "");
            if (outcome) outcome.element = child;
        }
    }

    let old_total = 0;
    for (let i = 0; i < copy.outcomes.length; i++) {
        let outcome = FindSubElementFromPath(copy.outcomes[i].element, ['.EVENT_PRED_OUTCOME_BAR']);
        if (outcome) old_total += parseInt(outcome.dataset.votes);
    }
    old_total = Math.max(old_total, 1);
    
    let total = copy.outcomes.reduce((sum, cur) => sum + (cur.channel_points || 0), 0);
    total = Math.max(total, 1);

    //Move
    for (let i = 0; i < copy.outcomes.length; i++) {
        let pos = FindSubElementFromPath(copy.outcomes[i].element, ['.EVENT_PRED_OUTCOME_POS']);
        copy.outcomes[i].element.style.setProperty('--event-prediction-move-index', (i - parseInt(pos.dataset.pos)));
        copy.outcomes[i].element.style.animation = 'predictionMoveUp ' + Math.floor(move_duration / 1000) + 's forwards';
    }

    //Animation
    return new Promise((resolve, reject) => {
        //Update Text
        let step = 1;
        let interval = setInterval(() => {
            let increment = step * (number_update_interval / move_duration);

            for (let i = 0; i < copy.outcomes.length; i++) {
                //Outcome Pos
                let pos = FindSubElementFromPath(copy.outcomes[i].element, ['.EVENT_PRED_OUTCOME_POS']);
                if (pos && parseInt(pos.dataset.pos) !== i) {
                    let pos_base = i - parseInt(pos.dataset.pos);
                    let pos_bias = parseInt(pos.dataset.pos);
                    pos.innerHTML = Math.round(increment * pos_base + pos_bias) + 1;
                }

                //Outcome Votes
                let votes = FindSubElementFromPath(copy.outcomes[i].element, ['.EVENT_PRED_OUTCOME_VOTES']);
                if (votes && parseInt(votes.dataset.votes) !== (copy.outcomes[i].channel_points || 0)) {
                    let votes_base = (copy.outcomes[i].channel_points || 0) - parseInt(votes.dataset.votes);
                    let votes_bias = parseInt(votes.dataset.votes);

                    votes.innerHTML = Math.round(increment * votes_base + votes_bias);
                }

                //per Outcome Bar
                let bar = FindSubElementFromPath(copy.outcomes[i].element, ['.EVENT_PRED_OUTCOME_BAR']);
                if (bar && Math.round((parseInt(bar.dataset.votes) / old_total) * 100) !== Math.round(((copy.outcomes[i].channel_points || 0) / total) * 100)) {
                    let votes_base = ((copy.outcomes[i].channel_points || 0) - parseInt(bar.dataset.votes));
                    let votes_bias = parseInt(bar.dataset.votes);

                    let total_base = total - old_total;
                    let total_bias = old_total;

                    bar.style.setProperty('--event-pred-outcome-offset', Math.round(((increment * votes_base + votes_bias) / (increment * total_base + total_bias)) * 100) + '%');
                }
            }

            step++;
        }, number_update_interval);

        //End Animation
        setTimeout(() => {
            //Transition to new
            elt.innerHTML = Event_PredictionInner_TwitchVersion(data, cfg, true);
            elt.dataset.moving = "false";
            clearInterval(interval);
            resolve(elt);
        }, move_duration);
    });
}

//Channel Point Redemption
function Event_createChannelPointRedeption(data = { reward: {} }, cfg = {}) {
    if (!data.reward) data.reward = {};
    let s = '';
    s += '<div class="EVENT EVENT_CPR" id="EVENT_CPR_' + data.id + '" data-effect="' + (cfg.display_method || 'move') + '" data-dir="' + (cfg.display_direction || 'R') + '" data-end="false">';

    //CSS
    s += '<style>';
    s += '#EVENT_CPR_' + data.id + '{';
    s += '--event-background-color: ' + (cfg.background || '#772ce8') + ';';
    s += '--event-icon-background-color: ' + (cfg.icon_background || '#00b1a3') + ';';
    s += '--event-text-color: ' + (cfg.text_color || 'white') + ';';
    s += '--event-user-color: ' + (cfg.user_color || 'lime') + ';';
    s += '--event-bar-color: ' + (cfg.bar_color || '#dad1e8') + ';';
    s += '--event-bar-duration: ' + (cfg.display_duration || 10) + 's;';
    s += '--event-move-duration: ' + (cfg.move_duration || 4) + 's;';
    s += '}';
    s += '</style>';

    //HTML
    s += '<div class="EVENT_CPR_GRID">';

    s += '<div class="EVENT_CPR_ICON"><img src="' + (data.reward.image || '/Alerts/images/trophy-solid.svg') + '" /></div>';

    s += '<div class="EVENT_CPR_TEXT_WRAPPER">';
    s += '<div class="EVENT_CPR_UPPER_TEXT">' + (data.reward.title || '[Reward Name]') + '</div>';
    s += '<div class="EVENT_CPR_LOWER_TEXT">' + (data.user_input || data.reward.prompt || '[Reward Description / User Input]') + '</div>';
    s += '<div class="EVENT_CPR_USER_NAME">' + (data.user_name || data.user_login || '[Username]') + '</div>';
    s += '</div>';

    s += '</div>';

    s += '<div class="EVENT_CPR_BAR"></div>';

    //Sound
    let sound = null;
    let volume = 50;

    if (cfg.use_display_sound) {
        sound = cfg.display_sound;
        volume = cfg.display_volume;
    }
    s += '<audio autoplay data-vol="' + (volume / 100) + '" onplay="this.volume=parseFloat(this.dataset.vol);">';
    if (sound) s += '<source src="/Alerts/custom/' + sound + '" type="audio/' + sound.split('.').pop() + '">';
    s += '</audio>';

    s += '</div>';
    return s;
}

//HypeTrain
function Event_createHypeTrain(data = {}, cfg = {}) {
    if (!data.reward) data.reward = {};
    let s = '';
    s += '<div class="EVENT EVENT_HYPETRAIN" id="EVENT_HYPETRAIN_' + data.id + '">';

    //CSS
    s += '<style>';
    s += '#EVENT_HYPETRAIN_' + data.id + '{';
    s += '--sub-background-color: ' + (cfg.sub_color || "#b400a3") + ';';
    s += '--giftsub-background-color: ' + (cfg.subgift_color || "#b400a3") + ';';
    s += '--giftbomb-background-color: ' + (cfg.giftbomb_color || "#b400a3") + ';';
    s += '--prime-background-color: ' + (cfg.prime_color || "#0076db") + ';';
    s += '--bits-background-color: ' + (cfg.bits_color || "#bc2200") + ';';

    s += '--docking-color: ' + (cfg.docking_color || "#bc2200") + ';';

    s += '--head-background-color: ' + (cfg.head_color || "#b400a3") + ';';

    let interval = (new Date(data.expires_at)).getTime() - (new Date(data.started_at)).getTime();
    s += '--progress-bar: ' + (interval / 1000 ) + 's;';

    s += '}';
    s += '</style>';

    s += '</div>';
    return s;
}
function Event_createHypeTrain_Head(data = {}, cfg = {}) {
    let s = '';

    s += '<div class="HYPETRAIN_HEAD">';
    
    s += '<div class="HYPETRAIN_HEAD_UPPER">';

    //Steam Stuff
    s += '<div class="HYPETRAIN_HEAD_STEAM">';
    s += '<div></div>';
    s += '<div></div>';
    s += '<div></div>';
    s += '</div>';

    //Image
    s += '<div class="HYPETRAIN_HEAD_IMAGE">';
    s += '<center>';
    if (cfg.draw_head_picture) s += '<img src="' + (data.picture || PROFILE_IMAGES(Date.now(), true)) + '" />';
    s += '</center>';
    s += '</div>';

    s += '</div>';

    //Chassis
    s += '<div class="HYPETRAIN_HEAD_CHASSIS">';
    s += '<div class="HYPETRAIN_HEAD_CHASSIS_LEVEL" data-level="' + data.level + '" data-progress="' + data.progress + '" data-goal="' + data.goal + '">Level ' + data.level + ' - ' + data.progress + '/' + data.goal + '</div>';
    s += '<div class="HYPETRAIN_HEAD_CHASSIS_STATS" data-subs="' + data.subs + '" data-bits="' + data.bits + '">' + data.subs + 'x Subs - ' + data.bits + 'x Bits</div>';
    s += '<div></div>';
    s += '</div>';

    //Wheels
    s += '<div class="HYPETRAIN_HEAD_WHEELS">';

    s += '<div class="HYPETRAIN_HEAD_WHEELS_LEFT">';
    s += '<div><img src="/alerts/images/hypetrain_wheel_static_rounded.png" /></div>';
    s += '</div>';

    s += '<div class="HYPETRAIN_HEAD_WHEELS_RIGHT">';
    s += '<div><img src="/alerts/images/hypetrain_wheel_static_rounded.png" /></div>';
    s += '<div><img src="/alerts/images/hypetrain_wheel_static_rounded.png" /></div>';
    s += '<div class="HYPETRAIN_HEAD_WHEELS_BAR"></div>';
    s += '</div>';

    s += '</div>';

    //Sound
    let sound = null;
    let volume = 50;

    if (cfg.use_display_sound) {
        sound = cfg.display_sound;
        volume = cfg.display_volume;
    }

    s += '<audio autoplay data-vol="' + (volume / 100) + '" onplay="this.volume=parseFloat(this.dataset.vol);">';
    if (sound) s += '<source src="/Alerts/custom/' + sound + '" type="audio/' + sound.split('.').pop() + '">';
    s += '</audio>';

    s += '</div>';

    return s;
}
function Event_createHypeTrain_Cart(data = {}, cfg = {}) {
    let s = '';

    s += '<div class="HYPETRAIN_CART" data-topic="' + (data.tier === 'Twitch Prime' ? 'prime' : data.topic) + '">';

    //Image
    s += '<div class="HYPETRAIN_CART_IMAGE">';
    if (cfg.draw_cart_picture) s += '<center><img src="' + (data.picture || PROFILE_IMAGES(Date.now(), true)) + '" /></center>';
    s += '</div>';

    //Chassis
    s += '<div class="HYPETRAIN_CART_CHASSIS">';
    s += '<div>' + (data.username || '[Username]') + '</div>';
    s += '<div>';
    
    if (data.topic === 'sub') s += FillFormattedString(cfg.sub_text || 'First Time Sub ({tier})', data);
    else if (data.topic === 'resub') s += FillFormattedString(cfg.resub_text || 'Resub for {months} Months', data);
    else if (data.topic === 'giftsub') s += FillFormattedString(cfg.subgift_text || 'Gifted a {tier} Sub', data);
    else if (data.topic === 'giftbomb') s += FillFormattedString(cfg.giftbomb_text || 'Gifted {amount} {tier} Subs', data);
    else if (data.topic === 'cheer') s += FillFormattedString(cfg.bits_text || '{amount}x Bits', data);
    else {
        s += '[Contribution]';
    }

    s += '</div>';
    s += '</div>';

    //Wheels
    s += '<div class="HYPETRAIN_CART_WHEELS">';
    s += '<div><img src="/alerts/images/hypetrain_wheel_static_rounded.png" /></div>';
    s += '<div><img src="/alerts/images/hypetrain_wheel_static_rounded.png" /></div>';
    s += '</div>';

    //Docking
    s += '<div class="HYPETRAIN_CART_DOCKING"></div>';

    s += '</div>';

    return s;
}

async function Event_updateHypeTrain_Intro(data = {}, cfg = {}) {
    let root = document.getElementById('EVENT_HYPETRAIN_' + data.id);
    if (root.classList.contains('rolling')) return Promise.reject(new Error('moving'));
    
    let element = document.createElement('DIV');
    element.innerHTML = Event_createHypeTrain_Head(data, cfg);

    if (cfg.skip_animation) return;

    root.appendChild(element.childNodes[0]);
    root.style.right = '-290px';
    element.remove();

    root.style.setProperty('--offset-index', parseInt(getComputedStyle(root).getPropertyValue('--offset-index')) + 1);
    root.style.animation = 'HTTranslate 4s linear forwards';
    root.classList.add('rolling');

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            root.classList.remove('rolling');
            root.style.right = '0';
            root.style.animation = '';
            resolve();
        }, 4000);
    });
}
async function Event_updateHypeTrain_Head(data = {}, cfg = {}, duration = 1000, update_ratio = 0.1) {
    const move_duration = duration;
    const number_update_interval = move_duration * update_ratio;

    let root = document.getElementById('EVENT_HYPETRAIN_' + data.id);
    let head = FindSubElementFromPath(root, ['.HYPETRAIN_HEAD']);

    let chassis = FindSubElementFromPath(head, ['.HYPETRAIN_HEAD_CHASSIS']);
    let level_elt = FindSubElementFromPath(chassis, ['.HYPETRAIN_HEAD_CHASSIS_LEVEL']);
    let stats_elt = FindSubElementFromPath(chassis, ['.HYPETRAIN_HEAD_CHASSIS_STATS']);

    let AUDIO_elt = FindSubElementFromPath(head, ['AUDIO']);

    if (cfg.skip_animation) {
        level_elt.dataset.level = data.level;
        level_elt.dataset.progress = data.progress;
        level_elt.dataset.goal = data.goal;

        stats_elt.dataset.subs = data.subs;
        stats_elt.dataset.bits = data.bits;

        level_elt.innerHTML = 'Level ' + data.level + ' - ' + data.progress + '/' + data.goal;
        stats_elt.innerHTML = data.subs + 'x Subs - ' + data.bits + 'x Bits';
        return;
    }

    //Animation
    return new Promise((resolve, reject) => {
        //Update Text
        let step = 1;
        let interval = setInterval(() => {
            let increment = step * (number_update_interval / move_duration);

            //level
            let level_diff = data.level - parseInt(level_elt.dataset.level);
            let level_bias = parseInt(level_elt.dataset.level);
            let level_new = level_bias + increment * level_diff;

            let progress_diff = data.progress - parseInt(level_elt.dataset.progress);
            let progress_bias = parseInt(level_elt.dataset.progress);
            let progress_new = progress_bias + increment * progress_diff;

            let goal_diff = data.goal - parseInt(level_elt.dataset.goal);
            let goal_bias = parseInt(level_elt.dataset.goal);
            let goal_new = goal_bias + increment * goal_diff;

            level_elt.innerHTML = 'Level ' + Math.ceil(level_new) + ' - ' + Math.ceil(progress_new) + '/' + Math.ceil(goal_new);

            //stats
            let subs_diff = data.subs - parseInt(stats_elt.dataset.subs);
            let subs_bias = parseInt(stats_elt.dataset.subs);
            let subs_new = subs_bias + increment * subs_diff;

            let bits_diff = data.bits - parseInt(stats_elt.dataset.bits);
            let bits_bias = parseInt(stats_elt.dataset.bits);
            let bits_new = bits_bias + increment * bits_diff;

            stats_elt.innerHTML = Math.ceil(subs_new) + 'x Subs - ' + Math.ceil(bits_new) + 'x Bits';

            step++;
        }, number_update_interval);

        //End Animation
        setTimeout(() => {
            level_elt.dataset.level = data.level;
            level_elt.dataset.progress = data.progress;
            level_elt.dataset.goal = data.goal;

            stats_elt.dataset.subs = data.subs;
            stats_elt.dataset.bits = data.bits;

            clearInterval(interval);

            if (data.ended_at) {
                //END - Sound
                AUDIO_elt.remove();
                if (cfg.use_leave_sound && cfg.leave_sound) {
                    let element = document.createElement('DIV');

                    let s = '';
                    s += '<audio autoplay data-vol="' + (cfg.leave_volume / 100) + '" onplay="this.volume=parseFloat(this.dataset.vol);">';
                    s += '<source src="/Alerts/custom/' + cfg.leave_sound + '" type="audio/' + cfg.leave_sound.split('.').pop() + '">';
                    s += '</audio>';
                    element.innerHTML = s;

                    head.appendChild(element.childNodes[0]);
                }

                //End - Move Out
                root.classList.add('rolling');
                root.style.setProperty('--tranlate-wagons', Math.ceil(root.parentElement.clientWidth / 290));
                root.style.animation = 'HTTranslateOut ' + (Math.ceil(root.parentElement.clientWidth / 290) * 4) + 's linear forwards';

                setTimeout(() => resolve(), Math.ceil(root.parentElement.clientWidth / 290) * 4000);
            } else {
                resolve();
            }
        }, move_duration);
    });
}
async function Event_updateHypeTrain_Cart(id, contribution = {}, cfg = {}) {
    let root = document.getElementById('EVENT_HYPETRAIN_' + id);
    if (root.classList.contains('rolling')) return Promise.reject(new Error('moving'));

    let element = document.createElement('DIV');
    element.innerHTML = Event_createHypeTrain_Cart(contribution, cfg);

    root.appendChild(element.childNodes[0]);
    root.style.right = '-290px';
    element.remove();

    root.style.setProperty('--offset-index', parseInt(getComputedStyle(root).getPropertyValue('--offset-index')) + 1);

    if (cfg.skip_animation) {
        root.style.right = '0';
        return;
    }

    root.style.animation = 'HTTranslate 4s linear forwards';
    root.classList.add('rolling');

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            root.classList.remove('rolling');
            root.style.right = '0';
            root.style.animation = '';
            resolve();
        }, 4000);
    });
}

//LATEST
function Latest_createTopic(id = '', topic = "", data = {}, cfg = {}) {
    let elements = [];

    //Icon
    let icon_value = '<img src="/alerts/images/' + topic + '_icon.png"/>';
    if (cfg[topic] && cfg[topic].custom_icon) {
        let extentions = cfg[topic].custom_icon.split('.')[cfg[topic].custom_icon.split('.').length - 1];
        icon_value = '<img src="/alerts/custom/' + cfg[topic].custom_icon + '"/>';

        //Video
        if (SUPPORTED_VIDEO_FILES.find(elt => elt === extentions)) {
            icon_value = '<video loop muted autoplay>';
            icon_value += '<source src="/Alerts/custom/' + cfg[topic].custom_icon + '" type="video/' + extentions + '">';
            icon_value += '</video>';
        }
    }

    elements.splice(0, 0, { name: 'icon', value: icon_value });
    
    //Collect Data
    switch (topic) {
        case 'follow': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true }
            ]);
            break;
        }
        case 'sub': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'tier', value: data.tier || '-' }
            ]);
            break;
        }
        case 'resub': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'tier', value: data.tier || '-' },
                { name: 'months', value: data.months ? data.months + ' Months' : '-' }
            ]);
            break;
        }
        case 'giftsub': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'tier', value: data.tier || '-' },
                { name: 'target', value: data.target || 'Unknown' }
            ]);
            break;
        }
        case 'giftbomb': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'tier', value: data.tier || '-' },
                { name: 'amount', value: data.amount || '-' }
            ]);
            break;
        }
        case 'cheer': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'amount', value: data.months || '-' }
            ]);
            break;
        }
        case 'host': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'amount', value: data.amount || '-' }
            ]);
            break;
        }
        case 'raid': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'amount', value: data.amount || '-' }
            ]);
            break;
        }
        case 'poll': {
            elements = elements.concat([
                { name: 'title', value: data.title || '-', trimmable: true },
                { name: 'winner', value: data.winner || '-', trimmable: true },
                { name: 'result', value: data.result || '-%' }
            ]);
            break;
        }
        case 'prediction': {
            elements = elements.concat([
                { name: 'title', value: data.title || '-', trimmable: true },
                { name: 'winner', value: data.winner || '-', trimmable: true },
                { name: 'result', value: data.result || '-%' }
            ]);
            break;
        }
        case 'channel_point_redemption': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'title', value: data.reward.title || '-', trimmable: true }
            ]);

            let icon = elements.find(elt => elt.name === 'icon');
            if (cfg.display_reward_icon && data.reward.image) icon.value = '<img src="' + data.reward.image + '"/>';

            break;
        }
        case 'hypetrain': {
            elements = elements.concat([
                { name: 'level', value: data.level ? 'Level ' + data.level : '-', trimmable: true },
                { name: 'progress', value: data.progress || '-', trimmable: true }
            ]);
            break;
        }
        default: {
            if (cfg['general'].show_init_icon !== true) return '';
            let icon_topic = cfg['general'].init_icon || Object.getOwnPropertyNames(cfg)[1];
            let icon = '';

            icon = (cfg[icon_topic] || {}).custom_icon || '<img src="/alerts/images/' + icon_topic  + '_icon.png"/>';

            elements = [
                { name: 'icon', value: icon },
                { name: 'spacer', value: '', css: 'width: 20vw;' }
            ];
            break;
        }
    }

    if (topic !== 'init') elements.splice(1, 0, { name: 'topic', value: cfg[topic].custom_text ||  topic });
    
    //Create HTML
    let s = '';
    s += '<div class="LATEST_TOPIC" id="' + id + '" data-name="' + topic + '">';
    for (let elt of elements) {
        if (elt.disabled === true) continue;

        s += '<div data-name="' + elt.name + '"' + (elt.trimmable === true ? ' class="trimmable"' : '');
        if(elt.css) s += 'style="' + elt.css + '"';
        s += ' >';

        s += '<center>';
        s += elt.value;
        s += '</center>';

        s += '</div>';
    }

    //CSS
    s += '<style>';
    
    s += '.LATEST_TOPIC#' + id + ' {';
    if (cfg[topic] !== undefined) {
        s += '--border: ' + (cfg[topic]['display_border'] === true ? 'calc(var(--border-width) * 1px) solid var(--border-color)' : 'none') + ';';
        s += '--border-width: ' + (cfg[topic]['border_width'] || 4) + ';';
        s += '--border-color: ' + (cfg[topic]['border_color'] || '#000000') + ';';
        s += '--text-color: ' + (cfg[topic]['text_color'] || '#000000') + ';';
    } 
    s += '}';

    for (let elt of elements) {
        if (cfg[topic] === undefined) continue;
        s += '.LATEST_TOPIC#' + id + ' > div[data-name="' + elt.name + '"] {';
        if (cfg[topic]['display_' + elt.name] == true) s += 'display: inline-block;';
        else s += 'display: none;';
        s += '}';
    }
    
    s += '</style>';

    s += '</div>';
    return s;
}
async function Latest_adjustGrid(elt) {
    const step_size = 5;
    let found_height = 5;

    for (let child of elt.childNodes) {
        const child_style = getComputedStyle(child);
        if (child.dataset.name === 'icon') continue;
        if (child_style.display === 'none') continue;

        const target_height = child.clientHeight - 20;
        child = child.childNodes[0];

        //ahap - as high as possible
        for (let i = 0; i < 100; i++) {
            getComputedStyle(child);
            child.style.fontSize = found_height + 'px';
            found_height += step_size;
            
            if (target_height < child.clientHeight) {
                break;
            }
        }
    }
    
    //Wdith Check

    //Spacer
    for (let child of elt.childNodes) {
        if (child.dataset.name !== 'spacer') continue;
        child.style.width = elt.parentElement.scrollWidth * 0.33 + 'px';
    }

    //Trim Username/Title/Options/...
    let trimmables = [];

    //Select Trimmable
    for (let child of elt.childNodes) {
        if (!child.classList.contains('trimmable')) continue;
        const style = getComputedStyle(child);
        if (style.display === 'none') continue;
        trimmables.push(child);
        child.style.width = 'fit-content';
    }

    getComputedStyle(elt);
    const target_width = elt.clientWidth;

    //Trimming
    let found_width = 5;
    let trimmable = trimmables[0];
    if (trimmable) {
        for (let i = 0; i < 100; i++) {
            trimmable.style.width = found_width + 'px';
            found_width += step_size;
            
            if (target_width < elt.scrollWidth) {
                found_width -= step_size;
                break;
            }
        }
    }
    for (let trimmable of trimmables) {
        trimmable.style.width = Math.ceil(found_width / trimmables.length) + 'px';
    }
}

//COUNTER
function Counter_createCounter(id = '', topic = "", amount = 0, cfg = {}) {
    let elements = [
        { name: 'text', value: cfg.custom_text || (topic.charAt(0).toUpperCase() + topic.substring(1) + 's') },
        { name: 'amount', value: amount }
    ];

    //Icon
    let icon_value = '<img src="/alerts/images/' + topic + '_icon.png"/>';
    if (cfg.custom_icon) {
        let extentions = cfg.custom_icon.split('.')[cfg.custom_icon.split('.').length - 1];
        icon_value = '<img src="/alerts/custom/' + cfg.custom_icon + '"/>';

        //Video
        if (SUPPORTED_VIDEO_FILES.find(elt => elt === extentions)) {
            icon_value = '<video loop muted autoplay>';
            icon_value += '<source src="/Alerts/custom/' + cfg.custom_icon + '" type="video/' + extentions + '">';
            icon_value += '</video>';
        }
    }

    elements.splice(0, 0, { name: 'icon', value: icon_value });

    //Create HTML
    let s = '';
    s += '<div class="COUNTER_TOPIC" id="' + id + '" data-name="' + topic + '" data-amount="' + amount +'">';
    for (let elt of elements) {
        if (elt.disabled === true) continue;

        s += '<div data-name="' + elt.name + '"';
        if (elt.css) s += 'style="' + elt.css + '"';
        s += ' >';

        s += '<center>';
        s += elt.value;
        s += '</center>';

        s += '</div>';
    }

    //CSS
    s += '<style>';

    s += '.COUNTER_TOPIC#' + id + ' {';
    s += '--border: ' + (cfg['display_border'] === true ? 'calc(var(--border-width) * 1px) solid var(--border-color)' : 'none') + ';';
    s += '--border-width: ' + (cfg['border_width'] || 4) + ';';
    s += '--border-color: ' + (cfg['border_color'] || '#000000') + ';';
    s += '--text-color: ' + (cfg['text_color'] || '#000000') + ';';
    s += '}';

    for (let elt of elements) {
        if (cfg === undefined) continue;
        s += '.COUNTER_TOPIC#' + id + ' > div[data-name="' + elt.name + '"] {';
        if (cfg['display_' + elt.name] == true) s += 'display: inline-block;';
        else s += 'display: none;';
        s += '}';
    }

    s += '</style>';

    s += '</div>';
    return s;
}
async function Counter_adjustGrid(elt) {
    const step_size = 5;
    let found_height = 5;

    for (let child of elt.childNodes) {
        const child_style = getComputedStyle(child);
        if (child.dataset.name === 'icon') continue;
        if (child_style.display === 'none') continue;

        const target_height = child.clientHeight - 20;
        child = child.childNodes[0];

        //ahap - as high as possible
        for (let i = 0; i < 100; i++) {
            getComputedStyle(child);
            child.style.fontSize = found_height + 'px';
            found_height += step_size;

            if (target_height < child.clientHeight) {
                break;
            }
        }

        found_height -= step_size;
    }
}

//HISTORY LIST
const HISTORY_LIST_PRELOADED_IMAGES = [];
function HistoryList_createList(id = '', elements = [], cfg = {}) {
    let s = '';
    s += '<div class="HISTORY_LIST" id="' + id + '">';

    //CSS
    s += '<style>';

    s += '.HISTORY_LIST#' + id + ' {';
    s += '--grid-amount: ' + (cfg.general.display_count || 6) + ';';
    s += '}';

    for (let topic in cfg) {
        if (topic === 'general') continue;

        s += '.HISTORY_LIST#' + id + ' > .HISTORY_LIST_ELEMENT[data-name="' + topic + '"] {';
        s += '--border: ' + (cfg[topic]['display_border'] === true ? 'calc(var(--border-width) * 1px) solid var(--border-color)' : 'none') + ';';
        s += '--border-width: ' + (cfg[topic]['border_width'] || 4) + ';';
        s += '--border-color: ' + (cfg[topic]['border_color'] || '#000000') + ';';
        s += '--text-color: ' + (cfg[topic]['text_color'] || '#000000') + ';';
        s += '}';

        for (let elt of HistoryList_getTopicElements(topic, {}, cfg)) {
            if (cfg[topic] === undefined) continue;
            s += '.HISTORY_LIST#' + id + ' > .HISTORY_LIST_ELEMENT[data-name="' + topic + '"] > div[data-name="' + elt.name + '"] {';
            if (cfg[topic]['display_' + elt.name] == true) s += 'display: inline-block;';
            else s += 'display: none;';
            s += '}';
        }
    }

    s += '</style>';

    //Create Elements
    for (let elt of elements) {
        s += HistoryList_createElement(elt.topic, elt, cfg);
    }
    
    s += '</div>';
    return s;
}
function HistoryList_createElement(topic = "", data = {}, cfg = {}) {
    let elements = HistoryList_getTopicElements(topic, data, cfg);

    //Create HTML
    let s = '';
    s += '<div class="HISTORY_LIST_ELEMENT" data-name="' + topic + '">';

    for (let elt of elements) {
        if (elt.disabled === true) continue;

        s += '<div data-name="' + elt.name + '"' + (elt.trimmable === true ? ' class="trimmable"' : '');
        if (elt.css) s += 'style="' + elt.css + '"';
        s += ' >';

        s += '<center>';
        s += elt.value;
        s += '</center>';

        s += '</div>';
    }

    s += '</div>';
    return s;
}
function HistoryList_getTopicElements(topic = "", data = {}, cfg = {}) {
    let elements = [];

    //Icon
    let icon_value = '<img src="/alerts/images/' + topic + '_icon.png"/>';
    if (cfg[topic] && cfg[topic].custom_icon) {
        let extentions = cfg[topic].custom_icon.split('.')[cfg[topic].custom_icon.split('.').length - 1];
        icon_value = '<img src="/alerts/custom/' + cfg[topic].custom_icon + '"/>';

        //Video
        if (SUPPORTED_VIDEO_FILES.find(elt => elt === extentions)) {
            icon_value = '<video loop muted autoplay>';
            icon_value += '<source src="/alerts/custom/' + cfg[topic].custom_icon + '" type="video/' + extentions + '">';
            icon_value += '</video>';

            if (!HISTORY_LIST_PRELOADED_IMAGES.find(elt => elt.file === '/alerts/custom/' + cfg[topic].custom_icon)) {
                let vid = document.createElement("VIDEO");
                vid.src = '/alerts/custom/' + cfg[topic].custom_icon;
                HISTORY_LIST_PRELOADED_IMAGES.push({
                    file: '/alerts/custom/' + cfg[topic].custom_icon,
                    object: vid
                });
            }

        } else if (!HISTORY_LIST_PRELOADED_IMAGES.find(elt => elt.file === icon_value.split('"')[1])) {
            let img = new Image();
            img.src = icon_value.split('"')[1];
            HISTORY_LIST_PRELOADED_IMAGES.push({
                file: icon_value.split('"')[1],
                object: img
            });
        }
    }

    elements.splice(0, 0, { name: 'icon', value: icon_value });
    
    //Collect Data
    switch (topic) {
        case 'follow': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true }
            ]);
            break;
        }
        case 'sub': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'tier', value: data.tier || '-' }
            ]);
            break;
        }
        case 'resub': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'tier', value: data.tier || '-' },
                { name: 'months', value: data.months ? data.months + ' Months' : '-', trimmable: true }
            ]);
            break;
        }
        case 'giftsub': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'tier', value: data.tier || '-' },
                { name: 'target', value: data.target || 'Unknown', trimmable: true }
            ]);
            break;
        }
        case 'giftbomb': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'tier', value: data.tier || '-' },
                { name: 'amount', value: data.amount || '-' }
            ]);
            break;
        }
        case 'cheer': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'amount', value: data.months || '-' }
            ]);
            break;
        }
        case 'host': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'amount', value: data.amount || '-' }
            ]);
            break;
        }
        case 'raid': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'amount', value: data.amount || '-' }
            ]);
            break;
        }
        case 'poll': {
            elements = elements.concat([
                { name: 'title', value: data.title || '-', trimmable: true },
                { name: 'winner', value: data.winner || '-', trimmable: true },
                { name: 'result', value: data.result || '-%' }
            ]);
            break;
        }
        case 'prediction': {
            elements = elements.concat([
                { name: 'title', value: data.title || '-', trimmable: true },
                { name: 'winner', value: data.winner || '-', trimmable: true },
                { name: 'result', value: data.result || '-%' }
            ]);
            break;
        }
        case 'channel_point_redemption': {
            elements = elements.concat([
                { name: 'username', value: data.username || 'Unknown', trimmable: true },
                { name: 'title', value: data.reward && data.reward.title ? data.reward.title : '-', trimmable: true }
            ]);

            let icon = elements.find(elt => elt.name === 'icon');
            if (cfg.display_reward_icon && data.reward.image) icon.value = '<img src="' + data.reward.image + '"/>';

            break;
        }
        case 'hypetrain': {
            elements = elements.concat([
                { name: 'level', value: data.level ? 'Level ' + data.level : '-', trimmable: true },
                { name: 'progress', value: data.progress || '-', trimmable: true }
            ]);
            break;
        }
        default: {
            if (cfg['general'].show_init_icon !== true) return '';
            let icon_topic = cfg['general'].init_icon || Object.getOwnPropertyNames(cfg)[1];
            let icon = '';

            icon = (cfg[icon_topic] || {}).custom_icon || '<img src="/alerts/images/' + icon_topic + '_icon.png"/>';

            elements = [
                { name: 'icon', value: icon },
                { name: 'spacer', value: '', css: 'width: 20vw;' }
            ];
            break;
        }
    }

    elements.splice(1, 0, { name: 'topic', value: cfg[topic] && cfg[topic].custom_text !== undefined && cfg[topic].custom_text !== '' ? cfg[topic].custom_text : topic });
    return elements;
}

function HistoryList_update(elt, topic = '', element = {}, cfg = {}) {
    let div = document.createElement('DIV');
    div.innerHTML = HistoryList_createElement(topic, element, cfg);
    div = div.childNodes[0];
    if (elt.childNodes.length > 1) elt.insertBefore(div, elt.childNodes[1]);
    else elt.appendChild(div);

    //Delete Overflow
    if (elt.childNodes.length > (cfg.general.display_count || 6) + 1) {
        for (let i = elt.childNodes.length - 1; i > (cfg.general.display_count || 6); i--) {
            elt.childNodes[i].remove();
        }
    }

    //Update Video
    let new_video = FindSubElementFromPath(div, ['data-name="icon"', 'CENTER', 'VIDEO']);
    if (new_video && new_video.type !== 'video/webm') {
        for (let child of elt.childNodes) {
            let old_video = FindSubElementFromPath(child, ['data-name="icon"', 'CENTER', 'VIDEO']);
            if (old_video && old_video.src === new_video.src) {
                new_video.currentTime = old_video.currentTime;
                break;
            }
        }
    }

    //Rejust
    HistoryList_adjustGrid(elt);
}
async function HistoryList_adjustGrid(elt) {
    const step_size = 5;
    let found_height = 5;
    await Alert_awaitTime(10);

    for (let element of elt.childNodes) {
        if (element.tagName === 'STYLE') continue;

        for (let child of element.childNodes) {
            const child_style = getComputedStyle(child);
            if (child.dataset.name === 'icon') continue;
            if (child_style.display === 'none') continue;
            
            const target_height = element.clientHeight - 20;
            child = child.childNodes[0];

            //ahap - as high as possible
            for (let i = 0; i < 100; i++) {
                child.style.fontSize = found_height + 'px';
                found_height += step_size;

                if (target_height < child.clientHeight) {
                    break;
                }
            }

            found_height -= step_size;
        }

        //Wdith Check

        //Spacer
        for (let child of element.childNodes) {
            if (child.dataset.name !== 'spacer') continue;
            child.style.width = elt.scrollWidth * 0.33 + 'px';
        }

        //Reset Children
        for (let child of element.childNodes) {
            child.style.width = 'fit-content';
        }

        //Trim Username/Title/Options/...
        for (let child of element.childNodes) {
            if (!child.classList.contains('trimmable')) continue;
            await Alert_awaitTime(10);
            
            let missing_width = element.clientWidth - elt.clientWidth;

            const style = getComputedStyle(child);
            if (missing_width < step_size) break;
            
            if (style.display === 'none') continue;

            const orig_width = child.clientWidth - 20;

            child.style.width = Math.max(70, orig_width - missing_width) + 'px';
        }
    }
}

//UTIL
function findProfileFromAlertCfg(type, alert = {}, event = {}) {
    let selection = alert.profiles;

    //Tier
    if (ALERT_VARIABLES[type].find(elt => elt.name === 'tier')) {
        switch (event.tier) {
            case 'Tier 1': selection = selection.filter(elt => elt.where.tier1 === true); break;
            case 'Tier 2': selection = selection.filter(elt => elt.where.tier2 === true); break;
            case 'Tier 3': selection = selection.filter(elt => elt.where.tier3 === true); break;
            case 'Twitch Prime': selection = selection.filter(elt => elt.where.twitchprime === true); break;
        }
    }

    //Username
    if (ALERT_VARIABLES[type].find(elt => elt.name === 'username')) {
        selection = selection.filter(elt => {
            if (elt.where.username && elt.where.username.length > 0 && elt.where.username[0] !== "") {
                let test = elt.where.username.find(elt2 => elt2 === event.username) !== undefined;
                return elt.where.inv_username ? !test : test;
            }
            return true;
        });
    }

    //Target
    if (ALERT_VARIABLES[type].find(elt => elt.name === 'target')) {
        selection = selection.filter(elt => {
            if (elt.where.target && elt.where.target.length > 0 && elt.where.target[0] !== "") {
                let test = elt.where.target.find(elt2 => elt2 === event.target) !== undefined;
                return elt.where.inv_target ? !test : test;
            }
            return true;
        });
    }
    
    //Amount
    if (ALERT_VARIABLES[type].find(elt => elt.name === 'amount')) selection = sortBounds(selection, 'amount');
    
    //Total
    if (ALERT_VARIABLES[type].find(elt => elt.name === 'total')) selection = sortBounds(selection, 'total');
    
    //Months
    if (ALERT_VARIABLES[type].find(elt => elt.name === 'months')) selection = sortBounds(selection, 'months');
    
    let amount = 0;
    if (event.months !== undefined) amount = event.months;
    if (event.amount !== undefined) amount = event.amount;
    
    let valid_profiles = [];
    for (let i = 0; i < selection.length; i++) {
        let cur = selection[i];

        if (cur.where.min > amount) continue;
        if (cur.where.max < amount && cur.where.max !== -1) continue;

        valid_profiles.push(cur);
    }
    
    let profile = null;
    if (alert.random) profile = valid_profiles[Math.min(Math.floor(Math.random() * valid_profiles.length), valid_profiles.length - 1)];
    else profile = valid_profiles[0];
    return profile;
}
function relativeTime(t_ms) {
    let rel = Date.now() - t_ms;

    if (rel > 0) {
        if (rel < 60 * 1000) return 'a minute ago';
        else if (rel < 60 * 60 * 1000) return Math.floor(rel / (60 * 1000)) + ' minutes ago';
        else if (rel < 2 * 60 * 60 * 1000) return 'an hour ago';
        else if (rel < 24 * 60 * 60 * 1000) return Math.floor(rel / (60 * 60 * 1000)) + ' hours ago';
    } else {
        rel = -1 * rel;
        if (rel < 60 * 1000) return 'in ' + Math.floor(rel / 1000) + ' seconds';
        else if (rel < 2 * 60 * 1000) return 'in a minute';
        else if (rel < 60 * 60 * 1000) return 'in ' + Math.floor(rel / (60 * 1000)) + ' minutes';
        else if (rel < 2 * 60 * 60 * 1000) return 'in an hour';
        else if (rel < 24 * 60 * 60 * 1000) return 'in ' + Math.floor(rel / (60 * 60 * 1000)) + ' hours';
    }

    let date = new Date(t_ms);
    return date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE').split(':').slice(0, 2).join(':');
}
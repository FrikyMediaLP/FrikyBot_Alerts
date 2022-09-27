let UPLOAD_LIMIT = 3;
let MISSING_EVENTSUBS = [];
let MISSING_ENDPOINTS = [];

let CONFIG = [];
let FILES = [];
let ALERTS = [];
let EVENTS = [];
let PROFILES = {};
let DEFAULT_ALERT_SETTINGS = [];
let DEFAULT_ALERT_TEXTS = {};
let CPR_REWARDS = [];

let OVERLAYS = [];
let DEV_CUSTOM_TRIGGER_CHAT_OUTPUT = false;

let POLL_DATA = {};
let POLL_TO = null;
let POLL_ONTIME_TO = null;
let PRED_DATA = {};
let PRED_TO = null;
let PRED_ONTIME_TO = null;
let CPR_IV = null;
let HYPETRAIN_DATA = {};
let HYPETRAIND_TO = null;

let EVENT_CHATOUTPUT = false;
let MUTED_PREVIEWS = false;

const TEXT_ALERT_EVENT = {
    topic: 'resub',
    username: "Username",
    months: Math.floor(Math.random() * 20) + 1,
    message: {
        text: "frikymEZ User Message with Emotes frikymBot",
        ttv_emotes: [{ id: "300073784", name: 'frikyEZ', uses: [{ start: 0, end: 7 }] }, { id: "emotesv2_a90de641996f4bf19368608c9ef72f35", name: 'frikymBot', uses: [{ start: 34, end: 42 }] }],
        bttv_emotes: [],
        ffz_emotes: []
    },
    streak_months: null,
    tier: "Tier 1",
    time: 1646343392200
};

function init() {
    OUTPUT_create();
    SWITCHBUTTON_AUTOFILL();
    MISC_SELECT_WidthCheck_All();
    
    fetchSetting()
        .then(json => {
            CONFIG = json.cfg;
            FILES = json.files;
            PROFILES = json.profiles;
            DEFAULT_ALERT_SETTINGS = json.DEFAULT_ALERT_SETTINGS;
            DEFAULT_ALERT_TEXTS = json.DEFAULT_ALERT_TEXTS;
            OVERLAYS = json.overlays;
            ALERTS = json.alerts || [];
            EVENTS = json.events || [];
            CPR_REWARDS = json.cpr_rewards || [];
            MISSING_EVENTSUBS = json.missing_eventsubs || [];
            MISSING_ENDPOINTS = json.missing_endpoints || [];

            //Adjust Upload Limit
            if (json.upload_limit && json.upload_limit.split('mb').length > 0) {
                UPLOAD_LIMIT = parseInt(json.upload_limit.split('mb')[0]);
            }

            //Display EventSub Hint
            let hint = '';
            if (MISSING_EVENTSUBS.length > 0) hint += '<b>This affects the following Eventsubs:</b> ' + MISSING_EVENTSUBS.join(', ') + '.';
            if (MISSING_ENDPOINTS.length > 0) hint += (hint === '' ? '' : ' </br>') +  '<b>This affects the following Endpoints:</b> ' + MISSING_ENDPOINTS.join(', ') + '.';
            if (hint !== '') OUTPUT_showWarning('Some Endpoints / Eventsubs are unavailable! </br>' + hint);

            //Create Buttons to test trigger Alerts / Events
            let s = '';
            s += '<div>';
            for (let alert of ALERTS)
                s += '<button onclick="Test_Alert(' + "'" + alert + "'" + ')">Test ' + alert.charAt(0).toUpperCase() + alert.substring(1) + '</button>';
            s += '</div>';

            s += '<div>';
            for (let event of EVENTS) {
                s += '<button onclick="Test_Event(' + "'" + event + "'" + ')">Test ' + (event === 'channel_point_redemption' ? 'Channel Point Redem.' : event.charAt(0).toUpperCase() + event.substring(1)) + '</button>';

                if (event !== 'channel_point_redemption') s += '<button onclick="Test_Event(' + "'end´-" + event + "'" + ')">End ' + event.charAt(0).toUpperCase() + event.substring(1) + '</button>';
            }
            s += '</div>';

            s += '<div>';
            s += '<button onclick="CustomTestOpenImportDialog(event)" custom>Custom</button>';
            s += '<button onclick="SkipAlert()" skip>Skip Current Alert</button>';
            s += '</div>';

            document.getElementById('ALERTS_TEST_UI').innerHTML = s;
            
            //Overlays
            Overlay_Page_setOverlay(OVERLAYS);

            //Profiles
            updateProfilePool(PROFILES);

            //Chat Output
            updateChatOutput(json.chat_output);

            //Variables
            updateAlertVariables();

            //Show
            document.getElementById('ALERTS').style.display = 'block';
            document.getElementById('INIT_LOADER').remove();
        })
        .then(GetVoices)
        .then(voices => {
            VOICES = voices;

            updateVoicePitch(Math_map(parseFloat(CONFIG.tts_pitch || 0), -1, 1, 0, 2));
            document.getElementById('TTS_Volume').value = (CONFIG.tts_volume || 50)/100;

            let idx = 0;
            let voice_names = VOICES.reduce((total, currentValue) => {
                if (currentValue.name === CONFIG.tts_voice) idx = total.length;
                total.push(currentValue.name);
                return total;
            }, []);

            document.getElementById('TTS_VOICE_SELECT').innerHTML = MISC_SELECT_create(voice_names, idx, 'TTS_VOICE');
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err.message);
        })
        .finally(() => {
            SWITCHBUTTON_AUTOFILL();
            MISC_SELECT_WidthCheck_All();
        });
}
async function fetchSetting() {
    return fetch('/api/Alerts/settings', getAuthHeader()).then(STANDARD_FETCH_RESPONSE_CHECKER);
}

function showCategorie(elt) {
    document.getElementById(elt.dataset.cat).classList.toggle('show');
}

//Token Overlays
function Overlay_Page_setOverlay(overlays = []) {
    let s = '';

    for (let overlay of overlays.sort((a, b) => sortAlphabetical(a.name, b.name))) s += '<center data-token="' + overlay.token + '" onclick="Overlay_Page_select(this)">' + overlay.name + '</center>';
    s += '<center id="NEW" onclick="Overlay_Page_select(this, true)">+</center>';

    document.getElementById('OVERLAY_PAGE_NAMES').innerHTML = s;
}

async function Overlay_Page_select(elt, is_new = false) {
    if (document.getElementById('OVERLAY_PAGE').dataset.name !== "" && Overlay_Page_isSaveActice()) {
        //Await Confirmation
        let answer = 'CANCEL';

        try {
            answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Switching Tokens now will reset all unsaved Changes! Be sure to save, if you want to keep these changes!", ['IGNORE', 'CANCEL']);
        } catch (err) {

        }

        if (answer !== 'IGNORE') return Promise.resolve();
    }
    
    let token = elt.dataset.token;

    //Clear Event Intervals / Timeouts
    if (POLL_TO) clearTimeout(POLL_TO);
    if (POLL_ONTIME_TO) clearTimeout(POLL_ONTIME_TO);
    if (PRED_TO) clearTimeout(PRED_TO);
    if (PRED_ONTIME_TO) clearTimeout(PRED_ONTIME_TO);
    if (CPR_IV) clearInterval(CPR_IV);
    if (HYPETRAIND_TO) clearTimeout(HYPETRAIND_TO);
    
    Overlay_Page_update(OVERLAYS.find(elt => elt.token === token) , is_new);
    Overlay_Page_updateInfo(OVERLAYS.find(elt => elt.token === token), is_new);
    if (is_new) Overlay_Page_setSave(true);
}
function Overlay_Page_update(token = {}, is_new = false) {
    let s = "";
    document.getElementById('OVERLAY_PAGE_SETTINGS').classList.remove('select');
    document.getElementById('OVERLAY_PAGE').classList.remove('show');
    document.getElementById('OVERLAY_PAGE').dataset.name = token.type || '';

    //Settings
    if (token.type == 'alerts') {
        s += '<div id="OVERLAY_PAGE_SETTINGS_ALERTS">';

        //Preloaded Topics
        for (let topic in token.settings || {}) {
            s += createAlertTopic(token.settings[topic], topic);
        }

        s += '<div id="ADD_TOPIC">';
        for (let topic of ALERTS) s += '<div onclick="addAlertTopic({ }, ' + "'" + topic + "'" + ', this)" ' + (token.settings && token.settings[topic] ? 'disabled' : '') + '>' + topic + '</div>';
        s += '</div>';

        s += '</div>';
        document.getElementById('OVERLAY_PAGE').classList.add('show');
    } else if (token.type == 'events') {
        s += '<div id="OVERLAY_PAGE_SETTINGS_EVENTS" data-mode="selector">';

        s += '<div id="EVENTS_SELECTOR">';
        for (let event of EVENTS) s += '<div onclick="createEventsSettings(' + "'" + token.token + "'" + ', ' + "'" + event + "'" + ');">' + event.toUpperCase().split('_').join(' ') + '</div>';
        s += '</div>';

        s += '</div>';

        document.getElementById('OVERLAY_PAGE').classList.add('show');
        document.getElementById('OVERLAY_PAGE_SETTINGS').innerHTML = s;
        SWITCHBUTTON_AUTOFILL();

        for (let event in token.settings || {}) createEventsSettings(token.token, event);
        return;
    } else if (token.type == 'latest') {
        s += '<div id="OVERLAY_PAGE_SETTINGS_LATEST">';
        s += createLatestSettings(token.token);
        s += '</div>';

        document.getElementById('OVERLAY_PAGE').classList.add('show');
    } else if (token.type == 'counter') {
        s += '<div id="OVERLAY_PAGE_SETTINGS_COUNTER">';
        s += createCounterSettings(token.token);
        s += '</div>';

        document.getElementById('OVERLAY_PAGE').classList.add('show');
    } else if (token.type == 'history') {
        s += '<div id="OVERLAY_PAGE_SETTINGS_HISTORY_LIST">';
        s += createHistorySettings(token.token);
        s += '</div>';

        document.getElementById('OVERLAY_PAGE').classList.add('show');
    } else if (is_new) {
        s += '<center>Select Type</center>';

        s += '<div>';
        s += '<div onclick="Overlay_Page_update({ type: ' + "'alerts'" + ' });">ALERTS</div>';
        s += '<div onclick="Overlay_Page_update({ type: ' + "'events'" + ' });">EVENTS</div>';
        s += '<div onclick="Overlay_Page_update({ type: ' + "'latest'" + ' });">LATEST</div>';
        s += '<div onclick="Overlay_Page_update({ type: ' + "'counter'" + ' });">COUNTER</div>';
        s += '<div onclick="Overlay_Page_update({ type: ' + "'history'" + ' });">HISTORY</div>';
        s += '<button onclick="OverlayOpenImportDialog(event);">IMPORT</button>';
        s += '</div>';

        document.getElementById('OVERLAY_PAGE_SETTINGS').classList.add('select');
    }
    document.getElementById('OVERLAY_PAGE_SETTINGS').innerHTML = s;
    
    SWITCHBUTTON_AUTOFILL();
    if (document.getElementById('PREVIEW_COUNTER_ALERT')) Counter_adjustGrid(document.getElementById('PREVIEW_COUNTER_ALERT'));
    if (document.getElementById('HISTORY_LIST_PREVIEW_ALERT')) HistoryList_adjustGrid(document.getElementById('HISTORY_LIST_PREVIEW_ALERT'));
}
function Overlay_Page_updateInfo(token = {}, is_new = false) {
    let s = '';
    let uri_token = (token.token || GenerateRandomBytes(32));

    s += '<center>Overlay Name</center>';
    s += '<input id="OVERLAY_TOKEN_NAME" value="' + (token.name || '') + '" placeholder="enter name here" />';

    s += '<center>Overlay Description</center>';
    s += '<textarea id="OVERLAY_TOKEN_DESC" placeholder="enter description here">' + (token.description || '') + '</textarea>';

    s += '<center>URL Token</center>';

    s += '<div id="URL_TOKEN_WRAPPER" style="display: grid; grid-template-column: auto 20px;">';
    s += '<input id="URL_TOKEN_INPUT" type="password" value="' + uri_token + '" placeholder="' + uri_token + '" readonly/>';
    s += '<img onclick="document.getElementById(' + "'URL_TOKEN_INPUT'" + ').type = document.getElementById(' + "'URL_TOKEN_INPUT'" + ').type === ' + "'text'" + '? ' + "'password' : 'text'" + '; this.classList.toggle(' + "'show'" + ')" />';
    s += '</div>';

    s += '<div id="token_button_div">';
    s += '<button onclick="window.open(window.location.href.substring(0, window.location.href.lastIndexOf(' + "'/'" + ')) + ' + "'/overlay/v2/'" + ' + document.getElementById(' + "'URL_TOKEN_INPUT'" + ').value, ' + "'_blank'" + ').focus();">OPEN</button>';
    s += '<button onclick="copyToClipboard(window.location.href.substring(0, window.location.href.lastIndexOf(' + "'/'" + ')) + ' + "'/overlay/v2/'" + ' + document.getElementById(' + "'URL_TOKEN_INPUT'" + ').value)">COPY</button>';
    s += '<button onclick="document.getElementById(' + "'URL_TOKEN_INPUT'" + ').value = GenerateRandomBytes(32); Overlay_Page_setSave(true);">REGEN</button>';
    s += '</div>';
    s += '</div>';

    s += '<center>Chroma Key</center>';
    s += '<input type="color" id="OVERLAY_TOKEN_CHROMA_KEY" value="' + (token.chroma_key || '#ff00ff') + '" />';

    s += '<div id="bottom_button_div">';
    s += '<button id="URL_TOKEN_SAVE" onclick="Overlay_Page_Alerts_Save(' + (is_new === true) + ')" disabled>SAVE</button>';

    s += '<div>';
    s += '<button onclick="OverlayOpenImportDialog(event)">IMPORT</button>';
    s += '<button onclick="Overlay_Page_Alerts_Export()">EXPORT</button>';
    s += '</div>';

    s += '<button id="URL_TOKEN_DELETE" onclick="Overlay_Page_Alerts_Remove()" ' + (is_new === true ? 'disabled' : '') + '>DELETE</button>';
    s += '</div>';

    document.getElementById('OVERLAY_PAGE_INFO').innerHTML = s;
}
function Overlay_Page_setSave(state = true) {
    document.getElementById('URL_TOKEN_SAVE').disabled = state === false;
}
function Overlay_Page_isSaveActice() {
    return document.getElementById('URL_TOKEN_SAVE') ? document.getElementById('URL_TOKEN_SAVE').disabled === false : false;
}

function OverlayOpenImportDialog(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    let div = document.createElement('DIV');
    div.id = 'OVERLAY_IMPORT_DIALOG';
    div.innerHTML = '<center>Copy Overlay Settings here</center><textarea oninput="OverlayImportDialogInput(this)"></textarea>';
    document.getElementById('grid').appendChild(div);
    disableContent('OverlayremoveImportDialogHTML', true);
}
function OverlayremoveImportDialogHTML() {
    document.getElementById('OVERLAY_IMPORT_DIALOG').remove();
}
function OverlayImportDialogInput(elt) {
    //Convert String to JSON
    try {
        let cfg = JSON.parse(elt.value);

        enableContent();

        //type check
        if (document.getElementById('OVERLAY_PAGE').dataset.name === "") {
            Overlay_Page_update(cfg, true);
            Overlay_Page_updateInfo(cfg, true);
            Overlay_Page_setSave(true);
        } else if(document.getElementById('OVERLAY_PAGE').dataset.name !== cfg.type) return OUTPUT_showError('Overlay Type missmatch');

        Overlay_Page_update(cfg);
    } catch (err) {
        console.log(err);
        OUTPUT_showError('Error: Import Settings Corrupted! Try copying again!');
        return;
    }
}

function Overlay_Page_collectCheckedJSON() {
    let type = document.getElementById('OVERLAY_PAGE').dataset.name;
    
    if (type === 'alerts') {
        let cfg = Overlay_Page_Alerts_collectJSON();
        let s = Overlay_Page_Alerts_checkJSON(cfg);
        return s === true ? cfg : s;
    } else if (type === 'events') {
        let cfg = Overlay_Page_Events_collectJSON(type);
        let s = Overlay_Page_Events_checkJSON(cfg, type);
        return s === true ? cfg : s;
    } else if (type === 'latest') {
        let cfg = Overlay_Page_Latest_collectJSON(type);
        let s = Overlay_Page_Latest_checkJSON(cfg, type);
        return s === true ? cfg : s;
    } else if (type === 'counter') {
        let cfg = Overlay_Page_Counter_collectJSON(type);
        let s = Overlay_Page_Counter_checkJSON(cfg, type);
        return s === true ? cfg : s;
    } else if (type === 'history') {
        let cfg = Overlay_Page_History_collectJSON(type);
        let s = Overlay_Page_History_checkJSON(cfg, type);
        return s === true ? cfg : s;
    }

    return null;
}

function Overlay_Page_Alerts_Save(is_new = false) {
    OUTPUT_hideError(document.getElementById('OVERLAY_PAGE_OUTPUT'));

    if (!document.getElementById('OVERLAY_TOKEN_NAME').value) {
        OUTPUT_showError("Please enter an Overlay name!");
        document.getElementById('OVERLAY_TOKEN_NAME').classList.add('missing');
        return;
    }
    document.getElementById('OVERLAY_TOKEN_NAME').classList.remove('missing');

    let cfg = Overlay_Page_collectCheckedJSON();
    Overlay_Page_setSave(false);
    
    if (!cfg) cfg = 'Unknown Error: Cant collect Data!';

    //Check Errors
    if (typeof cfg === 'string') {
        OUTPUT_showError('Error: ' + cfg);
        Overlay_Page_setSave(true);
        return;
    }

    let opts = getAuthHeader();

    opts.method = is_new ? 'POST' : 'PUT';
    if (!is_new && document.getElementById('URL_TOKEN_INPUT').value !== document.getElementById('URL_TOKEN_INPUT').placeholder) opts.method = 'MOVE';
    
    opts.headers['Content-Type'] = 'application/json';
    let data = {
        token: document.getElementById('URL_TOKEN_INPUT').value,
        name: document.getElementById('OVERLAY_TOKEN_NAME').value,
        description: document.getElementById('OVERLAY_TOKEN_DESC').value,
        old_token: document.getElementById('URL_TOKEN_INPUT').placeholder,
        chroma_key: document.getElementById('OVERLAY_TOKEN_CHROMA_KEY').value,
        type: document.getElementById('OVERLAY_PAGE').dataset.name,
        settings: cfg
    };

    opts.body = JSON.stringify(data);

    //Save
    fetch('/api/alerts/overlays', opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (json && json.err) return Promise.reject(new Error(json.err));

            let idx = -1;
            OVERLAYS.find((elt, index) => {
                if (elt.token === document.getElementById('URL_TOKEN_INPUT').placeholder) {
                    idx = index;
                    return true;
                }
                return false;
            });
            if (idx >= 0) OVERLAYS.splice(idx, 1);

            OVERLAYS.push(data);
            Overlay_Page_setOverlay(OVERLAYS);

            OUTPUT_showInfo('Overlay saved!', document.getElementById('OVERLAY_PAGE_OUTPUT'));
            document.getElementById('URL_TOKEN_DELETE').disabled = false;
        })
        .catch(err => {
            Overlay_Page_setSave(true);
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('OVERLAY_PAGE_OUTPUT'));
        });
}
async function Overlay_Page_Alerts_Remove() {
    OUTPUT_hideError(document.getElementById('OVERLAY_PAGE_OUTPUT'));

    //Await Confirmation
    let answer = 'CANCEL';

    try {
        answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Do you really want to delete this Overlay?", ['DELETE', 'CANCEL']);
    } catch (err) {

    }

    if (answer !== 'DELETE') return Promise.resolve();
    
    let opts = getAuthHeader();
    opts.method = 'DELETE';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify({
        token: document.getElementById('URL_TOKEN_INPUT').placeholder
    });

    //Save
    fetch('/api/alerts/overlays', opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (json && json.err) return Promise.reject(new Error(json.err));

            OUTPUT_showInfo('Overlay removed!', document.getElementById('OVERLAY_PAGE_OUTPUT'));
            OVERLAYS = OVERLAYS.filter(elt => elt.token !== document.getElementById('URL_TOKEN_INPUT').placeholder);
            Overlay_Page_setOverlay(OVERLAYS);
            Overlay_Page_update();
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('OVERLAY_PAGE_OUTPUT'));
        });
}
function Overlay_Page_Alerts_Export() {
    let cfg = Overlay_Page_collectCheckedJSON();
    if (!cfg) return OUTPUT_showError('Unknown Error: Cant collect Data!');

    //Check Errors
    if (typeof cfg === 'string') {
        OUTPUT_showError('Error: ' + cfg);
        return;
    }

    let s = '';

    try {
        s = JSON.stringify({
            type: document.getElementById('OVERLAY_PAGE').dataset.name,
            name: document.getElementById('OVERLAY_TOKEN_NAME').value,
            description: document.getElementById('OVERLAY_TOKEN_DESC').value,
            settings: cfg
        });
    } catch (err) {
        OUTPUT_showError('Error: Converting Settings failed!');
    }

    copyToClipboard(s);
    OUTPUT_showInfo('Settings copied to clipboard!');
}

//Token Overlay Settings -> Alerts
function addAlertTopic(preload = {}, type = "", elt) {
    let div = document.createElement('DIV');
    div.innerHTML = createAlertTopic(preload, type);
    div = div.childNodes[0];
    div.dataset.name = type;
    document.getElementById('OVERLAY_PAGE_SETTINGS_ALERTS').insertBefore(div, document.getElementById('ADD_TOPIC'));
    SWITCHBUTTON_AUTOFILL();

    if (elt) elt.setAttribute('disabled', 'true');
    Overlay_Page_setSave(true);
}
function removeAlertTopic(type = "", elt) {
    let parent = FindHTMLParent(elt, (parent) => parent.classList.contains('ALERT_TOPIC'));
    if (parent) parent.remove();

    for (let topic of document.getElementById('OVERLAY_PAGE_SETTINGS_ALERTS').childNodes[document.getElementById('OVERLAY_PAGE_SETTINGS_ALERTS').childNodes.length - 1].childNodes) {
        if (topic.innerHTML === type) {
            topic.removeAttribute('disabled');
            break;
        }
    }

    Overlay_Page_setSave(true);
}
function createAlertTopic(preload = {}, type = "") {
    let s = '';
    s += '<div class="ALERT_TOPIC ' + (preload.enabled !== false ? 'enabled' : '') + '" data-name="' + type + '">';

    //Topic + Enable + Remove
    s += '<div class="ALERT_TOPIC_HEADER">';
    s += '<div class="ALERT_TOPIC_HEADER_TEXT"  onclick="this.parentElement.parentElement.classList.toggle(' + "'enabled'" + '); Overlay_Page_setSave(true);">' + type + '</div>';
    s += '<div onclick="removeAlertTopic(' + "'" + type + "'" + ', this);"><img src="/images/icons/trash-alt-solid.svg" /></div>';
    s += '</div>';

    //Other Settings
    s += '<div class="ALERT_TOPIC_SETTINGS">';
    s += '<div>';
    s += '<div>Randomize Equal Profiles</div>';
    s += '<div>' + SWITCHBUTTON_CREATE(false, false, 'Overlay_Page_setSave(true)', 'ALERT_TOPIC_SETTING_RANDOM_' + type.toUpperCase()) + '</div>';
    s += '</div>';
    s += '</div>';

    //Profile List
    s += '<div class="ALERT_TOPIC_PROFILES">';
    for (let profile of preload.profiles || []) s += '<div class="ALERT_TOPIC_PROFILE">' + createAlertProfile(profile, type) + '</div>';
    s += '</div>';

    s += '<div>';
    s += '<button class="ADD_PROFILE" onclick="addAlertProfile({ }, ' + "'" + type + "'" + ', this.parentElement.parentElement); Overlay_Page_setSave(true);">ADD PROFILE</button>';
    s += '</div>';

    s += '</div>';
    return s;
}

function addAlertProfile(preload = {}, type = "", elt) {
    let div = document.createElement('DIV');
    div.classList.add('ALERT_TOPIC_PROFILE')
    div.innerHTML = createAlertProfile(preload, type);

    for (let child of elt.childNodes) {
        if (child instanceof Element && child.classList.contains('ALERT_TOPIC_PROFILES')) {
            elt = child;
            break;
        }
    }

    elt.appendChild(div);
    SWITCHBUTTON_AUTOFILL();
}
function createAlertProfile(preload = {}, type = "") {
    let s = '';

    let name = preload.name ? PROFILES.find(elt => elt.name === preload.name) === undefined : false;
    if (preload.name ? PROFILES.find(elt => elt.name === preload.name) === undefined : false) {
        name = '<span style="color: red;">' + preload.name + '</span>';
    } else if (preload.name) {
        name = preload.name;
    } else {
        name = 'Select Profile';
    }

    s += '<div class="HeaderSelecThing ALERT_PROFILES_POOL">';
    s += '<div onclick="expandAlerts(this)">' + name + '</div><img src="/images/icons/trash-alt-solid.svg" onclick="removeAlertProfile(this)" />';
    s += '<div onclick="selectAlertProfile(this, event)" >';

    for (let profile of PROFILES) s += '<div title="' + profile.name + '">' + profile.name + '</div>';
    s += '</div>';
    s += '</div>';


    s += '<div class="ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE_OPTION">';
    s += '<div>Alert Text</div>';
    s += '<input type="text" value="' + (preload.text === undefined ? DEFAULT_ALERT_TEXTS[type] : preload.text) + '" oninput="Overlay_Page_setSave(true)"/>';
    s += '</div>';

    if (!ALERT_PROFILE_OPTIONS[type]) return s + '</div>';

    for (let option of ALERT_VARIABLES[type]) {
        if (option.name === 'message') continue;

        s += '<div class="ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE_OPTION" data-type="' + option.name + '">';
        let where = preload.where || {};

        if (option.name === 'tier') {
            s += '<div>"Sub Tier" Trigger</div>';

            s += '<div class="TierList">';
            s += '<div><div>Tier 1</div><input type="checkbox" ' + (where.tier1 !== false ? 'checked' : '') + ' onchange="Overlay_Page_setSave(true)"/></div>';
            s += '<div><div>Tier 2</div><input type="checkbox" ' + (where.tier2 !== false? 'checked' : '') + '  onchange="Overlay_Page_setSave(true)"/></div>';
            s += '<div><div>Tier 3</div><input type="checkbox" ' + (where.tier3 !== false? 'checked' : '') + '  onchange="Overlay_Page_setSave(true)"/></div>';
            s += '<div><div>Tier Prime</div><input type="checkbox" ' + (where.twitchprime !== false ? 'checked' : '') + '  onchange="Overlay_Page_setSave(true)"/></div>';
            s += '</div>';
        } else if (option.name === 'amount') {
            s += '<div>"Amount" Trigger Range</div>';

            s += '<div class="Range">';
            s += '<div><span>from: </span><input type="number" min="-1" value="' + (where.amount_min !== undefined ? where.amount_min : -1) + '" placeholder="Lower Range Bounds here" oninput="Overlay_Page_setSave(true)"/></div>';
            s += '<div><span>to: </span><input type="number" min="-1" value="' + (where.amount_max !== undefined ? where.amount_max : -1) + '" placeholder="Upper Range Bounds here" oninput="Overlay_Page_setSave(true)"/></div>';
            s += '</div>';
            s += '<div class="info">Use a value of -1 to indicate any value below/above!</div>';
        } else if (option.name === 'username') {
            s += '<div>"Username" Trigger</div>';
            s += '<input type="text" value="' + (where.username || []).join(',') + '" placeholder="Comma seperated list of usernames" oninput="Overlay_Page_setSave(true)"/>';
            s += '<input type="checkbox" title="Invert Username Trigger. Turns the Whitelist into a Blacklist." oninput="Overlay_Page_setSave(true)" ' + (where.inv_username === true ? 'checked' : '') + '/>';
        } else if (option.name === 'target') {
            s += '<div>"Target" Trigger</div>';
            s += '<input type="text" value="' + (where.target || []).join(',') + '" placeholder="Comma seperated list of usernames" oninput="Overlay_Page_setSave(true)"/>';
            s += '<input type="checkbox" title="Invert Target Trigger. Turns the Whitelist into a Blacklist." oninput="Overlay_Page_setSave(true)" ' + (where.inv_username === true ? 'checked' : '') + ' />';
        } else if (option.name === 'total' || option.name === 'months') {
            s += '<div>"' + option.name.substring(0, 1).toUpperCase() + option.name.substring(1) + '" Trigger Range</div>';

            s += '<div class="Range">';
            s += '<div><span>from: </span><input type="number" min="-1" value="' + (where.total_min !== undefined ? where[option.name + '_min'] : -1) + '" placeholder="Lower Range Bounds here" oninput="Overlay_Page_setSave(true)"/></div>';
            s += '<div><span>to: </span><input type="number" min="-1" value="' + (where.total_max !== undefined ? where[option.name + '_max'] : -1) + '" placeholder="Upper Range Bounds here" oninput="Overlay_Page_setSave(true)"/></div>';
            s += '</div>';
            s += '<div class="info">Use a value of -1 to indicate any value below/above!</div>';
        }

        s += '</div>';
    }

    return s;
}
function selectAlertProfile(elt, e) {
    elt.parentElement.classList.remove('expand');
    let profile = PROFILES.find(elt => elt.name === e.target.innerHTML);
    if (!profile) return;

    elt.parentElement.childNodes[0].innerHTML = e.target.innerHTML;
    Overlay_Page_setSave(true);
}
function expandAlerts(elt) {
    elt.parentElement.classList.toggle('expand');
}
function updateAlertsPools() {
    for (let elt of document.getElementsByClassName('ALERT_PROFILES_POOL')) {
        let name = elt.childNodes[0];
        if (name.innerHTML.startsWith('<span')) name = name.childNodes[0];
        name = name.innerHTML;

        if (PROFILES.find(elt => elt.name === name)) {
            name = '<span style="color: red;">' + name + '</span>';
        }

        elt.childNodes[0].innerHTML = name;

        let s = "";
        for (let profile of PROFILES) s += '<div title="' + profile.name + '">' + profile.name + '</div>';
        elt.childNodes[2].innerHTML = s;
    }
}
function removeAlertProfile(elt) {
    elt.parentElement.parentElement.remove();
    Overlay_Page_setSave(true);
}

function Overlay_Page_Alerts_collectJSON() {
    let cfg = { };
    let elt = document.getElementById('OVERLAY_PAGE_SETTINGS_ALERTS');

    for (let topic of elt.childNodes) {
        if (topic.id === 'ADD_TOPIC') continue;

        let topic_cfg = {
            enabled: topic.classList.contains('enabled'),
            random: document.getElementById('ALERT_TOPIC_SETTING_RANDOM_' + topic.dataset.name .toUpperCase()).value
        };

        for (let child of topic.childNodes) {
            if (child.classList.contains('ALERT_TOPIC_PROFILES')) {
                //Profiles
                topic_cfg.profiles = Overlay_Page_Alerts_Profiles_collectJSON(child);
            }
        }

        cfg[topic.dataset.name] = topic_cfg;
    }

    return cfg;
}
function Overlay_Page_Alerts_Profiles_collectJSON(parent) {
    let profiles = [];

    for (let elt of parent.childNodes) {
        let name = elt.childNodes[0].childNodes[0].innerHTML;
        if (name.startsWith('<span')) name = elt.childNodes[0];

        let where = {};
        for (let option of elt.childNodes) {
            if (!(option instanceof Element && option.classList.contains('ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE_OPTION'))) continue;

            if (option.dataset.type === 'tier') {
                where.tier1 = option.childNodes[1].childNodes[0].childNodes[1].checked;
                where.tier2 = option.childNodes[1].childNodes[1].childNodes[1].checked;
                where.tier3 = option.childNodes[1].childNodes[2].childNodes[1].checked;
                where.twitchprime = option.childNodes[1].childNodes[3].childNodes[1].checked;
            } else if (option.dataset.type === 'amount') {
                where.amount_min = parseInt(option.childNodes[1].childNodes[0].childNodes[1].value);
                where.amount_max = parseInt(option.childNodes[1].childNodes[1].childNodes[1].value);
            } else if (option.dataset.type === 'username') {
                where.username = option.childNodes[1].value.trim().split(',');
                where.inv_username = option.childNodes[2].checked;
            } else if (option.dataset.type === 'target') {
                where.target = option.childNodes[1].value.trim().split(',');
                where.inv_target = option.childNodes[2].checked;
            } else if (option.dataset.type === 'total') {
                where[option.dataset.type + '_min'] = parseInt(option.childNodes[1].childNodes[0].childNodes[1].value);
                where[option.dataset.type + '_max'] = parseInt(option.childNodes[1].childNodes[1].childNodes[1].value);
            }
        }
        
        profiles.push({
            name: name === 'Select Profile' ? '' : name,
            text: elt.childNodes[1].childNodes[1].value,
            where
        });
    }

    return profiles;
}
function Overlay_Page_Alerts_checkJSON(cfg = {}) {

    //Topics
    for (let topic in cfg) {
        if (cfg[topic].enabled !== true && cfg[topic].enabled !== false) return 'enabled type missmatch';
        if (cfg[topic].random !== true && cfg[topic].random !== false) return 'random type missmatch';

        if (!cfg[topic].profiles) return 'profiles error';

        //Sort Profiles
        let sorted = sortBounds(cfg[topic].profiles, 'amount');
        sorted = sortBounds(cfg[topic].profiles, 'total');
        sorted = sortBounds(cfg[topic].profiles, 'months');

        for (let i = 0; i < sorted.length; i++) {
            let elt = sorted[i];

            if (!elt.name || elt.name.split(' ').join('') == '' || elt.name === 'Select Profile') {
                return topic.toUpperCase() + ': An Option has no Profile selected!';
            }

            if (elt.where.tier1 !== undefined) {
                if (elt.where.tier1 == false && elt.where.tier2 == false && elt.where.tier3 == false && elt.where.twitchprime == false) {
                    return topic.toUpperCase() + ': Profile has no Tier Trigger assigned!';
                }
            }

            if (elt.where.min !== -1 && elt.where.max !== -1) {
                if (elt.where.min > elt.where.max) {
                    return topic.toUpperCase() + ': Profile has unlogical Range!';
                }
            }

            if (elt.where.total_min !== -1 && elt.where.total_max !== -1) {
                if (elt.where.total_min > elt.where.total_max) {
                    return topic.toUpperCase() + ': Profile has unlogical "Total" Range!';
                }
            }

            if (elt.where.months_min !== -1 && elt.where.months_max !== -1) {
                if (elt.where.months_min > elt.where.months_max) {
                    return topic.toUpperCase() + ': Profile has unlogical "Months" Range!';
                }
            }

            if (i < sorted.length - 1 && elt.where.min !== undefined) {
                let next = sorted[i + 1];

                if (elt.where.tier1 == next.where.tier1 && elt.where.tier2 == next.where.tier2 && elt.where.tier3 == next.where.tier3 && elt.where.twitchprime == next.where.twitchprime) {
                    if (elt.where.min === next.where.min && elt.where.max === next.where.max) {
                        return topic.toUpperCase() + ': Profile has duplicate Trigger Range!';
                    }
                }
            }
        }
    }
    
    return true;
}

//Token Overlay Settings -> Events
function createEventsSettings(token, event) {
    let overlay = OVERLAYS.find(elt => elt.token === token);
    if (!overlay) overlay = {
        settings: {}
    };

    document.getElementById('OVERLAY_PAGE_SETTINGS_EVENTS').dataset.mode = 'event';

    if (event === 'poll') {
        document.getElementById('OVERLAY_PAGE_SETTINGS_EVENTS').innerHTML = Events_Poll_create(overlay.settings[event]);
        Events_ShowPoll();
    }
    else if (event === 'prediction') {
        document.getElementById('OVERLAY_PAGE_SETTINGS_EVENTS').innerHTML = Events_Prediction_create(overlay.settings[event]);
        Events_ShowPrediction();
    }
    else if (event === 'channel_point_redemption') {
        document.getElementById('OVERLAY_PAGE_SETTINGS_EVENTS').innerHTML = Events_CPR_create(overlay.settings[event]);
        Events_ShowCPR();
    }
    else if (event === 'hypetrain') {
        document.getElementById('OVERLAY_PAGE_SETTINGS_EVENTS').innerHTML = Events_HypeTrain_create(overlay.settings[event]);
        Events_ShowHypeTrain();
    }
}
function createEventSetting(setting = {}, value = setting.default) {
    let s = '';

    if (setting.spacer === 'top') s += '<span></span><span></span>';

    s += '<span>';
    if (setting.arrow) s += '<arrow>&#x21B5;</arrow>';
    s += setting.title;
    s += '</span>';

    if (setting.type === 'checkbox') {
        s += '<input type="checkbox" data-name="' + setting.name + '" ' + (value === true ? 'checked="true"' : '') + ' onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'color') {
        s += '<input type="color" data-name="' + setting.name + '" value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'number') {
        s += '<input type="number" data-name="' + setting.name + '" min="0" step="1" ' + (setting.default !== undefined ? 'placeholder="' + setting.default + 'px"' : '') + ' value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'select') {
        s += '<select data-name="' + setting.name + '" value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '">';
        for (let opt of setting.options) {
            if (typeof opt === 'string') {
                s += '<option ' + (value === opt ? 'selected' : '') + '>' + opt + '</option>';
            } else if (typeof opt === 'object') {
                s += '<option ' + (value === opt.name ? 'selected' : '') + ' value="' + opt.name + '">' + opt.title + '</option>';
            }
        }
        s += '</select>';
    }
    else if (setting.type === 'text') {
        s += '<input type="text" data-name="' + setting.name + '" value="' + value + '" onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'custom') {
        s += '<div data-name="' + setting.name + '" >' + (setting.html || '') + '</div>';
    }
    else if (setting.type === 'file') {
        s += '<div data-type="file" data-name="' + setting.name + '" style="display: grid; grid-template-columns: auto 27px;">';

        s += '<span ';
        s += 'style="display: inline-block; ' + (value && !FILES.find(elt => elt === value) ? ' color: red;' : '') + '" ';
        s += 'title="' + (!value ? 'EMPTY' : value) + '" ';
        s += '>';
        s += (!value ? 'EMPTY' : value);
        s += '</span>';
        s += '<button onclick="openEventFileDialog(event, this, ' + "'sounds', '" + value + "'" + ')">...</button>';

        s += '</div>';
    }
    else if (setting.type === 'slider') {
        s += '<div data-type="slider" data-name="' + setting.name + '" style="display: grid; grid-template-columns: auto 50px;">';

        s += '<input type="range" min="' + setting.min + '" value="' + value + '" max="' + setting.max + '" oninput="this.parentElement.childNodes[1].value = this.value; Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '" />';
        s += '<input type="number" min="' + setting.min + '" value="' + value + '" max="' + setting.max + '" oninput="this.parentElement.childNodes[0].value = this.value; Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '" />';

        s += '</div>';
    }
    else if (setting.type === 'checkboxselect') {
        s += '<div data-type="checkboxselect" data-name="' + setting.name + '">';

        s += '<center onclick="this.parentElement.classList.toggle(' + "'show'" + ')">Select </center>';

        s += '<div>';
        for (let option of setting.options || []) {
            s += '<span>' + option.title + '</span>';
            s += '<input type="checkbox" data-name="' + option.name + '" onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '" ' + (value.find(elt => elt === option.name) !== undefined ? 'checked="true"' : '') + ' />';
        }
        s += '</div>';

        s += '</div>';
    }
    else {
        s += '<span></span>';
    }

    if (setting.spacer === 'bottom') s += '<span></span><span></span>';

    return s;
}
function Events_collectJSON_General(child, name = "", save = false) {
    if (save === false && MUTED_PREVIEWS === true) {
        if (['use_display_sound', 'use_concluded_sound', 'use_hide_sound'].find(elt => elt === name)) {
            return false;
        }
    }
    
    if (child.dataset.type === 'file') {
        for (let childer of child.childNodes) {
            if (childer instanceof Element && childer.tagName === 'SPAN') {
                return childer.innerHTML === 'EMPTY' ? '' : childer.innerHTML;
            }
        }
    }
    else if (child.dataset.type === 'slider') {
        for (let childer of child.childNodes) {
            if (childer instanceof Element && childer.tagName === 'INPUT') {
                return parseInt(childer.value);
            }
        }
    }
    else if (child.dataset.type === 'checkboxselect') {
        let arr = [];
        for (let childer of child.childNodes[1].childNodes) {
            if (childer instanceof Element && childer.type === 'checkbox' && childer.checked) arr.push(childer.dataset.name);
        }
        return arr;
    }
    else if (child.type === 'number') {
        return parseInt(child.value);
    }
    else {
        return child.type === 'checkbox' ? child.checked : child.value;
    }
}

function Events_mutePreview(elt) {
    MUTED_PREVIEWS = !MUTED_PREVIEWS;

    elt.innerHTML = (MUTED_PREVIEWS ? 'Unm' : 'M') + 'ute Preview';
}

function openEventFileDialog(e, elt, type, value) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    let id = "";

    do {
        id = 'EVENTS_FILE_DIALOG_REFEREMCE_' + GenerateRandomBytes(30);
    } while (document.getElementById(id));

    elt.id = id;

    let div = document.createElement('DIV');
    div.id = 'EVENT_FILEBROWSER_DIALOG';
    div.dataset.reference = id;
    

    let s = '';
    s += '<center>Select Sound File</center>';
    s += MISC_createFileLibrary(FILES, '/alerts/custom/', 'Event Sounds', type, value, '', '', '/api/Alerts/files', 'EventFileRemoveDialog');

    div.innerHTML = s;
    document.getElementById('grid').appendChild(div);
    disableContent('EventFileRemoveDialog', true);
}
function EventFileRemoveDialog(selected) {
    if (selected) {
        //Find DIalog
        let dialog = document.getElementById('EVENT_FILEBROWSER_DIALOG');

        //Find Wrapper
        let btn = document.getElementById(dialog.dataset.reference);
        let wrapper = FindHTMLParent(btn, (p) => p.tagName === 'DIV');

        for (let elt of wrapper.childNodes) {
            if (elt instanceof Element && elt.tagName === 'SPAN') {
                //Update Input
                elt.innerHTML = selected === elt.innerHTML ? 'EMPTY' : selected;
                elt.title = elt.innerHTML;
                elt.style.color = elt.innerHTML !== 'EMPTY' && !FILES.find(elt => elt === selected) ? 'red' : '';
            } else if (elt instanceof Element && elt.tagName === 'BUTTON') {
                //Update Button
                elt.setAttribute('onclick', 'openEventFileDialog(event, this, ' + "'sounds', '" + selected + "'" + ')');
            }
        }

        enableContent();
        Overlay_Page_setSave(true);
        return;
    }

    //Remove Dialog
    document.getElementById('EVENT_FILEBROWSER_DIALOG').remove();
}

function Overlay_Page_Events_collectJSON() {
    return cfg = {
        poll: Events_Poll_collectJSON(true),
        prediction: Events_Prediction_collectJSON(true),
        channel_point_redemption: Events_CPR_collectJSON(true),
        hypetrain: Events_HypeTrain_collectJSON(true)
    };
}
function Overlay_Page_Events_checkJSON(cfg) {
    for (let key in cfg) {
        if (cfg[key] === null) delete cfg[key];
    }

    return true;
}

//Poll
function Events_Poll_create(cfg = { type: 'twitch' }) {
    let s = '';
    s += '<div class="EVENT_TYPE" id="OVERLAY_EVENT_POLL">';
    s += '<center>Poll</center>';

    //LEFT
    s += '<div class="EVENT_PREVIEW" id="EVENT_PREVIEW_POLL">';
    s += '</div>';

    //RIGHT
    s += '<div class="EVENT_SETTINGS_WRAPPER">';
    s += '<div class="EVENT_SETTINGS">';
    s += '<div>' + Events_Poll_createSettings(cfg) + '</div>';
    s += '</div>';
    s += '</div>';

    s += '</div>';
    return s;
}
function Events_Poll_createSettings(preload = { type: 'twitch'}) {
    let s = '';
    let topics = [
        //{
        //    name: 'General Settings', settings: [
        //        { name: 'type', title: 'Preset Poll Style', type: 'select', default: preload.type, options: ['twitch', 'frikybot'], onchange: 'Events_Poll_TypeChange', arrow: true }
        //    ]
        //},
        {
            name: 'Display Settings', settings: [
                {
                    name: 'display_time', title: 'Display Time', type: 'select', options: [
                        { name: 'create', title: 'Poll was created' },
                        { name: 'update', title: 'Poll was updated or created' },
                        { name: 'closed', title: 'Poll was closed' }
                    ],
                    default: preload.display_time || 'both', arrow: true
                },
                { name: 'display_method', title: 'Display Animation', type: 'select', options: ['move', 'fade'], default: preload.display_method || 'move', arrow: true },
                { name: 'display_direction', title: 'Display Direction', type: 'select', options: ['L', 'R'], default: preload.display_direction || 'R', arrow: true },
                { name: 'use_display_sound', title: 'Play Display Sound', type: 'checkbox', default: preload.use_display_sound || false, arrow: true },
                { name: 'display_sound', title: 'Display Sound', type: 'file', default: preload.display_sound || '', arrow: true },
                { name: 'display_volume', title: 'Sound Volume', type: 'slider', min: 0, max: 100, default: preload.display_volume || 50, arrow: true }
            ]
        },
        {
            name: 'Concluded Settings', settings: [
                { name: 'use_concluded_sound', title: 'Play Concluded Sound', type: 'checkbox', default: preload.use_concluded_sound || false, arrow: true },
                { name: 'concluded_sound', title: 'Concluded Sound', type: 'file', default: preload.concluded_sound || '', arrow: true },
                { name: 'concluded_volume', title: 'Sound Volume', type: 'slider', min: 0, max: 100, default: preload.concluded_volume || 50, arrow: true }
            ]
        },
        {
            name: 'Hide Settings', settings: [
                {
                    name: 'hide_time', title: 'Hide Time', type: 'select', options: [
                        { name: 'closed', title: 'Poll was closed' },
                        { name: 'ontime', title: 'On-Time elapsed' }
                    ], default: preload.hide_time || 'closed', arrow: true
                },
                { name: 'hide_method', title: 'Hide Animation', type: 'select', options: ['move', 'fade'], default: preload.hide_method || 'move', arrow: true },
                { name: 'hide_direction', title: 'Hide Direction', type: 'select', options: ['L', 'R'], default: preload.hide_direction || 'R', arrow: true },
                { name: 'display_duration', title: 'Display Duration (seconds)', type: 'number', default: preload.display_duration || 10, arrow: true }
            ]
        }
    ];

    s += '<button onclick="Events_Poll_Randomize(this)">Update Poll Data</button>';
    s += '<button onclick="Events_ShowPoll(this)">Reset</button>';
    s += '<button onclick="Events_mutePreview(this)">' + (MUTED_PREVIEWS ? 'Unm' : 'M') +'ute Preview</button><span></span>';
    
    let first = true;
    for (let topic of topics) {
        s += '<span ' + (first ? '' : 'class="STG_TPC_START"') + '>' + topic.name + '</span><span></span>';
        first = false;
        for (let stg of topic.settings) s += createEventSetting(stg);
    }

    return s;
}
function Events_ShowPoll() {
    let cfg = Events_Poll_collectJSON();

    POLL_DATA = { id: 'PREVIEW', choices: [], started_at: Date.now(), ends_at: Date.now() + 1000 * 60 };
    for (let i = 0; i < 3; i++) {
        POLL_DATA.choices[i] = { id: GenerateRandomBytes(12), title: 'Choice ' + (i + 1), votes: Math.floor(Math.random() * 100) };
    }
    POLL_DATA.choices.sort((a, b) => b.votes - a.votes);
    for (let i = 0; i < POLL_DATA.choices.length; i++) POLL_DATA.choices[i].title = 'Choice ' + (i + 1);
    
    document.getElementById('EVENT_PREVIEW_POLL').innerHTML = '<div>' + Event_createPoll(POLL_DATA, cfg) + '</div>';
    if (POLL_TO) clearTimeout(POLL_TO);
    if (POLL_ONTIME_TO) clearTimeout(POLL_ONTIME_TO);
    
    if (cfg.hide_time === 'ontime') {
        POLL_ONTIME_TO = setTimeout(() => {
            let cfg = Events_Poll_collectJSON();
            let root = document.getElementById('EVENT_POLL_PREVIEW');
            root.dataset.end = true;
            root.dataset.effect = cfg.hide_method || 'move';
            root.dataset.dir = cfg.hide_direction || 'R';
        }, (cfg.display_duration || 10) * 1000);
    }

    POLL_TO = setTimeout(() => {
        POLL_DATA.status = 'completed';
        POLL_DATA.ended_at = POLL_DATA.ends_at;
        delete POLL_DATA.ends_at;
        Event_updatePoll(document.getElementById('EVENT_POLL_PREVIEW'), POLL_DATA, Events_Poll_collectJSON())
            .then(x => {
                let cfg = Events_Poll_collectJSON();

                if (cfg.display_method === 'create') {
                    Events_ShowPoll();
                    return;
                }

                let root = document.getElementById('EVENT_POLL_PREVIEW');

                root.dataset.end = false;
                root.dataset.effect = cfg.display_method || 'move';
                root.dataset.dir = cfg.display_direction || 'R';

                let AUDIO_elt = FindSubElementFromPath(root, ['AUDIO']);
                AUDIO_elt.remove();
                if (cfg.use_concluded_sound && cfg.concluded_sound) {
                    let element = document.createElement('DIV');

                    let s = '';
                    s += '<audio autoplay data-vol="' + (cfg.concluded_volume / 100) + '" onplay="this.volume=parseFloat(this.dataset.vol);">';
                    s += '<source src="/Alerts/custom/' + cfg.concluded_sound + '" type="audio/' + cfg.concluded_sound.split('.').pop() + '">';
                    s += '</audio>';
                    element.innerHTML = s;

                    root.appendChild(element.childNodes[0]);
                }
                
                setTimeout(() => {
                    root.dataset.end = true;
                    root.dataset.effect = cfg.hide_method || 'move';
                    root.dataset.dir = cfg.hide_direction || 'R';

                    setTimeout(() => {
                        Events_ShowPoll();
                    }, 5000);
                }, (cfg.display_duration || 10) * 1000);
            });
    }, 1000 * 59);
}

function Events_Poll_TypeChange(elt) {
    if (POLL_TO) clearTimeout(POLL_TO);
    POLL_DATA.started_at = Date.now();
    POLL_DATA.ends_at = Date.now() + 1000 * 60;

    let cfg = Events_Poll_collectJSON(elt);
    document.getElementById('EVENT_PREVIEW_POLL').innerHTML = Event_createPoll(POLL_DATA, cfg);

    let root = FindHTMLParent(elt, (parent) => parent.classList.contains('EVENT_SETTINGS'));
    root.innerHTML = '<div>' + Events_Poll_createSettings(cfg) + '</div>';

    POLL_TO = setTimeout(() => Event_updatePoll(document.getElementById('EVENT_POLL_PREVIEW'), POLL_DATA, Events_Poll_collectJSON(FindSubElementFromPath(document.getElementById('EVENT_PREVIEW_POLL').parentElement, ['.EVENT_SETTINGS_WRAPPER', '.EVENT_SETTINGS']))), 1000 * 59);
}
function Events_Poll_change(elt) {
    let cfg = Events_Poll_collectJSON(elt);
    document.getElementById('EVENT_PREVIEW_POLL').innerHTML = Event_createPoll(POLL_DATA, cfg);
}
function Events_Poll_expert(elt) {
    let root = FindHTMLParent(elt, (parent) => parent.classList.contains('EVENT_SETTINGS'));
    root.innerHTML = '<div>' + Events_Poll_createSettings(Events_Poll_collectJSON(elt)) + '</div>';
}
function Events_Poll_Randomize(elt) {
    for (let choice of POLL_DATA.choices) {
        choice.votes += Math.floor(Math.random() * 100);
    }

    let cfg = Events_Poll_collectJSON(elt);
    Event_updatePoll(document.getElementById('EVENT_POLL_PREVIEW'), POLL_DATA, cfg);

    if (cfg.display_time === 'create' || cfg.display_time === 'closed') return;

    let root = document.getElementById('EVENT_POLL_PREVIEW');
    root.dataset.end = false;
    root.dataset.effect = cfg.display_method || 'move';
    root.dataset.dir = cfg.display_direction || 'R';

    if (cfg.hide_time === 'ontime') {
        if (POLL_ONTIME_TO) clearTimeout(POLL_ONTIME_TO);
        POLL_ONTIME_TO = setTimeout(() => {
            let cfg = Events_Poll_collectJSON();
            let root = document.getElementById('EVENT_POLL_PREVIEW');
            root.dataset.end = true;
            root.dataset.effect = cfg.hide_method || 'move';
            root.dataset.dir = cfg.hide_direction || 'R';
        }, ((cfg.display_duration || 10) + 2) * 1000);
    }
}
function Events_Poll_collectJSON(save = false) {
    let cfg = { type: 'twitch' };

    let elt = document.getElementById('OVERLAY_EVENT_POLL');
    if (!elt) return null;

    for (let child of FindSubElementFromPath(elt, ['.EVENT_SETTINGS_WRAPPER', '.EVENT_SETTINGS', 'div']).childNodes) {
        if (child instanceof Element && child.dataset.name) {
            if (child.dataset.name === 'order') {
                let value = '';
                for (let childer of child.childNodes) if (childer instanceof Element && childer.tagName === 'SELECT') value += " " + childer.value;
                cfg['order'] = value.substring(1);
            } else if (child.dataset.name === 'cell_border_style') {
                let value = '';
                for (let childer of child.childNodes) {
                    value += ' ' + childer.value;
                    if (childer.tagName === 'INPUT') value += 'px';
                }
                cfg['cell_border_style'] = value.substring(1);
            } else {
                cfg[child.dataset.name] = Events_collectJSON_General(child, child.dataset.name, save);
                if (cfg[child.dataset.name] === null) delete cfg[child.dataset.name];
            }
        }
    }
    
    return cfg;
}

//Prediction
function Events_Prediction_create(cfg = { type: 'twitch' }) {
    let s = '';
    s += '<div class="EVENT_TYPE" id="OVERLAY_EVENT_PREDICTION">';
    s += '<center>Prediction</center>';

    //LEFT
    s += '<div class="EVENT_PREVIEW" id="EVENT_PREVIEW_PREDICTION">';
    s += '</div>';

    //RIGHT
    s += '<div class="EVENT_SETTINGS_WRAPPER">';
    s += '<div class="EVENT_SETTINGS">';
    s += '<div>' + Events_Prediction_createSettings(cfg) + '</div>';
    s += '</div>';
    s += '</div>';

    s += '</div>';
    return s;
}
function Events_Prediction_createSettings(preload = { type: 'twitch' }) {
    let s = '';
    let topics = [
        //{
        //    name: 'General Settings', settings: [
        //        { name: 'type', title: 'Preset Poll Style', type: 'select', default: preload.type, options: ['twitch', 'frikybot'], onchange: 'Events_Prediction_TypeChange', arrow: true }
        //    ]
        //},
        {
            name: 'Display Settings', settings: [
                {
                    name: 'display_time', title: 'Display Time', type: 'select', options: [
                        { name: 'create', title: 'Prediction was created' },
                        { name: 'update', title: 'Prediction was updated or created' },
                        { name: 'locked', title: 'Prediction was locked' },
                        { name: 'concluded', title: 'Prediction has concluded' }
                    ],
                    default: preload.display_time || 'update', arrow: true
                },
                { name: 'display_method', title: 'Display Animation', type: 'select', options: ['move', 'fade'], default: preload.display_method || 'move', arrow: true },
                { name: 'display_direction', title: 'Display Direction', type: 'select', options: ['L', 'R'], default: preload.display_direction || 'R', arrow: true },
                { name: 'use_display_sound', title: 'Play Display Sound', type: 'checkbox', default: preload.use_display_sound || false, arrow: true },
                { name: 'display_sound', title: 'Display Sound', type: 'file', default: preload.display_sound || '', arrow: true },
                { name: 'display_volume', title: 'Sound Volume', type: 'slider', min: 0, max: 100, default: preload.display_volume || 50, arrow: true }
            ]
        },
        {
            name: 'Locked Settings', settings: [
                { name: 'use_locked_sound', title: 'Play Pred. Locked Sound', type: 'checkbox', default: preload.use_locked_sound || false, arrow: true },
                { name: 'locked_sound', title: 'Pred. Locked Sound', type: 'file', default: preload.locked_sound || '', arrow: true },
                { name: 'locked_volume', title: 'Sound Volume', type: 'slider', min: 0, max: 100, default: preload.locked_volume || 50, arrow: true }
            ]
        },
        {
            name: 'Concluded Settings', settings: [
                { name: 'use_concluded_sound', title: 'Play Pred. Concluded Sound', type: 'checkbox', default: preload.use_concluded_sound || false, arrow: true },
                { name: 'concluded_sound', title: 'Pred. Concluded Sound', type: 'file', default: preload.concluded_sound || '', arrow: true },
                { name: 'concluded_volume', title: 'Sound Volume', type: 'slider', min: 0, max: 100, default: preload.concluded_volume || 50, arrow: true }
            ]
        },
        {
            name: 'Hide Settings', settings: [
                {
                    name: 'hide_time', title: 'Hide Time', type: 'select', options: [
                        { name: 'stage', title: 'Prediction was locked or closed' },
                        { name: 'closed', title: 'Prediction was closed' },
                        { name: 'ontime', title: 'On-Time elapsed' }
                    ],
                    default: preload.hide_time || 'stage', arrow: true
                },
                { name: 'hide_method', title: 'Hide Animation', type: 'select', options: ['move', 'fade'], default: preload.hide_method || 'move', arrow: true },
                { name: 'hide_direction', title: 'Hide Direction', type: 'select', options: ['L', 'R'], default: preload.hide_direction || 'R', arrow: true },
                { name: 'display_duration', title: 'Display Duration (seconds)', type: 'number', default: preload.display_duration || 10, arrow: true }
            ]
        }
    ];

    s += '<button onclick="Events_Prediction_Randomize(this)">Update Prediction Data</button>';
    s += '<button onclick="Events_ShowPrediction(this)">Reset</button>';
    s += '<button onclick="Events_Prediction_Lock(this)">Lock Prediction</button>';
    s += '<button onclick="Events_mutePreview(this)">' + (MUTED_PREVIEWS ? 'Unm' : 'M') + 'ute Preview</button>';
    
    let first = true;
    for (let topic of topics) {
        s += '<span ' + (first ? '' : 'class="STG_TPC_START"') + '>' + topic.name + '</span><span></span>';
        first = false;
        for (let stg of topic.settings) s += createEventSetting(stg);
    }
    
    return s;
}
function Events_ShowPrediction() {
    PRED_DATA = { id: 'PREVIEW', outcomes: [], started_at: Date.now(), locks_at: Date.now() + 1000 * 60 };
    for (let i = 0; i < 10; i++) {
        PRED_DATA.outcomes[i] = { id: GenerateRandomBytes(12), title: 'Outcome ' + (i + 1), channel_points: Math.floor(Math.random() * 100) };
    }
    for (let i = 0; i < PRED_DATA.outcomes.length; i++) PRED_DATA.outcomes[i].title = 'Outcome ' + (i + 1);

    let cfg = Events_Prediction_collectJSON();

    document.getElementById('EVENT_PREVIEW_PREDICTION').innerHTML = '<div>' + Event_createPrediction(PRED_DATA, cfg) + '</div>';
    if (PRED_TO) clearTimeout(PRED_TO);
    if (PRED_ONTIME_TO) clearTimeout(PRED_ONTIME_TO);

    if (cfg.hide_time === 'ontime') {
        PRED_ONTIME_TO = setTimeout(() => {
            console.log("MOVE BACK");


            let cfg = Events_Prediction_collectJSON();
            let root = document.getElementById('EVENT_PREDICTION_PREVIEW');
            root.dataset.end = true;
            root.dataset.effect = cfg.hide_method || 'move';
            root.dataset.dir = cfg.hide_direction || 'R';
        }, ((cfg.display_duration || 10)) * 1000);
    }
    
    PRED_TO = setTimeout(() => {
        delete PRED_DATA.locks_at;
        delete PRED_DATA.locked_at;
        PRED_DATA.status = 'resolved';
        PRED_DATA.ended_at = Date.now();
        PRED_DATA.winning_outcome_id = PRED_DATA.outcomes[Math.floor(Math.random() * PRED_DATA.outcomes.length)].id;
        Event_updatePrediction(document.getElementById('EVENT_PREDICTION_PREVIEW'), PRED_DATA, Events_Prediction_collectJSON())
            .then(x => {
                let cfg = Events_Prediction_collectJSON();

                if (cfg.display_time === 'create' || cfg.display_time === 'locked') {
                    Events_ShowPrediction();
                    return;
                }

                let root = document.getElementById('EVENT_PREDICTION_PREVIEW');

                root.dataset.end = false;
                root.dataset.effect = cfg.display_method || 'move';
                root.dataset.dir = cfg.display_direction || 'R';

                let AUDIO_elt = FindSubElementFromPath(root, ['AUDIO']);
                AUDIO_elt.remove();
                if (cfg.use_concluded_sound && cfg.concluded_sound) {
                    let element = document.createElement('DIV');

                    let s = '';
                    s += '<audio autoplay data-vol="' + (cfg.concluded_volume / 100) + '" onplay="this.volume=parseFloat(this.dataset.vol);">';
                    s += '<source src="/Alerts/custom/' + cfg.concluded_sound + '" type="audio/' + cfg.concluded_sound.split('.').pop() + '">';
                    s += '</audio>';
                    element.innerHTML = s;

                    root.appendChild(element.childNodes[0]);
                }

                setTimeout(() => {
                    root.dataset.end = true;
                    root.dataset.effect = cfg.hide_method || 'move';
                    root.dataset.dir = cfg.hide_direction || 'R';

                    setTimeout(() => {
                        Events_ShowPrediction();
                    }, 5000);
                }, (cfg.display_duration || 10) * 1000);
            });
    }, 1000 * 59);
}

function Events_Prediction_Randomize(elt) {
    for (let outcome of PRED_DATA.outcomes) {
        outcome.channel_points += Math.floor(Math.random() * 100);
    }

    let cfg = Events_Prediction_collectJSON(elt);
    Event_updatePrediction(document.getElementById('EVENT_PREDICTION_PREVIEW'), PRED_DATA, cfg);

    let root = document.getElementById('EVENT_PREDICTION_PREVIEW');
    root.dataset.end = false;
    root.dataset.effect = cfg.display_method || 'move';
    root.dataset.dir = cfg.display_direction || 'R';
    
    if (cfg.hide_time === 'ontime') {
        if (PRED_ONTIME_TO) clearTimeout(PRED_ONTIME_TO);
        PRED_ONTIME_TO = setTimeout(() => {
            let cfg = Events_Prediction_collectJSON();
            let root = document.getElementById('EVENT_PREDICTION_PREVIEW');
            root.dataset.end = true;
            root.dataset.effect = cfg.hide_method || 'move';
            root.dataset.dir = cfg.hide_direction || 'R';
        }, ((cfg.display_duration || 10) + 2) * 1000);
    }
}
function Events_Prediction_Lock(elt) {
    PRED_DATA.locked_at = Date.now();
    delete PRED_DATA.locks_at;
    let cfg = Events_Prediction_collectJSON(elt);
    Event_updatePrediction(document.getElementById('EVENT_PREDICTION_PREVIEW'), PRED_DATA, cfg)
        .then(x => {
            let cfg = Events_Prediction_collectJSON();

            if (cfg.hide_time !== 'stage' && cfg.hide_time !== 'locked') {
                return;
            }

            let root = document.getElementById('EVENT_PREDICTION_PREVIEW');

            root.dataset.end = false;
            root.dataset.effect = cfg.display_method || 'move';
            root.dataset.dir = cfg.display_direction || 'R';
            
            setTimeout(() => {
                root.dataset.end = true;
                root.dataset.effect = cfg.hide_method || 'move';
                root.dataset.dir = cfg.hide_direction || 'R';
            }, (cfg.display_duration || 10) * 1000);
        });
}
function Events_Prediction_TypeChange(elt) {
    if (PRED_TO) clearTimeout(PRED_TO);
    PRED_DATA.started_at = Date.now();
    PRED_DATA.ends_at = Date.now() + 1000 * 60;

    let cfg = Events_Prediction_collectJSON(elt);
    document.getElementById('EVENT_PREVIEW_PREDICTION').innerHTML = Event_createPrediction(PRED_DATA, cfg);

    let root = FindHTMLParent(elt, (parent) => parent.classList.contains('EVENT_SETTINGS'));
    root.innerHTML = '<div>' + Events_Prediction_createSettings(cfg) + '</div>';

    PRED_TO = setTimeout(() => { delete PRED_DATA.locks_at; PRED_DATA.ended_at = Date.now(); PRED_DATA.winning_outcome_id = PRED_DATA.outcomes[Math.floor(Math.random() * PRED_DATA.outcomes.length)].id; Event_updatePrediction(document.getElementById('EVENT_PREDICTION_PREVIEW'), PRED_DATA, Events_Prediction_collectJSON(FindSubElementFromPath(document.getElementById('EVENT_PREDICTION_PREVIEW').parentElement, ['.EVENT_SETTINGS_WRAPPER', '.EVENT_SETTINGS']))); }, 1000 * 59);
}
function Events_Prediction_change(elt) {
    let cfg = Events_Prediction_collectJSON(elt);
    console.log(cfg);
    document.getElementById('EVENT_PREVIEW_PREDICTION').innerHTML = Event_createPrediction(PRED_DATA, cfg);
}
function Events_Prediction_collectJSON(save = false) {
    let cfg = { type: 'twitch' };

    let elt = document.getElementById('OVERLAY_EVENT_PREDICTION');
    if (!elt) return null;

    for (let child of FindSubElementFromPath(elt, ['.EVENT_SETTINGS_WRAPPER', '.EVENT_SETTINGS', 'div']).childNodes) {
        if (child instanceof Element && child.dataset.name) {
            cfg[child.dataset.name] = Events_collectJSON_General(child, child.dataset.name, save);
            if (cfg[child.dataset.name] === null) delete cfg[child.dataset.name];
        }
    }
    
    return cfg;
}

//Channel Point Redemption
function Events_CPR_create(cfg = { }) {
    let s = '';
    s += '<div class="EVENT_TYPE" id="OVERLAY_EVENT_CPR">';
    s += '<center onclick="Events_toggleShowCPR(this)">Channel Point Redemption</center>';

    //LEFT
    s += '<div class="EVENT_PREVIEW" id="EVENT_PREVIEW_CPR">';
    s += '</div>';

    //RIGHT
    s += '<div class="EVENT_SETTINGS_WRAPPER">';
    s += '<div class="EVENT_SETTINGS">';
    s += '<div>' + Events_CPR_createSettings(cfg) + '</div>';
    s += '</div>';
    s += '</div>';

    s += '</div>';
    return s;
}
function Events_CPR_createSettings(preload = { }) {
    let s = '';

    let cpr_reward = [{ name: 'all', title: 'All Rewards' }];
    for (let reward of CPR_REWARDS) cpr_reward.push({ name: reward.id, title: reward.title });

    let topics = [
        {
            name: 'Display Settings', settings: [
                { name: 'display_time', title: 'Display Time', type: 'select', options: [{ name: 'added', title: 'Redemption was added' }, { name: 'update', title: 'Redemption was fullfilled' }, { name: 'both', title: 'Redemption was added or fullfilled' }], default: preload.display_time || 'added', arrow: true },
                { name: 'allowed_rewards', title: 'Allowed Rewards', type: 'checkboxselect', options: cpr_reward, default: ['all'], arrow: true },
                { name: 'display_method', title: 'Display Animation', type: 'select', options: ['move', 'fade'], default: preload.display_method || 'move', arrow: true },
                { name: 'display_direction', title: 'Display Direction', type: 'select', options: ['L', 'R'], default: preload.display_direction || 'R', arrow: true },
                { name: 'display_duration', title: 'Display Duration (seconds)', type: 'number', default: preload.display_duration || 10, arrow: true },
                { name: 'use_display_sound', title: 'Play Display Sound', type: 'checkbox', default: preload.use_display_sound || false, arrow: true },
                { name: 'display_sound', title: 'Display Sound', type: 'file', default: preload.display_sound || '', arrow: true },
                { name: 'display_volume', title: 'Sound Volume', type: 'slider', min: 0, max: 100, default: preload.display_volume || 50, arrow: true }
            ]
        },
        {
            name: 'Hide Settings', settings: [
                { name: 'hide_method', title: 'Hide Animation', type: 'select', options: ['move', 'fade'], default: preload.hide_method || 'move', arrow: true },
                { name: 'hide_direction', title: 'Hide Direction', type: 'select', options: ['L', 'R'], default: preload.hide_direction || 'R', arrow: true },
                { name: 'use_hide_sound', title: 'Play Display Sound', type: 'checkbox', default: preload.use_hide_sound || false, arrow: true },
                { name: 'hide_sound', title: 'Hide Sound', type: 'file', default: preload.hide_sound || '', arrow: true },
                { name: 'hide_volume', title: 'Sound Volume', type: 'slider', min: 0, max: 100, default: preload.hide_volume || 50, arrow: true }
            ]
        },
        {
            name: 'Style Settings', settings: [
                { name: 'background', title: 'Background Color', type: 'color', default: preload.background || '#772ce8', arrow: true },
                { name: 'icon_background', title: 'Icon Background Color', type: 'color', default: preload.icon_background || '#00b1a3', arrow: true },
                { name: 'text_color', title: 'Text Color', type: 'color', default: preload.text_color || '#FFFFFF', arrow: true },
                { name: 'user_color', title: 'Username Color', type: 'color', default: preload.user_color || '#00FF00', arrow: true },
                { name: 'bar_color', title: 'Bar Color', type: 'color', default: preload.bar_color || '#dad1e8', arrow: true }
            ]
        }
    ];

    s += '<button onclick="Events_mutePreview(this)">' + (MUTED_PREVIEWS ? 'Unm' : 'M') + 'ute Preview</button><span></span>';
    
    let first = true;
    for (let topic of topics) {
        s += '<span ' + (first ? '' : 'class="STG_TPC_START"') + '>' + topic.name + '</span><span></span>';
        first = false;
        for (let stg of topic.settings) s += createEventSetting(stg);
    }

    return s;
}
function Events_ShowCPR() {
    let cfg = Events_CPR_collectJSON();
    
    document.getElementById('EVENT_PREVIEW_CPR').innerHTML = '<div>' + Event_createChannelPointRedeption({ id: 'PREVIEW' }, cfg) + '</div>';
    if (CPR_IV) clearInterval(CPR_IV);
    CPR_IV = setInterval(() => {
        let cfg = Events_CPR_collectJSON();

        let root = document.getElementById('EVENT_CPR_PREVIEW');
        let AUDIO_elt = FindSubElementFromPath(root, ['AUDIO']);
        AUDIO_elt.remove();
        if (cfg.use_hide_sound && cfg.hide_sound) {
            let element = document.createElement('DIV');

            let s = '';
            s += '<audio autoplay data-vol="' + (cfg.hide_volume / 100) + '" onplay="this.volume=parseFloat(this.dataset.vol);">';
            s += '<source src="/Alerts/custom/' + cfg.hide_sound + '" type="audio/' + cfg.hide_sound.split('.').pop() + '">';
            s += '</audio>';
            element.innerHTML = s;

            root.appendChild(element.childNodes[0]);
        }

        root.dataset.end = true;
        root.dataset.effect = cfg.hide_method || 'move';
        root.dataset.dir = cfg.hide_direction || 'R';

        setTimeout(() => {
            Events_ShowCPR();
        }, 5000);

    }, (cfg.display_duration || 10) * 1000);
}
function Events_CPR_collectJSON(save = false) {
    let cfg = { };

    let elt = document.getElementById('OVERLAY_EVENT_CPR');
    if (!elt) return null;

    for (let child of FindSubElementFromPath(elt, ['.EVENT_SETTINGS_WRAPPER', '.EVENT_SETTINGS', 'div']).childNodes) {
        if (child instanceof Element && child.dataset.name) {
            cfg[child.dataset.name] = Events_collectJSON_General(child, child.dataset.name, save);
            if (cfg[child.dataset.name] === null) delete cfg[child.dataset.name];
        }
    }

    return cfg;
}

//Hypetrain
function Events_HypeTrain_create(cfg = {}) {
    let s = '';
    s += '<div class="EVENT_TYPE" id="OVERLAY_EVENT_HYPETRAIN">';
    s += '<center onclick="Events_toggleShowHypeTrain(this)">HypeTrain</center>';

    //LEFT
    s += '<div class="EVENT_PREVIEW" id="EVENT_PREVIEW_HYPETRAIN">';
    s += '</div>';

    //RIGHT
    s += '<div class="EVENT_SETTINGS_WRAPPER">';
    s += '<div class="EVENT_SETTINGS">';
    s += '<div>' + Events_HypeTrain_createSettings(cfg) + '</div>';
    s += '</div>';
    s += '</div>';

    s += '</div>';
    return s;
}
function Events_HypeTrain_createSettings(preload = {}) {
    let s = '';
    
    s += '<div>'
    s += '<button onclick="Events_updateHypeTrainHead()">Update Head</button>';
    s += '<button onclick="Events_addHypeTrainContriubtion()">Add RNG Contribution</button>';
    s += '<button onclick="Events_addHypeTrainContriubtion(' +  "'sub'"  +  ', false)">Add Sub</button>';
    s += '<button onclick="Events_addHypeTrainContriubtion(' + "'resub'" +  ', false)">Add ReSub</button>';
    s += '<button onclick="Events_addHypeTrainContriubtion(undefined, true)">Add Prime</button>';
    s += '<button onclick="Events_addHypeTrainContriubtion(' + "'giftsub'" + ', false)">Add SubGift</button>';
    s += '<button onclick="Events_addHypeTrainContriubtion(' + "'giftbomb'" + ', false)">Add GiftBomb</button>';
    s += '<button onclick="Events_addHypeTrainContriubtion(' + "'cheer'" + ', false)">Add Cheer</button>';
    s += '<button onclick="Events_resetHypeTrain()">Reset</button>';
    s += '<button onclick="Events_mutePreview(this)">' + (MUTED_PREVIEWS ? 'Unm' : 'M') + 'ute Preview</button>';
    s += '</div>';
    
    let topics = [
        {
            name: 'Enter Settings', settings: [
                { name: 'use_display_sound', title: 'Play Enter Sound', type: 'checkbox', default: preload.use_display_sound || false, arrow: true },
                { name: 'display_sound', title: 'Enter Sound', type: 'file', default: preload.display_sound || '', arrow: true },
                { name: 'display_volume', title: 'Sound Volume', type: 'slider', min: 0, max: 100, default: preload.display_volume || 50, arrow: true }
            ]
        },
        {
            name: 'Leave Settings', settings: [
                { name: 'use_leave_sound', title: 'Play Leave Sound', type: 'checkbox', default: preload.use_leave_sound || false, arrow: true },
                { name: 'leave_sound', title: 'Leave Sound', type: 'file', default: preload.leave_sound || '', arrow: true },
                { name: 'leave_volume', title: 'Sound Volume', type: 'slider', min: 0, max: 100, default: preload.leave_volume || 50, arrow: true }
            ]
        },
        {
            name: 'HypeTrain Settings', settings: [
                { name: 'skip_animation', title: 'Skip Animation', type: 'checkbox', default: preload.skip_animation || false, arrow: true }
            ]
        },
        {
            name: 'Head Settings', settings: [
                { name: 'draw_head_picture', title: 'Draw Broadcaster Picture', type: 'checkbox', default: preload.draw_head_picture || true, arrow: true },
                { name: 'head_color', title: 'Color', type: 'color', default: preload.head_color || '#b400a3', arrow: true }
            ]
        }
    ];
    s += '<div>';

    s += '<div id="HT_ST_LEFT">';
    let first = true;
    for (let topic of topics) {
        s += '<span ' + (first ? '' : 'class="STG_TPC_START"') + '>' + topic.name + '</span><span></span>';
        s += '<div>';
        for (let stg of topic.settings) s += createEventSetting(stg);
        first = false;
        s += '</div>';
    }
    s += '</div>';

    topics = [
        {
            name: 'Cart Settings', settings: [
                { name: 'draw_cart_picture', title: 'Draw User Picture', type: 'checkbox', default: preload.draw_cart_picture || true, arrow: true },
                { name: 'sub_color', title: 'Sub-Event-Cart Color', type: 'color', default: preload.sub_color || '#b400a3', arrow: true },
                { name: 'prime_color', title: 'PrimeSub-Event-Cart Color', type: 'color', default: preload.prime_color || '#0076db', arrow: true },
                { name: 'sub_text', title: 'Sub-Event Text', type: 'text', default: preload.sub_text || 'First Time Sub ({tier})', arrow: true },
                { name: 'resub_text', title: 'ReSub-Event Text', type: 'text', default: preload.resub_text || 'Resub for {months} Months', arrow: true },
                { name: 'subgift_color', title: 'SubGift-Event-Cart Color', type: 'color', default: preload.subgift_color || '#b400a3', arrow: true },
                { name: 'subgift_text', title: 'SubGift-Event Text', type: 'text', default: preload.subgift_text || 'Gifted a {tier} Sub', arrow: true },
                { name: 'giftbomb_color', title: 'GiftBomb-Event-Cart Color', type: 'color', default: preload.giftbomb_color || '#b400a3', arrow: true },
                { name: 'giftbomb_text', title: 'GiftBomb-Event Text', type: 'text', default: preload.giftbomb_text || 'Gifted {amount} {tier} Subs', arrow: true },
                { name: 'bits_color', title: 'Bits-Event-Cart Color', type: 'color', default: preload.bits_color || '#bc2200', arrow: true },
                { name: 'bits_text', title: 'Bits-Event Text', type: 'text', default: preload.bits_text || '{amount}x Bits', arrow: true },
                { name: 'docking_color', title: 'Link Color', type: 'color', default: preload.docking_color || '#000000', arrow: true }
            ]
        }
    ];
    s += '<div id="HT_ST_RIGHT">';
    first = true;
    for (let topic of topics) {
        s += '<span ' + (first ? '' : 'class="STG_TPC_START"') + '>' + topic.name + '</span><span></span>';
        s += '<div>';
        for (let stg of topic.settings) s += createEventSetting(stg);
        first = false;
        s += '</div>';
    }
    s += '</div>';

    s += '</div>';
    return s;
}
function Events_ShowHypeTrain() {
    Events_resetHypeTrain();
}
function Events_HypeTrain_collectJSON(save = false) {
    let cfg = {};

    let elt = document.getElementById('HT_ST_LEFT');
    if (!elt) return null;

    //left
    for (let childer of elt.childNodes) {
        for (let child of childer.childNodes) {
            if (child instanceof Element && child.dataset.name) {
                cfg[child.dataset.name] = Events_collectJSON_General(child, child.dataset.name, save);
                if (cfg[child.dataset.name] === null) delete cfg[child.dataset.name];
            }
        }
    }

    elt = document.getElementById('HT_ST_RIGHT');
    if (!elt) return null;

    //right
    for (let childer of elt.childNodes) {
        for (let child of childer.childNodes) {
            if (child instanceof Element && child.dataset.name) {
                cfg[child.dataset.name] = Events_collectJSON_General(child, child.dataset.name, save);
                if (cfg[child.dataset.name] === null) delete cfg[child.dataset.name];
            }
        }
    }

    return cfg;
}

function Events_updateHypeTrainHead() {
    HYPETRAIN_DATA.progress += Math.floor(Math.random() * 100);

    if (HYPETRAIN_DATA.progress > HYPETRAIN_DATA.goal) {
        HYPETRAIN_DATA.progress = 0;
        HYPETRAIN_DATA.level++;
    }

    Event_updateHypeTrain_Head(HYPETRAIN_DATA, Events_HypeTrain_collectJSON());
}
function Events_addHypeTrainContriubtion(topic, prime) {
    const topics = ['sub', 'resub', 'giftsub', 'giftbomb', 'cheer'];

    let contribution = {
        topic: topic || topics[Math.floor(Math.random() * (prime === true ? 2 : topics.length))],
        username: '[Username]',
        tier: null,
        amount: Math.floor(Math.random() * 10) + 1,
        months: Math.floor(Math.random() * 10) + 1,
        picture: PROFILE_IMAGES(Date.now())
    };

    contribution.tier = prime !== false && (Math.random() < 0.5 || prime === true) && (contribution.topic === 'sub' || contribution.topic === 'resub') ? 'Twitch Prime' : 'Tier ' + (Math.floor(Math.floor(Math.random() * 20) / 10) + 1);

    if (contribution.topic === 'sub' || contribution.topic === 'resub' || contribution.topic === 'giftsub') {
        HYPETRAIN_DATA.subs++;
    } else if (contribution.topic === 'giftbomb') {
        HYPETRAIN_DATA.subs += contribution.amount;
    } else if (contribution.topic === 'cheer') {
        HYPETRAIN_DATA.bits += contribution.amount;
    }

    let cfg = Events_HypeTrain_collectJSON();

    Event_updateHypeTrain_Head(HYPETRAIN_DATA, cfg);
    Event_updateHypeTrain_Cart(HYPETRAIN_DATA.id, contribution, cfg);
}
function Events_resetHypeTrain() {
    HYPETRAIN_DATA = {
        id: 'PREVIEW',
        total: 137,
        progress: 137,
        goal: 500,
        level: 2,
        subs: 0,
        bits: 0,
        picture: LOGIN_getCookies().user.picture,
        started_at: GetLocalISODate(),
        expires_at: GetLocalISODate(new Date(Date.now() + 1000 * 60))
    };

    let cfg = Events_HypeTrain_collectJSON();

    document.getElementById('EVENT_PREVIEW_HYPETRAIN').innerHTML = '<div>' + Event_createHypeTrain(HYPETRAIN_DATA, cfg) + '</div>';
    Event_updateHypeTrain_Intro(HYPETRAIN_DATA, cfg);

    if (HYPETRAIND_TO) clearTimeout(HYPETRAIND_TO);
    HYPETRAIND_TO = setTimeout(() => {
        delete HYPETRAIN_DATA.expires_at;
        HYPETRAIN_DATA.ended_at = Date.now();
        Event_updateHypeTrain_Head(HYPETRAIN_DATA, Events_HypeTrain_collectJSON()).then(Events_resetHypeTrain);
    }, 1000 * 59);
}

//LATEST
function createLatestSettings(token) {
    const LATEST_ALERTS = ['follow', 'sub', 'resub', 'giftsub', 'giftbomb', 'cheer', 'host', 'raid'];
    const LATEST_EVENTS = ['poll', 'prediction', 'channel_point_redemption', 'hypetrain'];

    let overlay = OVERLAYS.find(elt => elt.token === token);
    if (!overlay) overlay = { settings: {} };
    if (!overlay.settings) overlay.settings = { general: {} };
    if (!overlay.settings.general) overlay.settings.general = {};

    let s = '';
    s += '<center>LATEST</center>';
    s += '<center class="OVERLAY_HINT"><b>Hint</b>: Latest Overlays will use the max. height and width of your Browser Source. The Preview below uses a 16:1-ish aspect ratio!</center>';
    s += '<div id="LATEST_PREVIEW"></div>';

    s += '<div id="LATEST_BUTTONS">';

    s += '<button data-name="init" title="Preview Init" onclick="Latest_testEvent(' + "'init'" + ' )" ' + (Object.getOwnPropertyNames(overlay.settings).length > 1 ? '' : 'hidden') + '>Preview Init</button>';

    for (let alert of LATEST_ALERTS) {
        let better_name = '';
        for (let part of alert.split('_')) better_name += part.charAt(0).toUpperCase() + part.substring(1) + ' ';

        s += '<button data-name="' + alert + '" title="Preview ' + better_name + '" onclick="Latest_testEvent(' + "'" + alert + "'" + ')" ' + (overlay.settings[alert] ? '' : 'hidden') + '>';
        s += 'Preview ' + better_name;
        s += '</button>';
    }
    for (let event of LATEST_EVENTS) {
        let better_name = '';
        for (let part of event.split('_')) better_name += part.charAt(0).toUpperCase() + part.substring(1) + ' ';

        s += '<button data-name="' + event + '" title="Preview ' + better_name + '" onclick="Latest_testEvent(' + "'" + event + "'" + ')" ' + (overlay.settings[event] ? '' : 'hidden') + '>';
        s += 'Preview ' + better_name;
        s += '</button>';
    }
    s += '</div>';

    s += '<div id="LATEST_SETTINGS">';

    //general
    s += Latest_createTopicSettings('general', overlay.settings['general'], overlay.settings);

    //Create Topics
    for (let topic in overlay.settings || {}) {
        if (topic === 'general') continue;
        s += Latest_createTopicSettings(topic, overlay.settings[topic], overlay.settings);
    }

    //Selector
    s += '<div class="LASTEST_SELECTOR_WRAPPER">';
    s += '<div id="LASTEST_SELECTOR_1" class="LASTEST_SELECTOR">';
    for (let alert of LATEST_ALERTS) {
        let better_name = '';
        for (let part of alert.split('_')) better_name += part.charAt(0).toUpperCase() + part.substring(1) + ' ';

        s += '<button data-name="' + alert + '" onclick="Latest_addTopic(this)" title="' + better_name + '" ' + (overlay.settings[alert] ? 'disabled' : '') + '>' + better_name + '</button>';
    }
    s += '</div>';
    s += '<div id="LASTEST_SELECTOR_2" class="LASTEST_SELECTOR" style="padding-top: 5px; border-top: 1px solid gray; margin-top: 5px;">';
    for (let event of LATEST_EVENTS) {
        let better_name = '';
        for (let part of event.split('_')) better_name += part.charAt(0).toUpperCase() + part.substring(1) + ' ';

        s += '<button data-name="' + event + '" onclick="Latest_addTopic(this)" title="' + better_name + '"' + (overlay.settings[event] ? 'disabled' : '') + '>' + better_name + '</button>';
    }
    s += '</div>';
    s += '</div>';
    
    s += '</div>';
    return s;
}

function Overlay_Page_Latest_collectJSON() {
    let cfg = {};

    for (let elt of document.getElementById('LATEST_SETTINGS').childNodes) {
        if (elt.classList.contains('LASTEST_SELECTOR_WRAPPER')) continue;

        let temp = {};
        
        for (let child of FindSubElementFromPath(elt, ['.LATEST_SETTINGS_TOPIC_SETTINGS']).childNodes) {
            child = child.childNodes[0];

            if (child instanceof Element && child.dataset.name) {
                if (child.dataset.type === 'file') {
                    for (let childer of child.childNodes) {
                        if (childer instanceof Element && childer.tagName === 'SPAN') {
                            temp[child.dataset.name] = childer.innerHTML === 'EMPTY' ? '' : childer.innerHTML;
                        }
                    }
                }
                else if (child.dataset.type === 'slider') {
                    for (let childer of child.childNodes) {
                        if (childer instanceof Element && childer.tagName === 'INPUT') {
                            temp[child.dataset.name] = parseInt(childer.value);
                        }
                    }
                }
                else if (child.dataset.type === 'checkboxselect') {
                    let arr = [];
                    for (let childer of child.childNodes[1].childNodes) {
                        if (childer instanceof Element && childer.type === 'checkbox' && childer.checked) arr.push(childer.dataset.name);
                    }
                    temp[child.dataset.name] = arr;
                }
                else if (child.type === 'number') {
                    temp[child.dataset.name] = parseInt(child.value);
                }
                else {
                    temp[child.dataset.name] = child.type === 'checkbox' ? child.checked : child.value;
                }
            }
        }

        cfg[elt.dataset.name] = temp;
    }

    return cfg;
}
function Overlay_Page_Latest_checkJSON(cfg) {
    return true;
}

function Latest_testEvent(topic) {
    let event = {
        username: 'Username',
        tier: 'Tier 1',
        amount: 3456,
        months: 25,
        title: topic.charAt(0).toUpperCase() + topic.substring(1) + ' Title',
        reward: {
            title: 'Reward Title'
        },
        winner: 'Option Title',
        result: '69%',
        level: 5,
        progress: '500%'
    };

    document.getElementById('LATEST_PREVIEW').innerHTML = Latest_createTopic('LATEST_PREVIEW_ALERT', topic, topic === 'init' ? null : event, Overlay_Page_Latest_collectJSON());
    Latest_adjustGrid(document.getElementById('LATEST_PREVIEW_ALERT'));

    let interval = setInterval(() => {
        if (document.getElementById('LATEST_PREVIEW_ALERT')) {
            Latest_adjustGrid(document.getElementById('LATEST_PREVIEW_ALERT'));
        } else {
            clearInterval(interval);
        }
    }, 1 * 1000);
}

function Latest_addTopic(elt) {
    let div = document.createElement('DIV');
    div.innerHTML = Latest_createTopicSettings(elt.dataset.name, {}, Overlay_Page_Latest_collectJSON());
    div = div.childNodes[0];
    elt.parentElement.parentElement.parentElement.insertBefore(div, elt.parentElement.parentElement);
    elt.disabled = true;
    SWITCHBUTTON_AUTOFILL();
    
    let preview_btn = FindSubElementFromPath(document.getElementById('LATEST_BUTTONS'), ['data-name="' + elt.dataset.name + '"']);
    preview_btn.hidden = false;

    let prev_init_btn = FindSubElementFromPath(document.getElementById('LATEST_BUTTONS'), ['data-name="init"']);
    prev_init_btn.hidden = false;
    
    Latest_testEvent(elt.dataset.name);
    Overlay_Page_setSave(true);
}
async function Latest_removeTopic(elt) {
    //Await Confirmation
    let answer = 'CANCEL';

    try {
        answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Do you really want to delete this Latest Topic?", ['DELETE', 'CANCEL']);
    } catch (err) {

    }

    if (answer !== 'DELETE') return Promise.resolve();

    let root = FindHTMLParent(elt, (p) => p.classList.contains('LATEST_SETTINGS_TOPIC'));
    
    let selector_btn = FindSubElementFromPath(document.getElementById('LATEST_SETTINGS'), ['.LASTEST_SELECTOR_WRAPPER', '#LASTEST_SELECTOR_1', 'data-name="' + root.dataset.name + '"']);
    if (!selector_btn) selector_btn = FindSubElementFromPath(document.getElementById('LATEST_SETTINGS'), ['.LASTEST_SELECTOR_WRAPPER', '#LASTEST_SELECTOR_2', 'data-name="' + root.dataset.name + '"']);
    selector_btn.disabled = false;

    let preview_btn = FindSubElementFromPath(document.getElementById('LATEST_BUTTONS'), ['data-name="' + root.dataset.name + '"']);
    preview_btn.hidden = true;
    
    if (document.getElementById('LATEST_PREVIEW_ALERT').dataset.name === root.dataset.name) document.getElementById('LATEST_PREVIEW').innerHTML = "";

    root.remove();

    let cfg = Overlay_Page_Latest_collectJSON();
    if (Object.getOwnPropertyNames(cfg).length === 1) {
        let preview_init_btn = FindSubElementFromPath(document.getElementById('LATEST_BUTTONS'), ['data-name="init"']);
        preview_init_btn.hidden = true;
    }

    Overlay_Page_setSave(true);
}

function Latest_createTopicSettings(topic, cfg = {}, main_cfg = {}) {
    let elements = [
        { name: 'enabled', type: 'switchbutton', title: 'Enabled', default: true, onchange: 'Latest_Input_Change' },
        { name: 'display_topic', type: 'checkbox', title: 'Display Topic Text', default: false, onchange: 'Latest_Input_Change' },
        { name: 'custom_text', type: 'text', title: 'Custom Text', default: '', onchange: 'Latest_Input_Change' },
        { name: 'text_color', type: 'color', title: 'Text Color', default: '#000000', onchange: 'Latest_Input_Change' },
        { name: 'display_icon', type: 'checkbox', title: 'Display Icon', default: true, onchange: 'Latest_Input_Change' },
        { name: 'custom_icon', type: 'file', title: 'Custom Icon', default: '', onchange: 'Latest_Input_Change' }
    ];

    //Collect Data
    switch (topic) {
        case 'general': {
            let events = Object.getOwnPropertyNames(main_cfg);
            elements = [
                { name: 'use_preload', type: 'checkbox', title: 'Preload Data from History', default: true, onchange: 'Latest_Input_Change' },
                { name: 'show_init_icon', type: 'checkbox', title: 'Show Init Icon', default: true, onchange: 'Latest_Input_Change' },
                { name: 'init_icon', type: 'select', title: 'Init Icon', default: '', options: events.filter(ele => ele !== 'general'), onchange: 'Latest_Input_Change' }
            ];
            break;
        }
        case 'follow': {
            elements = elements.concat([
                { name: 'display_username', type: 'checkbox', title: 'Display Username', default: true, onchange: 'Latest_Input_Change' }
            ]);
            break;
        }
        case 'resub': {
            elements = elements.concat([
                { name: 'display_username', type: 'checkbox', title: 'Display Username', default: true, onchange: 'Latest_Input_Change' },
                { name: 'display_tier', type: 'checkbox', title: 'Display Tier', default: true, onchange: 'Latest_Input_Change' },
                { name: 'display_months', type: 'checkbox', title: 'Display Months', default: true, onchange: 'Latest_Input_Change' }
            ]);
            break;
        }
        case 'giftsub': {
            elements = elements.concat([
                { name: 'display_target', type: 'checkbox', title: 'Display Target', default: true, onchange: 'Latest_Input_Change' }
            ]);
        }
        case 'sub': {
            elements = elements.concat([
                { name: 'display_username', type: 'checkbox', title: 'Display Username', default: true, onchange: 'Latest_Input_Change' },
                { name: 'display_tier', type: 'checkbox', title: 'Display Tier', default: true, onchange: 'Latest_Input_Change' }
            ]);
            break;
        }
        case 'giftbomb': {
            elements = elements.concat([
                { name: 'display_tier', type: 'checkbox', title: 'Display Tier', default: true, onchange: 'Latest_Input_Change' }
            ]);
        }
        case 'cheer':
        case 'host': 
        case 'raid': {
            elements = elements.concat([
                { name: 'display_username', type: 'checkbox', title: 'Display Username', default: true, onchange: 'Latest_Input_Change' },
                { name: 'display_amount', type: 'checkbox', title: 'Display Amount', default: true, onchange: 'Latest_Input_Change' }
            ]);
            break;
        }
        case 'prediction':
        case 'poll': {
            elements = elements.concat([
                { name: 'display_title', type: 'checkbox', title: 'Display Title', default: true, onchange: 'Latest_Input_Change' },
                { name: 'display_winner', type: 'checkbox', title: 'Display Winning Answer', default: true, onchange: 'Latest_Input_Change' },
                { name: 'display_result', type: 'checkbox', title: 'Display Votes', default: true, onchange: 'Latest_Input_Change' }
            ]);
            break;
        }
        case 'channel_point_redemption': {
            let cpr_reward = [{ name: 'all', title: 'All Rewards' }];
            for (let reward of CPR_REWARDS) cpr_reward.push({ name: reward.id, title: reward.title });

            elements = elements.concat([
                {
                    name: 'display_time', title: 'Display Time', type: 'select', options: [
                        { name: 'added', title: 'Redemption was added' },
                        { name: 'update', title: 'Redemption was fullfilled' }
                    ], default: 'added'
                },
                { name: 'display_reward_icon', type: 'checkbox', title: 'Display Reward Icon', default: true, onchange: 'Latest_Input_Change' },
                { name: 'display_username', type: 'checkbox', title: 'Display Username', default: true, onchange: 'Latest_Input_Change' },
                { name: 'display_title', type: 'checkbox', title: 'Display Reward Title', default: true, onchange: 'Latest_Input_Change' }, 
                { name: 'allowed_rewards', title: 'Allowed Rewards', type: 'checkboxselect', options: cpr_reward, default: ['all'] }
            ]);
            break;
        }
        case 'hypetrain': {
            elements = elements.concat([
                { name: 'display_level', type: 'checkbox', title: 'Display Level', default: true, onchange: 'Latest_Input_Change' },
                { name: 'display_progress', type: 'checkbox', title: 'Display Progress', default: true, onchange: 'Latest_Input_Change' }
            ]);
            break;
        }
    }

    if (topic !== 'general') elements.push(
        { name: 'display_border', type: 'checkbox', title: 'Display Underline', default: true, onchange: 'Latest_Input_Change' },
        { name: 'border_width', type: 'number', title: 'Underline Width', default: 4, onchange: 'Latest_Input_Change' },
        { name: 'border_color', type: 'color', title: 'Underline Color', default: '#000000', onchange: 'Latest_Input_Change' }
    );

    //Create HTML
    let s = '';
    s += '<div class="LATEST_SETTINGS_TOPIC" data-name="' + topic + '">';

    s += '<div class="LATEST_TOPIC_HEADER">';
    s += '<center>' + topic + '</center>';
    if(topic !== 'general') s += '<img src="/images/icons/trash-alt-solid.svg" onclick="Latest_removeTopic(this)"/>';
    s += '</div>';
    
    s += '<div class="LATEST_SETTINGS_TOPIC_SETTINGS">';
    for (let elt of elements) {
        s += Latest_createTopicSetting(elt, cfg[elt.name]);
    }
    s += '</div>';

    s += '</div>';

    return s;
}
function Latest_createTopicSetting(setting = {}, value = setting.default) {
    let s = '';

    if (setting.spacer === 'top') s += '<span></span><span></span>';

    s += '<span>';
    if (setting.arrow) s += '<arrow>&#x21B5;</arrow>';
    s += setting.title;
    s += '</span>';

    s += '<div>';

    if (setting.type === 'checkbox') {
        s += '<input type="checkbox" data-name="' + setting.name + '" ' + (value === true ? 'checked="true"' : '') + ' onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'switchbutton') {
        s += SWITCHBUTTON_CREATE(value, false, setting.onchange, undefined, 'data-name="' + setting.name + '"');
    }
    else if (setting.type === 'color') {
        s += '<input type="color" data-name="' + setting.name + '" value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'number') {
        s += '<input type="number" data-name="' + setting.name + '" min="0" step="1" ' + (setting.default !== undefined ? 'placeholder="' + setting.default + 'px"' : '') + ' value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'select') {
        s += '<select data-name="' + setting.name + '" value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '">';
        for (let opt of setting.options) {
            if (typeof opt === 'string') {
                s += '<option ' + (value === opt ? 'selected' : '') + '>' + opt + '</option>';
            } else if (typeof opt === 'object') {
                s += '<option ' + (value === opt.name ? 'selected' : '') + ' value="' + opt.name + '">' + opt.title + '</option>';
            }
        }
        s += '</select>';
    }
    else if (setting.type === 'text') {
        s += '<input type="text" data-name="' + setting.name + '" value="' + value + '" onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'custom') {
        s += '<div data-name="' + setting.name + '" >' + (setting.html || '') + '</div>';
    }
    else if (setting.type === 'file') {
        s += '<div data-type="file" data-name="' + setting.name + '" style="display: grid; grid-template-columns: auto 27px;">';

        s += '<span ';
        s += 'style="display: inline-block; ' + (value && !FILES.find(elt => elt === value) ? ' color: red;' : '') + '" ';
        s += 'title="' + (!value ? 'EMPTY' : value) + '" ';
        s += '>';
        s += (!value ? 'EMPTY' : value);
        s += '</span>';
        s += '<button onclick="openLatestFileDialog(event, this, ' + "'images', '" + value + "'" + ')">...</button>';

        s += '</div>';
    }
    else if (setting.type === 'slider') {
        s += '<div data-type="slider" data-name="' + setting.name + '" style="display: grid; grid-template-columns: auto 50px;">';

        s += '<input type="range" min="' + setting.min + '" value="' + value + '" max="' + setting.max + '" oninput="this.parentElement.childNodes[1].value = this.value; Overlay_Page_setSave(true);" />';
        s += '<input type="number" min="' + setting.min + '" value="' + value + '" max="' + setting.max + '" oninput="this.parentElement.childNodes[0].value = this.value; Overlay_Page_setSave(true);" />';

        s += '</div>';
    }
    else if (setting.type === 'checkboxselect') {
        s += '<div data-type="checkboxselect" data-name="' + setting.name + '">';

        s += '<center onclick="this.parentElement.classList.toggle(' + "'show'" + ')">Select </center>';

        s += '<div>';
        for (let option of setting.options || []) {
            s += '<span>' + option.title + '</span>';
            s += '<input type="checkbox" data-name="' + option.name + '" onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '" ' + (value.find(elt => elt === option.name) !== undefined ? 'checked="true"' : '') + ' />';
        }
        s += '</div>';

        s += '</div>';
    }
    else {
        s += '<span></span>';
    }

    s += '</div>';

    if (setting.spacer === 'bottom') s += '<span></span><span></span>';

    return s;
}
function Latest_Input_Change(elt) {
    if (document.getElementById('LATEST_PREVIEW_ALERT')) Latest_testEvent(document.getElementById('LATEST_PREVIEW_ALERT').dataset.name);
    Overlay_Page_setSave(true);
}

function openLatestFileDialog(e, elt, type, value) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    let id = "";

    do {
        id = 'LATEST_FILEBROWSER_DIALOG_REFEREMCE_' + GenerateRandomBytes(30);
    } while (document.getElementById(id));

    elt.id = id;

    let div = document.createElement('DIV');
    div.id = 'LATEST_FILEBROWSER_DIALOG';
    div.dataset.reference = id;
    
    let s = '';
    s += '<center>Select Icon File</center>';
    s += MISC_createFileLibrary(FILES, '/alerts/custom/', 'Latest Icons', type, value, '', '', '/api/Alerts/files', 'LatestFileRemoveDialog');

    div.innerHTML = s;
    document.getElementById('grid').appendChild(div);
    disableContent('LatestFileRemoveDialog', true);
}
function LatestFileRemoveDialog(selected) {
    if (selected) {
        //Find DIalog
        let dialog = document.getElementById('LATEST_FILEBROWSER_DIALOG');

        //Find Wrapper
        let btn = document.getElementById(dialog.dataset.reference);
        let wrapper = FindHTMLParent(btn, (p) => p.tagName === 'DIV');

        for (let elt of wrapper.childNodes) {
            if (elt instanceof Element && elt.tagName === 'SPAN') {
                //Update Input
                elt.innerHTML = selected === elt.innerHTML ? 'EMPTY' : selected;
                elt.title = elt.innerHTML;
                elt.style.color = elt.innerHTML !== 'EMPTY' && !FILES.find(elt => elt === selected) ? 'red' : '';
            } else if (elt instanceof Element && elt.tagName === 'BUTTON') {
                //Update Button
                elt.setAttribute('onclick', 'openLatestFileDialog(event, this, ' + "'images', '" + selected + "'" + ')');
            }
        }

        enableContent();
        Overlay_Page_setSave(true);
        Latest_Input_Change();
        return;
    }

    //Remove Dialog
    document.getElementById('LATEST_FILEBROWSER_DIALOG').remove();
}

//COUNTER
function createCounterSettings(token) {
    const COUNTER_ALERTS = ['follow', 'sub', 'giftsub', 'cheer'];

    let overlay = OVERLAYS.find(elt => elt.token === token);
    if (!overlay) overlay = { settings: {} };
    let topic = Object.getOwnPropertyNames(overlay.settings)[0];

    let s = '';
    s += '<center>COUNTER</center>';
    s += '<center class="OVERLAY_HINT" ' + (Object.getOwnPropertyNames(overlay.settings).length > 0 ? '' : 'style="display: none;"') + '>';
    s += '<b>Hint</b>: Counter Overlays will use the max. height and width of your Browser Source. The Preview below uses a 16:1-ish aspect ratio!</center>';
    s += '</center>';

    s += '<div id="COUNTER_PREVIEW" ' + (topic ? '' : 'style="display: none;"') + '>';
    if (topic) s += Counter_createCounter('PREVIEW_COUNTER_ALERT', topic, Math.floor(Math.random() * 100), overlay.settings[topic]);
    s += '</div>';

    s += '<div id="COUNTER_SETTINGS" ';

    if (topic) {
        s += 'data-name="' + topic + '">';
        s += Counter_createEvent(topic, overlay.settings[topic]);
    } else {
        s += '>';
        s += '<div id="COUNTER_SETTINGS_SELECTOR">';
        s += '<center>Select Countable Event</center>';
        s += '<div>';
        for (let event of COUNTER_ALERTS) {
            s += '<button data-name="' + event + '" title="' + event.charAt(0).toUpperCase() + event.substring(1) + '" onclick="Counter_selectEvent(' + "'" + event + "'" + ' )">' + event.charAt(0).toUpperCase() + event.substring(1) + '</button>';
        }
        s += '</div>';
        s += '</div>';
    }

    s += '</div>';
    return s;
}

function Overlay_Page_Counter_collectJSON() {
    let cfg = {};

    for (let child of document.getElementById('COUNTER_TOPIC_SETTINGS').childNodes) {
        child = child.childNodes[0];

        if (child instanceof Element && child.dataset.name) {
            if (child.dataset.name === 'topic') continue;

            if (child.dataset.type === 'file') {
                for (let childer of child.childNodes) {
                    if (childer instanceof Element && childer.tagName === 'SPAN') {
                        cfg[child.dataset.name] = childer.innerHTML === 'EMPTY' ? '' : childer.innerHTML;
                    }
                }
            } else if (child.dataset.type === 'slider') {
                for (let childer of child.childNodes) {
                    if (childer instanceof Element && childer.tagName === 'INPUT') {
                        cfg[child.dataset.name] = parseInt(childer.value);
                    }
                }
            } else if (child.type === 'number') {
                cfg[child.dataset.name] = parseInt(child.value);
            }
            else if (child.dataset.type === 'checkboxselect') {
                let arr = [];
                for (let childer of child.childNodes[1].childNodes) {
                    if (childer instanceof Element && childer.type === 'checkbox' && childer.checked) arr.push(childer.dataset.name);
                }
                temp[child.dataset.name] = arr;
            }else {
                cfg[child.dataset.name] = child.type === 'checkbox' ? child.checked : child.value;
            }
        }
    }

    if (!document.getElementById('COUNTER_SETTINGS')) return {};

    cfg = {
        [document.getElementById('COUNTER_SETTINGS').dataset.name]: cfg
    };
        

    switch (Object.getOwnPropertyNames(cfg)[0]) {
        case 'sub': {
            cfg.resub = true;
            cfg.giftsub = true;
            cfg.giftbomb = true;
            break;
        }
        case 'giftsub': {
            cfg.giftbomb = true;
            break;
        }
    }

    return cfg;
}
function Overlay_Page_Counter_checkJSON(cfg) {
    return true;
}

function Counter_selectEvent(topic) {
    document.getElementById('COUNTER_SETTINGS').innerHTML = Counter_createEvent(topic);
    document.getElementById('COUNTER_SETTINGS').dataset.name = topic;

    let hint = FindSubElementFromPath(document.getElementById('OVERLAY_PAGE_SETTINGS_COUNTER'), ['.OVERLAY_HINT']);
    hint.style.display = 'block';

    document.getElementById('COUNTER_PREVIEW').style.display = 'block';
    document.getElementById('COUNTER_PREVIEW').innerHTML = Counter_createCounter('PREVIEW_COUNTER_ALERT', topic, Math.floor(Math.random() * 100), Overlay_Page_Counter_collectJSON()[topic]);
    Counter_adjustGrid(document.getElementById('PREVIEW_COUNTER_ALERT'));
}

function Counter_createEvent(topic, cfg = {}) {
    let elements = [
        { name: 'topic', type: 'select', title: 'Change Topic', default: topic, options: ['follow', 'sub', 'giftsub', 'cheer'], onchange: 'Counter_Input_Change' },
        { name: 'interval', type: 'select', title: 'Counter Interval', options: ['alltime', 'per_stream', 'daily', 'weekly', 'monthly', 'yearly'], default: 'per_stream' },
        { name: 'display_icon', type: 'checkbox', title: 'Display Icon', default: true, onchange: 'Counter_Input_Change', spacer: 'top' },
        { name: 'custom_icon', type: 'file', title: 'Custom Icon', default: '', onchange: 'Counter_Input_Change' },
        { name: 'display_text', type: 'checkbox', title: 'Display Text', default: true, onchange: 'Counter_Input_Change' },
        { name: 'custom_text', type: 'text', title: 'Custom Text', default: '', onchange: 'Counter_Input_Change' },
        { name: 'text_color', type: 'color', title: 'Text Color', default: '#000000', onchange: 'Counter_Input_Change' },
        { name: 'display_amount', type: 'checkbox', title: 'Display Amount', default: true, onchange: 'Counter_Input_Change' },
        { name: 'display_border', type: 'checkbox', title: 'Display Underline', default: true, onchange: 'Counter_Input_Change' },
        { name: 'border_color', type: 'color', title: 'Underline Color', default: '#000000', onchange: 'Counter_Input_Change' },
        { name: 'border_width', type: 'number', title: 'Underline Width', default: 4, onchange: 'Counter_Input_Change' }
    ];

    let s = '';
    s += '<div id="COUNTER_TOPIC_SETTINGS">';
    s += '<center>Settings</center>';
    for (let elt of elements) {
        s += Counter_createTopicSetting(elt, cfg[elt.name]);
    }
    s += '</div>';
    return s;
}
function Counter_createTopicSetting(setting = {}, value = setting.default) {
    let s = '';

    if (setting.spacer === 'top') s += '<span></span><span></span>';

    s += '<span>';
    if (setting.arrow) s += '<arrow>&#x21B5;</arrow>';
    s += setting.title;
    s += '</span>';

    s += '<div>';

    if (setting.type === 'checkbox') {
        s += '<input type="checkbox" data-name="' + setting.name + '" ' + (value === true ? 'checked="true"' : '') + ' onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'switchbutton') {
        s += SWITCHBUTTON_CREATE(value, false, setting.onchange, undefined, 'data-name="' + setting.name + '"');
    }
    else if (setting.type === 'color') {
        s += '<input type="color" data-name="' + setting.name + '" value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'number') {
        s += '<input type="number" data-name="' + setting.name + '" min="0" step="1" ' + (setting.default !== undefined ? 'placeholder="' + setting.default + 'px"' : '') + ' value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'select') {
        s += '<select data-name="' + setting.name + '" value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '">';
        for (let opt of setting.options) {
            if (typeof opt === 'string') {
                s += '<option ' + (value === opt ? 'selected' : '') + '>' + opt + '</option>';
            } else if (typeof opt === 'object') {
                s += '<option ' + (value === opt.name ? 'selected' : '') + ' value="' + opt.name + '">' + opt.title + '</option>';
            }
        }
        s += '</select>';
    }
    else if (setting.type === 'text') {
        s += '<input type="text" data-name="' + setting.name + '" value="' + value + '" onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'custom') {
        s += '<div data-name="' + setting.name + '" >' + (setting.html || '') + '</div>';
    }
    else if (setting.type === 'file') {
        s += '<div data-type="file" data-name="' + setting.name + '" style="display: grid; grid-template-columns: auto 27px;">';

        s += '<span ';
        s += 'style="display: inline-block; ' + (value && !FILES.find(elt => elt === value) ? ' color: red;' : '') + '" ';
        s += 'title="' + (!value ? 'EMPTY' : value) + '" ';
        s += '>';
        s += (!value ? 'EMPTY' : value);
        s += '</span>';
        s += '<button onclick="openCounterFileDialog(event, this, ' + "'images', '" + value + "'" + ')">...</button>';

        s += '</div>';
    }
    else if (setting.type === 'slider') {
        s += '<div data-type="slider" data-name="' + setting.name + '" style="display: grid; grid-template-columns: auto 50px;">';

        s += '<input type="range" min="' + setting.min + '" value="' + value + '" max="' + setting.max + '" oninput="this.parentElement.childNodes[1].value = this.value; Overlay_Page_setSave(true);" />';
        s += '<input type="number" min="' + setting.min + '" value="' + value + '" max="' + setting.max + '" oninput="this.parentElement.childNodes[0].value = this.value; Overlay_Page_setSave(true);" />';

        s += '</div>';
    }
    else if (setting.type === 'checkboxselect') {
        s += '<div data-type="checkboxselect" data-name="' + setting.name + '">';

        s += '<center onclick="this.parentElement.classList.toggle(' + "'show'" + ')">Select </center>';

        s += '<div>';
        for (let option of setting.options || []) {
            s += '<span>' + option.title + '</span>';
            s += '<input type="checkbox" data-name="' + option.name + '" onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '" ' + (value.find(elt => elt === option.name) !== undefined ? 'checked="true"' : '') + ' />';
        }
        s += '</div>';

        s += '</div>';
    }
    else {
        s += '<span></span>';
    }

    s += '</div>';

    if (setting.spacer === 'bottom') s += '<span></span><span></span>';

    return s;
}

function Counter_Input_Change(elt) {
    if (elt.dataset.name === 'topic') {
        document.getElementById('COUNTER_SETTINGS').dataset.name = elt.value;
    }
    
    if (document.getElementById('COUNTER_PREVIEW')) {
        let cfg = Overlay_Page_Counter_collectJSON();
        document.getElementById('COUNTER_PREVIEW').innerHTML = Counter_createCounter('PREVIEW_COUNTER_ALERT', Object.getOwnPropertyNames(cfg)[0], Math.floor(Math.random() * 100), cfg[document.getElementById('COUNTER_SETTINGS').dataset.name]);
        Counter_adjustGrid(document.getElementById('PREVIEW_COUNTER_ALERT'));
    } 
    Overlay_Page_setSave(true);
}
function openCounterFileDialog(e, elt, type, value) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    let id = "";

    do {
        id = 'COUNTER_FILEBROWSER_DIALOG_REFEREMCE_' + GenerateRandomBytes(30);
    } while (document.getElementById(id));

    elt.id = id;

    let div = document.createElement('DIV');
    div.id = 'COUNTER_FILEBROWSER_DIALOG';
    div.dataset.reference = id;

    let s = '';
    s += '<center>Select Icon File</center>';
    s += MISC_createFileLibrary(FILES, '/alerts/custom/', 'Counter Icons', type, value, '', '', '/api/Alerts/files', 'CounterFileRemoveDialog');

    div.innerHTML = s;
    document.getElementById('grid').appendChild(div);
    disableContent('CounterFileRemoveDialog', true);
}
function CounterFileRemoveDialog(selected) {
    if (selected) {
        //Find DIalog
        let dialog = document.getElementById('COUNTER_FILEBROWSER_DIALOG');

        //Find Wrapper
        let btn = document.getElementById(dialog.dataset.reference);
        let wrapper = FindHTMLParent(btn, (p) => p.tagName === 'DIV');

        for (let elt of wrapper.childNodes) {
            if (elt instanceof Element && elt.tagName === 'SPAN') {
                //Update Input
                elt.innerHTML = selected === elt.innerHTML ? 'EMPTY' : selected;
                elt.title = elt.innerHTML;
                elt.style.color = elt.innerHTML !== 'EMPTY' && !FILES.find(elt => elt === selected) ? 'red' : '';
            } else if (elt instanceof Element && elt.tagName === 'BUTTON') {
                //Update Button
                elt.setAttribute('onclick', 'openCounterFileDialog(event, this, ' + "'images', '" + selected + "'" + ')');
            }
        }

        enableContent();
        Overlay_Page_setSave(true);
        let cfg = Overlay_Page_Counter_collectJSON();
        document.getElementById('COUNTER_PREVIEW').innerHTML = Counter_createCounter('PREVIEW_COUNTER_ALERT', Object.getOwnPropertyNames(cfg)[0], Math.floor(Math.random() * 100), cfg[document.getElementById('COUNTER_SETTINGS').dataset.name]);
        Counter_adjustGrid(document.getElementById('PREVIEW_COUNTER_ALERT'));
        return;
    }

    //Remove Dialog
    document.getElementById('COUNTER_FILEBROWSER_DIALOG').remove();
}

//HISTORY
function createHistorySettings(token) {
    let overlay = OVERLAYS.find(elt => elt.token === token);
    if (!overlay) overlay = { settings: {} };
    if (!overlay.settings) overlay.settings = { general: {} };
    if (!overlay.settings.general) overlay.settings.general = {};

    const HISTORY_ALERTS = ['follow', 'sub', 'resub', 'giftsub', 'giftbomb', 'cheer', 'host', 'raid'];
    const HISTORY_EVENTS = ['poll', 'prediction', 'channel_point_redemption', 'hypetrain'];

    let s = '';
    s += '<center>History List</center>';
    s += '<center class="OVERLAY_HINT"><b>Hint</b>: History List Overlays will use the max. height and width of your Browser Source and split the row height evenly.</center>';

    s += '<div id="HISTORY_LIST_PREVIEW">';
    s += HistoryList_createList('HISTORY_LIST_PREVIEW_ALERT', [], overlay.settings);
    s += '</div>';

    s += '<div id="HISTORY_LIST_BUTTONS">';
    for (let alert of HISTORY_ALERTS) {
        let better_name = '';
        for (let part of alert.split('_')) better_name += part.charAt(0).toUpperCase() + part.substring(1) + ' ';

        s += '<button data-name="' + alert + '" title="Preview ' + better_name + '" onclick="HistoryList_test(' + "'" + alert + "'" + ')" ' + (overlay.settings[alert] ? '' : 'hidden') + '>';
        s += 'Preview ' + better_name;
        s += '</button>';
    }
    for (let event of HISTORY_EVENTS) {
        let better_name = '';
        for (let part of event.split('_')) better_name += part.charAt(0).toUpperCase() + part.substring(1) + ' ';

        s += '<button data-name="' + event + '" title="Preview ' + better_name + '" onclick="HistoryList_test(' + "'" + event + "'" + ')" ' + (overlay.settings[event] ? '' : 'hidden') + '>';
        s += 'Preview ' + better_name;
        s += '</button>';
    }
    s += '</div>';

    s += '<div id="HISTORY_LIST_SETTINGS">';

    //general
    s += HistoryList_createTopicSettings('general', overlay.settings['general'], overlay.settings);

    //Preload Settings
    for (let topic in overlay.settings || {}) {
        if (topic === 'general') continue;
        s += HistoryList_createTopicSettings(topic, overlay.settings[topic], overlay.settings);
    }

    //Selector
    s += '<div class="HISTORY_LIST_SELECTOR_WRAPPER">';
    s += '<div id="HISTORY_LIST_SELECTOR_1" class="HISTORY_LIST_SELECTOR">';
    for (let alert of HISTORY_ALERTS) {
        let better_name = '';
        for (let part of alert.split('_')) better_name += part.charAt(0).toUpperCase() + part.substring(1) + ' ';

        s += '<button data-name="' + alert + '" onclick="HistoryList_addTopic(this)" title="' + better_name + '" ' + (overlay.settings[alert] ? 'disabled' : '') + '>' + better_name + '</button>';
    }
    s += '</div>';
    s += '<div id="HISTORY_LIST_SELECTOR_2" class="HISTORY_LIST_SELECTOR" style="padding-top: 5px; border-top: 1px solid gray; margin-top: 5px;">';
    for (let event of HISTORY_EVENTS) {
        let better_name = '';
        for (let part of event.split('_')) better_name += part.charAt(0).toUpperCase() + part.substring(1) + ' ';

        s += '<button data-name="' + event + '" onclick="HistoryList_addTopic(this)" title="' + better_name + '"' + (overlay.settings[event] ? 'disabled' : '') + '>' + better_name + '</button>';
    }
    s += '</div>';
    s += '</div>';

    s += '</div>';
    return s;
}

function Overlay_Page_History_collectJSON() {
    let cfg = {};

    for (let elt of document.getElementById('HISTORY_LIST_SETTINGS').childNodes) {
        if (elt.classList.contains('HISTORY_LIST_SELECTOR_WRAPPER')) continue;

        let temp = {};

        for (let child of FindSubElementFromPath(elt, ['.HISTORY_LIST_SETTINGS_TOPIC_SETTINGS']).childNodes) {
            child = child.childNodes[0];

            if (child instanceof Element && child.dataset.name) {
                if (child.dataset.type === 'file') {
                    for (let childer of child.childNodes) {
                        if (childer instanceof Element && childer.tagName === 'SPAN') {
                            temp[child.dataset.name] = childer.innerHTML === 'EMPTY' ? '' : childer.innerHTML;
                        }
                    }
                } else if (child.dataset.type === 'slider') {
                    for (let childer of child.childNodes) {
                        if (childer instanceof Element && childer.tagName === 'INPUT') {
                            temp[child.dataset.name] = parseInt(childer.value);
                        }
                    }
                } else if (child.type === 'number') {
                    temp[child.dataset.name] = parseInt(child.value);
                }
                else if (child.dataset.type === 'checkboxselect') {
                    let arr = [];
                    for (let childer of child.childNodes[1].childNodes) {
                        if (childer instanceof Element && childer.type === 'checkbox' && childer.checked) arr.push(childer.dataset.name);
                    }
                    temp[child.dataset.name] = arr;
                } else {
                    temp[child.dataset.name] = child.type === 'checkbox' ? child.checked : child.value;
                }
            }
        }

        cfg[elt.dataset.name] = temp;
    }

    return cfg;
}
function Overlay_Page_History_checkJSON(cfg) {
    return true;
}

function HistoryList_test(topic = '') {
    HistoryList_update(document.getElementById('HISTORY_LIST_PREVIEW_ALERT'), topic, {
        username: 'Username',
        tier: 'Tier 1',
        amount: 3456,
        months: 25,
        title: topic.charAt(0).toUpperCase() + topic.substring(1) + ' Title',
        reward: {
            title: 'Reward Title'
        },
        winner: 'Option Title',
        result: '69%',
        level: 5,
        progress: '500%'
    }, Overlay_Page_History_collectJSON());
}

function HistoryList_addTopic(elt) {
    let div = document.createElement('DIV');
    div.innerHTML = HistoryList_createTopicSettings(elt.dataset.name, {}, Overlay_Page_History_collectJSON());
    div = div.childNodes[0];
    elt.parentElement.parentElement.parentElement.insertBefore(div, elt.parentElement.parentElement);
    elt.disabled = true;
    SWITCHBUTTON_AUTOFILL();

    let preview_btn = FindSubElementFromPath(document.getElementById('HISTORY_LIST_BUTTONS'), ['data-name="' + elt.dataset.name + '"']);
    preview_btn.hidden = false;
    
    HistoryList_test(elt.dataset.name);
    HistoryList_Input_Change(false);
}
async function HistoryList_removeTopic(elt) {
    //Await Confirmation
    let answer = 'CANCEL';

    try {
        answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Do you really want to delete this Histoy List Topic?", ['DELETE', 'CANCEL']);
    } catch (err) {

    }

    if (answer !== 'DELETE') return Promise.resolve();

    let root = FindHTMLParent(elt, (p) => p.classList.contains('HISTORY_LIST_SETTINGS_TOPIC'));

    let selector_btn = FindSubElementFromPath(document.getElementById('HISTORY_LIST_SETTINGS'), ['.HISTORY_LIST_SELECTOR_WRAPPER', '#HISTORY_LIST_SELECTOR_1', 'data-name="' + root.dataset.name + '"']);
    if (!selector_btn) selector_btn = FindSubElementFromPath(document.getElementById('HISTORY_LIST_SETTINGS'), ['.HISTORY_LIST_SELECTOR_WRAPPER', '#HISTORY_LIST_SELECTOR_2', 'data-name="' + root.dataset.name + '"']);
    selector_btn.disabled = false;

    let preview_btn = FindSubElementFromPath(document.getElementById('HISTORY_LIST_BUTTONS'), ['data-name="' + root.dataset.name + '"']);
    preview_btn.hidden = true;

    let alert = document.getElementById('HISTORY_LIST_PREVIEW_ALERT');
    for (let child of HTMLArray2RealArray(alert.childNodes)) if (child.dataset.name === root.dataset.name) child.remove();

    root.remove();
    Overlay_Page_setSave(true);
}

function HistoryList_createTopicSettings(topic, cfg = {}, main_cfg = {}) {
    let elements = [
        { name: 'enabled', type: 'switchbutton', title: 'Enabled', default: true, onchange: 'HistoryList_Input_Change' },
        { name: 'display_topic', type: 'checkbox', title: 'Display Topic Text', default: false, onchange: 'HistoryList_Input_Change' },
        { name: 'custom_text', type: 'text', title: 'Custom Text', default: '', onchange: 'HistoryList_Input_Change' },
        { name: 'text_color', type: 'color', title: 'Text Color', default: '#FFFFFF', onchange: 'HistoryList_Input_Change' },
        { name: 'display_icon', type: 'checkbox', title: 'Display Icon', default: true, onchange: 'HistoryList_Input_Change' },
        { name: 'custom_icon', type: 'file', title: 'Custom Icon', default: '', onchange: 'HistoryList_Input_Change' }
    ];

    //Collect Data
    switch (topic) {
        case 'general': {
            elements = [
                { name: 'display_count', type: 'number', title: 'Number of Rows', default: 6, onchange: 'HistoryList_Input_Change' }
            ];
            break;
        }
        case 'follow': {
            elements = elements.concat([
                { name: 'display_username', type: 'checkbox', title: 'Display Username', default: true, onchange: 'HistoryList_Input_Change' }
            ]);
            break;
        }
        case 'resub': {
            elements = elements.concat([
                { name: 'display_username', type: 'checkbox', title: 'Display Username', default: true, onchange: 'HistoryList_Input_Change' },
                { name: 'display_tier', type: 'checkbox', title: 'Display Tier', default: true, onchange: 'HistoryList_Input_Change' },
                { name: 'display_months', type: 'checkbox', title: 'Display Months', default: true, onchange: 'HistoryList_Input_Change' }
            ]);
            break;
        }
        case 'giftsub': {
            elements = elements.concat([
                { name: 'display_target', type: 'checkbox', title: 'Display Target', default: true, onchange: 'HistoryList_Input_Change' }
            ]);
        }
        case 'sub': {
            elements = elements.concat([
                { name: 'display_username', type: 'checkbox', title: 'Display Username', default: true, onchange: 'HistoryList_Input_Change' },
                { name: 'display_tier', type: 'checkbox', title: 'Display Tier', default: true, onchange: 'HistoryList_Input_Change' }
            ]);
            break;
        }
        case 'giftbomb': {
            elements = elements.concat([
                { name: 'display_tier', type: 'checkbox', title: 'Display Tier', default: true, onchange: 'HistoryList_Input_Change' }
            ]);
        }
        case 'cheer':
        case 'host':
        case 'raid': {
            elements = elements.concat([
                { name: 'display_username', type: 'checkbox', title: 'Display Username', default: true, onchange: 'HistoryList_Input_Change' },
                { name: 'display_amount', type: 'checkbox', title: 'Display Amount', default: true, onchange: 'HistoryList_Input_Change' }
            ]);
            break;
        }
        case 'prediction':
        case 'poll': {
            elements = elements.concat([
                { name: 'display_title', type: 'checkbox', title: 'Display Title', default: true, onchange: 'HistoryList_Input_Change' },
                { name: 'display_winner', type: 'checkbox', title: 'Display Winning Answer', default: true, onchange: 'HistoryList_Input_Change' },
                { name: 'display_result', type: 'checkbox', title: 'Display Votes', default: true, onchange: 'HistoryList_Input_Change' }
            ]);
            break;
        }
        case 'channel_point_redemption': {
            let cpr_reward = [{ name: 'all', title: 'All Rewards' }];
            for (let reward of CPR_REWARDS) cpr_reward.push({ name: reward.id, title: reward.title });

            elements = elements.concat([
                {
                    name: 'display_time', title: 'Display Time', type: 'select', options: [
                        { name: 'added', title: 'Redemption was added' },
                        { name: 'update', title: 'Redemption was fullfilled' }
                    ], default: 'added'
                },
                { name: 'display_reward_icon', type: 'checkbox', title: 'Display Reward Icon', default: true, onchange: 'HistoryList_Input_Change' },
                { name: 'display_username', type: 'checkbox', title: 'Display Username', default: true, onchange: 'HistoryList_Input_Change' },
                { name: 'display_title', type: 'checkbox', title: 'Display Reward Title', default: true, onchange: 'HistoryList_Input_Change' },
                { name: 'allowed_rewards', title: 'Allowed Rewards', type: 'checkboxselect', options: cpr_reward, default: ['all'] }
            ]);
            break;
        }
        case 'hypetrain': {
            elements = elements.concat([
                { name: 'display_level', type: 'checkbox', title: 'Display Level', default: true, onchange: 'HistoryList_Input_Change' },
                { name: 'display_progress', type: 'checkbox', title: 'Display Progress', default: true, onchange: 'HistoryList_Input_Change' }
            ]);
            break;
        }
    }

    if (topic !== 'general') elements.push(
        { name: 'display_border', type: 'checkbox', title: 'Display Underline', default: true, onchange: 'HistoryList_Input_Change' },
        { name: 'border_width', type: 'number', title: 'Underline Width', default: 4, onchange: 'HistoryList_Input_Change' },
        { name: 'border_color', type: 'color', title: 'Underline Color', default: '#FFFFFF', onchange: 'HistoryList_Input_Change' }
    );

    //Create HTML
    let s = '';
    s += '<div class="HISTORY_LIST_SETTINGS_TOPIC" data-name="' + topic + '">';

    s += '<div class="HISTORY_LIST_TOPIC_HEADER">';
    s += '<center>' + topic + '</center>';
    if (topic !== 'general') s += '<img src="/images/icons/trash-alt-solid.svg" onclick="HistoryList_removeTopic(this)"/>';
    s += '</div>';

    s += '<div class="HISTORY_LIST_SETTINGS_TOPIC_SETTINGS">';
    for (let elt of elements) {
        s += HistoryList_createTopicSetting(elt, cfg[elt.name]);
    }
    s += '</div>';

    s += '</div>';

    return s;
}
function HistoryList_createTopicSetting(setting = {}, value = setting.default) {
    let s = '';

    if (setting.spacer === 'top') s += '<span></span><span></span>';

    s += '<span>';
    if (setting.arrow) s += '<arrow>&#x21B5;</arrow>';
    s += setting.title;
    s += '</span>';

    s += '<div>';

    if (setting.type === 'checkbox') {
        s += '<input type="checkbox" data-name="' + setting.name + '" ' + (value === true ? 'checked="true"' : '') + ' onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'switchbutton') {
        s += SWITCHBUTTON_CREATE(value, false, setting.onchange, undefined, 'data-name="' + setting.name + '"');
    }
    else if (setting.type === 'color') {
        s += '<input type="color" data-name="' + setting.name + '" value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'number') {
        s += '<input type="number" data-name="' + setting.name + '" min="0" step="1" ' + (setting.default !== undefined ? 'placeholder="' + setting.default + 'px"' : '') + ' value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'select') {
        s += '<select data-name="' + setting.name + '" value="' + value + '"  onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '">';
        for (let opt of setting.options) {
            if (typeof opt === 'string') {
                s += '<option ' + (value === opt ? 'selected' : '') + '>' + opt + '</option>';
            } else if (typeof opt === 'object') {
                s += '<option ' + (value === opt.name ? 'selected' : '') + ' value="' + opt.name + '">' + opt.title + '</option>';
            }
        }
        s += '</select>';
    }
    else if (setting.type === 'text') {
        s += '<input type="text" data-name="' + setting.name + '" value="' + value + '" onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '"/>';
    }
    else if (setting.type === 'custom') {
        s += '<div data-name="' + setting.name + '" >' + (setting.html || '') + '</div>';
    }
    else if (setting.type === 'file') {
        s += '<div data-type="file" data-name="' + setting.name + '" style="display: grid; grid-template-columns: auto 27px;">';

        s += '<span ';
        s += 'style="display: inline-block; ' + (value && !FILES.find(elt => elt === value) ? ' color: red;' : '') + '" ';
        s += 'title="' + (!value ? 'EMPTY' : value) + '" ';
        s += '>';
        s += (!value ? 'EMPTY' : value);
        s += '</span>';
        s += '<button onclick="openHistoryListFileDialog(event, this, ' + "'images', '" + value + "'" + ')">...</button>';

        s += '</div>';
    }
    else if (setting.type === 'slider') {
        s += '<div data-type="slider" data-name="' + setting.name + '" style="display: grid; grid-template-columns: auto 50px;">';

        s += '<input type="range" min="' + setting.min + '" value="' + value + '" max="' + setting.max + '" oninput="this.parentElement.childNodes[1].value = this.value; Overlay_Page_setSave(true);" />';
        s += '<input type="number" min="' + setting.min + '" value="' + value + '" max="' + setting.max + '" oninput="this.parentElement.childNodes[0].value = this.value; Overlay_Page_setSave(true);" />';

        s += '</div>';
    }
    else if (setting.type === 'checkboxselect') {
        s += '<div data-type="checkboxselect" data-name="' + setting.name + '">';

        s += '<center onclick="this.parentElement.classList.toggle(' + "'show'" + ')">Select </center>';

        s += '<div>';
        for (let option of setting.options || []) {
            s += '<span>' + option.title + '</span>';
            s += '<input type="checkbox" data-name="' + option.name + '" onchange="Overlay_Page_setSave(true); ' + (setting.onchange ? setting.onchange + '(this);' : '') + '" ' + (value.find(elt => elt === option.name) !== undefined ? 'checked="true"' : '') + ' />';
        }
        s += '</div>';

        s += '</div>';
    }
    else {
        s += '<span></span>';
    }

    s += '</div>';

    if (setting.spacer === 'bottom') s += '<span></span><span></span>';

    return s;
}
function HistoryList_Input_Change(x) {
    if (document.getElementById('HISTORY_LIST_PREVIEW_ALERT')) {
        //Create new Alert
        let alert = document.createElement('DIV');
        alert.innerHTML = HistoryList_createList('HISTORY_LIST_PREVIEW_ALERT', [], Overlay_Page_History_collectJSON());
        
        let new_style = FindSubElementFromPath(alert, ['#HISTORY_LIST_PREVIEW_ALERT', 'STYLE']).innerHTML;
        alert.remove();

        //Update Style
        let old_style = FindSubElementFromPath(document.getElementById('HISTORY_LIST_PREVIEW_ALERT'), ['STYLE']);
        old_style.innerHTML = new_style;
    }
    if(x !== false) HistoryList_adjustGrid(document.getElementById('HISTORY_LIST_PREVIEW_ALERT'));
    Overlay_Page_setSave(true);
}

function openHistoryListFileDialog(e, elt, type, value) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    let id = "";

    do {
        id = 'HISTORY_LIST_FILEBROWSER_DIALOG_REFEREMCE_' + GenerateRandomBytes(30);
    } while (document.getElementById(id));

    elt.id = id;

    let div = document.createElement('DIV');
    div.id = 'HISTORY_LIST_FILEBROWSER_DIALOG';
    div.dataset.reference = id;

    let s = '';
    s += '<center>Select Icon File</center>';
    s += MISC_createFileLibrary(FILES, '/alerts/custom/', 'History List Icons', type, value, '', '', '/api/Alerts/files', 'HistoryListFileRemoveDialog');

    div.innerHTML = s;
    document.getElementById('grid').appendChild(div);
    disableContent('HistoryListFileRemoveDialog', true);
}
function HistoryListFileRemoveDialog(selected) {
    if (selected) {
        //Find DIalog
        let dialog = document.getElementById('HISTORY_LIST_FILEBROWSER_DIALOG');

        //Find Wrapper
        let btn = document.getElementById(dialog.dataset.reference);
        let wrapper = FindHTMLParent(btn, (p) => p.tagName === 'DIV');

        for (let elt of wrapper.childNodes) {
            if (elt instanceof Element && elt.tagName === 'SPAN') {
                //Update Input
                elt.innerHTML = selected === elt.innerHTML ? 'EMPTY' : selected;
                elt.title = elt.innerHTML;
                elt.style.color = elt.innerHTML !== 'EMPTY' && !FILES.find(elt => elt === selected) ? 'red' : '';
            } else if (elt instanceof Element && elt.tagName === 'BUTTON') {
                //Update Button
                elt.setAttribute('onclick', 'openHistoryListFileDialog(event, this, ' + "'images', '" + selected + "'" + ')');
            }
        }

        enableContent();
        Overlay_Page_setSave(true);
        HistoryList_Input_Change();
        return;
    }

    //Remove Dialog
    document.getElementById('HISTORY_LIST_FILEBROWSER_DIALOG').remove();
}

//Test Alerts
function Test_Alert(type, data) {
    if (!data) {

        let tier = 'Unknown';
        switch (Math.floor(Math.random() * 4)) {
            case 0: tier = 'Tier 1'; break;
            case 1: tier = 'Tier 2'; break;
            case 2: tier = 'Tier 3'; break;
            case 3: tier = 'Twitch Prime'; break;
        }

        data = {
            username: LOGIN_getUsername() || 'Text User',
            amount: Math.floor(Math.random() * 100) + 1,
            months: Math.floor(Math.random() * 100) + 1,
            tier,
            target: 'Target'
        };
    }

    let opts = getAuthHeader();
    opts.method = 'POST';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(data);

    //Save
    fetch('/api/alerts/trigger/' + type, opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo('Test Alert send!');
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message);
        });
}
function CustomTestOpenImportDialog(e) {
    //show + blur
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    let div = document.createElement('DIV');
    div.id = 'CUSTOM_TEST_DIALOG';
    div.innerHTML = CustomTriggerSetup('join', false);
    document.getElementById('grid').appendChild(div);
    disableContent('CustomTestremoveImportDialogHTML', true);
    OUTPUT_create();
}
function CustomTriggerSetup(type = 'join', update = true) {
    let s = '<output id="TEST_DIALOG_OUTPUT"></output>';
    s += "<center>Custom Event Trigger</center>";

    s += '<select data-name="topic" onchange="CustomTriggerSetup(this.value)">';
    for (let alert of ALERTS) s += '<option ' + (alert === type ? 'selected' : '') + '>' + alert + '</option>';
    if (ALERTS.length === 0) s += '<option disabled>NO ALERTS AVAILABLE</option>';
    s += '</select>';

    //Alert Settings
    for (let variable of ALERT_VARIABLES[type] || []) {
        if (variable.name === 'tier') {
            s += '<select data-name="tier">';
            for (let tier of ['Tier 1', 'Tier 2', 'Tier 3', 'Twitch Prime']) s += '<option>' + tier + '</option>';
            s += '</select>';
            continue;
        }

        switch (variable.type) {
            case 'string':
                s += '<input data-name="' + variable.name + '"  type="text" placeholder="' + variable.name + '" ' + (variable.desc ? 'title="' + variable.desc + '"' : '') + '/>';
                break;
            case 'number':
                s += '<input data-name="' + variable.name + '"  type="number" placeholder="' + variable.name + '" ' + (variable.desc ? 'title="' + variable.desc + '"' : '') + '/>';
                break;
        }
    }

    s += '<div data-name="history" style="display: grid; grid-template-columns: auto 25px;"><input type="datetime-local" value="' + GetLocalISODate() + '" disabled /><input type="checkbox" title="Save to History" onchange="this.parentElement.childNodes[0].disabled = !this.parentElement.childNodes[0].disabled" /></div>';

    s += '<button onclick="CustomTriggerSend()">TRIGGER</button>';

    if (update) {
        document.getElementById('CUSTOM_TEST_DIALOG').innerHTML = s;
        OUTPUT_create();
    }
    return s;
}
function CustomTestremoveImportDialogHTML() {
    document.getElementById('CUSTOM_TEST_DIALOG').remove();
}
function CustomTriggerSend() {
    const event = {};

    for (let elt of document.getElementById('CUSTOM_TEST_DIALOG').childNodes) {
        if (elt.dataset.name === 'history') {
            if (elt.childNodes[1].checked) {
                event.add_history = true;
                event.time = new Date(elt.childNodes[0].value).getTime();
            }
        }
        else if (elt.dataset.name) {
            if (elt.type === 'number') event[elt.dataset.name] = parseInt(elt.value);
            else event[elt.dataset.name] = elt.value;
        }
    }

    //DEV
    if (DEV_CUSTOM_TRIGGER_CHAT_OUTPUT === true) {
        event.use_chat_output = true;
    }

    const opt = getAuthHeader();
    opt.method = 'POST';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(event);

    fetch('/api/alerts/trigger/' + event.topic, opt)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo("Custom Trigger Sent!", document.getElementById('TEST_DIALOG_OUTPUT'));
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err, document.getElementById('TEST_DIALOG_OUTPUT'));
        });
}
function SkipAlert(token, mode = 'skip') {
    const opt = getAuthHeader();
    opt.method = 'POST';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify({ token, mode });
    
    fetch('/api/alerts/skip', opt)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo("Alert Skipped!");
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err);
        });
}

const EVENT_TEST_DATA = {
    poll: () => {
        return {
            choices: [
                { id: 11, title: 'Choice 1', votes: 100 },
                { id: 22, title: 'Choice 2', votes: 200 },
                { id: 33, title: 'Choice 3', votes: 300 },
                { id: 44, title: 'Choice 4', votes: 400 },
                { id: 55, title: 'Choice 5', votes: 500 }
            ],
            started_at: GetLocalISODate(),
            ends_at: GetLocalISODate(new Date(Date.now() + 1000 * 60))
        }
    },
    prediction: () => {
        return {
            outcomes: [
                { id: 11, title: 'Outcome 1', channel_points: 100 },
                { id: 22, title: 'Outcome 2', channel_points: 200 },
                { id: 33, title: 'Outcome 3', channel_points: 300 },
                { id: 44, title: 'Outcome 4', channel_points: 400 },
                { id: 55, title: 'Outcome 5', channel_points: 500 },
                { id: 66, title: 'Outcome 6', channel_points: 600 },
                { id: 77, title: 'Outcome 7', channel_points: 700 },
                { id: 88, title: 'Outcome 8', channel_points: 800 },
                { id: 99, title: 'Outcome 9', channel_points: 900 },
                { id: 1010, title: 'Outcome 10', channel_points: 1000 }
            ],
            started_at: GetLocalISODate(),
            locks_at: GetLocalISODate(new Date(Date.now() + 1000 * 60))
        }
    },
    channel_point_redemption: () => {
        return {
            user_id: "[ID]",
            user_login: "[Username]",
            reward: {
                id: GenerateRandomBytes(8),
                title: "Test Redemption",
                prompt: "Test Redemption Description"
            },
            redeemed_at: GetLocalISODate()
        }
    },
    hypetrain: () => {
        return {
            total: 137,
            progress: 137,
            goal: 500,
            level: 2,
            subs: 10,
            bits: 5,
            started_at: GetLocalISODate(),
            expires_at: GetLocalISODate(new Date(Date.now() + 1000 * 60))
        }
    }
};
function Test_Event(event) {
    let data = null;

    let end = false;
    if (event.split('-').length > 1) {
        end = true;
        event = event.split('-').pop();
    }

    if (event === 'poll') {
        data = EVENT_TEST_DATA['poll']();
    } else if (event === 'prediction') {
        data = EVENT_TEST_DATA['prediction']();
    } else if (event === 'channel_point_redemption') {
        data = EVENT_TEST_DATA['channel_point_redemption']();
    } else if (event === 'hypetrain') {
        data = EVENT_TEST_DATA['hypetrain']();
    }
    if (end) {
        if (event === 'poll') data.status = 'completed';
        if (event === 'prediction') data.status = 'resolved';
        if (event === 'channel_point_redemption') data.status = 'fulfilled';
        data.ended_at = GetLocalISODate();
        if (data.outcomes) data.winning_outcome_id = data.outcomes[Math.floor(Math.random() * data.outcomes.length)].id;
        delete data.locks_at;
        delete data.ends_at;
        delete data.expires_at;
    }
    data.id = 'TEST';

    if (EVENT_CHATOUTPUT === true) data.use_chat_output = true;

    const opt = getAuthHeader();
    opt.method = 'POST';
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(data);

    fetch('/api/alerts/trigger/' + event, opt)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo("Event Trigger Sent!", document.getElementById('TEST_DIALOG_OUTPUT'));
        })
        .catch(err => {
            OUTPUT_showError(err.message);
            console.log(err, document.getElementById('TEST_DIALOG_OUTPUT'));
        });
}

/* Profiles */
function expandProfiles(elt, e) {
    if (e.target.tagName === 'INPUT') return;
    elt.parentElement.classList.toggle('expand');
}
async function selectProfile(elt, e) {
    e.stopPropagation();

    //Await Confirmation
    let answer = document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').hasAttribute('disabled') ? 'IGNORE' : 'CANCEL';

    try {
        if (answer !== 'IGNORE') answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Duplicating this Profile now will reset all unsaved Changes! Be sure to save, if you want to keep these changes!", ['IGNORE', 'CANCEL']);
    } catch (err) {

    }

    if (answer !== 'IGNORE') return Promise.resolve();

    elt.parentElement.classList.remove('expand');
    if (e.target.hasAttribute('new')) {
        newProfile({});
        return;
    } else if (e.target.hasAttribute('import')) {
        ProfileOpenImportDialog();
        return;
    }

    let profile = PROFILES.find(elt => elt.name === e.target.innerHTML);
    if (!profile) return;

    elt.parentElement.childNodes[1].innerHTML = '<input type="text" data-default="' + e.target.innerHTML + '" value="' + e.target.innerHTML + '" oninput="OverlaySettings_SetSaveState(true)" />';
    createOverlaySetting(profile);
    document.getElementById('ALERT_OVERLAYS_WRAPPER').style.display = "grid";
    document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').dataset.new = false;
    OverlaySettings_SetSaveState(false);
    OverlaySettingSwitchTab();
}
function newProfile(preloaded = {}, name = "New Profile") {
    while (PROFILES.find(elt => elt.name === name)) {
        let idx = name.split(" ").pop();
        if (isNaN(idx)) name += " 1";
        else name = name.split(" ").pop().join(' ') + " " + (parseInt(idx) + 1);
    }

    document.getElementById('ALERT_OVERLAYS_PROFILES_SELECT').childNodes[1].innerHTML = '<input type="text" data-default="' + name  + '" value="' + name + '" oninput="OverlaySettings_SetSaveState(true)"/>';;
    createOverlaySetting(preloaded);
    document.getElementById('ALERT_OVERLAYS_WRAPPER').style.display = "grid";
    OverlaySettings_SetSaveState(true);
    document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').dataset.new = true;
    OverlaySettingSwitchTab();
}
function OverlaySettings_ImportProfile(cfg, profile_name) {
    //Check Json (just show error)
    let error = OverlaySettings_checkJSON(cfg);
    if (error !== true) {
        OUTPUT_showError('Error: ' + error);
    }

    //Display Settings
    newProfile(cfg, profile_name);
}
function ProfileOpenImportDialog() {
    let div = document.createElement('DIV');
    div.id = 'PROFILE_IMPORT_DIALOG';
    div.innerHTML = '<center>Copy Profile Settings here</center><textarea oninput="ProfileImportDialogInput(this)"></textarea>';
    document.getElementById('grid').appendChild(div);
    disableContent('ProfileremoveImportDialogHTML', true);
}
function ProfileremoveImportDialogHTML() {
    document.getElementById('PROFILE_IMPORT_DIALOG').remove();
}
function ProfileImportDialogInput(elt) {
    //Convert String to JSON
    try {
        let cfg = JSON.parse(elt.value);
        OverlaySettings_ImportProfile(cfg);
        enableContent();
    } catch (err) {
        console.log(err);
        OUTPUT_showError('Error: Import Settings Corrupted! Try copying again!');
        return;
    }
}
function updateProfilePool(profiles = []) {
    let s = '';
    s += "<div new>Add new Profile</div>";
    s += "<div import>Import Profile</div>";
    for (let profile of profiles) s += '<div title="' + profile.name + '">' + profile.name + '</div>';
    document.getElementById('ALERT_OVERLAYS_PROFILES_POOL').innerHTML = s;
}

function createOverlaySetting(preloaded = {}, type = "") {
    document.getElementById('ALERT_OVERLAYS_SETTING_LAYOUT').innerHTML = createOverlaySettingHTML_Layout(preloaded, type);
    document.getElementById('ALERT_OVERLAYS_SETTING_TEXT').innerHTML = createOverlaySettingHTML_Text(preloaded, type);
    document.getElementById('ALERT_OVERLAYS_SETTING_MESSAGE').innerHTML = createOverlaySettingHTML_Message(preloaded, type);
    document.getElementById('ALERT_OVERLAYS_SETTING_IMAGE').innerHTML = createOverlaySettingHTML_Image(preloaded, type);
    document.getElementById('ALERT_OVERLAYS_SETTING_SOUND').innerHTML = createOverlaySettingHTML_Sound(preloaded, type);
    document.getElementById('ALERT_OVERLAYS_SETTING_EXTRAS').innerHTML = createOverlaySettingHTML_Extras(preloaded, type);
    SWITCHBUTTON_AUTOFILL();
    setTimeout(OverlaySettingsWidthCheck, 1000);
}
function createOverlaySettingHTML_Layout(preloaded = {}, type = "") {
    //Settings
    let in_index = 0;
    TRIGGER_EFFECTS.find((elt, idx) => {
        if (elt === (preloaded.move_in || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'move_in').default)) {
            in_index = idx;
            return true;
        }
        return false;
    });
    let out_index = 0;
    TRIGGER_EFFECTS.find((elt, idx) => {
        if (elt === (preloaded.move_out || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'move_out').default)) {
            out_index = idx;
            return true;
        }
        return false;
    });

    let s = '';

    //Layout Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_LAYOUT_UPPER_WRAPPER">';
    for (let i = 1; i < 8; i++) {
        s += '<img src="/Alerts/images/layout_' + i + '.png" ' + (preloaded.layout === i || (isNaN(preloaded.layout) && i == DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'layout').default) ? 'selected' : '') + ' data-index="' + i + '" class="ALERT_OVERLAYS_SETTING_LAYOUT_OPTION" onclick="Layout_click(this)"/>';
    }
    s += '</div>';

    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_LAYOUT_LOWER_WRAPPER">';

    s += '<div>';
    s += '<div>Move In Effect: ' + MISC_SELECT_create(TRIGGER_EFFECTS, in_index, 'ALERT_OVERLAY_SETTING_LAYOUT_MOVE_IN', 'Layout_Move_Change(this);', 'ALERT_OV_SELECT') + '</div>';
    s += '<div>Move Out Effect: ' + MISC_SELECT_create(TRIGGER_EFFECTS, out_index, 'ALERT_OVERLAY_SETTING_LAYOUT_MOVE_OUT', 'Layout_Move_Change(this);', 'ALERT_OV_SELECT') + '</div>';
    s += '</div>';
    
    s += '</div>';

    s += '</div>';

    return s;
}
function createOverlaySettingHTML_Text(preloaded = {}, type = "") {
    //Settings
    let text_font_index = 0;
    FONTS_LIST.find((elt, idx) => {
        if (elt === (preloaded.text_font || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_font').default)) {
            text_font_index = idx;
            return true;
        }
        return false;
    });
    let var_font_index = 0;
    FONTS_LIST.find((elt, idx) => {
        if (elt === (preloaded.var_font || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'vari_font').default)) {
            var_font_index = idx;
            return true;
        }
        return false;
    });

    let s = '';
    
    //Text Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_TEXT_UPPER_WRAPPER ALERT_OVERLAYS_SPLIT">';
    //Left
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div>Text Settings</div>';
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';
    
    s += '<div>';
    s += '<div><div>Font</div> <div>' + MISC_SELECT_create(FONTS_LIST, text_font_index, 'ALERT_OVERLAY_SETTING_TEXT_FONT', 'Text_Input_change();', 'ALERT_OV_SELECT') + '</div></div>';
    let t_s = DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_size');
    s += '<div><div>Size</div> <div><input id="ALERT_OVERLAY_SETTING_TEXT_SIZE" type="number" min="' + (t_s.min || 0) + '" max="' + (t_s.max || 100) + '" value="' + (preloaded.text_size || t_s.default) + '" oninput="Text_Input_change();" /><span>%</span></div></div>';
    s += '<div><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_TEXT_COLOR" type="color" value="' + (preloaded.text_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_color').default) + '" oninput="Text_Input_change();"/></div></div>';
    s += '<div><div>Bold</div> <div>' + SWITCHBUTTON_CREATE((preloaded.text_bold !== undefined ? preloaded.text_bold : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_bold').default) === true , false, 'Text_Input_change();', 'ALERT_OVERLAY_SETTING_TEXT_BOLD') + '</div></div>';
    s += '</div>';

    s += '<div>';
    s += '<div><div>Shadow</div> <div>' + SWITCHBUTTON_CREATE((preloaded.text_shadow !== undefined ? preloaded.text_shadow : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_shadow').default) === true, false, 'Text_Input_change();', 'ALERT_OVERLAY_SETTING_TEXT_SHADOW') + '</div></div>';
    s += '<div indented><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_TEXT_SHADOW_COLOR" type="color" value="' + (preloaded.text_shadow_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_shadow_color').default) + '" oninput="Text_Input_change();" /></div></div>';
    s += '<div><div>TTS</div> <div>' + SWITCHBUTTON_CREATE((preloaded.text_tts === undefined ? DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'text_tts').default : preloaded.text_tts ) === true, false, 'Text_Input_change();', 'ALERT_OVERLAY_SETTING_TEXT_TTS') + '</div></div>';
    s += '</div>';

    s += '</div>';
    s += '</div>';

    //Right
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div>Variable Settings</div>';

    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';

    s += '<div>';
    s += '<div><div>Font</div> <div>' + MISC_SELECT_create(FONTS_LIST, var_font_index, 'ALERT_OVERLAY_SETTING_VARI_FONT', 'Text_Input_change();', 'ALERT_OV_SELECT') + '</div></div>';
    s += '<div><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_VARI_COLOR" type="color" value="' + (preloaded.vari_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'vari_color').default) + '" oninput="Text_Input_change();"/></div></div>';
    s += '<div><div>Bold</div> <div>' + SWITCHBUTTON_CREATE((preloaded.vari_bold !== undefined ? preloaded.vari_bold : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'vari_bold').default) === true, false, 'Text_Input_change();', 'ALERT_OVERLAY_SETTING_VARI_BOLD') + '</div></div>';
    s += '<div><div>Shadow</div> <div>' + SWITCHBUTTON_CREATE((preloaded.vari_shadow !== undefined ? preloaded.vari_shadow : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'vari_shadow').default) === true, false, 'Text_Input_change();', 'ALERT_OVERLAY_SETTING_VARI_SHADOW') + '</div></div>';
    s += '<div indented><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_VARI_SHADOW_COLOR" type="color" value="' + (preloaded.vari_shadow_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'vari_shadow_color').default) + '" oninput="Text_Input_change();" /></div></div>';
    s += '</div>';

    s += '</div>';

    s += '</div>';
    
    s += '</div>';

    //Middle Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_TEXT_MIDDLE_WRAPPER">';
    if (type) {
        s += '<div>Available Text Variables</div>';
        s += '<div>';
        for (let vari of ALERT_VARIABLES[type.toLocaleLowerCase()]) if(vari.name !== 'message') s += '<div title="' + vari.desc + ' (' + vari.type + ')">{' + vari.name + '}</div>';
        s += '</div>';
    }
    s += '</div>';

    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_TEXT_LOWER_WRAPPER">';
    s += '</div>';

    s += '</div>';

    return s;
}
function createOverlaySettingHTML_Message(preloaded = {}, type = "") {
    //Settings
    let message_font_index = 0;
    FONTS_LIST.find((elt, idx) => {
        if (elt === (preloaded.message_font || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_font').default)) {
            message_font_index = idx;
            return true;
        }
        return false;
    });

    let s = '';

    //Text Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_MESSAGE_UPPER_WRAPPER ALERT_OVERLAYS_SPLIT">';
    //Left
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div>Layout</div>';
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';

    s += '<div>';
    for (let i = 1; i < 3; i++) {
        s += '<img src="/Alerts/images/message_layout_' + i + '.png" ' + (preloaded.message_layout === i ? 'selected' : '') + ' data-index="' + i + '" class="ALERT_OVERLAYS_SETTING_MESSAGE_LAYOUT_OPTION" onclick="Message_Layout_click(this)"/>';
    }
    s += '</div>';
    
    s += '</div>';
    s += '</div>';

    //Right
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div>Message Settings</div>';

    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';

    s += '<div>';
    s += '<div><div>Font</div> <div>' + MISC_SELECT_create(FONTS_LIST, message_font_index, 'ALERT_OVERLAY_SETTING_MESSAGE_FONT', 'Message_Input_change();', 'ALERT_OV_SELECT') + '</div></div>';
    let m_s = DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_size');
    s += '<div><div>Size</div> <div><input id="ALERT_OVERLAY_SETTING_MESSAGE_SIZE" type="number" min="' + (m_s.min || 0) + '" max="' + (m_s.max || 100) + '" value="' + (preloaded.message_size || m_s.default) + '" oninput="Message_Input_change();" /><span>%</span></div></div>';
    s += '<div><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_MESSAGE_COLOR" type="color" value="' + (preloaded.message_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_color').default) + '" oninput="Message_Input_change();"/></div></div>';
    s += '<div><div>Bold</div> <div>' + SWITCHBUTTON_CREATE((preloaded.message_bold !== undefined ? preloaded.message_bold : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_bold').default) === true, false, 'Message_Input_change();', 'ALERT_OVERLAY_SETTING_MESSAGE_BOLD') + '</div></div>';
    s += '</div>';
    
    s += '<div>';
    s += '<div><div>Shadow</div> <div>' + SWITCHBUTTON_CREATE((preloaded.message_shadow !== undefined ? preloaded.message_shadow : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_shadow').default) === true, false, 'Message_Input_change();', 'ALERT_OVERLAY_SETTING_MESSAGE_SHADOW') + '</div></div>';
    s += '<div indented><div>Color</div> <div><input id="ALERT_OVERLAY_SETTING_MESSAGE_SHADOW_COLOR" type="color" value="' + (preloaded.message_shadow_color || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_shadow_color').default) + '" oninput="Message_Input_change();" /></div></div>';
    s += '<div><div>Show Emotes</div> <div>' + SWITCHBUTTON_CREATE((preloaded.message_show_emotes !== undefined ? preloaded.message_show_emotes : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_show_emotes').default) === true, false, 'Message_Input_change();', 'ALERT_OVERLAY_SETTING_MESSAGE_SHOW_EMOTES') + '</div></div>';
    s += '<div><div>TTS</div> <div>' + SWITCHBUTTON_CREATE((preloaded.message_tts !== undefined ? preloaded.message_tts : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_tts').default) === true, false, 'Message_Input_change();', 'ALERT_OVERLAY_SETTING_MESSAGE_TTS') + '</div></div>';
    s += '<div><div>Skip Emotes</div> <div>' + SWITCHBUTTON_CREATE((preloaded.message_tts_skip_emotes !== undefined ? preloaded.message_tts_skip_emotes : DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'message_tts_skip_emotes').default) === true, false, 'Message_Input_change();', 'ALERT_OVERLAY_SETTING_MESSAGE_TTS_EMOTES') + '</div></div>';
    s += '</div>';
    
    s += '</div>';

    s += '</div>';

    s += '</div>';
    
    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_MESSAGE_LOWER_WRAPPER">';
    s += '</div>';
    s += '</div>';

    return s;
}
function createOverlaySettingHTML_Image(preloaded = {}, type = "") {
    let s = '';

    //Layout Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_IMAGE_UPPER_WRAPPER">';
    s += MISC_createFileLibrary(FILES, '/Alerts/Custom/', 'All Image/Video Files', 'images', preloaded.image, null, 'id="ALERT_OVERLAY_SETTING_IMAGE"', '/api/Alerts/files', 'Image_change', UPLOAD_LIMIT);
    s += '</div>';

    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_IMAGE_LOWER_WRAPPER">';

    s += '<div>';
    let v = DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'video_volume');
    s += '<div>Volume: <input id="ALERT_OVERLAY_SETTING_VIDEO_VOLUME" type="range" min="' + (v.min || 0) + '" value="' + (preloaded.video_volume || v.default) + '" max="' + (v.max || 100) + '" oninput="Image_Slider_Change(this)" /> <input type="number" min="' + (v.min || 0) + '" value="' + (preloaded.video_volume || v.default) + '" max="' + (v.max || 100) + '" oninput="Image_Input_Change(this)" /></div>';
    s += '</div>';
    
    s += '</div>';

    s += '</div>';

    return s;
}
function createOverlaySettingHTML_Sound(preloaded = {}, type = "") {
    let s = '';

    //Layout Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_SOUND_UPPER_WRAPPER">';
    s += MISC_createFileLibrary(FILES, '/Alerts/Custom/', 'All Sound/Music Files', 'sounds', preloaded.sound, null, 'id="ALERT_OVERLAY_SETTING_SOUND"', '/api/Alerts/files', 'Sound_change', UPLOAD_LIMIT);
    s += '</div>';

    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_SOUND_LOWER_WRAPPER">';

    s += '<div>';
    let v = DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'sound_volume');
    s += '<div>Volume: <input id="ALERT_OVERLAY_SETTING_SOUND_VOLUME" type="range" min="' + (v.min || 0) + '" value="' + (preloaded.sound_volume || v.default) + '" max="' + (v.max || 100) + '" oninput="Sound_Slider_Change(this)" /> <input type="number" min="' + (v.min || 0) + '" value="' + (preloaded.sound_volume || v.default) + '" max="' + (v.max || 100) + '" oninput="Sound_Input_Change(this)" /></div>';
    s += '</div>';
    
    s += '</div>';

    s += '</div>';

    return s;
}
function createOverlaySettingHTML_Extras(preloaded = {}, type = "") {
    let s = '';

    //Layout Wrapper
    s += '<div>';

    //Upper Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_EXTRAS_UPPER_WRAPPER ALERT_OVERLAYS_SPLIT">';
    //Left
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div style="width: 0; height: 0;"></div>';
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';

    s += '<div>';
    s += '<div>Custom CSS</div>';
    s += '<textarea id="ALERT_OVERLAY_SETTING_CSS" oninput="Extras_Input_change();">' + (preloaded.css || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'css').default) + '</textarea>';
    s += '</div>';

    s += '<div>';
    s += '<div>Custom Javascript</div>';
    s += '<textarea id="ALERT_OVERLAY_SETTING_JS" oninput="Extras_Input_change();">' + (preloaded.js || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'js').default) + '</textarea>';
    s += '</div>';

    s += '</div>';
    s += '</div>';

    //Right
    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE">';
    s += '<div>Settings</div>';

    s += '<div class="ALERT_OVERLAYS_SPLIT_SIDE_CONTENT">';

    s += '<div>';
    s += '<div><div>Delay</div> <div><span><input id="ALERT_OVERLAY_SETTING_DELAY" type="number" value="' + (preloaded.delay || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'delay').default) + '" oninput="Extras_Input_change();" min="0" />s</span></div></div>';
    s += '<div><div>On Time</div> <div><span><input id="ALERT_OVERLAY_SETTING_ON_TIME" type="number" value="' + (preloaded.on_time || DEFAULT_ALERT_SETTINGS.find(elt => elt.name === 'on_time').default) + '" oninput="Extras_Input_change();" min="0" />s</span></div></div>';
    s += '</div>';
    
    s += '</div>';

    s += '</div>';

    s += '</div>';

    //Lower Wrapper
    s += '<div class="ALERT_OVERLAYS_SETTING_EXTRAS_LOWER_WRAPPER">';
    s += '</div>';

    s += '</div>';

    return s;
}

function OverlaySettingSwitchHeader(e) {
    let target = e.target;
    if (target.tagName !== 'DIV') target = target.parentElement;
    OverlaySettingSwitchTab(target.dataset.name);
    OverlaySettingsWidthCheck();
}
function OverlaySettingSwitchTab(header_letter = "l") {
    let elt;

    for (let child of document.getElementById('ALERT_OVERLAYS_SETTINGS').childNodes) if (child instanceof Element) child.style.display = 'none';
    for (let child of document.getElementById('ALERT_OVERLAYS_HEADER').childNodes) {
        if (child instanceof Element && child.dataset.name !== header_letter) child.removeAttribute('highlighted');
        else if (child instanceof Element) child.setAttribute('highlighted', 'true');
    }

    switch (header_letter) {
        case 'l': elt = document.getElementById('ALERT_OVERLAYS_SETTING_LAYOUT'); break;
        case 't': elt = document.getElementById('ALERT_OVERLAYS_SETTING_TEXT'); break;
        case 'm': elt = document.getElementById('ALERT_OVERLAYS_SETTING_MESSAGE'); break;
        case 'i': elt = document.getElementById('ALERT_OVERLAYS_SETTING_IMAGE'); break;
        case 's': elt = document.getElementById('ALERT_OVERLAYS_SETTING_SOUND'); break;
        case 'e': elt = document.getElementById('ALERT_OVERLAYS_SETTING_EXTRAS'); break;
    }

    if (elt) elt.style.display = 'block';
}
let update_allready_in_progress = false;
function OverlaySettingsWidthCheck(once = true) {
    if (update_allready_in_progress) return;
    update_allready_in_progress = true;
    
    const elts = ['ALERT_OVERLAYS_SETTING_TEXT', 'ALERT_OVERLAYS_SETTING_MESSAGE'];
    for (let elem of elts) {
        let elt = document.getElementById(elem);

        if (elt.clientWidth < 700) elt.classList.add('snug');
        else elt.classList.remove('snug');

        if (elt.clientWidth < 630) elt.classList.add('snuggest');
        else elt.classList.remove('snuggest');
    }

    for (let elt of document.getElementsByClassName('ALERT_OV_SELECT')) {
        MISC_SELECT_WidthCheck(elt);
    }

    setTimeout(() => {
        update_allready_in_progress = false;
        if (once) OverlaySettingsWidthCheck(false);
    }, 100);
}

function OverlaySettings_SaveProfile() {
    OUTPUT_hideError(document.getElementById('PROFILES_OUTPUT'));
    let name_input = document.getElementById('ALERT_OVERLAYS_PROFILES_SELECT').childNodes[1].childNodes[0];
    
    let cfg = OverlaySettings_collectJSON(alert);
    OverlaySettings_SetSaveState(false);

    //Check Errors
    let error = OverlaySettings_checkJSON(cfg);
    if (error !== true) {
        OUTPUT_showError('Error: ' + error);
        return;
    }

    let opts = getAuthHeader();

    if (document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').dataset.new === 'true') {
        opts.method = 'POST';
        opts.body = JSON.stringify({ name: name_input.value, cfg });
    } else {
        opts.method = 'PUT';

        if (name_input.dataset.default === name_input.value) opts.body = JSON.stringify({ name: name_input.dataset.default, cfg });
        else opts.body = JSON.stringify({ name: name_input.dataset.default, cfg, rename: name_input.value });
    }
    
    opts.headers['Content-Type'] = 'application/json';
    
    //Save
    fetch('/api/alerts/profiles', opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            if (json.err) return Promise.reject(new Error(json.err));
            OUTPUT_showInfo('Profile Changed!', document.getElementById('PROFILES_OUTPUT'));

            let idx = -1;
            PROFILES.find((elt, index) => {
                if (elt.name === name_input.dataset.default) {
                    idx = index;
                    return true;
                }
                return false;
            });
            if (idx >= 0) PROFILES.splice(idx, 1);
            
            PROFILES.push(json);

            updateProfilePool(PROFILES);
            updateAlertsPools();
            document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').dataset.new = 'false';
        })
        .catch(err => {
            OverlaySettings_SetSaveState(true);
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('PROFILES_OUTPUT'));
        });
}
async function OverlaySettings_RemoveProfile(profile_name) {
    OUTPUT_hideError(document.getElementById('PROFILES_OUTPUT'));
    if (!profile_name) profile_name = document.getElementById('ALERT_OVERLAYS_PROFILES_SELECT').childNodes[1].childNodes[0].value;
    if (!profile_name) return;

    //Stop Default
    if (profile_name === 'default') {
        OUTPUT_showError('Default Profile cant be deleted!');
        return;
    }

    //Await Confirmation
    let answer = 'NO';

    try {
        let uses = [];
        for (let ov of OVERLAYS) {
            if (ov.type !== 'alerts') continue;
            
            for (let alert in ov.settings) {
                for (let prof of ov.settings[alert].profiles) {
                    if (prof.name === profile_name) uses.push(ov.name);
                }
            }
        }

        answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Do you really want to delete this Profile? It is currently " + (uses.length === 0 ? 'UNUSED' : 'by these Overlays: ' + uses.join(', ') + '!'));
    } catch (err) {
        console.log(err);
    }

    if (answer !== 'YES') return Promise.resolve();
    
    let opts = getAuthHeader();
    opts.method = 'DELETE';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify({ name: profile_name });

    //Save
    fetch('/api/alerts/profiles', opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo('Profile Removed!', document.getElementById('PROFILES_OUTPUT'));

            let idx = -1;
            PROFILES.find((elt, index) => {
                if (elt.name === profile_name) {
                    idx = index;
                    return true;
                }
                return false;
            });
            
            if (idx >= 0) PROFILES.splice(idx, 1);
            document.getElementById('ALERT_OVERLAYS_PROFILES_SELECT').childNodes[1].innerHTML = 'Select Profile';
            document.getElementById('ALERT_OVERLAYS_WRAPPER').style.display = 'none';
            updateProfilePool(PROFILES);
            updateAlertsPools();
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('PROFILES_OUTPUT'));
        });
}
async function OverlaySettings_DuplicateProfile(profile_name) {
    //Await Confirmation
    let answer = document.getElementById('ALERT_OVERLAY_SAVE_BUTTON').hasAttribute('disabled') ? 'IGNORE' : 'CANCEL';

    try {
        if (answer !== 'IGNORE') answer = await MISC_USERCONFIRM("YOU SURE YOU WANT THIS?", "Duplicating this Profile now will reset all unsaved Changes! Be sure to save, if you want to keep these changes!", ['IGNORE', 'CANCEL']);
    } catch (err) {

    }

    if (answer !== 'IGNORE') return Promise.resolve();
    
    let name_input = document.getElementById('ALERT_OVERLAYS_PROFILES_SELECT').childNodes[1].childNodes[0];
    
    if (!profile_name) profile_name = name_input.dataset.default;
    if (!profile_name) return;
    
    let cfg = OverlaySettings_collectJSON(alert);
    newProfile(cfg, profile_name);
}
async function OverlaySettings_ExportProfile() {
    let cfg = OverlaySettings_collectJSON();

    //Check Errors
    let error = OverlaySettings_checkJSON(cfg);
    if (error !== true) {
        OUTPUT_showError('Error: ' + error);
        return;
    }

    OUTPUT_showInfo('Copied Profile Settings to Clipboard!');
    copyToClipboard(JSON.stringify(cfg));
}

function OverlaySettings_collectJSON() {
    //Layout
    let layout = 1;
    for (let elt of document.getElementsByClassName('ALERT_OVERLAYS_SETTING_LAYOUT_OPTION')) {
        if (elt instanceof Element && elt.hasAttribute('selected')) layout = parseInt(elt.dataset.index);
    }
    let move_in = MISC_SELECT_GetValue(document.getElementById('ALERT_OVERLAY_SETTING_LAYOUT_MOVE_IN'));
    let move_out = MISC_SELECT_GetValue(document.getElementById('ALERT_OVERLAY_SETTING_LAYOUT_MOVE_OUT'));

    //Text
    let text_font = MISC_SELECT_GetValue(document.getElementById('ALERT_OVERLAY_SETTING_TEXT_FONT'));
    let text_size = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_TEXT_SIZE').value);
    let text_color = document.getElementById('ALERT_OVERLAY_SETTING_TEXT_COLOR').value;
    let text_bold = document.getElementById('ALERT_OVERLAY_SETTING_TEXT_BOLD').value;
    let text_shadow = document.getElementById('ALERT_OVERLAY_SETTING_TEXT_SHADOW').value;
    let text_shadow_color = document.getElementById('ALERT_OVERLAY_SETTING_TEXT_SHADOW_COLOR').value;
    let text_tts = document.getElementById('ALERT_OVERLAY_SETTING_TEXT_TTS').value;

    let vari_font = MISC_SELECT_GetValue(document.getElementById('ALERT_OVERLAY_SETTING_VARI_FONT'));
    let vari_color = document.getElementById('ALERT_OVERLAY_SETTING_VARI_COLOR').value;
    let vari_bold = document.getElementById('ALERT_OVERLAY_SETTING_VARI_BOLD').value;
    let vari_shadow = document.getElementById('ALERT_OVERLAY_SETTING_VARI_SHADOW').value;
    let vari_shadow_color = document.getElementById('ALERT_OVERLAY_SETTING_VARI_SHADOW_COLOR').value;
    
    //Message
    let message_layout = 1;
    for (let elt of document.getElementsByClassName('ALERT_OVERLAYS_SETTING_MESSAGE_LAYOUT_OPTION')) {
        if (elt instanceof Element && elt.hasAttribute('selected')) message_layout = parseInt(elt.dataset.index);
    }
    let message_font = MISC_SELECT_GetValue(document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_FONT'));
    let message_size = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_SIZE').value);
    let message_color = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_COLOR').value;
    let message_bold = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_BOLD').value;
    let message_shadow = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_SHADOW').value;
    let message_shadow_color = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_SHADOW_COLOR').value;
    let message_show_emotes = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_SHOW_EMOTES').value;
    let message_tts = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_TTS').value;
    let message_tts_skip_emotes = document.getElementById('ALERT_OVERLAY_SETTING_MESSAGE_TTS_EMOTES').value;

    //Sound
    let sound = MISC_FileLibrary_getSelectedFile(document.getElementById('ALERT_OVERLAY_SETTING_SOUND')) || '';
    let sound_volume = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_SOUND_VOLUME').value);

    //Sound
    let image = MISC_FileLibrary_getSelectedFile(document.getElementById('ALERT_OVERLAY_SETTING_IMAGE')) || '';
    let video_volume = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_VIDEO_VOLUME').value);

    //Extras
    let delay = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_DELAY').value);
    let on_time = parseInt(document.getElementById('ALERT_OVERLAY_SETTING_ON_TIME').value);
    let css = document.getElementById('ALERT_OVERLAY_SETTING_CSS').value;
    let js = document.getElementById('ALERT_OVERLAY_SETTING_JS').value;

    return {
        delay, on_time, css, js,
        sound, sound_volume,
        image, video_volume,
        message_font, message_layout, message_size, message_color, message_bold, message_shadow, message_shadow_color, message_show_emotes, message_tts, message_tts_skip_emotes,
        text_font, text_size, text_color, text_bold, text_shadow, text_shadow_color, text_tts,
        vari_font, vari_color, vari_bold, vari_shadow, vari_shadow_color,
        layout, move_in, move_out
    };
}
function OverlaySettings_checkJSON(cfg) {
    if (cfg.layout < 6 && cfg.image === "") return 'Image missing!';
    if (cfg.layout !== 5 && cfg.layout !== 7 && cfg.text === "") return 'Text missing!';
    return true;
}

function OverlaySettings_SetSaveState(state = false) {
    let elt = document.getElementById('ALERT_OVERLAY_SAVE_BUTTON');
    if (state) elt.removeAttribute('disabled');
    else elt.setAttribute('disabled', 'true');
}
function OverlaySettings_expandPreview(elt) {
    if (document.getElementById('ALERT_OVERLAYS_PREVIEW_WRAPPER').classList.contains('show')) {
        elt.innerHTML = 'PREVIEW ALERT SETTINGS';
        document.getElementById('ALERT_OVERLAYS_PREVIEW_WRAPPER').classList.toggle('show')
        document.getElementById('ALERT_OVERLAYS_PREVIEW').classList.toggle('expand');
        Alert_cancel('TEST_OVERLAY_PREVIEW');
    } else {
        elt.innerHTML = 'HIDE ALERT PREVIEW';
        document.getElementById('ALERT_OVERLAYS_PREVIEW_WRAPPER').classList.toggle('show')
        document.getElementById('ALERT_OVERLAYS_PREVIEW').classList.toggle('expand');
        OverlaySettings_updatePreview();
    }
}
function OverlaySettings_updatePreview() {
    if (!document.getElementById('ALERT_OVERLAYS_PREVIEW_WRAPPER').classList.contains('show')) return;

    //Collect Setting Data
    let cfg = OverlaySettings_collectJSON();

    //Check Errors or Cfg
    let error = OverlaySettings_checkJSON(cfg);
    if (error !== true) {
        OUTPUT_showError('Error: ' + error);
        return;
    }

    //TEXT TEMPLATE
    cfg.text = "{username} just resubscribed for {months} Months!";
    cfg.text_size /= 2;
    cfg.message_size /= 2;
    
    //Create Alert
    document.getElementById('ALERT_OVERLAYS_PREVIEW').innerHTML = Alert_Overlay_createHTML(cfg, TEXT_ALERT_EVENT, 'TEST_OVERLAY_PREVIEW', true);
    Alert_Overlay_trigger('TEST_OVERLAY_PREVIEW', cfg, TEXT_ALERT_EVENT, OverlaySettings_updatePreview);
}

function Layout_click(elt) {
    if (elt.hasAttribute('selected')) return;
    
    for (let elt of document.getElementsByClassName('ALERT_OVERLAYS_SETTING_LAYOUT_OPTION')) elt.removeAttribute('selected');
    elt.setAttribute('selected', 'true');
    OverlaySettings_SetSaveState(true);
}
function Layout_Move_Change() {
    OverlaySettings_SetSaveState(true);
}

function Text_Input_change() {
    OverlaySettings_SetSaveState(true);
}

function Message_Input_change() {
    OverlaySettings_SetSaveState(true);
}
function Message_Layout_click(elt) {
    if (elt.hasAttribute('selected')) return;

    for (let elt of document.getElementsByClassName('ALERT_OVERLAYS_SETTING_MESSAGE_LAYOUT_OPTION')) elt.removeAttribute('selected');
    elt.setAttribute('selected', 'true');
    OverlaySettings_SetSaveState(true);
}

function Image_change(value) {
    OverlaySettings_SetSaveState(true);
}
function Image_Slider_Change(elt) {
    for (let child of elt.parentElement.childNodes) {
        if (child instanceof Element && child.type == 'number') {
            child.value = elt.value;
        }
    }
    OverlaySettings_SetSaveState(true);
}
function Image_Input_Change(elt) {
    for (let child of elt.parentElement.childNodes) {
        if (child instanceof Element && child.type == 'range') {
            child.value = elt.value;
        }
    }
    OverlaySettings_SetSaveState(true);
}

function Sound_change(value) {
    OverlaySettings_SetSaveState(true);
}
function Sound_Slider_Change(elt) {
    for (let child of elt.parentElement.childNodes) {
        if (child instanceof Element && child.type == 'number') {
            child.value = elt.value;
        }
    }
    OverlaySettings_SetSaveState(true);
}
function Sound_Input_Change(elt) {
    for (let child of elt.parentElement.childNodes) {
        if (child instanceof Element && child.type == 'range') {
            child.value = elt.value;
        }
    }
    OverlaySettings_SetSaveState(true);
}

function Extras_Input_change() {
    OverlaySettings_SetSaveState(true);
}

/* Chat Output */
function updateChatOutput(chatoutputs = []) {
    let s = '';

    for (let alert of ALERTS) {
        let cfg = chatoutputs.find(elt => elt.event === alert);
        if (!cfg) cfg = {};

        s += '<div>';
        s += '<div class="CO_ALERT">';
        s += '<center title="' + alert.toUpperCase() + '">' + alert.toUpperCase() + '</center>';

        s += '<div class="CHAT_OUTPUT_SETTINGS">';
        s += '<div data-name="enabled"><span>Enalbed</span><input type="checkbox" onchange="ChatOutput_setSave(' + "'" + alert + "'" + ', this)" ' + (cfg.enabled === true ? 'checked' : '') + '/></div>';
        s += '<div data-name="random"><span>Random</span><input type="checkbox" onchange="ChatOutput_setSave(' + "'" + alert + "'" + ', this)" ' + (cfg.random === true ? 'checked' : '') + '/></div>';
        s += '</div>';

        let profles = cfg.profiles || [{}];

        s += '<div class="CHAT_OUTPUT_PROFILES">';

        for (let preload of profles) {
            s += ChatOutputSave_createProfile(alert, preload, profles.length === 1);
        }
        s += '</div>';

        //Add new Button
        s += '<button onclick="ChatOutput_addProfile(' + "'" + alert + "'" + ', this)">NEW</button>';

        //Add Save Button
        s += '<button id="CHATOUTPUT_SAVE_' + alert + '" onclick="ChatOutput_Save(' + "'" + alert + "'" + ', this)" disabled>SAVE</button>';

        s += '</div>';
        s += '</div>';
    }

    for (let event of EVENTS) {
        let cfg = chatoutputs.find(elt => elt.event === event);
        if (!cfg) cfg = {};

        s += '<div>';
        s += '<div class="CO_EVENT" data-event="' + event + '">';
        s += '<center title="' + event.split('_').join(' ').toUpperCase() + '">' + event.split('_').join(' ').toUpperCase() + '</center>';

        s += '<div class="CHAT_OUTPUT_SETTINGS">';
        s += '<div data-name="enabled"><span>Enalbed</span><input type="checkbox" onchange="ChatOutput_setSave(' + "'" + event + "'" + ', this)" ' + (cfg.enabled === true ? 'checked' : '') + '/></div>';
        s += '</div>';
        
        switch (event) {
            case 'poll': {
                s += '<center>Poll Created Text</center>';
                s += '<input type="text" data-name="created_text" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + event + "'" + ', true)"/>';
                s += '<center>Poll Concluded Text</center>';
                s += '<input type="text" data-name="concluded_text" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + event + "'" + ', true)"/>';
                break;
            }
            case 'prediction': {
                s += '<center>Prediction Created Text</center>';
                s += '<input type="text" data-name="created_text" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + event + "'" + ', true)"/>';
                s += '<center>Prediction Locked Text</center>';
                s += '<input type="text" data-name="locked_text" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + event + "'" + ', true)"/>';
                s += '<center>Prediction Concluded Text</center>';
                s += '<input type="text" data-name="concluded_text" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + event + "'" + ', true)"/>';
                s += '<center>Prediction Canceled Text</center>';
                s += '<input type="text" data-name="canceled" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + event + "'" + ', true)"/>';
                break;
            }
            case 'channel_point_redemption': {
                s += '<center>Redemption Added Text</center>';
                s += '<input type="text" data-name="added_text" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + event + "'" + ', true)"/>';
                s += '<center>Redemption Fullfilled Text</center>';
                s += '<input type="text" data-name="updated_text" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + event + "'" + ', true)"/>';
                break;
            }
            case 'hypetrain': {
                s += '<center>HypeTrain arrive Text</center>';
                s += '<input type="text" data-name="start_text" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + event + "'" + ', true)"/>';
                s += '<center>HypeTrain Concluded Text</center>';
                s += '<input type="text" data-name="concluded_text" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + event + "'" + ', true)"/>';
                break;
            }
        }

        //Add Save Button
        s += '<button id="CHATOUTPUT_SAVE_' + event + '" onclick="ChatOutput_Save(' + "'" + event + "'" + ', this)" disabled>SAVE</button>';

        s += '</div>';
        s += '</div>';
    }
    
    document.getElementById('CHAT_OUTPUT').innerHTML = s;

    //Evet Replace " Method
    for (let child of document.getElementById('CHAT_OUTPUT').childNodes) {
        let is_event = FindSubElementFromPath(child, ['.CO_EVENT']);
        if (!is_event) continue;

        for (let childer of is_event.childNodes) {
            if (childer instanceof Element && childer.tagName === "INPUT") {
                let cfg = chatoutputs.find(elt => elt.event === is_event.dataset.event);
                if (!cfg) cfg = {};
                if (cfg[childer.dataset.name]) childer.value = cfg[childer.dataset.name];
            }
        }
    }
}
function ChatOutput_setSave(alert, state = true) {
    document.getElementById('CHATOUTPUT_SAVE_' + alert).disabled = state === false;
}
function ChatOutput_Save(event, elt) {
    OUTPUT_hideError(document.getElementById('CHAT_OUTPUT_OUTPUT'));

    let cfg = {};
    let check = 'Invalid Event';

    if (elt.parentElement.classList.contains('CO_ALERT')) {
        cfg = ChatOutputCollectJSON_Alert(elt);
        check = ChatOutput_CheckCFG_Alert(cfg);
    } else if (elt.parentElement.classList.contains('CO_EVENT')) {
        cfg = ChatOutputCollectJSON_Event(elt);
        check = true;
    }

    //Check cfg
    if (check !== true) {
        OUTPUT_showError(check, document.getElementById('CHAT_OUTPUT_OUTPUT'));
        return;
    }

    let opts = getAuthHeader();
    opts.method = 'PUT';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify({ event, cfg: cfg });
    
    //Save
    fetch('/api/alerts/chatoutput', opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            OUTPUT_showInfo('Chat Output Updated!', document.getElementById('CHAT_OUTPUT_OUTPUT'));
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('CHAT_OUTPUT_OUTPUT'));
        });
}

function ChatOutput_addProfile(alert, elt) {
    let div = document.createElement('DIV');
    div.innerHTML = ChatOutputSave_createProfile(alert, {});

    let root = FindHTMLParent(elt, (parent) => parent.classList.contains('CO_ALERT'));

    let wrapper = FindSubElementFromPath(root, ['.CHAT_OUTPUT_PROFILES']);
    FindSubElementFromPath(wrapper, ['.CHAT_OUTPUT_PROFILE', '.CHAT_OUTPUT_PROFILE_TEXT_WRAPPER', 'button']).disabled = false;
    wrapper.appendChild(div.childNodes[0]);

    div.remove();
    ChatOutput_setSave(alert, true);
}
function ChatOutput_removeProfile(alert, elt) {
    let wrapper = FindHTMLParent(elt, (parent) => parent.classList.contains('CHAT_OUTPUT_PROFILES'));
    
    elt.parentElement.parentElement.remove();
    
    if (wrapper.childNodes.length === 1) FindSubElementFromPath(wrapper, ['.CHAT_OUTPUT_PROFILE', '.CHAT_OUTPUT_PROFILE_TEXT_WRAPPER', 'button']).disabled = true;
    
    ChatOutput_setSave(alert, true);
}

function ChatOutputSave_createProfile(alert, preload = {}, is_last = false) {
    let s = '';
    s += '<div class="CHAT_OUTPUT_PROFILE" data-alert="' + alert + '">';

    s += '<div class="CHAT_OUTPUT_PROFILE_TEXT_WRAPPER">';
    s += '<input type="text" value="' + (preload.text || '') + '" placeholder="Enter Chat Message here" oninput="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/>';
    s += '<button onclick="ChatOutput_removeProfile(' + "'" + alert + "'" + ', this); " ' + (is_last ? 'disabled' : '') + '>DEL</button>';
    s += '</div>';

    //Variables
    for (let option of ALERT_VARIABLES[alert]) {
        if (option.name === 'message') continue;

        s += '<div class="ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE_OPTION" data-type="' + option.name + '">';
        let where = preload.where || {};

        if (option.name === 'tier') {
            s += '<div>"Sub Tier" Trigger</div>';

            s += '<div class="TierList">';
            s += '<div><div>Tier 1</div><input type="checkbox" ' + (where.tier1 !== false ? 'checked' : '') + ' onchange="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/></div>';
            s += '<div><div>Tier 2</div><input type="checkbox" ' + (where.tier2 !== false ? 'checked' : '') + '  onchange="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/></div>';
            s += '<div><div>Tier 3</div><input type="checkbox" ' + (where.tier3 !== false ? 'checked' : '') + '  onchange="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/></div>';
            s += '<div><div>Tier Prime</div><input type="checkbox" ' + (where.twitchprime !== false ? 'checked' : '') + '  onchange="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/></div>';
            s += '</div>';
        } else if (option.name === 'amount') {
            s += '<div>"Amount" Trigger Range</div>';

            s += '<div class="Range">';
            s += '<div><span>from: </span><input type="number" min="-1" value="' + (where.amount_min !== undefined ? where.amount_min : -1) + '" placeholder="Lower Range Bounds here" oninput="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/></div>';
            s += '<div><span>to: </span><input type="number" min="-1" value="' + (where.amount_max !== undefined ? where.amount_max : -1) + '" placeholder="Upper Range Bounds here" oninput="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/></div>';
            s += '</div>';
            s += '<div class="info">Use a value of -1 to indicate any value below/above!</div>';
        } else if (option.name === 'username') {
            s += '<div>"Username" Trigger</div>';
            s += '<input type="text" value="' + (where.username || []).join(',') + '" placeholder="Comma seperated list of usernames" oninput="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/>';
            s += '<input type="checkbox" title="Invert Username Trigger. Turns the Whitelist into a Blacklist." oninput="ChatOutput_setSave(' + "'" + alert + "'" + ', true)" ' + (where.inv_username === true ? 'checked' : '') + '/>';
        } else if (option.name === 'target') {
            s += '<div>"Target" Trigger</div>';
            s += '<input type="text" value="' + (where.target || []).join(',') + '" placeholder="Comma seperated list of usernames" oninput="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/>';
            s += '<input type="checkbox" title="Invert Target Trigger. Turns the Whitelist into a Blacklist." oninput="ChatOutput_setSave(' + "'" + alert + "'" + ', true)" ' + (where.inv_username === true ? 'checked' : '') + ' />';
        } else if (option.name === 'total' || option.name === 'months') {
            s += '<div>"' + option.name.substring(0, 1).toUpperCase() + option.name.substring(1) + '" Trigger Range</div>';

            s += '<div class="Range">';
            s += '<div><span>from: </span><input type="number" min="-1" value="' + (where.total_min !== undefined ? where[option.name + '_min'] : -1) + '" placeholder="Lower Range Bounds here" oninput="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/></div>';
            s += '<div><span>to: </span><input type="number" min="-1" value="' + (where.total_max !== undefined ? where[option.name + '_max'] : -1) + '" placeholder="Upper Range Bounds here" oninput="ChatOutput_setSave(' + "'" + alert + "'" + ', true)"/></div>';
            s += '</div>';
            s += '<div class="info">Use a value of -1 to indicate any value below/above!</div>';
        }

        s += '</div>';
    }
    s += '</div>';
    return s;
}
function ChatOutputCollectJSON_Alert(elt) {
    elt = FindHTMLParent(elt, (parent) => parent.classList.contains('CO_ALERT'));

    let event_cfg = {
        enabled: FindSubElementFromPath(elt, ['.CHAT_OUTPUT_SETTINGS', 'data-name="enabled"']).childNodes[1].checked,
        random: FindSubElementFromPath(elt, ['.CHAT_OUTPUT_SETTINGS', 'data-name="random"']).childNodes[1].checked,
        profiles: []
    };

    elt = FindSubElementFromPath(elt, ['.CHAT_OUTPUT_PROFILES']);

    for (let profile of elt.childNodes) {
        let where = {};
        for (let option of profile.childNodes) {
            if (!(option instanceof Element && option.classList.contains('ALERT_OVERLAYS_ALERTS_SETTINGS_PROFILE_OPTION'))) continue;

            if (option.dataset.type === 'tier') {
                where.tier1 = option.childNodes[1].childNodes[0].childNodes[1].checked;
                where.tier2 = option.childNodes[1].childNodes[1].childNodes[1].checked;
                where.tier3 = option.childNodes[1].childNodes[2].childNodes[1].checked;
                where.twitchprime = option.childNodes[1].childNodes[3].childNodes[1].checked;
            } else if (option.dataset.type === 'amount') {
                where.amount_min = parseInt(option.childNodes[1].childNodes[0].childNodes[1].value);
                where.amount_max = parseInt(option.childNodes[1].childNodes[1].childNodes[1].value);
            } else if (option.dataset.type === 'username') {
                where.username = option.childNodes[1].value.trim().split(',');
                where.inv_username = option.childNodes[2].checked;
            } else if (option.dataset.type === 'target') {
                where.target = option.childNodes[1].value.trim().split(',');
                where.inv_target = option.childNodes[2].checked;
            } else if (option.dataset.type === 'total') {
                where[option.dataset.type + '_min'] = parseInt(option.childNodes[1].childNodes[0].childNodes[1].value);
                where[option.dataset.type + '_max'] = parseInt(option.childNodes[1].childNodes[1].childNodes[1].value);
            }
        }

        let temp = {
            text: FindSubElementFromPath(profile, ['.CHAT_OUTPUT_PROFILE_TEXT_WRAPPER']).childNodes[0].value,
            where
        };

        event_cfg.profiles.push(temp);
    }

    return event_cfg;
}
function ChatOutput_CheckCFG_Alert(cfg) {
    if (!cfg || typeof cfg !== 'object' || typeof cfg.enabled !== 'boolean' || typeof cfg.random !== 'boolean') {
        return 'Internal Error (1). Try reloading!';
    }

    if (!cfg.profiles || typeof cfg.profiles !== 'object' || !cfg.profiles.length) {
        return 'Internal Error (2). Try reloading!';
    }

    //Sort Profiles
    let sorted = sortBounds(cfg.profiles, 'amount');
    sorted = sortBounds(cfg.profiles, 'total');
    sorted = sortBounds(cfg.profiles, 'months');

    for (let i = 0; i < sorted.length; i++) {
        let elt = sorted[i];

        if (elt.where.tier1 !== undefined) {
            if (elt.where.tier1 == false && elt.where.tier2 == false && elt.where.tier3 == false && elt.where.twitchprime == false) {
                return '"' + prof.text.toUpperCase() + '": Profile has no Tier Trigger assigned!';
            }
        }

        if (elt.where.min !== -1 && elt.where.max !== -1) {
            if (elt.where.min > elt.where.max) {
                return '"' + prof.text.toUpperCase() + '": Profile has unlogical Range!';
            }
        }

        if (elt.where.total_min !== -1 && elt.where.total_max !== -1) {
            if (elt.where.total_min > elt.where.total_max) {
                return '"' + prof.text.toUpperCase() + '": Profile has unlogical "Total" Range!';
            }
        }

        if (elt.where.months_min !== -1 && elt.where.months_max !== -1) {
            if (elt.where.months_min > elt.where.months_max) {
                return '"' + prof.text.toUpperCase() + '": Profile has unlogical "Months" Range!';
            }
        }

        if (i < sorted.length - 1 && elt.where.min !== undefined) {
            let next = sorted[i + 1];

            if (elt.where.tier1 == next.where.tier1 && elt.where.tier2 == next.where.tier2 && elt.where.tier3 == next.where.tier3 && elt.where.twitchprime == next.where.twitchprime) {
                if (elt.where.min === next.where.min && elt.where.max === next.where.max) {
                    return '"' + prof.text.toUpperCase() + '": Profile has duplicate Trigger Range!';
                }
            }
        }
    }

    return true;
}

function ChatOutputCollectJSON_Event(elt) {
    elt = FindHTMLParent(elt, (parent) => parent.classList.contains('CO_EVENT'));

    let event_cfg = {
        enabled: FindSubElementFromPath(elt, ['.CHAT_OUTPUT_SETTINGS', 'data-name="enabled"']).childNodes[1].checked
    };

    for (let child of elt.childNodes) {
        if (child instanceof Element && child.dataset.name) event_cfg[child.dataset.name] = child.value;
    }

    return event_cfg;
}

/* TTS */
function updateVoicePitch(value = 0) {
    document.getElementById('TTS_Pitch_Slider').value = parseFloat(value).toFixed(2);
    document.getElementById('TTS_Pitch_Input').value = Math_map(parseFloat(value), 0, 2, -1, 1).toFixed(2);
}
function previewVoice() {
    let pitch = document.getElementById('TTS_Pitch_Slider').value;
    let voice = MISC_SELECT_GetValue(document.getElementById('TTS_VOICE_SELECT').childNodes[0]);
    let text = document.getElementById('TTS_VOICE_TEXT').value;
    let volume = document.getElementById('TTS_Volume').value;

    text2speech(text, CreateVoice(volume, pitch, VOICES.find(elt => elt.name === voice)));
}
function saveTTS(elt) {
    OUTPUT_hideError(document.getElementById('TTS_OUTPUT'));
    elt.disabled = true;

    let body = {
        voice: MISC_SELECT_GetValue(document.getElementById('TTS_VOICE')),
        pitch: parseFloat(document.getElementById('TTS_Pitch_Input').value),
        volume: parseInt(document.getElementById('TTS_Volume').value * 100 )
    };
    
    let opts = getAuthHeader();
    opts.method = 'PUT';
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
    
    //Save
    fetch('/api/alerts/settings/tts', opts)
        .then(STANDARD_FETCH_RESPONSE_CHECKER)
        .then(json => {
            CONFIG = json;

            if (Object.getOwnPropertyNames(json.errs).length === 0) {
                OUTPUT_showInfo('Text 2 Speech updated!', document.getElementById('TTS_OUTPUT'));
            } else if (Object.getOwnPropertyNames(json.errs).length < 3) {
                OUTPUT_showWarning('Text 2 Speech Updated, but failed to update: ' + Object.getOwnPropertyNames(json.errs).join(', '), document.getElementById('TTS_OUTPUT'));
            } else {
                OUTPUT_showError('Text 2 Speech failed to update!', document.getElementById('TTS_OUTPUT'));
            }
        })
        .catch(err => {
            console.log(err);
            OUTPUT_showError(err.message, document.getElementById('TTS_OUTPUT'));
        })
        .finally(err => {
            elt.disabled = false;
        });
}

/* Alert Variables */
function updateAlertVariables() {
    let s = '';

    for (let alert of ALERTS) {
        s += '<div>';
        s += '<center title="' + alert.split('_').join(' ').toUpperCase() + '">' + alert.split('_').join(' ').toUpperCase() + '</center>';

        for (let vari of ALERT_VARIABLES[alert]) {
            if (vari.name === 'message') continue;

            s += '<div title="' + vari.name + '">' + vari.name + '</div>';
            s += '<div title="' + vari.desc + '">' + vari.desc + '</div>';
        }

        s += '</div>';
    }

    for (let event of EVENTS) {
        s += '<div>';
        s += '<center title="' + event.split('_').join(' ').toUpperCase() + '">' + event.split('_').join(' ').toUpperCase() + '</center>';

        for (let vari of EVENT_VARIABLES[event]) {
            if (vari.name === 'message') continue;

            s += '<div title="' + vari.name + '">' + vari.name + '</div>';
            s += '<div title="' + vari.desc + '">' + vari.desc + '</div>';
        }

        s += '</div>';
    }

    document.getElementById('ALERT_VARIABLES').innerHTML = s;
}